const { performance } = require('perf_hooks');

// 内存优化配置
const MEMORY_CONFIG = {
  // 内存警告阈值（MB）
  WARNING_THRESHOLD: 100,
  // 内存紧急阈值（MB）
  CRITICAL_THRESHOLD: 200,
  // 强制垃圾回收阈值（MB）
  GC_THRESHOLD: 150,
  // 内存监控间隔（毫秒）
  MONITOR_INTERVAL: 30000,
  // 保留的内存快照数量
  SNAPSHOT_RETENTION: 20
};

// 内存使用历史记录
let memoryHistory = [];
let memoryMonitorInterval = null;
let isMonitoring = false;

// 内存基线（应用启动时的内存使用）
let memoryBaseline = null;

/**
 * 获取格式化的内存使用情况
 */
function getMemoryUsage() {
  const usage = process.memoryUsage();
  return {
    rss: Math.round(usage.rss / 1024 / 1024 * 100) / 100,           // 常驻集大小（MB）
    heapTotal: Math.round(usage.heapTotal / 1024 / 1024 * 100) / 100, // 堆总大小（MB）
    heapUsed: Math.round(usage.heapUsed / 1024 / 1024 * 100) / 100,   // 堆使用大小（MB）
    external: Math.round(usage.external / 1024 / 1024 * 100) / 100,   // 外部内存（MB）
    arrayBuffers: Math.round(usage.arrayBuffers / 1024 / 1024 * 100) / 100 // ArrayBuffer（MB）
  };
}

/**
 * 获取详细的内存统计信息
 */
function getDetailedMemoryStats() {
  const usage = getMemoryUsage();
  const uptime = process.uptime();
  
  // 计算内存使用趋势
  const trend = calculateMemoryTrend();
  
  // 检查内存状态
  const status = getMemoryStatus(usage);
  
  return {
    current: usage,
    baseline: memoryBaseline,
    trend,
    status,
    uptime: Math.round(uptime),
    pid: process.pid,
    platform: process.platform,
    nodeVersion: process.version,
    timestamps: {
      current: Date.now(),
      baseline: memoryBaseline ? memoryBaseline.timestamp : null
    }
  };
}

/**
 * 计算内存使用趋势
 */
function calculateMemoryTrend() {
  if (memoryHistory.length < 2) {
    return { direction: 'stable', rate: 0, confidence: 'low' };
  }
  
  const recent = memoryHistory.slice(-5); // 最近5个记录
  const older = memoryHistory.slice(-10, -5); // 更早的5个记录
  
  if (older.length === 0) {
    return { direction: 'stable', rate: 0, confidence: 'low' };
  }
  
  const recentAvg = recent.reduce((sum, record) => sum + record.heapUsed, 0) / recent.length;
  const olderAvg = older.reduce((sum, record) => sum + record.heapUsed, 0) / older.length;
  
  const rate = ((recentAvg - olderAvg) / olderAvg) * 100; // 变化率百分比
  
  let direction = 'stable';
  let confidence = 'high';
  
  if (Math.abs(rate) < 2) {
    direction = 'stable';
  } else if (rate > 0) {
    direction = 'increasing';
  } else {
    direction = 'decreasing';
  }
  
  if (memoryHistory.length < 10) {
    confidence = 'medium';
  }
  
  return {
    direction,
    rate: Math.round(rate * 100) / 100,
    confidence
  };
}

/**
 * 获取内存状态
 */
function getMemoryStatus(usage) {
  const heapUsed = usage.heapUsed;
  
  if (heapUsed > MEMORY_CONFIG.CRITICAL_THRESHOLD) {
    return {
      level: 'critical',
      message: `内存使用达到危险水平: ${heapUsed}MB`,
      recommendation: '立即执行垃圾回收并检查内存泄漏'
    };
  } else if (heapUsed > MEMORY_CONFIG.WARNING_THRESHOLD) {
    return {
      level: 'warning',
      message: `内存使用较高: ${heapUsed}MB`,
      recommendation: '监控内存使用趋势，考虑优化代码'
    };
  } else {
    return {
      level: 'normal',
      message: `内存使用正常: ${heapUsed}MB`,
      recommendation: '继续监控'
    };
  }
}

