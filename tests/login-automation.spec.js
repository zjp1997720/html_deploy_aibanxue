const { test, expect } = require('@playwright/test');
const config = require('../config');

/**
 * 登录自动化测试套件
 * 测试登录功能的各种场景，包括成功登录、错误密码、UI交互等
 */
test.describe('登录功能测试', () => {
  const baseURL = `http://localhost:${config.port || 5678}`;
  const correctPassword = process.env.AUTH_PASSWORD || config.authPassword;
  const wrongPassword = 'wrong_password';

  test.beforeEach(async ({ page }) => {
    // 每个测试前导航到登录页面
    await page.goto(`${baseURL}/login`);
    await expect(page).toHaveTitle(/HTML-GO/);
  });

  /**
   * 测试成功登录流程
   */
  test('应该能够使用正确密码成功登录', async ({ page }) => {
    // 填写正确密码
    await page.fill('input[type="password"]', correctPassword);
    
    // 点击登录按钮
    await page.click('button[type="submit"]');
    
    // 等待页面跳转到首页
    await expect(page).toHaveURL(`${baseURL}/`);
    
    // 验证页面内容
    await expect(page.locator('body')).toContainText('HTML-GO');
  });

  /**
   * 测试错误密码登录
   */
  test('应该显示错误信息当密码错误时', async ({ page }) => {
    // 填写错误密码
    await page.fill('input[type="password"]', wrongPassword);
    
    // 点击登录按钮
    await page.click('button[type="submit"]');
    
    // 应该仍在登录页面
    await expect(page).toHaveURL(`${baseURL}/login`);
    
    // 应该显示错误信息
    await expect(page.locator('body')).toContainText('密码错误');
  });

  /**
   * 测试空密码提交
   */
  test('应该处理空密码提交', async ({ page }) => {
    // 不填写密码，直接点击登录
    await page.click('button[type="submit"]');
    
    // 应该仍在登录页面
    await expect(page).toHaveURL(`${baseURL}/login`);
  });

  /**
   * 测试登录表单UI元素
   */
  test('应该正确显示登录表单元素', async ({ page }) => {
    // 检查密码输入框
    const passwordInput = page.locator('input[type="password"]');
    await expect(passwordInput).toBeVisible();
    await expect(passwordInput).toHaveAttribute('placeholder', /密码|password/i);
    
    // 检查登录按钮
    const loginButton = page.locator('button[type="submit"]');
    await expect(loginButton).toBeVisible();
    await expect(loginButton).toContainText(/登录|login/i);
    
    // 检查页面标题
    await expect(page.locator('h1')).toContainText('HTML-GO');
    await expect(page.locator('h2')).toContainText('访问验证');
  });

  /**
   * 测试响应式设计
   */
  test('应该在移动设备上正确显示', async ({ page }) => {
    // 设置移动设备视口
    await page.setViewportSize({ width: 375, height: 667 });
    
    // 检查元素是否可见
    await expect(page.locator('input[type="password"]')).toBeVisible();
    await expect(page.locator('button[type="submit"]')).toBeVisible();
    
    // 测试移动端登录
    await page.fill('input[type="password"]', correctPassword);
    await page.click('button[type="submit"]');
    await expect(page).toHaveURL(`${baseURL}/`);
  });

  /**
   * 测试键盘交互
   */
  test('应该支持回车键提交', async ({ page }) => {
    // 填写密码
    await page.fill('input[type="password"]', correctPassword);
    
    // 按回车键
    await page.press('input[type="password"]', 'Enter');
    
    // 应该跳转到首页
    await expect(page).toHaveURL(`${baseURL}/`);
  });

  /**
   * 测试登录状态持久化
   */
  test('应该在登录后保持会话状态', async ({ page }) => {
    // 先登录
    await page.fill('input[type="password"]', correctPassword);
    await page.click('button[type="submit"]');
    await expect(page).toHaveURL(`${baseURL}/`);
    
    // 刷新页面
    await page.reload();
    
    // 应该仍然在首页，而不是被重定向到登录页
    await expect(page).toHaveURL(`${baseURL}/`);
  });

  /**
   * 测试登录性能
   */
  test('登录响应时间应该合理', async ({ page }) => {
    const startTime = Date.now();
    
    await page.fill('input[type="password"]', correctPassword);
    await page.click('button[type="submit"]');
    await expect(page).toHaveURL(`${baseURL}/`);
    
    const endTime = Date.now();
    const responseTime = endTime - startTime;
    
    // 登录应该在3秒内完成
    expect(responseTime).toBeLessThan(3000);
  });
});

/**
 * 登录辅助函数
 */
class LoginHelper {
  /**
   * 执行登录操作
   * @param {Page} page - Playwright页面对象
   * @param {string} password - 登录密码
   */
  static async login(page, password) {
    await page.fill('input[type="password"]', password);
    await page.click('button[type="submit"]');
  }

  /**
   * 验证登录成功
   * @param {Page} page - Playwright页面对象
   * @param {string} baseURL - 基础URL
   */
  static async verifyLoginSuccess(page, baseURL) {
    await expect(page).toHaveURL(`${baseURL}/`);
    await expect(page.locator('body')).toContainText('HTML-GO');
  }

  /**
   * 验证登录失败
   * @param {Page} page - Playwright页面对象
   * @param {string} baseURL - 基础URL
   */
  static async verifyLoginFailure(page, baseURL) {
    await expect(page).toHaveURL(`${baseURL}/login`);
    await expect(page.locator('body')).toContainText('密码错误');
  }
}

module.exports = { LoginHelper };