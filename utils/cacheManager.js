const { performance } = require('perf_hooks');

// 缓存配置
const CACHE_CONFIG = {
  // 默认缓存TTL（毫秒）
  DEFAULT_TTL: 5 * 60 * 1000, // 5分钟
  // 最大缓存项数量
  MAX_ITEMS: 1000,
  // 清理间隔（毫秒）
  CLEANUP_INTERVAL: 60 * 1000, // 1分钟
  // 缓存命中率低于此值时触发优化
  LOW_HIT_RATE_THRESHOLD: 0.3,
  // 内存使用超过此值时强制清理（MB）
  MEMORY_THRESHOLD: 50,
  // 不同类型数据的默认TTL
  TTL_PRESETS: {
    pages: 10 * 60 * 1000,      // 页面数据 - 10分钟
    api_keys: 30 * 60 * 1000,   // API Keys - 30分钟
    stats: 2 * 60 * 1000,       // 统计数据 - 2分钟
    performance: 1 * 60 * 1000,  // 性能数据 - 1分钟
    memory: 30 * 1000,          // 内存信息 - 30秒
    quick: 10 * 1000            // 快速缓存 - 10秒
  }
};

// 缓存项结构
class CacheItem {
  constructor(key, value, ttl = CACHE_CONFIG.DEFAULT_TTL) {
    this.key = key;
    this.value = value;
    this.ttl = ttl;
    this.createdAt = Date.now();
    this.lastAccessed = Date.now();
    this.accessCount = 0;
    this.size = this.calculateSize(value);
  }

  calculateSize(value) {
    try {
      return JSON.stringify(value).length;
    } catch {
      return 0;
    }
  }

  isExpired() {
    return Date.now() - this.createdAt > this.ttl;
  }

  access() {
    this.lastAccessed = Date.now();
    this.accessCount++;
    return this.value;
  }

  getMetadata() {
    return {
      key: this.key,
      createdAt: this.createdAt,
      lastAccessed: this.lastAccessed,
      accessCount: this.accessCount,
      size: this.size,
      ttl: this.ttl,
      age: Date.now() - this.createdAt,
      isExpired: this.isExpired()
    };
  }
}

// 主缓存管理器
class CacheManager {
  constructor() {
    this.cache = new Map();
    this.stats = {
      hits: 0,
      misses: 0,
      sets: 0,
      deletes: 0,
      evictions: 0,
      totalMemory: 0,
      startTime: Date.now()
    };
    
    this.cleanupInterval = setInterval(() => {
      this.cleanup();
    }, CACHE_CONFIG.CLEANUP_INTERVAL);

    console.log('✅ 缓存管理器已启动');
  }

  // 设置缓存项
  set(key, value, ttl = CACHE_CONFIG.DEFAULT_TTL, category = 'default') {
    try {
      // 如果超过最大项数，执行LRU清理
      if (this.cache.size >= CACHE_CONFIG.MAX_ITEMS) {
        this.evictLRU();
      }

      const item = new CacheItem(key, value, ttl);
      this.cache.set(key, item);
      
      this.stats.sets++;
      this.updateMemoryUsage();
      
      console.log(`📦 缓存设置: ${key} (${category}, TTL: ${ttl}ms, 大小: ${item.size}字节)`);
      return true;
    } catch (error) {
      console.error('缓存设置失败:', error.message);
      return false;
    }
  }

  // 获取缓存项
  get(key) {
    const item = this.cache.get(key);
    
    if (!item) {
      this.stats.misses++;
      return null;
    }

    if (item.isExpired()) {
      this.delete(key);
      this.stats.misses++;
      return null;
    }

    this.stats.hits++;
    return item.access();
  }

  // 删除缓存项
  delete(key) {
    const deleted = this.cache.delete(key);
    if (deleted) {
      this.stats.deletes++;
      this.updateMemoryUsage();
    }
    return deleted;
  }

  // 检查缓存项是否存在且有效
  has(key) {
    const item = this.cache.get(key);
    if (!item || item.isExpired()) {
      return false;
    }
    return true;
  }

