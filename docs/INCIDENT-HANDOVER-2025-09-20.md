# HTML-GO 生产问题与改造交接文档（2025-09-20）

## 背景
- 目标：稳定可用的内容分享服务，提供安全登录、可观测性与稳定的页面链接生成。
- 环境：火山引擎云服务器，Nginx 反代 + Node.js（PM2 管理），SQLite 本地持久化。
- 仓库：`zjp1997720/html_deploy_aibanxue`

## 事件时间线（概要）
- 登录问题：浏览器强制 HTTPS + CSP `form-action 'self'` 导致表单被拦截。通过 Certbot 开通 HTTPS（80→443 跳转）后恢复；样式加载问题同步解决。
- 数据库错误：`no such table: performance_logs`、`pages has no column named name`。对生产库执行：
  - 添加 `pages.name` 列
  - 创建 `performance_logs` 表及索引
  - 错误消失，`/api/pages/create` 成功，页面可达。
- 增强与文档：
  - 新增 CI 冒烟工作流 `.github/workflows/smoke.yml`；
  - 运维手册 `docs/OPERATIONS-RUNBOOK.md`；
  - Nginx 安全片段 `docs/nginx-security-snippets.conf`。
- 配置与迁移：
  - `models/db.js` 支持 `DB_PATH`，启动自动迁移 `pages.name` 与 `performance_logs`，并保留备份。
- 链接 ID 策略需求：
  - 在 `models/pages.js` 增加“可切换 10 位 base62 + 唯一约束冲突自动重试（默认 5 次）”；
  - 新增变量：`PAGE_ID_STRATEGY=md5|base62`、`PAGE_ID_MAX_RETRIES`；
  - CI 部署阶段强制写入策略并 `pm2 reload --update-env`。
- 现象：线上仍生成 7 位 ID；排查发现：服务器端可能未载入新代码/新环境。
- 受限：服务器 `git clone` 连接 GitHub TLS 失败（`GnuTLS recv error (-110)`），转而采用“服务器内联补丁”方案；
  - 一次内联追加产生 `Identifier 'nodeCrypto' has already been declared`（重复声明），导致 PM2 502（Node 进程崩溃）。

## 当前状态（最后一次观测）
- 终端冒烟：`/api/pages/create` 返回 7 位 ID（示例：`/view/67bfd3a`）。
- 发生 502：在追加实现后 PM2 报错 `nodeCrypto` 重复声明；需以“覆盖式重写 models/pages.js”为准。

## 待办与操作方案（复制即用）

### A. 快速恢复（若 502 在线）
```
cd /root/html_deploy_aibanxue
# 如有备份则恢复
ls -1 models/pages.js.bak-* 2>/dev/null | tail -n 1 | xargs -r -I{} cp {} models/pages.js
# 保守策略，先回到 md5
sed -i -E '/^PAGE_ID_STRATEGY=/d' .env; echo 'PAGE_ID_STRATEGY=md5' >> .env
sed -i -E '/^PAGE_ID_MAX_RETRIES=/d' .env
pm2 restart html-go --update-env
pm2 status html-go
pm2 logs html-go --lines 80
```

