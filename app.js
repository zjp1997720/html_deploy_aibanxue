// 加载环境变量
require('dotenv').config();

const express = require('express');
const path = require('path');
const bodyParser = require('body-parser');
const morgan = require('morgan');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const session = require('express-session');
const FileStore = require('session-file-store')(session);
const fs = require('fs');
const { initDatabase } = require('./models/db');

// 添加调试日志
console.log('应用启动...');
console.log('当前工作目录:', process.cwd());
console.log('环境变量:', {
  NODE_ENV: process.env.NODE_ENV,
  AUTH_ENABLED: process.env.AUTH_ENABLED,
  AUTH_PASSWORD: process.env.AUTH_PASSWORD
});

// 导入认证中间件
const { isAuthenticated, isAuthenticatedOrApiKey } = require('./middleware/auth');
const { apiKeyAuth, validateApiKeyMiddleware, requirePermissions } = require('./middleware/apiKey');

// 导入性能监控中间件
const { responseTimeMonitor, getPerformanceStats, getDetailedPerformanceReport, cleanupOldLogs } = require('./middleware/responseTimeMonitor');

// 导入内存优化工具
const { 
  getMemoryUsage, 
  getDetailedMemoryStats, 
  forceGarbageCollection, 
  startMemoryMonitoring, 
  generateMemoryReport, 
  detectMemoryLeaks 
} = require('./utils/memoryOptimizer');

// 导入缓存管理系统
const { cache } = require('./utils/cacheManager');

// 导入配置
const config = require('./config');

// 路由导入
const pagesRoutes = require('./routes/pages');

// 初始化应用
const app = express();
if (process.env.NODE_ENV === 'production') {
  app.set('trust proxy', 1);
}
// 确保在服务器上使用正确的端口
const PORT = config.port;

// 将配置添加到应用本地变量中，便于在中间件中访问
app.locals.config = config;

// 中间件设置
app.use(morgan(config.logLevel)); // 使用配置文件中的日志级别
app.use(cors()); // 跨域支持
app.use(bodyParser.json({ limit: '15mb' })); // JSON 解析，增加限制为15MB
app.use(bodyParser.urlencoded({ extended: true, limit: '15mb' })); // 增加限制为15MB
app.use(cookieParser()); // 解析 Cookie
app.use('/static', express.static(path.join(__dirname, 'public'))); // 静态文件
app.use(express.static(path.join(__dirname, 'public'))); // 兼容旧路径 /css /js /icon

// 创建会话目录
const sessionDir = path.join(__dirname, 'sessions');
console.log('会话目录:', sessionDir);
if (!fs.existsSync(sessionDir)) {
  console.log('创建会话目录...');
  fs.mkdirSync(sessionDir, { recursive: true });
}

// 确保会话目录有正确的权限
try {
  fs.accessSync(sessionDir, fs.constants.R_OK | fs.constants.W_OK);
  console.log('会话目录权限正确');
} catch (err) {
  console.error('会话目录权限错误:', err);
  console.log('尝试修复权限...');
  try {
    // 尝试设置权限，但这可能需要root权限
    fs.chmodSync(sessionDir, 0o700);
    console.log('权限修复成功');
  } catch (chmodErr) {
    console.error('无法修复权限:', chmodErr);
    console.log('请手动设置会话目录权限: chmod -R 700 ' + sessionDir);
  }
}

// 使用文件存储会话
app.use(session({
  store: new FileStore({
    path: sessionDir,
    ttl: 86400, // 会话有效期（秒）
    retries: 0, // 读取会话文件的重试次数
    secret: process.env.SESSION_SECRET || 'html-go-secret-key', // 用于加密会话文件
    logFn: function(message) {
      console.log('[session-file-store]', message);
    }
  }),
  secret: process.env.SESSION_SECRET || 'html-go-secret-key',
  resave: false,
  saveUninitialized: false,
  cookie: {
    // 只在 HTTPS 环境下设置 secure为 true
    secure: process.env.NODE_ENV === 'production',
    maxAge: 24 * 60 * 60 * 1000, // 24小时
    httpOnly: true,
    sameSite: 'lax'
  }
}));

// 设置视图引擎
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'ejs');

// ===== Phase 3: 性能监控中间件 =====
app.use(responseTimeMonitor);
console.log('✅ 性能监控中间件已启用');

// 登录路由
app.get('/login', (req, res) => {
  // 如果认证功能未启用或已经登录，重定向到首页
  if (!config.authEnabled || (req.session && req.session.isAuthenticated)) {
    return res.redirect('/');
  }

  res.render('login-modern', {
    title: '登录',
    error: null
  });
});

app.post('/login', (req, res) => {
  const { password } = req.body;

  console.log('登录尝试:');
  console.log('- 密码:', password);
  console.log('- 配置密码:', config.authPassword);
  console.log('- 密码匹配:', password === config.authPassword);

  // 如果认证功能未启用，直接重定向到首页
  if (!config.authEnabled) {
    console.log('- 认证未启用，直接重定向到首页');
    return res.redirect('/');
  }

  // 检查密码是否正确
  if (password === config.authPassword) {
    console.log('- 密码正确，设置认证');

    // 同时使用会话和 Cookie 来存储认证状态
    // 1. 设置会话
    req.session.isAuthenticated = true;
    console.log('- 设置会话认证标记');

    // 2. 设置 Cookie
    res.cookie('auth', 'true', {
      maxAge: 24 * 60 * 60 * 1000, // 24小时
      httpOnly: true,
      secure: false, // 如果使用 HTTPS，设置为 true
      sameSite: 'lax'
    });
    console.log('- 设置认证 Cookie');

    // 先尝试直接重定向，不等待会话保存
    console.log('- 重定向到首页');
    return res.redirect('/');
  } else {
    console.log('- 密码不匹配，显示错误');
    // 密码错误，显示错误信息
    res.render('login-modern', {
      title: '登录',
      error: '密码错误，请重试'
    });
  }
});

