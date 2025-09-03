#!/bin/bash

# HTML代码分享工具 - 健康检查脚本
# 用法: ./scripts/health-check.sh [URL]

set -euo pipefail

# 配置
URL="${1:-http://localhost:8888}"
TIMEOUT=10
RETRIES=3

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

# 健康检查函数
check_health() {
    local url="$1"
    local attempt=1
    
    while [ $attempt -le $RETRIES ]; do
        log "健康检查尝试 $attempt/$RETRIES: $url"
        
        # 使用curl进行健康检查
        if response=$(curl -s -w "\nHTTP_CODE:%{http_code}\nTOTAL_TIME:%{time_total}\n" \
            --connect-timeout "$TIMEOUT" \
            --max-time "$TIMEOUT" \
            "$url/health" 2>/dev/null); then
            
            # 解析响应
            http_code=$(echo "$response" | grep 'HTTP_CODE:' | cut -d':' -f2)
            total_time=$(echo "$response" | grep 'TOTAL_TIME:' | cut -d':' -f2)
            body=$(echo "$response" | sed -e 's/HTTP_CODE:.*$//' -e '/^$/d')
            
            if [ "$http_code" = "200" ]; then
                # 解析JSON响应
                if echo "$body" | jq -e '.status == "healthy"' >/dev/null 2>&1; then
                    uptime=$(echo "$body" | jq -r '.uptime // 0')
                    memory=$(echo "$body" | jq -r '.memory.percentage // 0')
                    response_time=$(echo "$body" | jq -r '.responseTime // 0')
                    
                    log "✅ 健康检查通过"
                    log "   - 状态: $(echo "$body" | jq -r '.status')"
                    log "   - 运行时间: ${uptime}秒"
                    log "   - 内存使用: ${memory}%"
                    log "   - 响应时间: ${response_time}ms"
                    log "   - 请求耗时: ${total_time}s"
                    
                    return 0
                else
                    warn "⚠️  服务响应异常"
                    echo "$body" | jq . 2>/dev/null || echo "$body"
                fi
            else
                warn "⚠️  HTTP状态码: $http_code"
            fi
        else
            error "❌ 请求失败"
        fi
        
        if [ $attempt -lt $RETRIES ]; then
            log "等待5秒后重试..."
            sleep 5
        fi
        
        attempt=$((attempt + 1))
    done
    
    error "❌ 健康检查失败，已尝试 $RETRIES 次"
    return 1
}

# 检查依赖
check_dependencies() {
    if ! command -v curl &> /dev/null; then
        error "curl 未安装"
        exit 1
    fi
    
    if ! command -v jq &> /dev/null; then
        error "jq 未安装"
        exit 1
    fi
}

# 主函数
main() {
    log "开始健康检查..."
    
    check_dependencies
    
    if check_health "$URL"; then
        log "健康检查完成 - 服务正常"
        exit 0
    else
        error "健康检查完成 - 服务异常"
        exit 1
    fi
}

# 执行主函数
main "$@"