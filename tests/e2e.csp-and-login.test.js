const path = require('path');
const { spawn } = require('child_process');
const fetch = require('node-fetch');

/**
 * 端到端（轻量）测试：
 * - 启动真实服务进程
 * - 校验CSP包含Google Fonts域名
 * - 校验CSS可达
 * - 校验登录流程不被卡住且可访问首页
 */

const PORT = 5678;
const BASE = `http://localhost:${PORT}`;

let child;

/**
 * 从 Set-Cookie 头中解析 cookie 字符串
 * @param {string[]|undefined} setCookieHeaders - 响应中的 Set-Cookie 头数组
 * @returns {string} - 可直接用于 Cookie 请求头的串
 */
function buildCookieHeader(setCookieHeaders) {
  if (!setCookieHeaders || !setCookieHeaders.length) return '';
  return setCookieHeaders
    .map(h => (h || '').split(';')[0])
    .filter(Boolean)
    .join('; ');
}

beforeAll(async () => {
  await new Promise((resolve, reject) => {
    const env = { ...process.env };
    env.NODE_ENV = 'development';
    env.PORT = String(PORT);
    env.AUTH_ENABLED = 'true';
    env.AUTH_PASSWORD = env.AUTH_PASSWORD || 'admin123';
    env.DB_PATH = path.join(__dirname, '..', 'db', 'test-e2e.db');

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
}, 30000);

afterAll(() => {
  if (child && !child.killed) {
    child.kill('SIGINT');
  }
});

test('CSP 指令涵盖所需 CDN 域名且 CSS 可达', async () => {
  const resp = await fetch(`${BASE}/login`);
  expect(resp.status).toBe(200);
  const csp = resp.headers.get('content-security-policy') || '';
  expect(csp).toContain("default-src 'self'");
  expect(csp).toContain('script-src');
  expect(csp).toContain('style-src');
  expect(csp).toContain('img-src');
  const requiredScriptSources = [
    'cdn.bootcdn.net',
    'cdn.jsdelivr.net',
    'cdnjs.cloudflare.com',
    'cdn.tailwindcss.com',
    'polyfill.io',
    'www.jsdelivr.com'
  ];
  requiredScriptSources.forEach(domain => {
    expect(csp).toContain(domain);
  });
  const requiredStyleSources = [
    'cdn.bootcdn.net',
    'cdn.jsdelivr.net',
    'cdnjs.cloudflare.com'
  ];
  requiredStyleSources.forEach(domain => {
    expect(csp).toContain(domain);
  });
  const requiredFontSources = [
    'cdn.bootcdn.net',
    'cdnjs.cloudflare.com'
  ];
  requiredFontSources.forEach(domain => {
    expect(csp).toContain(domain);
  });
  expect(csp).toContain("style-src 'self' 'unsafe-inline'");
  expect(csp).toContain("img-src 'self' data:");

  const cssResp = await fetch(`${BASE}/css/design-system.css`);
  expect(cssResp.status).toBe(200);
  const ct = (cssResp.headers.get('content-type') || '').toLowerCase();
  expect(ct.includes('text/css')).toBeTruthy();
});

test('登录后可访问首页（无卡顿）', async () => {
  const params = new URLSearchParams();
  params.set('password', process.env.AUTH_PASSWORD || 'admin123');

  // 不跟随重定向，好获取 Set-Cookie
  const loginResp = await fetch(`${BASE}/login`, {
    method: 'POST',
    body: params.toString(),
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded'
    },
    redirect: 'manual'
  });

  // 应返回 302 重定向
  expect([302, 303]).toContain(loginResp.status);
  const cookies = buildCookieHeader(loginResp.headers.raw()['set-cookie']);
  expect(cookies).toContain('auth=');

  // 携带 Cookie 访问首页
  const homeResp = await fetch(`${BASE}/`, {
    headers: {
      'Cookie': cookies
    }
  });
  expect(homeResp.status).toBe(200);
  const html = await homeResp.text();
  expect(html).toMatch(/HTML-GO/);
});
