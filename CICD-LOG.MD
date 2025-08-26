Run sshpass -p "$SERVER_PASSWORD" ssh -o StrictHostKeyChecking=no $SERVER_USER@$SERVER_HOST << 'EOF'
Pseudo-terminal will not be allocated because stdin is not a terminal.
Welcome to Ubuntu 22.04.4 LTS (GNU/Linux 5.15.0-91-generic x86_64)
 * Documentation:  https://help.ubuntu.com
 * Management:     https://landscape.canonical.com
 * Support:        https://ubuntu.com/pro
 * Strictly confined Kubernetes makes edge and IoT secure. Learn how MicroK8s
   just raised the bar for easy, resilient and secure K8s cluster deployment.
   https://ubuntu.com/engage/secure-kubernetes-at-the-edge
New release '24.04.3 LTS' available.
Run 'do-release-upgrade' to upgrade to it.
=== PM2 Status ===
┌────┬────────────┬─────────────┬─────────┬─────────┬──────────┬────────┬──────┬───────────┬──────────┬──────────┬──────────┬──────────┐
│ id │ name       │ namespace   │ version │ mode    │ pid      │ uptime │ ↺    │ status    │ cpu      │ mem      │ user     │ watching │
├────┼────────────┼─────────────┼─────────┼─────────┼──────────┼────────┼──────┼───────────┼──────────┼──────────┼──────────┼──────────┤
│ 0  │ html-go    │ default     │ 1.0.0   │ fork    │ 657101   │ 0s     │ 368… │ online    │ 0%       │ 57.3mb   │ ***     │ disabled │
└────┴────────────┴─────────────┴─────────┴─────────┴──────────┴────────┴──────┴───────────┴──────────┴──────────┴──────────┴──────────┘
=== Waiting for app readiness on 127.0.0.1:8888 ===
curl: (7) Failed to connect to 127.0.0.1 port 8888 after 0 ms: Connection refused
curl: (7) Failed to connect to 127.0.0.1 port 8888 after 0 ms: Connection refused
curl: (7) Failed to connect to 127.0.0.1 port 8888 after 0 ms: Connection refused
curl: (7) Failed to connect to 127.0.0.1 port 8888 after 0 ms: Connection refused
curl: (7) Failed to connect to 127.0.0.1 port 8888 after 0 ms: Connection refused
curl: (7) Failed to connect to 127.0.0.1 port 8888 after 0 ms: Connection refused
curl: (7) Failed to connect to 127.0.0.1 port 8888 after 0 ms: Connection refused
curl: (7) Failed to connect to 127.0.0.1 port 8888 after 0 ms: Connection refused
curl: (7) Failed to connect to 127.0.0.1 port 8888 after 0 ms: Connection refused
curl: (7) Failed to connect to 127.0.0.1 port 8888 after 0 ms: Connection refused
curl: (7) Failed to connect to 127.0.0.1 port 8888 after 0 ms: Connection refused
curl: (7) Failed to connect to 127.0.0.1 port 8888 after 0 ms: Connection refused
curl: (7) Failed to connect to 127.0.0.1 port 8888 after 0 ms: Connection refused
curl: (7) Failed to connect to 127.0.0.1 port 8888 after 0 ms: Connection refused
curl: (7) Failed to connect to 127.0.0.1 port 8888 after 0 ms: Connection refused
curl: (7) Failed to connect to 127.0.0.1 port 8888 after 0 ms: Connection refused
curl: (7) Failed to connect to 127.0.0.1 port 8888 after 0 ms: Connection refused
curl: (7) Failed to connect to 127.0.0.1 port 8888 after 0 ms: Connection refused
curl: (7) Failed to connect to 127.0.0.1 port 8888 after 0 ms: Connection refused
curl: (7) Failed to connect to 127.0.0.1 port 8888 after 0 ms: Connection refused
curl: (7) Failed to connect to 127.0.0.1 port 8888 after 0 ms: Connection refused
curl: (7) Failed to connect to 127.0.0.1 port 8888 after 0 ms: Connection refused
curl: (7) Failed to connect to 127.0.0.1 port 8888 after 0 ms: Connection refused
curl: (7) Failed to connect to 127.0.0.1 port 8888 after 0 ms: Connection refused
curl: (7) Failed to connect to 127.0.0.1 port 8888 after 0 ms: Connection refused
curl: (7) Failed to connect to 127.0.0.1 port 8888 after 0 ms: Connection refused
curl: (7) Failed to connect to 127.0.0.1 port 8888 after 0 ms: Connection refused
curl: (7) Failed to connect to 127.0.0.1 port 8888 after 0 ms: Connection refused
curl: (7) Failed to connect to 127.0.0.1 port 8888 after 0 ms: Connection refused
curl: (7) Failed to connect to 127.0.0.1 port 8888 after 0 ms: Connection refused
❌ Health check failed after 30 attempts
=== Recent PM2 Logs ===
[TAILING] Tailing last 80 lines for [html-go] process (change the value with --lines option)
/***/.pm2/logs/html-go-out.log last 80 lines:
0|html-go  |   AUTH_ENABLED: 'true',
0|html-go  |   AUTH_PASSWORD: '***'
0|html-go  | }
0|html-go  | ✅ 缓存管理器已启动
0|html-go  | 会话目录: /***/html_deploy_aibanxue/sessions
0|html-go  | 会话目录权限正确
0|html-go  | ✅ 性能监控中间件已启用
0|html-go  | 🛑 缓存管理器已停止
0|html-go  | 应用启动...
0|html-go  | 当前工作目录: /***/html_deploy_aibanxue
0|html-go  | 环境变量: {
0|html-go  |   NODE_ENV: 'production',
0|html-go  |   AUTH_ENABLED: 'true',
0|html-go  |   AUTH_PASSWORD: '***'
0|html-go  | }
0|html-go  | ✅ 缓存管理器已启动
0|html-go  | 会话目录: /***/html_deploy_aibanxue/sessions
0|html-go  | 会话目录权限正确
0|html-go  | ✅ 性能监控中间件已启用
0|html-go  | 🛑 缓存管理器已停止
0|html-go  | 应用启动...
0|html-go  | 当前工作目录: /***/html_deploy_aibanxue
0|html-go  | 环境变量: {
0|html-go  |   NODE_ENV: 'production',
0|html-go  |   AUTH_ENABLED: 'true',
0|html-go  |   AUTH_PASSWORD: '***'
0|html-go  | }
0|html-go  | ✅ 缓存管理器已启动
0|html-go  | 会话目录: /***/html_deploy_aibanxue/sessions
0|html-go  | 会话目录权限正确
0|html-go  | ✅ 性能监控中间件已启用
0|html-go  | 🛑 缓存管理器已停止