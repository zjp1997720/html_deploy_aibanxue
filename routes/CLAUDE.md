[根目录](../CLAUDE.md) > **routes**

# Routes模块 - 路由层架构

## 模块职责

负责HTTP请求的路由分发和处理，为前端和管理后台提供API接口，处理页面创建、查看、管理等操作。

## 入口与启动

### 主要文件
- **pages.js**: 页面相关的路由处理

### 路由注册
```javascript
// 在app.js中注册
const pagesRoutes = require('./routes/pages');
app.use('/api/pages', pagesRoutes);
```

## 对外接口

### 页面路由接口

#### GET /api/pages/:id
**功能**: 获取指定ID的页面信息
**参数**: 
- `id`: 页面ID

**响应**:
```json
{
  "success": true,
  "page": {
    "id": "页面ID",
    "createdAt": "创建时间"
  }
}
```

#### GET /api/pages/list/recent
**功能**: 获取最近创建的页面列表
**参数**:
- `limit`: 返回条数限制 (默认10)

**响应**:
```json
{
  "success": true,
  "pages": [
    {
      "id": "页面ID",
      "created_at": "创建时间",
      "name": "页面名称",
      "code_type": "代码类型"
    }
  ]
}
```

#### POST /api/pages/:id/protect
**功能**: 更新页面的保护状态
**参数**:
- `id`: 页面ID
- `isProtected`: 是否保护 (boolean)

**响应**:
```json
{
  "success": true,
  "message": "保护状态更新成功"
}
```

### 管理后台路由接口 (在app.js中)

#### 页面管理
- `GET /api/admin/pages` - 获取页面列表（支持分页、搜索、筛选）
- `GET /api/admin/pages/stats` - 获取页面统计信息
- `PUT /api/admin/pages/:pageId` - 更新页面信息
- `DELETE /api/admin/pages/:pageId` - 删除单个页面
- `POST /api/admin/pages/batch/delete` - 批量删除页面
- `POST /api/admin/pages/batch/protection` - 批量更新保护状态

#### API Key管理
- `GET /api/admin/apikeys` - 获取所有API Keys
- `POST /api/admin/apikeys` - 创建新的API Key
- `PUT /api/admin/apikeys/:keyId` - 更新API Key状态
- `DELETE /api/admin/apikeys/:keyId` - 删除API Key
- `GET /api/admin/apikeys/:keyId/stats` - 获取API Key统计

### 现代API接口 (v2版本)

#### 页面操作
- `POST /api/v2/pages/create` - 创建页面（使用API Key认证）
- `GET /api/v2/pages/:id` - 获取页面信息
- `GET /api/v2/pages` - 获取页面列表
- `PUT /api/v2/pages/:id` - 更新页面
- `DELETE /api/v2/pages/:id` - 删除页面

#### 统计和监控
- `GET /api/v2/stats/system` - 系统总体统计
- `GET /api/v2/stats/apikey/:keyId` - API Key使用统计
- `GET /api/v2/performance/status` - 性能状态
- `GET /api/v2/memory/status` - 内存状态
- `GET /api/v2/health` - 健康检查

## 关键依赖与配置

### 依赖模块
- **models/pages.js**: 页面数据模型
- **models/db.js**: 数据库操作
- **middleware/auth.js**: 认证中间件
- **middleware/apiKey.js**: API Key中间件

### 中间件应用
```javascript
// 认证中间件
const { isAuthenticated } = require('../middleware/auth');

// API Key中间件
const { apiKeyAuth } = require('../middleware/apiKey');

// 路由保护示例
router.get('/admin/pages', isAuthenticated, async (req, res) => {
  // 需要管理员权限
});

router.post('/api/v2/pages/create', apiKeyAuth(['write']), async (req, res) => {
  // 需要write权限
});
```

## 数据模型

### 分页参数
```typescript
interface PaginationParams {
  page?: number;         // 页码 (默认1)
  limit?: number;        // 每页条数 (默认20)
  search?: string;       // 搜索关键词
  codeType?: string;     // 代码类型筛选
  isProtected?: boolean; // 保护状态筛选
  sortBy?: string;       // 排序字段
  sortOrder?: string;    // 排序方向 (ASC/DESC)
}
```

### 页面更新数据
```typescript
interface PageUpdateData {
  name?: string;              // 页面名称
  htmlContent?: string;       // HTML内容
  isProtected?: boolean;      // 保护状态
  password?: string;          // 访问密码
  codeType?: string;          // 代码类型
}
```

### API Key创建数据
```typescript
interface ApiKeyCreateData {
  name: string;                    // 密钥名称
  description?: string;            // 描述
  permissions: string[];           // 权限列表
  maxRequestsPerHour?: number;     // 每小时最大请求数
  maxRequestsPerDay?: number;      // 每天最大请求数
  expiresAt?: string;              // 过期时间
}
```

## 测试与质量

### API测试
- 接口功能测试
- 参数验证测试
- 错误处理测试
- 性能测试

### 认证测试
- 登录认证测试
- API Key认证测试
- 权限控制测试
- 会话管理测试

### 质量保证
- 统一的响应格式
- 完善的错误处理
- 参数验证和过滤
- 访问日志记录

## 常见问题 (FAQ)

### Q: 如何创建页面？
A: 使用 `POST /api/pages/create` 接口，需要提供HTML内容和保护状态。

### Q: 如何查看受保护的页面？
A: 在URL中添加 `password` 参数，例如：`/view/abc123?password=mypassword`

### Q: API接口的认证方式有哪些？
A: 支持三种认证方式：Web会话认证、旧版API Token、新版API Key。

### Q: 如何获取API Key？
A: 需要在管理后台创建，路径为 `/admin/apikeys`。

## 相关文件清单

### 核心文件
- `pages.js` - 页面路由处理

### 相关文件
- `../app.js` - 主应用文件，包含所有路由定义
- `../models/pages.js` - 页面数据模型
- `../models/apiKeys.js` - API Key数据模型
- `../middleware/auth.js` - 认证中间件
- `../middleware/apiKey.js` - API Key中间件

### 测试文件
- `../tests/test-api-calls.js` - API调用测试
- `../tests/test-apikey.js` - API Key测试

## 变更记录 (Changelog)

- **2025-09-03**: 创建routes模块文档
- **功能增强**: 添加API Key管理系统
- **API升级**: 引入v2版本API接口
- **性能优化**: 添加统计和监控接口