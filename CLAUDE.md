# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Quick Start

```bash
npm install          # Install dependencies
npm run dev          # Development server (port 5678)
npm start            # Production server (port 8888)
```

## Architecture Overview

**Express.js + SQLite + EJS** 架构的HTML代码分享工具，支持多格式内容自动检测和渲染。

### Core Components
- **Express Server**: `app.js` - 主入口和中间件配置
- **Database**: `models/db.js` + `models/pages.js` - SQLite自动初始化和CRUD
- **API Routes**: `routes/pages.js` - RESTful接口
- **Content Detection**: `utils/codeDetector.js` - 自动识别HTML/Markdown/SVG/Mermaid
- **Content Rendering**: `utils/contentRenderer.js` - 按类型专用渲染
- **Authentication**: `middleware/auth.js` - 会话+API Token双重认证

### Content Processing Flow
1. **检测** → 自动识别内容类型
2. **存储** → SQLite存储内容和元数据
3. **渲染** → 类型专用渲染引擎
4. **交付** → 完整HTML文档输出

## Development Commands

| Command | Environment | Port | Features |
|---------|-------------|------|----------|
| `npm run dev` | development | 5678 | nodemon热重载，调试日志 |
| `npm start` | production | 8888 | 生产优化，组合日志 |
| `npm run test` | test | 3000 | 测试配置 |
| `npm run prod` | production | 8888 | 备用生产命令 |

## Environment Setup

```bash
# 必需的环境变量 (.env)
NODE_ENV=development
PORT=3000
AUTH_ENABLED=true
AUTH_PASSWORD=your_password
API_TOKEN=your_api_token
DB_PATH=./db/database.sqlite
```

## Database & Storage
- **数据库文件**: `./db/html-go.db` (自动创建)
- **会话存储**: `./sessions/` (文件存储，24小时过期)
- **迁移脚本**: `scripts/migrate-db.js`, `scripts/add-code-type.js`

## API Endpoints

### 公共接口
- `GET /view/:id` - 查看分享页面
- `GET /api/pages/:id` - 获取页面元数据
- `POST /validate-password/:id` - 密码验证

### 认证接口
- `POST /api/pages/create` - 创建代码片段
- `GET /api/pages/list/recent` - 最近页面列表
- `GET /admin/dashboard` - 管理面板

### 认证方式
- **Web界面**: 会话认证 (`/login` + cookie)
- **API调用**: Bearer Token (`Authorization: Bearer token`)

## Docker部署

```bash
docker-compose up -d                    # 完整部署
docker build -t html-go-express .       # 构建镜像
docker run -p 8888:8888 html-go-express # 运行容器
```

## Content Types
- **HTML**: 检测 `<!DOCTYPE>` 或 `<html>`
- **Markdown**: 检测 ```markdown 或Markdown语法特征
- **SVG**: 检测 `<svg>` 标签
- **Mermaid**: 检测 `graph`, `sequenceDiagram` 等语法

## Debug & Troubleshooting

### 调试模式
设置 `NODE_ENV=development` 启用详细日志：
- 内容检测: `[DEBUG]` 前缀日志
- 数据库操作: 成功/失败日志
- 认证流程: 详细认证日志

### 常见问题
- **端口冲突**: 修改 `.env` 中的 PORT
- **数据库权限**: 确保 `./db/` 目录可写
- **会话错误**: 检查 `./sessions/` 目录权限
- **内容渲染**: 查看浏览器控制台错误信息

## Database Schema

```sql
CREATE TABLE pages (
  id TEXT PRIMARY KEY,
  html_content TEXT NOT NULL,
  created_at INTEGER NOT NULL,
  password TEXT,
  is_protected INTEGER DEFAULT 0,
  code_type TEXT DEFAULT 'html'
);
```