[根目录](../CLAUDE.md) > **utils**

# Utils模块 - 工具层架构

## 模块职责

提供各种工具函数和实用程序，包括内存优化、缓存管理、代码类型检测、内容渲染等功能性支持。

## 入口与启动

### 主要文件
- **memoryOptimizer.js**: 内存优化工具
- **cacheManager.js**: 缓存管理工具
- **codeDetector.js**: 代码类型检测工具
- **contentRenderer.js**: 内容渲染工具

### 工具导入
```javascript
// 在app.js中导入
const { 
  getMemoryUsage, 
  getDetailedMemoryStats, 
  forceGarbageCollection, 
  startMemoryMonitoring, 
  generateMemoryReport, 
  detectMemoryLeaks 
} = require('./utils/memoryOptimizer');

const { cache } = require('./utils/cacheManager');

const { detectCodeType, CODE_TYPES } = require('./utils/codeDetector');

const { renderContent, escapeHtml } = require('./utils/contentRenderer');
```

## 对外接口

### memoryOptimizer.js 工具

#### 内存监控函数
```javascript
// 获取基本内存使用情况
getMemoryUsage(): MemoryUsage

// 获取详细内存统计
getDetailedMemoryStats(): DetailedMemoryStats

// 启动内存监控
startMemoryMonitoring(): void

// 生成内存报告
generateMemoryReport(): MemoryReport

// 检测内存泄漏
detectMemoryLeaks(): LeakDetectionResult
```

#### 内存管理函数
```javascript
// 强制垃圾回收
forceGarbageCollection(): GCResult

// 优化内存使用
optimizeMemoryUsage(): OptimizationResult

// 清理不必要的缓存
clearUnusedCache(): number
```

### cacheManager.js 工具

#### 缓存操作
```javascript
// 缓存实例
cache: CacheManager

// 基本操作
cache.set(key: string, value: any, ttl?: number): void
cache.get(key: string): any
cache.delete(key: string): boolean
cache.clear(): number
cache.has(key: string): boolean
```

#### 缓存统计
```javascript
// 获取缓存统计
cache.stats(): CacheStats

// 生成缓存报告
cache.report(): CacheReport

// 按类别清理
cache.clearByCategory(category: string): number
```

### codeDetector.js 工具

#### 代码类型检测
```javascript
// 检测代码类型
detectCodeType(content: string): string

// 支持的代码类型
CODE_TYPES: {
  HTML: 'html',
  MARKDOWN: 'markdown',
  MERMAID: 'mermaid',
  SVG: 'svg',
  JAVASCRIPT: 'javascript',
  CSS: 'css',
  JSON: 'json'
}

// 提取代码块
extractCodeBlocks(content: string): CodeBlock[]
```

#### 代码块处理
```typescript
interface CodeBlock {
  content: string;        // 代码内容
  type: string;          // 代码类型
  originalType: string;  // 原始类型
  startLine: number;     // 开始行号
  endLine: number;       // 结束行号
  language: string;      // 编程语言
}
```

### contentRenderer.js 工具

#### 内容渲染
```javascript
// 渲染内容
renderContent(content: string, type: string): Promise<string>

// HTML转义
escapeHtml(text: string): string

// 内容预处理
preprocessContent(content: string, type: string): string

// 后处理优化
postprocessContent(html: string, type: string): string
```

#### 支持的渲染类型
- **HTML**: 直接渲染HTML内容
- **Markdown**: 使用marked库转换为HTML
- **Mermaid**: 渲染图表和流程图
- **SVG**: 直接嵌入SVG内容
- **代码高亮**: 语法高亮显示

## 关键依赖与配置

### 内存优化配置
```javascript
// 内存监控配置
const MEMORY_CONFIG = {
  warningThreshold: 100 * 1024 * 1024,  // 100MB警告阈值
  criticalThreshold: 150 * 1024 * 1024, // 150MB临界阈值
  monitoringInterval: 60000,           // 监控间隔(毫秒)
  gcInterval: 300000                   // 垃圾回收间隔(毫秒)
};
```

