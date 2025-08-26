root@iv-ye2t6iq0owqc6ilhgyfh:~/html_deploy_aibanxue# pm2 logs html-go --err --lines 200
[TAILING] Tailing last 200 lines for [html-go] process (change the value with --lines option)
/root/.pm2/logs/html-go-error.log last 200 lines:
0|html-go  |     at Module._compile (node:internal/modules/cjs/loader:1364:14)
0|html-go  |     at Module._extensions..js (node:internal/modules/cjs/loader:1422:10)
0|html-go  |     at Module.load (node:internal/modules/cjs/loader:1203:32)
0|html-go  |     at Module._load (node:internal/modules/cjs/loader:1019:12) {
0|html-go  |   errno: 11,
0|html-go  |   code: 'SQLITE_CORRUPT',
0|html-go  |   __augmented: true
0|html-go  | }
0|html-go  | 数据库初始化失败，应用无法启动: Error: SQLITE_CORRUPT: database disk image is malformed
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
0|html-go  |     at Database.<anonymous> (/root/html_deploy_aibanxue/models/db.js:22:10)
0|html-go  |     at /root/html_deploy_aibanxue/models/db.js:20:8
0|html-go  |     at new Promise (<anonymous>)
0|html-go  |     at initDatabase (/root/html_deploy_aibanxue/models/db.js:19:10)
0|html-go  |     at Object.<anonymous> (/root/html_deploy_aibanxue/app.js:1524:1)
0|html-go  |     at Module._compile (node:internal/modules/cjs/loader:1364:14)
0|html-go  |     at Module._extensions..js (node:internal/modules/cjs/loader:1422:10)
0|html-go  |     at Module.load (node:internal/modules/cjs/loader:1203:32)
0|html-go  |     at Module._load (node:internal/modules/cjs/loader:1019:12) {
0|html-go  |   errno: 11,
0|html-go  |   code: 'SQLITE_CORRUPT',
0|html-go  |   __augmented: true
0|html-go  | }
0|html-go  | 数据库初始化失败，应用无法启动: Error: SQLITE_CORRUPT: database disk image is malformed
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
0|html-go  |     at Database.<anonymous> (/root/html_deploy_aibanxue/models/db.js:22:10)
0|html-go  |     at /root/html_deploy_aibanxue/models/db.js:20:8
0|html-go  |     at new Promise (<anonymous>)
0|html-go  |     at initDatabase (/root/html_deploy_aibanxue/models/db.js:19:10)
0|html-go  |     at Object.<anonymous> (/root/html_deploy_aibanxue/app.js:1524:1)
0|html-go  |     at Module._compile (node:internal/modules/cjs/loader:1364:14)
0|html-go  |     at Module._extensions..js (node:internal/modules/cjs/loader:1422:10)
0|html-go  |     at Module.load (node:internal/modules/cjs/loader:1203:32)
0|html-go  |     at Module._load (node:internal/modules/cjs/loader:1019:12) {
0|html-go  |   errno: 11,
0|html-go  |   code: 'SQLITE_CORRUPT',
0|html-go  |   __augmented: true
0|html-go  | }
0|html-go  | 数据库初始化失败，应用无法启动: Error: SQLITE_CORRUPT: database disk image is malformed
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
0|html-go  |     at Database.<anonymous> (/root/html_deploy_aibanxue/models/db.js:22:10)
0|html-go  |     at /root/html_deploy_aibanxue/models/db.js:20:8
0|html-go  |     at new Promise (<anonymous>)
0|html-go  |     at initDatabase (/root/html_deploy_aibanxue/models/db.js:19:10)
0|html-go  |     at Object.<anonymous> (/root/html_deploy_aibanxue/app.js:1524:1)
0|html-go  |     at Module._compile (node:internal/modules/cjs/loader:1364:14)
0|html-go  |     at Module._extensions..js (node:internal/modules/cjs/loader:1422:10)
0|html-go  |     at Module.load (node:internal/modules/cjs/loader:1203:32)
0|html-go  |     at Module._load (node:internal/modules/cjs/loader:1019:12) {
0|html-go  |   errno: 11,
0|html-go  |   code: 'SQLITE_CORRUPT',
0|html-go  |   __augmented: true
0|html-go  | }
0|html-go  | 数据库初始化失败，应用无法启动: Error: SQLITE_CORRUPT: database disk image is malformed
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
0|html-go  |     at Database.<anonymous> (/root/html_deploy_aibanxue/models/db.js:22:10)
0|html-go  |     at /root/html_deploy_aibanxue/models/db.js:20:8
0|html-go  |     at new Promise (<anonymous>)
0|html-go  |     at initDatabase (/root/html_deploy_aibanxue/models/db.js:19:10)
0|html-go  |     at Object.<anonymous> (/root/html_deploy_aibanxue/app.js:1524:1)
0|html-go  |     at Module._compile (node:internal/modules/cjs/loader:1364:14)
0|html-go  |     at Module._extensions..js (node:internal/modules/cjs/loader:1422:10)
0|html-go  |     at Module.load (node:internal/modules/cjs/loader:1203:32)
0|html-go  |     at Module._load (node:internal/modules/cjs/loader:1019:12) {
0|html-go  |   errno: 11,
0|html-go  |   code: 'SQLITE_CORRUPT',
0|html-go  |   __augmented: true
0|html-go  | }
0|html-go  | 数据库初始化失败，应用无法启动: Error: SQLITE_CORRUPT: database disk image is malformed
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
0|html-go  |     at Database.<anonymous> (/root/html_deploy_aibanxue/models/db.js:22:10)
0|html-go  |     at /root/html_deploy_aibanxue/models/db.js:20:8
0|html-go  |     at new Promise (<anonymous>)
0|html-go  |     at initDatabase (/root/html_deploy_aibanxue/models/db.js:19:10)
0|html-go  |     at Object.<anonymous> (/root/html_deploy_aibanxue/app.js:1524:1)
0|html-go  |     at Module._compile (node:internal/modules/cjs/loader:1364:14)
0|html-go  |     at Module._extensions..js (node:internal/modules/cjs/loader:1422:10)
0|html-go  |     at Module.load (node:internal/modules/cjs/loader:1203:32)
0|html-go  |     at Module._load (node:internal/modules/cjs/loader:1019:12) {
0|html-go  |   errno: 11,
0|html-go  |   code: 'SQLITE_CORRUPT',
0|html-go  |   __augmented: true
0|html-go  | }
0|html-go  | 数据库初始化失败，应用无法启动: Error: SQLITE_CORRUPT: database disk image is malformed
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
0|html-go  |     at Database.<anonymous> (/root/html_deploy_aibanxue/models/db.js:22:10)
0|html-go  |     at /root/html_deploy_aibanxue/models/db.js:20:8
0|html-go  |     at new Promise (<anonymous>)
0|html-go  |     at initDatabase (/root/html_deploy_aibanxue/models/db.js:19:10)
0|html-go  |     at Object.<anonymous> (/root/html_deploy_aibanxue/app.js:1524:1)
0|html-go  |     at Module._compile (node:internal/modules/cjs/loader:1364:14)
0|html-go  |     at Module._extensions..js (node:internal/modules/cjs/loader:1422:10)
0|html-go  |     at Module.load (node:internal/modules/cjs/loader:1203:32)
0|html-go  |     at Module._load (node:internal/modules/cjs/loader:1019:12) {
0|html-go  |   errno: 11,
0|html-go  |   code: 'SQLITE_CORRUPT',
0|html-go  |   __augmented: true
0|html-go  | }
0|html-go  | 数据库初始化失败，应用无法启动: Error: SQLITE_CORRUPT: database disk image is malformed
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
0|html-go  |     at Database.<anonymous> (/root/html_deploy_aibanxue/models/db.js:22:10)
0|html-go  |     at /root/html_deploy_aibanxue/models/db.js:20:8
0|html-go  |     at new Promise (<anonymous>)
0|html-go  |     at initDatabase (/root/html_deploy_aibanxue/models/db.js:19:10)
0|html-go  |     at Object.<anonymous> (/root/html_deploy_aibanxue/app.js:1524:1)
0|html-go  |     at Module._compile (node:internal/modules/cjs/loader:1364:14)
0|html-go  |     at Module._extensions..js (node:internal/modules/cjs/loader:1422:10)
0|html-go  |     at Module.load (node:internal/modules/cjs/loader:1203:32)
0|html-go  |     at Module._load (node:internal/modules/cjs/loader:1019:12) {
0|html-go  |   errno: 11,
0|html-go  |   code: 'SQLITE_CORRUPT',
0|html-go  |   __augmented: true
0|html-go  | }
0|html-go  | 数据库初始化失败，应用无法启动: Error: SQLITE_CORRUPT: database disk image is malformed
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
0|html-go  |     at Database.<anonymous> (/root/html_deploy_aibanxue/models/db.js:22:10)
0|html-go  |     at /root/html_deploy_aibanxue/models/db.js:20:8
0|html-go  |     at new Promise (<anonymous>)
0|html-go  |     at initDatabase (/root/html_deploy_aibanxue/models/db.js:19:10)
0|html-go  |     at Object.<anonymous> (/root/html_deploy_aibanxue/app.js:1524:1)
0|html-go  |     at Module._compile (node:internal/modules/cjs/loader:1364:14)
0|html-go  |     at Module._extensions..js (node:internal/modules/cjs/loader:1422:10)
0|html-go  |     at Module.load (node:internal/modules/cjs/loader:1203:32)
0|html-go  |     at Module._load (node:internal/modules/cjs/loader:1019:12) {
0|html-go  |   errno: 11,
0|html-go  |   code: 'SQLITE_CORRUPT',
0|html-go  |   __augmented: true
0|html-go  | }

