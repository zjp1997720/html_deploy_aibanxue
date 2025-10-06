const DEFAULT_CDN_ORIGINS = [
  'https://cdn.bootcdn.net',
  'https://cdn.jsdelivr.net',
  'https://cdnjs.cloudflare.com'
];

/**
 * 解析 EXTRA_CDN_ORIGINS 环境变量，得到去重的额外可信 CDN 域名。
 * @returns {string[]} 附加 CDN 域名列表
 */
function resolveExtraCdnOrigins() {
  const extraOrigins = process.env.EXTRA_CDN_ORIGINS || '';
  return Array.from(
    new Set(
      extraOrigins
        .split(',')
        .map((origin) => origin.trim())
        .filter(Boolean)
    )
  );
}

const EXTRA_CDN_ORIGINS = resolveExtraCdnOrigins();
const CDN_ORIGINS = Array.from(new Set([...DEFAULT_CDN_ORIGINS, ...EXTRA_CDN_ORIGINS]));

/**
 * 构建基础 CSP 指令，适配不同业务场景的细粒度开关。
 * @param {object} options - 指令构建选项
 * @param {boolean} [options.allowRemoteImages=false] - 是否允许远程图片资源
 * @param {boolean} [options.allowRemoteMedia=false] - 是否允许远程音/视频资源
 * @returns {import('helmet').HelmetCspDirectives} CSP 指令集合
 */
function buildDirectives({ allowRemoteImages = false, allowRemoteMedia = false } = {}) {
  const directives = {
    defaultSrc: ["'self'"],
    scriptSrc: [
      "'self'",
      "'unsafe-inline'",
      'https:',
      'blob:',
      'data:',
      ...CDN_ORIGINS
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
    mediaSrc: ["'self'"],
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

  if (allowRemoteImages) {
    directives.imgSrc = ["'self'", 'https:', 'data:', 'blob:'];
  }

  if (allowRemoteMedia) {
    directives.mediaSrc = ["'self'", 'https:', 'data:', 'blob:'];
  }

  return directives;
}

/**
 * 创建默认（后台/管理端）使用的 CSP 指令。
 * @returns {import('helmet').HelmetCspDirectives}
 */
function createCspDirectives() {
  return buildDirectives();
}

/**
 * 创建课件查看页（/view）使用的 CSP 指令，允许远程图片与音视频。
 * @returns {import('helmet').HelmetCspDirectives}
 */
function createViewerCspDirectives() {
  return buildDirectives({ allowRemoteImages: true, allowRemoteMedia: true });
}

const cspDirectives = createCspDirectives();
const viewerCspDirectives = createViewerCspDirectives();

module.exports = {
  DEFAULT_CDN_ORIGINS,
  EXTRA_CDN_ORIGINS,
  CDN_ORIGINS,
  buildDirectives,
  createCspDirectives,
  createViewerCspDirectives,
  cspDirectives,
  viewerCspDirectives
};
