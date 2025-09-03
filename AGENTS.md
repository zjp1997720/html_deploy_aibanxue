# Repository Guidelines

> 面向贡献者的精炼协作指南（本库：Express + EJS）。

## 项目结构与模块组织
- 入口：`app.js`（Express + EJS），配置：`config.js`。
- 目录：`routes/`、`models/`、`middleware/`、`utils/`、`views/`、`public/`、`tests/`、`scripts/`、`docs/`、`db/`、`sessions/`。
- 示例：`utils/cacheManager.js`、`middleware/apiKey.js`、`views/index-modern.ejs`、`tests/login-automation.spec.js`。

## 构建、测试与开发命令
- 安装依赖：`npm install`。
- 本地开发：`npm run dev`（nodemon，`http://localhost:5678`）。
- 生产运行：`npm start` 或 `npm run prod`（端口 `8888`）。
- 端到端测试：先启动应用，再执行 `npx playwright test`。
- 场景脚本：`node tests/phase2-test.js`、`node tests/phase3-performance-test.js`、`node test-api-calls.js`。

## 代码风格与命名
- 缩进 2 空格；使用分号；优先单引号。
- JS 文件名小驼峰：如 `apiKeys.js`、`responseTimeMonitor.js`。
- 视图/静态资源使用短横线命名：如 `views/index-modern.ejs`、`public/js/...`。
- 偏好小而纯的函数；导出工具使用 JSDoc；避免隐式全局变量。

## 测试规范
- 框架：Playwright（`@playwright/test`），测试位于 `tests/*.spec.js`。
- 运行单测例：`npx playwright test tests/login-automation.spec.js`。
- API 快检：`node test-api-calls.js`。
- 覆盖率：暂无强制门槛；测试应可复现且相互独立。
- 鉴权：`.env` 中的 `AUTH_PASSWORD`（默认 `admin123`）。

## 提交与拉取请求
- 提交遵循 Conventional Commits，可配表情：
  - `feat: 添加页面管理API`
  - `🐛 fix: 修复会话存储路径问题`
  - `🎨 refactor(admin): 优化导航结构`
- PR 必含：变更摘要、动机与影响、关联 issue、测试计划（命令与期望结果）、UI 变更的截图/GIF。
- 合并前：应用可本地启动、Playwright 通过、无敏感信息泄漏、API 变更同步至 `docs/`。

## 安全与配置
- 复制 `env.example` 或 `.env.example` 为 `.env`；本地可设 `AUTH_ENABLED=true`、`AUTH_PASSWORD=admin123`。
- 切勿提交密钥；`db/*.db*`、`sessions/` 已忽略；轮换 API Key，避免记录敏感头。
- 生产：`NODE_ENV=production`、`AUTH_ENABLED=true`；建议使用 `start-production.sh` 或 Docker/Compose。
