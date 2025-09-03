const { test, expect } = require('@playwright/test');

test.describe('登录功能测试', () => {
  test('成功登录到管理后台', async ({ page }) => {
    // 访问登录页面
    await page.goto('http://localhost:5678/login');
    
    // 等待页面加载
    await page.waitForSelector('input[name="password"]');
    
    // 填写密码
    await page.fill('input[name="password"]', 'change_me_strong_password');
    
    // 点击登录按钮
    await page.click('button[type="submit"]');
    
    // 等待跳转到管理后台
    await page.waitForURL('http://localhost:5678/admin/dashboard');
    
    // 验证登录成功
    await expect(page.locator('h1')).toContainText('管理后台');
    await expect(page.locator('.nav-link')).toContainText('仪表盘');
  });

  test('密码错误时显示错误信息', async ({ page }) => {
    // 访问登录页面
    await page.goto('http://localhost:5678/login');
    
    // 等待页面加载
    await page.waitForSelector('input[name="password"]');
    
    // 填写错误密码
    await page.fill('input[name="password"]', 'wrong_password');
    
    // 点击登录按钮
    await page.click('button[type="submit"]');
    
    // 等待错误消息显示
    await page.waitForSelector('.alert-danger');
    
    // 验证错误信息
    await expect(page.locator('.alert-danger')).toContainText('密码错误');
  });

  test('未登录访问管理页面时重定向到登录页', async ({ page }) => {
    // 直接访问管理页面
    await page.goto('http://localhost:5678/admin/dashboard');
    
    // 应该重定向到登录页
    await expect(page).toHaveURL('http://localhost:5678/login');
  });

  test('登录后可以访问页面', async ({ page }) => {
    // 先登录
    await page.goto('http://localhost:5678/login');
    await page.fill('input[name="password"]', 'change_me_strong_password');
    await page.click('button[type="submit"]');
    
    // 等待跳转
    await page.waitForURL('http://localhost:5678/admin/dashboard');
    
    // 访问主页
    await page.goto('http://localhost:5678/');
    
    // 应该能正常访问
    await expect(page.locator('h1')).toContainText('HTML代码分享工具');
  });
});