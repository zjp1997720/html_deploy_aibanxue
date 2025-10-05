let directives;

describe('CSP 配置策略', () => {
  beforeAll(() => {
    // 延迟 require 以便在模块不存在时直接抛出并让测试失败
    // 通过这种方式确保我们会新增可复用的 CSP 配置模块
    // eslint-disable-next-line global-require
    const { cspDirectives } = require('../config/cspDirectives');
    directives = cspDirectives;
  });

  test('脚本策略必须允许 https scheme 与三层 CDN', () => {
    expect(directives.scriptSrc).toEqual(expect.arrayContaining([
      "'self'",
      "'unsafe-inline'",
      'https:',
      'https://cdn.bootcdn.net',
      'https://cdn.jsdelivr.net',
      'https://cdnjs.cloudflare.com'
    ]));
    expect(directives.scriptSrc).not.toEqual(expect.arrayContaining([
      'https://cdn.tailwindcss.com'
    ]));
  });

  test('样式策略必须允许 https scheme 并剔除 Google 域名', () => {
    expect(directives.styleSrc).toEqual(expect.arrayContaining([
      "'self'",
      'https:',
      'https://cdn.bootcdn.net',
      'https://cdn.jsdelivr.net',
      'https://cdnjs.cloudflare.com'
    ]));
    expect(directives.styleSrc).not.toEqual(expect.arrayContaining([
      'https://fonts.googleapis.com'
    ]));
  });

  test('字体策略允许 data/blob 并包含三层 CDN', () => {
    expect(directives.fontSrc).toEqual(expect.arrayContaining([
      "'self'",
      'https:',
      'data:',
      'blob:',
      'https://cdn.bootcdn.net',
      'https://cdnjs.cloudflare.com'
    ]));
    expect(directives.fontSrc).not.toEqual(expect.arrayContaining([
      'https://fonts.gstatic.com'
    ]));
  });
});
