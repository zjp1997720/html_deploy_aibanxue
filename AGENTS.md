# Repository Guidelines

## 项目结构与模块组织
- `app.js` 与 `config.js` 驱动 Express+EJS 服务，`cluster.js` 与 `ecosystem.config.js` 负责多进程与 PM2 配置。
- 业务代码按职责拆分：`routes/` 定义路由，`models/` 管理 SQLite3 数据访问，`middleware/` 存放鉴权与速率控制，`utils/` 提供缓存和日志等工具。
- 视图置于 `views/`，静态资源归档 `public/`，自动化脚本位于 `scripts/`，端到端测试集中在 `tests/`。

## 构建、测试与开发命令
- `npm install`：安装并锁定依赖；首次拉取或锁文件变动后必跑。
- `npm run dev`：经 nodemon 在 `http://localhost:5678` 热重载；调试期优先。
- `npm start` / `npm run prod`：生产等价入口，默认监听 `8888`；用于冒烟验证。
- `npx playwright test`：运行全量 Playwright 套件，生成 `playwright-report/`。
- `node tests/phase2-test.js` 与 `node test-api-calls.js`：快速回归性能与 API 健康。

## 代码风格与命名约定
- JavaScript 统一 2 空格缩进、分号结尾、单引号；函数保持单一职责，复杂逻辑拆到 `utils/`。
- 文件命名遵循小驼峰（如 `apiKeys.js`），视图及静态资源使用短横线（如 `views/index-modern.ejs`）。
- 提交前运行 `npm run lint`（若无脚本请补充 eslint 配置），确保不引入隐式全局或未使用变量。

## 测试指南
- 采用 `@playwright/test`，测试文件命名 `*.spec.js` 并保持独立，可视需求分层放置夹具。
- 本地修改需至少覆盖关键路径的端到端场景，若新增 API，请补充到 `test-api-calls.js` 或新增自检脚本。
- 若发现回归，先以最小用例复现，再补充断言进入主线测试，守住“先写失败用例再修复”的 TDD 节奏。

## 提交与合并请求规范
- 遵循 Conventional Commits，可选表情：如 `feat: 新增导出任务`, `🐛 fix: 调整会话清理`, `🔧 chore: 更新 playwright 配置`。
- PR 必附：变更摘要、动机与影响、关联 issue 编号、测试计划（含命令/结果）、若改动 UI 请提供截图或 GIF。
- 合并前确认应用可启动、Playwright 通过、`docs/` 同步相关接口说明，并确保“不破坏用户空间”。

## 安全与配置提示
- 根据 `env.example` 生成 `.env`，本地常用 `AUTH_ENABLED=true` 与 `AUTH_PASSWORD=admin123`，生产需重置强密码。
- 避免提交 `db/*.db*`、`sessions/` 等持久化数据；轮换 API 密钥并在日志中脱敏。
- 部署场景建议使用 `start-production.sh` 或 Docker Compose，搭配 `NODE_ENV=production` 与反向代理保障可观测性。

## CI/CD 与发布事实记录（已跑通）
- 工作流文件：
  - 部署：`.github/workflows/main.yml`（push 到 `main` 自动触发，亦支持手动触发）。
  - 冒烟：`.github/workflows/smoke.yml`（手动触发，依赖 `Secrets.AUTH_PASSWORD`）。
- 部署流水线要点：
  - `actions/checkout@v4` 拉取代码，Node v20 环境安装生产依赖（忽略 dev 与 puppeteer 下载）。
  - 使用 `git archive` 生成 `release.tar.gz`，通过 `appleboy/scp-action` 传至服务器 `/tmp/`。
  - 服务器端 `appleboy/ssh-action` 解包到 `/root/html_deploy_aibanxue`，保留 `.env/ db/ sessions/ node_modules/`，其余清理后覆盖更新。
  - 写入 `version.json`，并通过 `pm2 reload html-go --update-env` 零停机重载。
  - 健康检查以生产域名为准：`https://htmlshare.aibanxue.top/` 与 `https://htmlshare.aibanxue.top/version`。
  - 说明：内部服务仍监听 `127.0.0.1:8888`（被 Nginx 反代），该地址仅用于服务器侧备用自检，不作为对外入口。
- 环境变量与短链策略：
  - 流水线会根据变量 `PAGE_ID_STRATEGY` 与 `PAGE_ID_MAX_RETRIES` 更新服务器 `.env`；未显式设置时默认 `base62` 与 `5`。
  - 老链接不受影响，新建页面遵循当次策略（符合 Never break userspace）。
- 最近一次成功发布与验证：
  - 修复 `models/pages.js` 导出，恢复 `createPage/getAllPages` 等接口后已推送 `main`，部署工作流顺利完成，站点可用。
  - 通过页面“生成分享链接”确认生成 10 位 base62 短链成功（策略默认为 `base62`）。
- 本地/手动验证建议：
  - 健康：访问 `https://htmlshare.aibanxue.top/` 与 `https://htmlshare.aibanxue.top/version` 均为 200。
  - 登录→`POST /api/pages/create` 返回 `success=true` 与 `url`；尾段长度 7（md5）或 10（base62）。
- 回滚策略：
  - 直接在 Git 仓库 `revert` 问题提交并 push 到 `main`，工作流会自动下发；必要时在服务器以 PM2 回滚上一次 release（或使用 `docs/fix-502-rewrite-pagesjs.md` 中的备份文件快速恢复模型层）。
