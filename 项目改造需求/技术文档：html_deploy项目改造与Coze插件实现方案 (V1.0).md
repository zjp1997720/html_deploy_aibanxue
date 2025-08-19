# **技术文档：html\_deploy项目改造与Coze插件实现方案 (V1.0)**

| 文档状态 | 草稿 |
| :---- | :---- |
| **关联需求** | PRD-html-deploy-plugin-v1.0 |
| **创建日期** | 2025-08-19 |
| **作者** | Gemini |

### **1\. 概述**

本文档为“自部署HTML托管服务及Coze插件”项目的技术实现方案。开发者（大鹏）将根据本文档对现有的 html\_deploy (Node.js \+ Express) 项目进行修改，并配置 Coze 插件。

### **2\. 技术栈与架构**

* **技术栈:** 保持现有技术栈不变 (Node.js, Express.js, EJS, SQLite3)。  
* **架构:** 在现有单体应用架构上进行扩展。主要工作包括修改认证中间件、增加新的API路由和后台管理页面。

### **3\. 后端改造实施细节**

#### **3.1 环境变量配置**

为了安全地管理 API 密钥，我们需要在环境变量中添加一个新的密钥。

1. 打开项目根目录下的 .env 文件 (如果不存在，请从 .env.example 复制一份)。  
2. 在文件末尾添加以下配置项，并设置一个足够复杂的密钥（建议使用密码生成器）：  
   \# .env

   \# ... 其他配置 ...

   \# 用于 Coze 插件调用的 API 密钥  
   API\_TOKEN=your\_super\_secret\_and\_long\_token\_here\_12345\!@\#$

3. 打开 config.js 文件，读取这个新的环境变量：  
   // config.js

   // ...

   const config \= {  
     // ...  
     development: {  
       // ...  
       authPassword: process.env.AUTH\_PASSWORD || 'admin123',  
       apiToken: process.env.API\_TOKEN || null // 新增此行  
     },  
     production: {  
       // ...  
       authPassword: process.env.AUTH\_PASSWORD || 'admin123',  
       apiToken: process.env.API\_TOKEN || null // 新增此行  
     },  
     test: {  
       // ...  
       authPassword: process.env.AUTH\_PASSWORD || 'admin123',  
       apiToken: process.env.API\_TOKEN || null // 新增此行  
     }  
   };

   // ...

#### **3.2 API Token 认证实现**

我们需要修改认证中间件，使其能够识别来自 Coze 插件的 Token。

1. **文件路径:** middleware/auth.js  
2. **修改内容:** 替换 isAuthenticated 函数为以下代码。新代码增加了对 Authorization 请求头的检查。  
   // middleware/auth.js

   /\*\*  
    \* 检查用户是否已认证  
    \* 支持两种方式：  
    \* 1\. 网页端：通过 session 和 cookie  
    \* 2\. API端：通过 Authorization Header 中的 Bearer Token  
    \*/  
   function isAuthenticated(req, res, next) {  
     const { authEnabled, apiToken } \= req.app.locals.config;

     // 如果认证功能未启用，直接通过  
     if (\!authEnabled) {  
       return next();  
     }

     // 方式一：检查网页端 session 和 cookie  
     if (req.session && req.session.isAuthenticated) {  
       return next();  
     }  
     if (req.cookies && req.cookies.auth \=== 'true') {  
       req.session.isAuthenticated \= true;  
       return next();  
     }

     // 方式二：检查 API Token  
     const authHeader \= req.headers\['authorization'\];  
     if (apiToken && authHeader && authHeader.startsWith('Bearer ')) {  
       const token \= authHeader.substring(7); // 提取 "Bearer " 后面的 token  
       if (token \=== apiToken) {  
         return next(); // Token 验证成功  
       }  
     }

     // 如果两种认证都失败，对于API请求返回401，对于网页请求重定向  
     if (req.path.startsWith('/api/')) {  
       return res.status(401).json({ success: false, error: 'Unauthorized: Invalid API Token' });  
     } else {  
       return res.redirect('/login');  
     }  
   }

   module.exports \= {  
     isAuthenticated  
   };

#### **3.3 后台管理功能实现**

##### **3.3.1 数据层 (Model)**

1. **文件路径:** models/pages.js  
2. **修改内容:** 在文件末尾，module.exports 之前，添加 getAllPages 函数，并导出它。  
   // models/pages.js

   // ... (已有的 createPage, getPageById, getRecentPages 函数) ...

   /\*\*  
    \* 获取所有页面列表，用于后台管理  
    \* @returns {Promise\<Array\>} 返回所有页面的列表  
    \*/  
   async function getAllPages() {  
     try {  
       // 选择需要的字段，并按创建时间降序排列  
       return await query(  
         'SELECT id, created\_at, is\_protected, code\_type FROM pages ORDER BY created\_at DESC'  
       );  
     } catch (error) {  
       console.error('获取所有页面错误:', error);  
       throw error;  
     }  
   }

   module.exports \= {  
     createPage,  
     getPageById,  
     getRecentPages,  
     getAllPages // \<-- 新增导出  
   };