### B. 正确落地 base62（覆盖写入 + 热重载）
1) 覆盖写入 `models/pages.js`（整段 here‑doc，确保 `EOF` 独占一行）：
```
cd /root/html_deploy_aibanxue
cp -a models/pages.js models/pages.js.bak-$(date +%F-%H%M%S)
cat <<'EOF' > models/pages.js
const { run, get, query } = require('./db');
const CryptoJS = require('crypto-js');
const nodeCrypto = require('crypto');

const ID_STRATEGY = (process.env.PAGE_ID_STRATEGY || 'md5').toLowerCase();
const MAX_ID_ATTEMPTS = Math.max(parseInt(process.env.PAGE_ID_MAX_RETRIES || '5', 10), 1);
const BASE62_ALPHABET = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz';

function encodeBase62(bytes) {
  let value = BigInt(`0x${bytes.toString('hex')}`);
  if (value === 0n) return BASE62_ALPHABET[0];
  let result = '';
  while (value > 0n) {
    const remainder = Number(value % 62n);
    result = BASE62_ALPHABET[remainder] + result;
    value = value / 62n;
  }
  return result;
}

function generatePageId(htmlContent) {
  if (ID_STRATEGY === 'base62') {
    const raw = encodeBase62(nodeCrypto.randomBytes(8)); // ≈11 chars
    const padded = raw.padStart(10, BASE62_ALPHABET[0]);
    return padded.slice(-10); // 固定 10 位
  }
  const salt = nodeCrypto.randomBytes(6).toString('hex');
  const hash = CryptoJS.MD5(`${htmlContent}|${Date.now()}|${salt}`).toString();
  return hash.substring(0, 7); // 默认 7 位
}

function generateRandomPassword() {
  const chars = '0123456789';
  let password = '';
  for (let i = 0; i < 5; i += 1) {
    const randomIndex = Math.floor(Math.random() * chars.length);
    password += chars[randomIndex];
  }
  return password;
}

async function createPage(htmlContent, isProtected = false, codeType = 'html', name = null) {
  const password = generateRandomPassword();
  let lastError = null;
  for (let attempt = 1; attempt <= MAX_ID_ATTEMPTS; attempt += 1) {
    const urlId = generatePageId(htmlContent);
    try {
      await run(
        'INSERT INTO pages (id, html_content, created_at, password, is_protected, code_type, name) VALUES (?, ?, ?, ?, ?, ?, ?)',
        [urlId, htmlContent, Date.now(), password, isProtected ? 1 : 0, codeType, name]
      );
      return { urlId, password };
    } catch (error) {
      lastError = error;
      const message = typeof error?.message === 'string' ? error.message : '';
      const isConstraint = error?.code === 'SQLITE_CONSTRAINT' || message.includes('UNIQUE constraint failed');
      if (!isConstraint) throw error;           // 非唯一约束错误，直接抛出
      if (attempt === MAX_ID_ATTEMPTS) throw error; // 重试已达上限
      console.warn(`检测到页面 ID 冲突，重试 ${attempt}/${MAX_ID_ATTEMPTS}`);
    }
  }
  throw lastError || new Error('生成唯一页面 ID 失败');
}

async function getPageById(id) { return get('SELECT * FROM pages WHERE id = ?', [id]); }
async function getRecentPages(limit = 10) { return query('SELECT id, created_at FROM pages ORDER BY created_at DESC LIMIT ?', [limit]); }
async function getAllPages() { return query('SELECT id, html_content, created_at, password, is_protected, code_type, name FROM pages ORDER BY created_at DESC'); }

async function getPagesList(options = {}) {
  const { page = 1, limit = 20, search = '', codeType = '', isProtected = null, sortBy = 'created_at', sortOrder = 'DESC' } = options;
  const whereConditions = []; const queryParams = [];
  if (search) { whereConditions.push('(name LIKE ? OR html_content LIKE ?)'); queryParams.push(`%${search}%`, `%${search}%`); }
  if (codeType) { whereConditions.push('code_type = ?'); queryParams.push(codeType); }
  if (typeof isProtected === 'boolean') { whereConditions.push('is_protected = ?'); queryParams.push(isProtected ? 1 : 0); }
  const whereClause = whereConditions.length ? `WHERE ${whereConditions.join(' AND ')}` : '';
  const validSortFields = ['created_at', 'name', 'code_type', 'is_protected'];
  const safeSortBy = validSortFields.includes(sortBy) ? sortBy : 'created_at';
  const safeSortOrder = sortOrder.toUpperCase() === 'ASC' ? 'ASC' : 'DESC';
  const offset = (page - 1) * limit;
  const countQuery = `SELECT COUNT(*) as total FROM pages ${whereClause}`; const countResult = await get(countQuery, queryParams);
  const dataQuery = `SELECT id, name, created_at, is_protected, code_type FROM pages ${whereClause} ORDER BY ${safeSortBy} ${safeSortOrder} LIMIT ? OFFSET ?`;
  const dataParams = [...queryParams, limit, offset];
  const pages = await query(dataQuery, dataParams);
  return { pages, pagination: { total: countResult?.total || 0, page, limit } };
}

async function getPagesStats() {
  const totalResult = await get('SELECT COUNT(*) as total FROM pages');
  const protectedResult = await get('SELECT COUNT(*) as protected FROM pages WHERE is_protected = 1');
  const publicCount = totalResult.total - protectedResult.protected;
  const todayThreshold = Date.now() - (24 * 60 * 60 * 1000);
  const weekThreshold = Date.now() - (7 * 24 * 60 * 60 * 1000);
  const todayCount = await get('SELECT COUNT(*) as today FROM pages WHERE created_at >= ?', [todayThreshold]);
  const weekCount = await get('SELECT COUNT(*) as week FROM pages WHERE created_at >= ?', [weekThreshold]);
  const typeStats = await query('SELECT code_type, COUNT(*) as count FROM pages GROUP BY code_type');
  return { total: totalResult.total, protected: protectedResult.protected, public: publicCount, today: todayCount.today, thisWeek: weekCount.week, typeStats };
}

async function batchDeletePages(pageIds) { if (!Array.isArray(pageIds) || pageIds.length === 0) throw new Error('页面 ID 列表不能为空'); const placeholders = pageIds.map(() => '?').join(','); const result = await run(`DELETE FROM pages WHERE id IN (${placeholders})`, pageIds); return result.changes || 0; }
async function batchUpdateProtection(pageIds, isProtected) { if (!Array.isArray(pageIds) || pageIds.length === 0) throw new Error('页面 ID 列表不能为空'); const placeholders = pageIds.map(() => '?').join(','); const params = [isProtected ? 1 : 0, ...pageIds]; const result = await run(`UPDATE pages SET is_protected = ? WHERE id IN (${placeholders})`, params); return result.changes || 0; }
async function updatePage(pageId, updates) { const allowed = ['name', 'html_content', 'is_protected', 'password', 'code_type']; const set = []; const params = []; for (const [k, v] of Object.entries(updates)) { if (allowed.includes(k)) { set.push(`${k} = ?`); params.push(v); } } if (!set长度) throw new Error('缺少有效的更新字段'); params.push(pageId); const result = await run(`UPDATE pages SET ${set.join(', ')} WHERE id = ?`, params); return result.changes > 0; }
async function deletePage(pageId) { const result = await run('DELETE FROM pages WHERE id = ?', [pageId]); return result.changes > 0; }

module.exports = { createPage, getPageById, getRecentPages, getAllPages, getPagesList, getPagesStats, batchDeletePages, batchUpdateProtection, updatePage, deletePage };
EOF
```

