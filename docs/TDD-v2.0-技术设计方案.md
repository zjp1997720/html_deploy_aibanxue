# TDD v2.0: 技术设计方案

**版本**: v2.0  
**创建时间**: 2025-01-22  
**技术负责人**: 开发团队  
**开发分支**: `feature/admin-dashboard-enhancement`  
**关联PRD**: `PRD-v2.0-管理后台增强与API Key系统.md`

---

## 1. 技术架构概览

### 1.1 架构不变原则
保持现有技术栈，采用渐进式增强：
- **后端**: Node.js + Express.js + SQLite
- **前端**: EJS模板 + 原生JavaScript + CSS
- **部署**: PM2 + GitHub Actions CI/CD

### 1.2 新增技术组件
- API Key生成和验证中间件
- 统一导航组件
- 分页和筛选组件
- 数据统计工具

---

## 2. 数据库设计

### 2.1 现有表结构
```sql
-- pages表 (现有)
CREATE TABLE pages (
  id TEXT PRIMARY KEY,
  html_content TEXT NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  password TEXT,
  is_protected BOOLEAN DEFAULT 0,
  code_type TEXT DEFAULT 'html'
);
```

### 2.2 新增表结构

#### 2.2.1 pages表扩展
```sql
-- 扩展pages表，添加名称和访问统计
ALTER TABLE pages ADD COLUMN name TEXT DEFAULT 'Untitled';
ALTER TABLE pages ADD COLUMN api_key_used TEXT;
ALTER TABLE pages ADD COLUMN view_count INTEGER DEFAULT 0;
ALTER TABLE pages ADD COLUMN last_viewed_at DATETIME;
ALTER TABLE pages ADD COLUMN content_size INTEGER DEFAULT 0;
```

#### 2.2.2 API Keys表
```sql
CREATE TABLE api_keys (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  key_name TEXT NOT NULL,
  api_key TEXT UNIQUE NOT NULL,
  description TEXT,
  usage_limit INTEGER DEFAULT -1,  -- -1表示无限制
  usage_count INTEGER DEFAULT 0,
  permissions TEXT DEFAULT 'create,read',  -- JSON字符串或逗号分隔
  expires_at DATETIME,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  last_used_at DATETIME,
  is_active BOOLEAN DEFAULT 1
);
```

#### 2.2.3 API使用日志表
```sql
CREATE TABLE api_usage_logs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  api_key_id INTEGER,
  endpoint TEXT NOT NULL,
  method TEXT NOT NULL,
  ip_address TEXT,
  user_agent TEXT,
  request_data TEXT,  -- JSON
  response_status INTEGER,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (api_key_id) REFERENCES api_keys(id)
);
```

### 2.3 数据迁移脚本
```javascript
// scripts/migrate-to-v2.js
const db = require('../models/db');

async function migrateToV2() {
  const migrations = [
    // 添加新字段到pages表
    `ALTER TABLE pages ADD COLUMN name TEXT DEFAULT 'Untitled'`,
    `ALTER TABLE pages ADD COLUMN api_key_used TEXT`,
    `ALTER TABLE pages ADD COLUMN view_count INTEGER DEFAULT 0`,
    `ALTER TABLE pages ADD COLUMN last_viewed_at DATETIME`,
    `ALTER TABLE pages ADD COLUMN content_size INTEGER DEFAULT 0`,
    
    // 创建api_keys表
    `CREATE TABLE IF NOT EXISTS api_keys (...)`,
    
    // 创建使用日志表
    `CREATE TABLE IF NOT EXISTS api_usage_logs (...)`
  ];

  for (const migration of migrations) {
    try {
      await db.run(migration);
      console.log('✅ Migration executed:', migration.substring(0, 50) + '...');
    } catch (error) {
      if (!error.message.includes('duplicate column name')) {
        throw error;
      }
    }
  }
}
```

---

## 3. API设计

