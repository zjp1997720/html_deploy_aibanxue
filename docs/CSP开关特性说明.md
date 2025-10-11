# CSP 开关特性说明

## 变更背景

在私有部署环境中，CSP（Content Security Policy）可能成为不必要的限制。本次更新添加了环境变量控制，允许在无外部威胁的场景下禁用 CSP。

## 使用方法

### 禁用 CSP（私有部署）

在 `.env` 文件中设置：

```bash
ENABLE_CSP=false
```

### 启用 CSP（公网部署，默认）

```bash
ENABLE_CSP=true
```

或删除该配置项（默认启用）。

## 安全建议

- ✅ **私有部署**：仅自己使用，无外部访问 → 可安全禁用
- ❌ **公网部署**：任何人可访问 → 务必保持启用
- ⚠️ **灰度环境**：建议先用 `CSP_REPORT_ONLY=true` 测试

## 技术细节

- **配置文件**：[config/cspDirectives.js](../config/cspDirectives.js)
- **中间件注入**：[app.js](../app.js) 第 116-151 行
- **默认策略**：启用（向后兼容）

### CSP 策略结构

项目采用**双层 CSP 策略**：

1. **管理后台**（`/admin/*`、`/login` 等）：
   - 严格策略
   - 不允许外部图片/音视频
   - 白名单 CDN：`cdn.bootcdn.net`, `cdn.jsdelivr.net`, `cdnjs.cloudflare.com`

2. **查看页**（`/view/:id`）：
   - 宽松策略
   - 允许 HTTPS 协议的远程图片/音视频
   - 支持用户生成的课件内容

### 相关环境变量

| 变量名 | 默认值 | 说明 |
|--------|--------|------|
| `ENABLE_CSP` | `true` | 是否启用 CSP |
| `CSP_REPORT_ONLY` | `false` | 仅报告模式（不阻止） |
| `CSP_REPORT_URI` | `/csp-report` | 违规上报端点 |
| `EXTRA_CDN_ORIGINS` | ` ` | 额外可信 CDN 域名（逗号分隔） |

## 影响范围

- ✅ **向后兼容**：默认行为不变
- ✅ **配置保留**：CSP 策略代码完整保留
- ✅ **灰度能力**：`CSP_REPORT_ONLY` 机制不受影响
- ✅ **其他安全头**：Helmet 的其他安全配置仍然生效

## 验证方法

### 本地验证

```bash
# 1. 禁用 CSP
echo "ENABLE_CSP=false" >> .env

# 2. 启动服务
npm start

# 3. 检查日志输出
# 应看到：🔒 CSP 状态: 已禁用（私有部署模式）
#         ⚠️  CSP 已完全禁用 - 仅适用于私有部署环境
```

### 响应头验证

```bash
# 启动服务后，检查 HTTP 响应头
curl -I http://localhost:5678/login | grep -i content-security

# CSP 启用时：会看到 Content-Security-Policy 头
# CSP 禁用时：不应看到该头
```

### 浏览器验证

1. 打开浏览器开发者工具（F12）
2. 访问 `http://localhost:5678/login`
3. 查看 Network → Response Headers
4. CSP 禁用时，不应看到 `Content-Security-Policy` 头

### 功能验证

- 访问管理后台，确认所有功能正常
- 访问 `/view/:id`，确认外部资源可正常加载
- 检查浏览器控制台，确认无 CSP 违规报错

## 线上部署

### 添加环境变量

根据部署方式选择：

#### Docker Compose

编辑 `docker-compose.yml` 或 `.env`：

```yaml
environment:
  - ENABLE_CSP=false
```

#### PM2

编辑 `ecosystem.config.js`：

```javascript
env: {
  ENABLE_CSP: 'false'
}
```

#### 直接环境变量

```bash
export ENABLE_CSP=false
```

### 重启服务

```bash
# Docker Compose
docker-compose restart

# PM2
pm2 restart html-deploy-project

# 直接启动
npm start
```

### 验证部署

```bash
# 1. 检查响应头
curl -I https://your-domain.com/login | grep -i content-security

# 2. 检查应用日志
docker logs <container-id> | grep CSP
# 或
pm2 logs html-deploy-project | grep CSP

# 预期输出：
# 🔒 CSP 状态: 已禁用（私有部署模式）
# ⚠️  CSP 已完全禁用 - 仅适用于私有部署环境
```

## 回滚方案

如需恢复 CSP：

```bash
# 方案 1：设置环境变量
ENABLE_CSP=true

# 方案 2：删除环境变量（使用默认值）
unset ENABLE_CSP

# 方案 3：删除 .env 中的配置行
sed -i '/ENABLE_CSP/d' .env
```

重启服务即可生效。

## 常见问题

### Q1: 禁用 CSP 是否会影响其他安全功能？

**答**：不会。Helmet 的其他安全头（如 `X-Frame-Options`、`X-Content-Type-Options` 等）仍然生效，只有 `Content-Security-Policy` 被禁用。

### Q2: 什么情况下应该禁用 CSP？

**答**：
- ✅ 私有云服务器，仅自己使用
- ✅ 内网环境，无外部访问
- ✅ 开发/测试环境，需要快速调试

### Q3: 什么情况下必须启用 CSP？

**答**：
- ❌ 公网部署，任何人可访问
- ❌ 多用户环境
- ❌ 生产环境（即使是私有云，如有第三方接入）

### Q4: 如何测试 CSP 策略是否正确？

**答**：使用 `CSP_REPORT_ONLY=true` 模式：

```bash
ENABLE_CSP=true
CSP_REPORT_ONLY=true
CSP_REPORT_URI=/csp-report
```

此模式下，浏览器会报告违规但不阻止资源加载，便于调试。

### Q5: 线上环境忘记启用 CSP 怎么办？

**答**：
1. 立即添加 `ENABLE_CSP=true` 环境变量
2. 重启服务（零停机部署）
3. 验证响应头中包含 `Content-Security-Policy`

默认值为 `true`，删除 `ENABLE_CSP` 配置也会启用。

## 设计哲学

### KISS 原则
- 一个环境变量解决问题
- 无需修改配置文件结构

### YAGNI 原则
- 不删除未来可能用的代码
- 只实现当前明确所需的功能

### 向后兼容
- 默认行为不变（`ENABLE_CSP=true`）
- 现有部署无需修改

### 安全优先
- 默认启用 CSP
- 显式禁用时有明确警告
- 文档充分说明风险

## 相关文档

- [CSP 配置文件](../config/cspDirectives.js)
- [主应用入口](../app.js)
- [项目 README](../README.md)
- [动态 PPT 与 CSP 优化设计](./动态PPT-提示词与CSP优化设计-20251006.md)

## 变更历史

- **2025-10-11**: 初始版本，添加 `ENABLE_CSP` 开关
