module.exports = {
  apps: [{
    name: 'html-go',
    script: 'app.js',
    instances: 'max', // 根据CPU核心数自动设置实例数
    exec_mode: 'cluster',
    max_memory_restart: '1G',
    env: {
      NODE_ENV: 'development',
      PORT: 5678
    },
    env_production: {
      NODE_ENV: 'production',
      PORT: 8888
    },
    // 监控配置
    watch: false,
    ignore_watch: [
      'node_modules',
      'logs',
      'sessions',
      'db',
      'coverage'
    ],
    // 日志配置
    log_file: 'logs/combined.log',
    out_file: 'logs/out.log',
    error_file: 'logs/error.log',
    log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
    // 自动重启配置
    max_restarts: 10,
    min_uptime: '10s',
    // 增量重启（避免所有实例同时重启）
    increment_var: 'NODE_APP_INSTANCE',
    // 健康检查
    health_check: {
      uri: 'http://localhost:8888/version',
      interval: 30000,
      timeout: 5000,
      max_restarts: 3
    },
    // 性能优化
    node_args: '--max-old-space-size=1024',
    // 时间限制
    kill_timeout: 5000,
    // 环境变量文件
    env_file: '.env'
  }]
};