// 退出登录路由
app.get('/logout', (req, res) => {
  // 清除会话
  req.session.destroy();
  res.redirect('/login');
});

// API 路由设置
// 将 API 路由分为两部分：需要认证的和不需要认证的

// 导入路由处理函数
const { createPage, getPageById, getRecentPages, getAllPages, getPagesList, getPagesStats, batchDeletePages, batchUpdateProtection, updatePage, deletePage } = require('./models/pages');

// 创建页面的 API 需要认证（支持Web会话、旧版API Token、新版API Key）
app.post('/api/pages/create', isAuthenticatedOrApiKey, async (req, res) => {
  try {
    const { htmlContent, isProtected, codeType, name } = req.body; // 接收 codeType 和 name

    if (!htmlContent) {
      return res.status(400).json({ success: false, error: '请提供HTML内容' });
    }

    const isProtectedBool = isProtected === true || isProtected === 1 || isProtected === '1' || String(isProtected).toLowerCase() === 'true';

    const result = await createPage(htmlContent, isProtectedBool, codeType, name);
    const url = `${req.protocol}://${req.get('host')}/view/${result.urlId}`;

    // 返回适配 Coze 插件的格式
    res.json({
      success: true,
      url: url,  // 返回完整URL
      password: result.password,
      isProtected: isProtectedBool,
      debug_info: `Page created with ID: ${result.urlId}`
    });
  } catch (error) {
    console.error('创建页面API错误:', error);
    res.status(500).json({ success: false, error: '服务器错误' });
  }
});

// 其他 API 不需要认证
app.use('/api/pages', pagesRoutes);

// 密码验证路由 - 用于AJAX验证
app.get('/validate-password/:id', async (req, res) => {
  try {
    const { getPageById } = require('./models/pages');
    const { id } = req.params;
    const { password } = req.query;

    if (!password) {
      return res.json({ valid: false });
    }

    const page = await getPageById(id);

    if (!page) {
      return res.json({ valid: false });
    }

    // 检查密码是否正确
    const isValid = page.is_protected === 1 && password === page.password;

    return res.json({ valid: isValid });
  } catch (error) {
    console.error('密码验证错误:', error);
    return res.status(500).json({ valid: false, error: '服务器错误' });
  }
});

// 测试路由已移除 - 新设计已完全集成到正式路由中

// 首页路由 - 需要登录才能访问
app.get('/', isAuthenticated, (req, res) => {
  res.render('index-modern', { 
    title: '首页',
    layout: 'layouts/modern',
    scripts: ['/js/main.js']
  });
});

// 后台管理页面路由
app.get('/admin/dashboard', isAuthenticated, async (req, res) => {
  try {
    const pages = await getAllPages();
    res.render('dashboard-modern', {
      title: '概览',
      currentPath: '/admin/dashboard',
      pages: pages,
      // 安全的时间格式化函数
      formatDate: (timestamp) => {
        try {
          if (!timestamp) return '未知时间';
          const date = new Date(parseInt(timestamp));
          if (isNaN(date.getTime())) return '无效时间';
          return date.toLocaleString('zh-CN', {
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit'
          });
        } catch (error) {
          console.error('时间格式化错误:', error, 'timestamp:', timestamp);
          return '时间错误';
        }
      }
    });
  } catch (error) {
    console.error('无法加载后台管理页面:', error);
    res.status(500).render('error', {
      title: '服务器错误',
      message: '加载后台管理页面失败'
    });
  }
});

// 页面管理页面
app.get('/admin/pages', isAuthenticated, (req, res) => {
  res.render('admin/pages', {
    title: '页面管理 - HTML-GO Admin',
    currentPath: '/admin/pages'
  });
});

// ================================
// 页面管理 API 端点（旧版，用于管理后台）
// ================================

// 获取页面列表（支持分页、搜索、筛选）
app.get('/api/admin/pages', isAuthenticated, async (req, res) => {
  try {
    const {
      page = 1,
      limit = 20,
      search = '',
      codeType = '',
      isProtected = null,
      sortBy = 'created_at',
      sortOrder = 'DESC'
    } = req.query;

    // 转换参数类型
    const options = {
      page: parseInt(page) || 1,
      limit: Math.min(parseInt(limit) || 20, 100), // 限制最大每页100条
      search: String(search || ''),
      codeType: String(codeType || ''),
      isProtected: isProtected === 'true' ? true : isProtected === 'false' ? false : null,
      sortBy: String(sortBy || 'created_at'),
      sortOrder: String(sortOrder || 'DESC')
    };

    const result = await getPagesList(options);
    
    res.json({
      success: true,
      ...result
    });
  } catch (error) {
    console.error('获取页面列表错误:', error);
    res.status(500).json({
      success: false,
      error: '获取页面列表失败'
    });
  }
});

// 获取页面统计信息
app.get('/api/admin/pages/stats', isAuthenticated, async (req, res) => {
  try {
    const stats = await getPagesStats();
    res.json({
      success: true,
      stats
    });
  } catch (error) {
    console.error('获取页面统计错误:', error);
    res.status(500).json({
      success: false,
      error: '获取页面统计失败'
    });
  }
});