### 3.1 认证中间件
```javascript
// middleware/apiKey.js
const validateApiKey = async (req, res, next) => {
  const apiKey = req.headers['authorization']?.replace('Bearer ', '') 
              || req.headers['x-api-key'];
  
  if (!apiKey) {
    req.apiKeyInfo = null;
    return next();
  }

  try {
    const keyInfo = await ApiKey.validateKey(apiKey);
    if (!keyInfo) {
      return res.status(401).json({ error: 'Invalid API key' });
    }
    
    if (keyInfo.usage_limit > 0 && keyInfo.usage_count >= keyInfo.usage_limit) {
      return res.status(429).json({ error: 'API key usage limit exceeded' });
    }
    
    if (keyInfo.expires_at && new Date() > new Date(keyInfo.expires_at)) {
      return res.status(401).json({ error: 'API key expired' });
    }

    req.apiKeyInfo = keyInfo;
    await ApiKey.incrementUsage(keyInfo.id);
    next();
  } catch (error) {
    res.status(500).json({ error: 'API key validation failed' });
  }
};
```

### 3.2 增强的API接口

#### 3.2.1 创建页面API (增强)
```javascript
// POST /api/pages/create
{
  "html_content": "<h1>Hello World</h1>",
  "name": "我的测试页面",           // 新增
  "password": "optional_password",
  "code_type": "html"
}

// 响应格式
{
  "success": true,
  "data": {
    "id": "abc123",
    "name": "我的测试页面",
    "url": "https://yourdomain.com/view/abc123",
    "protected": false,
    "code_type": "html",
    "created_at": "2025-01-22T10:00:00Z"
  },
  "usage": {
    "api_key_used": "my-key",
    "remaining_uses": 99
  }
}
```

#### 3.2.2 新增管理API
```javascript
// 获取页面列表 (分页、筛选)
GET /api/admin/pages?page=1&limit=20&search=hello&type=html&protected=false

// API Key管理
POST /api/admin/apikeys          // 创建API Key
GET /api/admin/apikeys           // 获取Key列表
PUT /api/admin/apikeys/:id       // 更新Key
DELETE /api/admin/apikeys/:id    // 删除Key
GET /api/admin/apikeys/:id/stats // 获取Key统计

// 系统统计
GET /api/admin/stats             // 总体统计
```

### 3.3 错误处理标准
```javascript
// 统一错误响应格式
{
  "success": false,
  "error": {
    "code": "INVALID_API_KEY",
    "message": "The provided API key is invalid or expired",
    "details": {}
  }
}

// 常见错误码
const ERROR_CODES = {
  INVALID_API_KEY: 'Invalid or expired API key',
  USAGE_LIMIT_EXCEEDED: 'API key usage limit exceeded',
  INSUFFICIENT_PERMISSIONS: 'API key lacks required permissions',
  VALIDATION_ERROR: 'Request validation failed',
  RESOURCE_NOT_FOUND: 'Requested resource not found'
};
```

---

## 4. 前端组件设计

### 4.1 统一布局组件
```html
<!-- views/layouts/admin.ejs -->
<!DOCTYPE html>
<html>
<head>
  <title>HTML-GO 管理后台</title>
  <link rel="stylesheet" href="/css/admin.css">
</head>
<body>
  <div class="admin-layout">
    <!-- 顶部导航 -->
    <nav class="top-nav">
      <div class="nav-brand">HTML-GO Admin</div>
      <div class="nav-user">
        <span>管理员</span>
        <a href="/logout">退出</a>
      </div>
    </nav>
    
    <!-- 侧边导航 -->
    <aside class="sidebar">
      <ul class="nav-menu">
        <li><a href="/admin/dashboard" class="<%= currentPath === '/admin/dashboard' ? 'active' : '' %>">
          📊 概览</a></li>
        <li><a href="/admin/pages" class="<%= currentPath === '/admin/pages' ? 'active' : '' %>">
          📄 页面管理</a></li>
        <li><a href="/admin/apikeys" class="<%= currentPath === '/admin/apikeys' ? 'active' : '' %>">
          🔑 API Key管理</a></li>
        <li><a href="/admin/settings" class="<%= currentPath === '/admin/settings' ? 'active' : '' %>">
          ⚙️ 系统设置</a></li>
      </ul>
    </aside>
    
    <!-- 主内容区 -->
    <main class="main-content">
      <div class="breadcrumb">
        <% if (breadcrumb) { %>
          <% breadcrumb.forEach((item, index) => { %>
            <% if (index > 0) { %><span>/</span><% } %>
            <% if (item.url) { %>
              <a href="<%= item.url %>"><%= item.title %></a>
            <% } else { %>
              <span><%= item.title %></span>
            <% } %>
          <% }) %>
        <% } %>
      </div>
      
      <%- body %>
    </main>
  </div>
  
  <script src="/js/admin-common.js"></script>
</body>
</html>
```

