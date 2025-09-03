=== Waiting for app readiness on 127.0.0.1:8888 ===
curl: (7) Failed to connect to 127.0.0.1 port 8888 after 0 ms: Connection refused
curl: (7) Failed to connect to 127.0.0.1 port 8888 after 0 ms: Connection refused
curl: (7) Failed to connect to 127.0.0.1 port 8888 after 0 ms: Connection refused
curl: (7) Failed to connect to 127.0.0.1 port 8888 after 0 ms: Connection refused
curl: (7) Failed to connect to 127.0.0.1 port 8888 after 0 ms: Connection refused
curl: (7) Failed to connect to 127.0.0.1 port 8888 after 0 ms: Connection refused
curl: (7) Failed to connect to 127.0.0.1 port 8888 after 0 ms: Connection refused
curl: (7) Failed to connect to 127.0.0.1 port 8888 after 0 ms: Connection refused
curl: (7) Failed to connect to 127.0.0.1 port 8888 after 0 ms: Connection refused
curl: (7) Failed to connect to 127.0.0.1 port 8888 after 0 ms: Connection refused
curl: (7) Failed to connect to 127.0.0.1 port 8888 after 0 ms: Connection refused
curl: (7) Failed to connect to 127.0.0.1 port 8888 after 0 ms: Connection refused
curl: (7) Failed to connect to 127.0.0.1 port 8888 after 0 ms: Connection refused
curl: (7) Failed to connect to 127.0.0.1 port 8888 after 0 ms: Connection refused
curl: (7) Failed to connect to 127.0.0.1 port 8888 after 0 ms: Connection refused
curl: (7) Failed to connect to 127.0.0.1 port 8888 after 0 ms: Connection refused
curl: (7) Failed to connect to 127.0.0.1 port 8888 after 0 ms: Connection refused
curl: (7) Failed to connect to 127.0.0.1 port 8888 after 0 ms: Connection refused
curl: (7) Failed to connect to 127.0.0.1 port 8888 after 0 ms: Connection refused
curl: (7) Failed to connect to 127.0.0.1 port 8888 after 0 ms: Connection refused
curl: (7) Failed to connect to 127.0.0.1 port 8888 after 0 ms: Connection refused
curl: (7) Failed to connect to 127.0.0.1 port 8888 after 0 ms: Connection refused
curl: (7) Failed to connect to 127.0.0.1 port 8888 after 0 ms: Connection refused
curl: (7) Failed to connect to 127.0.0.1 port 8888 after 0 ms: Connection refused
curl: (7) Failed to connect to 127.0.0.1 port 8888 after 0 ms: Connection refused
curl: (7) Failed to connect to 127.0.0.1 port 8888 after 0 ms: Connection refused
curl: (7) Failed to connect to 127.0.0.1 port 8888 after 0 ms: Connection refused
curl: (7) Failed to connect to 127.0.0.1 port 8888 after 0 ms: Connection refused
curl: (7) Failed to connect to 127.0.0.1 port 8888 after 0 ms: Connection refused
curl: (7) Failed to connect to 127.0.0.1 port 8888 after 0 ms: Connection refused
❌ Health check failed after 30 attempts
=== Recent PM2 Logs ===
[TAILING] Tailing last 80 lines for [html-go] process (change the value with --lines option)
/***/.pm2/logs/html-go-error.log last 80 lines:
0|html-go  |     at Module._compile (node:internal/modules/cjs/loader:1364:14)
0|html-go  |     at Module._extensions..js (node:internal/modules/cjs/loader:1422:10)
0|html-go  |     at Module.load (node:internal/modules/cjs/loader:1203:32)
0|html-go  |     at Module._load (node:internal/modules/cjs/loader:1019:12) {
0|html-go  |   errno: 11,
0|html-go  |   code: 'SQLITE_CORRUPT',
0|html-go  |   __augmented: true
0|html-go  | }
0|html-go  | 数据库初始化失败，应用无法启动: Error: SQLITE_CORRUPT: malformed database schema (164)
0|html-go  | --> in Database#run('\n' +
0|html-go  |   '        CREATE TABLE IF NOT EXISTS pages (\n' +
0|html-go  |   '          id TEXT PRIMARY KEY,\n' +
0|html-go  |   '          html_content TEXT NOT NULL,\n' +
0|html-go  |   '          created_at INTEGER NOT NULL,\n' +
0|html-go  |   '          password TEXT,\n' +
0|html-go  |   '          is_protected INTEGER DEFAULT 0,\n' +
0|html-go  |   "          code_type TEXT DEFAULT 'html'\n" +
0|html-go  |   '        )\n' +
0|html-go  |   '      ', [Function (anonymous)])
0|html-go  |     at Database.<anonymous> (/***/html_deploy_aibanxue/models/db.js:22:10)
0|html-go  |     at /***/html_deploy_aibanxue/models/db.js:20:8
0|html-go  |     at new Promise (<anonymous>)
0|html-go  |     at initDatabase (/***/html_deploy_aibanxue/models/db.js:19:10)
0|html-go  |     at Object.<anonymous> (/***/html_deploy_aibanxue/app.js:1681:1)
0|html-go  |     at Module._compile (node:internal/modules/cjs/loader:1364:14)
0|html-go  |     at Module._extensions..js (node:internal/modules/cjs/loader:1422:10)
0|html-go  |     at Module.load (node:internal/modules/cjs/loader:1203:32)
0|html-go  |     at Module._load (node:internal/modules/cjs/loader:1019:12) {
0|html-go  |   errno: 11,
0|html-go  |   code: 'SQLITE_CORRUPT',
0|html-go  |   __augmented: true
0|html-go  | }
0|html-go  | 数据库初始化失败，应用无法启动: Error: SQLITE_CORRUPT: malformed database schema (164)
0|html-go  | --> in Database#run('\n' +
0|html-go  |   '        CREATE TABLE IF NOT EXISTS pages (\n' +
0|html-go  |   '          id TEXT PRIMARY KEY,\n' +
0|html-go  |   '          html_content TEXT NOT NULL,\n' +
0|html-go  |   '          created_at INTEGER NOT NULL,\n' +
0|html-go  |   '          password TEXT,\n' +
0|html-go  |   '          is_protected INTEGER DEFAULT 0,\n' +
0|html-go  |   "          code_type TEXT DEFAULT 'html'\n" +
0|html-go  |   '        )\n' +
0|html-go  |   '      ', [Function (anonymous)])
0|html-go  |     at Database.<anonymous> (/***/html_deploy_aibanxue/models/db.js:22:10)
0|html-go  |     at /***/html_deploy_aibanxue/models/db.js:20:8
0|html-go  |     at new Promise (<anonymous>)
0|html-go  |     at initDatabase (/***/html_deploy_aibanxue/models/db.js:19:10)
0|html-go  |     at Object.<anonymous> (/***/html_deploy_aibanxue/app.js:1681:1)
0|html-go  |     at Module._compile (node:internal/modules/cjs/loader:1364:14)
0|html-go  |     at Module._extensions..js (node:internal/modules/cjs/loader:1422:10)
0|html-go  |     at Module.load (node:internal/modules/cjs/loader:1203:32)
0|html-go  |     at Module._load (node:internal/modules/cjs/loader:1019:12) {
0|html-go  |   errno: 11,
0|html-go  |   code: 'SQLITE_CORRUPT',
0|html-go  |   __augmented: true
0|html-go  | }
0|html-go  | 数据库初始化失败，应用无法启动: Error: SQLITE_CORRUPT: malformed database schema (164)
0|html-go  | --> in Database#run('\n' +
0|html-go  |   '        CREATE TABLE IF NOT EXISTS pages (\n' +
0|html-go  |   '          id TEXT PRIMARY KEY,\n' +
0|html-go  |   '          html_content TEXT NOT NULL,\n' +
0|html-go  |   '          created_at INTEGER NOT NULL,\n' +
0|html-go  |   '          password TEXT,\n' +
0|html-go  |   '          is_protected INTEGER DEFAULT 0,\n' +
0|html-go  |   "          code_type TEXT DEFAULT 'html'\n" +
0|html-go  |   '        )\n' +
0|html-go  |   '      ', [Function (anonymous)])
0|html-go  |     at Database.<anonymous> (/***/html_deploy_aibanxue/models/db.js:22:10)
0|html-go  |     at /***/html_deploy_aibanxue/models/db.js:20:8
0|html-go  |     at new Promise (<anonymous>)
0|html-go  |     at initDatabase (/***/html_deploy_aibanxue/models/db.js:19:10)
0|html-go  |     at Object.<anonymous> (/***/html_deploy_aibanxue/app.js:1681:1)
0|html-go  |     at Module._compile (node:internal/modules/cjs/loader:1364:14)
0|html-go  |     at Module._extensions..js (node:internal/modules/cjs/loader:1422:10)
0|html-go  |     at Module.load (node:internal/modules/cjs/loader:1203:32)
0|html-go  |     at Module._load (node:internal/modules/cjs/loader:1019:12) {
0|html-go  |   errno: 11,
0|html-go  |   code: 'SQLITE_CORRUPT',
0|html-go  |   __augmented: true
0|html-go  | }
/***/.pm2/logs/html-go-out.log last 80 lines:
0|html-go  | }
0|html-go  | ✅ 缓存管理器已启动
0|html-go  | 会话目录: /***/html_deploy_aibanxue/sessions
0|html-go  | 会话目录权限正确
0|html-go  | ✅ 性能监控中间件已启用
0|html-go  | ✅ 监控中间件已启用
0|html-go  | 🛑 缓存管理器已停止
0|html-go  | 应用启动...
0|html-go  | 当前工作目录: /***/html_deploy_aibanxue
0|html-go  | 环境变量: {
0|html-go  |   NODE_ENV: 'production',
0|html-go  |   AUTH_ENABLED: 'true',
0|html-go  |   AUTH_PASSWORD: '***'
0|html-go  | }
0|html-go  | ✅ 缓存管理器已启动
0|html-go  | 会话目录: /***/html_deploy_aibanxue/sessions
0|html-go  | 会话目录权限正确
0|html-go  | ✅ 性能监控中间件已启用
0|html-go  | ✅ 监控中间件已启用
0|html-go  | 🛑 缓存管理器已停止
0|html-go  | 应用启动...
0|html-go  | 当前工作目录: /***/html_deploy_aibanxue
0|html-go  | 环境变量: {
0|html-go  |   NODE_ENV: 'production',
0|html-go  |   AUTH_ENABLED: 'true',
0|html-go  |   AUTH_PASSWORD: '***'
0|html-go  | }
0|html-go  | ✅ 缓存管理器已启动
0|html-go  | 会话目录: /***/html_deploy_aibanxue/sessions
0|html-go  | 会话目录权限正确
0|html-go  | ✅ 性能监控中间件已启用
0|html-go  | ✅ 监控中间件已启用
0|html-go  | 🛑 缓存管理器已停止
0|html-go  | 应用启动...
0|html-go  | 当前工作目录: /***/html_deploy_aibanxue
0|html-go  | 环境变量: {
0|html-go  |   NODE_ENV: 'production',
0|html-go  |   AUTH_ENABLED: 'true',
0|html-go  |   AUTH_PASSWORD: '***'
0|html-go  | }
0|html-go  | ✅ 缓存管理器已启动
0|html-go  | 会话目录: /***/html_deploy_aibanxue/sessions
0|html-go  | 会话目录权限正确
0|html-go  | ✅ 性能监控中间件已启用
0|html-go  | ✅ 监控中间件已启用
0|html-go  | 数据库初始化失败，应用无法启动: Error: SQLITE_CORRUPT: malformed database schema (164)
0|html-go  | --> in Database#run('\n' +
0|html-go  |   '        CREATE TABLE IF NOT EXISTS pages (\n' +
0|html-go  |   '          id TEXT PRIMARY KEY,\n' +
0|html-go  |   '          html_content TEXT NOT NULL,\n' +
0|html-go  |   '          created_at INTEGER NOT NULL,\n' +
0|html-go  |   '          password TEXT,\n' +
0|html-go  |   '          is_protected INTEGER DEFAULT 0,\n' +
0|html-go  |   "          code_type TEXT DEFAULT 'html'\n" +
0|html-go  |   '        )\n' +
0|html-go  |   '      ', [Function (anonymous)])
0|html-go  |     at Database.<anonymous> (/***/html_deploy_aibanxue/models/db.js:22:10)
0|html-go  |     at /***/html_deploy_aibanxue/models/db.js:20:8
0|html-go  |     at new Promise (<anonymous>)
0|html-go  |     at initDatabase (/***/html_deploy_aibanxue/models/db.js:19:10)
0|html-go  |     at Object.<anonymous> (/***/html_deploy_aibanxue/app.js:1681:1)
0|html-go  |     at Module._compile (node:internal/modules/cjs/loader:1364:14)
0|html-go  |     at Module._extensions..js (node:internal/modules/cjs/loader:1422:10)
0|html-go  |     at Module.load (node:internal/modules/cjs/loader:1203:32)
0|html-go  |     at Module._load (node:internal/modules/cjs/loader:1019:12) {
0|html-go  |   errno: 11,
0|html-go  |   code: 'SQLITE_CORRUPT',
0|html-go  |   __augmented: true
0|html-go  | }