const { run, get, query } = require('./db');
const crypto = require('crypto');

/**
 * 生成新的API Key
 * @param {string} name - API Key名称
 * @param {string} description - API Key描述
 * @param {Array} permissions - 权限列表 ['read', 'write']
 * @param {number} maxRequestsPerHour - 每小时最大请求数
 * @param {number} maxRequestsPerDay - 每天最大请求数
 * @param {number} expiresAt - 过期时间戳(可选)
 * @returns {Promise<Object>} 返回生成的API Key信息
 */
async function createApiKey(name, description = '', permissions = ['read', 'write'], maxRequestsPerHour = 1000, maxRequestsPerDay = 10000, expiresAt = null) {
  try {
    // 生成唯一的key_id
    const keyId = 'key_' + crypto.randomBytes(16).toString('hex');
    
    // 生成API Key (以hg_开头)
    const apiKey = 'hg_' + crypto.randomBytes(32).toString('hex');
    
    // 生成key的hash用于存储（不存储明文）
    const keyHash = crypto.createHash('sha256').update(apiKey).digest('hex');
    
    const now = Date.now();
    
    // 保存到数据库
    await run(`
      INSERT INTO api_keys 
      (key_id, key_hash, name, description, permissions, max_requests_per_hour, max_requests_per_day, expires_at, is_active, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1, ?, ?)
    `, [
      keyId,
      keyHash,
      name,
      description,
      permissions.join(','),
      maxRequestsPerHour,
      maxRequestsPerDay,
      expiresAt,
      now,
      now
    ]);
    
    return {
      keyId,
      apiKey, // 只在创建时返回明文key
      name,
      description,
      permissions,
      maxRequestsPerHour,
      maxRequestsPerDay,
      expiresAt,
      createdAt: now
    };
  } catch (error) {
    console.error('创建API Key错误:', error);
    throw error;
  }
}

/**
 * 验证API Key
 * @param {string} apiKey - 要验证的API Key
 * @returns {Promise<Object|null>} 返回API Key信息或null
 */
async function validateApiKey(apiKey) {
  try {
    if (!apiKey || !apiKey.startsWith('hg_')) {
      return null;
    }
    
    // 计算hash
    const keyHash = crypto.createHash('sha256').update(apiKey).digest('hex');
    
    // 查询数据库
    const keyInfo = await get(`
      SELECT * FROM api_keys 
      WHERE key_hash = ? AND is_active = 1
    `, [keyHash]);
    
    if (!keyInfo) {
      return null;
    }
    
    // 检查是否过期
    if (keyInfo.expires_at && keyInfo.expires_at < Date.now()) {
      return null;
    }
    
    return {
      keyId: keyInfo.key_id,
      name: keyInfo.name,
      description: keyInfo.description,
      permissions: keyInfo.permissions.split(','),
      maxRequestsPerHour: keyInfo.max_requests_per_hour,
      maxRequestsPerDay: keyInfo.max_requests_per_day,
      expiresAt: keyInfo.expires_at,
      lastUsedAt: keyInfo.last_used_at,
      createdAt: keyInfo.created_at
    };
  } catch (error) {
    console.error('验证API Key错误:', error);
    return null;
  }
}

/**
 * 更新API Key的最后使用时间
 * @param {string} keyId - API Key ID
 * @returns {Promise<void>}
 */
async function updateLastUsed(keyId) {
  try {
    await run(`
      UPDATE api_keys 
      SET last_used_at = ?, updated_at = ?
      WHERE key_id = ?
    `, [Date.now(), Date.now(), keyId]);
  } catch (error) {
    console.error('更新API Key使用时间错误:', error);
    throw error;
  }
}

/**
 * 记录API使用日志
 * @param {string} keyId - API Key ID
 * @param {string} endpoint - 访问的端点
 * @param {string} method - HTTP方法
 * @param {string} requestIp - 请求IP
 * @param {string} userAgent - 用户代理
 * @param {number} statusCode - 响应状态码
 * @param {number} responseTime - 响应时间(ms)
 * @param {string} errorMessage - 错误信息(可选)
 * @returns {Promise<void>}
 */