### 4.2 页面管理组件
```html
<!-- views/admin/pages.ejs -->
<% layout('layouts/admin') %>

<div class="page-header">
  <h1>页面管理</h1>
  <div class="page-actions">
    <button class="btn btn-danger" id="batchDelete">批量删除</button>
  </div>
</div>

<!-- 搜索筛选 -->
<div class="filters">
  <input type="text" id="searchInput" placeholder="搜索页面名称或ID...">
  <select id="typeFilter">
    <option value="">所有类型</option>
    <option value="html">HTML</option>
    <option value="markdown">Markdown</option>
    <option value="svg">SVG</option>
    <option value="mermaid">Mermaid</option>
  </select>
  <select id="protectedFilter">
    <option value="">保护状态</option>
    <option value="true">受保护</option>
    <option value="false">公开</option>
  </select>
  <button class="btn btn-primary" id="applyFilters">筛选</button>
</div>

<!-- 页面列表 -->
<div class="table-container">
  <table class="data-table">
    <thead>
      <tr>
        <th><input type="checkbox" id="selectAll"></th>
        <th>名称</th>
        <th>类型</th>
        <th>访问量</th>
        <th>创建时间</th>
        <th>状态</th>
        <th>操作</th>
      </tr>
    </thead>
    <tbody id="pagesTableBody">
      <!-- 通过JavaScript动态加载 -->
    </tbody>
  </table>
</div>

<!-- 分页 -->
<div class="pagination" id="pagination">
  <!-- 通过JavaScript生成 -->
</div>
```

### 4.3 API Key管理组件
```html
<!-- views/admin/apikeys.ejs -->
<% layout('layouts/admin') %>

<div class="page-header">
  <h1>API Key管理</h1>
  <button class="btn btn-primary" id="createKeyBtn">创建新Key</button>
</div>

<!-- API Key列表 -->
<div class="keys-grid">
  <% apiKeys.forEach(key => { %>
    <div class="key-card">
      <div class="key-header">
        <h3><%= key.key_name %></h3>
        <span class="status <%= key.is_active ? 'active' : 'inactive' %>">
          <%= key.is_active ? '激活' : '禁用' %>
        </span>
      </div>
      <div class="key-info">
        <p><strong>描述:</strong> <%= key.description || '无' %></p>
        <p><strong>使用次数:</strong> 
          <%= key.usage_count %><% if (key.usage_limit > 0) { %>/<%= key.usage_limit %><% } %>
        </p>
        <p><strong>创建时间:</strong> <%= new Date(key.created_at).toLocaleString() %></p>
        <% if (key.expires_at) { %>
          <p><strong>过期时间:</strong> <%= new Date(key.expires_at).toLocaleString() %></p>
        <% } %>
      </div>
      <div class="key-actions">
        <button class="btn btn-sm btn-secondary" onclick="copyKey('<%= key.api_key %>')">复制Key</button>
        <button class="btn btn-sm btn-info" onclick="viewStats('<%= key.id %>')">统计</button>
        <button class="btn btn-sm btn-warning" onclick="editKey('<%= key.id %>')">编辑</button>
        <button class="btn btn-sm btn-danger" onclick="deleteKey('<%= key.id %>')">删除</button>
      </div>
    </div>
  <% }) %>
</div>

<!-- 创建Key对话框 -->
<div id="createKeyModal" class="modal" style="display: none;">
  <div class="modal-content">
    <h3>创建API Key</h3>
    <form id="createKeyForm">
      <div class="form-group">
        <label>Key名称:</label>
        <input type="text" name="key_name" required>
      </div>
      <div class="form-group">
        <label>描述:</label>
        <textarea name="description"></textarea>
      </div>
      <div class="form-group">
        <label>使用限制:</label>
        <input type="number" name="usage_limit" placeholder="留空表示无限制">
      </div>
      <div class="form-group">
        <label>过期时间:</label>
        <input type="datetime-local" name="expires_at">
      </div>
      <div class="form-actions">
        <button type="submit" class="btn btn-primary">创建</button>
        <button type="button" class="btn btn-secondary" onclick="closeModal()">取消</button>
      </div>
    </form>
  </div>
</div>
```

---

## 5. 业务逻辑层设计