// 更新页面信息
app.put('/api/admin/pages/:pageId', isAuthenticated, async (req, res) => {
  try {
    const { pageId } = req.params;
    const { name, htmlContent, isProtected, password, codeType } = req.body;

    // 构建更新对象
    const updates = {};
    if (name !== undefined) updates.name = name;
    if (htmlContent !== undefined) updates.html_content = htmlContent;
    if (isProtected !== undefined) updates.is_protected = isProtected ? 1 : 0;
    if (password !== undefined) updates.password = password;
    if (codeType !== undefined) updates.code_type = codeType;

    const success = await updatePage(pageId, updates);
    
    if (success) {
      res.json({
        success: true,
        message: '页面更新成功'
      });
    } else {
      res.status(404).json({
        success: false,
        error: '页面不存在'
      });
    }
  } catch (error) {
    console.error('更新页面错误:', error);
    res.status(500).json({
      success: false,
      error: '更新页面失败'
    });
  }
});

// 删除单个页面
app.delete('/api/admin/pages/:pageId', isAuthenticated, async (req, res) => {
  try {
    const { pageId } = req.params;
    
    const success = await deletePage(pageId);
    
    if (success) {
      res.json({
        success: true,
        message: '页面删除成功'
      });
    } else {
      res.status(404).json({
        success: false,
        error: '页面不存在'
      });
    }
  } catch (error) {
    console.error('删除页面错误:', error);
    res.status(500).json({
      success: false,
      error: '删除页面失败'
    });
  }
});

// 批量删除页面
app.post('/api/admin/pages/batch/delete', isAuthenticated, async (req, res) => {
  try {
    const { pageIds } = req.body;
    
    if (!Array.isArray(pageIds) || pageIds.length === 0) {
      return res.status(400).json({
        success: false,
        error: '请选择要删除的页面'
      });
    }

    const deletedCount = await batchDeletePages(pageIds);
    
    res.json({
      success: true,
      message: `成功删除 ${deletedCount} 个页面`,
      deletedCount
    });
  } catch (error) {
    console.error('批量删除页面错误:', error);
    res.status(500).json({
      success: false,
      error: '批量删除失败'
    });
  }
});

// 批量更新页面保护状态
app.post('/api/admin/pages/batch/protection', isAuthenticated, async (req, res) => {
  try {
    const { pageIds, isProtected } = req.body;
    
    if (!Array.isArray(pageIds) || pageIds.length === 0) {
      return res.status(400).json({
        success: false,
        error: '请选择要操作的页面'
      });
    }

    const updatedCount = await batchUpdateProtection(pageIds, isProtected);
    
    res.json({
      success: true,
      message: `成功${isProtected ? '启用' : '取消'}保护 ${updatedCount} 个页面`,
      updatedCount
    });
  } catch (error) {
    console.error('批量更新保护状态错误:', error);
    res.status(500).json({
      success: false,
      error: '批量更新失败'
    });
  }
});

// 使用新的API Key中间件的创建页面API
app.post('/api/v2/pages/create', apiKeyAuth(['write']), async (req, res) => {
  try {
    const { htmlContent, isProtected, codeType, name } = req.body;

    if (!htmlContent) {
      return res.status(400).json({ 
        success: false, 
        error: '请提供HTML内容',
        code: 'MISSING_CONTENT'
      });
    }

    const isProtectedBool = isProtected === true || isProtected === 1 || isProtected === '1' || String(isProtected).toLowerCase() === 'true';

    const result = await createPage(htmlContent, isProtectedBool, codeType, name);
    const url = `${req.protocol}://${req.get('host')}/view/${result.urlId}`;

    res.json({
      success: true,
      data: {
        id: result.urlId,
        url: url,
        password: result.password,
        isProtected: isProtectedBool,
        name: name || null,
        codeType: codeType || 'html'
      }
    });
  } catch (error) {
    console.error('创建页面API错误:', error);
    res.status(500).json({ 
      success: false, 
      error: '服务器错误',
      code: 'INTERNAL_ERROR'
    });
  }
});

// 获取页面信息API（使用新中间件）
app.get('/api/v2/pages/:id', apiKeyAuth(['read']), async (req, res) => {
  try {
    const { id } = req.params;
    const page = await getPageById(id);

    if (!page) {
      return res.status(404).json({
        success: false,
        error: '页面不存在',
        code: 'PAGE_NOT_FOUND'
      });
    }

    res.json({
      success: true,
      data: {
        id: page.id,
        name: page.name,
        codeType: page.code_type,
        isProtected: page.is_protected === 1,
        contentSize: page.html_content ? page.html_content.length : 0,
        createdAt: page.created_at
      }
    });
  } catch (error) {
    console.error('获取页面API错误:', error);
    res.status(500).json({
      success: false,
      error: '服务器错误',
      code: 'INTERNAL_ERROR'
    });
  }
});

