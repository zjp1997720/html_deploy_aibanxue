[根目录](../CLAUDE.md) > **middleware**

# Middleware模块 - 中间件层架构

## 模块职责

负责请求处理流程中的中间件逻辑，包括用户认证、API密钥验证、性能监控、安全控制等横切关注点。

## 入口与启动

### 主要文件
- **auth.js**: 用户认证中间件
- **apiKey.js**: API密钥验证中间件
- **responseTimeMonitor.js**: 响应时间监控中间件

### 中间件注册
```javascript
// 在app.js中注册
const { isAuthenticated, isAuthenticatedOrApiKey } = require('./middleware/auth');
const { apiKeyAuth } = require('./middleware/apiKey');
const { responseTimeMonitor } = require('./middleware/responseTimeMonitor');

// 性能监控中间件
app.use(responseTimeMonitor);

// 认证中间件应用
app.get('/admin/dashboard', isAuthenticated, (req, res) => {
  // 需要登录认证
});

app.post('/api/v2/pages/create', apiKeyAuth(['write']), (req, res) => {
  // 需要write权限的API Key
});
```

## 对外接口

### auth.js 中间件

#### isAuthenticated(req, res, next)
**功能**: 检查用户是否已认证
**支持认证方式**:
- Web会话认证 (session)
- Cookie认证
- 旧版API Token认证

**使用示例**:
```javascript
app.get('/protected-route', isAuthenticated, (req, res) => {
  // 只有认证用户可以访问
});
```

#### isAuthenticatedOrApiKey(req, res, next)
**功能**: 支持多种认证方式的中间件
**支持认证方式**:
- Web会话认证
- Cookie认证
- 旧版API Token
- 新版API Key

**使用示例**:
```javascript
app.post('/api/pages/create', isAuthenticatedOrApiKey, (req, res) => {
  // 支持多种认证方式
});
```

### apiKey.js 中间件

#### apiKeyAuth(permissions: string[])
**功能**: API密钥认证和权限验证
**参数**:
- `permissions`: 所需权限数组

**权限类型**:
- `read`: 读取权限
- `write`: 写入权限
- `admin`: 管理权限

**使用示例**:
```javascript
// 需要read权限
app.get('/api/v2/pages/:id', apiKeyAuth(['read']), handler);

// 需要write权限
app.post('/api/v2/pages/create', apiKeyAuth(['write']), handler);

// 需要admin权限
app.delete('/api/admin/apikeys/:keyId', apiKeyAuth(['admin']), handler);
```

#### validateApiKey(apiKey: string)
**功能**: 验证API密钥有效性
**返回**: Promise<ApiKeyInfo | null>

#### updateLastUsed(keyId: string)
**功能**: 更新API密钥最后使用时间
**返回**: Promise<void>

#### logApiUsage(keyId: string, endpoint: string, success: boolean)
**功能**: 记录API使用日志
**返回**: Promise<void>

### responseTimeMonitor.js 中间件

#### responseTimeMonitor(req, res, next)
**功能**: 监控请求响应时间
**功能特性**:
- 自动记录响应时间
- 统计错误率
- 生成性能报告
- 自动清理过期日志

#### getPerformanceStats()
**功能**: 获取性能统计数据
**返回**: PerformanceStats对象

#### getDetailedPerformanceReport(hours: number)
**功能**: 获取详细性能报告
**参数**: `hours` - 报告时间范围（小时）

#### cleanupOldLogs()
**功能**: 清理旧的性能日志
**触发**: 每天凌晨2点自动执行

## 关键依赖与配置

### 认证配置
```javascript
// 在config.js中配置
const config = {
  authEnabled: process.env.AUTH_ENABLED === 'true',
  authPassword: process.env.AUTH_PASSWORD || 'admin123',
  apiToken: process.env.API_TOKEN || null
};
```

### 会话配置
```javascript
// 在app.js中配置
app.use(session({
  store: new FileStore({
    path: sessionDir,
    ttl: 86400, // 24小时
    secret: process.env.SESSION_SECRET || 'html-go-secret-key'
  }),
  secret: process.env.SESSION_SECRET || 'html-go-secret-key',
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: process.env.NODE_ENV === 'production',
    maxAge: 24 * 60 * 60 * 1000,
    httpOnly: true,
    sameSite: 'lax'
  }
}));
```

### API Key配置
```javascript
// API Key格式
const API_KEY_FORMAT = 'hg_' + crypto.randomBytes(24).toString('hex');

// 权限定义
const PERMISSIONS = {
  READ: 'read',
  WRITE: 'write',
  ADMIN: 'admin'
};
```

## 数据模型

### ApiKeyInfo
```typescript
interface ApiKeyInfo {
  keyId: string;           // 密钥ID
  apiKeyHash: string;      // 密钥哈希
  name: string;           // 密钥名称
  description?: string;   // 描述
  permissions: string[];   // 权限列表
  maxRequestsPerHour?: number;  // 每小时限制
  maxRequestsPerDay?: number;   // 每天限制
  isActive: number;       // 是否激活
  createdAt: number;      // 创建时间
  expiresAt?: number;     // 过期时间
  lastUsedAt?: number;    // 最后使用时间
}
```

### PerformanceStats
```typescript
interface PerformanceStats {
  uptime: number;                    // 运行时间
  totalRequests: number;             // 总请求数
  averageResponseTime: number;       // 平均响应时间
  errorRate: number;                 // 错误率
  memoryUsage: NodeJS.MemoryUsage;  // 内存使用情况
  requestsPerMinute: number;        // 每分钟请求数
  topEndpoints: EndpointStats[];     // 热点端点统计
}
```

## 测试与质量

### 认证测试
- 登录功能测试
- 会话管理测试
- API Token测试
- API Key测试

### 权限测试
- 权限验证测试
- 越权访问测试
- 权限继承测试
- 权限撤销测试

### 性能测试
- 响应时间测试
- 并发访问测试
- 内存使用测试
- 错误处理测试

### 安全测试
- SQL注入测试
- XSS攻击测试
- CSRF攻击测试
- 会话劫持测试

## 常见问题 (FAQ)

### Q: 如何启用认证功能？
A: 设置环境变量 `AUTH_ENABLED=true` 和 `AUTH_PASSWORD=your_password`。

### Q: API Key的格式是什么？
A: API Key以 `hg_` 开头，后面跟着48位十六进制字符。

### Q: 如何限制API Key的使用频率？
A: 在创建API Key时设置 `maxRequestsPerHour` 和 `maxRequestsPerDay` 参数。

### Q: 性能监控数据如何查看？
A: 通过 `/api/admin/performance/stats` 接口查看统计数据。

## 相关文件清单

### 核心文件
- `auth.js` - 用户认证中间件
- `apiKey.js` - API密钥验证中间件
- `responseTimeMonitor.js` - 响应时间监控中间件

### 依赖文件
- `../models/apiKeys.js` - API Key数据模型
- `../config.js` - 配置文件
- `../app.js` - 主应用文件

### 相关模块
- `../models/` - 数据模型模块
- `../utils/` - 工具模块
- `../routes/` - 路由模块

## 变更记录 (Changelog)

- **2025-09-03**: 创建middleware模块文档
- **功能增强**: 添加API Key管理系统
- **性能优化**: 添加响应时间监控
- **安全增强**: 改进认证和权限控制