### 5.1 API Key管理模块
```javascript
// models/apiKeys.js
class ApiKeyModel {
  static async create({ key_name, description, usage_limit, expires_at, permissions }) {
    const api_key = this.generateKey();
    const sql = `
      INSERT INTO api_keys (key_name, api_key, description, usage_limit, expires_at, permissions)
      VALUES (?, ?, ?, ?, ?, ?)
    `;
    const result = await db.run(sql, [key_name, api_key, description, usage_limit, expires_at, JSON.stringify(permissions)]);
    return { id: result.lastID, api_key };
  }

  static async validateKey(api_key) {
    const sql = `SELECT * FROM api_keys WHERE api_key = ? AND is_active = 1`;
    return await db.get(sql, [api_key]);
  }

  static async incrementUsage(keyId) {
    const sql = `
      UPDATE api_keys 
      SET usage_count = usage_count + 1, last_used_at = CURRENT_TIMESTAMP 
      WHERE id = ?
    `;
    await db.run(sql, [keyId]);
  }

  static generateKey() {
    const prefix = 'hg_';
    const randomPart = require('crypto').randomBytes(20).toString('hex');
    return prefix + randomPart;
  }

  static async getUsageStats(keyId, days = 30) {
    const sql = `
      SELECT 
        DATE(created_at) as date,
        COUNT(*) as requests,
        COUNT(DISTINCT endpoint) as unique_endpoints
      FROM api_usage_logs 
      WHERE api_key_id = ? AND created_at > datetime('now', '-${days} days')
      GROUP BY DATE(created_at)
      ORDER BY date DESC
    `;
    return await db.all(sql, [keyId]);
  }
}
```

### 5.2 页面管理增强
```javascript
// models/pages.js (扩展)
class PageModel {
  static async create({ html_content, name = 'Untitled', password, code_type, api_key_used }) {
    const id = this.generateId();
    const content_size = Buffer.byteLength(html_content, 'utf8');
    
    const sql = `
      INSERT INTO pages (id, html_content, name, password, is_protected, code_type, api_key_used, content_size)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `;
    
    await db.run(sql, [
      id, html_content, name, password, 
      !!password, code_type, api_key_used, content_size
    ]);
    
    return { id, name, url: `/view/${id}` };
  }

  static async getWithPagination({ page = 1, limit = 20, search, type, protected, api_key }) {
    let whereClauses = [];
    let params = [];

    if (search) {
      whereClauses.push('(name LIKE ? OR id LIKE ?)');
      params.push(`%${search}%`, `%${search}%`);
    }
    
    if (type) {
      whereClauses.push('code_type = ?');
      params.push(type);
    }
    
    if (protected !== undefined) {
      whereClauses.push('is_protected = ?');
      params.push(protected === 'true' ? 1 : 0);
    }

    const whereClause = whereClauses.length > 0 ? 'WHERE ' + whereClauses.join(' AND ') : '';
    const offset = (page - 1) * limit;

    const countSql = `SELECT COUNT(*) as total FROM pages ${whereClause}`;
    const dataSql = `
      SELECT id, name, code_type, view_count, created_at, is_protected, api_key_used
      FROM pages ${whereClause}
      ORDER BY created_at DESC
      LIMIT ? OFFSET ?
    `;

    const total = await db.get(countSql, params);
    const pages = await db.all(dataSql, [...params, limit, offset]);

    return {
      pages,
      pagination: {
        page,
        limit,
        total: total.total,
        totalPages: Math.ceil(total.total / limit)
      }
    };
  }

  static async incrementViewCount(id) {
    const sql = `
      UPDATE pages 
      SET view_count = view_count + 1, last_viewed_at = CURRENT_TIMESTAMP 
      WHERE id = ?
    `;
    await db.run(sql, [id]);
  }
}
```

---

## 6. 前端交互逻辑

