# 多阶段构建 - 优化版本
FROM node:20-alpine AS builder

# 安装构建依赖
RUN apk add --no-cache python3 make g++

# 创建应用目录
WORKDIR /usr/src/app

# 复制package文件
COPY package*.json ./

# 安装所有依赖（包括devDependencies）
RUN npm ci

# 生产阶段
FROM node:20-alpine AS runtime

# 创建非root用户
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nextjs -u 1001

# 安装必要的系统依赖
RUN apk add --no-cache \
    dumb-init \
    curl \
    && rm -rf /var/cache/apk/*

# 创建应用目录
WORKDIR /usr/src/app

# 复制package文件
COPY package*.json ./

# 切换用户
USER nextjs

# 只安装生产依赖
RUN npm ci --omit=dev --no-audit && \
    npm cache clean --force

# 复制应用代码
COPY --chown=nextjs:nodejs . .

# 创建必要目录
RUN mkdir -p db sessions logs && \
    chmod 750 db sessions logs

# 切换回root用户设置权限
USER root

# 创建日志目录并设置权限
RUN mkdir -p /var/log/html-go && \
    chown -R nextjs:nodejs /var/log/html-go

# 切换回应用用户
USER nextjs

# 暴露端口
EXPOSE 8888

# 健康检查
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD curl -f http://localhost:8888/version || exit 1

# 使用dumb-init作为PID 1
ENTRYPOINT ["/usr/bin/dumb-init", "--"]

# 设置环境变量
ENV NODE_ENV=production \
    PORT=8888 \
    # 优化Node.js性能
    NODE_OPTIONS="--max-old-space-size=1024" \
    # 禁用 telemetry
    npm_config_unsafe_perm=true

# 启动应用
CMD ["node", "app.js"]
