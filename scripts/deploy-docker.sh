#!/bin/bash

# HTML代码分享工具 - Docker部署脚本
# 用法: ./scripts/deploy-docker.sh [dev|prod]

set -euo pipefail

# 配置
PROJECT_NAME="html-go"
COMPOSE_FILE="docker-compose.yml"
OVERRIDE_FILE="docker-compose.override.yml"

# 颜色输出
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# 日志函数
log() {
    echo -e "${GREEN}[$(date '+%Y-%m-%d %H:%M:%S')] $1${NC}"
}

warn() {
    echo -e "${YELLOW}[$(date '+%Y-%m-%d %H:%M:%S')] $1${NC}"
}

error() {
    echo -e "${RED}[$(date '+%Y-%m-%d %H:%M:%S')] $1${NC}"
}

# 检查Docker和Docker Compose
check_prerequisites() {
    log "检查前置条件..."
    
    if ! command -v docker &> /dev/null; then
        error "Docker 未安装或未在 PATH 中"
        exit 1
    fi
    
    if ! command -v docker-compose &> /dev/null; then
        error "Docker Compose 未安装或未在 PATH 中"
        exit 1
    fi
    
    log "✅ Docker 和 Docker Compose 已就绪"
}

# 构建镜像
build_image() {
    local env="${1:-prod}"
    
    log "构建 Docker 镜像..."
    
    if [ "$env" = "dev" ] && [ -f "$OVERRIDE_FILE" ]; then
        docker-compose -f "$COMPOSE_FILE" -f "$OVERRIDE_FILE" build
    else
        docker-compose build
    fi
    
    log "✅ 镜像构建完成"
}

# 启动服务
start_service() {
    local env="${1:-prod}"
    
    log "启动服务..."
    
    if [ "$env" = "dev" ] && [ -f "$OVERRIDE_FILE" ]; then
        docker-compose -f "$COMPOSE_FILE" -f "$OVERRIDE_FILE" up -d
    else
        docker-compose up -d
    fi
    
    log "✅ 服务启动完成"
}

# 停止服务
stop_service() {
    local env="${1:-prod}"
    
    log "停止服务..."
    
    if [ "$env" = "dev" ] && [ -f "$OVERRIDE_FILE" ]; then
        docker-compose -f "$COMPOSE_FILE" -f "$OVERRIDE_FILE" down
    else
        docker-compose down
    fi
    
    log "✅ 服务已停止"
}

# 查看日志
view_logs() {
    local env="${1:-prod}"
    
    if [ "$env" = "dev" ] && [ -f "$OVERRIDE_FILE" ]; then
        docker-compose -f "$COMPOSE_FILE" -f "$OVERRIDE_FILE" logs -f
    else
        docker-compose logs -f
    fi
}

# 检查服务状态
check_status() {
    log "检查服务状态..."
    
    # 检查容器状态
    docker-compose ps
    
    # 检查健康状态
    if docker-compose exec -T html-go curl -f http://localhost:8888/version >/dev/null 2>&1; then
        log "✅ 应用运行正常"
        docker-compose exec -T html-go curl -s http://localhost:8888/version | jq .
    else
        warn "⚠️  应用可能未正常启动"
    fi
}

# 备份数据
backup_data() {
    log "创建数据备份..."
    
    # 创建备份目录
    mkdir -p backups
    
    # 备份数据库
    BACKUP_FILE="backups/html-go-$(date +%Y%m%d_%H%M%S).db"
    docker-compose exec -T html-go sqlite3 db/html-go.db ".backup /tmp/backup.db"
    docker cp $(docker-compose ps -q html-go):/tmp/backup.db "$BACKUP_FILE"
    
    # 压缩备份
    gzip -f "$BACKUP_FILE"
    
    log "✅ 数据备份完成: ${BACKUP_FILE}.gz"
}

# 更新服务
update_service() {
    local env="${1:-prod}"
    
    log "更新服务..."
    
    # 拉取最新代码
    if [ -d ".git" ]; then
        git pull origin main
    fi
    
    # 重新构建和启动
    build_image "$env"
    stop_service "$env"
    start_service "$env"
    
    # 检查状态
    sleep 10
    check_status
}

# 显示帮助
show_help() {
    cat << EOF
HTML代码分享工具 - Docker部署脚本

用法: $0 <命令> [环境]

命令:
    build   - 构建Docker镜像
    start   - 启动服务
    stop    - 停止服务
    restart - 重启服务
    logs    - 查看日志
    status  - 检查服务状态
    backup  - 备份数据
    update  - 更新服务
    help    - 显示帮助

环境:
    dev     - 开发环境（需要 docker-compose.override.yml）
    prod    - 生产环境（默认）

示例:
    $0 start prod      # 启动生产环境
    $0 start dev       # 启动开发环境
    $0 logs            # 查看生产环境日志
    $0 backup          # 备份数据
EOF
}

# 主函数
main() {
    local command="${1:-help}"
    local env="${2:-prod}"
    
    # 检查是否在正确的目录
    if [ ! -f "$COMPOSE_FILE" ]; then
        error "未找到 $COMPOSE_FILE，请在项目根目录运行此脚本"
        exit 1
    fi
    
    case "$command" in
        build)
            check_prerequisites
            build_image "$env"
            ;;
        start)
            check_prerequisites
            start_service "$env"
            ;;
        stop)
            stop_service "$env"
            ;;
        restart)
            stop_service "$env"
            sleep 2
            start_service "$env"
            ;;
        logs)
            view_logs "$env"
            ;;
        status)
            check_status
            ;;
        backup)
            backup_data
            ;;
        update)
            check_prerequisites
            update_service "$env"
            ;;
        help|--help|-h)
            show_help
            ;;
        *)
            error "未知命令: $command"
            show_help
            exit 1
            ;;
    esac
}

# 执行主函数
main "$@"