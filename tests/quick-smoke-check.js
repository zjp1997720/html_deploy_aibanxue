/**
 * 轻量级冒烟自检脚本（无需 Playwright/Jest）
 * - 启动应用
 * - 校验 CSP 与 CSS
 * - 校验登录流程
 */
const path = require('path');
const { spawn } = require('child_process');
const fetch = require('node-fetch');

const PORT = 5678;
const BASE = `http://localhost:${PORT}`;

function delay(ms) { return new Promise(r => setTimeout(r, ms)); }

function buildCookieHeader(setCookieHeaders) {
  if (!setCookieHeaders || !setCookieHeaders.length) return '';
  return setCookieHeaders
    .map(h => (h || '').split(';')[0])
    .filter(Boolean)
    .join('; ');
}

(async () => {
  let child;
  try {
    await new Promise((resolve, reject) => {
      const env = { ...process.env };
      env.NODE_ENV = 'development';
      env.PORT = String(PORT);
      env.AUTH_ENABLED = 'true';
      env.AUTH_PASSWORD = env.AUTH_PASSWORD || 'admin123';
      env.DB_PATH = path.join(__dirname, '..', 'db', 'test-smoke.db');

      child = spawn(process.execPath, ['app.js'], {
        cwd: path.join(__dirname, '..'),
        env,
        stdio: ['ignore', 'pipe', 'pipe']
      });

      const onData = (data) => {
        const s = data.toString();
        if (s.includes(`服务器运行在 http://0.0.0.0:${PORT}`)) {
          resolve();
        }
      };
      child.stdout.on('data', onData);
      child.stderr.on('data', onData);

      child.on('exit', (code) => {
        reject(new Error(`server exited prematurely with code ${code}`));
      });
    });

    // 小等片刻确保监听就绪
    await delay(300);

    // 1) 检查 /login 响应与 CSP
    const resp = await fetch(`${BASE}/login`);
    if (resp.status !== 200) throw new Error(`/login status ${resp.status}`);
    const csp = resp.headers.get('content-security-policy') || '';
    if (!csp.includes('fonts.googleapis.com') || !csp.includes('fonts.gstatic.com')) {
      throw new Error('CSP 缺少 Google Fonts 域名');
    }

    // 2) 检查 CSS 可达
    const cssResp = await fetch(`${BASE}/css/design-system.css`);
    if (cssResp.status !== 200) throw new Error(`/css/design-system.css status ${cssResp.status}`);
    const ct = (cssResp.headers.get('content-type') || '').toLowerCase();
    if (!ct.includes('text/css')) throw new Error('CSS Content-Type 异常');

    // 3) 登录流程
    const params = new URLSearchParams();
    params.set('password', process.env.AUTH_PASSWORD || 'admin123');
    const loginResp = await fetch(`${BASE}/login`, {
      method: 'POST',
      body: params.toString(),
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      redirect: 'manual'
    });
    if (![302, 303].includes(loginResp.status)) {
      throw new Error(`登录返回码异常: ${loginResp.status}`);
    }
    const cookies = buildCookieHeader(loginResp.headers.raw()['set-cookie']);
    if (!cookies.includes('auth=')) throw new Error('未设置 auth Cookie');

    const homeResp = await fetch(`${BASE}/`, { headers: { 'Cookie': cookies } });
    if (homeResp.status !== 200) throw new Error(`首页访问失败: ${homeResp.status}`);
    const html = await homeResp.text();
    if (!/HTML-GO/.test(html)) throw new Error('首页内容校验失败');

    // 4) API Key 管理页应无内联事件（CSP 合规）
    const apikeyPage = await fetch(`${BASE}/admin/apikeys`, { headers: { 'Cookie': cookies } });
    if (apikeyPage.status !== 200) throw new Error(`/admin/apikeys 访问失败: ${apikeyPage.status}`);
    const apikeyHtml = await apikeyPage.text();
    if (/onclick\s*=/.test(apikeyHtml)) throw new Error('admin/apikeys 存在内联事件，违反 CSP');
    if (!apikeyHtml.includes('class="table-action view"')) throw new Error('操作按钮缺少 table-action view 样式');
    if (!apikeyHtml.includes('modal-clean detail-modal')) throw new Error('详情模态未应用新样式');

    // 5) API Keys 列表 API 应返回 200（验证表结构存在）
    const listResp = await fetch(`${BASE}/api/admin/apikeys`, { headers: { 'Cookie': cookies } });
    if (listResp.status !== 200) throw new Error(`/api/admin/apikeys 返回码异常: ${listResp.status}`);
    const listJson = await listResp.json();
    if (!listJson || listJson.success !== true || !Array.isArray(listJson.keys)) {
      throw new Error('API Key 列表返回结构异常');
    }

    console.log('✅ 冒烟检查通过');
    process.exit(0);
  } catch (err) {
    console.error('❌ 冒烟检查失败:', err.message);
    process.exit(1);
  } finally {
    if (child && !child.killed) {
      child.kill('SIGINT');
    }
  }
})();
