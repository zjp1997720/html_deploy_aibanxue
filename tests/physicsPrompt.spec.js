const fs = require('fs');
const path = require('path');

describe('物理交互式课件提示词资源策略', () => {
  const promptPath = path.join(__dirname, '..', '扣子插件开发', '物理交互式课件提示词1005.md');
  const content = fs.readFileSync(promptPath, 'utf-8');

  test('必须提供 BootCDN、jsDelivr、cdnjs 三层 CDN 说明', () => {
    expect(content).toMatch(/cdn\.bootcdn\.net/);
    expect(content).toMatch(/(cdn\.jsdelivr\.net|jsdelivr\.com)/);
    expect(content).toMatch(/cdnjs\.cloudflare\.com/);
  });

  test('必须指定 Bootstrap 5 作为主框架并提供主备链', () => {
    expect(content).toMatch(/Bootstrap\s*5/);
    expect(content).toMatch(/bootstrap[\s\S]*cdn\.bootcdn\.net/i);
    expect(content).toMatch(/bootstrap[\s\S]*(cdn\.jsdelivr\.net|jsdelivr\.com)/i);
  });

  test('必须提供 Chart.js 4.x 与 Matter.js 三段 CDN 链接', () => {
    expect(content).toMatch(/Chart\.js\s*4\.x/);
    expect(content).toMatch(/chart\.umd\.min\.js/);
    expect(content).toMatch(/matter\.min\.js/);
    // 三段域名的存在性
    expect(content).toMatch(/cdn\.bootcdn\.net[\s\S]*Chart\.js/i);
    expect(content).toMatch(/(cdn\.jsdelivr\.net|jsdelivr\.com)[\s\S]*chart/i);
    expect(content).toMatch(/cdnjs\.cloudflare\.com[\s\S]*chart/i);
    expect(content).toMatch(/cdn\.bootcdn\.net[\s\S]*matter/i);
    expect(content).toMatch(/(cdn\.jsdelivr\.net|jsdelivr\.com)[\s\S]*matter/i);
    expect(content).toMatch(/cdnjs\.cloudflare\.com[\s\S]*matter/i);
  });

  test('强调外部脚本绑定、允许少量内联初始化、并给出 CSP 基线', () => {
    expect(content).toMatch(/禁止内联事件/);
    expect(content).toMatch(/内联初始化脚本/);
    expect(content).toMatch(/CSP/);
    expect(content).toMatch(/'unsafe-inline'/);
  });
});

