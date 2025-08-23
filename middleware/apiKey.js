/**
 * API Key验证中间件
 * 用于验证和管理API Key的访问权限
 */

const { validateApiKey, updateLastUsed, logApiUsage, checkUsageLimits } = require('../models/apiKeys');

/**
 * API Key权限验证中间件
 * @param {Array} requiredPermissions - 需要的权限列表
 * @returns {Function} 中间件函数
 */
function requirePermissions(requiredPermissions = []) {
  return async (req, res, next) => {
    try {
      // 获取API Key信息（应该在之前的中间件中设置）
      const apiKeyInfo = req.apiKeyInfo;
      
      if (!apiKeyInfo) {
        return res.status(401).json({
          success: false,
          error: 'API Key验证失败',
          code: 'INVALID_API_KEY'
        });
      }

      // 检查权限
      const userPermissions = apiKeyInfo.permissions || [];
      const hasRequiredPermissions = requiredPermissions.every(permission => 
        userPermissions.includes(permission)
      );

      if (!hasRequiredPermissions) {
        return res.status(403).json({
          success: false,
          error: '权限不足',
          code: 'INSUFFICIENT_PERMISSIONS',
          required: requiredPermissions,
          current: userPermissions
        });
      }

      next();
    } catch (error) {
      console.error('权限检查错误:', error);
      res.status(500).json({
        success: false,
        error: '权限检查失败',
        code: 'PERMISSION_CHECK_FAILED'
      });
    }
  };
}

/**
 * API Key验证和使用限制检查中间件
 */
async function validateApiKeyMiddleware(req, res, next) {
  try {
    const startTime = Date.now();
    
    // 获取API Key
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        error: '缺少或无效的Authorization头',
        code: 'MISSING_AUTH_HEADER'
      });
    }

    const apiKey = authHeader.substring(7); // 移除 'Bearer ' 前缀
    
    // 验证API Key
    const keyInfo = await validateApiKey(apiKey);
    if (!keyInfo) {
      return res.status(401).json({
        success: false,
        error: '无效的API Key',
        code: 'INVALID_API_KEY'
      });
    }

    // 检查使用限制
    const usageCheck = await checkUsageLimits(keyInfo.keyId);
    if (!usageCheck.withinLimits) {
      return res.status(429).json({
        success: false,
        error: '已超出使用限制',
        code: 'RATE_LIMIT_EXCEEDED',
        reason: usageCheck.reason,
        limits: {
          hourly: {
            used: usageCheck.hourlyUsage,
            limit: usageCheck.hourlyLimit
          },
          daily: {
            used: usageCheck.dailyUsage,
            limit: usageCheck.dailyLimit
          }
        }
      });
    }

    // 存储API Key信息到请求对象
    req.apiKeyInfo = keyInfo;
    req.apiKeyUsage = usageCheck;
    req.requestStartTime = startTime;

    // 更新最后使用时间
    await updateLastUsed(keyInfo.keyId);

    // 继续到下一个中间件
    next();
  } catch (error) {
    console.error('API Key验证错误:', error);
    res.status(500).json({
      success: false,
      error: 'API Key验证失败',
      code: 'API_KEY_VALIDATION_FAILED'
    });
  }
}

/**
 * API使用日志记录中间件（在响应后执行）
 */
function logApiUsageMiddleware(req, res, next) {
  // 保存原始的 res.json 方法
  const originalJson = res.json;
  
  // 重写 res.json 方法以在响应后记录日志
  res.json = function(data) {
    // 调用原始方法发送响应
    const result = originalJson.call(this, data);
    
    // 异步记录使用日志
    if (req.apiKeyInfo) {
      const responseTime = Date.now() - req.requestStartTime;
      const endpoint = req.originalUrl;
      const method = req.method;
      const requestIp = req.ip || req.connection.remoteAddress || 'unknown';
      const userAgent = req.get('User-Agent') || 'unknown';
      const statusCode = res.statusCode;
      
      // 检查是否有错误
      let errorMessage = null;
      if (data && !data.success && data.error) {
        errorMessage = data.error;
      }
      
      // 异步记录日志，不阻塞响应
      setImmediate(async () => {
        try {
          await logApiUsage(
            req.apiKeyInfo.keyId,
            endpoint,
            method,
            requestIp,
            userAgent,
            statusCode,
            responseTime,
            errorMessage
          );
        } catch (error) {
          console.error('记录API使用日志失败:', error);
        }
      });
    }
    
    return result;
  };
  
  next();
}

/**
 * 增强的API响应中间件
 */
function enhanceApiResponse(req, res, next) {
  // 保存原始的 res.json 方法
  const originalJson = res.json;
  
  // 重写 res.json 方法以增强响应格式
  res.json = function(data) {
    // 如果是成功响应且有API Key信息，添加使用信息
    if (req.apiKeyInfo && data && data.success) {
      data.usage = {
        keyId: req.apiKeyInfo.keyId,
        requestsUsed: {
          hourly: req.apiKeyUsage?.hourlyUsage || 0,
          daily: req.apiKeyUsage?.dailyUsage || 0
        },
        requestsLimit: {
          hourly: req.apiKeyInfo.maxRequestsPerHour,
          daily: req.apiKeyInfo.maxRequestsPerDay
        },
        responseTime: req.requestStartTime ? Date.now() - req.requestStartTime : null
      };
    }
    
    // 添加时间戳
    data.timestamp = new Date().toISOString();
    
    return originalJson.call(this, data);
  };
  
  next();
}

/**
 * 创建带权限检查的API Key中间件
 * @param {Array} requiredPermissions - 需要的权限列表
 * @returns {Array} 中间件数组
 */
function apiKeyAuth(requiredPermissions = []) {
  return [
    validateApiKeyMiddleware,
    requirePermissions(requiredPermissions),
    logApiUsageMiddleware,
    enhanceApiResponse
  ];
}

module.exports = {
  validateApiKeyMiddleware,
  requirePermissions,
  logApiUsageMiddleware,
  enhanceApiResponse,
  apiKeyAuth
}; 