  // 清理过期项
  cleanup() {
    const beforeSize = this.cache.size;
    let cleanedCount = 0;

    for (const [key, item] of this.cache.entries()) {
      if (item.isExpired()) {
        this.cache.delete(key);
        cleanedCount++;
      }
    }

    const afterSize = this.cache.size;
    
    if (cleanedCount > 0) {
      console.log(`🧹 清理过期缓存: ${cleanedCount} 项 (${beforeSize} → ${afterSize})`);
      this.updateMemoryUsage();
    }

    // 检查是否需要内存优化
    this.checkMemoryOptimization();
  }

  // LRU清理策略
  evictLRU() {
    let oldestItem = null;
    let oldestKey = null;
    let oldestTime = Date.now();

    for (const [key, item] of this.cache.entries()) {
      if (item.lastAccessed < oldestTime) {
        oldestTime = item.lastAccessed;
        oldestItem = item;
        oldestKey = key;
      }
    }

    if (oldestKey) {
      this.cache.delete(oldestKey);
      this.stats.evictions++;
      console.log(`🔄 LRU清理: ${oldestKey} (最后访问: ${new Date(oldestTime).toLocaleString()})`);
    }
  }

  // 检查内存优化
  checkMemoryOptimization() {
    const memoryUsage = this.getMemoryUsage();
    
    if (memoryUsage > CACHE_CONFIG.MEMORY_THRESHOLD) {
      console.warn(`⚠️  缓存内存使用过高: ${memoryUsage}MB，执行强制清理`);
      this.forceCleanup();
    }

    // 检查命中率
    const hitRate = this.getHitRate();
    if (hitRate < CACHE_CONFIG.LOW_HIT_RATE_THRESHOLD && this.cache.size > 100) {
      console.warn(`⚠️  缓存命中率较低: ${Math.round(hitRate * 100)}%，考虑优化缓存策略`);
    }
  }

  // 强制清理（保留最近访问的50%）
  forceCleanup() {
    const items = Array.from(this.cache.entries())
      .map(([key, item]) => ({ key, ...item.getMetadata() }))
      .sort((a, b) => b.lastAccessed - a.lastAccessed);

    const keepCount = Math.floor(items.length * 0.5);
    const itemsToDelete = items.slice(keepCount);

    itemsToDelete.forEach(item => {
      this.cache.delete(item.key);
    });

    console.log(`🧹 强制清理完成: 删除 ${itemsToDelete.length} 项，保留 ${keepCount} 项`);
    this.updateMemoryUsage();
  }

  // 更新内存使用统计
  updateMemoryUsage() {
    let totalSize = 0;
    for (const item of this.cache.values()) {
      totalSize += item.size;
    }
    this.stats.totalMemory = totalSize;
  }

  // 获取内存使用（MB）
  getMemoryUsage() {
    return Math.round(this.stats.totalMemory / 1024 / 1024 * 100) / 100;
  }

  // 获取命中率
  getHitRate() {
    const total = this.stats.hits + this.stats.misses;
    return total > 0 ? this.stats.hits / total : 0;
  }

  // 获取缓存统计
  getStats() {
    const uptime = Date.now() - this.stats.startTime;
    const hitRate = this.getHitRate();
    const memoryUsage = this.getMemoryUsage();

    return {
      items: this.cache.size,
      maxItems: CACHE_CONFIG.MAX_ITEMS,
      hitRate: Math.round(hitRate * 10000) / 100, // 百分比，保留2位小数
      memoryUsage: memoryUsage,
      uptime: uptime,
      operations: {
        hits: this.stats.hits,
        misses: this.stats.misses,
        sets: this.stats.sets,
        deletes: this.stats.deletes,
        evictions: this.stats.evictions
      },
      config: CACHE_CONFIG
    };
  }

