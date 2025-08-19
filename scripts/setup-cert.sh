#!/usr/bin/env bash
set -euo pipefail

# 用法: sudo bash scripts/setup-cert.sh YOUR_DOMAIN your@email.com

DOMAIN=${1:-}
EMAIL=${2:-}

if [[ -z "$DOMAIN" || -z "$EMAIL" ]]; then
  echo "Usage: $0 <domain> <email>"
  exit 1
fi

# 安装 certbot（Debian/Ubuntu）
if ! command -v certbot >/dev/null 2>&1; then
  apt-get update
  apt-get install -y certbot python3-certbot-nginx
fi

# 申请证书（Nginx 插件自动配置）
certbot --nginx -d "$DOMAIN" --non-interactive --agree-tos -m "$EMAIL" --redirect

# 自动续期定时任务
if ! crontab -l | grep -q 'certbot renew'; then
  (crontab -l 2>/dev/null; echo '0 3 * * * certbot renew --quiet') | crontab -
fi

echo "Certificate setup done for $DOMAIN" 