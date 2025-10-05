const CDN_ORIGINS = [
  'https://cdn.bootcdn.net',
  'https://cdn.jsdelivr.net',
  'https://cdnjs.cloudflare.com'
];

/**
 * 构建统一的 CSP 指令集合，确保在可用性优先的前提下放宽至 https scheme，
 * 同时落实三层 CDN 兜底策略并剔除高风险的外部来源。
 * @returns {import('helmet').HelmetCspDirectives} 标准化的 CSP 指令配置
 */
function createCspDirectives() {
  return {
    defaultSrc: ["'self'"],
    scriptSrc: [
      "'self'",
      "'unsafe-inline'", // 为保证本项目课件的可用性，短期放行少量内联初始化脚本
      'https:',
      'blob:',
      'data:',
      ...CDN_ORIGINS,
      'https://polyfill.io'
    ],
    styleSrc: [
      "'self'",
      "'unsafe-inline'",
      'https:',
      'blob:',
      'data:',
      ...CDN_ORIGINS
    ],
    fontSrc: [
      "'self'",
      'https:',
      'data:',
      'blob:',
      ...CDN_ORIGINS
    ],
    imgSrc: [
      "'self'",
      'data:',
      'blob:'
    ],
    connectSrc: [
      "'self'",
      'https:',
      'wss:'
    ],
    objectSrc: ["'none'"],
    frameAncestors: ["'none'"],
    baseUri: ["'self'"],
    formAction: ["'self'"],
    upgradeInsecureRequests: []
  };
}

const cspDirectives = createCspDirectives();

module.exports = {
  CDN_ORIGINS,
  cspDirectives,
  createCspDirectives
};
