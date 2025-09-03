# 数据库备份说明

## 概述

本项目包含了自动备份脚本 `scripts/backup.sh`，用于定期备份 SQLite3 数据库。

## 使用方法

### 手动备份

```bash
# 执行备份
./scripts/backup.sh

# 预览备份（dry-run模式）
./scripts/backup.sh dry-run
```

### 设置定时备份

1. 编辑 crontab：
```bash
crontab -e
```

2. 添加以下内容（每天凌晨2点备份）：
```bash
0 2 * * * /root/html_deploy_aibanxue/scripts/backup.sh
```

3. 重启 cron 服务：
```bash
# Ubuntu/Debian
sudo systemctl restart cron

# CentOS/RHEL
sudo systemctl restart crond
```

## 配置选项

### 环境变量

| 变量名 | 说明 | 默认值 |
|--------|------|--------|
| `WORKDIR` | 项目工作目录 | `/root/html_deploy_aibanxue` |
| `RETENTION_DAYS` | 备份保留天数 | `30` |
| `REMOTE_BACKUP_URL` | 远程备份URL（可选） | 无 |
| `WEBHOOK_URL` | 备份完成通知webhook（可选） | 无 |

### 示例配置

在 `.env` 文件中添加：
```bash
# 备份配置
BACKUP_RETENTION_DAYS=30
REMOTE_BACKUP_URL=sftp://user@backup-server:/backups/
WEBHOOK_URL=https://hooks.slack.com/services/XXX/YYY/ZZZ
```

## 备份策略

### 1. 本地备份
- 备份位置：`/root/backups/html-go/`
- 文件命名：`html-go-YYYYMMDD_HHMMSS.db.gz`
- 保留期限：30天
- 自动压缩：使用 gzip 压缩

### 2. 远程备份（可选）
如果配置了 `REMOTE_BACKUP_URL`，备份文件会自动同步到远程服务器。

支持的协议：
- SFTP: `sftp://user@host:path/`
- FTP: `ftp://user:pass@host/path/`
- S3: `s3://bucket/path/`

### 3. 通知（可选）
如果配置了 `WEBHOOK_URL`，备份完成后会发送通知到：
- Slack
- Discord
- 企业微信
- 其他支持 webhook 的平台

## 恢复数据

### 从备份恢复

1. 停止应用：
```bash
pm2 stop html-go
```

2. 解压备份文件：
```bash
cd /root/backups/html-go
gzip -d html-go-YYYYMMDD_HHMMSS.db.gz
```

3. 替换数据库：
```bash
# 备份当前数据库（可选）
cp /root/html_deploy_aibanxue/db/html-go.db /root/html_deploy_aibanxue/db/html-go.db.bak

# 恢复备份
cp html-go-YYYYMMDD_HHMMSS.db /root/html_deploy_aibanxue/db/html-go.db
```

4. 重启应用：
```bash
pm2 start html-go
```

### 从远程备份恢复

1. 下载远程备份文件
2. 按照上述步骤恢复

## 监控和维护

### 检查备份状态

```bash
# 查看备份日志
tail -f /var/log/html-go-backup.log

# 检查备份文件
ls -la /root/backups/html-go/

# 检查磁盘使用
df -h /root/backups/
```

### 备份脚本日志

日志位置：`/var/log/html-go-backup.log`

包含信息：
- 备份开始/完成时间
- 文件大小信息
- 错误信息
- 清理操作记录

## 安全建议

1. **权限控制**
   - 确保备份目录只有 root 可访问
   - 定期检查备份文件权限

2. **加密备份**
   - 对于敏感数据，考虑使用加密备份
   - 可以使用 `gpg` 或 `openssl` 加密

3. **异地备份**
   - 建议配置远程备份到不同地域
   - 防止本地灾难导致数据丢失

4. **定期测试**
   - 定期测试备份恢复流程
   - 确保备份文件可用

## 故障排除

### 常见问题

1. **权限错误**
```
chmod +x scripts/backup.sh
chown -R root:root /root/backups/html-go
```

2. **磁盘空间不足**
   - 检查磁盘使用：`df -h`
   - 调整保留天数或清理旧文件

3. **数据库锁定**
   - 脚本会自动检测并处理
   - 如果失败，可以在低峰期手动备份

### 调试模式

在脚本开头添加 `set -x` 可以查看详细执行过程。