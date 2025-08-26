# Repository Guidelines

## Project Structure & Module Organization
- Entry: `app.js` (Express + EJS); config: `config.js`.
- Core dirs: `routes/`, `models/`, `middleware/`, `utils/`, `views/` (EJS), `public/` (static), `tests/`, `scripts/`, `docs/`, `db/`, `sessions/`.
- Examples: `utils/cacheManager.js`, `middleware/apiKey.js`, `views/index-modern.ejs`, `tests/login-automation.spec.js`.

## Build, Test, and Development Commands
- Install deps: `npm install`.
- Dev server: `npm run dev` (nodemon on `http://localhost:5678`).
- Production: `npm start` or `npm run prod` (port `8888`).
- E2E tests (Playwright): `npx playwright test` (start the app first).
- Scenario scripts: `node tests/phase2-test.js`, `node tests/phase3-performance-test.js`, `node test-api-calls.js`.

## Coding Style & Naming Conventions
- Indent 2 spaces; use semicolons; prefer single quotes.
- JS filenames in camelCase (e.g., `apiKeys.js`, `responseTimeMonitor.js`).
- Views/static assets in kebab-case (e.g., `index-modern.ejs`, `public/js/...`).
- Favor small, pure functions; add JSDoc for exported utils; avoid implicit globals.

## Testing Guidelines
- Framework: Playwright (`@playwright/test`); place specs in `tests/*.spec.js`.
- Start the app before tests: `npm run dev`; run a single spec: `npx playwright test tests/login-automation.spec.js`.
- API checks: `node test-api-calls.js`.
- No coverage gate yet; keep tests repeatable and independent. `AUTH_PASSWORD` reads from `.env` (default `admin123`).

## Commit & Pull Request Guidelines
- Commits follow Conventional Commits; emojis allowed. Examples:
  - `feat: 添加页面管理API`
  - `🐛 fix: 修复会话存储路径问题`
  - `🎨 refactor(admin): 优化导航结构`
- PRs must include: change summary, motivation/impact, linked issue(s), test plan (commands + expected results), and screenshots/GIFs for UI changes.
- Pre-merge: app starts locally, Playwright passes, no secrets leaked, API changes documented under `docs/`.

## Security & Configuration Tips
- Copy `env.example` or `.env.example` to `.env`. Local testing: set `AUTH_ENABLED=true`, `AUTH_PASSWORD=admin123`.
- Never commit secrets; `.env`, `db/*.db*`, `sessions/` are gitignored. Rotate API keys; avoid logging sensitive headers.
- Production: set `NODE_ENV=production`, `AUTH_ENABLED=true`; prefer `start-production.sh` or Docker/Compose.

