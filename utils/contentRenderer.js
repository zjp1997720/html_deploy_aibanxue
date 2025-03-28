/**
 * u5185u5bb9u6e32u67d3u5de5u5177
 * u7528u4e8eu6e32u67d3u4e0du540cu7c7bu578bu7684u5185u5bb9uff08HTMLu3001Markdownu3001SVGu3001Mermaiduff09
 */

const { marked } = require('marked');
const { JSDOM } = require('jsdom');
const { renderMermaid: mermaidRenderer } = require('mermaid-render');
const { CODE_TYPES } = require('./codeDetector');

/**
 * u6e32u67d3HTMLu5185u5bb9
 * @param {string} content - HTMLu5185u5bb9
 * @returns {string} - u5904u7406u540eu7684HTML
 */
function renderHtml(content) {
  // u5982u679cu662fu5b8cu6574u7684HTMLu6587u6863uff0cu76f4u63a5u8fd4u56de
  if (content.trim().startsWith('<!DOCTYPE html>') || 
      content.trim().startsWith('<html')) {
    return content;
  }
  
  // u5982u679cu4e0du662fu5b8cu6574u7684HTMLu6587u6863uff0cu6dfbu52a0u57fau672cu7684HTMLu7ed3u6784
  return `
    <!DOCTYPE html>
    <html lang="zh-CN">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>HTML-GO 查看器</title>
      
      <!-- 网站图标 -->
      <link rel="icon" href="/icon/web/favicon.ico" sizes="any">
      <link rel="apple-touch-icon" href="/icon/web/apple-touch-icon.png">
      <link rel="icon" type="image/png" sizes="192x192" href="/icon/web/icon-192.png">
      <link rel="icon" type="image/png" sizes="512x512" href="/icon/web/icon-512.png">
      <meta name="theme-color" content="#6366f1">
      
      <!-- iOS 特殊设置 -->
      <meta name="apple-mobile-web-app-capable" content="yes">
      <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent">
      <meta name="apple-mobile-web-app-title" content="HTML-GO">
      
      <link rel="stylesheet" href="/css/styles.css">
      <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/highlight.js/11.7.0/styles/atom-one-dark.min.css">
      <style>
        body {
          font-family: 'Roboto', sans-serif;
          line-height: 1.6;
          color: #333;
          max-width: 1000px;
          margin: 0 auto;
          padding: 20px;
        }
        .container {
          background-color: white;
          border-radius: 8px;
          box-shadow: 0 2px 10px rgba(0,0,0,0.1);
          padding: 30px;
          margin-top: 20px;
        }
        @media (prefers-color-scheme: dark) {
          body {
            background-color: #1a1a1a;
            color: #e6e6e6;
          }
          .container {
            background-color: #2a2a2a;
            box-shadow: 0 2px 10px rgba(0,0,0,0.3);
          }
        }
      </style>
    </head>
    <body>
      <div class="container">
        ${content}
      </div>
      <script src="https://cdnjs.cloudflare.com/ajax/libs/highlight.js/11.7.0/highlight.min.js"></script>
      <script>
        document.addEventListener('DOMContentLoaded', () => {
          document.querySelectorAll('pre code').forEach((block) => {
            hljs.highlightElement(block);
          });
        });
      </script>
    </body>
    </html>
  `;
}

/**
 * u6e32u67d3Markdownu5185u5bb9
 * @param {string} content - Markdownu5185u5bb9
 * @returns {string} - u6e32u67d3u540eu7684HTML
 */
