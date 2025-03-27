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
  
  // 首先检查是否包含Markdown标记符号或格式
  // 这些是明确的Markdown特征
  if (trimmedCode.includes('###') || 
      trimmedCode.includes('##') || 
      trimmedCode.includes('# ') || 
      /^-\s.+/m.test(trimmedCode) || 
      /^\*\s.+/m.test(trimmedCode) || 
      /^\d+\.\s.+/m.test(trimmedCode) || 
      trimmedCode.includes('```') || 
      /\[.+\]\(.+\)/.test(trimmedCode) || 
      /!\[.+\]\(.+\)/.test(trimmedCode) || 
      /^>\s.+/m.test(trimmedCode) || 
      /\|.+\|/.test(trimmedCode) || 
      /\*\*.+\*\*/.test(trimmedCode) || 
      /__.+__/.test(trimmedCode)) {
    return CODE_TYPES.MARKDOWN;
  }
  
  // 检查是否包含SVG或Mermaid代码块标记
  if (trimmedCode.includes('```svg') || 
      trimmedCode.includes('```mermaid')) {
    return CODE_TYPES.MARKDOWN;
  }
  
  // 检测HTML
  if (trimmedCode.startsWith('<!DOCTYPE html>') || 
      trimmedCode.startsWith('<html') ||
      (trimmedCode.startsWith('<') && 
       (trimmedCode.includes('<div') || 
        trimmedCode.includes('<p') || 
        trimmedCode.includes('<span') || 
        trimmedCode.includes('<h1') || 
        trimmedCode.includes('<body') || 
        trimmedCode.includes('<head')))) {
    return CODE_TYPES.HTML;
  }
  
  // 检测纯文本
  // 任何纯文本内容都应该被识别为Markdown
  if (!trimmedCode.includes('<') && !trimmedCode.includes('>')) {
    return CODE_TYPES.MARKDOWN;
  }

  // 检测纯SVG - 只有当它是一个完整的SVG标签并且没有Markdown特征时
  if (trimmedCode.startsWith('<svg') && 
      trimmedCode.includes('</svg>') && 
      trimmedCode.includes('xmlns="http://www.w3.org/2000/svg"') && 
      !containsMarkdownFeatures(trimmedCode)) {
    return CODE_TYPES.SVG;
  }
  
  // 检测纯Mermaid - 只有当它是一个完整的Mermaid图表并且没有Markdown特征时
  if ((trimmedCode.startsWith('graph ') || 
      trimmedCode.startsWith('sequenceDiagram') || 
      trimmedCode.startsWith('classDiagram') || 
      trimmedCode.startsWith('gantt') || 
      trimmedCode.startsWith('pie') || 
      trimmedCode.startsWith('flowchart')) && 
      !containsMarkdownFeatures(trimmedCode)) {
    return CODE_TYPES.MERMAID;
  }
  
  // 默认返回Markdown
  // 这是一个重要的变化 - 我们默认将内容识别为Markdown而不是HTML
  return CODE_TYPES.MARKDOWN;
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

module.exports = {
  detectCodeType,
  CODE_TYPES
};
