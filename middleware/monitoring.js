const responseTime = require('response-time');
const alertManager = require('../utils/alertManager');

// 监控数据存储
const monitoringData = {
  requests: {
    total: 0,
    success: 0,
    error: 0,
    rateLimited: 0
  },
  responseTime: {
    min: Infinity,
    max: 0,
    total: 0,
    count: 0
  },
  statusCodes: {},
  endpoints: {},
  memory: {
    used: [],
    timestamp: []
  },
  uptime: Date.now()
};

// 获取系统信息
function getSystemInfo() {
  const memUsage = process.memoryUsage();
  const cpuUsage = process.cpuUsage();
  
  return {
    memory: {
      rss: formatBytes(memUsage.rss),
      heapTotal: formatBytes(memUsage.heapTotal),
      heapUsed: formatBytes(memUsage.heapUsed),
      external: formatBytes(memUsage.external),
      percentage: Math.round((memUsage.rss / require('os').totalmem()) * 100)
    },
    cpu: {
      user: cpuUsage.user,
      system: cpuUsage.system
    },
    uptime: Math.round((Date.now() - monitoringData.uptime) / 1000),
    nodeVersion: process.version,
    platform: process.platform,
    arch: process.arch
  };
}

// 格式化字节数
function formatBytes(bytes) {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

// 监控中间件
function monitoringMiddleware(req, res, next) {
  const startTime = Date.now();
  
  // 监控响应时间
  res.on('finish', () => {
    const responseTime = Date.now() - startTime;
    const statusCode = res.statusCode;
    const endpoint = req.route ? req.route.path : req.path;
    
    // 更新请求统计
    monitoringData.requests.total++;
    
    if (statusCode >= 200 && statusCode < 400) {
      monitoringData.requests.success++;
    } else if (statusCode === 429) {
      monitoringData.requests.rateLimited++;
    } else if (statusCode >= 400) {
      monitoringData.requests.error++;
    }
    
    // 更新状态码统计
    monitoringData.statusCodes[statusCode] = (monitoringData.statusCodes[statusCode] || 0) + 1;
    
    // 更新端点统计
    if (!monitoringData.endpoints[endpoint]) {
      monitoringData.endpoints[endpoint] = {
        count: 0,
        responseTime: { min: Infinity, max: 0, total: 0 }
      };
    }
    monitoringData.endpoints[endpoint].count++;
    
    // 更新响应时间统计
    monitoringData.responseTime.min = Math.min(monitoringData.responseTime.min, responseTime);
    monitoringData.responseTime.max = Math.max(monitoringData.responseTime.max, responseTime);
    monitoringData.responseTime.total += responseTime;
    monitoringData.responseTime.count++;
    
    // 更新端点响应时间
    const ep = monitoringData.endpoints[endpoint];
    ep.responseTime.min = Math.min(ep.responseTime.min, responseTime);
    ep.responseTime.max = Math.max(ep.responseTime.max, responseTime);
    ep.responseTime.total += responseTime;
    
    // 检查异常情况
    if (responseTime > 5000) {
      console.warn(`⚠️  慢请求检测: ${req.method} ${endpoint} - ${responseTime}ms`);
    }
    
    if (statusCode >= 500) {
      console.error(`🚨 服务器错误: ${req.method} ${endpoint} - ${statusCode}`);
    }
  });
  
  next();
}

// 获取监控统计
function getStats() {
  const stats = {
    ...getSystemInfo(),
    requests: { ...monitoringData.requests },
    responseTime: {
      min: monitoringData.responseTime.min === Infinity ? 0 : monitoringData.responseTime.min,
      max: monitoringData.responseTime.max,
      avg: monitoringData.responseTime.count > 0 
        ? Math.round(monitoringData.responseTime.total / monitoringData.responseTime.count)
        : 0
    },
    statusCodes: { ...monitoringData.statusCodes },
    topEndpoints: Object.entries(monitoringData.endpoints)
      .sort((a, b) => b[1].count - a[1].count)
      .slice(0, 10)
      .map(([path, data]) => ({
        path,
        count: data.count,
        avgResponseTime: Math.round(data.responseTime.total / data.count)
      }))
  };
  
  // 检查告警规则
  alertManager.check(stats);
  
  return stats;
}

// 重置统计数据
function resetStats() {
  monitoringData.requests = {
    total: 0,
    success: 0,
    error: 0,
    rateLimited: 0
  };
  monitoringData.responseTime = {
    min: Infinity,
    max: 0,
    total: 0,
    count: 0
  };
  monitoringData.statusCodes = {};
  monitoringData.endpoints = {};
}

// 健康检查端点
function healthCheck(req, res) {
  const stats = getStats();
  const isHealthy = stats.memory.percentage < 90 && stats.responseTime.avg < 1000;
  
  res.status(isHealthy ? 200 : 503).json({
    status: isHealthy ? 'healthy' : 'degraded',
    timestamp: new Date().toISOString(),
    uptime: stats.uptime,
    memory: stats.memory,
    responseTime: stats.responseTime.avg,
    checks: {
      memory: stats.memory.percentage < 90 ? 'pass' : 'fail',
      responseTime: stats.responseTime.avg < 1000 ? 'pass' : 'fail'
    }
  });
}

// Prometheus 格式的指标
function getPrometheusMetrics() {
  const stats = getStats();
  const metrics = [];
  
  // 请求计数
  metrics.push(`# HELP http_requests_total Total HTTP requests`);
  metrics.push(`# TYPE http_requests_total counter`);
  metrics.push(`http_requests_total{status="success"} ${stats.requests.success}`);
  metrics.push(`http_requests_total{status="error"} ${stats.requests.error}`);
  metrics.push(`http_requests_total{status="rate_limited"} ${stats.requests.rateLimited}`);
  
  // 响应时间
  metrics.push(`# HELP http_response_time_seconds HTTP response time`);
  metrics.push(`# TYPE http_response_time_seconds histogram`);
  metrics.push(`http_response_time_seconds_bucket{le="0.1"} 0`);
  metrics.push(`http_response_time_seconds_bucket{le="0.5"} 0`);
  metrics.push(`http_response_time_seconds_bucket{le="1"} 0`);
  metrics.push(`http_response_time_seconds_bucket{le="5"} ${stats.responseTime.max > 5000 ? 1 : 0}`);
  metrics.push(`http_response_time_seconds_bucket{le="+Inf"} 1`);
  metrics.push(`http_response_time_seconds_sum ${stats.responseTime.total / 1000}`);
  metrics.push(`http_response_time_seconds_count ${stats.responseTime.count}`);
  
  // 内存使用
  metrics.push(`# HELP node_memory_usage_bytes Node.js memory usage`);
  metrics.push(`# TYPE node_memory_usage_bytes gauge`);
  metrics.push(`node_memory_usage_bytes{type="rss"} ${process.memoryUsage().rss}`);
  metrics.push(`node_memory_usage_bytes{type="heap_used"} ${process.memoryUsage().heapUsed}`);
  metrics.push(`node_memory_usage_bytes{type="heap_total"} ${process.memoryUsage().heapTotal}`);
  
  // 状态码
  Object.entries(stats.statusCodes).forEach(([code, count]) => {
    metrics.push(`# HELP http_response_status_codes HTTP response status codes`);
    metrics.push(`# TYPE http_response_status_codes counter`);
    metrics.push(`http_response_status_codes{code="${code}"} ${count}`);
  });
  
  return metrics.join('\n');
}

module.exports = {
  monitoringMiddleware,
  getStats,
  resetStats,
  healthCheck,
  getPrometheusMetrics
};