### 6.1 通用工具函数
```javascript
// public/js/admin-common.js
class AdminApp {
  static async request(url, options = {}) {
    const response = await fetch(url, {
      headers: {
        'Content-Type': 'application/json',
        ...options.headers
      },
      ...options
    });
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error?.message || 'Request failed');
    }
    
    return response.json();
  }

  static showNotification(message, type = 'info') {
    // 显示通知的通用方法
    const notification = document.createElement('div');
    notification.className = `notification notification-${type}`;
    notification.textContent = message;
    document.body.appendChild(notification);
    
    setTimeout(() => {
      notification.remove();
    }, 3000);
  }

  static confirmAction(message) {
    return confirm(message);
  }
}

// 分页组件
class Pagination {
  constructor(container, options) {
    this.container = container;
    this.options = options;
    this.render();
  }

  render() {
    const { page, totalPages, onPageChange } = this.options;
    
    let html = '<div class="pagination-controls">';
    
    // 上一页
    if (page > 1) {
      html += `<button onclick="this.changePage(${page - 1})">上一页</button>`;
    }
    
    // 页码
    for (let i = Math.max(1, page - 2); i <= Math.min(totalPages, page + 2); i++) {
      const active = i === page ? 'active' : '';
      html += `<button class="${active}" onclick="this.changePage(${i})">${i}</button>`;
    }
    
    // 下一页
    if (page < totalPages) {
      html += `<button onclick="this.changePage(${page + 1})">下一页</button>`;
    }
    
    html += '</div>';
    this.container.innerHTML = html;
  }

  changePage(page) {
    this.options.onPageChange(page);
  }
}
```

### 6.2 页面管理交互
```javascript
// public/js/pages-management.js
class PagesManagement {
  constructor() {
    this.currentPage = 1;
    this.filters = {};
    this.selectedPages = new Set();
    this.init();
  }

  init() {
    this.bindEvents();
    this.loadPages();
  }

  bindEvents() {
    // 搜索和筛选
    document.getElementById('applyFilters').addEventListener('click', () => {
      this.applyFilters();
    });

    // 全选
    document.getElementById('selectAll').addEventListener('change', (e) => {
      this.toggleSelectAll(e.target.checked);
    });

    // 批量删除
    document.getElementById('batchDelete').addEventListener('click', () => {
      this.batchDelete();
    });
  }

  async loadPages(page = 1) {
    try {
      const params = new URLSearchParams({
        page,
        limit: 20,
        ...this.filters
      });
      
      const result = await AdminApp.request(`/api/admin/pages?${params}`);
      this.renderPages(result.pages);
      this.renderPagination(result.pagination);
    } catch (error) {
      AdminApp.showNotification('加载页面失败: ' + error.message, 'error');
    }
  }

  renderPages(pages) {
    const tbody = document.getElementById('pagesTableBody');
    tbody.innerHTML = pages.map(page => `
      <tr>
        <td><input type="checkbox" value="${page.id}" onchange="this.togglePageSelection('${page.id}', this.checked)"></td>
        <td><a href="/view/${page.id}" target="_blank">${page.name}</a></td>
        <td><span class="badge badge-${page.code_type}">${page.code_type}</span></td>
        <td>${page.view_count || 0}</td>
        <td>${new Date(page.created_at).toLocaleString()}</td>
        <td>${page.is_protected ? '🔒 受保护' : '🌐 公开'}</td>
        <td>
          <button onclick="this.editPage('${page.id}')" class="btn btn-sm">编辑</button>
          <button onclick="this.deletePage('${page.id}')" class="btn btn-sm btn-danger">删除</button>
        </td>
      </tr>
    `).join('');
  }

  applyFilters() {
    this.filters = {
      search: document.getElementById('searchInput').value,
      type: document.getElementById('typeFilter').value,
      protected: document.getElementById('protectedFilter').value
    };
    this.currentPage = 1;
    this.loadPages();
  }

  async deletePage(id) {
    if (!AdminApp.confirmAction('确定要删除这个页面吗？')) return;
    
    try {
      await AdminApp.request(`/api/admin/pages/${id}`, { method: 'DELETE' });
      AdminApp.showNotification('页面删除成功', 'success');
      this.loadPages(this.currentPage);
    } catch (error) {
      AdminApp.showNotification('删除失败: ' + error.message, 'error');
    }
  }

  async batchDelete() {
    if (this.selectedPages.size === 0) {
      AdminApp.showNotification('请选择要删除的页面', 'warning');
      return;
    }

    if (!AdminApp.confirmAction(`确定要删除选中的 ${this.selectedPages.size} 个页面吗？`)) return;

    try {
      await AdminApp.request('/api/admin/pages/batch-delete', {
        method: 'POST',
        body: JSON.stringify({ ids: Array.from(this.selectedPages) })
      });
      
      AdminApp.showNotification('批量删除成功', 'success');
      this.selectedPages.clear();
      this.loadPages(this.currentPage);
    } catch (error) {
      AdminApp.showNotification('批量删除失败: ' + error.message, 'error');
    }
  }
}

// 页面加载完成后初始化
document.addEventListener('DOMContentLoaded', () => {
  new PagesManagement();
});
```

