let baseDirectives;
let viewerDirectives;
let exportsRef;

describe('CSP 配置策略', () => {
  beforeAll(() => {
    jest.resetModules();
    exportsRef = require('../config/cspDirectives');
    baseDirectives = exportsRef.cspDirectives;
    viewerDirectives = exportsRef.viewerCspDirectives;
  });

  afterAll(() => {
    jest.resetModules();
  });

  test('脚本策略必须允许 https scheme 与三层 CDN，并剔除 polyfill', () => {
    expect(baseDirectives.scriptSrc).toEqual(expect.arrayContaining([
      "'self'",
      "'unsafe-inline'",
      'https:',
      'https://cdn.bootcdn.net',
      'https://cdn.jsdelivr.net',
      'https://cdnjs.cloudflare.com'
    ]));
    expect(baseDirectives.scriptSrc).not.toEqual(expect.arrayContaining([
      'https://cdn.tailwindcss.com',
      'https://polyfill.io'
    ]));
  });

  test('样式策略允许三层 CDN 且剔除 Google 域名', () => {
    expect(baseDirectives.styleSrc).toEqual(expect.arrayContaining([
      "'self'",
      'https:',
      'https://cdn.bootcdn.net',
      'https://cdn.jsdelivr.net',
      'https://cdnjs.cloudflare.com'
    ]));
    expect(baseDirectives.styleSrc).not.toEqual(expect.arrayContaining([
      'https://fonts.googleapis.com'
    ]));
  });

  test('默认图片与媒体策略保持最小暴露，viewer 放宽至 https', () => {
    expect(baseDirectives.imgSrc).toEqual(["'self'", 'data:', 'blob:']);
    expect(baseDirectives.mediaSrc).toEqual(["'self'"]);

    expect(viewerDirectives.imgSrc).toEqual(expect.arrayContaining(["'self'", 'https:', 'data:', 'blob:']));
    expect(viewerDirectives.mediaSrc).toEqual(expect.arrayContaining(["'self'", 'https:', 'data:', 'blob:']));
  });

  test('EXTRA_CDN_ORIGINS 会被安全合并且去重', () => {
    process.env.EXTRA_CDN_ORIGINS = ' https://lib.baomitu.com , https://cdn.bootcdn.net ';
    jest.isolateModules(() => {
      const { CDN_ORIGINS } = require('../config/cspDirectives');
      expect(CDN_ORIGINS).toEqual(expect.arrayContaining(['https://lib.baomitu.com']));
      expect(CDN_ORIGINS.filter((origin) => origin === 'https://cdn.bootcdn.net')).toHaveLength(1);
    });
    delete process.env.EXTRA_CDN_ORIGINS;
  });
});
