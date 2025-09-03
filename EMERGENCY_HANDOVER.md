# HTML-GO 生产环境问题交接文档

## 🔴 紧急问题概览

生产环境存在两个关键问题，影响用户正常使用：

1. **登录认证问题**：输入密码后一直显示"验证中..."，无法进入系统
2. **UI样式问题**：页面显示为白底黑字，所有内容挤在左上角，样式完全丢失

## 📊 问题状态追踪

### 最近修复尝试
- 2025-09-03 14:30: 修复了CSP策略，添加了Google Fonts域名
- 2025-09-03 15:00: 移除了mermaid-render依赖，解决puppeteer下载失败
- 2025-09-03 15:30: 修复了GitHub Actions YAML语法错误
- **结果**：问题依然存在

### 生产环境信息
- 服务器地址：115.190.53.227:8888
- 访问密码：change_me_strong_password
- 部署方式：Docker + PM2
- CI/CD：GitHub Actions自动部署

---

## 🔍 问题1：登录认证卡在"验证中..."

### 现象描述
- 用户输入密码后点击登录
- 页面显示"验证中..."加载动画
- 无任何错误提示，无法进入系统
- 浏览器控制台无明显错误

### 已排查项目

#### 1. 会话配置 ✅
- 文件：`app.js` (第175-190行)
- 状态：已优化会话目录路径配置
- 配置：
  ```javascript
  // 生产环境使用绝对路径
  SESSION_DIR=/usr/src/app/sessions
  ```

#### 2. 登录处理逻辑 ✅
- 文件：`app.js` (第327-335行)
- 状态：已修复会话保存异步问题
- 关键代码：
  ```javascript
  // 等待会话保存完成后再重定向
  req.session.save((err) => {
    if (err) {
      console.error('会话保存失败:', err);
      return res.status(500).json({ success: false, error: '会话保存失败' });
    }
    console.log('- 会话保存成功，重定向到首页');
    return res.redirect('/');
  });
  ```

#### 3. 认证中间件 ✅
- 文件：`middleware/auth.js`
- 状态：支持多种认证方式（session、cookie、API token、API key）

#### 4. 环境变量 ✅
- 文件：`.env`
- 配置：
  ```
  NODE_ENV=production
  AUTH_ENABLED=true
  AUTH_PASSWORD=change_me_strong_password
  SESSION_SECRET=replace_with_a_long_random_session_secret
  SESSION_DIR=/usr/src/app/sessions
  ```

### 🔧 可能的根因

#### 1. Docker容器内会话目录权限问题
**问题描述**：
- 会话目录挂载路径：`./sessions:/usr/src/app/sessions`
- 容器内用户：`nextjs` (UID 1001)
- 可能存在权限不匹配

**排查命令**：
```bash
# 在服务器上执行
docker exec -it html-go bash
ls -la /usr/src/app/sessions/
whoami
id nextjs
```

**解决方案**：
```bash
# 修复权限
sudo chown -R 1001:1001 ./sessions
sudo chmod -R 755 ./sessions
```

#### 2. PM2进程管理问题
**问题描述**：
- PM2可能以不同用户运行
- 会话文件路径可能不匹配

**排查命令**：
```bash
# 查看PM2进程详情
pm2 describe html-go

# 查看进程运行用户
ps aux | grep pm2
```

#### 3. 反向代理配置问题
**问题描述**：
- 如果有Nginx反向代理，可能影响cookie传递
- 可能影响session粘性

**排查命令**：
```bash
# 检查是否有Nginx配置
nginx -T 2>/dev/null | grep -A 10 -B 10 8888
```

---

## 🔍 问题2：UI样式丢失（白底黑字）

### 现象描述
- 页面完全无样式，显示为白底黑字
- 所有内容挤在左上角
- 浏览器控制台显示CSP（内容安全策略）错误

### 已排查项目

#### 1. CSP配置 ✅
- 文件：`app.js` (第83-99行)
- 状态：已添加Google Fonts域名
- 当前配置：
  ```javascript
  styleSrc: ["'self'", "'unsafe-inline'", "https://cdn.jsdelivr.net", "https://cdnjs.cloudflare.com", "https://fonts.googleapis.com"],
  fontSrc: ["'self'", "https://cdn.jsdelivr.net", "https://cdnjs.cloudflare.com", "https://fonts.gstatic.com"]
  ```

