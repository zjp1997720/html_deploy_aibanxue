# 生产运维手册（收尾版）

本手册覆盖生产环境的最小即用流程：冒烟验证、Nginx 安全片段、数据库与日志维护。目标是在“不改业务代码、不影响现网”的前提下，提供可验证、可回滚的操作指南。

## 一、CI 冒烟工作流

- 工作流文件：`.github/workflows/smoke.yml`
- 触发方式：GitHub Actions → 选择 `production-smoke` → Run workflow
- 需要配置的仓库 Secrets / Variables：
  - `Secrets.AUTH_PASSWORD`：生产登录密码（必填）
  - `Variables.BASE_URL`：站点地址（可选，默认 `https://htmlshare.aibanxue.top`）

### 验证项
1. `GET /version`：200
2. `POST /login`：302 且返回 `auth` 与 `connect.sid` 两枚 Cookie
3. `POST /api/pages/create`（带 Cookie）：`success=true` 且返回 `url`
4. `GET <url>`：200

触发成功后，工作流会在 Summary 输出可访问的页面 URL。

## 二、Nginx 安全片段（可选、零停机）

文件：`docs/nginx-security-snippets.conf`

将片段放入你的 server 块，示例：

```
server {
  listen 443 ssl http2;
  server_name htmlshare.aibanxue.top;

  include /root/html_deploy_aibanxue/docs/nginx-security-snippets.conf;

  location / {
    proxy_pass http://127.0.0.1:8888;
    proxy_http_version 1.1;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
    client_max_body_size 20m;
  }
}
```

生效：

```
nginx -t && systemctl reload nginx
```

## 三、数据库与日志

### 1) 结构修复（已执行过，记录在此）

```
sqlite3 db/html-go.db "ALTER TABLE pages ADD COLUMN name TEXT;"   -- 若已存在会提示重复，可忽略
node scripts/create-performance-logs.js                             -- 创建 performance_logs + 索引
```

### 2) 每日备份（7 天保留）

```
cat >/usr/local/bin/backup-html-go.sh <<'EOF'
#!/usr/bin/env bash
set -euo pipefail
cd /root/html_deploy_aibanxue
mkdir -p db/backups
ts=$(date +%F-%H%M%S)
cp db/html-go.db db/backups/html-go-$ts.db
ls -1t db/backups/html-go-*.db | tail -n +8 | xargs -r rm -f
EOF
chmod +x /usr/local/bin/backup-html-go.sh
crontab -l | { cat; echo "5 2 * * * /usr/local/bin/backup-html-go.sh >/var/log/backup-html-go.log 2>&1"; } | crontab -
```

### 3) 日志轮转

```
cat >/etc/logrotate.d/html-go <<'EOF'
/root/.pm2/logs/*.log {
  daily
  rotate 7
  compress
  missingok
  notifempty
  copytruncate
}
EOF

cat >/etc/logrotate.d/nginx-local <<'EOF'
/var/log/nginx/*.log {
  daily
  rotate 7
  compress
  missingok
  notifempty
  create 0640 www-data adm
  sharedscripts
  postrotate
    [ -s /run/nginx.pid ] && kill -USR1 `cat /run/nginx.pid`
  endscript
}
EOF
```

## 四、常见问题速查

- 登录 200 不跳转：多半是浏览器未携带 Cookie；用 `curl -i -c/-b` 或 PowerShell `-WebSession` 验证。
- 500 且 `no such table`：执行上面的结构修复脚本。
- 401 `Unauthorized`：会话缺失或未使用 Bearer Token；确认 `Cookie` 或 `Authorization` 头。

## 五、最小变更原则

本次只新增工作流、文档与 Nginx 片段，不改业务代码；线上仅在你执行 reload、crontab 等命令时生效，且均可回滚。

