const { run, get, query } = require('./db');
const CryptoJS = require('crypto-js');

/**
 * 生成随机密码（5位纯数字）
 * @returns {string} 返回5位纯数字密码
 */
function generateRandomPassword() {
  const chars = '0123456789';
  let password = '';
  for (let i = 0; i < 5; i++) {
    const randomIndex = Math.floor(Math.random() * chars.length);
    password += chars[randomIndex];
  }
  console.log('生成密码:', password); // 调试输出
  return password;
}

/**
 * 创建新页面
 * @param {string} htmlContent HTML内容
 * @param {boolean} isProtected 是否启用密码保护
 * @param {string} codeType 代码类型（html, markdown, svg, mermaid）
 * @param {string} name 页面名称（可选）
 * @returns {Promise<Object>} 返回生成的URL ID和密码
 */
async function createPage(htmlContent, isProtected = false, codeType = 'html', name = null) {
  try {
    // 生成时间戳
    const timestamp = new Date().getTime().toString();
    
    // 生成短ID (7位)
    const hash = CryptoJS.MD5(htmlContent + timestamp).toString();
    const urlId = hash.substring(0, 7);
    
    // 无论是否启用保护，都生成密码
    const password = generateRandomPassword();
    console.log('生成密码:', password);
    
    // 保存到数据库
    // isProtected决定是否需要密码才能访问
    await run(
      'INSERT INTO pages (id, html_content, created_at, password, is_protected, code_type, name) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [urlId, htmlContent, Date.now(), password, isProtected ? 1 : 0, codeType, name]
    );
    
    return { urlId, password };
  } catch (error) {
    console.error('创建页面错误:', error);
    throw error;
  }
}

/**
 * 通过ID获取页面
 * @param {string} id 页面ID
 * @returns {Promise<Object|null>} 返回页面对象或null
 */
async function getPageById(id) {
  try {
    return await get('SELECT * FROM pages WHERE id = ?', [id]);
  } catch (error) {
    console.error('获取页面错误:', error);
    throw error;
  }
}

/**
 * 获取最近创建的页面列表
 * @param {number} limit 限制数量
 * @returns {Promise<Array>} 返回页面列表
 */
async function getRecentPages(limit = 10) {
  try {
    return await query(
      'SELECT id, created_at FROM pages ORDER BY created_at DESC LIMIT ?',
      [limit]
    );
  } catch (error) {
    console.error('获取最近页面错误:', error);
    throw error;
  }
}


/**
 * 获取所有页面列表，用于后台管理
 * @returns {Promise<Array>} 返回所有页面的列表
 */
async function getAllPages() {
  try {
    // 选择需要的字段，并按创建时间降序排列
    return await query(
      'SELECT id, html_content, created_at, password, is_protected, code_type, name FROM pages ORDER BY created_at DESC'
    );
  } catch (error) {
    console.error('获取所有页面错误:', error);
    throw error;
  }
}

/**
 * 获取页面列表（支持分页、搜索、筛选）
 * @param {Object} options - 查询选项
 * @param {number} options.page - 页码（从1开始）
 * @param {number} options.limit - 每页数量
 * @param {string} options.search - 搜索关键词（匹配名称和内容）
 * @param {string} options.codeType - 代码类型筛选
 * @param {boolean} options.isProtected - 保护状态筛选
 * @param {string} options.sortBy - 排序字段（created_at, name）
 * @param {string} options.sortOrder - 排序方向（ASC, DESC）
 * @returns {Promise<Object>} 返回分页结果
 */
async function getPagesList(options = {}) {
  try {
    const {
      page = 1,
      limit = 20,
      search = '',
      codeType = '',
      isProtected = null,
      sortBy = 'created_at',
      sortOrder = 'DESC'
    } = options;

    // 构建查询条件
    let whereConditions = [];
    let queryParams = [];

    // 搜索条件
    if (search.trim()) {
      whereConditions.push('(name LIKE ? OR html_content LIKE ?)');
      const searchPattern = `%${search.trim()}%`;
      queryParams.push(searchPattern, searchPattern);
    }

    // 代码类型筛选
    if (codeType.trim()) {
      whereConditions.push('code_type = ?');
      queryParams.push(codeType.trim());
    }

    // 保护状态筛选
    if (isProtected !== null) {
      whereConditions.push('is_protected = ?');
      queryParams.push(isProtected ? 1 : 0);
    }

    const whereClause = whereConditions.length > 0 
      ? `WHERE ${whereConditions.join(' AND ')}` 
      : '';

    // 验证排序字段
    const validSortFields = ['created_at', 'name', 'code_type', 'is_protected'];
    const validSortField = validSortFields.includes(sortBy) ? sortBy : 'created_at';
    const validSortOrder = ['ASC', 'DESC'].includes(sortOrder.toUpperCase()) 
      ? sortOrder.toUpperCase() 
      : 'DESC';

    // 计算总数
    const countQuery = `SELECT COUNT(*) as total FROM pages ${whereClause}`;
    const countResult = await get(countQuery, queryParams);
    const total = countResult.total;

    // 计算分页参数
    const offset = (page - 1) * limit;
    const totalPages = Math.ceil(total / limit);

    // 获取数据
    const dataQuery = `
      SELECT 
        id, 
        name,
        html_content,
        created_at, 
        password, 
        is_protected, 
        code_type,
        LENGTH(html_content) as content_size
      FROM pages 
      ${whereClause}
      ORDER BY ${validSortField} ${validSortOrder}
      LIMIT ? OFFSET ?
    `;
    
    const dataParams = [...queryParams, limit, offset];
    const pages = await query(dataQuery, dataParams);

    return {
      pages,
      pagination: {
        current: page,
        total: totalPages,
        limit,
        totalRecords: total,
        hasNext: page < totalPages,
        hasPrev: page > 1
      }
    };
  } catch (error) {
    console.error('获取页面列表错误:', error);
    throw error;
  }
}

