#!/usr/bin/env bash
set -euo pipefail

###############################################
# 冒烟脚本：生产站点最小端到端验证
# 函数均带注释，便于本地/CI 复用
###############################################

# 默认参数
BASE_URL=${BASE_URL:-"https://htmlshare.aibanxue.top"}
AUTH_PASSWORD=${AUTH_PASSWORD:-""}
COOKIE_JAR=$(mktemp)

### 函数: die
# 说明: 打印错误并退出
# 参数: $1 错误信息
die() { echo "[ERROR] $1" >&2; exit 1; }

### 函数: assert_http
# 说明: 断言 HTTP 状态码等于期望值
# 参数: $1 实际码 $2 期望码
assert_http() { [[ "$1" == "$2" ]] || die "期望 HTTP $2 实际 $1"; }

### 函数: health
# 说明: 校验 /version 健康性
health() {
  local code
  code=$(curl -sS -o /dev/null -w '%{http_code}' "$BASE_URL/version")
  assert_http "$code" 200
}

### 函数: login
# 说明: 使用密码登录并保存 Cookie
login() {
  [[ -n "$AUTH_PASSWORD" ]] || die "请设置 AUTH_PASSWORD 环境变量"
  local code
  code=$(curl -sS -i -c "$COOKIE_JAR" -d "password=$AUTH_PASSWORD" "$BASE_URL/login" | awk 'END{print $2}')
  [[ -f "$COOKIE_JAR" ]] || die "未生成 Cookie 文件"
  echo "登录返回: HTTP $code"
}

### 函数: create_page
# 说明: 通过 API 创建页面并回显 URL
# 返回: 输出 URL 到标准输出
create_page() {
  local payload resp ok url
  payload='{"htmlContent":"<p>Smoke via script</p>","isProtected":false,"codeType":"html","name":"script-smoke"}'
  resp=$(curl -sS -b "$COOKIE_JAR" -H 'Content-Type: application/json' -d "$payload" "$BASE_URL/api/pages/create")
  ok=$(echo "$resp" | jq -r '.success // false')
  [[ "$ok" == "true" ]] || { echo "$resp"; die "创建页面失败"; }
  url=$(echo "$resp" | jq -r '.url')
  echo "$url"
}

### 函数: verify_url
# 说明: 验证页面可达
# 参数: $1 页面 URL
verify_url() { local code; code=$(curl -sS -o /dev/null -w '%{http_code}' "$1"); assert_http "$code" 200; }

### 函数: main
# 说明: 主流程：健康检查→登录→创建→验证
main() {
  echo "BASE_URL=$BASE_URL"
  health
  login
  local url
  url=$(create_page)
  verify_url "$url"
  echo "✅ 冒烟成功: $url"
  if [[ -n "${GITHUB_OUTPUT:-}" ]]; then
    echo "smoke_url=$url" >>"$GITHUB_OUTPUT"
  fi
}

main "$@"