### 缓存配置
```javascript
// 缓存配置
const CACHE_CONFIG = {
  defaultTTL: 3600,        // 默认过期时间(秒)
  maxSize: 1000,           // 最大缓存数量
  cleanupInterval: 600,    // 清理间隔(秒)
  categories: {
    pages: 1800,          // 页面缓存30分钟
    stats: 300,           // 统计缓存5分钟
    api: 600              // API缓存10分钟
  }
};
```

### 代码检测配置
```javascript
// 代码类型检测配置
const DETECTION_CONFIG = {
  patterns: {
    html: /<html|<!DOCTYPE|<[a-zA-Z][^>]*>/i,
    markdown: /^#{1,6}\s+/m,
    mermaid: /^(graph|flowchart|sequenceDiagram|classDiagram|gantt|pie|erDiagram|journey|stateDiagram|gitGraph)\s+/i,
    svg: /<svg[^>]*>[\s\S]*<\/svg>/i,
    javascript: /^(const|let|var|function|class|import|export)\s+/,
    css: /^[^{]*{[^}]*}/m,
    json: /^\s*{[\s\S]*}\s*$/
  },
  confidenceThreshold: 0.7
};
```

## 数据模型

### MemoryUsage
```typescript
interface MemoryUsage {
  heapUsed: number;     // 已用堆内存
  heapTotal: number;    // 总堆内存
  rss: number;         // 常驻内存集
  external: number;     // 外部内存
  arrayBuffers: number; // ArrayBuffer内存
}
```

### CacheStats
```typescript
interface CacheStats {
  size: number;         // 缓存大小
  hits: number;         // 命中次数
  misses: number;      // 未命中次数
  hitRate: number;      // 命中率
  items: CacheItem[];   // 缓存项列表
}
```

### CodeDetectionResult
```typescript
interface CodeDetectionResult {
  type: string;         // 检测到的类型
  confidence: number;    // 置信度
  language: string;     // 编程语言
  isMixed: boolean;     // 是否混合内容
  blocks: CodeBlock[];  // 代码块列表
}
```

## 测试与质量

### 内存优化测试
- 内存泄漏检测测试
- 垃圾回收效果测试
- 内存使用优化测试
- 并发内存访问测试

### 缓存管理测试
- 缓存命中率测试
- 缓存过期测试
- 缓存清理测试
- 并发缓存访问测试

### 代码检测测试
- 类型识别准确性测试
- 边界情况测试
- 性能基准测试
- 混合内容测试

### 内容渲染测试
- 渲染准确性测试
- 安全性测试
- 性能测试
- 兼容性测试

## 常见问题 (FAQ)

### Q: 如何监控内存使用？
A: 使用 `startMemoryMonitoring()` 启动监控，通过 `getMemoryUsage()` 查看实时数据。

### Q: 缓存什么时候会过期？
A: 默认缓存时间为1小时，不同类型的缓存有不同的过期时间。

### Q: 代码类型检测准确吗？
A: 检测算法基于模式匹配，准确率约90%，对于复杂内容可能需要手动指定类型。

### Q: 如何防止XSS攻击？
A: 使用 `escapeHtml()` 函数对用户输入进行转义，内容渲染时会自动处理。

## 相关文件清单

### 核心文件
- `memoryOptimizer.js` - 内存优化工具
- `cacheManager.js` - 缓存管理工具
- `codeDetector.js` - 代码类型检测工具
- `contentRenderer.js` - 内容渲染工具

### 依赖文件
- `../app.js` - 主应用文件
- `../models/` - 数据模型模块
- `../middleware/` - 中间件模块

### 相关模块
- `../public/js/` - 前端JavaScript文件
- `../views/` - 视图模板文件

## 变更记录 (Changelog)

- **2025-09-03**: 创建utils模块文档
- **功能增强**: 添加内存优化和监控
- **性能优化**: 实现缓存管理系统
- **安全增强**: 改进内容渲染安全性