// 获取页面列表API（使用新中间件）
app.get('/api/v2/pages', apiKeyAuth(['read']), async (req, res) => {
  try {
    const {
      page = 1,
      limit = 20,
      search = '',
      codeType = '',
      isProtected = null
    } = req.query;

    const options = {
      page: parseInt(page) || 1,
      limit: Math.min(parseInt(limit) || 20, 100),
      search: String(search || ''),
      codeType: String(codeType || ''),
      isProtected: isProtected === 'true' ? true : isProtected === 'false' ? false : null
    };

    const result = await getPagesList(options);
    
    // 过滤敏感信息
    const filteredPages = result.pages.map(page => ({
      id: page.id,
      name: page.name,
      codeType: page.code_type,
      isProtected: page.is_protected === 1,
      contentSize: page.content_size,
      createdAt: page.created_at
    }));

    res.json({
      success: true,
      data: {
        pages: filteredPages,
        pagination: result.pagination
      }
    });
  } catch (error) {
    console.error('获取页面列表API错误:', error);
    res.status(500).json({
      success: false,
      error: '服务器错误',
      code: 'INTERNAL_ERROR'
    });
  }
});

// 更新页面API（使用新中间件）
app.put('/api/v2/pages/:id', apiKeyAuth(['write']), async (req, res) => {
  try {
    const { id } = req.params;
    const { name, htmlContent, isProtected, password, codeType } = req.body;

    // 构建更新对象
    const updates = {};
    if (name !== undefined) updates.name = name;
    if (htmlContent !== undefined) updates.html_content = htmlContent;
    if (isProtected !== undefined) updates.is_protected = isProtected ? 1 : 0;
    if (password !== undefined) updates.password = password;
    if (codeType !== undefined) updates.code_type = codeType;

    if (Object.keys(updates).length === 0) {
      return res.status(400).json({
        success: false,
        error: '没有提供要更新的字段',
        code: 'NO_UPDATE_FIELDS'
      });
    }

    const success = await updatePage(id, updates);
    
    if (success) {
      res.json({
        success: true,
        message: '页面更新成功',
        data: { id }
      });
    } else {
      res.status(404).json({
        success: false,
        error: '页面不存在',
        code: 'PAGE_NOT_FOUND'
      });
    }
  } catch (error) {
    console.error('更新页面API错误:', error);
    res.status(500).json({
      success: false,
      error: '服务器错误',
      code: 'INTERNAL_ERROR'
    });
  }
});

// 删除页面API（使用新中间件）
app.delete('/api/v2/pages/:id', apiKeyAuth(['write']), async (req, res) => {
  try {
    const { id } = req.params;
    
    const success = await deletePage(id);
    
    if (success) {
      res.json({
        success: true,
        message: '页面删除成功',
        data: { id }
      });
    } else {
      res.status(404).json({
        success: false,
        error: '页面不存在',
        code: 'PAGE_NOT_FOUND'
      });
    }
  } catch (error) {
    console.error('删除页面API错误:', error);
    res.status(500).json({
      success: false,
      error: '服务器错误',
      code: 'INTERNAL_ERROR'
    });
  }
});

// API Key管理页面
app.get('/admin/apikeys', isAuthenticated, (req, res) => {
  res.render('admin/apikeys', {
    title: 'API Key管理 - HTML-GO Admin',
    currentPath: '/admin/apikeys'
  });
});

// 临时路由 - 系统设置 (将在下一阶段完整实现)
app.get('/admin/settings', isAuthenticated, (req, res) => {
  res.status(200).send(`
    <!DOCTYPE html>
    <html>
    <head>
      <title>系统设置 - HTML-GO Admin</title>
      <style>
        body { font-family: Arial, sans-serif; padding: 2rem; }
        .container { max-width: 800px; margin: 0 auto; text-align: center; }
        .icon { font-size: 4rem; margin-bottom: 1rem; }
        .title { color: #1e40af; margin-bottom: 1rem; }
        .btn { padding: 0.5rem 1rem; background: #1e40af; color: white; text-decoration: none; border-radius: 4px; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="icon">⚙️</div>
        <h1 class="title">系统设置功能开发中</h1>
        <p>此功能将在Phase 3中实现，敬请期待！</p>
        <p>计划功能：环境配置、安全设置、备份等</p>
        <a href="/admin/dashboard" class="btn">返回概览</a>
      </div>
    </body>
    </html>
  `);
});

// ================================
// 增强的统计和监控API
// ================================

// 系统总体统计API
app.get('/api/v2/stats/system', apiKeyAuth(['read']), async (req, res) => {
  try {
    const pagesStats = await getPagesStats();
    
    res.json({
      success: true,
      data: {
        pages: pagesStats,
        system: {
          uptime: process.uptime(),
          memoryUsage: process.memoryUsage(),
          nodeVersion: process.version,
          platform: process.platform
        }
      }
    });
  } catch (error) {
    console.error('获取系统统计错误:', error);
    res.status(500).json({
      success: false,
      error: '获取统计失败',
      code: 'STATS_ERROR'
    });
  }
});

// API Key使用统计API（增强版）
app.get('/api/v2/stats/apikey/:keyId', apiKeyAuth(['read']), async (req, res) => {
  try {
    const { keyId } = req.params;
    const { days = 7 } = req.query;
    
    // 只允许查询自己的API Key统计，除非有管理权限
    if (req.apiKeyInfo.keyId !== keyId) {
      return res.status(403).json({
        success: false,
        error: '只能查询自己的API Key统计',
        code: 'ACCESS_DENIED'
      });
    }
    
    const { getApiKeyStats } = require('./models/apiKeys');
    const stats = await getApiKeyStats(keyId, parseInt(days));
    
    res.json({
      success: true,
      data: {
        keyId,
        period: `${days} days`,
        ...stats
      }
    });
  } catch (error) {
    console.error('获取API Key统计错误:', error);
    res.status(500).json({
      success: false,
      error: '获取统计失败',
      code: 'STATS_ERROR'
    });
  }
});

