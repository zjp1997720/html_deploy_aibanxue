const fs = require('fs');
const path = require('path');

describe('数学交互式课件提示词资源策略', () => {
  const promptPath = path.join(__dirname, '..', '扣子插件开发', '数学交互式课件提示词1005.md');
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

  test('不允许继续要求 Tailwind 编译版 CDN', () => {
    expect(content).not.toMatch(/TailwindCSS.*必须引入其编译后的 \.min\.css/);
  });

  test('强调外部脚本绑定与 CSP 宽松策略', () => {
    expect(content).toMatch(/禁止内联事件/);
    expect(content).toMatch(/CSP/);
  });
});
