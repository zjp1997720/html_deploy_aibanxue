#!/bin/bash

# Node.js版本升级脚本
# 用于在服务器上安装Node.js v20

set -e

echo "=== Node.js Version Upgrade Script ==="

# 检查当前版本
CURRENT_NODE=$(node -v 2>/dev/null || echo "not installed")
echo "Current Node.js version: $CURRENT_NODE"

# 检查是否需要升级
if [[ "$CURRENT_NODE" == v20* ]]; then
    echo "✅ Node.js v20 is already installed"
    exit 0
fi

echo "📥 Installing Node.js v20..."

# 使用NodeSource仓库安装Node.js v20
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -

# 安装Node.js
sudo apt-get install -y nodejs

# 验证安装
NEW_NODE=$(node -v)
echo "✅ Installed Node.js version: $NEW_NODE"

# 验证npm版本
NPM_VERSION=$(npm -v)
echo "✅ npm version: $NPM_VERSION"

# 清理apt缓存
sudo apt-get clean

echo "=== Node.js Upgrade Complete ==="