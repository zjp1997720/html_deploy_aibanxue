/**
 * 会话与认证相关的辅助函数
 * 提供在不稳定环境下的会话保存增强能力（带超时回退）
 */

/**
 * 在保存会话时增加超时回退，避免因底层存储挂起导致响应卡住。
 * 使用场景：登录成功后需要保存 session，但容器内会话目录权限异常可能导致回调迟迟不返回。
 *
 * @param {import('express').Request} req - Express 请求对象
 * @param {number} timeoutMs - 超时时间（毫秒），到期后将执行回退逻辑
 * @param {function} onSuccess - 成功或回退时触发的回调（一般用于重定向）
 * @param {function} [onError] - 保存失败时的错误回调（可选）
 */
function saveSessionWithTimeout(req, timeoutMs, onSuccess, onError) {
  let finished = false;

  // 定义完成函数，确保只执行一次
  const finishOnce = (fn) => {
    if (finished) return;
    finished = true;
    try {
      fn && fn();
    } catch (e) {
      console.error('saveSessionWithTimeout 执行回调时发生错误:', e);
    }
  };

  // 超时回退：记录警告并继续后续流程（例如重定向）
  const timer = setTimeout(() => {
    console.warn(`会话保存超过 ${timeoutMs}ms 未完成，执行回退逻辑（可能的权限或磁盘问题）。`);
    finishOnce(onSuccess);
  }, timeoutMs);

  try {
    req.session.save((err) => {
      clearTimeout(timer);
      if (err) {
        console.error('会话保存失败:', err);
        if (onError) {
          return finishOnce(() => onError(err));
        }
        // 无错误回调时，仍回退继续流程
        return finishOnce(onSuccess);
      }
      // 保存成功
      finishOnce(onSuccess);
    });
  } catch (e) {
    clearTimeout(timer);
    console.error('会话保存时抛出异常:', e);
    // 发生异常也回退继续流程
    finishOnce(onSuccess);
  }
}

module.exports = {
  saveSessionWithTimeout,
};

