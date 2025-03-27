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
const PORT = process.env.PORT || 3000;

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
    
    // 检查是否是纯HTML内容
    if (page.html_content.trim().startsWith('<!DOCTYPE html>') || 
        page.html_content.trim().startsWith('<html')) {
      // 直接返回HTML内容
      res.send(page.html_content);
    } else {
      // 如果不是完整的HTML文档，添加基本的HTML结构和语法高亮
      res.send(`
        <!DOCTYPE html>
        <html lang="zh-CN">
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>HTML-Go 查看器</title>
          <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/highlight.js/11.7.0/styles/atom-one-dark.min.css">
          <style>
            body {
              font-family: 'Roboto', sans-serif;
              line-height: 1.6;
              color: #333;
              max-width: 1000px;
              margin: 0 auto;
              padding: 20px;
              background-color: #f5f5f7;
            }
            pre {
              background-color: #282c34;
              border-radius: 6px;
              padding: 15px;
              overflow: auto;
              margin: 20px 0;
            }
            code {
              font-family: 'Menlo', 'Monaco', 'Courier New', monospace;
              font-size: 14px;
            }
            .hljs {
              background: #282c34;
              color: #abb2bf;
              padding: 0.5em;
              border-radius: 5px;
            }
            .container {
              background-color: white;
              border-radius: 8px;
              box-shadow: 0 2px 10px rgba(0,0,0,0.1);
              padding: 30px;
              margin-top: 20px;
            }
            .header {
              margin-bottom: 20px;
              border-bottom: 1px solid #eee;
              padding-bottom: 10px;
            }
            .footer {
              margin-top: 30px;
              text-align: center;
              font-size: 0.9rem;
              color: #666;
            }
            @media (prefers-color-scheme: dark) {
              body {
                background-color: #1a1a1a;
                color: #e6e6e6;
              }
              .container {
                background-color: #2a2a2a;
                box-shadow: 0 2px 10px rgba(0,0,0,0.3);
              }
              .header {
                border-bottom-color: #444;
              }
              .footer {
                color: #999;
              }
            }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>HTML-Go 查看器</h1>
              <p>以下是分享的HTML代码：</p>
            </div>
            <pre><code class="language-html">${escapeHtml(page.html_content)}</code></pre>
            <div class="footer">
              <p>由 HTML-Go 提供支持 | <a href="/">创建您自己的分享</a></p>
            </div>
          </div>
          <script src="https://cdnjs.cloudflare.com/ajax/libs/highlight.js/11.7.0/highlight.min.js"></script>
          <script>
            document.addEventListener('DOMContentLoaded', () => {
              document.querySelectorAll('pre code').forEach((block) => {
                hljs.highlightElement(block);
              });
            });
          </script>
        </body>
        </html>
      `);
    }
  } catch (error) {
    console.error('查看页面错误:', error);
    res.status(500).render('error', { 
      title: '服务器错误',
      message: '查看页面时发生错误，请稍后再试' 
    });
  }
});

// 辅助函数：HTML转义
function escapeHtml(unsafe) {
  return unsafe
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

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
