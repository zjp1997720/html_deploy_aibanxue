/**
 * 认证中间件
 * 用于保护需要登录才能访问的路由
 */

/**
 * 检查用户是否已认证
 * 如果未认证，重定向到登录页面
 */
function isAuthenticated(req, res, next) {
  // 如果认证功能未启用，直接通过
  if (!req.app.locals.config.authEnabled) {
    return next();
  }
  
  // 检查会话中是否有认证标记
  if (req.session && req.session.isAuthenticated) {
    return next();
  }
  
  // 未认证，重定向到登录页面
  res.redirect('/login');
}

module.exports = {
  isAuthenticated
};
