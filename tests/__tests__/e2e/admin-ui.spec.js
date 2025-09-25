const { test, expect } = require('@playwright/test');

/**
 * 执行后台登录，确保后续操作具备管理员权限。
 * @param {import('@playwright/test').Page} page - Playwright 页面对象。
 */
async function adminLogin(page) {
  await page.goto('/login');
  await page.fill('input[name="password"]', 'change_me_strong_password');
  await page.click('button[type="submit"]');
  await page.waitForURL('**/admin/dashboard');
}

/**
 * 通过后台接口创建临时页面，保障编辑流程具备目标数据。
 * @param {import('@playwright/test').Page} page - Playwright 页面对象。
 * @param {string} name - 页面名称，用于快速检索。
 */
async function createPageViaApi(page, name) {
  await page.evaluate(async (payload) => {
    await fetch('/api/pages/create', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        htmlContent: '<h1>Playwright Sample</h1>',
        name: payload.name,
        codeType: 'html',
        isProtected: false,
      }),
    });
  }, { name });
}

test.describe('后台界面极简体验基线', () => {
  test('API Key 管理页的创建模态应可滚动且操作按钮需具备文本', async ({ page }) => {
    await adminLogin(page);
    await page.goto('/admin/apikeys');

    await page.click('#btnOpenCreateKey');
    const modalBody = page.locator('#createModal .modal-body');
    await expect(modalBody).toBeVisible();

    const overflowY = await modalBody.evaluate((el) => window.getComputedStyle(el).overflowY);
    expect(overflowY).toBe('auto');

    const keyName = `Playwright Key ${Date.now()}`;
    await page.fill('#keyName', keyName);
    await page.fill('#keyDescription', '由自动化用例临时创建');
    await page.click('#createKeyBtn');

    await page.waitForSelector('#keySuccessModal', { state: 'visible' });
    await page.click('#btnCloseSuccessModalFooter');
    await page.waitForSelector('#keySuccessModal', { state: 'hidden' });

    await page.waitForSelector('#keyListBody tr');
    const firstRow = page.locator('#keyListBody tr').first();
    await expect(firstRow).toBeVisible();

    const refreshButton = page.locator('#btnRefreshKeys');
    await expect(refreshButton).toHaveText(/刷新/);

    const actionButtons = firstRow.locator('.actions-group button');
    await expect(actionButtons.nth(0)).toHaveText(/查看/);
    await expect(actionButtons.nth(1)).toHaveText(/启用|禁用/);
    await expect(actionButtons.nth(2)).toHaveText(/删除/);
  });

  test('概览页快捷操作需无边框展示', async ({ page }) => {
    await adminLogin(page);
    await page.goto('/admin/dashboard');

    const quickLinks = page.locator('.card-body a').filter({ hasText: /(创建页面|管理页面|API管理)/ });
    const quickLinkCount = await quickLinks.count();
    expect(quickLinkCount).toBeGreaterThanOrEqual(3);

    for (let index = 0; index < quickLinkCount; index += 1) {
      const borderWidth = await quickLinks.nth(index).evaluate((el) => window.getComputedStyle(el).borderWidth);
      expect(borderWidth).toBe('0px');
    }
  });

  test('页面管理侧栏应移除无序列表圆点', async ({ page }) => {
    await adminLogin(page);
    await page.goto('/admin/pages');

    const navList = page.locator('.sidebar-nav .nav-list');
    const listStyle = await navList.evaluate((el) => window.getComputedStyle(el).listStyleType);
    expect(listStyle).toBe('none');
  });

  test('页面编辑模态体需具备滚动能力避免割裂体验', async ({ page }) => {
    await adminLogin(page);
    await page.goto('/admin/pages');

    const pageName = `Playwright Page ${Date.now()}`;
    await createPageViaApi(page, pageName);

    await page.reload();
    await page.waitForSelector('#pageListBody tr');

    const editButton = page.locator('#pageListBody tr').filter({ hasText: pageName }).locator('button:has-text("编辑")').first();
    await editButton.click();

    const editModalBody = page.locator('#editModal .modal-body');
    await expect(editModalBody).toBeVisible();

    const overflowY = await editModalBody.evaluate((el) => window.getComputedStyle(el).overflowY);
    expect(overflowY).toBe('auto');
  });
});