##### **3.3.2 路由层 (Route)**

1. **文件路径:** app.js  
2. **修改内容:** 在查看页面路由 (/view/:id) 之前，添加后台管理页面的路由。  
   // app.js

   // ... (在 const { createPage, ... } \= require('./models/pages'); 这一行)  
   const { createPage, getPageById, getRecentPages, getAllPages } \= require('./models/pages'); // \<-- 引入 getAllPages

   // ... (在 API 路由设置之后, 查看页面路由之前)

   // 后台管理页面路由  
   app.get('/admin/dashboard', isAuthenticated, async (req, res) \=\> {  
     try {  
       const pages \= await getAllPages();  
       res.render('dashboard', {  
         title: 'HTML-Go | 后台管理',  
         pages: pages,  
         // 将 Date.now() 毫秒时间戳转换为可读日期  
         formatDate: (timestamp) \=\> new Date(timestamp).toLocaleString()  
       });  
     } catch (error) {  
       console.error('无法加载后台管理页面:', error);  
       res.status(500).render('error', {  
         title: '服务器错误',  
         message: '加载后台管理页面失败'  
       });  
     }  
   });

   // 查看页面路由 \- 无需登录即可访问  
   app.get('/view/:id', async (req, res) \=\> {  
   // ...

##### **3.3.3 视图层 (View)**

1. **文件路径:** views/dashboard.ejs (新建此文件)  
2. **文件内容:** 复制以下代码到新文件中。这是一个带有一些基本内联样式的新页面。  
   \<%- include('partials/header', { title }) %\>

   \<style\>  
     .dashboard-container { max-width: 1200px; margin: 2rem auto; padding: 2rem; }  
     .dashboard-table { width: 100%; border-collapse: collapse; margin-top: 1.5rem; }  
     .dashboard-table th, .dashboard-table td { padding: 12px 15px; border: 1px solid var(--border-color); text-align: left; }  
     .dashboard-table th { background-color: rgba(var(--primary-rgb), 0.1); font-family: 'Orbitron', sans-serif; }  
     .dashboard-table a { color: var(--primary); text-decoration: none; }  
     .dashboard-table a:hover { text-decoration: underline; }  
     .status-protected { color: \#f43f5e; font-weight: bold; }  
     .status-public { color: \#10b981; }  
   \</style\>

   \<div class="main-container"\>  
     \<header class="app-header"\>  
       \<div class="title-container"\>  
         \<h1 class="cyber-title"\>\<span\>A\</span\>\<span\>D\</span\>\<span\>M\</span\>\<span\>I\</span\>\<span\>N\</span\>\</h1\>  
       \</div\>  
       \<p class="app-description"\>已部署页面列表\</p\>  
     \</header\>

     \<div class="card dashboard-container"\>  
       \<table class="dashboard-table"\>  
         \<thead\>  
           \<tr\>  
             \<th\>页面 ID\</th\>  
             \<th\>代码类型\</th\>  
             \<th\>创建时间\</th\>  
             \<th\>状态\</th\>  
           \</tr\>  
         \</thead\>  
         \<tbody\>  
           \<% if (pages.length \> 0\) { %\>  
             \<% pages.forEach(function(page) { %\>  
               \<tr\>  
                 \<td\>\<a href="/view/\<%= page.id %\>" target="\_blank"\>\<%= page.id %\>\</a\>\</td\>  
                 \<td\>\<%= page.code\_type.toUpperCase() %\>\</td\>  
                 \<td\>\<%= formatDate(page.created\_at) %\>\</td\>  
                 \<td\>  
                   \<% if (page.is\_protected) { %\>  
                     \<span class="status-protected"\>加密\</span\>  
                   \<% } else { %\>  
                     \<span class="status-public"\>公开\</span\>  
                   \<% } %\>  
                 \</td\>  
               \</tr\>  
             \<% }); %\>  
           \<% } else { %\>  
             \<tr\>  
               \<td colspan="4" style="text-align: center;"\>暂无已部署的页面\</td\>  
             \</tr\>  
           \<% } %\>  
         \</tbody\>  
       \</table\>  
     \</div\>

     \<footer class="app-footer"\>  
       \<p class="footer-text"\>@2025 \<a href="https://x.com/vista8" target="\_blank" rel="noopener noreferrer"\>向阳乔木\</a\>\</p\>  
     \</footer\>  
   \</div\>

   \<%- include('partials/footer') %\>

#### **3.4 API 响应格式调整**

为了适配 Coze 插件的输出参数，我们需要修改 API 的返回格式。

1. **文件路径:** app.js  
2. **修改内容:** 找到 /api/pages/create 路由，并修改其返回的 JSON 对象。  
   // app.js

   // 创建页面的 API 需要认证  
   app.post('/api/pages/create', isAuthenticated, async (req, res) \=\> {  
     try {  
       const { htmlContent, isProtected, codeType } \= req.body; // 接收 codeType

       if (\!htmlContent) {  
         return res.status(400).json({ success: false, error: '请提供HTML内容' });  
       }

       // 注意：createPage 函数也需要修改以接收 codeType  
       const result \= await createPage(htmlContent, isProtected, codeType);  
       const url \= \`${req.protocol}://${req.get('host')}/view/${result.urlId}\`;

       // 返回适配 Coze 插件的格式  
       res.json({  
         success: true,  
         url: url,  
         // 保留 password 和 isProtected 供网页端使用  
         password: result.password,  
         isProtected: \!\!result.password,  
         debug\_info: \`Page created with ID: ${result.urlId}\`  
       });  
     } catch (error) {  
       console.error('创建页面API错误:', error);  
       res.status(500).json({ success: false, error: '服务器错误' });  
     }  
   });

3. 同步修改 models/pages.js  
   确保 createPage 函数能接收并保存 codeType。  
   文件路径: models/pages.js  
   // models/pages.js  
   // ...  
   async function createPage(htmlContent, isProtected \= false, codeType \= 'html') { // 增加 codeType 参数  
     try {  
       // ...  
       await run(  
         'INSERT INTO pages (id, html\_content, created\_at, password, is\_protected, code\_type) VALUES (?, ?, ?, ?, ?, ?)',  
         \[urlId, htmlContent, Date.now(), password, isProtected ? 1 : 0, codeType\] // 保存 codeType  
       );  
       // ...  
     }  
     //...  
   }  
   // ...

### **4\. Coze 插件配置指南**

在你的后端服务成功部署后，按照以下步骤在 Coze 平台创建插件。

1. **登录 Coze**，进入工作空间，点击 **\+资源** \-\> **插件**。  
2. **创建方式**：选择 **“基于 API 创建插件”**。  
3. **基础信息**：填写插件名称（如 MyHTMLDeployer）和描述。  
4. **授权方式**：选择 **"API Key"**。  
   * **Key**: Authorization  
   * **添加到**: Header  
   * **认证方式**: Bearer  
5. **创建工具**：  
   * **工具名称**: deployHTML  
   * **工具描述**: 接收一段HTML代码，将其部署到个人服务器并返回一个公开链接。  
   * **工具路径**: /api/pages/create (这是你服务器域名后的路径)  
   * **请求方法**: POST  
6. 配置输入参数：  
   | 参数名称 | 参数描述 | 参数类型 | 是否必填 | 传入方法 |  
   | :--- | :--- | :--- | :--- | :--- |  
   | html\_content | 需要部署的完整HTML代码字符串。 | string | 是 | Body |  
   | token | 用于API认证的密钥。 | string | 是 | Authentication |  
7. 配置输出参数：  
   | 参数名称 | 参数描述 | 参数类型 |  
   | :--- | :--- | :--- |  
   | url | 部署成功后生成的公开访问链接。 | string |  
   | success | 操作是否成功，true 或 false。 | boolean |  
   | debug\_info | 用于调试的额外信息。 | string |  
8. **调试与发布**：  
   * 在调试页面，填入你的服务器完整URL（例如 http://123.45.67.89:8888）。  
   * 在 html\_content 中填入一段测试HTML，如 \<h1\>Hello World\</h1\>。  
   * 在 token 中填入你在 .env 文件里设置的 API\_TOKEN。  
   * 点击“运行”，如果一切正常，你应该能看到返回的 url。  
   * 调试通过后，发布插件即可在你的 Bot 中使用。

### **5\. 部署与运维建议**

1. **部署**: 强烈建议使用项目自带的 Dockerfile 和 docker-compose.yml 进行容器化部署，这能极大地简化环境配置。  
2. **安全**:  
   * **防火墙**: 在你的云服务器安全组中，只开放 22 (SSH), 80 (HTTP), 443 (HTTPS), 以及你服务所需的端口（如 8888）。  
   * **HTTPS**: 在生产环境中，务必使用 Nginx 或 Caddy 等反向代理工具，为你的服务配置免费的 Let's Encrypt SSL 证书，启用 HTTPS 访问。  
3. **备份**: 定期备份 db/html-go.db 文件，防止数据丢失。