async function renderMarkdown(content) {
  // 预处理内容，查找并提取 Mermaid 和 SVG 代码块
  const processedContent = await preprocessMarkdown(content);
  
  // 配置Marked选项
  marked.setOptions({
    gfm: true,
    breaks: true,
    smartLists: true,
    smartypants: true,
    highlight: function(code, lang) {
      const hljs = require('highlight.js');
      if (lang && hljs.getLanguage(lang)) {
        try {
          return hljs.highlight(code, { language: lang }).value;
        } catch (err) {}
      }
      return hljs.highlightAuto(code).value;
    }
  });
  
  // 将Markdown转换为HTML
  const htmlContent = marked.parse(processedContent.markdown);
  
  // 生成客户端渲染Mermaid图表的脚本
  let mermaidScript = '';
  if (processedContent.mermaidCharts && processedContent.mermaidCharts.length > 0) {
    mermaidScript = `
    <script src="https://cdn.jsdelivr.net/npm/mermaid/dist/mermaid.min.js"></script>
    <script>
      mermaid.initialize({
        startOnLoad: true,
        theme: 'default',
        securityLevel: 'loose',
        flowchart: { useMaxWidth: true }
      });
    </script>
    `;
  }

  // 添加嵌入内容的样式
  const embeddedStyles = `
    .embedded-svg-container {
      margin: 20px 0;
      overflow: auto;
      max-width: 100%;
    }
    .embedded-mermaid-container {
      margin: 20px 0;
      text-align: center;
    }
    .mermaid {
      margin: 20px 0;
      text-align: center;
    }
  `;

  // 返回带有字节跳动风格的HTML
  return `
    <!DOCTYPE html>
    <html lang="zh-CN">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>HTML-GO Markdown查看器</title>
      
      <!-- 网站图标 -->
      <link rel="icon" href="/icon/web/favicon.ico" sizes="any">
      <link rel="apple-touch-icon" href="/icon/web/apple-touch-icon.png">
      <link rel="icon" type="image/png" sizes="192x192" href="/icon/web/icon-192.png">
      <link rel="icon" type="image/png" sizes="512x512" href="/icon/web/icon-512.png">
      <meta name="theme-color" content="#6366f1">
      
      <!-- iOS 特殊设置 -->
      <meta name="apple-mobile-web-app-capable" content="yes">
      <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent">
      <meta name="apple-mobile-web-app-title" content="HTML-GO">
      
      <link rel="stylesheet" href="/css/markdown-bytedance.css">
      <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/highlight.js/11.7.0/styles/atom-one-dark.min.css">
      <link rel="preconnect" href="https://fonts.googleapis.com">
      <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
      <link href="https://fonts.googleapis.com/css2?family=Roboto:wght@300;400;500;700&family=Noto+Serif+SC:wght@400;500;600&display=swap" rel="stylesheet">
      <style>
        body {
          margin: 0;
          padding: 0;
          background-color: #f5f5f7;
        }
        @media (prefers-color-scheme: dark) {
          body {
            background-color: #1a1a1a;
          }
        }
        ${embeddedStyles}
      </style>
      ${mermaidScript}
    </head>
    <body>
      <div class="markdown-body">
        ${htmlContent}
      </div>
      <script src="https://cdnjs.cloudflare.com/ajax/libs/highlight.js/11.7.0/highlight.min.js"></script>
      <script>
        document.addEventListener('DOMContentLoaded', () => {
          // 代码高亮
          document.querySelectorAll('pre code').forEach((block) => {
            hljs.highlightElement(block);
          });
        });
      </script>
    </body>
    </html>
  `;
}

/**
 * u6e32u67d3SVGu5185u5bb9
 * @param {string} content - SVGu5185u5bb9
 * @returns {string} - u5305u542bSVGu7684HTML
 */