#### 2. 静态文件服务 ✅
- 文件：`app.js` (第166-167行)
- 状态：配置了双重静态文件服务
- 配置：
  ```javascript
  app.use('/static', express.static(path.join(__dirname, 'public'), staticOptions));
  app.use(express.static(path.join(__dirname, 'public'), staticOptions));
  ```

#### 3. CSS文件路径 ✅
- 模板文件：`views/index-modern.ejs`
- CSS路径：`/css/design-system.css` 等
- 测试结果：CSS文件可正常访问 (HTTP 200)

### 🔧 可能的根因

#### 1. Docker卷挂载问题
**问题描述**：
- 静态文件挂载：`./public:/usr/src/app/public:ro`
- 可能文件未正确挂载或权限问题

**排查命令**：
```bash
# 检查挂载是否正常
docker exec html-go ls -la /usr/src/app/public/
docker exec html-go ls -la /usr/src/app/public/css/

# 检查文件内容
docker exec html-go head -10 /usr/src/app/public/css/design-system.css
```

#### 2. 缓存问题
**问题描述**：
- 浏览器缓存了旧版本
- CDN缓存问题

**解决方案**：
- 清除浏览器缓存
- 使用硬刷新（Ctrl+F5）
- 在CSS URL后添加版本参数

#### 3. Express静态文件中间件顺序问题
**问题描述**：
- 中间件顺序可能影响静态文件服务
- helmet中间件可能过于严格

**解决方案**：
调整app.js中的中间件顺序

---

## 🚀 紧急修复方案

### 方案A：重新创建容器（推荐）

```bash
# 1. 停止当前容器
docker stop html-go
docker rm html-go

# 2. 备份重要数据
cp -r ./sessions ./sessions.backup
cp -r ./db ./db.backup

# 3. 设置正确权限
sudo chown -R 1001:1001 ./sessions
sudo chmod -R 755 ./sessions
sudo chown -R 1001:1001 ./public
sudo chmod -R 755 ./public

# 4. 重新构建和启动
docker-compose down
docker-compose up -d --build

# 5. 查看日志
docker-compose logs -f
```

### 方案B：直接调试现有容器

```bash
# 1. 进入容器
docker exec -it html-go bash

# 2. 检查文件结构
ls -la /usr/src/app/
ls -la /usr/src/app/sessions/
ls -la /usr/src/app/public/css/

# 3. 检查进程
ps aux | grep node
whoami

# 4. 测试文件访问
curl -I http://localhost:8888/css/design-system.css
```

### 方案C：检查PM2配置

```bash
# 1. 查看PM2状态
pm2 status

# 2. 查看详细日志
pm2 logs html-go --lines 100

# 3. 重启应用
pm2 restart html-go

# 4. 检查环境变量
pm2 describe html-go | grep env
```

---

## 📞 联系信息

### 项目负责人
- **姓名**：[您的姓名]
- **邮箱**：[您的邮箱]
- **电话**：[您的电话]

### 服务器信息
- **提供商**：[云服务商]
- **控制台**：[管理后台地址]
- **SSH**：`ssh user@115.190.53.227`

### 重要提醒
1. 生产环境密码：`change_me_strong_password`
2. 数据库文件：`./db/html-go.db`
3. 会话文件：`./sessions/`
4. 备份频率：每日自动备份

---

## 🎯 快速检查清单

在开始修复前，请先确认：

- [ ] 服务器可正常SSH连接
- [ ] Docker和docker-compose已安装
- [ ] PM2正在运行
- [ ] 防火墙允许8888端口
- [ ] 域名解析正确
- [ ] GitHub Secrets已配置

---

## 📝 相关文件位置

### 核心配置文件
- `.env` - 环境变量
- `docker-compose.yml` - Docker配置
- `app.js` - 主应用文件
- `middleware/auth.js` - 认证中间件

### 日志文件位置
- PM2日志：`~/.pm2/logs/html-go-out.log`
- Docker日志：`docker-compose logs`
- 应用日志：`./logs/`

### 重要目录
- `./db/` - SQLite数据库
- `./sessions/` - 会话文件
- `./public/` - 静态资源

---

**最后更新**：2025-09-03 15:45
**更新人**：Claude AI Assistant
**状态**：等待紧急修复

请尽快处理这些问题，用户无法正常使用系统！