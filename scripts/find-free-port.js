/**
 * 查找可用端口并启动应用
 */

const net = require('net');
const { spawn } = require('child_process');
const path = require('path');

// 尝试端口范围
const MIN_PORT = 8000;
const MAX_PORT = 9000;

// 检查端口是否可用
function isPortAvailable(port) {
  return new Promise((resolve) => {
    const server = net.createServer();
    
    server.once('error', () => {
      resolve(false); // 端口被占用
    });
    
    server.once('listening', () => {
      // 关闭服务器并返回端口可用
      server.close(() => {
        resolve(true);
      });
    });
    
    server.listen(port);
  });
}

// 查找可用端口
async function findAvailablePort() {
  for (let port = MIN_PORT; port <= MAX_PORT; port++) {
    const available = await isPortAvailable(port);
    if (available) {
      return port;
    }
  }
  
  throw new Error('无法找到可用端口');
}

// 主函数
async function main() {
  try {
    const port = await findAvailablePort();
    console.log(`找到可用端口: ${port}`);
    
    // 设置环境变量
    process.env.PORT = port;
    
    // 启动应用
    const appPath = path.join(__dirname, '../app.js');
    const app = spawn('node', [appPath], {
      stdio: 'inherit',
      env: process.env
    });
    
    app.on('error', (err) => {
      console.error('启动应用错误:', err);
      process.exit(1);
    });
    
    // 处理进程退出
    process.on('SIGINT', () => {
      app.kill('SIGINT');
    });
    
    process.on('SIGTERM', () => {
      app.kill('SIGTERM');
    });
    
  } catch (error) {
    console.error('错误:', error.message);
    process.exit(1);
  }
}

// 运行主函数
main();