function renderSvg(content) {
  // u5982u679cu662fu5355u72ecu7684SVGu6587u4ef6uff0cu5c06u5176u5d4cu5165u5230HTMLu4e2d
  return `
    <!DOCTYPE html>
    <html lang="zh-CN">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>HTML-GO SVG查看器</title>
      
      <!-- 网站图标 -->
      <link rel="icon" href="/icon/web/favicon.ico" sizes="any">
      <link rel="apple-touch-icon" href="/icon/web/apple-touch-icon.png">
      <link rel="icon" type="image/png" sizes="192x192" href="/icon/web/icon-192.png">
      <link rel="icon" type="image/png" sizes="512x512" href="/icon/web/icon-512.png">
      <meta name="theme-color" content="#6366f1">
      
      <!-- iOS 特殊设置 -->
      <meta name="apple-mobile-web-app-capable" content="yes">
      <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent">
      <meta name="apple-mobile-web-app-title" content="HTML-GO">
      
      <style>
        body {
          font-family: 'Roboto', sans-serif;
          line-height: 1.6;
          color: #333;
          margin: 0;
          padding: 20px;
          display: flex;
          justify-content: center;
          align-items: center;
          min-height: 100vh;
          background-color: #f5f5f7;
        }
        .svg-container {
          max-width: 100%;
          overflow: auto;
          background-color: white;
          padding: 20px;
          border-radius: 8px;
          box-shadow: 0 2px 10px rgba(0,0,0,0.1);
        }
        svg {
          display: block;
          max-width: 100%;
          height: auto;
        }
        @media (prefers-color-scheme: dark) {
          body {
            background-color: #1a1a1a;
            color: #e6e6e6;
          }
          .svg-container {
            background-color: #2a2a2a;
            box-shadow: 0 2px 10px rgba(0,0,0,0.3);
          }
        }
      </style>
    </head>
    <body>
      <div class="svg-container">
        ${content}
      </div>
    </body>
    </html>
  `;
}

/**
 * u6e32u67d3Mermaidu56feu8868
 * @param {string} content - Mermaidu8bedu6cd5u7684u5185u5bb9
 * @returns {Promise<string>} - u6e32u67d3u540eu7684HTML
 */