---

## 7. 安全考虑

### 7.1 API Key安全
- API Key生成使用加密安全的随机数
- Key在数据库中明文存储（便于查找），但不在日志中记录
- 实现速率限制防止暴力破解
- 支持Key的临时禁用和删除

### 7.2 权限控制
- 管理后台所有页面需要管理员认证
- API Key权限分级（只读、创建、删除）
- 敏感操作需要二次确认

### 7.3 输入验证
```javascript
// 输入验证中间件
const validatePageCreation = (req, res, next) => {
  const { html_content, name } = req.body;
  
  if (!html_content || typeof html_content !== 'string') {
    return res.status(400).json({ error: 'html_content is required and must be a string' });
  }
  
  if (html_content.length > 10 * 1024 * 1024) { // 10MB限制
    return res.status(400).json({ error: 'Content too large' });
  }
  
  if (name && (typeof name !== 'string' || name.length > 200)) {
    return res.status(400).json({ error: 'Name must be a string with max 200 characters' });
  }
  
  next();
};
```

---

## 8. 性能优化

### 8.1 数据库优化
```sql
-- 为常用查询添加索引
CREATE INDEX idx_pages_created_at ON pages(created_at);
CREATE INDEX idx_pages_name ON pages(name);
CREATE INDEX idx_pages_code_type ON pages(code_type);
CREATE INDEX idx_apikeys_key ON api_keys(api_key);
CREATE INDEX idx_usage_logs_key_id ON api_usage_logs(api_key_id);
```

### 8.2 前端优化
- 管理页面使用分页加载，避免一次加载大量数据
- API Key列表使用虚拟滚动（如果数量很大）
- 搜索功能使用防抖（debounce）减少请求
- 缓存静态资源和API响应

### 8.3 监控和日志
```javascript
// 性能监控中间件
const performanceMonitor = (req, res, next) => {
  const start = Date.now();
  
  res.on('finish', () => {
    const duration = Date.now() - start;
    if (duration > 1000) { // 超过1秒的请求记录日志
      console.warn(`Slow request: ${req.method} ${req.path} took ${duration}ms`);
    }
  });
  
  next();
};
```

---

## 9. 测试策略

### 9.1 单元测试
- API Key生成和验证逻辑
- 数据库操作函数
- 输入验证函数

### 9.2 集成测试
- API接口的完整流程
- 管理后台页面的关键功能
- 权限控制逻辑

### 9.3 手动测试清单
- [ ] 导航功能正常工作
- [ ] 页面CRUD操作完整
- [ ] API Key管理流程完整
- [ ] 分页和搜索功能正常
- [ ] 移动端基本可用
- [ ] 各浏览器兼容性

---

## 10. 部署和运维

### 10.1 数据库迁移
```bash
# 在生产环境执行迁移
node scripts/migrate-to-v2.js

# 备份现有数据
cp db/html-go.db db/html-go-backup-$(date +%Y%m%d).db
```

### 10.2 环境变量
```bash
# 新增环境变量
DEFAULT_API_KEY_LIMIT=1000    # 默认API Key使用限制
API_RATE_LIMIT=100           # 每分钟API调用限制
ADMIN_SESSION_TIMEOUT=3600   # 管理员会话超时时间（秒）
```

### 10.3 监控指标
- API Key使用情况
- 管理后台访问频率
- 页面创建和访问统计
- 数据库性能指标

---

## 11. 开发阶段规划

### Phase 1: 核心功能 (Week 1-2)
1. 数据库迁移脚本
2. 统一导航布局
3. 基础API Key CRUD
4. API名称参数支持

### Phase 2: 管理增强 (Week 3-4)
1. 完善的页面管理界面
2. API Key权限和限制
3. 使用统计功能
4. 搜索和筛选

### Phase 3: 优化完善 (Week 5)
1. 性能优化
2. 安全加固
3. 文档完善
4. 测试和bug修复

---

**技术文档版本**: v2.0  
**最后更新**: 2025-01-22  
**下次审查**: 开发完成后 