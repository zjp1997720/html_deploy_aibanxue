/**
 * 认证中间件
 * 用于保护需要登录才能访问的路由
 */

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

  // 方式二：检查 API Token
  const authHeader = req.headers['authorization'];
  if (apiToken && authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.substring(7); // 提取 "Bearer " 后面的 token
    if (token === apiToken) {
      return next(); // Token 验证成功
    }
  }

  // 如果两种认证都失败，对于API请求返回401，对于网页请求重定向
  if (req.path.startsWith('/api/')) {
    return res.status(401).json({ success: false, error: 'Unauthorized: Invalid API Token' });
  } else {
    return res.redirect('/login');
  }
}

module.exports = {
  isAuthenticated
};
