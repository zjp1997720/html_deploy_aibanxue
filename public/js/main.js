// HTML-GO 主要JavaScript文件
// 处理所有用户交互和功能

// 错误提示功能
function showErrorToast(message) {
  const errorToast = document.getElementById('error-toast');
  const errorMessage = document.getElementById('error-message');
  if (errorToast && errorMessage) {
    errorMessage.textContent = message;
    errorToast.classList.add('show');
    
    setTimeout(() => {
      errorToast.classList.remove('show');
    }, 3000);
  } else {
    console.error('错误提示元素不存在:', message);
  }
}

// 成功提示功能
function showSuccessToast(message) {
  const successToast = document.getElementById('success-toast');
  const successMessage = document.getElementById('success-message');
  if (successToast && successMessage) {
    successMessage.textContent = message;
    successToast.classList.add('show');
    
    setTimeout(() => {
      successToast.classList.remove('show');
    }, 3000);
  } else {
    console.error('成功提示元素不存在:', message);
  }
}

// 使用延迟加载确保所有元素已经完全渲染好
document.addEventListener('DOMContentLoaded', () => {
  console.log('DOM完全加载，初始化应用...');
  
  // DOM 元素
  const htmlInput = document.getElementById('html-input');
  const fileInput = document.getElementById('html-file');
  const codeInputContainer = document.getElementById('code-input-container');
  const fileName = document.getElementById('file-name');
  const clearButton = document.getElementById('clear-button');
  const generateButton = document.getElementById('generate-button');
  const resultSection = document.getElementById('result-section');
  const resultUrl = document.getElementById('result-url');
  const copyButton = document.getElementById('copy-button');
  const previewButton = document.getElementById('preview-button');
  const loadingIndicator = document.getElementById('loading-indicator');
  const passwordToggle = document.getElementById('password-toggle');
  const passwordInfo = document.getElementById('password-info');
  const generatedPassword = document.getElementById('generated-password');
  const copyPasswordOnly = document.getElementById('copy-password-button');
  const copyPasswordLink = document.getElementById('copy-password-link');
  
  // 创建代码编辑器
  let codeElement = null;
  let highlightEnabled = true;
  
  // 显示加载指示器
  function showLoading() {
    if (loadingIndicator) {
      loadingIndicator.style.display = 'flex';
    }
  }
  
  // 隐藏加载指示器
  function hideLoading() {
    if (loadingIndicator) {
      loadingIndicator.style.display = 'none';
    }
  }
  
  // 同步textarea内容到高亮显示区域
  function syncToTextarea() {
    if (codeElement) {
      codeElement.textContent = htmlInput.value;
      updateHighlighting();
    }
  }
  
  // 更新语法高亮
  function updateHighlighting() {
    if (codeElement && highlightEnabled) {
      hljs.highlightElement(codeElement);
    }
  }
  
  // 格式化 URL 显示
  function formatUrl(url) {
    try {
      const urlObj = new URL(url);
      const path = urlObj.pathname;
      const id = path.split('/').pop();
      
      // 创建带样式的 URL 显示
      return `<span style="color: var(--text-secondary);">${urlObj.origin}</span><span style="color: var(--primary);">/view/</span><span style="color: var(--accent); font-weight: bold;">${id}</span>`;
    } catch (e) {
      return url; // 如果解析失败，返回原始 URL
    }
  }
  
  // 文件上传处理
  if (fileInput) {
    fileInput.addEventListener('change', (event) => {
      const file = event.target.files[0];
      if (!file) return;
      
      if (!file.name.endsWith('.html') && !file.name.endsWith('.htm')) {
        showErrorToast('请上传 HTML 文件');
        return;
      }
      
      showLoading();
      fileName.textContent = file.name;
      
      const reader = new FileReader();
      reader.onload = (e) => {
        const content = e.target.result;
        htmlInput.value = content;
        
        // 将光标移动到文本末尾
        htmlInput.selectionStart = htmlInput.selectionEnd = content.length;
        
        // 同步到高亮区域
        syncToTextarea();
        hideLoading();
      };
      reader.readAsText(file);
    });
  }
  
  // 清除按钮功能
  if (clearButton) {
    clearButton.addEventListener('click', () => {
      console.log('清除按钮被点击');
      if (htmlInput) {
        htmlInput.value = '';
      }
      if (fileName) {
        fileName.textContent = '';
      }
      if (resultSection) {
        resultSection.style.display = 'none';
        resultSection.classList.remove('fade-in');
      }
      // 同步到高亮区域
      syncToTextarea();
      // 显示成功提示
      showSuccessToast('内容已清除');
    });
  }
  
  // 密码开关事件监听
  if (passwordToggle) {
    passwordToggle.addEventListener('change', async () => {
      // 如果没有生成链接，则不做任何操作
      if (!resultUrl || !resultUrl.dataset.originalUrl) {
        return;
      }
      
      if (passwordToggle.checked) {
        // 显示密码区域和复制按钮
        if (passwordInfo) passwordInfo.style.display = 'block';
        if (copyPasswordLink) copyPasswordLink.style.display = 'inline-block';
        
        // 更新数据库状态为需要密码才能访问
        try {
          const urlId = resultUrl.dataset.originalUrl.split('/').pop();
          await fetch(`/api/pages/${urlId}/protect`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ isProtected: true }),
          });
        } catch (error) {
          console.error('更新保护状态错误:', error);
        }
      } else {
        // 隐藏密码区域和复制按钮
        if (passwordInfo) passwordInfo.style.display = 'none';
        if (copyPasswordLink) copyPasswordLink.style.display = 'none';
        
        // 更新数据库状态为不需要密码就能访问
        try {
          const urlId = resultUrl.dataset.originalUrl.split('/').pop();
          await fetch(`/api/pages/${urlId}/protect`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ isProtected: false }),
          });
        } catch (error) {
          console.error('更新保护状态错误:', error);
        }
      }
    });
  }
  
  // 代码类型检测函数
  function detectCodeType(code) {
    if (!code || typeof code !== 'string') {
      return 'markdown'; // 默认返回Markdown
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
      return 'markdown';
    }
    
    // 检查是否包含SVG或Mermaid代码块标记
    if (trimmedCode.includes('```svg') || 
        trimmedCode.includes('```mermaid')) {
      return 'markdown';
    }
    
    // 检测HTML - 只有明确的HTML文档才识别为HTML
    if (trimmedCode.startsWith('<!DOCTYPE html>') || 
        trimmedCode.startsWith('<html') ||
        (trimmedCode.startsWith('<') && 
         (trimmedCode.includes('<div') || 
          trimmedCode.includes('<p') || 
          trimmedCode.includes('<span') || 
          trimmedCode.includes('<h1') || 
          trimmedCode.includes('<body') || 
          trimmedCode.includes('<head')))) {
      return 'html';
    }
    
    // 检测纯文本 - 任何纯文本内容都应该被识别为Markdown
    if (!trimmedCode.includes('<') && !trimmedCode.includes('>')) {
      return 'markdown';
    }

    // 检测纯SVG - 只有当它是一个完整的SVG标签并且没有Markdown特征时
    if (trimmedCode.startsWith('<svg') && 
        trimmedCode.includes('</svg>') && 
        trimmedCode.includes('xmlns="http://www.w3.org/2000/svg"')) {
      return 'svg';
    }
    
    // 检测纯Mermaid - 只有当它是一个完整的Mermaid图表时
    if ((trimmedCode.startsWith('graph ') || 
        trimmedCode.startsWith('sequenceDiagram') || 
        trimmedCode.startsWith('classDiagram') || 
        trimmedCode.startsWith('gantt') || 
        trimmedCode.startsWith('pie') || 
        trimmedCode.startsWith('flowchart'))) {
      return 'mermaid';
    }
    
    // 更智能的类型检测
    // 如果包含 HTML 标签，但不是完整的 HTML 文档，我们需要进一步判断
    if (trimmedCode.includes('<') && trimmedCode.includes('>')) {
      // 计算 HTML 标签的数量
      const htmlTagsCount = (trimmedCode.match(/<\/?[a-z][\s\S]*?>/gi) || []).length;
      // 计算 Markdown 特征的数量
      const markdownFeaturesCount = (
        (trimmedCode.match(/#{1,6}\s.+/gm) || []).length +
        (trimmedCode.match(/^-\s.+/gm) || []).length +
        (trimmedCode.match(/^\*\s.+/gm) || []).length +
        (trimmedCode.match(/^\d+\.\s.+/gm) || []).length +
        (trimmedCode.match(/```[\s\S]*?```/g) || []).length +
        (trimmedCode.match(/\[.+\]\(.+\)/g) || []).length +
        (trimmedCode.match(/!\[.+\]\(.+\)/g) || []).length +
        (trimmedCode.match(/^>\s.+/gm) || []).length +
        (trimmedCode.match(/\*\*.+\*\*/g) || []).length +
        (trimmedCode.match(/__.+__/g) || []).length
      );
      
      // 如果 Markdown 特征数量大于 HTML 标签数量，则返回 Markdown
      if (markdownFeaturesCount > htmlTagsCount) {
        return 'markdown';
      }
      
      // 否则返回 HTML
      return 'html';
    }
    
    // 如果没有明确的特征，默认返回 HTML
    return 'html';
  }

  // 显示代码类型标记
  function updateCodeTypeIndicator(codeType, content) {
    // 获取已存在的指示器
    const indicator = document.getElementById('code-type-indicator');
    const codeTypeText = document.getElementById('code-type-text');
    
    if (!indicator || !codeTypeText) {
      console.error('代码类型指示器元素不存在');
      return;
    }
    
    // 如果没有内容，隐藏指示器
    if (!content || content.trim() === '') {
      indicator.style.display = 'none';
      return;
    } else {
      indicator.style.display = 'flex';
    }
    
    // 根据代码类型设置样式和图标
    let iconClass = '';
    let label = '';
    let className = '';
    
    switch(codeType) {
      case 'html':
        iconClass = 'fas fa-code';
        label = 'HTML';
        className = 'html-type';
        break;
      case 'markdown':
        iconClass = 'fab fa-markdown';
        label = 'Markdown';
        className = 'markdown-type';
        break;
      case 'svg':
        iconClass = 'fas fa-bezier-curve';
        label = 'SVG';
        className = 'svg-type';
        break;
      case 'mermaid':
        iconClass = 'fas fa-project-diagram';
        label = 'Mermaid';
        className = 'mermaid-type';
        break;
      default:
        iconClass = 'fas fa-code';
        label = 'Code';
        className = 'default-type';
    }
    
    // 更新指示器类名
    indicator.className = `code-type-indicator ${className}`;
    
    // 更新图标和文本
    const iconElement = indicator.querySelector('i');
    if (iconElement) {
      iconElement.className = iconClass;
    }
    
    // 更新文本
    codeTypeText.textContent = label;
  }

  // 在输入框内容变化时检测代码类型
  if (htmlInput) {
    htmlInput.addEventListener('input', () => {
      const content = htmlInput.value;
      const codeType = detectCodeType(content);
      updateCodeTypeIndicator(codeType, content);
    });
    
    // 页面加载时检测初始内容
    if (htmlInput.value) {
      const content = htmlInput.value;
      
      // 检查是否在编辑页面上
      const isEditPage = window.location.pathname.includes('/edit/') || window.location.pathname.includes('/view/');
      
      // 如果是编辑页面，尝试从多个来源获取代码类型
      let codeType = 'html';
      if (isEditPage) {
        // 1. 尝试从 meta 标签中获取代码类型
        const metaCodeType = document.querySelector('meta[name="code-type"]');
        if (metaCodeType && metaCodeType.getAttribute('content')) {
          const typeFromMeta = metaCodeType.getAttribute('content');
          if (['html', 'markdown', 'svg', 'mermaid'].includes(typeFromMeta)) {
            codeType = typeFromMeta;
            console.log(`从 meta 标签中获取代码类型: ${codeType}`);
          }
        } else {
          // 2. 尝试从 URL 参数中获取代码类型
          const urlParams = new URLSearchParams(window.location.search);
          const typeFromUrl = urlParams.get('type');
          
          if (typeFromUrl && ['html', 'markdown', 'svg', 'mermaid'].includes(typeFromUrl)) {
            codeType = typeFromUrl;
            console.log(`从 URL 参数中获取代码类型: ${codeType}`);
          } else {
            // 3. 如果以上方法都失败，则使用检测函数
            codeType = detectCodeType(content);
            console.log(`检测到的代码类型: ${codeType}`);
          }
        }
      } else {
        // 如果不是编辑页面，使用检测函数
        codeType = detectCodeType(content);
      }
      
      updateCodeTypeIndicator(codeType, content);
    } else {
      // 初始时如果没有内容，隐藏指示器
      updateCodeTypeIndicator('html', '');
    }
  }

  // 生成链接
  if (generateButton) {
    generateButton.addEventListener('click', async () => {
      console.log('生成链接按钮被点击');
      // 确保从编辑器同步到textarea
      syncToTextarea();
      
      if (!htmlInput) {
        showErrorToast('HTML输入元素不存在');
        return;
      }
      
      const htmlContent = htmlInput.value.trim();
      
      if (!htmlContent) {
        showErrorToast('请输入 HTML 内容');
        return;
      }
      
      try {
        // 显示加载指示器
        loadingIndicator.classList.add('show');
        
        // 添加按钮加载动画
        generateButton.innerHTML = '<i class="fas fa-spinner fa-spin loading-spinner"></i> 处理中...';
        generateButton.disabled = true;
        
        // 检查是否启用密码保护
        const isProtected = passwordToggle ? passwordToggle.checked : false;
        
        // 检测代码类型
        const codeType = detectCodeType(htmlContent);
        console.log('检测到的代码类型:', codeType);
        
        // 调用 API 生成链接
        const response = await fetch('/api/pages/create', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ htmlContent, isProtected, codeType }),
        });
        
        const data = await response.json();
        console.log('API响应数据:', data); // 调试输出
        
        if (data.success) {
          const url = `${window.location.origin}/view/${data.urlId}`;
          
          // 格式化 URL 显示
          const formattedUrl = formatUrl(url);
          if (resultUrl) {
            resultUrl.innerHTML = formattedUrl;
            
            // 保存原始 URL 用于复制和预览
            resultUrl.dataset.originalUrl = url;
          }
          
          // 无论是否启用了密码保护，都保存密码
          if (generatedPassword) {
            generatedPassword.textContent = data.password;
          }
          console.log('生成的密码:', data.password); // 调试输出
          
          // 根据开关状态显示或隐藏密码区域
          if (passwordToggle && passwordToggle.checked) {
            if (passwordInfo) passwordInfo.style.display = 'block';
            if (copyPasswordLink) copyPasswordLink.style.display = 'inline-block';
          } else {
            if (passwordInfo) passwordInfo.style.display = 'none';
            if (copyPasswordLink) copyPasswordLink.style.display = 'none';
          }
          
          // 显示结果区域
          if (resultSection) {
            resultSection.style.display = 'block';
            
            // 使用 setTimeout 确保动画效果正确显示
            setTimeout(() => {
              resultSection.classList.add('fade-in');
            }, 10);
          }
          
          // 添加成功反馈
          generateButton.classList.add('success-pulse');
          setTimeout(() => {
            generateButton.classList.remove('success-pulse');
          }, 500);
          
          // 隐藏加载指示器
          loadingIndicator.classList.remove('show');
          
          // 不需要显示生成链接的toast提示
        } else {
          throw new Error(data.error || '生成链接失败');
        }
        
        // 恢复按钮状态
        generateButton.innerHTML = '<i class="fas fa-link mr-1"></i>生成链接';
        generateButton.disabled = false;
        
        // 隐藏加载指示器
        loadingIndicator.classList.remove('show');
      } catch (error) {
        console.error('生成链接错误:', error);
        showErrorToast('生成链接时发生错误');
        
        // 恢复按钮状态
        generateButton.innerHTML = '<i class="fas fa-link mr-1"></i>生成链接';
        generateButton.disabled = false;
        
        // 隐藏加载指示器
        loadingIndicator.classList.remove('show');
      }
    });
  }
  
  // 复制链接按钮 - 只复制链接
  if (copyButton) {
    copyButton.addEventListener('click', () => {
      if (!resultUrl || !resultUrl.dataset.originalUrl) {
        showErrorToast('没有可复制的链接');
        return;
      }
      
      // 始终只复制链接，不复制密码
      const textToCopy = resultUrl.dataset.originalUrl;
      console.log('要复制的链接:', textToCopy);
      
      // 使用传统的复制方法
      try {
        // 创建一个临时文本区域
        const textArea = document.createElement('textarea');
        textArea.value = textToCopy;
        textArea.style.position = 'fixed';  // 避免滚动到视图中
        textArea.style.left = '-999999px';
        textArea.style.top = '-999999px';
        document.body.appendChild(textArea);
        textArea.focus();
        textArea.select();
        
        // 执行复制命令
        const successful = document.execCommand('copy');
        document.body.removeChild(textArea);
        
        if (successful) {
          showSuccessToast('链接已复制到剪贴板');
          copyButton.classList.add('success-pulse');
          setTimeout(() => {
            copyButton.classList.remove('success-pulse');
          }, 500);
        } else {
          throw new Error('execCommand 复制失败');
        }
      } catch (error) {
        console.error('复制失败:', error);
        showErrorToast('复制链接失败');
      }
    });
  }
  
  // 预览按钮
  if (previewButton) {
    previewButton.addEventListener('click', () => {
      if (!resultUrl || !resultUrl.dataset.originalUrl) {
        showErrorToast('没有可预览的链接');
        return;
      }
      
      window.open(resultUrl.dataset.originalUrl, '_blank');
    });
  }
  
  // 密码区域点击复制功能
  if (generatedPassword) {
    generatedPassword.addEventListener('click', () => {
      if (!generatedPassword.textContent) {
        showErrorToast('没有可复制的密码');
        return;
      }
      
      const textToCopy = generatedPassword.textContent;
      console.log('要复制的密码:', textToCopy); // 调试输出
      
      // 使用传统的复制方法
      const copyToClipboard = (text) => {
        try {
          // 创建一个临时文本区域
          const textArea = document.createElement('textarea');
          textArea.value = text;
          textArea.style.position = 'fixed';  // 避免滚动到视图中
          textArea.style.left = '-999999px';
          textArea.style.top = '-999999px';
          document.body.appendChild(textArea);
          textArea.focus();
          textArea.select();
          
          // 执行复制命令
          const successful = document.execCommand('copy');
          document.body.removeChild(textArea);
          
          if (successful) {
            showSuccessToast('密码已复制到剪贴板');
            
            // 添加视觉反馈
            generatedPassword.classList.add('copied');
            setTimeout(() => {
              generatedPassword.classList.remove('copied');
            }, 500);
            
            return true;
          } else {
            throw new Error('execCommand 复制失败');
          }
        } catch (err) {
          console.error('复制失败:', err);
          showErrorToast('复制失败');
          return false;
        }
      };
      
      copyToClipboard(textToCopy);
    });
  }
  
  // 复制密码和链接按钮
  if (copyPasswordLink) {
    copyPasswordLink.addEventListener('click', (e) => {
      e.preventDefault(); // 防止默认的锚点行为
      
      if (!resultUrl || !resultUrl.dataset.originalUrl || !generatedPassword || !generatedPassword.textContent) {
        showErrorToast('没有可复制的内容');
        return;
      }
      
      const textToCopy = `链接: ${resultUrl.dataset.originalUrl}\n密码: ${generatedPassword.textContent}`;
      console.log('要复制的内容:', textToCopy); // 调试输出
      
      // 使用传统的复制方法
      const copyToClipboard = (text) => {
        try {
          // 创建一个临时文本区域
          const textArea = document.createElement('textarea');
          textArea.value = text;
          textArea.style.position = 'fixed';  // 避免滚动到视图中
          textArea.style.left = '-999999px';
          textArea.style.top = '-999999px';
          document.body.appendChild(textArea);
          textArea.focus();
          textArea.select();
          
          // 执行复制命令
          const successful = document.execCommand('copy');
          document.body.removeChild(textArea);
          
          if (successful) {
            showSuccessToast('链接和密码已复制到剪贴板');
            
            // 添加视觉反馈
            copyPasswordLink.classList.add('success-pulse');
            setTimeout(() => {
              copyPasswordLink.classList.remove('success-pulse');
            }, 500);
            
            return true;
          } else {
            throw new Error('execCommand 复制失败');
          }
        } catch (err) {
          console.error('复制失败:', err);
          showErrorToast('复制失败');
          return false;
        }
      };
      
      copyToClipboard(textToCopy);
    });
  }
  
  // 初始化完成
  console.log('应用初始化完成');
});
