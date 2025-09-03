[根目录](../CLAUDE.md) > **models**

# Models模块 - 数据层架构

## 模块职责

负责数据库连接、数据模型定义和数据操作，为整个应用提供数据持久化和查询功能。

## 入口与启动

### 主要文件
- **db.js**: 数据库初始化和连接管理
- **pages.js**: 页面数据模型和操作
- **apiKeys.js**: API密钥管理模型

### 初始化流程
```javascript
// 在app.js中启动
initDatabase().then(() => {
  console.log('数据库初始化成功');
  app.listen(PORT, '0.0.0.0', () => {
    console.log(`服务器运行在 http://0.0.0.0:${PORT}`);
  });
});
```

## 对外接口

### db.js 提供的核心接口
```javascript
// 数据库连接
db: sqlite3.Database

// 初始化函数
initDatabase(): Promise<void>

// 查询辅助函数
query(sql: string, params?: any[]): Promise<any[]>
get(sql: string, params?: any[]): Promise<any>
run(sql: string, params?: any[]): Promise<{id: number, changes: number}>
```

### pages.js 提供的接口
```javascript
// 页面操作
createPage(htmlContent: string, isProtected: boolean, codeType?: string, name?: string): Promise<{urlId: string, password: string}>
getPageById(id: string): Promise<Page>
getAllPages(): Promise<Page[]>
getRecentPages(limit: number): Promise<Page[]>
getPagesList(options: PaginationOptions): Promise<{pages: Page[], pagination: PaginationInfo}>
getPagesStats(): Promise<Stats>
updatePage(id: string, updates: Object): Promise<boolean>
deletePage(id: string): Promise<boolean>
batchDeletePages(ids: string[]): Promise<number>
batchUpdateProtection(ids: string[], isProtected: boolean): Promise<number>
```

### apiKeys.js 提供的接口
```javascript
// API密钥管理
createApiKey(name: string, description?: string, permissions?: string[], ...): Promise<ApiKeyInfo>
getAllApiKeys(): Promise<ApiKey[]>
getApiKeyById(keyId: string): Promise<ApiKey>
validateApiKey(apiKey: string): Promise<ApiKeyInfo | null>
deleteApiKey(keyId: string): Promise<boolean>
toggleApiKey(keyId: string, isActive: boolean): Promise<boolean>
getApiKeyStats(keyId: string, days: number): Promise<Stats>
```

## 关键依赖与配置

### 数据库配置
- **类型**: SQLite3
- **文件路径**: `./db/html-go.db`
- **自动创建**: 是
- **权限要求**: 读写权限

### 表结构
```sql
-- pages表
CREATE TABLE IF NOT EXISTS pages (
  id TEXT PRIMARY KEY,
  html_content TEXT NOT NULL,
  created_at INTEGER NOT NULL,
  password TEXT,
  is_protected INTEGER DEFAULT 0,
  code_type TEXT DEFAULT 'html'
);

-- api_keys表 (在apiKeys.js中定义)
CREATE TABLE IF NOT EXISTS api_keys (
  key_id TEXT PRIMARY KEY,
  api_key_hash TEXT NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  permissions TEXT NOT NULL,
  max_requests_per_hour INTEGER,
  max_requests_per_day INTEGER,
  is_active INTEGER DEFAULT 1,
  created_at INTEGER NOT NULL,
  expires_at INTEGER,
  last_used_at INTEGER
);
```

## 数据模型

### Page模型
```typescript
interface Page {
  id: string;           // 页面唯一标识
  html_content: string;  // HTML内容
  created_at: number;    // 创建时间戳
  password?: string;     // 访问密码（如果受保护）
  is_protected: number;  // 是否受保护 (0/1)
  code_type: string;     // 代码类型 (html, markdown, mermaid, svg)
  name?: string;         // 页面名称
  content_size?: number; // 内容大小（计算属性）
}
```

### ApiKey模型
```typescript
interface ApiKey {
  key_id: string;                    // 密钥ID
  api_key_hash: string;              // 密钥哈希
  name: string;                      // 密钥名称
  description?: string;              // 描述
  permissions: string[];             // 权限列表
  max_requests_per_hour?: number;    // 每小时最大请求数
  max_requests_per_day?: number;     // 每天最大请求数
  is_active: number;                 // 是否激活 (0/1)
  created_at: number;                // 创建时间
  expires_at?: number;               // 过期时间
  last_used_at?: number;             // 最后使用时间
}
```

### 分页选项
```typescript
interface PaginationOptions {
  page: number;          // 页码
  limit: number;         // 每页条数
  search?: string;       // 搜索关键词
  codeType?: string;     // 代码类型筛选
  isProtected?: boolean; // 保护状态筛选
  sortBy?: string;       // 排序字段
  sortOrder?: string;    // 排序方向
}
```

## 测试与质量

### 数据库测试
- 自动创建测试数据库
- 数据完整性验证
- 并发访问测试
- 性能基准测试

### 模型测试
- CRUD操作测试
- 边界条件测试
- 错误处理测试
- 数据验证测试

### 质量保证
- 参数化查询防止SQL注入
- 事务处理确保数据一致性
- 错误处理和日志记录
- 数据备份和恢复机制

## 常见问题 (FAQ)

### Q: 数据库文件在哪里？
A: 数据库文件位于 `./db/html-go.db`，会在应用启动时自动创建。

### Q: 如何备份数据？
A: 直接复制 `./db/html-go.db` 文件即可，或者使用数据库导出工具。

### Q: 数据库性能如何优化？
A: 适当的索引、定期清理过期数据、使用缓存机制。

### Q: 支持哪些数据类型？
A: 主要支持HTML、Markdown、Mermaid图表、SVG等内容类型。

## 相关文件清单

### 核心文件
- `db.js` - 数据库连接和基础操作
- `pages.js` - 页面数据模型
- `apiKeys.js` - API密钥管理

### 相关目录
- `../db/` - 数据库文件存储目录
- `../sessions/` - 会话文件存储目录

### 依赖文件
- `../app.js` - 主应用入口
- `../middleware/auth.js` - 认证中间件
- `../middleware/apiKey.js` - API密钥中间件

## 变更记录 (Changelog)

- **2025-09-03**: 创建models模块文档
- **功能添加**: API密钥管理系统
- **性能优化**: 添加缓存和统计功能
- **安全增强**: 改进密码保护和权限控制