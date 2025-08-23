/**
 * API Key验证中间件
 * 用于验证和管理API Key的访问权限
 */

const { validateApiKey, updateLastUsed, logApiUsage, checkUsageLimits } = require('../models/apiKeys');

/**
 * API Key验证中间件
 * 支持Bearer Token格式：Authorization: Bearer hg_xxx
 * @param {Array} requiredPermissions - 需要的权限列表 ['read', 'write']
 * @returns {Function} Express中间件函数
 */
function requireApiKey(requiredPermissions = ['read']) {
  return async (req, res, next) => {
    const startTime = Date.now();
    
    try {
      // 获取Authorization header
      const authHeader = req.headers['authorization'];
      
      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        await logUsageIfPossible(req, null, 401, Date.now() - startTime, 'Missing or invalid Authorization header');
        return res.status(401).json({
          success: false,
          error: 'Missing or invalid Authorization header. Expected: Bearer hg_xxx'
        });
      }
      
      // 提取API Key
      const apiKey = authHeader.substring(7); // 移除 "Bearer " 前缀
      
      // 验证API Key
      const keyInfo = await validateApiKey(apiKey);
      if (!keyInfo) {
        await logUsageIfPossible(req, null, 401, Date.now() - startTime, 'Invalid API Key');
        return res.status(401).json({
          success: false,
          error: 'Invalid API Key'
        });
      }
      
      // 检查使用限制
      const usageCheck = await checkUsageLimits(keyInfo.keyId);
      if (!usageCheck.withinLimits) {
        await logApiUsage(
          keyInfo.keyId,
          req.path,
          req.method,
          getClientIp(req),
          req.get('User-Agent') || '',
          429,
          Date.now() - startTime,
          usageCheck.reason
        );
        
        return res.status(429).json({
          success: false,
          error: 'Rate limit exceeded',
          details: {
            reason: usageCheck.reason,
            hourlyUsage: usageCheck.hourlyUsage,
            hourlyLimit: usageCheck.hourlyLimit,
            dailyUsage: usageCheck.dailyUsage,
            dailyLimit: usageCheck.dailyLimit
          }
        });
      }
      
      // 检查权限
      if (!hasRequiredPermissions(keyInfo.permissions, requiredPermissions)) {
        await logApiUsage(
          keyInfo.keyId,
          req.path,
          req.method,
          getClientIp(req),
          req.get('User-Agent') || '',
          403,
          Date.now() - startTime,
          'Insufficient permissions'
        );
        
        return res.status(403).json({
          success: false,
          error: 'Insufficient permissions',
          required: requiredPermissions,
          granted: keyInfo.permissions
        });
      }
      
      // 将API Key信息附加到request对象
      req.apiKey = keyInfo;
      
      // 更新最后使用时间（异步，不阻塞请求）
      updateLastUsed(keyInfo.keyId).catch(err => {
        console.error('更新API Key使用时间失败:', err);
      });
      
      // 继续处理请求
      next();
      
    } catch (error) {
      console.error('API Key验证错误:', error);
      await logUsageIfPossible(req, null, 500, Date.now() - startTime, 'Internal server error');
      return res.status(500).json({
        success: false,
        error: 'Internal server error'
      });
    }
  };
}

/**
 * API Key验证中间件（可选）
 * 如果提供了API Key则验证，如果没有提供则跳过
 * 用于同时支持API Key和传统认证的接口
 */
function optionalApiKey() {
  return async (req, res, next) => {
    const authHeader = req.headers['authorization'];
    
    // 如果没有提供Authorization header，直接跳过
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return next();
    }
    
    // 如果提供了，则按标准流程验证
    return requireApiKey(['read'])(req, res, next);
  };
}

/**
 * 记录API使用日志的中间件
 * 应该在路由处理后调用
 */
function logApiUsageMiddleware() {
  return (req, res, next) => {
    const startTime = Date.now();
    
    // 保存原始的res.json方法
    const originalJson = res.json;
    
    // 重写res.json方法以捕获响应
    res.json = function(data) {
      const responseTime = Date.now() - startTime;
      
      // 如果有API Key信息，记录使用日志
      if (req.apiKey) {
        logApiUsage(
          req.apiKey.keyId,
          req.path,
          req.method,
          getClientIp(req),
          req.get('User-Agent') || '',
          res.statusCode,
          responseTime
        ).catch(err => {
          console.error('记录API使用日志失败:', err);
        });
      }
      
      // 调用原始方法
      return originalJson.call(this, data);
    };
    
    next();
  };
}

/**
 * 检查是否具有所需权限
 * @param {Array} userPermissions - 用户的权限列表
 * @param {Array} requiredPermissions - 需要的权限列表
 * @returns {boolean} 是否具有所需权限
 */
function hasRequiredPermissions(userPermissions, requiredPermissions) {
  return requiredPermissions.every(permission => 
    userPermissions.includes(permission)
  );
}

/**
 * 获取客户端IP地址
 * @param {Object} req - Express请求对象
 * @returns {string} 客户端IP地址
 */
function getClientIp(req) {
  return req.headers['x-forwarded-for'] || 
         req.headers['x-real-ip'] || 
         req.connection.remoteAddress || 
         req.socket.remoteAddress ||
         (req.connection.socket ? req.connection.socket.remoteAddress : null) ||
         'unknown';
}

/**
 * 尝试记录使用日志（即使没有keyId）
 * @param {Object} req - Express请求对象
 * @param {string} keyId - API Key ID（可能为null）
 * @param {number} statusCode - HTTP状态码
 * @param {number} responseTime - 响应时间
 * @param {string} errorMessage - 错误信息
 */
async function logUsageIfPossible(req, keyId, statusCode, responseTime, errorMessage = null) {
  if (keyId) {
    try {
      await logApiUsage(
        keyId,
        req.path,
        req.method,
        getClientIp(req),
        req.get('User-Agent') || '',
        statusCode,
        responseTime,
        errorMessage
      );
    } catch (err) {
      console.error('记录API使用日志失败:', err);
    }
  }
}

/**
 * 组合中间件：API Key验证 + 使用日志记录
 * @param {Array} requiredPermissions - 需要的权限列表
 * @returns {Array} 中间件数组
 */
function apiKeyWithLogging(requiredPermissions = ['read']) {
  return [
    logApiUsageMiddleware(),
    requireApiKey(requiredPermissions)
  ];
}

module.exports = {
  requireApiKey,
  optionalApiKey,
  logApiUsageMiddleware,
  apiKeyWithLogging,
  hasRequiredPermissions,
  getClientIp
}; 