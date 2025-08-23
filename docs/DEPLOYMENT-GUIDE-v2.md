# HTML Deploy Project 部署指南 v2.0

## 目录
- [概述](#概述)
- [系统要求](#系统要求)
- [开发环境部署](#开发环境部署)
- [生产环境部署](#生产环境部署)
- [Docker部署](#docker部署)
- [CI/CD部署](#cicd部署)
- [环境配置](#环境配置)
- [数据库管理](#数据库管理)
- [性能优化](#性能优化)
- [监控和日志](#监控和日志)
- [安全配置](#安全配置)
- [故障排除](#故障排除)

## 概述

HTML Deploy Project 是一个基于 Node.js 的 Web 应用程序，支持页面托管、API密钥管理和性能监控功能。本指南将帮助您在不同环境中成功部署该项目。

### 架构概览
- **后端**: Node.js + Express.js
- **数据库**: SQLite (可扩展到 PostgreSQL/MySQL)
- **前端**: EJS 模板 + Vanilla JavaScript
- **会话存储**: 文件系统 (可扩展到 Redis)
- **部署**: Docker + PM2 + Nginx

## 系统要求

### 最低要求
- **操作系统**: Linux (Ubuntu 18.04+), macOS (10.14+), Windows 10+
- **Node.js**: 16.x 或更高版本
- **内存**: 512MB RAM
- **存储**: 1GB 可用空间
- **网络**: 公网IP（生产环境）

### 推荐配置
- **操作系统**: Ubuntu 20.04 LTS
- **Node.js**: 18.x LTS
- **内存**: 2GB RAM
- **存储**: 10GB 可用空间 (SSD)
- **CPU**: 2核心
- **网络**: 100Mbps 带宽

### 依赖软件
```bash
# Ubuntu/Debian
sudo apt update
sudo apt install -y nodejs npm git nginx

# CentOS/RHEL
sudo yum install -y nodejs npm git nginx

# macOS
brew install node git nginx

# Windows
# 请从官网下载安装包：
# - Node.js: https://nodejs.org/
# - Git: https://git-scm.com/
```

## 开发环境部署

### 1. 克隆项目
```bash
git clone https://github.com/your-username/html-deploy-project.git
cd html-deploy-project
```

### 2. 安装依赖
```bash
# 安装项目依赖
npm install

# 全局安装开发工具
npm install -g nodemon
```

### 3. 环境配置
```bash
# 复制环境配置文件
cp env.example .env

# 编辑配置文件
nano .env
```

**开发环境配置示例 (.env):**
```env
# 环境配置
NODE_ENV=development
PORT=5678

# 认证配置
AUTH_ENABLED=true
AUTH_PASSWORD=your_admin_password
API_TOKEN=your_api_token

# 数据库配置
DB_PATH=./db/html-go.db

# 调试配置
DEBUG=true
LOG_LEVEL=debug

# 性能监控
ENABLE_PERFORMANCE_MONITORING=true
ENABLE_MEMORY_MONITORING=true
ENABLE_CACHE=true
```

### 4. 数据库初始化
```bash
# 创建数据库目录
mkdir -p db sessions

# 运行数据库迁移
npm run migrate

# 可选：运行 Phase 3 优化
node scripts/optimize-database-phase3.js
node scripts/create-performance-logs.js
```

### 5. 启动开发服务器
```bash
# 使用 nodemon 启动（推荐）
npm run dev

# 或者使用 node 直接启动
npm start

# 检查服务状态
curl http://localhost:5678/health
```

### 6. 验证安装
- 访问 http://localhost:5678
- 访问管理后台 http://localhost:5678/admin/dashboard
- 检查 API 端点 http://localhost:5678/api/admin/stats

## 生产环境部署

### 1. 服务器准备
```bash
# 更新系统
sudo apt update && sudo apt upgrade -y

# 安装必要软件
sudo apt install -y nodejs npm git nginx pm2 ufw

# 创建应用用户
sudo adduser --system --group htmldeploy
sudo mkdir -p /opt/htmldeploy
sudo chown htmldeploy:htmldeploy /opt/htmldeploy
```

### 2. 部署应用
```bash
# 切换到应用用户
sudo su - htmldeploy

# 克隆项目到生产目录
cd /opt/htmldeploy
git clone https://github.com/your-username/html-deploy-project.git app
cd app

# 安装生产依赖
npm ci --only=production

# 设置权限
chmod +x scripts/*.sh
```

### 3. 生产环境配置
```bash
# 创建生产环境配置
cat > .env << EOF
# 生产环境配置
NODE_ENV=production
PORT=8888

# 认证配置
AUTH_ENABLED=true
AUTH_PASSWORD=$(openssl rand -base64 32)
API_TOKEN=$(openssl rand -base64 48)

# 数据库配置
DB_PATH=/opt/htmldeploy/data/html-go.db

# 性能配置
ENABLE_PERFORMANCE_MONITORING=true
ENABLE_MEMORY_MONITORING=true
ENABLE_CACHE=true

# 安全配置
HELMET_ENABLED=true
RATE_LIMIT_ENABLED=true
CORS_ORIGIN=https://yourdomain.com

# 日志配置
LOG_LEVEL=info
LOG_FILE=/opt/htmldeploy/logs/app.log
EOF

# 创建数据和日志目录
mkdir -p /opt/htmldeploy/data /opt/htmldeploy/logs
```

### 4. 数据库初始化
```bash
# 运行数据库迁移
npm run migrate

# 优化数据库
node scripts/optimize-database-phase3.js
node scripts/create-performance-logs.js

# 设置数据库权限
chmod 640 /opt/htmldeploy/data/html-go.db
```

### 5. PM2 进程管理
```bash
# 创建 PM2 配置文件
cat > ecosystem.config.js << EOF
module.exports = {
  apps: [{
    name: 'htmldeploy',
    script: 'app.js',
    cwd: '/opt/htmldeploy/app',
    user: 'htmldeploy',
    instances: 'max',
    exec_mode: 'cluster',
    env: {
      NODE_ENV: 'production',
      PORT: 8888
    },
    error_file: '/opt/htmldeploy/logs/error.log',
    out_file: '/opt/htmldeploy/logs/out.log',
    log_file: '/opt/htmldeploy/logs/combined.log',
    time: true,
    autorestart: true,
    watch: false,
    max_memory_restart: '1G',
    node_args: '--max-old-space-size=1024 --expose-gc',
    env_production: {
      NODE_ENV: 'production'
    }
  }]
};
EOF

# 启动应用
pm2 start ecosystem.config.js --env production
pm2 save
pm2 startup
```

### 6. Nginx 反向代理
```bash
# 创建 Nginx 配置
sudo tee /etc/nginx/sites-available/htmldeploy << EOF
server {
    listen 80;
    server_name yourdomain.com www.yourdomain.com;

    # 安全头
    add_header X-Frame-Options DENY;
    add_header X-Content-Type-Options nosniff;
    add_header X-XSS-Protection "1; mode=block";
    add_header Referrer-Policy strict-origin-when-cross-origin;

    # 日志
    access_log /var/log/nginx/htmldeploy.access.log;
    error_log /var/log/nginx/htmldeploy.error.log;

    # 静态文件
    location /public/ {
        alias /opt/htmldeploy/app/public/;
        expires 30d;
        add_header Cache-Control "public, no-transform";
    }

    # API 限流
    location /api/ {
        limit_req zone=api burst=20 nodelay;
        proxy_pass http://127.0.0.1:8888;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_cache_bypass \$http_upgrade;
        proxy_read_timeout 300;
        proxy_connect_timeout 300;
        proxy_send_timeout 300;
    }

    # 管理后台
    location /admin/ {
        limit_req zone=admin burst=10 nodelay;
        proxy_pass http://127.0.0.1:8888;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_cache_bypass \$http_upgrade;
    }

    # 默认路由
    location / {
        proxy_pass http://127.0.0.1:8888;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_cache_bypass \$http_upgrade;
    }

    # 健康检查
    location /health {
        access_log off;
        proxy_pass http://127.0.0.1:8888;
    }
}
EOF

# 配置限流
sudo tee -a /etc/nginx/nginx.conf << EOF
http {
    # 限流配置
    limit_req_zone \$binary_remote_addr zone=api:10m rate=100r/m;
    limit_req_zone \$binary_remote_addr zone=admin:10m rate=20r/m;
    
    # 现有配置...
}
EOF

# 启用站点
sudo ln -s /etc/nginx/sites-available/htmldeploy /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

### 7. SSL 证书配置
```bash
# 安装 Certbot
sudo apt install -y certbot python3-certbot-nginx

# 获取 SSL 证书
sudo certbot --nginx -d yourdomain.com -d www.yourdomain.com

# 自动续期
echo "0 12 * * * /usr/bin/certbot renew --quiet" | sudo crontab -
```

### 8. 防火墙配置
```bash
# 配置 UFW
sudo ufw default deny incoming
sudo ufw default allow outgoing
sudo ufw allow ssh
sudo ufw allow 'Nginx Full'
sudo ufw --force enable
```

## Docker部署

### 1. Dockerfile
项目已包含 `Dockerfile`，无需修改：
```dockerfile
FROM node:18-alpine

WORKDIR /app

# 复制 package 文件
COPY package*.json ./

# 安装依赖
RUN npm ci --only=production && npm cache clean --force

# 复制应用代码
COPY . .

# 创建非 root 用户
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nextjs -u 1001

# 设置权限
RUN chown -R nextjs:nodejs /app
USER nextjs

# 暴露端口
EXPOSE 8888

# 健康检查
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD curl -f http://localhost:8888/health || exit 1

# 启动应用
CMD ["npm", "start"]
```

### 2. Docker Compose
```yaml
# docker-compose.yml
version: '3.8'

services:
  app:
    build: .
    ports:
      - "8888:8888"
    environment:
      - NODE_ENV=production
      - PORT=8888
      - AUTH_ENABLED=true
      - AUTH_PASSWORD=${AUTH_PASSWORD}
      - API_TOKEN=${AUTH_TOKEN}
    volumes:
      - ./data:/app/db
      - ./logs:/app/logs
      - ./sessions:/app/sessions
    restart: unless-stopped
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:8888/health"]
      interval: 30s
      timeout: 10s
      retries: 3
      start_period: 40s

  nginx:
    image: nginx:alpine
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./nginx.conf:/etc/nginx/nginx.conf
      - ./ssl:/etc/nginx/ssl
    depends_on:
      - app
    restart: unless-stopped

  # 可选：Redis 用于会话存储
  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"
    volumes:
      - redis_data:/data
    restart: unless-stopped

volumes:
  redis_data:
```

### 3. Docker 部署步骤
```bash
# 克隆项目
git clone https://github.com/your-username/html-deploy-project.git
cd html-deploy-project

# 创建环境配置
cat > .env << EOF
AUTH_PASSWORD=$(openssl rand -base64 32)
API_TOKEN=$(openssl rand -base64 48)
EOF

# 创建数据目录
mkdir -p data logs sessions

# 构建并启动
docker-compose up -d

# 查看日志
docker-compose logs -f

# 检查状态
docker-compose ps
curl http://localhost:8888/health
```

### 4. Docker 生产优化
```bash
# 使用多阶段构建优化镜像大小
cat > Dockerfile.production << EOF
# 构建阶段
FROM node:18-alpine AS builder

WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production && npm cache clean --force

# 生产阶段
FROM node:18-alpine AS production

RUN apk add --no-cache curl
WORKDIR /app

# 创建用户
RUN addgroup -g 1001 -S nodejs && \
    adduser -S htmldeploy -u 1001

# 复制文件
COPY --from=builder /app/node_modules ./node_modules
COPY --chown=htmldeploy:nodejs . .

USER htmldeploy

EXPOSE 8888

HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD curl -f http://localhost:8888/health || exit 1

CMD ["npm", "start"]
EOF

# 构建优化镜像
docker build -f Dockerfile.production -t htmldeploy:production .
```

## CI/CD部署

### 1. GitHub Actions
```yaml
# .github/workflows/deploy.yml
name: Deploy to Production

on:
  push:
    branches: [ main ]
  pull_request:
    branches: [ main ]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
    - uses: actions/checkout@v3
    
    - name: Setup Node.js
      uses: actions/setup-node@v3
      with:
        node-version: '18'
        cache: 'npm'
    
    - name: Install dependencies
      run: npm ci
    
    - name: Run tests
      run: npm test
    
    - name: Run Phase 3 tests
      run: node tests/phase3-performance-test.js

  deploy:
    needs: test
    runs-on: ubuntu-latest
    if: github.ref == 'refs/heads/main'
    
    steps:
    - uses: actions/checkout@v3
    
    - name: Deploy to server
      uses: appleboy/ssh-action@v0.1.5
      with:
        host: ${{ secrets.HOST }}
        username: ${{ secrets.USERNAME }}
        key: ${{ secrets.SSH_KEY }}
        script: |
          cd /opt/htmldeploy/app
          git pull origin main
          npm ci --only=production
          pm2 reload htmldeploy
          pm2 save
```

### 2. GitLab CI/CD
```yaml
# .gitlab-ci.yml
stages:
  - test
  - build
  - deploy

variables:
  NODE_VERSION: "18"

test:
  stage: test
  image: node:18-alpine
  cache:
    paths:
      - node_modules/
  script:
    - npm ci
    - npm test
    - node tests/phase3-performance-test.js
  only:
    - merge_requests
    - main

build:
  stage: build
  image: docker:latest
  services:
    - docker:dind
  script:
    - docker build -t $CI_REGISTRY_IMAGE:$CI_COMMIT_SHA .
    - docker push $CI_REGISTRY_IMAGE:$CI_COMMIT_SHA
  only:
    - main

deploy:
  stage: deploy
  image: alpine:latest
  before_script:
    - apk add --no-cache openssh-client
    - eval $(ssh-agent -s)
    - echo "$SSH_PRIVATE_KEY" | tr -d '\r' | ssh-add -
    - mkdir -p ~/.ssh
    - chmod 700 ~/.ssh
  script:
    - ssh -o StrictHostKeyChecking=no $SERVER_USER@$SERVER_HOST "
        cd /opt/htmldeploy/app &&
        git pull origin main &&
        npm ci --only=production &&
        pm2 reload htmldeploy"
  only:
    - main
```

### 3. 自动化部署脚本
```bash
#!/bin/bash
# scripts/deploy.sh

set -e

echo "🚀 开始部署..."

# 检查环境
if [ "$NODE_ENV" != "production" ]; then
    echo "❌ 请在生产环境中运行此脚本"
    exit 1
fi

# 备份数据库
echo "📦 备份数据库..."
cp /opt/htmldeploy/data/html-go.db /opt/htmldeploy/data/html-go.db.backup.$(date +%Y%m%d_%H%M%S)

# 更新代码
echo "📥 更新代码..."
git pull origin main

# 安装依赖
echo "📦 安装依赖..."
npm ci --only=production

# 运行迁移
echo "🗄️ 运行数据库迁移..."
npm run migrate

# 重启服务
echo "🔄 重启服务..."
pm2 reload htmldeploy

# 健康检查
echo "🏥 健康检查..."
sleep 5
if curl -f http://localhost:8888/health; then
    echo "✅ 部署成功！"
else
    echo "❌ 健康检查失败，请检查日志"
    pm2 logs htmldeploy --lines 50
    exit 1
fi

echo "🎉 部署完成！"
```

## 环境配置

### 1. 环境变量说明
| 变量名 | 说明 | 默认值 | 必需 |
|--------|------|--------|------|
| NODE_ENV | 运行环境 | development | 是 |
| PORT | 端口号 | 5678 | 否 |
| AUTH_ENABLED | 启用认证 | true | 否 |
| AUTH_PASSWORD | 管理员密码 | - | 是 |
| API_TOKEN | API 令牌 | - | 是 |
| DB_PATH | 数据库路径 | ./db/html-go.db | 否 |
| LOG_LEVEL | 日志级别 | info | 否 |
| ENABLE_PERFORMANCE_MONITORING | 性能监控 | true | 否 |
| ENABLE_MEMORY_MONITORING | 内存监控 | true | 否 |
| ENABLE_CACHE | 缓存功能 | true | 否 |

### 2. 配置文件模板
```bash
# 开发环境 (.env.development)
NODE_ENV=development
PORT=5678
DEBUG=true
LOG_LEVEL=debug

# 测试环境 (.env.test)
NODE_ENV=test
PORT=5679
DB_PATH=./db/test.db

# 生产环境 (.env.production)
NODE_ENV=production
PORT=8888
LOG_LEVEL=info
HELMET_ENABLED=true
```

## 数据库管理

### 1. 数据库迁移
```bash
# 运行所有迁移
npm run migrate

# 检查数据库状态
node scripts/check-db-status.js

# 优化数据库性能
node scripts/optimize-database-phase3.js

# 创建性能日志表
node scripts/create-performance-logs.js
```

### 2. 备份与恢复
```bash
# 备份脚本
#!/bin/bash
# scripts/backup.sh

BACKUP_DIR="/opt/htmldeploy/backups"
DATE=$(date +%Y%m%d_%H%M%S)
DB_PATH="/opt/htmldeploy/data/html-go.db"

mkdir -p $BACKUP_DIR

# 备份数据库
cp $DB_PATH "$BACKUP_DIR/html-go.db.$DATE"

# 压缩备份
gzip "$BACKUP_DIR/html-go.db.$DATE"

# 清理旧备份（保留7天）
find $BACKUP_DIR -name "*.gz" -mtime +7 -delete

echo "备份完成: html-go.db.$DATE.gz"

# 设置定时备份
# 0 2 * * * /opt/htmldeploy/app/scripts/backup.sh
```

### 3. 数据库维护
```bash
# 数据库优化脚本
#!/bin/bash
# scripts/db-maintenance.sh

DB_PATH="/opt/htmldeploy/data/html-go.db"

echo "开始数据库维护..."

# 分析查询计划
sqlite3 $DB_PATH "ANALYZE;"

# 清理已删除数据
sqlite3 $DB_PATH "VACUUM;"

# 检查完整性
sqlite3 $DB_PATH "PRAGMA integrity_check;"

echo "数据库维护完成"
```

## 性能优化

### 1. Node.js 优化
```bash
# PM2 优化配置
module.exports = {
  apps: [{
    name: 'htmldeploy',
    script: 'app.js',
    instances: 'max',
    exec_mode: 'cluster',
    node_args: [
      '--max-old-space-size=1024',
      '--expose-gc',
      '--optimize-for-size',
      '--gc-interval=100'
    ],
    env: {
      UV_THREADPOOL_SIZE: 128,
      NODE_OPTIONS: '--max-old-space-size=1024'
    }
  }]
};
```

### 2. Nginx 优化
```nginx
# nginx.conf 性能优化
worker_processes auto;
worker_connections 1024;

http {
    # 启用 gzip 压缩
    gzip on;
    gzip_vary on;
    gzip_min_length 1024;
    gzip_types text/plain text/css application/json application/javascript text/xml application/xml;

    # 缓存配置
    proxy_cache_path /var/cache/nginx levels=1:2 keys_zone=htmldeploy:10m max_size=100m;
    
    # 限流配置
    limit_req_zone $binary_remote_addr zone=api:10m rate=100r/m;
    limit_req_zone $binary_remote_addr zone=admin:10m rate=20r/m;
    
    # 连接池
    upstream htmldeploy_backend {
        least_conn;
        server 127.0.0.1:8888 max_fails=3 fail_timeout=30s;
        keepalive 32;
    }
}
```

### 3. 数据库优化
```sql
-- 创建索引
CREATE INDEX IF NOT EXISTS idx_pages_created_at ON pages(created_at);
CREATE INDEX IF NOT EXISTS idx_pages_is_protected ON pages(is_protected);
CREATE INDEX IF NOT EXISTS idx_pages_code_type ON pages(code_type);

-- 配置优化
PRAGMA journal_mode = WAL;
PRAGMA synchronous = NORMAL;
PRAGMA cache_size = -64000;
PRAGMA temp_store = MEMORY;
```

## 监控和日志

### 1. 应用监控
```bash
# 安装监控工具
npm install -g @pm2/pm2-plus-cli

# 连接 PM2 Plus
pm2 plus

# 或使用本地监控
pm2 monit
```

### 2. 日志管理
```bash
# PM2 日志配置
pm2 install pm2-logrotate
pm2 set pm2-logrotate:max_size 10M
pm2 set pm2-logrotate:retain 7
pm2 set pm2-logrotate:dateFormat YYYY-MM-DD_HH-mm-ss
```

### 3. 系统监控
```bash
# 安装系统监控
sudo apt install -y htop iotop nethogs

# 监控脚本
#!/bin/bash
# scripts/monitor.sh

while true; do
    echo "=== $(date) ==="
    echo "CPU使用率: $(top -bn1 | grep "Cpu(s)" | awk '{print $2}' | awk -F'%' '{print $1}')"
    echo "内存使用: $(free -m | awk 'NR==2{printf "%.1f%%", $3*100/$2 }')"
    echo "磁盘使用: $(df -h / | awk 'NR==2{print $5}')"
    echo "应用状态: $(pm2 jlist | jq '.[0].pm2_env.status')"
    echo "=================="
    sleep 60
done
```

## 安全配置

### 1. 系统安全
```bash
# 更新系统
sudo apt update && sudo apt upgrade -y

# 配置防火墙
sudo ufw default deny incoming
sudo ufw default allow outgoing
sudo ufw allow ssh
sudo ufw allow 'Nginx Full'
sudo ufw enable

# 配置 SSH 安全
sudo sed -i 's/#PasswordAuthentication yes/PasswordAuthentication no/' /etc/ssh/sshd_config
sudo sed -i 's/#PubkeyAuthentication yes/PubkeyAuthentication yes/' /etc/ssh/sshd_config
sudo systemctl restart ssh

# 安装 fail2ban
sudo apt install -y fail2ban
sudo systemctl enable fail2ban
```

### 2. 应用安全
```javascript
// 安全中间件配置
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');

// 设置安全头
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "https:"],
    },
  },
}));

// API 限流
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15分钟
  max: 100, // 每IP最多100次请求
  message: '请求频率过高，请稍后再试'
});

app.use('/api/', apiLimiter);
```

### 3. HTTPS 配置
```bash
# 自动获取 SSL 证书
sudo certbot --nginx -d yourdomain.com

# 手动配置 SSL
sudo mkdir -p /etc/nginx/ssl
sudo openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
    -keyout /etc/nginx/ssl/nginx-selfsigned.key \
    -out /etc/nginx/ssl/nginx-selfsigned.crt
```

## 故障排除

### 1. 常见问题

#### 端口冲突
```bash
# 检查端口占用
sudo netstat -tlnp | grep :8888
sudo lsof -i :8888

# 杀死占用进程
sudo kill -9 <PID>

# 修改端口配置
echo "PORT=8889" >> .env
```

#### 数据库锁定
```bash
# 检查数据库状态
sqlite3 /opt/htmldeploy/data/html-go.db ".timeout 30000"

# 释放锁定
fuser -k /opt/htmldeploy/data/html-go.db

# 修复数据库
sqlite3 /opt/htmldeploy/data/html-go.db "PRAGMA integrity_check;"
```

#### 内存不足
```bash
# 检查内存使用
free -h
ps aux --sort=-%mem | head

# 增加交换空间
sudo fallocate -l 2G /swapfile
sudo chmod 600 /swapfile
sudo mkswap /swapfile
sudo swapon /swapfile
echo '/swapfile none swap sw 0 0' | sudo tee -a /etc/fstab
```

### 2. 日志分析
```bash
# PM2 日志
pm2 logs htmldeploy --lines 100

# Nginx 日志
sudo tail -f /var/log/nginx/htmldeploy.error.log
sudo tail -f /var/log/nginx/htmldeploy.access.log

# 系统日志
sudo journalctl -u nginx -f
sudo journalctl -f
```

### 3. 性能诊断
```bash
# 检查应用性能
curl -w "@curl-format.txt" -o /dev/null -s http://localhost:8888/api/admin/stats

# 数据库性能
sqlite3 /opt/htmldeploy/data/html-go.db ".timer on" ".stats on" "SELECT COUNT(*) FROM pages;"

# 系统性能
top -p $(pgrep -f "node.*app.js")
iostat -x 1 5
```

### 4. 健康检查脚本
```bash
#!/bin/bash
# scripts/health-check.sh

URL="http://localhost:8888/health"
TIMEOUT=10

echo "开始健康检查..."

# 检查应用响应
if curl -f --max-time $TIMEOUT "$URL" > /dev/null 2>&1; then
    echo "✅ 应用健康"
else
    echo "❌ 应用异常"
    exit 1
fi

# 检查数据库
if sqlite3 /opt/htmldeploy/data/html-go.db "SELECT 1;" > /dev/null 2>&1; then
    echo "✅ 数据库正常"
else
    echo "❌ 数据库异常"
    exit 1
fi

# 检查磁盘空间
DISK_USAGE=$(df / | awk 'NR==2{print $5}' | sed 's/%//')
if [ $DISK_USAGE -lt 90 ]; then
    echo "✅ 磁盘空间充足 ($DISK_USAGE%)"
else
    echo "⚠️ 磁盘空间不足 ($DISK_USAGE%)"
fi

echo "健康检查完成"
```

## 更新日志

### v2.0 (2025-01-23)
- ✨ 新增 Docker 部署支持
- ✨ 新增 CI/CD 配置示例
- ✨ 新增性能监控部署指南
- ✨ 新增内存和缓存管理配置
- 🔧 优化生产环境配置
- 📝 完善故障排除指南

### v1.0 (2025-01-20)
- 🎉 初始部署指南
- ✨ 基础环境配置
- ✨ 系统要求说明

## 联系支持

如需部署支持，请联系：
- 📧 邮箱: devops@example.com
- 💬 Slack: #deployment-help
- 📖 Wiki: 内部部署文档 