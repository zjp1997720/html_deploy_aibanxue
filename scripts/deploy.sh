#!/usr/bin/env bash
set -euo pipefail

# 用法：在服务器项目根目录执行
# 需要已安装 docker 与 docker compose 插件

# 1) 准备数据目录
mkdir -p db sessions

# 2) 拉取最新代码（如果是 Git 仓库）
if [ -d .git ]; then
  git pull --rebase || true
fi

# 3) 构建并启动
docker compose build
docker compose up -d

echo "Deploy done. Check: curl -I http://127.0.0.1:8888/" 