  // 获取详细的缓存报告
  getDetailedReport() {
    const stats = this.getStats();
    
    // 按类别分组缓存项
    const categories = {};
    const itemDetails = [];

    for (const [key, item] of this.cache.entries()) {
      const metadata = item.getMetadata();
      itemDetails.push(metadata);

      // 按key前缀分类
      const category = key.split(':')[0] || 'other';
      if (!categories[category]) {
        categories[category] = {
          count: 0,
          totalSize: 0,
          avgAccessCount: 0,
          items: []
        };
      }
      
      categories[category].count++;
      categories[category].totalSize += metadata.size;
      categories[category].items.push(metadata);
    }

    // 计算每个类别的平均访问次数
    Object.keys(categories).forEach(category => {
      const items = categories[category].items;
      categories[category].avgAccessCount = 
        items.reduce((sum, item) => sum + item.accessCount, 0) / items.length;
    });

    // 热点数据（访问次数最多的前10项）
    const hotItems = itemDetails
      .sort((a, b) => b.accessCount - a.accessCount)
      .slice(0, 10);

    // 冷数据（最少访问的前10项）
    const coldItems = itemDetails
      .sort((a, b) => a.accessCount - b.accessCount)
      .slice(0, 10);

    return {
      summary: stats,
      categories,
      analysis: {
        hotItems,
        coldItems,
        totalCategories: Object.keys(categories).length,
        averageItemSize: itemDetails.length > 0 
          ? Math.round(itemDetails.reduce((sum, item) => sum + item.size, 0) / itemDetails.length)
          : 0
      },
      generatedAt: new Date().toISOString()
    };
  }

  // 清空所有缓存
  clear() {
    const count = this.cache.size;
    this.cache.clear();
    this.stats.totalMemory = 0;
    console.log(`🗑️  清空所有缓存: ${count} 项`);
    return count;
  }

  // 停止缓存管理器
  stop() {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
    }
    console.log('🛑 缓存管理器已停止');
  }
}

// 创建全局缓存实例
const globalCache = new CacheManager();

// 便捷的缓存函数
const cache = {
  // 设置缓存（自动选择TTL）
  set: (key, value, category = 'default') => {
    const ttl = CACHE_CONFIG.TTL_PRESETS[category] || CACHE_CONFIG.DEFAULT_TTL;
    return globalCache.set(key, value, ttl, category);
  },

  // 获取缓存
  get: (key) => globalCache.get(key),

  // 删除缓存
  delete: (key) => globalCache.delete(key),

  // 检查缓存
  has: (key) => globalCache.has(key),

  // 清空缓存
  clear: () => globalCache.clear(),

  // 获取统计
  stats: () => globalCache.getStats(),

  // 获取报告
  report: () => globalCache.getDetailedReport(),

  // 页面数据缓存
  pages: {
    set: (key, value) => cache.set(`pages:${key}`, value, 'pages'),
    get: (key) => cache.get(`pages:${key}`),
    delete: (key) => cache.delete(`pages:${key}`)
  },

  // API Keys缓存
  apiKeys: {
    set: (key, value) => cache.set(`apikeys:${key}`, value, 'api_keys'),
    get: (key) => cache.get(`apikeys:${key}`),
    delete: (key) => cache.delete(`apikeys:${key}`)
  },

  // 统计数据缓存
  stats: {
    set: (key, value) => cache.set(`stats:${key}`, value, 'stats'),
    get: (key) => cache.get(`stats:${key}`),
    delete: (key) => cache.delete(`stats:${key}`)
  },

  // 性能数据缓存
  performance: {
    set: (key, value) => cache.set(`perf:${key}`, value, 'performance'),
    get: (key) => cache.get(`perf:${key}`),
    delete: (key) => cache.delete(`perf:${key}`)
  },

  // 快速缓存（短TTL）
  quick: {
    set: (key, value) => cache.set(`quick:${key}`, value, 'quick'),
    get: (key) => cache.get(`quick:${key}`),
    delete: (key) => cache.delete(`quick:${key}`)
  }
};

// 进程退出时清理
process.on('exit', () => {
  globalCache.stop();
});

process.on('SIGINT', () => {
  console.log('\n🛑 收到终止信号，停止缓存管理器...');
  globalCache.stop();
  process.exit(0);
});

module.exports = {
  cache,
  CacheManager,
  globalCache,
  CACHE_CONFIG
}; 