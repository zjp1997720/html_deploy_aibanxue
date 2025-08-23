const { run, query } = require('../models/db');

// 性能监控配置
const MONITOR_CONFIG = {
  // 慢查询阈值（毫秒）
  SLOW_QUERY_THRESHOLD: 1000,
  // 非常慢的查询阈值（毫秒）
  VERY_SLOW_THRESHOLD: 3000,
  // 数据保留时间（天）
  DATA_RETENTION_DAYS: 30,
  // 是否记录所有请求
  LOG_ALL_REQUESTS: process.env.NODE_ENV !== 'production',
  // 性能警告阈值
  WARNING_THRESHOLDS: {
    response_time: 2000,    // 响应时间超过2秒
    memory_usage: 100,      // 内存使用超过100MB
    error_rate: 0.05        // 错误率超过5%
  }
};

// 内存中的性能统计缓存
let performanceCache = {
  requests: 0,
  totalTime: 0,
  slowRequests: 0,
  errors: 0,
  lastReset: Date.now(),
  endpoints: {}
};

/**
 * 响应时间监控中间件
 */
function responseTimeMonitor(req, res, next) {
  const startTime = Date.now();
  const startMemory = process.memoryUsage();

  // 获取原始的 res.end 方法
  const originalEnd = res.end;

  // 重写 res.end 方法来记录响应时间
  res.end = function(chunk, encoding) {
    const endTime = Date.now();
    const responseTime = endTime - startTime;
    const endMemory = process.memoryUsage();
    
    // 记录性能数据
    recordPerformanceData(req, res, {
      responseTime,
      startTime,
      endTime,
      memoryUsage: {
        start: startMemory,
        end: endMemory,
        delta: endMemory.heapUsed - startMemory.heapUsed
      }
    });

    // 调用原始的 end 方法
    originalEnd.call(this, chunk, encoding);
  };

  next();
}

/**
 * 记录性能数据
 */
function recordPerformanceData(req, res, metrics) {
  const {
    responseTime,
    startTime,
    endTime,
    memoryUsage
  } = metrics;

  const endpoint = `${req.method} ${req.route ? req.route.path : req.path}`;
  const statusCode = res.statusCode;
  const isError = statusCode >= 400;
  const isSlowRequest = responseTime > MONITOR_CONFIG.SLOW_QUERY_THRESHOLD;

  // 更新内存缓存
  updatePerformanceCache(endpoint, responseTime, isError, isSlowRequest);

  // 记录到数据库（异步，不阻塞响应）
  if (MONITOR_CONFIG.LOG_ALL_REQUESTS || isSlowRequest || isError) {
    setImmediate(() => {
      logPerformanceToDatabase({
        endpoint,
        method: req.method,
        path: req.path,
        status_code: statusCode,
        response_time: responseTime,
        memory_delta: memoryUsage.delta,
        user_agent: req.get('User-Agent') || '',
        ip_address: req.ip || req.connection.remoteAddress,
        timestamp: startTime,
        is_slow: isSlowRequest,
        is_error: isError,
        query_params: JSON.stringify(req.query),
        body_size: req.get('Content-Length') || 0
      });
    });
  }

  // 性能警告检查
  checkPerformanceWarnings(endpoint, responseTime, memoryUsage.delta, isError);

  // 在开发环境输出性能日志
  if (process.env.NODE_ENV !== 'production') {
    logPerformanceToConsole(endpoint, responseTime, statusCode, isSlowRequest);
  }
}

/**
 * 更新内存中的性能缓存
 */
function updatePerformanceCache(endpoint, responseTime, isError, isSlowRequest) {
  performanceCache.requests++;
  performanceCache.totalTime += responseTime;
  
  if (isError) {
    performanceCache.errors++;
  }
  
  if (isSlowRequest) {
    performanceCache.slowRequests++;
  }

  // 更新端点统计
  if (!performanceCache.endpoints[endpoint]) {
    performanceCache.endpoints[endpoint] = {
      requests: 0,
      totalTime: 0,
      errors: 0,
      slowRequests: 0,
      minTime: Infinity,
      maxTime: 0
    };
  }

  const endpointStats = performanceCache.endpoints[endpoint];
  endpointStats.requests++;
  endpointStats.totalTime += responseTime;
  endpointStats.minTime = Math.min(endpointStats.minTime, responseTime);
  endpointStats.maxTime = Math.max(endpointStats.maxTime, responseTime);
  
  if (isError) endpointStats.errors++;
  if (isSlowRequest) endpointStats.slowRequests++;
}

/**
 * 记录性能数据到数据库
 */
