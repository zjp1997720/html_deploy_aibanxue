/**
 * 代码类型检测工具
 * 用于检测输入的代码类型（HTML、Markdown、SVG、Mermaid等）
 */

const CODE_TYPES = {
  HTML: 'html',
  MARKDOWN: 'markdown',
  SVG: 'svg',
  MERMAID: 'mermaid',
  UNKNOWN: 'unknown'
};

/**
 * 检测代码类型
 * @param {string} code - 输入的代码内容
 * @returns {string} - 返回代码类型
 */
function detectCodeType(code) {
  if (!code || typeof code !== 'string') {
    return CODE_TYPES.UNKNOWN;
  }
  
  const trimmedCode = code.trim();
  
  // 首先检查是否是完整的HTML文档
  // 这种情况应该直接返回HTML，不需要进一步检查
  if (trimmedCode.startsWith('<!DOCTYPE html>') || 
      trimmedCode.startsWith('<html')) {
    console.log('[DEBUG] 检测到完整HTML文档');
    return CODE_TYPES.HTML;
  }
  
  // 检查是否包含 Mermaid 代码块标记
  if (trimmedCode.includes('```mermaid')) {
    return CODE_TYPES.MERMAID;
  }
  
  // 检查是否包含 SVG 代码块标记
  if (trimmedCode.includes('```svg')) {
    return CODE_TYPES.MARKDOWN;
  }
  
  // 检测纯Mermaid - 支持所有 Mermaid 图表类型
  const mermaidPatterns = [
    /^\s*graph\s+[A-Za-z\s]/i,        // 流程图
    /^\s*flowchart\s+[A-Za-z\s]/i,    // 流程图 (新语法)
    /^\s*sequenceDiagram/i,           // 序列图
    /^\s*classDiagram/i,              // 类图
    /^\s*gantt/i,                    // 甘特图
    /^\s*pie/i,                      // 饼图
    /^\s*erDiagram/i,                // ER图
    /^\s*journey/i,                  // 用户旅程图
    /^\s*stateDiagram/i,             // 状态图
    /^\s*gitGraph/i                  // Git图
  ];
  
  // 检查是否是纯 Mermaid 语法
  const isPureMermaid = mermaidPatterns.some(pattern => pattern.test(trimmedCode));
  
  if (isPureMermaid && !containsMarkdownFeatures(trimmedCode)) {
    console.log('[DEBUG] 检测到纯 Mermaid 语法');
    return CODE_TYPES.MERMAID;
  }
  
  // 检测纯SVG
  if (trimmedCode.startsWith('<svg') && 
      trimmedCode.includes('</svg>') && 
      trimmedCode.includes('xmlns="http://www.w3.org/2000/svg"')) {
    return CODE_TYPES.SVG;
  }
  
  // 检测HTML - 更全面的检查
  if (trimmedCode.startsWith('<') && 
      (trimmedCode.includes('<div') || 
       trimmedCode.includes('<p') || 
       trimmedCode.includes('<span') || 
       trimmedCode.includes('<h1') || 
       trimmedCode.includes('<body') || 
       trimmedCode.includes('<head') ||
       trimmedCode.includes('<style') ||
       trimmedCode.includes('<script') ||
       trimmedCode.includes('<link') ||
       trimmedCode.includes('<meta'))) {
    return CODE_TYPES.HTML;
  }
  
  // 检测明确的Markdown特征
  // 使用更严格的规则，避免误判
  if (isDefinitelyMarkdown(trimmedCode)) {
    return CODE_TYPES.MARKDOWN;
  }
  
  // 默认返回HTML
  // 这是一个重要的变化 - 我们默认将内容识别为HTML而不是Markdown
  return CODE_TYPES.HTML;
}

/**
 * 检测是否包含Markdown特征
 * @param {string} content - 要检测的内容
 * @returns {boolean} - 是否包含Markdown特征
 */
function containsMarkdownFeatures(content) {
  // 检查是否包含Markdown特征
  return (
    content.includes('###') || 
    content.includes('##') || 
    content.includes('# ') || 
    /^-\s.+/m.test(content) || 
    /^\*\s.+/m.test(content) || 
    /^\d+\.\s.+/m.test(content) || 
    content.includes('```') || 
    /\[.+\]\(.+\)/.test(content) || 
    /!\[.+\]\(.+\)/.test(content) || 
    /^>\s.+/m.test(content) || 
    /\|.+\|/.test(content) || 
    /\*\*.+\*\*/.test(content) || 
    /__.+__/.test(content)
  );
}

/**
 * 检测内容是否明确是Markdown格式
 * @param {string} content - 要检测的内容
 * @returns {boolean} - 是否是Markdown
 */
function isDefinitelyMarkdown(content) {
  // 检查明确的Markdown标记
  const hasHeadings = /^#{1,6}\s.+/m.test(content);
  const hasListItems = /^[-*+]\s.+/m.test(content);
  const hasNumberedList = /^\d+\.\s.+/m.test(content);
  const hasBlockquotes = /^>\s.+/m.test(content);
  const hasCodeBlocks = /^```[\s\S]*?```/m.test(content);
  const hasLinks = /\[.+?\]\(.+?\)/m.test(content);
  const hasImages = /!\[.+?\]\(.+?\)/m.test(content);
  const hasTables = /\|.+\|[\s\S]*?\|.+\|/m.test(content);
  
  // 如果包含多个Markdown特征，或者内容很短且包含至少一个特征，则认为是Markdown
  const markdownFeatureCount = [
    hasHeadings, hasListItems, hasNumberedList, hasBlockquotes, 
    hasCodeBlocks, hasLinks, hasImages, hasTables
  ].filter(Boolean).length;
  
  return markdownFeatureCount >= 2 || (content.length < 1000 && markdownFeatureCount >= 1);
}

module.exports = {
  detectCodeType,
  CODE_TYPES
};
