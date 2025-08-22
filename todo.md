# HTML-GO 部署与扣子插件开发任务清单

## 项目目标
将 HTML-GO 项目部署到火山引擎云服务器，并在扣子平台开发插件调用该项目存储 HTML 并返回链接的能力。

---

## 一、云上部署准备（必须完成）

### 1.1 域名与备案
- [x] 选择用于对外访问的域名
- [x] 完成域名备案（如需要）
- [x] 配置 DNS 解析（A 记录指向云服务器公网 IP）

### 1.2 云服务器与网络
- [x] 在火山引擎创建云服务器（ECS）
- [x] 配置安全组规则：
  - [x] 开启 80/443 端口（对公网开放）
  - [x] 开启 22 端口（限制为自己的 IP）
  - [x] 业务端口通过反向代理，不直接暴露 8888

### 1.3 运行方式选择（二选一，推荐 Docker）
#### Docker/Compose 方式（推荐）
- [x] 使用现有 `Dockerfile` 和 `docker-compose.yml`
- [x] 配置卷挂载确保持久化：
  - [x] `./db` 目录挂载
  - [x] `./sessions` 目录挂载
  - [x] `.env` 文件挂载

#### PM2/系统服务方式
- [ ] Node.js 直接运行并用 PM2 守护
- [ ] 配置 `systemd` 自启动服务

### 1.4 反向代理与 HTTPS
- [x] 准备 Nginx 配置示例文件 `nginx.conf.example`
- [x] 准备一键证书申请脚本 `scripts/setup-cert.sh`
- [ ] 在服务器上安装并配置 Nginx 或 Caddy
- [ ] 配置反向代理：`http://127.0.0.1:8888` → `https://你的域名`
- [ ] 申请 Let's Encrypt 证书
- [ ] 配置证书自动续期
- [ ] 强制 HTTP 80 → HTTPS 443 跳转

### 1.5 生产环境变量配置
- [x] 创建环境变量模板 `env.example`
- [x] 本地生成 `.env` 文件（包含默认占位值）
- [ ] 在服务器上编辑 `.env` 文件，替换为真实强密码：
  ```env
  NODE_ENV=production
  PORT=8888
  AUTH_ENABLED=true
  AUTH_PASSWORD=<强密码>
  API_TOKEN=<强随机token>
  SESSION_SECRET=<强随机secret>
  DB_PATH=./db/html-go.db
  ```

---

## 二、后端接口与配置优化（建议尽快完成）

### 2.1 API 契约稳定
- [x] 确认创建接口返回 `url` 字段
- [x] 前端修正为使用 `data.url` 而非 `data.urlId`
- [ ] 添加返回 `urlId` 字段（兼容性）
- [ ] 兼容请求体键名：`htmlContent` 与 `html_content`
- [x] 修正返回体的 `isProtected` 语义（当前恒为 true 的问题）

### 2.2 生产配置细节
- [x] 添加 `app.set('trust proxy', 1)`
- [x] 根据环境切换 `cookie.secure` 设置
- [x] 添加 `SESSION_SECRET` 环境变量支持
- [ ] 评估 `bodyParser` 上限（当前 15MB）

### 2.3 安全与稳定性增强
- [ ] 添加 `helmet` 中间件
- [ ] 添加 `compression` 中间件
- [ ] 添加 `express-rate-limit`（针对 `/api/pages/create`）
- [ ] 提供 `robots.txt`（默认 `Disallow: /`）
- [ ] 添加健康检查接口 `GET /healthz`

---

## 三、后台与数据管理（必须完成）

### 3.1 后台管理验证
- [ ] 验证 `GET /admin/dashboard` 功能正常
- [ ] 设置强密码保护
- [ ] 测试页面列表显示和跳转功能

### 3.2 数据持久化与备份
- [ ] 确保 SQLite 文件落在持久卷
- [ ] 确保 `sessions` 目录持久化
- [ ] 设置定时备份策略（对象存储或磁盘快照）

---

## 四、扣子（Coze）插件配置（必须完成）

### 4.1 插件创建与认证
- [ ] 在扣子平台选择"基于 API 创建插件"
- [ ] 配置认证方式：Bearer Token
- [ ] 设置 Header 名称为 `Authorization`

