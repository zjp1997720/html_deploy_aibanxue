#!/bin/bash

# 数据库维护脚本
# 用于备份、恢复和修复SQLite数据库

set -e

# 颜色输出
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# 数据库路径
DB_PATH="./db/html-go.db"
BACKUP_DIR="./db/backups"

echo -e "${GREEN}=== HTML-Go 数据库维护工具 ===${NC}"

# 检查数据库文件是否存在
if [ ! -f "$DB_PATH" ]; then
    echo -e "${YELLOW}数据库文件不存在: $DB_PATH${NC}"
    echo "将在首次启动时创建新数据库"
    exit 0
fi

# 创建备份目录
mkdir -p "$BACKUP_DIR"

# 菜单选择
echo "请选择操作:"
echo "1) 查看数据库状态"
echo "2) 创建备份"
echo "3) 列出备份"
echo "4) 恢复备份"
echo "5) 检查数据库完整性"
echo "6) 修复数据库（危险）"
echo "7) 清理旧备份"
echo "0) 退出"
read -p "请输入选项 (0-7): " choice

case $choice in
    1)
        echo -e "${GREEN}数据库状态:${NC}"
        echo "文件路径: $DB_PATH"
        echo "文件大小: $(du -h "$DB_PATH" | cut -f1)"
        echo "修改时间: $(stat -f %Sm "$DB_PATH" 2>/dev/null || stat -c %y "$DB_PATH")"
        echo "备份数量: $(ls -1 "$BACKUP_DIR"/*.db 2>/dev/null | wc -l)"
        ;;
        
    2)
        echo -e "${GREEN}创建数据库备份...${NC}"
        TIMESTAMP=$(date +%Y%m%d_%H%M%S)
        BACKUP_FILE="$BACKUP_DIR/html-go-$TIMESTAMP.db"
        cp "$DB_PATH" "$BACKUP_FILE"
        echo -e "${GREEN}备份创建成功: $BACKUP_FILE${NC}"
        ;;
        
    3)
        echo -e "${GREEN}可用备份列表:${NC}"
        ls -lah "$BACKUP_DIR"/*.db 2>/dev/null | awk '{print $9 " | " $5 " | " $6" "$7" "$8}' || echo "没有找到备份"
        ;;
        
    4)
        echo "可用备份:"
        i=0
        for backup in "$BACKUP_DIR"/*.db; do
            if [ -f "$backup" ]; then
                i=$((i+1))
                echo "$i) $(basename "$backup") ($(du -h "$backup" | cut -f1))"
            fi
        done
        
        if [ $i -eq 0 ]; then
            echo -e "${RED}没有找到备份${NC}"
            exit 1
        fi
        
        read -p "选择要恢复的备份 (1-$i): " backup_choice
        j=0
        for backup in "$BACKUP_DIR"/*.db; do
            if [ -f "$backup" ]; then
                j=$((j+1))
                if [ $j -eq $backup_choice ]; then
                    echo -e "${YELLOW}警告: 将覆盖当前数据库文件${NC}"
                    read -p "确认继续? (y/N): " confirm
                    if [ "$confirm" = "y" ]; then
                        cp "$backup" "$DB_PATH"
                        echo -e "${GREEN}数据库恢复成功${NC}"
                    else
                        echo "操作已取消"
                    fi
                    break
                fi
            fi
        done
        ;;
        
    5)
        echo -e "${GREEN}检查数据库完整性...${NC}"
        if command -v sqlite3 >/dev/null 2>&1; then
            if sqlite3 "$DB_PATH" "PRAGMA integrity_check;" > /tmp/integrity_check.txt 2>&1; then
                if grep -q "ok" /tmp/integrity_check.txt; then
                    echo -e "${GREEN}数据库完整性正常${NC}"
                else
                    echo -e "${RED}数据库可能已损坏${NC}"
                    cat /tmp/integrity_check.txt
                fi
            else
                echo -e "${RED}无法检查数据库完整性${NC}"
                cat /tmp/integrity_check.txt
            fi
            rm -f /tmp/integrity_check.txt
        else
            echo -e "${YELLOW}sqlite3 命令不可用，无法检查完整性${NC}"
        fi
        ;;
        
    6)
        echo -e "${RED}警告: 数据库修复可能导致数据丢失${NC}"
        read -p "确认继续? (y/N): " confirm
        if [ "$confirm" = "y" ]; then
            if command -v sqlite3 >/dev/null 2>&1; then
                echo "尝试导出数据..."
                sqlite3 "$DB_PATH" ".dump" > /tmp/db_dump.sql 2>/dev/null || echo "导出失败，数据库可能严重损坏"
                
                if [ -s /tmp/db_dump.sql ]; then
                    echo "创建新数据库..."
                    mv "$DB_PATH" "$DB_PATH.corrupt.$(date +%s)"
                    sqlite3 "$DB_PATH" < /tmp/db_dump.sql
                    echo -e "${GREEN}数据库修复完成${NC}"
                else
                    echo -e "${RED}无法修复数据库，建议从备份恢复${NC}"
                fi
                rm -f /tmp/db_dump.sql
            else
                echo -e "${YELLOW}sqlite3 命令不可用${NC}"
            fi
        else
            echo "操作已取消"
        fi
        ;;
        
    7)
        echo -e "${GREEN}清理超过30天的备份...${NC}"
        find "$BACKUP_DIR" -name "*.db" -mtime +30 -delete
        echo "清理完成"
        ;;
        
    0)
        echo "退出"
        ;;
        
    *)
        echo -e "${RED}无效选项${NC}"
        exit 1
        ;;
esac

echo -e "${GREEN}操作完成${NC}"