async function renderMermaid(content) {
  console.log('[DEBUG] renderMermaid 被调用');
  console.log(`[DEBUG] Mermaid 原始内容长度: ${content.length}`);
  console.log(`[DEBUG] Mermaid 原始内容前100字符: ${content.substring(0, 100)}...`);
  
  try {
    // 处理可能的Markdown包裹
    let mermaidCode = content;
    
    // 检查是否是纯 Mermaid 语法（不带 ```mermaid 标记）
    if (!content.includes('```mermaid') && 
        (content.trim().startsWith('graph ') || 
         content.trim().startsWith('sequenceDiagram') || 
         content.trim().startsWith('classDiagram') || 
         content.trim().startsWith('gantt') || 
         content.trim().startsWith('pie') || 
         content.trim().startsWith('flowchart'))) {
      console.log('[DEBUG] 检测到纯 Mermaid 语法');
      mermaidCode = content.trim();
    }
    // 处理 Markdown 包裹的 Mermaid
    else if (content.includes('```mermaid')) {
      console.log('[DEBUG] 检测到 Markdown 包裹的 Mermaid 内容');
      const match = content.match(/```mermaid\n([\s\S]+?)\n```/);
      if (match && match[1]) {
        mermaidCode = match[1].trim();
        console.log(`[DEBUG] 提取的 Mermaid 代码长度: ${mermaidCode.length}`);
      } else {
        console.log('[DEBUG] 无法提取 Mermaid 代码');
      }
    }
    
    console.log('[DEBUG] 尝试使用 mermaid-render 渲染图表');
    console.log(`[DEBUG] 传递给 mermaidRenderer 的代码: ${mermaidCode}`);
    
    // 使用mermaid-render渲染图表
    const svg = await mermaidRenderer(mermaidCode, {
      theme: 'default',
      backgroundColor: 'transparent'
    });
    
    console.log('[DEBUG] Mermaid 渲染成功');
    console.log(`[DEBUG] 生成的 SVG 长度: ${svg.length} 字符`);
    
    // u8fd4u56deu5305u542bu6e32u67d3u540eu56feu8868u7684HTML
    return `
      <!DOCTYPE html>
      <html lang="zh-CN">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>HTML-GO Mermaid查看器</title>
        
        <!-- 网站图标 -->
        <link rel="icon" href="/icon/web/favicon.ico" sizes="any">
        <link rel="apple-touch-icon" href="/icon/web/apple-touch-icon.png">
        <link rel="icon" type="image/png" sizes="192x192" href="/icon/web/icon-192.png">
        <link rel="icon" type="image/png" sizes="512x512" href="/icon/web/icon-512.png">
        <meta name="theme-color" content="#6366f1">
        
        <!-- iOS 特殊设置 -->
        <meta name="apple-mobile-web-app-capable" content="yes">
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent">
        <meta name="apple-mobile-web-app-title" content="HTML-GO">
        
        <style>
          body {
            font-family: 'Roboto', sans-serif;
            line-height: 1.6;
            color: #333;
            margin: 0;
            padding: 20px;
            display: flex;
            justify-content: center;
            align-items: center;
            min-height: 100vh;
            background-color: #f5f5f7;
          }
          .mermaid-container {
            max-width: 100%;
            overflow: auto;
            background-color: white;
            padding: 20px;
            border-radius: 8px;
            box-shadow: 0 2px 10px rgba(0,0,0,0.1);
          }
          svg {
            display: block;
            max-width: 100%;
            height: auto;
          }
          @media (prefers-color-scheme: dark) {
            body {
              background-color: #1a1a1a;
              color: #e6e6e6;
            }
            .mermaid-container {
              background-color: #2a2a2a;
              box-shadow: 0 2px 10px rgba(0,0,0,0.3);
            }
          }
        </style>
      </head>
      <body>
        <div class="mermaid-container">
          ${svg}
        </div>
      </body>
      </html>
    `;
  } catch (error) {
    console.error('Mermaid渲染错误:', error);
    console.log(`[DEBUG] Mermaid 渲染错误详情: ${error.message}`);
    console.log(`[DEBUG] 错误堆栈: ${error.stack}`);
    // u5982u679cu6e32u67d3u5931u8d25uff0cu8fd4u56deu9519u8befu4fe1u606f
    return `
      <!DOCTYPE html>
      <html lang="zh-CN">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>HTML-GO Mermaidu9519u8bef</title>
        <style>
          body {
            font-family: 'Roboto', sans-serif;
            line-height: 1.6;
            color: #333;
            margin: 0;
            padding: 20px;
            display: flex;
            flex-direction: column;
            justify-content: center;
            align-items: center;
            min-height: 100vh;
            background-color: #f5f5f7;
          }
          .error-container {
            max-width: 800px;
            background-color: white;
            padding: 20px;
            border-radius: 8px;
            box-shadow: 0 2px 10px rgba(0,0,0,0.1);
          }
          .error-title {
            color: #e74c3c;
            margin-bottom: 10px;
          }
          .code-block {
            background-color: #f8f9fa;
            border-radius: 4px;
            padding: 15px;
            overflow-x: auto;
            margin: 15px 0;
            border-left: 4px solid #e74c3c;
          }
          pre {
            margin: 0;
            white-space: pre-wrap;
            word-wrap: break-word;
          }
          @media (prefers-color-scheme: dark) {
            body {
              background-color: #1a1a1a;
              color: #e6e6e6;
            }
            .error-container {
              background-color: #2a2a2a;
              box-shadow: 0 2px 10px rgba(0,0,0,0.3);
            }
            .code-block {
              background-color: #333;
              border-left: 4px solid #e74c3c;
            }
          }
        </style>
      </head>
      <body>
        <div class="error-container">
          <h2 class="error-title">Mermaidu56feu8868u6e32u67d3u9519u8bef</h2>
          <p>u60a8u63d0u4f9bu7684Mermaidu56feu8868u4ee3u7801u65e0u6cd5u6e32u67d3u3002u8bf7u68c0u67e5u8bedu6cd5u662fu5426u6b63u786eu3002</p>
          <div class="code-block">
            <pre><code>${escapeHtml(content)}</code></pre>
          </div>
          <p>u9519u8befu4fe1u606f: ${escapeHtml(error.message)}</p>
        </div>
      </body>
      </html>
    `;
  }
}

/**
 * u8f6cu4e49HTMLu5b57u7b26
 * @param {string} unsafe - u9700u8981u8f6cu4e49u7684u5b57u7b26u4e32
 * @returns {string} - u8f6cu4e49u540eu7684u5b57u7b26u4e32
 */
