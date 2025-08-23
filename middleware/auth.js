/**
 * 认证中间件
 * 用于保护需要登录才能访问的路由
 * 支持传统认证、旧版API Token和新版API Key认证
 */

const { validateApiKey, updateLastUsed, logApiUsage } = require('../models/apiKeys');

/**
 * 检查用户是否已认证
 * 如果未认证，重定向到登录页面
 */
function isAuthenticated(req, res, next) {
  const { authEnabled, apiToken } = req.app.locals.config;

  // 如果认证功能未启用，直接通过
  if (!authEnabled) {
    return next();
  }

  // 方式一：检查网页端 session 和 cookie
  if (req.session && req.session.isAuthenticated) {
    return next();
  }
  if (req.cookies && req.cookies.auth === 'true') {
    req.session.isAuthenticated = true;
    return next();
  }

  // 方式二：检查旧版 API Token（向后兼容）
  const authHeader = req.headers['authorization'];
  if (apiToken && authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.substring(7); // 提取 "Bearer " 后面的 token
    if (token === apiToken) {
      return next(); // 旧版Token 验证成功
    }
  }

  // 如果两种认证都失败，对于API请求返回401，对于网页请求重定向
  if (req.path.startsWith('/api/')) {
    return res.status(401).json({ success: false, error: 'Unauthorized: Invalid API Token or API Key' });
  } else {
    return res.redirect('/login');
  }
}

/**
 * 支持多种认证方式的中间件
 * 支持：Web会话、旧版API Token、新版API Key
 */
function isAuthenticatedOrApiKey(req, res, next) {
  const { authEnabled, apiToken } = req.app.locals.config;

  // 如果认证功能未启用，直接通过
  if (!authEnabled) {
    return next();
  }

  // 方式一：检查网页端 session 和 cookie
  if (req.session && req.session.isAuthenticated) {
    return next();
  }
  if (req.cookies && req.cookies.auth === 'true') {
    req.session.isAuthenticated = true;
    return next();
  }

  // 方式二：检查Authorization header
  const authHeader = req.headers['authorization'];
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.substring(7);
    
    // 检查是否是旧版API Token
    if (apiToken && token === apiToken) {
      return next();
    }
    
    // 检查是否是新版API Key
    if (token.startsWith('hg_')) {
      return validateApiKeyAsync(token, req, res, next);
    }
  }

  // 如果所有认证都失败
  if (req.path.startsWith('/api/')) {
    return res.status(401).json({ 
      success: false, 
      error: 'Unauthorized: Please provide valid API Token or API Key' 
    });
  } else {
    return res.redirect('/login');
  }
}

/**
 * 异步验证API Key
 */
async function validateApiKeyAsync(apiKey, req, res, next) {
  try {
    const keyInfo = await validateApiKey(apiKey);
    if (keyInfo) {
      // 将API Key信息附加到request对象
      req.apiKey = keyInfo;
      
      // 更新最后使用时间（异步，不阻塞请求）
      updateLastUsed(keyInfo.keyId).catch(err => {
        console.error('更新API Key使用时间失败:', err);
      });
      
      return next();
    } else {
      return res.status(401).json({ 
        success: false, 
        error: 'Unauthorized: Invalid API Key' 
      });
    }
  } catch (error) {
    console.error('API Key验证错误:', error);
    return res.status(500).json({ 
      success: false, 
      error: 'Internal server error during authentication' 
    });
  }
}

module.exports = {
  isAuthenticated,
  isAuthenticatedOrApiKey
};
