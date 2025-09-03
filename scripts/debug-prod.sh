#!/bin/bash

# 生产环境调试脚本
echo "=== HTML-GO 生产环境调试工具 ==="

# 检查PM2状态
echo "1. PM2状态:"
pm2 status html-go

echo -e "\n2. 环境变量:"
pm2 describe html-go | grep -A 20 "env"

echo -e "\n3. 检查.env文件:"
if [ -f .env ]; then
    echo ".env文件存在:"
    cat .env | grep -v "PASSWORD" | sed 's/=.*$/=***/'
else
    echo ".env文件不存在!"
fi

echo -e "\n4. 检查会话目录:"
if [ -d "sessions" ]; then
    echo "会话目录权限:"
    ls -la sessions/
else
    echo "会话目录不存在!"
fi

echo -e "\n5. 检查数据库:"
if [ -f "db/html-go.db" ]; then
    echo "数据库文件存在:"
    ls -la db/html-go.db
    echo "数据库备份:"
    ls -la db/backups/ | tail -5
else
    echo "数据库文件不存在!"
fi

echo -e "\n6. 检查日志:"
echo "最近20行错误日志:"
pm2 logs html-go --lines 20 --err

echo -e "\n7. 重启应用:"
echo "如果需要，可以运行以下命令重启应用:"
echo "pm2 reload html-go --update-env"

echo -e "\n8. 测试应用:"
echo "curl -I http://127.0.0.1:8888/"