// 详细API Key统计API
app.get('/api/v2/stats/apikey/:keyId/detailed', apiKeyAuth(['read']), async (req, res) => {
  try {
    const { keyId } = req.params;
    const { days = 7 } = req.query;
    
    // 只允许查询自己的API Key统计
    if (req.apiKeyInfo.keyId !== keyId) {
      return res.status(403).json({
        success: false,
        error: '只能查询自己的API Key统计',
        code: 'ACCESS_DENIED'
      });
    }
    
    const stats = await getDetailedApiKeyStats(keyId, parseInt(days));
    
    res.json({
      success: true,
      data: {
        keyId,
        period: `${days} days`,
        ...stats
      }
    });
  } catch (error) {
    console.error('获取详细API Key统计错误:', error);
    res.status(500).json({
      success: false,
      error: '获取统计失败',
      code: 'STATS_ERROR'
    });
  }
});

// 总体API统计（管理员接口）
app.get('/api/admin/stats/api/overall', isAuthenticated, async (req, res) => {
  try {
    const { days = 7 } = req.query;
    
    const stats = await getOverallApiStats(parseInt(days));
    
    res.json({
      success: true,
      data: {
        period: `${days} days`,
        ...stats
      }
    });
  } catch (error) {
    console.error('获取总体API统计错误:', error);
    res.status(500).json({
      success: false,
      error: '获取统计失败'
    });
  }
});

// 异常检测报告（管理员接口）
app.get('/api/admin/stats/anomaly', isAuthenticated, async (req, res) => {
  try {
    const { hours = 24 } = req.query;
    
    const report = await getAnomalyReport(parseInt(hours));
    
    res.json({
      success: true,
      data: report
    });
  } catch (error) {
    console.error('获取异常检测报告错误:', error);
    res.status(500).json({
      success: false,
      error: '获取异常报告失败'
    });
  }
});

// ===== Phase 3: 性能监控API端点 =====

// 实时性能统计（管理员接口）
app.get('/api/admin/performance/stats', isAuthenticated, (req, res) => {
  try {
    const stats = getPerformanceStats();
    res.json({
      success: true,
      data: stats
    });
  } catch (error) {
    console.error('获取性能统计错误:', error);
    res.status(500).json({
      success: false,
      error: '获取性能统计失败'
    });
  }
});

// 详细性能报告（管理员接口）
app.get('/api/admin/performance/report', isAuthenticated, async (req, res) => {
  try {
    const { hours = 24 } = req.query;
    const report = await getDetailedPerformanceReport(parseInt(hours));
    
    if (!report) {
      return res.status(500).json({
        success: false,
        error: '生成性能报告失败'
      });
    }
    
    res.json({
      success: true,
      data: report
    });
  } catch (error) {
    console.error('获取性能报告错误:', error);
    res.status(500).json({
      success: false,
      error: '获取性能报告失败'
    });
  }
});

// 系统性能状态（公开API）
app.get('/api/v2/performance/status', (req, res) => {
  try {
    const stats = getPerformanceStats();
    // 只返回基本的性能指标，不暴露敏感信息
    res.json({
      success: true,
      data: {
        uptime: stats.uptime,
        averageResponseTime: stats.averageResponseTime,
        totalRequests: stats.totalRequests,
        errorRate: stats.errorRate,
        memoryUsage: {
          heapUsed: Math.round(stats.memoryUsage.heapUsed / 1024 / 1024), // MB
          heapTotal: Math.round(stats.memoryUsage.heapTotal / 1024 / 1024) // MB
        },
        status: stats.errorRate > 10 ? 'degraded' : stats.averageResponseTime > 2000 ? 'slow' : 'healthy'
      }
    });
  } catch (error) {
    console.error('获取性能状态错误:', error);
    res.status(500).json({
      success: false,
      error: '获取性能状态失败'
    });
  }
});

// ===== Phase 3: 内存管理API端点 =====

// 内存使用状态（管理员接口）
app.get('/api/admin/memory/status', isAuthenticated, (req, res) => {
  try {
    const memoryStats = getDetailedMemoryStats();
    res.json({
      success: true,
      data: memoryStats
    });
  } catch (error) {
    console.error('获取内存状态错误:', error);
    res.status(500).json({
      success: false,
      error: '获取内存状态失败'
    });
  }
});

// 内存使用报告（管理员接口）
app.get('/api/admin/memory/report', isAuthenticated, (req, res) => {
  try {
    const report = generateMemoryReport();
    res.json({
      success: true,
      data: report
    });
  } catch (error) {
    console.error('生成内存报告错误:', error);
    res.status(500).json({
      success: false,
      error: '生成内存报告失败'
    });
  }
});

// 强制垃圾回收（管理员接口）
app.post('/api/admin/memory/gc', isAuthenticated, (req, res) => {
  try {
    const gcResult = forceGarbageCollection();
    res.json({
      success: true,
      data: gcResult
    });
  } catch (error) {
    console.error('执行垃圾回收错误:', error);
    res.status(500).json({
      success: false,
      error: '执行垃圾回收失败'
    });
  }
});

// 内存泄漏检测（管理员接口）
app.get('/api/admin/memory/leak-detection', isAuthenticated, (req, res) => {
  try {
    const leakInfo = detectMemoryLeaks();
    res.json({
      success: true,
      data: leakInfo
    });
  } catch (error) {
    console.error('内存泄漏检测错误:', error);
    res.status(500).json({
      success: false,
      error: '内存泄漏检测失败'
    });
  }
});

