#!/bin/bash

# HTML代码分享工具 - 数据库备份脚本
# 用法: ./scripts/backup.sh [dry-run]

set -euo pipefail

# 配置
PROJECT_NAME="html-go"
BACKUP_DIR="/root/backups/${PROJECT_NAME}"
DB_PATH="${WORKDIR:-/root/html_deploy_aibanxue}/db/html-go.db"
RETENTION_DAYS=30
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="${PROJECT_NAME}-${TIMESTAMP}.db"
COMPRESSED_FILE="${BACKUP_FILE}.gz"
LOG_FILE="/var/log/${PROJECT_NAME}-backup.log"

# 创建备份目录
mkdir -p "$BACKUP_DIR"

# 日志函数
log() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1" | tee -a "$LOG_FILE"
}

# 检查数据库文件
if [ ! -f "$DB_PATH" ]; then
    log "❌ 数据库文件不存在: $DB_PATH"
    exit 1
fi

# 获取数据库文件大小
DB_SIZE=$(du -h "$DB_PATH" | cut -f1)
log "📊 数据库文件大小: $DB_SIZE"

# 检查数据库是否正在使用
if lsof "$DB_PATH" >/dev/null 2>&1; then
    log "⚠️  数据库正在使用中，创建备份前尝试复制"
    
    # 创建临时副本
    TEMP_DB="/tmp/${PROJECT_NAME}-backup-${TIMESTAMP}.db"
    cp "$DB_PATH" "$TEMP_DB"
    DB_PATH="$TEMP_DB"
    trap "rm -f $TEMP_DB" EXIT
fi

# 如果是dry-run模式
if [ "${1:-}" = "dry-run" ]; then
    log "🔍 Dry run 模式 - 不会实际创建备份"
    log "📁 将创建备份文件: ${BACKUP_DIR}/${COMPRESSED_FILE}"
    exit 0
fi

# 执行备份
log "🚀 开始创建备份..."
cd "$BACKUP_DIR"

# 创建备份
if cp "$DB_PATH" "$BACKUP_FILE"; then
    log "✅ 备份文件创建成功: $BACKUP_FILE"
    
    # 压缩备份
    if gzip -f "$BACKUP_FILE"; then
        log "✅ 备份文件压缩成功: $COMPRESSED_FILE"
        
        # 计算压缩后大小
        COMPRESSED_SIZE=$(du -h "${COMPRESSED_FILE}" | cut -f1)
        log "📦 压缩后大小: $COMPRESSED_SIZE"
    else
        log "❌ 压缩失败，保留未压缩文件"
    fi
else
    log "❌ 备份创建失败"
    exit 1
fi

# 清理旧备份
log "🧹 清理 ${RETENTION_DAYS} 天前的备份..."
find "$BACKUP_DIR" -name "${PROJECT_NAME}-*.db.gz" -mtime +$RETENTION_DAYS -type f -delete 2>/dev/null || true
find "$BACKUP_DIR" -name "${PROJECT_NAME}-*.db" -mtime +$RETENTION_DAYS -type f -delete 2>/dev/null || true

# 计算备份文件数量
BACKUP_COUNT=$(find "$BACKUP_DIR" -name "${PROJECT_NAME}-*.db*" -type f | wc -l)
log "📋 当前备份文件数量: $BACKUP_COUNT"

# 验证备份
if [ -f "${COMPRESSED_FILE}" ]; then
    # 测试压缩文件完整性
    if gzip -t "${COMPRESSED_FILE}" 2>/dev/null; then
        log "✅ 备份文件完整性验证通过"
        
        # 显示备份文件信息
        BACKUP_SIZE=$(du -h "${COMPRESSED_FILE}" | cut -f1)
        log "📄 备份文件信息: ${COMPRESSED_FILE} (${BACKUP_SIZE})"
        
        # 可选: 同步到远程存储
        if [ -n "${REMOTE_BACKUP_URL:-}" ]; then
            log "☁️  同步备份到远程存储..."
            if curl -s -T "${COMPRESSED_FILE}" "$REMOTE_BACKUP_URL"; then
                log "✅ 远程同步成功"
            else
                log "❌ 远程同步失败"
            fi
        fi
        
        log "🎉 备份完成!"
    else
        log "❌ 备份文件完整性验证失败"
        rm -f "${COMPRESSED_FILE}"
        exit 1
    fi
else
    log "❌ 备份文件不存在"
    exit 1
fi

# 显示磁盘使用情况
DISK_USAGE=$(df -h "$BACKUP_DIR" | tail -1 | awk '{print $5}')
log "💾 备份目录磁盘使用率: $DISK_USAGE"

# 发送通知（如果配置了webhook）
if [ -n "${WEBHOOK_URL:-}" ]; then
    PAYLOAD=$(cat <<EOF
{
    "text": "✅ ${PROJECT_NAME} 数据库备份完成\\n文件: ${COMPRESSED_FILE}\\n大小: ${BACKUP_SIZE}\\n磁盘使用: ${DISK_USAGE}"
}
EOF
)
    curl -X POST -H 'Content-Type: application/json' -d "$PAYLOAD" "$WEBHOOK_URL" >/dev/null 2>&1 || true
fi