function escapeHtml(unsafe) {
  return unsafe
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

/**
 * u6839u636eu5185u5bb9u7c7bu578bu6e32u67d3u5185u5bb9
 * @param {string} content - u8981u6e32u67d3u7684u5185u5bb9
 * @param {string} contentType - u5185u5bb9u7c7bu578b
 * @returns {Promise<string>} - u6e32u67d3u540eu7684HTML
 */
async function renderContent(content, contentType) {
  console.log(`[DEBUG] renderContent 被调用，内容类型: ${contentType}`);
  console.log(`[DEBUG] 内容长度: ${content.length} 字符`);
  
  switch (contentType) {
    case CODE_TYPES.HTML:
      console.log('[DEBUG] 使用 HTML 渲染器');
      return renderHtml(content);
    case CODE_TYPES.MARKDOWN:
      console.log('[DEBUG] 使用 Markdown 渲染器');
      const markdownResult = await renderMarkdown(content);
      console.log(`[DEBUG] Markdown 渲染完成，结果长度: ${markdownResult.length} 字符`);
      return markdownResult;
    case CODE_TYPES.SVG:
      console.log('[DEBUG] 使用 SVG 渲染器');
      return renderSvg(content);
    case CODE_TYPES.MERMAID:
      console.log('[DEBUG] 使用 Mermaid 渲染器');
      return await renderMermaid(content);
    default:
      // 默认使用Markdown渲染器，与代码检测逻辑保持一致
      console.log(`[DEBUG] 使用默认渲染器 (Markdown)，因为内容类型 '${contentType}' 未知`);
      return await renderMarkdown(content);
  }
}

/**
 * 预处理Markdown内容，提取特殊代码块
 * @param {string} content - Markdown内容
 * @returns {Object} - 处理后的Markdown和特殊代码块
 */
async function preprocessMarkdown(content) {
  const mermaidCharts = [];
  const svgBlocks = [];
  
  // 使用正则表达式查找代码块
  const codeBlockRegex = /```(\w+)\n([\s\S]*?)```/g;
  
  // 替换所有代码块
  let processedMarkdown = content;
  let match;
  
  // 处理所有代码块
  while ((match = codeBlockRegex.exec(content)) !== null) {
    const [fullMatch, language, code] = match;
    const startIndex = match.index;
    const endIndex = startIndex + fullMatch.length;
    
    // 处理SVG代码块
    if (language.toLowerCase() === 'svg') {
      const id = `svg-${svgBlocks.length}`;
      svgBlocks.push({ id, code });
      const replacement = `<div class="embedded-svg-container" id="${id}">
${code}
</div>`;
      
      // 替换原始内容
      processedMarkdown = processedMarkdown.substring(0, startIndex) + 
                          replacement + 
                          processedMarkdown.substring(endIndex);
      
      // 调整正则表达式的lastIndex
      codeBlockRegex.lastIndex = startIndex + replacement.length;
    }
    // 处理Mermaid图表
    else if (language.toLowerCase() === 'mermaid') {
      try {
        // 尝试在服务器端预渲染Mermaid
        const svg = await mermaidRenderer(code, {
          theme: 'default',
          backgroundColor: 'transparent'
        });
        
        const replacement = `<div class="embedded-mermaid-container">
${svg}
</div>`;
        
        // 替换原始内容
        processedMarkdown = processedMarkdown.substring(0, startIndex) + 
                            replacement + 
                            processedMarkdown.substring(endIndex);
        
        // 调整正则表达式的lastIndex
        codeBlockRegex.lastIndex = startIndex + replacement.length;
      } catch (error) {
        console.error('Mermaid预渲染错误:', error);
        // 如果服务器端渲染失败，添加到客户端渲染列表
        const chartId = `mermaid-${mermaidCharts.length}`;
        mermaidCharts.push({ id: chartId, code });
        
        const replacement = `<div class="mermaid" id="${chartId}">
${code}
</div>`;
        
        // 替换原始内容
        processedMarkdown = processedMarkdown.substring(0, startIndex) + 
                            replacement + 
                            processedMarkdown.substring(endIndex);
        
        // 调整正则表达式的lastIndex
        codeBlockRegex.lastIndex = startIndex + replacement.length;
      }
    }
  }
  
  return {
    markdown: processedMarkdown,
    mermaidCharts,
    svgBlocks
  };
}

module.exports = {
  renderContent,
  renderHtml,
  renderMarkdown,
  renderSvg,
  renderMermaid,
  escapeHtml
};