// 基本内存信息（公开API）
app.get('/api/v2/memory/status', (req, res) => {
  try {
    const usage = getMemoryUsage();
    res.json({
      success: true,
      data: {
        heapUsed: usage.heapUsed,
        heapTotal: usage.heapTotal,
        rss: usage.rss,
        status: usage.heapUsed > 150 ? 'high' : usage.heapUsed > 100 ? 'medium' : 'normal'
      }
    });
  } catch (error) {
    console.error('获取内存信息错误:', error);
    res.status(500).json({
      success: false,
      error: '获取内存信息失败'
    });
  }
});

// ===== Phase 3: 缓存管理API端点 =====

// 缓存统计信息（管理员接口）
app.get('/api/admin/cache/stats', isAuthenticated, (req, res) => {
  try {
    const stats = cache.stats();
    res.json({
      success: true,
      data: stats
    });
  } catch (error) {
    console.error('获取缓存统计错误:', error);
    res.status(500).json({
      success: false,
      error: '获取缓存统计失败'
    });
  }
});

// 缓存详细报告（管理员接口）
app.get('/api/admin/cache/report', isAuthenticated, (req, res) => {
  try {
    const report = cache.report();
    res.json({
      success: true,
      data: report
    });
  } catch (error) {
    console.error('生成缓存报告错误:', error);
    res.status(500).json({
      success: false,
      error: '生成缓存报告失败'
    });
  }
});

// 清空缓存（管理员接口）
app.post('/api/admin/cache/clear', isAuthenticated, (req, res) => {
  try {
    const { category } = req.body;
    
    let clearedCount = 0;
    if (category) {
      // 清空特定类别的缓存
      const allKeys = Array.from(cache.report().summary.items);
      // 这里需要实现按类别清除的逻辑
      res.json({
        success: true,
        data: {
          message: `清空 ${category} 类别缓存`,
          clearedCount: 0 // 临时返回0，实际需要实现
        }
      });
    } else {
      // 清空所有缓存
      clearedCount = cache.clear();
      res.json({
        success: true,
        data: {
          message: '清空所有缓存',
          clearedCount
        }
      });
    }
  } catch (error) {
    console.error('清空缓存错误:', error);
    res.status(500).json({
      success: false,
      error: '清空缓存失败'
    });
  }
});

// 缓存预热（管理员接口）
app.post('/api/admin/cache/warmup', isAuthenticated, async (req, res) => {
  try {
    console.log('🔥 开始缓存预热...');
    
    // 预热页面统计数据
    try {
      const { getPagesStats } = require('./models/pages');
      const pagesStats = await getPagesStats();
      cache.stats.set('pages_stats', pagesStats);
      console.log('✅ 页面统计数据已预热');
    } catch (err) {
      console.warn('预热页面统计失败:', err.message);
    }

    // 预热API Keys统计
    try {
      const { getOverallApiStats } = require('./models/apiKeys');
      const apiStats = await getOverallApiStats();
      cache.stats.set('api_overall_stats', apiStats);
      console.log('✅ API统计数据已预热');
    } catch (err) {
      console.warn('预热API统计失败:', err.message);
    }

    res.json({
      success: true,
      data: {
        message: '缓存预热完成',
        timestamp: new Date().toISOString()
      }
    });
  } catch (error) {
    console.error('缓存预热错误:', error);
    res.status(500).json({
      success: false,
      error: '缓存预热失败'
    });
  }
});

// 健康检查API
app.get('/api/v2/health', (req, res) => {
  res.json({
    success: true,
    data: {
      status: 'ok',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      version: '2.0.0',
      environment: process.env.NODE_ENV || 'development'
    }
  });
});

// ================================
// API Key管理 API 端点
// ================================

// 导入API Key相关模型
const { 
  createApiKey, 
  getAllApiKeys, 
  getApiKeyById, 
  deleteApiKey, 
  toggleApiKey, 
  getApiKeyStats,
  getDetailedApiKeyStats,
  getOverallApiStats,
  getAnomalyReport
} = require('./models/apiKeys');

// 获取所有API Keys列表
app.get('/api/admin/apikeys', isAuthenticated, async (req, res) => {
  try {
    const keys = await getAllApiKeys();
    res.json({
      success: true,
      keys: keys
    });
  } catch (error) {
    console.error('获取API Keys列表错误:', error);
    res.status(500).json({
      success: false,
      error: '获取API Keys列表失败'
    });
  }
});

// 创建新的API Key
app.post('/api/admin/apikeys', isAuthenticated, async (req, res) => {
  try {
    const { 
      name, 
      description, 
      permissions, 
      maxRequestsPerHour, 
      maxRequestsPerDay, 
      expiresAt 
    } = req.body;

    if (!name || !permissions || permissions.length === 0) {
      return res.status(400).json({
        success: false,
        error: '请提供API Key名称和权限'
      });
    }

    const result = await createApiKey(
      name,
      description,
      permissions,
      maxRequestsPerHour,
      maxRequestsPerDay,
      expiresAt
    );

    res.json({
      success: true,
      message: 'API Key创建成功',
      keyId: result.keyId,
      apiKey: result.apiKey // 只在创建时返回明文key
    });

  } catch (error) {
    console.error('创建API Key错误:', error);
    res.status(500).json({
      success: false,
      error: '创建API Key失败'
    });
  }
});

