# HTML代码分享工具 (Express版本)

这是一个基于Express.js开发的HTML代码分享工具，允许用户分享和查看HTML代码片段。

## 功能特性

- HTML代码片段的创建和分享
- 支持代码语法高亮显示
- 简洁的用户界面
- 安全的数据存储

## 技术栈

- Node.js
- Express.js
- EJS模板引擎
- SQLite数据库
- 其他依赖：
  - body-parser：请求体解析
  - cors：跨域资源共享
  - crypto-js：加密功能
  - dotenv：环境变量管理
  - morgan：HTTP请求日志

## 项目结构

```
.
├── app.js              # 应用程序入口文件
├── config/            # 配置文件目录
├── models/            # 数据模型目录
├── routes/            # 路由处理目录
├── views/             # EJS模板文件目录
├── public/            # 静态资源目录
└── db/                # SQLite数据库文件目录
```

## 安装和运行

1. 安装依赖：
```bash
npm install
```

2. 启动服务器：

开发环境（支持热重载）：
```bash
npm run dev
```

生产环境：
```bash
npm start
```

服务器默认运行在 http://localhost:3000

## 环境变量

项目使用.env文件管理环境变量，主要包含：

- PORT：服务器端口号
- DB_PATH：数据库文件路径
- SECRET_KEY：加密密钥

## API接口

### 1. 创建代码片段
- 路径：POST /api/snippets
- 功能：创建新的代码片段
- 参数：
  - title: 标题
  - content: HTML代码内容
  - description: 描述（可选）

### 2. 获取代码片段
- 路径：GET /api/snippets/:id
- 功能：获取指定ID的代码片段
- 参数：
  - id: 代码片段ID

## 使用说明

1. 访问首页 http://localhost:3000
2. 点击"创建新代码片段"按钮
3. 填写代码片段信息并提交
4. 获得分享链接，可以分享给其他人

## 开发计划

- [ ] 添加用户认证系统
- [ ] 支持更多代码语言
- [ ] 添加代码片段评论功能
- [ ] 支持代码片段版本控制

## 贡献指南

欢迎提交Issue和Pull Request来改进这个项目。

## 许可证

ISC License 