async function logPerformanceToDatabase(data) {
  try {
    const sql = `
      INSERT INTO performance_logs (
        endpoint, method, path, status_code, response_time, memory_delta,
        user_agent, ip_address, timestamp, is_slow, is_error, 
        query_params, body_size, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;
    
    await run(sql, [
      data.endpoint,
      data.method,
      data.path,
      data.status_code,
      data.response_time,
      data.memory_delta,
      data.user_agent,
      data.ip_address,
      data.timestamp,
      data.is_slow ? 1 : 0,
      data.is_error ? 1 : 0,
      data.query_params,
      data.body_size,
      Date.now()
    ]);
  } catch (error) {
    // 静默失败，不影响主要功能
    console.error('记录性能日志失败:', error.message);
  }
}

/**
 * 检查性能警告
 */
function checkPerformanceWarnings(endpoint, responseTime, memoryDelta, isError) {
  const warnings = [];

  // 响应时间警告
  if (responseTime > MONITOR_CONFIG.WARNING_THRESHOLDS.response_time) {
    warnings.push(`慢响应: ${endpoint} 耗时 ${responseTime}ms`);
  }

  // 内存使用警告
  if (memoryDelta > MONITOR_CONFIG.WARNING_THRESHOLDS.memory_usage * 1024 * 1024) {
    warnings.push(`高内存使用: ${endpoint} 增加 ${Math.round(memoryDelta / 1024 / 1024)}MB`);
  }

  // 错误率警告（每100个请求检查一次）
  if (performanceCache.requests % 100 === 0) {
    const errorRate = performanceCache.errors / performanceCache.requests;
    if (errorRate > MONITOR_CONFIG.WARNING_THRESHOLDS.error_rate) {
      warnings.push(`高错误率: ${Math.round(errorRate * 100)}%`);
    }
  }

  // 输出警告
  if (warnings.length > 0) {
    console.warn('⚠️  性能警告:', warnings.join(', '));
  }
}

/**
 * 控制台性能日志
 */
function logPerformanceToConsole(endpoint, responseTime, statusCode, isSlowRequest) {
  const color = isSlowRequest ? '\x1b[31m' : statusCode >= 400 ? '\x1b[33m' : '\x1b[32m';
  const reset = '\x1b[0m';
  const slowFlag = isSlowRequest ? ' [SLOW]' : '';
  
  console.log(`${color}${endpoint} ${statusCode} ${responseTime}ms${slowFlag}${reset}`);
}

/**
 * 获取性能统计数据
 */
function getPerformanceStats() {
  const uptime = Date.now() - performanceCache.lastReset;
  const avgResponseTime = performanceCache.requests > 0 
    ? Math.round(performanceCache.totalTime / performanceCache.requests) 
    : 0;
  const errorRate = performanceCache.requests > 0 
    ? (performanceCache.errors / performanceCache.requests) * 100 
    : 0;

  return {
    uptime,
    totalRequests: performanceCache.requests,
    averageResponseTime: avgResponseTime,
    slowRequests: performanceCache.slowRequests,
    errors: performanceCache.errors,
    errorRate: Math.round(errorRate * 100) / 100,
    memoryUsage: process.memoryUsage(),
    endpoints: Object.keys(performanceCache.endpoints).map(endpoint => ({
      endpoint,
      ...performanceCache.endpoints[endpoint],
      avgTime: Math.round(performanceCache.endpoints[endpoint].totalTime / performanceCache.endpoints[endpoint].requests)
    })).sort((a, b) => b.avgTime - a.avgTime)
  };
}

/**
 * 获取详细的性能报告
 */
async function getDetailedPerformanceReport(hours = 24) {
  try {
    const since = Date.now() - (hours * 60 * 60 * 1000);
    
    const sql = `
      SELECT 
        endpoint,
        COUNT(*) as requests,
        AVG(response_time) as avg_time,
        MIN(response_time) as min_time,
        MAX(response_time) as max_time,
        SUM(CASE WHEN is_slow = 1 THEN 1 ELSE 0 END) as slow_requests,
        SUM(CASE WHEN is_error = 1 THEN 1 ELSE 0 END) as errors,
        AVG(memory_delta) as avg_memory_delta
      FROM performance_logs 
      WHERE created_at > ? 
      GROUP BY endpoint
      ORDER BY avg_time DESC
    `;
    
    const endpointStats = await query(sql, [since]);
    
    // 总体统计
    const totalStatsSql = `
      SELECT 
        COUNT(*) as total_requests,
        AVG(response_time) as avg_response_time,
        SUM(CASE WHEN is_slow = 1 THEN 1 ELSE 0 END) as total_slow,
        SUM(CASE WHEN is_error = 1 THEN 1 ELSE 0 END) as total_errors
      FROM performance_logs 
      WHERE created_at > ?
    `;
    
    const totalStats = await query(totalStatsSql, [since]);
    
    return {
      period: `最近 ${hours} 小时`,
      summary: totalStats[0] || {},
      endpoints: endpointStats,
      generatedAt: new Date().toISOString()
    };
  } catch (error) {
    console.error('获取性能报告失败:', error.message);
    return null;
  }
}

/**
 * 清理旧的性能日志
 */
async function cleanupOldLogs() {
  try {
    const cutoff = Date.now() - (MONITOR_CONFIG.DATA_RETENTION_DAYS * 24 * 60 * 60 * 1000);
    const result = await run('DELETE FROM performance_logs WHERE created_at < ?', [cutoff]);
    
    if (result.changes > 0) {
      console.log(`清理了 ${result.changes} 条过期的性能日志记录`);
    }
  } catch (error) {
    console.error('清理性能日志失败:', error.message);
  }
}

/**
 * 重置性能缓存
 */
function resetPerformanceCache() {
  performanceCache = {
    requests: 0,
    totalTime: 0,
    slowRequests: 0,
    errors: 0,
    lastReset: Date.now(),
    endpoints: {}
  };
}

module.exports = {
  responseTimeMonitor,
  getPerformanceStats,
  getDetailedPerformanceReport,
  cleanupOldLogs,
  resetPerformanceCache,
  MONITOR_CONFIG
}; 