// 更新API Key状态
app.put('/api/admin/apikeys/:keyId', isAuthenticated, async (req, res) => {
  try {
    const { keyId } = req.params;
    const { isActive } = req.body;

    const result = await toggleApiKey(keyId, isActive);
    
    if (result) {
      res.json({
        success: true,
        message: `API Key已${isActive ? '启用' : '禁用'}`
      });
    } else {
      res.status(404).json({
        success: false,
        error: 'API Key不存在'
      });
    }

  } catch (error) {
    console.error('更新API Key状态错误:', error);
    res.status(500).json({
      success: false,
      error: '更新API Key状态失败'
    });
  }
});

// 删除API Key
app.delete('/api/admin/apikeys/:keyId', isAuthenticated, async (req, res) => {
  try {
    const { keyId } = req.params;

    const result = await deleteApiKey(keyId);
    
    if (result) {
      res.json({
        success: true,
        message: 'API Key已删除'
      });
    } else {
      res.status(404).json({
        success: false,
        error: 'API Key不存在'
      });
    }

  } catch (error) {
    console.error('删除API Key错误:', error);
    res.status(500).json({
      success: false,
      error: '删除API Key失败'
    });
  }
});

// 获取API Key使用统计
app.get('/api/admin/apikeys/:keyId/stats', isAuthenticated, async (req, res) => {
  try {
    const { keyId } = req.params;
    const days = parseInt(req.query.days) || 7;

    const stats = await getApiKeyStats(keyId, days);
    
    res.json({
      success: true,
      stats: stats
    });

  } catch (error) {
    console.error('获取API Key统计错误:', error);
    res.status(500).json({
      success: false,
      error: '获取API Key统计失败'
    });
  }
});

// 获取API Keys总体统计
app.get('/api/admin/apikeys/stats', isAuthenticated, async (req, res) => {
  try {
    const keys = await getAllApiKeys();
    
    // 计算总体统计
    const totalKeys = keys.length;
    const activeKeys = keys.filter(k => k.is_active === 1).length;
    
    // 获取今天的调用统计（这里简化处理，实际应该查询使用日志）
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    
    // 简化的统计，实际应该查询api_usage_logs表
    const todayCalls = 0; // 需要实现具体的查询逻辑
    const avgResponseTime = 0; // 需要实现具体的查询逻辑
    
    res.json({
      success: true,
      stats: {
        totalKeys,
        activeKeys,
        todayCalls,
        avgResponseTime
      }
    });

  } catch (error) {
    console.error('获取API Keys总体统计错误:', error);
    res.status(500).json({
      success: false,
      error: '获取统计失败'
    });
  }
});

// 导入代码类型检测和内容渲染工具
const { detectCodeType, CODE_TYPES } = require('./utils/codeDetector');
const { renderContent, escapeHtml } = require('./utils/contentRenderer');

