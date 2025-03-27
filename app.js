const express = require('express');
const path = require('path');
const bodyParser = require('body-parser');
const morgan = require('morgan');
const cors = require('cors');
const { initDatabase } = require('./models/db');

// 路由导入
const pagesRoutes = require('./routes/pages');

// 初始化应用
const app = express();
const PORT = process.env.PORT || 5678; // 修改为5678端口，避免与已运行的服务冲突

// 中间件设置
app.use(morgan('dev')); // 日志
app.use(cors()); // 跨域支持
app.use(bodyParser.json()); // JSON 解析
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public'))); // 静态文件

// 设置视图引擎
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'ejs');

// 路由设置
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

// 首页路由
app.get('/', (req, res) => {
  res.render('index', { title: 'HTML-Go | 分享 HTML 代码的简单方式' });
});

// 导入代码类型检测和内容渲染工具
const { detectCodeType, CODE_TYPES } = require('./utils/codeDetector');
const { renderContent, escapeHtml } = require('./utils/contentRenderer');

// 查看页面路由
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
    
    // 优先使用数据库中保存的代码类型，如果没有则重新检测
    let contentType = page.code_type;
    
    // 如果数据库中没有代码类型信息或不是有效的类型，则重新检测
    const validTypes = ['html', 'markdown', 'svg', 'mermaid'];
    if (!contentType || !validTypes.includes(contentType)) {
      contentType = detectCodeType(page.html_content);
      console.log(`检测到的内容类型: ${contentType}`);
    } else {
      console.log(`使用数据库中的内容类型: ${contentType}`);
    }
    
    // 根据不同的内容类型进行渲染
    const renderedContent = await renderContent(page.html_content, contentType);
    
    // 返回渲染后的内容
    res.send(renderedContent);
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
  app.listen(PORT, () => {
    console.log(`服务器运行在 http://localhost:${PORT}`);
  });
}).catch(err => {
  console.error('数据库初始化失败:', err);
});

module.exports = app;
