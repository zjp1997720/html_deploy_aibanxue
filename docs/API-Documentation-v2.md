# HTML Deploy Project API Documentation v2.0

## 目录
- [概述](#概述)
- [认证](#认证)
- [公共API](#公共api)
- [管理员API](#管理员api)
- [性能监控API](#性能监控api)
- [内存管理API](#内存管理api)
- [缓存管理API](#缓存管理api)
- [错误处理](#错误处理)
- [示例代码](#示例代码)

## 概述

HTML Deploy Project 提供RESTful API，支持页面管理、API密钥管理、性能监控等功能。

### 基础信息
- **基础URL**: `http://localhost:5678` (开发环境) / `http://localhost:8888` (生产环境)
- **API版本**: v2.0
- **内容类型**: `application/json`
- **字符编码**: UTF-8

### 版本更新
- **v2.0**: 新增性能监控、内存管理、缓存管理、增强的统计功能
- **v1.0**: 基础页面和API密钥管理功能

## 认证

### Web Session认证
用于管理后台访问：
```
POST /login
Cookie: session-id=<session_value>
```

### API Token认证
用于API调用：
```
Authorization: Bearer <api_token>
```

## 公共API

### 页面管理

#### 获取页面内容
```http
GET /view/:id
```

**参数:**
- `id` (string): 页面ID

**响应:**
```json
{
  "success": true,
  "data": {
    "id": "abc123",
    "html_content": "<html>...</html>",
    "created_at": "2025-01-23T10:00:00Z",
    "is_protected": false,
    "code_type": "html"
  }
}
```

#### 验证页面密码
```http
POST /validate-password/:id
```

**请求体:**
```json
{
  "password": "your_password"
}
```

**响应:**
```json
{
  "success": true,
  "message": "密码验证成功"
}
```

#### 创建页面
```http
POST /api/pages/create
```

**请求体:**
```json
{
  "html_content": "<html>...</html>",
  "password": "optional_password",
  "name": "页面名称",
  "code_type": "html"
}
```

**响应:**
```json
{
  "success": true,
  "data": {
    "id": "abc123",
    "url": "/view/abc123"
  }
}
```

#### 获取最近页面列表
```http
GET /api/pages/list/recent?limit=10&offset=0
```

**查询参数:**
- `limit` (number): 每页数量，默认10
- `offset` (number): 偏移量，默认0

**响应:**
```json
{
  "success": true,
  "data": {
    "pages": [
      {
        "id": "abc123",
        "name": "示例页面",
        "created_at": "2025-01-23T10:00:00Z",
        "is_protected": false,
        "code_type": "html"
      }
    ],
    "total": 50,
    "has_more": true
  }
}
```

### V2 API增强功能

#### 获取页面详情 (v2)
```http
GET /api/v2/pages/:id
```

**响应:**
```json
{
  "success": true,
  "data": {
    "id": "abc123",
    "name": "示例页面",
    "html_content": "<html>...</html>",
    "created_at": "2025-01-23T10:00:00Z",
    "updated_at": "2025-01-23T11:00:00Z",
    "is_protected": false,
    "code_type": "html",
    "view_count": 156,
    "size": 2048,
    "last_accessed": "2025-01-23T11:30:00Z"
  }
}
```

#### 更新页面 (v2)
```http
PUT /api/v2/pages/:id
```

**请求体:**
```json
{
  "name": "新页面名称",
  "html_content": "<html>更新内容</html>",
  "password": "new_password",
  "code_type": "markdown"
}
```

#### 删除页面 (v2)
```http
DELETE /api/v2/pages/:id
```

#### 批量操作 (v2)
```http
POST /api/v2/pages/batch
```

**请求体:**
```json
{
  "action": "delete",
  "page_ids": ["abc123", "def456", "ghi789"]
}
```

#### 搜索页面 (v2)
```http
GET /api/v2/pages/search?q=关键词&type=html&limit=20&offset=0
```

**查询参数:**
- `q` (string): 搜索关键词
- `type` (string): 内容类型筛选
- `limit` (number): 每页数量
- `offset` (number): 偏移量

## 管理员API

### 页面管理

#### 获取所有页面
```http
GET /api/admin/pages
```

**需要权限:** 管理员

**查询参数:**
- `page` (number): 页码，默认1
- `limit` (number): 每页数量，默认10
- `search` (string): 搜索关键词
- `type` (string): 内容类型筛选
- `sort` (string): 排序方式 (created_at, updated_at, name, size)
- `order` (string): 排序顺序 (asc, desc)

**响应:**
```json
{
  "success": true,
  "data": {
    "pages": [...],
    "pagination": {
      "current_page": 1,
      "total_pages": 5,
      "total_items": 50,
      "per_page": 10,
      "has_next": true,
      "has_prev": false
    }
  }
}
```

### API密钥管理

#### 获取API密钥列表
```http
GET /api/admin/apikeys
```

**响应:**
```json
{
  "success": true,
  "data": {
    "api_keys": [
      {
        "id": 1,
        "name": "测试密钥",
        "key_preview": "ak_****1234",
        "permissions": ["read", "write"],
        "is_active": true,
        "created_at": "2025-01-23T10:00:00Z",
        "last_used": "2025-01-23T11:00:00Z",
        "usage_count": 156,
        "rate_limit": 1000,
        "expires_at": null
      }
    ],
    "total": 3
  }
}
```

#### 创建API密钥
```http
POST /api/admin/apikeys/create
```

**请求体:**
```json
{
  "name": "新API密钥",
  "permissions": ["read", "write", "admin"],
  "rate_limit": 1000,
  "expires_at": "2025-12-31T23:59:59Z"
}
```

**响应:**
```json
{
  "success": true,
  "data": {
    "id": 2,
    "name": "新API密钥",
    "api_key": "ak_1234567890abcdef",
    "permissions": ["read", "write", "admin"],
    "rate_limit": 1000,
    "expires_at": "2025-12-31T23:59:59Z"
  },
  "message": "API密钥创建成功，请妥善保管完整密钥"
}
```

#### 更新API密钥
```http
PUT /api/admin/apikeys/:id
```

#### 删除API密钥
```http
DELETE /api/admin/apikeys/:id
```

#### 重新生成API密钥
```http
POST /api/admin/apikeys/:id/regenerate
```

### 统计数据

#### 获取系统统计
```http
GET /api/admin/stats
```

**响应:**
```json
{
  "success": true,
  "data": {
    "pages": {
      "total": 150,
      "protected": 25,
      "public": 125,
      "by_type": {
        "html": 100,
        "markdown": 30,
        "svg": 15,
        "mermaid": 5
      }
    },
    "api_keys": {
      "total": 5,
      "active": 4,
      "expired": 1
    },
    "usage": {
      "total_views": 5000,
      "total_api_calls": 15000,
      "unique_visitors": 1200
    },
    "storage": {
      "total_size": 52428800,
      "average_page_size": 349525
    }
  }
}
```

#### 获取详细报告 (v2)
```http
GET /api/v2/stats/report?period=7d&include_trends=true
```

**查询参数:**
- `period` (string): 时间周期 (1d, 7d, 30d, 90d)
- `include_trends` (boolean): 是否包含趋势数据

### 异常监控 (v2)

#### 获取异常列表
```http
GET /api/v2/stats/exceptions?limit=50&severity=error
```

#### 获取趋势分析
```http
GET /api/v2/stats/trends?metric=views&period=30d
```

## 性能监控API

### 获取性能统计
```http
GET /api/admin/performance/stats
```

**需要权限:** 管理员

**响应:**
```json
{
  "success": true,
  "data": {
    "requests": {
      "total": 1500,
      "successful": 1450,
      "failed": 50,
      "average_response_time": 245,
      "slow_requests": 15
    },
    "endpoints": {
      "/api/pages/create": {
        "count": 200,
        "avg_response_time": 180,
        "success_rate": 0.98
      },
      "/view/:id": {
        "count": 800,
        "avg_response_time": 120,
        "success_rate": 0.99
      }
    },
    "time_ranges": {
      "last_hour": {
        "requests": 120,
        "avg_response_time": 230
      },
      "last_24h": {
        "requests": 1500,
        "avg_response_time": 245
      }
    }
  }
}
```

### 获取详细性能报告
```http
GET /api/admin/performance/report?start_date=2025-01-20&end_date=2025-01-23
```

**查询参数:**
- `start_date` (string): 开始日期 (YYYY-MM-DD)
- `end_date` (string): 结束日期 (YYYY-MM-DD)
- `endpoint` (string): 特定端点筛选
- `slow_only` (boolean): 仅显示慢请求

### 获取性能状态 (公共)
```http
GET /api/v2/performance/status
```

**响应:**
```json
{
  "success": true,
  "data": {
    "status": "healthy",
    "uptime": 345600,
    "last_check": "2025-01-23T12:00:00Z",
    "avg_response_time": 245,
    "request_rate": 125.5,
    "error_rate": 0.02
  }
}
```

## 内存管理API

### 获取内存状态
```http
GET /api/admin/memory/status
```

**需要权限:** 管理员

**响应:**
```json
{
  "success": true,
  "data": {
    "current": {
      "rss": 67108864,
      "heapTotal": 33554432,
      "heapUsed": 25165824,
      "external": 2097152,
      "arrayBuffers": 1048576
    },
    "formatted": {
      "rss": "64.00 MB",
      "heapTotal": "32.00 MB",
      "heapUsed": "24.00 MB",
      "external": "2.00 MB",
      "arrayBuffers": "1.00 MB"
    },
    "baseline": {
      "rss": 52428800,
      "heapTotal": 26214400,
      "heapUsed": 20971520
    },
    "trend": {
      "rss": "increasing",
      "rate": 0.15
    },
    "status": "normal"
  }
}
```

### 获取内存报告
```http
GET /api/admin/memory/report?period=24h
```

### 强制垃圾回收
```http
POST /api/admin/memory/gc
```

**响应:**
```json
{
  "success": true,
  "data": {
    "before": {
      "heapUsed": 25165824,
      "heapTotal": 33554432
    },
    "after": {
      "heapUsed": 18874368,
      "heapTotal": 29360128
    },
    "freed": 6291456,
    "freed_formatted": "6.00 MB",
    "timestamp": "2025-01-23T12:00:00Z"
  },
  "message": "垃圾回收完成"
}
```

### 内存泄漏检测
```http
GET /api/admin/memory/leak-detection
```

### 获取内存状态 (公共)
```http
GET /api/v2/memory/status
```

## 缓存管理API

### 获取缓存统计
```http
GET /api/admin/cache/stats
```

**需要权限:** 管理员

**响应:**
```json
{
  "success": true,
  "data": {
    "global": {
      "total_items": 150,
      "total_memory": 5242880,
      "hit_rate": 0.87,
      "hits": 1350,
      "misses": 200,
      "sets": 180,
      "deletes": 25,
      "evictions": 5,
      "uptime": 3600
    },
    "categories": {
      "pages": {
        "items": 100,
        "memory": 3145728,
        "hit_rate": 0.92
      },
      "api_keys": {
        "items": 20,
        "memory": 524288,
        "hit_rate": 0.95
      },
      "stats": {
        "items": 30,
        "memory": 1572864,
        "hit_rate": 0.75
      }
    }
  }
}
```

### 获取缓存报告
```http
GET /api/admin/cache/report
```

### 清除缓存
```http
POST /api/admin/cache/clear
```

**请求体:**
```json
{
  "category": "pages",
  "force": true
}
```

**响应:**
```json
{
  "success": true,
  "data": {
    "cleared_items": 100,
    "freed_memory": 3145728,
    "freed_memory_formatted": "3.00 MB",
    "category": "pages"
  },
  "message": "缓存清除完成"
}
```

### 预热缓存
```http
POST /api/admin/cache/warmup
```

## 错误处理

### 标准错误响应格式
```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "请求参数验证失败",
    "details": {
      "field": "html_content",
      "reason": "内容不能为空"
    }
  }
}
```

### 错误代码说明

| 错误代码 | HTTP状态码 | 说明 |
|---------|-----------|------|
| VALIDATION_ERROR | 400 | 请求参数验证失败 |
| UNAUTHORIZED | 401 | 未授权访问 |
| FORBIDDEN | 403 | 权限不足 |
| NOT_FOUND | 404 | 资源不存在 |
| RATE_LIMITED | 429 | 请求频率超限 |
| SERVER_ERROR | 500 | 服务器内部错误 |

### 常见错误场景

#### 1. 认证失败
```json
{
  "success": false,
  "error": {
    "code": "UNAUTHORIZED",
    "message": "无效的API密钥"
  }
}
```

#### 2. 权限不足
```json
{
  "success": false,
  "error": {
    "code": "FORBIDDEN",
    "message": "该API密钥没有管理员权限"
  }
}
```

#### 3. 资源不存在
```json
{
  "success": false,
  "error": {
    "code": "NOT_FOUND",
    "message": "页面不存在"
  }
}
```

#### 4. 请求频率限制
```json
{
  "success": false,
  "error": {
    "code": "RATE_LIMITED",
    "message": "请求频率超过限制",
    "details": {
      "limit": 1000,
      "remaining": 0,
      "reset_time": "2025-01-23T13:00:00Z"
    }
  }
}
```

## 示例代码

### JavaScript (Fetch API)

#### 创建页面
```javascript
async function createPage(content, password = null) {
  try {
    const response = await fetch('/api/pages/create', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer your_api_key'
      },
      body: JSON.stringify({
        html_content: content,
        password: password,
        name: '我的页面',
        code_type: 'html'
      })
    });
    
    const result = await response.json();
    
    if (result.success) {
      console.log('页面创建成功:', result.data.url);
      return result.data;
    } else {
      console.error('创建失败:', result.error.message);
    }
  } catch (error) {
    console.error('请求失败:', error);
  }
}
```

#### 获取性能统计
```javascript
async function getPerformanceStats() {
  try {
    const response = await fetch('/api/admin/performance/stats', {
      headers: {
        'Authorization': 'Bearer your_admin_api_key'
      }
    });
    
    const result = await response.json();
    
    if (result.success) {
      console.log('性能统计:', result.data);
      return result.data;
    }
  } catch (error) {
    console.error('获取性能统计失败:', error);
  }
}
```

### Python (requests)

#### 批量操作页面
```python
import requests

def batch_delete_pages(page_ids, api_key):
    url = 'http://localhost:5678/api/v2/pages/batch'
    headers = {
        'Content-Type': 'application/json',
        'Authorization': f'Bearer {api_key}'
    }
    data = {
        'action': 'delete',
        'page_ids': page_ids
    }
    
    response = requests.post(url, json=data, headers=headers)
    result = response.json()
    
    if result['success']:
        print(f"成功删除 {len(page_ids)} 个页面")
        return result['data']
    else:
        print(f"删除失败: {result['error']['message']}")
        return None

# 使用示例
page_ids = ['abc123', 'def456', 'ghi789']
batch_delete_pages(page_ids, 'your_api_key')
```

#### 内存管理
```python
def force_garbage_collection(api_key):
    url = 'http://localhost:5678/api/admin/memory/gc'
    headers = {
        'Authorization': f'Bearer {api_key}'
    }
    
    response = requests.post(url, headers=headers)
    result = response.json()
    
    if result['success']:
        freed = result['data']['freed_formatted']
        print(f"垃圾回收完成，释放内存: {freed}")
        return result['data']
    else:
        print(f"垃圾回收失败: {result['error']['message']}")
        return None
```

### cURL

#### 创建API密钥
```bash
curl -X POST http://localhost:5678/api/admin/apikeys/create \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer your_admin_api_key" \
  -d '{
    "name": "测试API密钥",
    "permissions": ["read", "write"],
    "rate_limit": 1000,
    "expires_at": "2025-12-31T23:59:59Z"
  }'
```

#### 获取缓存统计
```bash
curl -X GET http://localhost:5678/api/admin/cache/stats \
  -H "Authorization: Bearer your_admin_api_key"
```

#### 清除特定缓存
```bash
curl -X POST http://localhost:5678/api/admin/cache/clear \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer your_admin_api_key" \
  -d '{
    "category": "pages",
    "force": true
  }'
```

## 更新日志

### v2.0 (2025-01-23)
- ✨ 新增性能监控API
- ✨ 新增内存管理API
- ✨ 新增缓存管理API
- ✨ 增强统计和分析功能
- ✨ 新增批量操作支持
- ✨ 新增异常检测和趋势分析
- 🔧 改进错误处理和响应格式
- 📝 完善API文档和示例

### v1.0 (2025-01-20)
- 🎉 初始版本发布
- ✨ 基础页面管理功能
- ✨ API密钥管理功能
- ✨ 基础统计功能

## 联系支持

如有问题或建议，请联系：
- 📧 邮箱: support@example.com
- 🐛 Bug报告: GitHub Issues
- 📖 文档: 项目README.md 