// 查看页面路由 - 无需登录即可访问
app.get('/view/:id', async (req, res) => {
  try {
    const { getPageById } = require('./models/pages');
    const { id } = req.params;
    const page = await getPageById(id);

    if (!page) {
      return res.status(404).render('error', {
        title: '页面未找到',
        message: '您请求的页面不存在或已被删除'
      });
    }

    // 检查是否需要密码验证
    if (page.is_protected === 1) {
      const { password } = req.query;

      // 如果没有提供密码或密码不正确，显示密码输入页面
      if (!password || password !== page.password) {
        return res.render('password', {
          title: 'HTML-Go | 密码保护',
          id: id,
          error: password ? '密码错误，请重试' : null
        });
      }
    }

    // 始终重新检测内容类型，确保正确渲染
    const validTypes = ['html', 'markdown', 'svg', 'mermaid'];

    // 打印原始内容的前100个字符，帮助调试
    console.log(`原始内容前100字符: ${page.html_content.substring(0, 100)}...`);

    // 导入代码块提取函数
    const { extractCodeBlocks } = require('./utils/codeDetector');

    // 尝试提取代码块
    const codeBlocks = extractCodeBlocks(page.html_content);

    // 如果找到代码块，处理它们
    let processedContent = page.html_content;
    let detectedType = 'html'; // 默认类型为HTML

    if (codeBlocks.length > 0) {
      console.log(`[DEBUG] 找到${codeBlocks.length}个代码块`);

      // 如果只有一个代码块，并且它几乎占据了整个内容，直接使用该代码块的内容和类型
      if (codeBlocks.length === 1 &&
          codeBlocks[0].content.length > page.html_content.length * 0.7) {
        processedContent = codeBlocks[0].content;
        detectedType = codeBlocks[0].type;
        console.log(`[DEBUG] 使用单个代码块内容，类型: ${detectedType}`);
      }
      // 如果有多个代码块，创建一个HTML文档来包含所有代码块
      else if (codeBlocks.length > 1) {
        // 创建一个HTML文档，包含所有代码块
        let htmlContent = '<!DOCTYPE html>\n<html>\n<head>\n<meta charset="UTF-8">\n';
        htmlContent += '<title>多代码块内容</title>\n';
        htmlContent += '<style>\n';
        htmlContent += '.code-block { margin: 20px 0; padding: 15px; border: 1px solid #ddd; border-radius: 5px; }\n';
        htmlContent += '.code-block-header { font-weight: bold; margin-bottom: 10px; }\n';
        htmlContent += '</style>\n';
        htmlContent += '</head>\n<body>\n';

        // 为每个代码块创建一个div
        codeBlocks.forEach((block, index) => {
          htmlContent += `<div class="code-block">\n`;
          htmlContent += `<div class="code-block-header">代码块 ${index + 1} (${block.originalType})</div>\n`;

          // 根据代码块类型渲染内容
          if (block.type === 'mermaid') {
            htmlContent += `<div class="mermaid">\n${block.content}\n</div>\n`;
          } else if (block.type === 'svg') {
            htmlContent += block.content;
          } else if (block.type === 'html') {
            htmlContent += block.content;
          } else {
            // 对于其他类型，使用pre标签
            htmlContent += `<pre>\n${block.content}\n</pre>\n`;
          }

          htmlContent += '</div>\n';
        });

        htmlContent += '</body>\n</html>';
        processedContent = htmlContent;
        detectedType = 'html';
        console.log('[DEBUG] 创建了包含多个代码块的HTML文档');
      }
    } else {
      // 没有找到代码块，使用原始的检测逻辑
      // 检查是否是 Mermaid 图表
      const mermaidPatterns = [
        /^\s*graph\s+[A-Za-z\s]/i,        // 流程图 (包括 graph TD)
        /^\s*flowchart\s+[A-Za-z\s]/i,    // 流程图 (新语法)
        /^\s*sequenceDiagram/i,           // 序列图
        /^\s*classDiagram/i,              // 类图
        /^\s*gantt/i,                    // 甘特图
        /^\s*pie/i,                      // 饼图
        /^\s*erDiagram/i,                // ER图
        /^\s*journey/i,                  // 用户旅程图
        /^\s*stateDiagram/i,             // 状态图
        /^\s*gitGraph/i                  // Git图
      ];

      // 检查是否是纯 Mermaid 语法
      const trimmedContent = page.html_content.trim();
      const isPureMermaid = mermaidPatterns.some(pattern => pattern.test(trimmedContent));

      // 使用detectCodeType函数检测内容类型
      detectedType = detectCodeType(page.html_content);

      // 安全检查: 如果内容以<!DOCTYPE html>或<html开头，强制识别为HTML
      if (page.html_content.trim().startsWith('<!DOCTYPE html>') ||
          page.html_content.trim().startsWith('<html')) {
        console.log('[DEBUG] 强制识别为完整HTML文档');
        detectedType = 'html';
      }
      // 如果是纯 Mermaid 语法，强制设置为 mermaid 类型
      else if (isPureMermaid) {
        console.log('[DEBUG] 检测到纯 Mermaid 语法，强制设置为 mermaid 类型');
        detectedType = 'mermaid';
      }
    }

    console.log(`检测到的内容类型: ${detectedType}`);
    console.log(`数据库中的内容类型: ${page.code_type}`);

    // 使用检测到的类型，确保正确渲染
    const contentType = validTypes.includes(detectedType) ? detectedType : 'html';

    // 根据不同的内容类型进行渲染
    const renderedContent = await renderContent(processedContent, contentType);

    // 在渲染内容中添加代码类型信息
    // 使用正则表达式在 head 标签结束前添加一个元数据标签
    const contentWithTypeInfo = renderedContent.replace(
      '</head>',
      `<meta name="code-type" content="${contentType}">
</head>`
    );

    // 返回渲染后的内容
    res.send(contentWithTypeInfo);
  } catch (error) {
    console.error('查看页面错误:', error);
    res.status(500).render('error', {
      title: '服务器错误',
      message: '查看页面时发生错误，请稍后再试'
    });
  }
});

// 注意：escapeHtml函数已经从 contentRenderer.js 导入，这里不需要重复定义

// 错误处理
app.use((req, res) => {
  res.status(404).render('error', {
    title: '页面未找到',
    message: '您请求的页面不存在'
  });
});

// 启动应用
initDatabase().then(() => {
  // 数据库初始化成功后，再启动服务器
  console.log('数据库初始化成功');
  console.log(`当前环境: ${process.env.NODE_ENV}`);
  console.log(`配置端口: ${config.port}`);
  console.log(`实际使用端口: ${PORT}`);
  console.log(`日志级别: ${config.logLevel}`);

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`服务器运行在 http://0.0.0.0:${PORT}`);

    // 添加路由处理器日志
    console.log('已注册的路由:');
    app._router.stack.forEach(middleware => {
      if (middleware.route) { // 路由
        console.log(`${Object.keys(middleware.route.methods)} ${middleware.route.path}`);
      }
    });

    // ===== Phase 3: 启动性能监控定期任务 =====
    
    // 立即执行一次清理
    console.log('🧹 执行性能日志清理...');
    cleanupOldLogs();
    
    // ===== Phase 3: 启动内存监控 =====
    console.log('🧠 启动内存监控...');
    startMemoryMonitoring();
    
    // 设置定期清理任务（每天凌晨2点执行）
    const cleanupInterval = setInterval(() => {
      const now = new Date();
      if (now.getHours() === 2 && now.getMinutes() === 0) {
        console.log('🧹 定期执行性能日志清理...');
        cleanupOldLogs();
      }
    }, 60000); // 每分钟检查一次
    
    // 进程退出时清理定时器
    process.on('SIGINT', () => {
      console.log('\n🛑 收到终止信号，清理资源...');
      clearInterval(cleanupInterval);
      process.exit(0);
    });
    
    console.log('✅ 性能监控定期清理任务已启动');
  });

}).catch(err => {
  console.error('数据库初始化失败，应用无法启动:', err);
  process.exit(1); // 初始化失败时，直接退出进程
});
