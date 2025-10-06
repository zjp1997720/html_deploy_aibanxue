const fs = require('fs');
const path = require('path');

describe('动态PPT代码生成提示词（CDN 稳健版）', () => {
  const promptPath = path.join(__dirname, '..', '扣子插件开发', '动态PPT代码生成提示词.md');
  const content = fs.readFileSync(promptPath, 'utf-8');

  test('必须明确三段 CDN 策略并禁止高风险域名', () => {
    expect(content).toMatch(/https:\/\/cdn\.bootcdn\.net/);
    expect(content).toMatch(/cdn\.jsdelivr\.net|jsdelivr\.com/);
    expect(content).toMatch(/https:\/\/cdnjs\.cloudflare\.com/);

    const bannedDomains = ['fonts.googleapis.com', 'fonts.gstatic.com', 'cdn.tailwindcss.com', 'polyfill.io'];
    bannedDomains.forEach((domain) => {
      expect(content).toMatch(new RegExp('\\*\\*禁止\\*\\*使用[^\\n]*' + domain));
      expect(content).not.toMatch(new RegExp('href="https://' + domain.replace('.', '\\.') + '"', 'i'));
    });
    expect(content).not.toMatch(/href="http:/i);
  });

  test('必须强调 ensureLoaded、initPPT 以及 compliance JSON', () => {
    expect(content).toMatch(/function\s+ensureLoaded\(/);
    expect(content).toMatch(/function\s+initPPT\(/);
    expect(content).toMatch(/id="compliance"/);
    expect(content).toMatch(/gsap\.killTweensOf\('\.slide\.active \*'\)/);
  });

  test('提示词需涵盖 no-cdn 降级模式与禁止内联事件', () => {
    expect(content).toMatch(/no-cdn/);
    expect(content).toMatch(/严禁 `on/);
    expect(content).toMatch(/addEventListener/);
  });
});
