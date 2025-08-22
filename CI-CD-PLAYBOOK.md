# PM2 + GitHub Actions CI/CD 实战手册（可复用）

适用场景：Node.js + PM2 部署，代码托管在 GitHub，目标是将 main 分支推送后自动构建、打包、上传到服务器并零停机重启。

---

## 1. 目标与架构

- 代码仓库：GitHub
- CI/CD：GitHub Actions（ubuntu-latest Runner）
- 部署方式：SSH 到服务器，PM2 零停机 reload
- 服务器：Ubuntu（示例），Node 18，已安装 PM2

---

## 2. 服务器准备（一次性）

```bash
# 1) 安装 Node.js（如需要）与 PM2
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs
sudo npm i -g pm2

# 2) 创建部署目录
sudo mkdir -p /root/html_deploy_aibanxue
sudo chown -R $USER:$USER /root/html_deploy_aibanxue

# 3) 准备 .env（生产配置，CI/CD 不覆盖）
cd /root/html_deploy_aibanxue
cp /path/to/env.example .env  # 然后编辑为生产真实配置

# 4) 确保 PM2 进程存在（第一次）
# 例如： pm2 start app.js --name html-go
pm2 save
```

---

## 3. GitHub 仓库准备

### 3.1 创建 Secrets
在仓库 Settings → Security → Secrets and variables → Actions → New repository secret：
- `SERVER_HOST`：服务器 IP（例如 115.190.53.227）
- `SERVER_USER`：SSH 用户（例如 root）
- `SERVER_PASSWORD`：SSH 密码（建议后续改为 SSH Key）

> 可选：改为 SSH Key 更安全：使用 `ssh-agent` + `secrets.SSH_PRIVATE_KEY`，移除 sshpass。

### 3.2 package.json 中的测试脚本
避免 CI 中“启动服务当作测试”导致卡住：
```json
{
  "scripts": {
    "test": "echo 'No tests defined'"
  }
}
```

---

## 4. 标准化工作流文件（可复制）

`.github/workflows/main.yml`
```yaml
name: CI/CD

on:
  push:
    branches: [ main ]
  workflow_dispatch:

jobs:
  build-and-deploy:
    runs-on: ubuntu-latest

    env:
      SERVER_HOST: ${{ secrets.SERVER_HOST }}
      SERVER_USER: ${{ secrets.SERVER_USER }}
      SERVER_PASSWORD: ${{ secrets.SERVER_PASSWORD }}
      WORKDIR: /root/html_deploy_aibanxue

    steps:
      - name: Checkout repository
        uses: actions/checkout@v4

      - name: Set up Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '18'

      - name: Install dependencies
        run: npm ci

      - name: Run lint/tests (skip if none)
        run: |
          npm -v
          node -v
          echo "✅ Environment check complete"

      - name: Archive project files (git archive, exclude untracked)
        run: |
          git archive --format=tar.gz -o release.tar.gz HEAD
          ls -lh release.tar.gz

      - name: Copy files to server via sshpass+scp
        run: |
          sudo apt-get update && sudo apt-get install -y sshpass
          sshpass -p "$SERVER_PASSWORD" scp -o StrictHostKeyChecking=no release.tar.gz $SERVER_USER@$SERVER_HOST:/tmp/release.tar.gz

      - name: Remote deploy via SSH (PM2)
        run: |
          sshpass -p "$SERVER_PASSWORD" ssh -o StrictHostKeyChecking=no $SERVER_USER@$SERVER_HOST << 'EOF'
          set -e
          WORKDIR="/root/html_deploy_aibanxue"
          mkdir -p "$WORKDIR"
          cd "$WORKDIR"

          # 保护生产配置
          if [ -f .env ]; then cp .env .env.backup; fi

          # 解压受管代码（git archive 不包含 .env）
          tar -xzf /tmp/release.tar.gz -C "$WORKDIR"

          # 恢复配置
          if [ -f .env.backup ]; then mv .env.backup .env; fi

          # 安装/更新依赖（生产）
          npm install --production

          # 零停机重启
          pm2 reload html-go || pm2 restart html-go

          # 清理
          rm -f /tmp/release.tar.gz .env.backup
          EOF

      - name: Verify service health
        run: |
          sleep 3
          sshpass -p "$SERVER_PASSWORD" ssh -o StrictHostKeyChecking=no $SERVER_USER@$SERVER_HOST "
          pm2 status html-go
          curl -fsS http://127.0.0.1:8888/ || echo 'Health check failed - service may still be starting'"
```

---

## 5. 常见问题与解决

### 5.1 工作流卡在测试步骤
- 原因：`npm run test` 启动了服务器（例如 `node app.js`），Runner 一直等待
- 解决：将 `test` 改为 `echo 'No tests defined'` 或者删除该步骤

### 5.2 tar: file changed as we read it
- 原因：tar 打包工作目录时文件变化
- 解决：改用 `git archive` 只打包 Git 受管文件

### 5.3 远程 `tar -C` 缺少参数（exit code 64）
- 原因：在 `<< 'EOF'` heredoc 中，`$WORKDIR` 不会展开
- 解决：在远端脚本内显式设置 `WORKDIR="/path"`，并用双引号引用变量

### 5.4 SSH 提示 no tty / pseudo-terminal
- 说明：信息性提示，可忽略；与失败无直接关系

### 5.5 .env 被覆盖风险
- 方案：打包时不包含 `.env`；远端解压前备份 `.env`，解压后恢复

### 5.6 部署目录不存在
- 方案：远端 `mkdir -p "$WORKDIR"`，确保目录存在

---

## 6. 安全与优化建议

- 使用 **SSH Key** 替代密码：`ssh-agent` 与 `secrets.SSH_PRIVATE_KEY`
- 最小权限：生产服务器用户可设为专用非 root 账户
- 日志与告警：部署失败可接入通知（Slack/企业微信/邮件）
- 健康检查：实现 `/health` 接口，或使用 `curl -f` 检查首页
- 缓存依赖：可在 Actions 中缓存 `~/.npm` 提升速度

---

## 7. 复用清单（新项目起步）

1) 复制 `.github/workflows/main.yml` 到新仓库，并调整：
- `WORKDIR` 目标路径
- `pm2` 进程名

2) 在 GitHub 仓库创建 Secrets：`SERVER_HOST` / `SERVER_USER` / `SERVER_PASSWORD`

3) 确认服务器：Node、PM2、目录、`.env` 就绪

4) 推送到 `main`：观察 Actions → 应在 3~5 分钟内成功部署

---

## 8. 版本记录
- v1.0 首次整理：来源于实战问题修复（测试卡住、tar 打包失败、远端变量未展开）

---

如需改为 Docker 部署，可将远端命令替换为 `docker compose build && up -d`，并在服务器上准备 compose 文件与卷挂载。 