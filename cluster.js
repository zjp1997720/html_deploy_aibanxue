const cluster = require('cluster');
const os = require('os');
const path = require('path');
const dotenv = require('dotenv');

// 加载环境变量
dotenv.config();

// 主进程配置
const CLUSTER_CONFIG = {
  // 工作进程数量，默认为CPU核心数
  workers: process.env.CLUSTER_WORKERS ? parseInt(process.env.CLUSTER_WORKERS) : os.cpus().length,
  // 重启延迟（毫秒）
  restartDelay: process.env.CLUSTER_RESTART_DELAY ? parseInt(process.env.CLUSTER_RESTART_DELAY) : 1000,
  // 最大重启次数
  maxRestarts: process.env.CLUSTER_MAX_RESTARTS ? parseInt(process.env.CLUSTER_MAX_RESTARTS) : 5,
  // 重启时间窗口（毫秒）
  restartWindow: process.env.CLUSTER_RESTART_WINDOW ? parseInt(process.env.CLUSTER_RESTART_WINDOW) : 60000
};

// 工作进程重启计数
const workerRestarts = new Map();

if (cluster.isMaster) {
  // 主进程逻辑
  console.log(`🚀 启动集群模式，目标工作进程数: ${CLUSTER_CONFIG.workers}`);
  
  // 创建工作进程
  for (let i = 0; i < CLUSTER_CONFIG.workers; i++) {
    createWorker(i);
  }
  
  // 监听工作进程退出
  cluster.on('exit', (worker, code, signal) => {
    const workerId = worker.id;
    console.log(`❌ 工作进程 ${workerId} 退出，代码: ${code}, 信号: ${signal}`);
    
    // 记录重启次数
    const restartCount = workerRestarts.get(workerId) || 0;
    workerRestarts.set(workerId, restartCount + 1);
    
    // 检查是否超过最大重启次数
    if (restartCount + 1 > CLUSTER_CONFIG.maxRestarts) {
      console.error(`🚨 工作进程 ${workerId} 重启次数超过限制 (${CLUSTER_CONFIG.maxRestarts})，停止重启`);
      return;
    }
    
    // 延迟重启
    setTimeout(() => {
      console.log(`🔄 重启工作进程 ${workerId}...`);
      createWorker(workerId);
    }, CLUSTER_CONFIG.restartDelay);
  });
  
  // 监听工作进程在线
  cluster.on('online', (worker) => {
    console.log(`✅ 工作进程 ${worker.id} 在线`);
  });
  
  // 监听工作进程消息
  cluster.on('message', (worker, message) => {
    if (message.type === 'memory:warning') {
      console.warn(`⚠️  工作进程 ${worker.id} 内存使用过高: ${message.usage}%`);
    } else if (message.type === 'memory:critical') {
      console.error(`🚨 工作进程 ${worker.id} 内存使用危急: ${message.usage}%`);
    }
  });
  
  // 优雅关闭
  process.on('SIGTERM', gracefulShutdown);
  process.on('SIGINT', gracefulShutdown);
  
  function gracefulShutdown() {
    console.log('\n🛑 收到关闭信号，正在优雅关闭...');
    
    // 向所有工作进程发送关闭信号
    for (const id in cluster.workers) {
      cluster.workers[id].send({ type: 'shutdown' });
    }
    
    // 设置超时强制关闭
    setTimeout(() => {
      console.log('强制关闭所有工作进程');
      for (const id in cluster.workers) {
        cluster.workers[id].kill();
      }
      process.exit(0);
    }, 10000);
  }
  
} else {
  // 工作进程逻辑
  require('./app');
  
  // 内存监控
  const memoryMonitor = setInterval(() => {
    const used = process.memoryUsage();
    const total = os.totalmem();
    const percent = Math.round((used.rss / total) * 100);
    
    // 发送内存使用情况到主进程
    if (percent > 80) {
      process.send({ 
        type: percent > 90 ? 'memory:critical' : 'memory:warning',
        usage: percent
      });
    }
  }, 30000); // 每30秒检查一次
  
  // 监听主进程消息
  process.on('message', (message) => {
    if (message.type === 'shutdown') {
      console.log(`工作进程 ${cluster.worker.id} 收到关闭信号`);
      clearInterval(memoryMonitor);
      process.exit(0);
    }
  });
  
  // 清理
  process.on('exit', () => {
    clearInterval(memoryMonitor);
  });
}

function createWorker(id) {
  const worker = cluster.fork({ WORKER_ID: id });
  workerRestarts.set(id, 0);
  
  // 重置重启计数器
  setTimeout(() => {
    workerRestarts.delete(id);
  }, CLUSTER_CONFIG.restartWindow);
}

module.exports = { CLUSTER_CONFIG };