/**
 * 强制执行垃圾回收
 */
function forceGarbageCollection() {
  try {
    if (global.gc) {
      const beforeGC = getMemoryUsage();
      const startTime = performance.now();
      
      global.gc();
      
      const afterGC = getMemoryUsage();
      const gcTime = performance.now() - startTime;
      
      const freed = beforeGC.heapUsed - afterGC.heapUsed;
      
      console.log(`🧹 垃圾回收完成: 释放 ${freed.toFixed(2)}MB 内存，耗时 ${gcTime.toFixed(2)}ms`);
      
      return {
        success: true,
        before: beforeGC,
        after: afterGC,
        freed: freed,
        gcTime: gcTime
      };
    } else {
      console.warn('⚠️  垃圾回收不可用，请使用 --expose-gc 启动Node.js');
      return {
        success: false,
        error: '垃圾回收不可用'
      };
    }
  } catch (error) {
    console.error('❌ 垃圾回收失败:', error.message);
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * 智能内存管理
 */
function intelligentMemoryManagement() {
  const usage = getMemoryUsage();
  const actions = [];
  
  // 检查是否需要垃圾回收
  if (usage.heapUsed > MEMORY_CONFIG.GC_THRESHOLD) {
    const gcResult = forceGarbageCollection();
    actions.push({
      action: 'garbage_collection',
      reason: `堆内存使用超过阈值 ${MEMORY_CONFIG.GC_THRESHOLD}MB`,
      result: gcResult
    });
  }
  
  // 检查是否有内存泄漏的迹象
  const trend = calculateMemoryTrend();
  if (trend.direction === 'increasing' && trend.rate > 10) {
    actions.push({
      action: 'leak_warning',
      reason: `内存使用增长率: ${trend.rate}%`,
      recommendation: '检查可能的内存泄漏'
    });
  }
  
  // 检查外部内存使用
  if (usage.external > 50) {
    actions.push({
      action: 'external_memory_warning',
      reason: `外部内存使用: ${usage.external}MB`,
      recommendation: '检查文件句柄和外部资源'
    });
  }
  
  return {
    timestamp: Date.now(),
    memoryUsage: usage,
    actionsPerformed: actions
  };
}

/**
 * 启动内存监控
 */
function startMemoryMonitoring() {
  if (isMonitoring) {
    console.log('⚠️  内存监控已在运行');
    return;
  }
  
  // 设置基线
  if (!memoryBaseline) {
    memoryBaseline = {
      ...getMemoryUsage(),
      timestamp: Date.now()
    };
    console.log('📊 设置内存基线:', memoryBaseline);
  }
  
  isMonitoring = true;
  
  memoryMonitorInterval = setInterval(() => {
    const usage = getMemoryUsage();
    const timestamp = Date.now();
    
    // 添加到历史记录
    memoryHistory.push({
      ...usage,
      timestamp
    });
    
    // 保持历史记录数量在限制内
    if (memoryHistory.length > MEMORY_CONFIG.SNAPSHOT_RETENTION) {
      memoryHistory = memoryHistory.slice(-MEMORY_CONFIG.SNAPSHOT_RETENTION);
    }
    
    // 检查内存状态
    const status = getMemoryStatus(usage);
    
    // 如果内存使用异常，输出警告
    if (status.level !== 'normal') {
      console.warn(`⚠️  ${status.message}`);
    }
    
    // 执行智能内存管理
    const managementResult = intelligentMemoryManagement();
    
    // 如果有执行的操作，记录日志
    if (managementResult.actionsPerformed.length > 0) {
      console.log('🔧 执行内存管理操作:', managementResult.actionsPerformed.length, '个');
    }
    
  }, MEMORY_CONFIG.MONITOR_INTERVAL);
  
  console.log(`✅ 内存监控已启动，监控间隔: ${MEMORY_CONFIG.MONITOR_INTERVAL/1000}秒`);
}

/**
 * 停止内存监控
 */
function stopMemoryMonitoring() {
  if (memoryMonitorInterval) {
    clearInterval(memoryMonitorInterval);
    memoryMonitorInterval = null;
    isMonitoring = false;
    console.log('🛑 内存监控已停止');
  }
}

/**
 * 生成内存使用报告
 */
function generateMemoryReport() {
  const stats = getDetailedMemoryStats();
  const history = memoryHistory.slice(-10); // 最近10个记录
  
  // 计算统计数据
  const maxMemory = Math.max(...history.map(h => h.heapUsed));
  const minMemory = Math.min(...history.map(h => h.heapUsed));
  const avgMemory = history.reduce((sum, h) => sum + h.heapUsed, 0) / history.length;
  
  return {
    summary: {
      current: stats.current,
      baseline: stats.baseline,
      status: stats.status,
      trend: stats.trend
    },
    statistics: {
      max: Math.round(maxMemory * 100) / 100,
      min: Math.round(minMemory * 100) / 100,
      average: Math.round(avgMemory * 100) / 100,
      samples: history.length
    },
    history: history,
    recommendations: generateRecommendations(stats),
    generatedAt: new Date().toISOString()
  };
}

/**
 * 生成优化建议
 */
function generateRecommendations(stats) {
  const recommendations = [];
  
  // 基于当前状态的建议
  if (stats.status.level === 'critical') {
    recommendations.push({
      priority: 'high',
      category: 'immediate',
      message: '立即检查内存泄漏和大对象引用'
    });
  }
  
  // 基于趋势的建议
  if (stats.trend.direction === 'increasing' && stats.trend.rate > 5) {
    recommendations.push({
      priority: 'medium',
      category: 'monitoring',
      message: '内存使用持续增长，建议增加监控频率'
    });
  }
  
  // 基于基线的建议
  if (stats.baseline && stats.current.heapUsed > stats.baseline.heapUsed * 2) {
    recommendations.push({
      priority: 'medium',
      category: 'optimization',
      message: '内存使用比基线增长超过100%，建议代码优化'
    });
  }
  
  // 如果没有启用垃圾回收
  if (!global.gc) {
    recommendations.push({
      priority: 'low',
      category: 'configuration',
      message: '建议使用 --expose-gc 启动以启用手动垃圾回收'
    });
  }
  
  return recommendations;
}

/**
 * 内存泄漏检测
 */
function detectMemoryLeaks() {
  if (memoryHistory.length < 5) {
    return {
      detected: false,
      reason: '数据不足，需要更多历史记录'
    };
  }
  
  const recent = memoryHistory.slice(-5);
  const isIncreasing = recent.every((current, index) => {
    if (index === 0) return true;
    return current.heapUsed >= recent[index - 1].heapUsed;
  });
  
  if (isIncreasing) {
    const growth = recent[recent.length - 1].heapUsed - recent[0].heapUsed;
    const growthRate = (growth / recent[0].heapUsed) * 100;
    
    if (growthRate > 20) { // 增长超过20%
      return {
        detected: true,
        confidence: 'high',
        growth: growth,
        growthRate: growthRate,
        recommendation: '可能存在内存泄漏，建议详细分析'
      };
    }
  }
  
  return {
    detected: false,
    reason: '未检测到明显的内存泄漏迹象'
  };
}

module.exports = {
  getMemoryUsage,
  getDetailedMemoryStats,
  forceGarbageCollection,
  intelligentMemoryManagement,
  startMemoryMonitoring,
  stopMemoryMonitoring,
  generateMemoryReport,
  detectMemoryLeaks,
  MEMORY_CONFIG
}; 