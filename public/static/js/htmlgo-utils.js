// HTML-GO 工具函数
window.HTMLGOUtils = {
  // 显示加载中
  showLoading: function() {
    const loadingIndicator = document.getElementById('loading-indicator');
    if (loadingIndicator) {
      loadingIndicator.style.display = 'flex';
    }
    
    // 禁用按钮
    const generateBtn = document.getElementById('generate-button') || document.querySelector('button[aria-label="生成分享链接"]');
    const previewBtn = document.getElementById('preview-button') || document.querySelector('button[aria-label="预览"]');
    
    if (generateBtn) generateBtn.disabled = true;
    if (previewBtn) previewBtn.disabled = true;
  },
  
  // 隐藏加载中
  hideLoading: function() {
    const loadingIndicator = document.getElementById('loading-indicator');
    if (loadingIndicator) {
      loadingIndicator.style.display = 'none';
    }
    
    // 恢复按钮状态
    const content = document.getElementById('html-input')?.value || 
                    document.querySelector('textarea[aria-label*="代码"]')?.value || '';
    const hasContent = content.trim().length > 0;
    
    const generateBtn = document.getElementById('generate-button') || document.querySelector('button[aria-label="生成分享链接"]');
    const previewBtn = document.getElementById('preview-button') || document.querySelector('button[aria-label="预览"]');
    
    if (generateBtn) generateBtn.disabled = !hasContent;
    if (previewBtn) previewBtn.disabled = !hasContent;
  },
  
  // 显示提示消息
  showToast: function(message, type = 'info') {
    // 创建toast元素（如果不存在）
    let toast = document.getElementById('toast');
    if (!toast) {
      toast = document.createElement('div');
      toast.id = 'toast';
      toast.className = 'toast';
      document.body.appendChild(toast);
    }
    
    // 设置消息和样式
    toast.textContent = message;
    toast.className = `toast ${type}`;
    
    // 显示toast
    toast.style.display = 'block';
    toast.style.opacity = '1';
    
    // 3秒后自动隐藏
    setTimeout(() => {
      toast.style.opacity = '0';
      setTimeout(() => {
        toast.style.display = 'none';
      }, 300);
    }, 3000);
  },
  
  // 复制到剪贴板
  copyToClipboard: function(text) {
    if (navigator.clipboard && window.isSecureContext) {
      // 现代浏览器支持
      navigator.clipboard.writeText(text).then(() => {
        this.showToast('已复制到剪贴板', 'success');
      }).catch(() => {
        // 降级处理
        this.fallbackCopy(text);
      });
    } else {
      // 降级处理
      this.fallbackCopy(text);
    }
  },
  
  // 降级复制方法
  fallbackCopy: function(text) {
    const textArea = document.createElement('textarea');
    textArea.value = text;
    textArea.style.position = 'fixed';
    textArea.style.left = '-999999px';
    textArea.style.top = '-999999px';
    document.body.appendChild(textArea);
    textArea.focus();
    textArea.select();
    
    try {
      document.execCommand('copy');
      this.showToast('已复制到剪贴板', 'success');
    } catch (err) {
      this.showToast('复制失败，请手动复制', 'error');
    }
    
    document.body.removeChild(textArea);
  },
  
  // 格式化文件大小
  formatFileSize: function(bytes) {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  },
  
  // 防抖函数
  debounce: function(func, wait) {
    let timeout;
    return function executedFunction(...args) {
      const later = () => {
        clearTimeout(timeout);
        func(...args);
      };
      clearTimeout(timeout);
      timeout = setTimeout(later, wait);
    };
  },
  
  // 节流函数
  throttle: function(func, limit) {
    let inThrottle;
    return function() {
      const args = arguments;
      const context = this;
      if (!inThrottle) {
        func.apply(context, args);
        inThrottle = true;
        setTimeout(() => inThrottle = false, limit);
      }
    };
  }
};

// DOM加载完成后初始化
document.addEventListener('DOMContentLoaded', function() {
  // 初始化提示框
  const toastStyles = `
    <style>
      .toast {
        position: fixed;
        bottom: 20px;
        right: 20px;
        padding: 12px 24px;
        background: #333;
        color: white;
        border-radius: 4px;
        box-shadow: 0 2px 10px rgba(0,0,0,0.2);
        z-index: 10000;
        transition: opacity 0.3s;
        display: none;
      }
      
      .toast.success {
        background: #4caf50;
      }
      
      .toast.error {
        background: #f44336;
      }
      
      .toast.info {
        background: #2196f3;
      }
      
      #loading-indicator {
        position: fixed;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        background: rgba(0,0,0,0.5);
        display: none;
        justify-content: center;
        align-items: center;
        z-index: 9999;
      }
      
      #loading-indicator .spinner {
        width: 40px;
        height: 40px;
        border: 4px solid #f3f3f3;
        border-top: 4px solid #3498db;
        border-radius: 50%;
        animation: spin 1s linear infinite;
      }
      
      @keyframes spin {
        0% { transform: rotate(0deg); }
        100% { transform: rotate(360deg); }
      }
    </style>
  `;
  
  // 添加样式到head
  const styleSheet = document.createElement('style');
  styleSheet.textContent = toastStyles;
  document.head.appendChild(styleSheet);
});