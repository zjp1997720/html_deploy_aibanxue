/**
 * 认证中间件
 * 用于保护需要登录才能访问的路由
 */

/**
 * 检查用户是否已认证
 * 如果未认证，重定向到登录页面
 */
function isAuthenticated(req, res, next) {
  console.log('认证检查:');
  console.log('- 请求路径:', req.path);
  console.log('- 会话 ID:', req.session?.id);
  console.log('- 认证状态:', req.session?.isAuthenticated);
  console.log('- 认证功能启用:', req.app.locals.config.authEnabled);

  // 如果认证功能未启用，直接通过
  if (!req.app.locals.config.authEnabled) {
    console.log('- 认证功能未启用，直接通过');
    return next();
  }

  // 检查会话中是否有认证标记
  if (req.session && req.session.isAuthenticated) {
    console.log('- 已认证，允许访问');
    return next();
  }

  // 未认证，重定向到登录页面
  console.log('- 未认证，重定向到登录页面');
  res.redirect('/login');
}

module.exports = {
  isAuthenticated
};
