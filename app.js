const express = require('express');
const path = require('path');
const bodyParser = require('body-parser');
const morgan = require('morgan');
const cors = require('cors');
const { initDatabase } = require('./models/db');

// 导入配置
const config = require('./config');

// 路由导入
const pagesRoutes = require('./routes/pages');

// 初始化应用
const app = express();
// 确保在服务器上使用正确的端口
const PORT = process.env.NODE_ENV === 'production' ? 8888 : config.port;

// 中间件设置
app.use(morgan(config.logLevel)); // 使用配置文件中的日志级别
app.use(cors()); // 跨域支持
app.use(bodyParser.json({ limit: '15mb' })); // JSON 解析，增加限制为15MB
app.use(bodyParser.urlencoded({ extended: true, limit: '15mb' })); // 增加限制为15MB
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
  // 添加更多调试日志
  console.log('数据库初始化成功');
  console.log(`当前环境: ${process.env.NODE_ENV}`);
  console.log(`配置端口: ${config.port}`);
  console.log(`实际使用端口: ${PORT}`);
  console.log(`日志级别: ${config.logLevel}`);
  
  app.listen(PORT, () => {
    console.log(`服务器运行在 http://localhost:${PORT}`);
    
    // 添加路由处理器日志
    console.log('已注册的路由:');
    app._router.stack.forEach(middleware => {
      if(middleware.route) { // 路由
        console.log(`${Object.keys(middleware.route.methods)} ${middleware.route.path}`);
      }
    });
  });
}).catch(err => {
  console.error('数据库初始化失败:', err);
});

module.exports = app;
