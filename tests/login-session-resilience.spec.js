const { test, expect } = require('@playwright/test');
const config = require('../config');

/**
 * 生产环境登录韧性与CSP检查
 * - 验证登录不会长时间卡在“验证中...”
 * - 验证静态CSS可访问，CSP包含Google Fonts域名
 */
test.describe('登录韧性与CSP', () => {
  const baseURL = `http://localhost:${config.port || 5678}`;
  const correctPassword = process.env.AUTH_PASSWORD || config.authPassword || 'admin123';

  test('登录应在3秒内完成跳转（无卡顿）', async ({ page }) => {
    await page.goto(`${baseURL}/login`);
    await expect(page).toHaveTitle(/HTML-GO/);

    // 输入密码并提交
    await page.fill('input[type="password"]', correctPassword);
    const start = Date.now();
    await page.click('button[type="submit"]');

    // 成功跳转到首页
    await expect(page).toHaveURL(`${baseURL}/`);
    const duration = Date.now() - start;
    expect(duration).toBeLessThan(3000);
  });

  test('CSS资源可达且CSP包含Google Fonts', async ({ page, context }) => {
    const [mainResponse] = await Promise.all([
      page.waitForResponse(resp => resp.url().startsWith(`${baseURL}/login`) && resp.status() === 200),
      page.goto(`${baseURL}/login`)
    ]);

    // 断言CSP头包含fonts.google域名（避免样式丢失）
    const csp = mainResponse.headers()['content-security-policy'] || '';
    expect(csp).toContain('fonts.googleapis.com');
    expect(csp).toContain('fonts.gstatic.com');

    // 等待CSS资源加载并校验
    const cssResp = await page.waitForResponse(r => /\/css\/design-system\.css$/.test(r.url()));
    expect(cssResp.status()).toBe(200);
    const ct = (cssResp.headers()['content-type'] || '').toLowerCase();
    expect(ct.includes('text/css')).toBeTruthy();
  });
});