/**
 * 获取页面统计信息
 * @returns {Promise<Object>} 返回统计信息
 */
async function getPagesStats() {
  try {
    // 总页面数
    const totalResult = await get('SELECT COUNT(*) as total FROM pages');
    const total = totalResult.total;

    // 受保护页面数
    const protectedResult = await get('SELECT COUNT(*) as protected FROM pages WHERE is_protected = 1');
    const protectedCount = protectedResult.protected;

    // 公开页面数
    const publicCount = total - protectedCount;

    // 按类型统计
    const typeStats = await query(`
      SELECT 
        code_type,
        COUNT(*) as count 
      FROM pages 
      GROUP BY code_type 
      ORDER BY count DESC
    `);

    // 今日创建的页面数
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const todayStartTimestamp = todayStart.getTime();

    const todayResult = await get(
      'SELECT COUNT(*) as today FROM pages WHERE created_at >= ?',
      [todayStartTimestamp]
    );
    const todayCount = todayResult.today;

    // 最近7天创建的页面数
    const sevenDaysAgo = Date.now() - (7 * 24 * 60 * 60 * 1000);
    const weekResult = await get(
      'SELECT COUNT(*) as week FROM pages WHERE created_at >= ?',
      [sevenDaysAgo]
    );
    const weekCount = weekResult.week;

    return {
      total,
      protected: protectedCount,
      public: publicCount,
      today: todayCount,
      thisWeek: weekCount,
      typeStats
    };
  } catch (error) {
    console.error('获取页面统计错误:', error);
    throw error;
  }
}

/**
 * 批量删除页面
 * @param {Array} pageIds - 页面ID列表
 * @returns {Promise<number>} 返回删除的页面数量
 */
async function batchDeletePages(pageIds) {
  try {
    if (!Array.isArray(pageIds) || pageIds.length === 0) {
      throw new Error('页面ID列表不能为空');
    }

    // 构建批量删除SQL
    const placeholders = pageIds.map(() => '?').join(',');
    const deleteQuery = `DELETE FROM pages WHERE id IN (${placeholders})`;
    
    const result = await run(deleteQuery, pageIds);
    return result.changes || 0;
  } catch (error) {
    console.error('批量删除页面错误:', error);
    throw error;
  }
}

/**
 * 批量更新页面保护状态
 * @param {Array} pageIds - 页面ID列表
 * @param {boolean} isProtected - 保护状态
 * @returns {Promise<number>} 返回更新的页面数量
 */
async function batchUpdateProtection(pageIds, isProtected) {
  try {
    if (!Array.isArray(pageIds) || pageIds.length === 0) {
      throw new Error('页面ID列表不能为空');
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
  } catch (error) {
    console.error('批量更新保护状态错误:', error);
    throw error;
  }
}

/**
 * 更新页面信息
 * @param {string} pageId - 页面ID
 * @param {Object} updates - 更新的字段
 * @returns {Promise<boolean>} 返回是否更新成功
 */
async function updatePage(pageId, updates) {
  try {
    const allowedFields = ['name', 'html_content', 'is_protected', 'password', 'code_type'];
    const setClause = [];
    const params = [];

    // 构建更新SQL
    for (const [field, value] of Object.entries(updates)) {
      if (allowedFields.includes(field)) {
        setClause.push(`${field} = ?`);
        params.push(value);
      }
    }

    if (setClause.length === 0) {
      throw new Error('没有有效的更新字段');
    }

    params.push(pageId);
    const updateQuery = `
      UPDATE pages 
      SET ${setClause.join(', ')} 
      WHERE id = ?
    `;

    const result = await run(updateQuery, params);
    return result.changes > 0;
  } catch (error) {
    console.error('更新页面错误:', error);
    throw error;
  }
}

/**
 * 删除单个页面
 * @param {string} pageId - 页面ID
 * @returns {Promise<boolean>} 返回是否删除成功
 */
async function deletePage(pageId) {
  try {
    const result = await run('DELETE FROM pages WHERE id = ?', [pageId]);
    return result.changes > 0;
  } catch (error) {
    console.error('删除页面错误:', error);
    throw error;
  }
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