### 4.2 工具与参数配置
- [ ] 设置 Endpoint：`POST https://你的域名/api/pages/create`
- [ ] 配置 Header：`Authorization: Bearer {{API_TOKEN}}`
- [ ] 配置请求体参数：
  - [ ] `htmlContent` 或 `html_content`（必填）
  - [ ] `codeType`（可选：html/markdown/svg/mermaid）
  - [ ] `isProtected`（可选：true/false）

### 4.3 输出映射配置
- [ ] 配置输出字段：
  - [ ] `url`（最终可访问链接）
  - [ ] `success`（操作状态）
  - [ ] `debug_info`（调试信息，可选）

### 4.4 联调验证
- [ ] 在插件调试页面测试 HTML 内容
- [ ] 确认返回的 `url` 可在外网正常访问
- [ ] 测试不同类型内容（HTML、Markdown、SVG、Mermaid）

---

## 五、运维与监控（建议完成）

### 5.1 日志管理
- [ ] 配置 Docker 日志输出（stdout/stderr）
- [ ] 配置日志轮转（logrotate）
- [ ] 生产环境使用 `morgan('combined')`

### 5.2 监控告警
- [ ] 配置基础监控：CPU/内存/磁盘
- [ ] 配置应用存活探针
- [ ] 配置失败率与 5xx 错误统计

### 5.3 回滚与灰度
- [ ] 镜像版本号管理
- [ ] 保留上一版本用于回滚
- [ ] 预生产环境冒烟测试

---

## 六、可选增强功能

### 6.1 文档与工具
- [ ] 生成 OpenAPI/接口文档
- [ ] 创建 Postman/Apifox 测试集合

### 6.2 性能优化
- [ ] 配置 CDN（仅用于 `/static` 静态资源）
- [ ] 注意：`/view/:id` 为动态 HTML，不建议 CDN 缓存

### 6.3 安全隔离
- [ ] 考虑使用专用子域名（如 `pages.example.com`）
- [ ] 隔离用户生成内容对主站的安全影响

---

## 最短路径部署步骤

1. **云服务器准备**
   - [x] 火山引擎创建 ECS 实例
   - [x] 配置安全组和防火墙
   - [ ] 安装 Docker 和 Docker Compose

2. **应用部署**
   - [x] 代码已推送到 GitHub：`https://github.com/zjp1997720/html_deploy_aibanxue.git`
   - [ ] 在服务器上 clone 项目代码
   - [ ] 配置生产环境 `.env` 文件（替换默认密钥）
   - [ ] 使用 Docker Compose 启动应用

3. **反向代理配置**
   - [ ] 安装 Nginx
   - [ ] 配置反向代理和 HTTPS
   - [ ] 测试公网访问

4. **扣子插件开发**
   - [ ] 在扣子平台创建插件
   - [ ] 配置 API 参数和认证
   - [ ] 测试插件功能

---

## 当前状态
- ✅ 基础功能开发完成
- ✅ 本地测试通过
- ✅ 生产环境配置文件准备完成
- ✅ 代码已推送到 GitHub
- ⏳ 服务器部署进行中
- ⏳ 扣子插件开发待开始

---

## 🚀 下一步操作指引

### 在你的火山引擎服务器上执行：

```bash
# 1. 安装基础软件
sudo apt update
sudo apt install -y git curl ca-certificates gnupg

# 2. 安装 Docker
curl -fsSL https://get.docker.com | sudo sh
sudo usermod -aG docker $USER
# 重新登录或执行: newgrp docker

# 3. 拉取代码
cd /opt
sudo git clone https://github.com/zjp1997720/html_deploy_aibanxue.git html-go
sudo chown -R $USER:$USER html-go
cd html-go

# 4. 配置环境变量
cp env.example .env
# 编辑 .env 文件，替换密码和密钥为真实值
nano .env

# 5. 启动应用
bash scripts/deploy.sh

# 6. 配置 Nginx 和 HTTPS
sudo apt install -y nginx
sudo cp nginx.conf.example /etc/nginx/conf.d/html-go.conf
# 编辑配置文件，替换 YOUR_DOMAIN 为你的域名
sudo nano /etc/nginx/conf.d/html-go.conf
# 申请证书（替换为你的域名和邮箱）
sudo bash scripts/setup-cert.sh agent.aibanxue.top 1009326159@qq.com
```

### 验证部署：
- 检查应用状态：`docker compose ps`
- 检查日志：`docker compose logs -f`
- 访问：`https://你的域名`

---

*最后更新时间：2025-01-25* 