async function logApiUsage(keyId, endpoint, method, requestIp, userAgent, statusCode, responseTime, errorMessage = null) {
  try {
    await run(`
      INSERT INTO api_usage_logs 
      (key_id, endpoint, method, request_ip, user_agent, status_code, response_time, error_message, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      keyId,
      endpoint,
      method,
      requestIp,
      userAgent,
      statusCode,
      responseTime,
      errorMessage,
      Date.now()
    ]);
  } catch (error) {
    console.error('记录API使用日志错误:', error);
    // 日志记录失败不应该影响主要功能，所以不抛出错误
  }
}

/**
 * 检查API Key的使用限制
 * @param {string} keyId - API Key ID
 * @returns {Promise<Object>} 返回使用统计和限制检查结果
 */
async function checkUsageLimits(keyId) {
  try {
    const now = Date.now();
    const oneHourAgo = now - (60 * 60 * 1000);
    const oneDayAgo = now - (24 * 60 * 60 * 1000);
    
    // 获取API Key信息
    const keyInfo = await get(`
      SELECT max_requests_per_hour, max_requests_per_day 
      FROM api_keys 
      WHERE key_id = ? AND is_active = 1
    `, [keyId]);
    
    if (!keyInfo) {
      return { withinLimits: false, reason: 'API Key not found or inactive' };
    }
    
    // 查询最近1小时的使用次数
    const hourlyUsage = await get(`
      SELECT COUNT(*) as count 
      FROM api_usage_logs 
      WHERE key_id = ? AND created_at > ?
    `, [keyId, oneHourAgo]);
    
    // 查询最近24小时的使用次数
    const dailyUsage = await get(`
      SELECT COUNT(*) as count 
      FROM api_usage_logs 
      WHERE key_id = ? AND created_at > ?
    `, [keyId, oneDayAgo]);
    
    const hourlyCount = hourlyUsage.count || 0;
    const dailyCount = dailyUsage.count || 0;
    
    // 检查限制
    if (hourlyCount >= keyInfo.max_requests_per_hour) {
      return {
        withinLimits: false,
        reason: 'Hourly limit exceeded',
        hourlyUsage: hourlyCount,
        hourlyLimit: keyInfo.max_requests_per_hour,
        dailyUsage: dailyCount,
        dailyLimit: keyInfo.max_requests_per_day
      };
    }
    
    if (dailyCount >= keyInfo.max_requests_per_day) {
      return {
        withinLimits: false,
        reason: 'Daily limit exceeded',
        hourlyUsage: hourlyCount,
        hourlyLimit: keyInfo.max_requests_per_hour,
        dailyUsage: dailyCount,
        dailyLimit: keyInfo.max_requests_per_day
      };
    }
    
    return {
      withinLimits: true,
      hourlyUsage: hourlyCount,
      hourlyLimit: keyInfo.max_requests_per_hour,
      dailyUsage: dailyCount,
      dailyLimit: keyInfo.max_requests_per_day
    };
    
  } catch (error) {
    console.error('检查API Key使用限制错误:', error);
    return { withinLimits: false, reason: 'Internal error' };
  }
}

/**
 * 获取所有API Keys列表
 * @returns {Promise<Array>} 返回API Key列表（不包含敏感信息）
 */
async function getAllApiKeys() {
  try {
    return await query(`
      SELECT 
        key_id,
        name,
        description,
        permissions,
        max_requests_per_hour,
        max_requests_per_day,
        expires_at,
        is_active,
        created_at,
        updated_at,
        last_used_at
      FROM api_keys 
      ORDER BY created_at DESC
    `);
  } catch (error) {
    console.error('获取API Keys列表错误:', error);
    throw error;
  }
}

/**
 * 通过key_id获取API Key信息
 * @param {string} keyId - API Key ID
 * @returns {Promise<Object|null>} 返回API Key信息或null
 */
async function getApiKeyById(keyId) {
  try {
    return await get(`
      SELECT 
        key_id,
        name,
        description,
        permissions,
        max_requests_per_hour,
        max_requests_per_day,
        expires_at,
        is_active,
        created_at,
        updated_at,
        last_used_at
      FROM api_keys 
      WHERE key_id = ?
    `, [keyId]);
  } catch (error) {
    console.error('获取API Key错误:', error);
    throw error;
  }
}

/**
 * 删除API Key
 * @param {string} keyId - API Key ID
 * @returns {Promise<boolean>} 返回是否删除成功
 */
async function deleteApiKey(keyId) {
  try {
    const result = await run(`
      DELETE FROM api_keys WHERE key_id = ?
    `, [keyId]);
    
    return result.changes > 0;
  } catch (error) {
    console.error('删除API Key错误:', error);
    throw error;
  }
}

/**
 * 禁用/启用API Key
 * @param {string} keyId - API Key ID
 * @param {boolean} isActive - 是否激活
 * @returns {Promise<boolean>} 返回是否更新成功
 */
async function toggleApiKey(keyId, isActive) {
  try {
    const result = await run(`
      UPDATE api_keys 
      SET is_active = ?, updated_at = ?
      WHERE key_id = ?
    `, [isActive ? 1 : 0, Date.now(), keyId]);
    
    return result.changes > 0;
  } catch (error) {
    console.error('切换API Key状态错误:', error);
    throw error;
  }
}

/**
 * 获取API Key的使用统计
 * @param {string} keyId - API Key ID
 * @param {number} days - 查询天数(默认7天)
 * @returns {Promise<Object>} 返回使用统计
 */
async function getApiKeyStats(keyId, days = 7) {
  try {
    const daysBefore = Date.now() - (days * 24 * 60 * 60 * 1000);
    
    // 总调用次数
    const totalCalls = await get(`
      SELECT COUNT(*) as count 
      FROM api_usage_logs 
      WHERE key_id = ? AND created_at > ?
    `, [keyId, daysBefore]);
    
    // 成功调用次数
    const successCalls = await get(`
      SELECT COUNT(*) as count 
      FROM api_usage_logs 
      WHERE key_id = ? AND created_at > ? AND status_code >= 200 AND status_code < 300
    `, [keyId, daysBefore]);
    
    // 平均响应时间
    const avgResponseTime = await get(`
      SELECT AVG(response_time) as avg_time 
      FROM api_usage_logs 
      WHERE key_id = ? AND created_at > ? AND response_time IS NOT NULL
    `, [keyId, daysBefore]);
    
    // 最常用的端点
    const topEndpoints = await query(`
      SELECT endpoint, COUNT(*) as count 
      FROM api_usage_logs 
      WHERE key_id = ? AND created_at > ?
      GROUP BY endpoint 
      ORDER BY count DESC 
      LIMIT 5
    `, [keyId, daysBefore]);
    
    return {
      totalCalls: totalCalls.count || 0,
      successCalls: successCalls.count || 0,
      errorCalls: (totalCalls.count || 0) - (successCalls.count || 0),
      avgResponseTime: Math.round(avgResponseTime.avg_time || 0),
      topEndpoints
    };
  } catch (error) {
    console.error('获取API Key统计错误:', error);
    throw error;
  }
}

/**
 * 获取API Key的详细使用统计（增强版）
 * @param {string} keyId - API Key ID
 * @param {number} days - 查询天数
 * @returns {Promise<Object>} 返回详细统计
 */
async function getDetailedApiKeyStats(keyId, days = 7) {
  try {
    const daysBefore = Date.now() - (days * 24 * 60 * 60 * 1000);
    
    // 基础统计
    const basicStats = await getApiKeyStats(keyId, days);
    
    // 按天统计调用次数
    const dailyStats = await query(`
      SELECT 
        DATE(datetime(created_at/1000, 'unixepoch')) as date,
        COUNT(*) as calls,
        SUM(CASE WHEN status_code >= 200 AND status_code < 300 THEN 1 ELSE 0 END) as success_calls,
        AVG(response_time) as avg_response_time
      FROM api_usage_logs 
      WHERE key_id = ? AND created_at > ?
      GROUP BY DATE(datetime(created_at/1000, 'unixepoch'))
      ORDER BY date DESC
    `, [keyId, daysBefore]);
    
    // 按HTTP方法统计
    const methodStats = await query(`
      SELECT 
        method,
        COUNT(*) as count
      FROM api_usage_logs 
      WHERE key_id = ? AND created_at > ?
      GROUP BY method
      ORDER BY count DESC
    `, [keyId, daysBefore]);
    
    // 按状态码统计
    const statusStats = await query(`
      SELECT 
        status_code,
        COUNT(*) as count
      FROM api_usage_logs 
      WHERE key_id = ? AND created_at > ?
      GROUP BY status_code
      ORDER BY count DESC
    `, [keyId, daysBefore]);
    
    // 最近的错误
    const recentErrors = await query(`
      SELECT 
        endpoint,
        method,
        status_code,
        error_message,
        created_at
      FROM api_usage_logs 
      WHERE key_id = ? AND created_at > ? AND status_code >= 400
      ORDER BY created_at DESC
      LIMIT 10
    `, [keyId, daysBefore]);
    
    // 响应时间分布
    const responseTimeStats = await get(`
      SELECT 
        MIN(response_time) as min_time,
        MAX(response_time) as max_time,
        AVG(response_time) as avg_time,
        COUNT(CASE WHEN response_time < 100 THEN 1 END) as under_100ms,
        COUNT(CASE WHEN response_time BETWEEN 100 AND 500 THEN 1 END) as between_100_500ms,
        COUNT(CASE WHEN response_time > 500 THEN 1 END) as over_500ms
      FROM api_usage_logs 
      WHERE key_id = ? AND created_at > ? AND response_time IS NOT NULL
    `, [keyId, daysBefore]);
    
    return {
      ...basicStats,
      dailyStats: dailyStats || [],
      methodStats: methodStats || [],
      statusStats: statusStats || [],
      recentErrors: recentErrors || [],
      responseTimeDistribution: responseTimeStats || {}
    };
  } catch (error) {
    console.error('获取详细API Key统计错误:', error);
    throw error;
  }
}

/**
 * 获取所有API Key的总体统计
 * @param {number} days - 查询天数
 * @returns {Promise<Object>} 返回总体统计
 */
async function getOverallApiStats(days = 7) {
  try {
    const daysBefore = Date.now() - (days * 24 * 60 * 60 * 1000);
    
    // 活跃API Key数量
    const activeKeys = await get(`
      SELECT COUNT(DISTINCT key_id) as count
      FROM api_usage_logs 
      WHERE created_at > ?
    `, [daysBefore]);
    
    // 总调用次数
    const totalCalls = await get(`
      SELECT COUNT(*) as count 
      FROM api_usage_logs 
      WHERE created_at > ?
    `, [daysBefore]);
    
    // 成功率
    const successRate = await get(`
      SELECT 
        COUNT(*) as total,
        SUM(CASE WHEN status_code >= 200 AND status_code < 300 THEN 1 ELSE 0 END) as success
      FROM api_usage_logs 
      WHERE created_at > ?
    `, [daysBefore]);
    
    // 平均响应时间
    const avgResponseTime = await get(`
      SELECT AVG(response_time) as avg_time 
      FROM api_usage_logs 
      WHERE created_at > ? AND response_time IS NOT NULL
    `, [daysBefore]);
    
    // 最热门的端点
    const topEndpoints = await query(`
      SELECT 
        endpoint,
        COUNT(*) as calls,
        COUNT(DISTINCT key_id) as unique_keys
      FROM api_usage_logs 
      WHERE created_at > ?
      GROUP BY endpoint 
      ORDER BY calls DESC 
      LIMIT 10
    `, [daysBefore]);
    
    // 每小时调用统计
    const hourlyStats = await query(`
      SELECT 
        strftime('%H', datetime(created_at/1000, 'unixepoch')) as hour,
        COUNT(*) as calls
      FROM api_usage_logs 
      WHERE created_at > ?
      GROUP BY hour
      ORDER BY hour
    `, [daysBefore]);
    
    // 错误统计
    const errorStats = await query(`
      SELECT 
        status_code,
        COUNT(*) as count,
        COUNT(DISTINCT key_id) as affected_keys
      FROM api_usage_logs 
      WHERE created_at > ? AND status_code >= 400
      GROUP BY status_code
      ORDER BY count DESC
    `, [daysBefore]);
    
    return {
      activeKeys: activeKeys.count || 0,
      totalCalls: totalCalls.count || 0,
      successRate: successRate.total > 0 ? (successRate.success / successRate.total * 100).toFixed(2) : 0,
      avgResponseTime: Math.round(avgResponseTime.avg_time || 0),
      topEndpoints: topEndpoints || [],
      hourlyDistribution: hourlyStats || [],
      errorBreakdown: errorStats || []
    };
  } catch (error) {
    console.error('获取总体API统计错误:', error);
    throw error;
  }
}

/**
 * 获取异常检测报告
 * @param {number} hours - 检测最近几小时
 * @returns {Promise<Object>} 返回异常报告
 */
async function getAnomalyReport(hours = 24) {
  try {
    const hoursBefore = Date.now() - (hours * 60 * 60 * 1000);
    
    // 高错误率的API Key
    const highErrorRateKeys = await query(`
      SELECT 
        key_id,
        COUNT(*) as total_calls,
        SUM(CASE WHEN status_code >= 400 THEN 1 ELSE 0 END) as error_calls,
        ROUND(SUM(CASE WHEN status_code >= 400 THEN 1 ELSE 0 END) * 100.0 / COUNT(*), 2) as error_rate
      FROM api_usage_logs 
      WHERE created_at > ?
      GROUP BY key_id
      HAVING error_rate > 10 AND total_calls > 10
      ORDER BY error_rate DESC
      LIMIT 10
    `, [hoursBefore]);
    
    // 高频调用的API Key
    const highVolumeKeys = await query(`
      SELECT 
        key_id,
        COUNT(*) as calls,
        ROUND(COUNT(*) * 1.0 / ?, 2) as calls_per_hour
      FROM api_usage_logs 
      WHERE created_at > ?
      GROUP BY key_id
      HAVING calls > 1000
      ORDER BY calls DESC
      LIMIT 10
    `, [hours, hoursBefore]);
    
    // 响应时间异常的端点
    const slowEndpoints = await query(`
      SELECT 
        endpoint,
        COUNT(*) as calls,
        AVG(response_time) as avg_response_time,
        MAX(response_time) as max_response_time
      FROM api_usage_logs 
      WHERE created_at > ? AND response_time IS NOT NULL
      GROUP BY endpoint
      HAVING avg_response_time > 1000
      ORDER BY avg_response_time DESC
      LIMIT 10
    `, [hoursBefore]);
    
    // 最近的404错误
    const notFoundErrors = await query(`
      SELECT 
        endpoint,
        COUNT(*) as count,
        COUNT(DISTINCT key_id) as affected_keys
      FROM api_usage_logs 
      WHERE created_at > ? AND status_code = 404
      GROUP BY endpoint
      ORDER BY count DESC
      LIMIT 10
    `, [hoursBefore]);
    
    return {
      timeRange: `${hours} hours`,
      highErrorRateKeys: highErrorRateKeys || [],
      highVolumeKeys: highVolumeKeys || [],
      slowEndpoints: slowEndpoints || [],
      notFoundErrors: notFoundErrors || []
    };
  } catch (error) {
    console.error('获取异常检测报告错误:', error);
    throw error;
  }
}

module.exports = {
  createApiKey,
  validateApiKey,
  updateLastUsed,
  logApiUsage,
  checkUsageLimits,
  getAllApiKeys,
  getApiKeyById,
  deleteApiKey,
  toggleApiKey,
  getApiKeyStats,
  getDetailedApiKeyStats,
  getOverallApiStats,
  getAnomalyReport
}; 