0|html-go  | 数据库初始化失败，应用无法启动: Error: SQLITE_CORRUPT: database disk image is malformed
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
0|html-go  |     at Database.<anonymous> (/root/html_deploy_aibanxue/models/db.js:22:10)
0|html-go  |     at /root/html_deploy_aibanxue/models/db.js:20:8
0|html-go  |     at new Promise (<anonymous>)
0|html-go  |     at initDatabase (/root/html_deploy_aibanxue/models/db.js:19:10)
0|html-go  |     at Object.<anonymous> (/root/html_deploy_aibanxue/app.js:1524:1)
0|html-go  |     at Module._compile (node:internal/modules/cjs/loader:1364:14)
0|html-go  |     at Module._extensions..js (node:internal/modules/cjs/loader:1422:10)
0|html-go  |     at Module.load (node:internal/modules/cjs/loader:1203:32)
0|html-go  |     at Module._load (node:internal/modules/cjs/loader:1019:12) {
0|html-go  |   errno: 11,
0|html-go  |   code: 'SQLITE_CORRUPT',
0|html-go  |   __augmented: true
0|html-go  | }
0|html-go  | 数据库初始化失败，应用无法启动: Error: SQLITE_CORRUPT: database disk image is malformed
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
0|html-go  |     at Database.<anonymous> (/root/html_deploy_aibanxue/models/db.js:22:10)
0|html-go  |     at /root/html_deploy_aibanxue/models/db.js:20:8
0|html-go  |     at new Promise (<anonymous>)
0|html-go  |     at initDatabase (/root/html_deploy_aibanxue/models/db.js:19:10)
0|html-go  |     at Object.<anonymous> (/root/html_deploy_aibanxue/app.js:1524:1)
0|html-go  |     at Module._compile (node:internal/modules/cjs/loader:1364:14)
0|html-go  |     at Module._extensions..js (node:internal/modules/cjs/loader:1422:10)
0|html-go  |     at Module.load (node:internal/modules/cjs/loader:1203:32)
0|html-go  |     at Module._load (node:internal/modules/cjs/loader:1019:12) {
0|html-go  |   errno: 11,
0|html-go  |   code: 'SQLITE_CORRUPT',
0|html-go  |   __augmented: true
0|html-go  | }
0|html-go  | 数据库初始化失败，应用无法启动: Error: SQLITE_CORRUPT: database disk image is malformed
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
0|html-go  |     at Database.<anonymous> (/root/html_deploy_aibanxue/models/db.js:22:10)
0|html-go  |     at /root/html_deploy_aibanxue/models/db.js:20:8
0|html-go  |     at new Promise (<anonymous>)
0|html-go  |     at initDatabase (/root/html_deploy_aibanxue/models/db.js:19:10)
0|html-go  |     at Object.<anonymous> (/root/html_deploy_aibanxue/app.js:1524:1)
0|html-go  |     at Module._compile (node:internal/modules/cjs/loader:1364:14)
0|html-go  |     at Module._extensions..js (node:internal/modules/cjs/loader:1422:10)
0|html-go  |     at Module.load (node:internal/modules/cjs/loader:1203:32)
0|html-go  |     at Module._load (node:internal/modules/cjs/loader:1019:12) {
0|html-go  |   errno: 11,
0|html-go  |   code: 'SQLITE_CORRUPT',
0|html-go  |   __augmented: true
0|html-go  | }
0|html-go  | 数据库初始化失败，应用无法启动: Error: SQLITE_CORRUPT: database disk image is malformed
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
0|html-go  |     at Database.<anonymous> (/root/html_deploy_aibanxue/models/db.js:22:10)
0|html-go  |     at /root/html_deploy_aibanxue/models/db.js:20:8
0|html-go  |     at new Promise (<anonymous>)
0|html-go  |     at initDatabase (/root/html_deploy_aibanxue/models/db.js:19:10)
0|html-go  |     at Object.<anonymous> (/root/html_deploy_aibanxue/app.js:1524:1)
0|html-go  |     at Module._compile (node:internal/modules/cjs/loader:1364:14)
0|html-go  |     at Module._extensions..js (node:internal/modules/cjs/loader:1422:10)
0|html-go  |     at Module.load (node:internal/modules/cjs/loader:1203:32)
0|html-go  |     at Module._load (node:internal/modules/cjs/loader:1019:12) {
0|html-go  |   errno: 11,
0|html-go  |   code: 'SQLITE_CORRUPT',
0|html-go  |   __augmented: true
0|html-go  | }
0|html-go  | 数据库初始化失败，应用无法启动: Error: SQLITE_CORRUPT: database disk image is malformed
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
0|html-go  |     at Database.<anonymous> (/root/html_deploy_aibanxue/models/db.js:22:10)
0|html-go  |     at /root/html_deploy_aibanxue/models/db.js:20:8
0|html-go  |     at new Promise (<anonymous>)
0|html-go  |     at initDatabase (/root/html_deploy_aibanxue/models/db.js:19:10)
0|html-go  |     at Object.<anonymous> (/root/html_deploy_aibanxue/app.js:1524:1)
0|html-go  |     at Module._compile (node:internal/modules/cjs/loader:1364:14)
0|html-go  |     at Module._extensions..js (node:internal/modules/cjs/loader:1422:10)
0|html-go  |     at Module.load (node:internal/modules/cjs/loader:1203:32)
0|html-go  |     at Module._load (node:internal/modules/cjs/loader:1019:12) {
0|html-go  |   errno: 11,
0|html-go  |   code: 'SQLITE_CORRUPT',
0|html-go  |   __augmented: true
0|html-go  | }
0|html-go  | 数据库初始化失败，应用无法启动: Error: SQLITE_CORRUPT: database disk image is malformed
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
0|html-go  |     at Database.<anonymous> (/root/html_deploy_aibanxue/models/db.js:22:10)
0|html-go  |     at /root/html_deploy_aibanxue/models/db.js:20:8
0|html-go  |     at new Promise (<anonymous>)
0|html-go  |     at initDatabase (/root/html_deploy_aibanxue/models/db.js:19:10)
0|html-go  |     at Object.<anonymous> (/root/html_deploy_aibanxue/app.js:1524:1)
0|html-go  |     at Module._compile (node:internal/modules/cjs/loader:1364:14)
0|html-go  |     at Module._extensions..js (node:internal/modules/cjs/loader:1422:10)
0|html-go  |     at Module.load (node:internal/modules/cjs/loader:1203:32)
0|html-go  |     at Module._load (node:internal/modules/cjs/loader:1019:12) {
0|html-go  |   errno: 11,
0|html-go  |   code: 'SQLITE_CORRUPT',
0|html-go  |   __augmented: true
0|html-go  | }
0|html-go  | 数据库初始化失败，应用无法启动: Error: SQLITE_CORRUPT: database disk image is malformed
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
0|html-go  |     at Database.<anonymous> (/root/html_deploy_aibanxue/models/db.js:22:10)
0|html-go  |     at /root/html_deploy_aibanxue/models/db.js:20:8
0|html-go  |     at new Promise (<anonymous>)
0|html-go  |     at initDatabase (/root/html_deploy_aibanxue/models/db.js:19:10)
0|html-go  |     at Object.<anonymous> (/root/html_deploy_aibanxue/app.js:1524:1)
0|html-go  |     at Module._compile (node:internal/modules/cjs/loader:1364:14)
0|html-go  |     at Module._extensions..js (node:internal/modules/cjs/loader:1422:10)
0|html-go  |     at Module.load (node:internal/modules/cjs/loader:1203:32)
0|html-go  |     at Module._load (node:internal/modules/cjs/loader:1019:12) {
0|html-go  |   errno: 11,
0|html-go  |   code: 'SQLITE_CORRUPT',
0|html-go  |   __augmented: true
0|html-go  | }
^C
root@iv-ye2t6iq0owqc6ilhgyfh:~/html_deploy_aibanxue# node -v && npm -v && pm2 -v
v18.20.8
10.8.2
6.0.8
root@iv-ye2t6iq0owqc6ilhgyfh:~/html_deploy_aibanxue#  ss -ltnp | grep -E ':8888|node'（或 sudo lsof -iTCP -sTCP:LISTEN -P | grep 8888）
grep: P: invalid context length argument
root@iv-ye2t6iq0owqc6ilhgyfh:~/html_deploy_aibanxue# ls -ld /root/html_deploy_aibanxue /root/html_deploy_aibanxue/db /root/html_deploy_aibanxue/sessions       
drwxr-xr-x 23 root root 4096 Aug 26 10:34 /root/html_deploy_aibanxue
drwxrwxr-x  2 root root 4096 Aug 26 10:33 /root/html_deploy_aibanxue/db
drwxr-xr-x  2 root root 4096 Aug 26 10:26 /root/html_deploy_aibanxue/sessions
root@iv-ye2t6iq0owqc6ilhgyfh:~/html_deploy_aibanxue# cd /root/html_deploy_aibanxue && npm ls sqlite3 || echo 'npm ls failed'
html-go-express@1.0.0 /root/html_deploy_aibanxue
└── sqlite3@5.1.7

root@iv-ye2t6iq0owqc6ilhgyfh:~/html_deploy_aibanxue# 