2) 设置策略并热重载：
```
sed -i -E '/^PAGE_ID_STRATEGY=/d' .env; echo 'PAGE_ID_STRATEGY=base62' >> .env
sed -i -E '/^PAGE_ID_MAX_RETRIES=/d' .env; echo 'PAGE_ID_MAX_RETRIES=7' >> .env
pm2 reload html-go --update-env
pm2 status html-go
pm2 logs html-go --lines 60
```

3) 冒烟验证：
```
curl -i -c c.txt -d "password=生产密码" https://htmlshare.aibanxue.top/login
resp=$(curl -s -b c.txt -H 'Content-Type: application/json' -d '{"htmlContent":"<p>base62 check</p>","isProtected":false,"codeType":"html"}' https://htmlshare.aibanxue.top/api/pages/create)
echo "$resp" | jq -r '.url'
echo "$resp" | jq -r '.url' | awk -F/ '{print length($NF), $0}'
```

## 回滚方案
```
cd /root/html_deploy_aibanxue
ls -1 models/pages.js.bak-* | tail -n 1 | xargs -r -I{} cp {} models/pages.js
sed -i -E '/^PAGE_ID_STRATEGY=/d' .env; echo 'PAGE_ID_STRATEGY=md5' >> .env
sed -i -E '/^PAGE_ID_MAX_RETRIES=/d' .env
pm2 restart html-go --update-env
```

## CI/CD 说明
- 部署工作流：`.github/workflows/main.yml`
  - 将构建产物传到服务器 `/tmp/`，解压到 `/root/html_deploy_aibanxue`；
  - 保留 `.env/db/sessions/node_modules`；
  - 写入 `PAGE_ID_STRATEGY`/`PAGE_ID_MAX_RETRIES` 并 `pm2 reload --update-env`；
- 冒烟工作流：`.github/workflows/smoke.yml` 与 `scripts/smoke-e2e.sh`。
  - 需要仓库 `Secrets.AUTH_PASSWORD`。

## 风险与注意
- 直接编辑生产文件务必先备份；粘贴 here‑doc 时确保 `EOF` 不带空格并独占一行，避免截断。
- `pm2 reload` 一定要带 `--update-env` 才会读取新 `.env`。
- 老链接不受任何影响；新策略只影响新页面。

---
本文档用于问题交接与自助修复，包含恢复、改造、验证、回滚的完整链路。

