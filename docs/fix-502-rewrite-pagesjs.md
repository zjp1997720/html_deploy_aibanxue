# 一键修复 502：覆盖式重写 models/pages.js（含函数级注释）

> 用途：当 PM2 日志报错 “Identifier 'nodeCrypto' has already been declared” 导致 Node 进程崩溃时，直接以“覆盖式重写”替换被拼接污染的 `models/pages.js`，先恢复服务（默认 md5 策略），再按需切到 base62。

## 操作说明

- 将下方整段 shell 代码一次性复制到生产服务器执行（Ubuntu/bash 环境）。
- 保证 `EOF` 独占一行且无尾随空格；脚本会自动备份旧文件并热重载 PM2。
- 末尾包含本地冒烟用例与可选的 base62 切换步骤。

```bash
#!/usr/bin/env bash
set -euo pipefail

echo "[1/6] 切换到项目目录..."
cd /root/html_deploy_aibanxue

echo "[2/6] 备份现有 models/pages.js ..."
ts=$(date +%F-%H%M%S)
cp -a models/pages.js models/pages.js.bak-$ts || true

echo "[3/6] 覆盖式重写 models/pages.js ..."
cat <<'EOF' > models/pages.js
'use strict';

const { run, get, query } = require('./db');
const CryptoJS = require('crypto-js');
const nodeCrypto = require('crypto');

const ID_STRATEGY = (process.env.PAGE_ID_STRATEGY || 'md5').toLowerCase();
const MAX_ID_ATTEMPTS = Math.max(parseInt(process.env.PAGE_ID_MAX_RETRIES || '5', 10), 1);
const BASE62_ALPHABET = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz';

/**
 * 函数: encodeBase62
 * 说明: 将随机字节编码为 base62 字符串
 * 参数:
 *   - bytes: Buffer 随机字节
 * 返回:
 *   - string: base62 编码字符串
 */
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

/**
 * 函数: generatePageId
 * 说明: 生成页面短链 ID；默认 md5 前缀 7 位，可切换为固定 10 位 base62
 * 参数:
 *   - htmlContent: string 页面内容（用于 md5 扰动）
 * 返回:
 *   - string: 页面 ID
 */
function generatePageId(htmlContent) {
  if (ID_STRATEGY === 'base62') {
    const raw = encodeBase62(nodeCrypto.randomBytes(8)); // ≈11 字符
    const padded = raw.padStart(10, BASE62_ALPHABET[0]);
    return padded.slice(-10); // 固定 10 位
  }
  const salt = nodeCrypto.randomBytes(6).toString('hex');
  const hash = CryptoJS.MD5(`${htmlContent}|${Date.now()}|${salt}`).toString();
  return hash.substring(0, 7); // 默认 7 位
}

/**
 * 函数: generateRandomPassword
 * 说明: 生成 5 位纯数字访问码
 * 返回:
 *   - string: 5 位数字字符串
 */
function generateRandomPassword() {
  const chars = '0123456789';
  let password = '';
  for (let i = 0; i < 5; i += 1) {
    const randomIndex = Math.floor(Math.random() * chars.length);
    password += chars[randomIndex];
  }
  return password;
}

/**
 * 函数: createPage
 * 说明: 创建页面记录，遇唯一约束冲突自动重试
 * 参数:
 *   - htmlContent: string 页面 HTML 内容
 *   - isProtected: boolean 是否需要访问码
 *   - codeType: string 内容类型（默认 'html'）
 *   - name: string|null 可选名称
 * 返回:
 *   - Promise<{ urlId: string, password: string }>
 */
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
      if (!isConstraint) throw error;               // 非唯一约束错误直接抛出
      if (attempt === MAX_ID_ATTEMPTS) throw lastError; // 达重试上限
    }
  }

  throw lastError || new Error('未知错误：创建页面失败');
}

/**
 * 函数: getPageById
 * 说明: 按 ID 获取单页
 * 参数:
 *   - pageId: string 页面 ID
 * 返回:
 *   - Promise<Object|null>
 */
async function getPageById(pageId) {
  return get('SELECT * FROM pages WHERE id = ?', [pageId]);
}

/**
 * 函数: getRecentPages
 * 说明: 获取最近页面（简要字段）
 * 参数:
 *   - limit: number 数量，默认 10
 * 返回:
 *   - Promise<Array<Object>>
 */
async function getRecentPages(limit = 10) {
  return query(
    'SELECT id, created_at, is_protected, code_type, name FROM pages ORDER BY created_at DESC LIMIT ?',
    [limit]
  );
}

/**
 * 函数: getAllPages
 * 说明: 获取所有页面（数据量大时谨慎使用）
 * 返回:
 *   - Promise<Array<Object>>
 */
async function getAllPages() {
  return query(
    'SELECT id, created_at, is_protected, code_type, name FROM pages ORDER BY created_at DESC',
    []
  );
}

/**
 * 函数: getPagesList
 * 说明: 管理用途的分页/筛选/排序列表
 * 参数:
 *   - options: { page?:number, limit?:number, keyword?:string, isProtected?:boolean, sortBy?:string, sortOrder?:'ASC'|'DESC' }
 * 返回:
 *   - Promise<{ pages:Array<Object>, pagination:{ total:number, page:number, limit:number } }>
 */
async function getPagesList(options = {}) {
  const page = Math.max(parseInt(options.page || '1', 10), 1);
  const limit = Math.max(parseInt(options.limit || '20', 10), 1);

  const validSortFields = ['created_at', 'id', 'name', 'code_type', 'is_protected'];
  const rawSortBy = (options.sortBy || 'created_at').toString();
  const sortBy = validSortFields.includes(rawSortBy) ? rawSortBy : 'created_at';
  const sortOrder = (options.sortOrder || 'DESC').toString().toUpperCase() === 'ASC' ? 'ASC' : 'DESC';

  const where = [];
  const params = [];

  if (options.keyword) {
    where.push('(id LIKE ? OR name LIKE ?)');
    params.push(`%${options.keyword}%`, `%${options.keyword}%`);
  }
  if (typeof options.isProtected === 'boolean') {
    where.push('is_protected = ?');
    params.push(options.isProtected ? 1 : 0);
  }

  const whereClause = where.length ? `WHERE ${where.join(' AND ')}` : '';
  const offset = (page - 1) * limit;

  const countRow = await get(`SELECT COUNT(*) AS total FROM pages ${whereClause}`, params);
  const data = await query(
    `SELECT id, name, created_at, is_protected, code_type
     FROM pages ${whereClause}
     ORDER BY ${sortBy} ${sortOrder}
     LIMIT ? OFFSET ?`,
    [...params, limit, offset]
  );

  return { pages: data, pagination: { total: countRow?.total || 0, page, limit } };
}

/**
 * 函数: getPagesStats
 * 说明: 汇总统计（总数/保护/公开/今日/本周/类型分布）
 * 返回:
 *   - Promise<{ total:number, protected:number, public:number, today:number, thisWeek:number, typeStats:Array }>
 */
async function getPagesStats() {
  const totalRow = await get('SELECT COUNT(*) AS total FROM pages');
  const protectedRow = await get('SELECT COUNT(*) AS protected FROM pages WHERE is_protected = 1');
  const publicCount = (totalRow?.total || 0) - (protectedRow?.protected || 0);

  const now = Date.now();
  const dayMs = 24 * 60 * 60 * 1000;
  const todayThreshold = now - dayMs;
  const weekThreshold = now - 7 * dayMs;

  const todayRow = await get('SELECT COUNT(*) AS today FROM pages WHERE created_at >= ?', [todayThreshold]);
  const weekRow = await get('SELECT COUNT(*) AS week FROM pages WHERE created_at >= ?', [weekThreshold]);
  const typeStats = await query('SELECT code_type, COUNT(*) AS count FROM pages GROUP BY code_type');

  return { total: totalRow?.total || 0, protected: protectedRow?.protected || 0, public: publicCount, today: todayRow?.today || 0, thisWeek: weekRow?.week || 0, typeStats };
}

/**
 * 函数: batchDeletePages
 * 说明: 批量删除页面
 * 参数:
 *   - pageIds: string[] 待删除 ID 列表
 * 返回:
 *   - Promise<number> 删除条数
 */
async function batchDeletePages(pageIds) {
  if (!Array.isArray(pageIds) || pageIds.length === 0) throw new Error('页面 ID 列表不能为空');
  const placeholders = pageIds.map(() => '?').join(',');
  const result = await run(`DELETE FROM pages WHERE id IN (${placeholders})`, pageIds);
  return result.changes || 0;
}

/**
 * 函数: batchUpdateProtection
 * 说明: 批量更新保护状态
 * 参数:
 *   - pageIds: string[] ID 列表
 *   - isProtected: boolean 目标保护状态
 * 返回:
 *   - Promise<number> 更新条数
 */
async function batchUpdateProtection(pageIds, isProtected) {
  if (!Array.isArray(pageIds) || pageIds.length === 0) throw new Error('页面 ID 列表不能为空');
  const placeholders = pageIds.map(() => '?').join(',');
  const params = [isProtected ? 1 : 0, ...pageIds];
  const result = await run(`UPDATE pages SET is_protected = ? WHERE id IN (${placeholders})`, params);
  return result.changes || 0;
}

/**
 * 函数: updatePage
 * 说明: 更新单个页面（白名单字段）
 * 参数:
 *   - pageId: string 页面 ID
 *   - updates: object 允许字段 ['name','html_content','is_protected','password','code_type']
 * 返回:
 *   - Promise<boolean> 是否有记录被更新
 */
async function updatePage(pageId, updates) {
  const allowed = ['name', 'html_content', 'is_protected', 'password', 'code_type'];
  const set = [];
  const params = [];
  for (const [k, v] of Object.entries(updates || {})) {
    if (allowed.includes(k)) { set.push(`${k} = ?`); params.push(v); }
  }
  if (set.length === 0) throw new Error('缺少有效的更新字段');
  params.push(pageId);
  const result = await run(`UPDATE pages SET ${set.join(', ')} WHERE id = ?`, params);
  return (result.changes || 0) > 0;
}

/**
 * 函数: deletePage
 * 说明: 删除单个页面
 * 参数:
 *   - pageId: string 页面 ID
 * 返回:
 *   - Promise<boolean> 是否成功删除
 */
async function deletePage(pageId) {
  const result = await run('DELETE FROM pages WHERE id = ?', [pageId]);
  return (result.changes || 0) > 0;
}

module.exports = {
  createPage,
  getPageById,
  getRecentPages,
  getAllPages,
  getPagesList,
  getPagesStats,
  batchDeletePages,
  batchUpdateProtection,
  updatePage,
  deletePage
};
EOF

echo "[4/6] 设为稳态策略（md5），清理冲突的重试参数..."
sed -i -E '/^PAGE_ID_STRATEGY=/d' .env; echo 'PAGE_ID_STRATEGY=md5' >> .env
sed -i -E '/^PAGE_ID_MAX_RETRIES=/d' .env || true

echo "[5/6] 以新环境热重载 PM2..."
pm2 reload html-go --update-env
sleep 1
pm2 status html-go
pm2 logs html-go --lines 60

echo "[6/6] 本机冒烟验证（/version）..."
set +e
curl -sS -I http://127.0.0.1:8888/version || true
set -e

cat <<'NOTE'

可选：切换为 base62（新建页面将返回 10 位 ID，老链接不受影响）

  sed -i -E '/^PAGE_ID_STRATEGY=/d' .env; echo 'PAGE_ID_STRATEGY=base62' >> .env
  sed -i -E '/^PAGE_ID_MAX_RETRIES=/d' .env; echo 'PAGE_ID_MAX_RETRIES=7' >> .env
  pm2 reload html-go --update-env && pm2 logs html-go --lines 60

本地冒烟（登录→创建页面→检查短链长度）：

  curl -i -c c.txt -d "password=<生产密码>" http://127.0.0.1:8888/login
  curl -s -b c.txt -H 'Content-Type: application/json' \
       -d '{"htmlContent":"<p>smoke</p>","isProtected":false,"codeType":"html"}' \
       http://127.0.0.1:8888/api/pages/create | jq -r '.url'
  # 期望：md5 策略下尾段长度=7；base62 下=10

回滚（若需）：

  cp models/pages.js.bak-$ts models/pages.js
  pm2 reload html-go --update-env && pm2 logs html-go --lines 60

NOTE
```

## 备注
- 执行前已自动将原文件备份到 `models/pages.js.bak-<时间戳>`。
- 若 `.env` 中存在旧策略配置，脚本会先回到稳态 md5，确保快速恢复服务。
- 建议修复后触发仓库的 `.github/workflows/smoke.yml` 完成端到端校验。

