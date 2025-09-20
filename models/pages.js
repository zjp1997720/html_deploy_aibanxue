const { run, get, query } = require('./db');
const CryptoJS = require('crypto-js');
const nodeCrypto = require('crypto');

const ID_STRATEGY = (process.env.PAGE_ID_STRATEGY || 'md5').toLowerCase();
const MAX_ID_ATTEMPTS = Math.max(parseInt(process.env.PAGE_ID_MAX_RETRIES || '5', 10), 1);
const BASE62_ALPHABET = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz';

/**
 * Base62-encodes random bytes for friendly short IDs.
 * @param {Buffer} bytes
 * @returns {string}
 */
function encodeBase62(bytes) {
  let value = BigInt(`0x${bytes.toString('hex')}`);
  if (value === 0n) {
    return BASE62_ALPHABET[0];
  }

  let result = '';
  while (value > 0n) {
    const remainder = Number(value % 62n);
    result = BASE62_ALPHABET[remainder] + result;
    value = value / 62n;
  }
  return result;
}

/**
 * Generates a page identifier according to the configured strategy.
 * Defaults to 7-char MD5, optionally 10-char base62.
 * @param {string} htmlContent
 * @returns {string}
 */
function generatePageId(htmlContent) {
  if (ID_STRATEGY === 'base62') {
    const raw = encodeBase62(nodeCrypto.randomBytes(8)); // ~11 chars
    const padded = raw.padStart(10, BASE62_ALPHABET[0]);
    return padded.slice(-10);
  }

  const salt = nodeCrypto.randomBytes(6).toString('hex');
  const hash = CryptoJS.MD5(`${htmlContent}|${Date.now()}|${salt}`).toString();
  return hash.substring(0, 7);
}

/**
 * Generates a 5-digit numeric password for protected pages.
 * @returns {string}
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
 * Persists a new page, retrying on ID collisions.
 * @param {string} htmlContent
 * @param {boolean} isProtected
 * @param {string} codeType
 * @param {string|null} name
 * @returns {Promise<{urlId: string, password: string}>}
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

      if (!isConstraint) {
        throw error;
      }

      console.warn(`Detected page ID collision, retrying ${attempt}/${MAX_ID_ATTEMPTS}`);
    }
  }

  throw lastError || new Error('Unable to generate unique page id');
}

async function getPageById(id) {
  return get('SELECT * FROM pages WHERE id = ?', [id]);
}

async function getRecentPages(limit = 10) {
  return query('SELECT id, created_at FROM pages ORDER BY created_at DESC LIMIT ?', [limit]);
}

async function getAllPages() {
  return query('SELECT id, html_content, created_at, password, is_protected, code_type, name FROM pages ORDER BY created_at DESC');
}

async function getPagesList(options = {}) {
  const {
    page = 1,
    limit = 20,
    search = '',
    codeType = '',
    isProtected = null,
    sortBy = 'created_at',
    sortOrder = 'DESC'
  } = options;

  const whereConditions = [];
  const queryParams = [];

  if (search) {
    whereConditions.push('(name LIKE ? OR html_content LIKE ?)');
    queryParams.push(`%${search}%`, `%${search}%`);
  }
  if (codeType) {
    whereConditions.push('code_type = ?');
    queryParams.push(codeType);
  }
  if (typeof isProtected === 'boolean') {
    whereConditions.push('is_protected = ?');
    queryParams.push(isProtected ? 1 : 0);
  }

  const whereClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(' AND ')}` : '';
  const validSortFields = ['created_at', 'name', 'code_type', 'is_protected'];
  const safeSortBy = validSortFields.includes(sortBy) ? sortBy : 'created_at';
  const safeSortOrder = sortOrder.toUpperCase() === 'ASC' ? 'ASC' : 'DESC';
  const offset = (page - 1) * limit;

  const countQuery = `SELECT COUNT(*) as total FROM pages ${whereClause}`;
  const countResult = await get(countQuery, queryParams);

  const dataQuery = `
    SELECT id, name, created_at, is_protected, code_type
    FROM pages
    ${whereClause}
    ORDER BY ${safeSortBy} ${safeSortOrder}
    LIMIT ? OFFSET ?
  `;

  const dataParams = [...queryParams, limit, offset];
  const pages = await query(dataQuery, dataParams);

  return {
    pages,
    pagination: {
      total: countResult?.total || 0,
      page,
      limit
    }
  };
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

  return {
    total: totalResult.total,
    protected: protectedResult.protected,
    public: publicCount,
    today: todayCount.today,
    thisWeek: weekCount.week,
    typeStats
  };
}

async function batchDeletePages(pageIds) {
  if (!Array.isArray(pageIds) || pageIds.length === 0) {
    throw new Error('页面 ID 列表不能为空');
  }

  const placeholders = pageIds.map(() => '?').join(',');
  const deleteQuery = `DELETE FROM pages WHERE id IN (${placeholders})`;
  const result = await run(deleteQuery, pageIds);
  return result.changes || 0;
}

async function batchUpdateProtection(pageIds, isProtected) {
  if (!Array.isArray(pageIds) || pageIds.length === 0) {
    throw new Error('页面 ID 列表不能为空');
  }

  const placeholders = pageIds.map(() => '?').join(',');
  const updateQuery = `
    UPDATE pages
    SET is_protected = ?
    WHERE id IN (${placeholders})
  `;

  const params = [isProtected ? 1 : 0, ...pageIds];
  const result = await run(updateQuery, params);
  return result.changes || 0;
}

async function updatePage(pageId, updates) {
  const allowedFields = ['name', 'html_content', 'is_protected', 'password', 'code_type'];
  const setClause = [];
  const params = [];

  Object.entries(updates).forEach(([field, value]) => {
    if (allowedFields.includes(field)) {
      setClause.push(`${field} = ?`);
      params.push(value);
    }
  });

  if (setClause.length === 0) {
    throw new Error('缺少有效的更新字段');
  }

  params.push(pageId);
  const updateQuery = `
    UPDATE pages
    SET ${setClause.join(', ')}
    WHERE id = ?
  `;

  const result = await run(updateQuery, params);
  return result.changes > 0;
}

async function deletePage(pageId) {
  const result = await run('DELETE FROM pages WHERE id = ?', [pageId]);
  return result.changes > 0;
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

