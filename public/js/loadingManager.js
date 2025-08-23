/**
 * 加载状态管理器
 * Phase 3: UI/UX优化
 */

class LoadingManager {
  constructor() {
    this.activeLoaders = new Set();
    this.defaultConfig = {
      showOverlay: true,
      showProgress: false,
      message: '加载中...',
      timeout: 30000,
      backdrop: true
    };
    
    console.log('✅ 加载状态管理器已初始化');
  }

  /**
   * 显示全屏加载遮罩
   */
  showOverlay(options = {}) {
    const config = { ...this.defaultConfig, ...options };
    const loaderId = `overlay-${Date.now()}`;
    
    // 创建遮罩元素
    const overlay = document.createElement('div');
    overlay.id = loaderId;
    overlay.className = `loading-overlay ${config.dark ? 'dark' : ''}`;
    
    // 创建加载内容
    const content = document.createElement('div');
    content.className = 'loading-content';
    
    // 加载图标
    const spinner = document.createElement('div');
    spinner.className = 'loading-spinner large';
    content.appendChild(spinner);
    
    // 加载消息
    if (config.message) {
      const message = document.createElement('div');
      message.className = 'loading-message';
      message.textContent = config.message;
      content.appendChild(message);
    }
    
    // 进度条
    if (config.showProgress) {
      const progress = document.createElement('div');
      progress.className = 'loading-progress';
      
      const progressBar = document.createElement('div');
      progressBar.className = 'loading-progress-bar';
      progress.appendChild(progressBar);
      
      content.appendChild(progress);
    }
    
    overlay.appendChild(content);
    document.body.appendChild(overlay);
    
    // 添加到活动加载器列表
    this.activeLoaders.add(loaderId);
    
    // 设置超时
    if (config.timeout > 0) {
      setTimeout(() => {
        this.hideOverlay(loaderId);
      }, config.timeout);
    }
    
    // 添加动画
    overlay.style.opacity = '0';
    requestAnimationFrame(() => {
      overlay.style.opacity = '1';
      overlay.style.transition = 'opacity 0.3s ease';
    });
    
    return loaderId;
  }

  /**
   * 隐藏全屏加载遮罩
   */
  hideOverlay(loaderId) {
    const overlay = document.getElementById(loaderId);
    if (!overlay) return;
    
    overlay.style.opacity = '0';
    setTimeout(() => {
      if (overlay.parentNode) {
        overlay.parentNode.removeChild(overlay);
      }
      this.activeLoaders.delete(loaderId);
    }, 300);
  }

  /**
   * 隐藏所有加载遮罩
   */
  hideAllOverlays() {
    this.activeLoaders.forEach(loaderId => {
      this.hideOverlay(loaderId);
    });
  }

  /**
   * 显示元素内加载状态
   */
  showElementLoading(element, options = {}) {
    if (typeof element === 'string') {
      element = document.querySelector(element);
    }
    
    if (!element) return;
    
    const config = { 
      spinner: true, 
      message: '加载中...', 
      overlay: true,
      ...options 
    };
    
    // 保存原始内容
    if (!element.dataset.originalContent) {
      element.dataset.originalContent = element.innerHTML;
    }
    
    // 创建加载内容
    let loadingHtml = '';
    
    if (config.overlay) {
      element.classList.add('is-loading');
      return;
    }
    
    if (config.spinner) {
      loadingHtml += '<div class="loading-spinner"></div>';
    }
    
    if (config.message) {
      loadingHtml += `<div class="loading-text">${config.message}</div>`;
    }
    
    element.innerHTML = `<div class="loading-container">${loadingHtml}</div>`;
    element.classList.add('fade-in');
  }

  /**
   * 隐藏元素加载状态
   */
  hideElementLoading(element) {
    if (typeof element === 'string') {
      element = document.querySelector(element);
    }
    
    if (!element) return;
    
    // 移除加载类
    element.classList.remove('is-loading');
    
    // 恢复原始内容
    if (element.dataset.originalContent) {
      element.innerHTML = element.dataset.originalContent;
      delete element.dataset.originalContent;
    }
    
    element.classList.add('fade-in');
  }

  /**
   * 显示骨架屏
   */
  showSkeleton(element, type = 'card') {
    if (typeof element === 'string') {
      element = document.querySelector(element);
    }
    
    if (!element) return;
    
    const skeletonTemplates = {
      card: this.createCardSkeleton(),
      list: this.createListSkeleton(),
      table: this.createTableSkeleton(),
      page: this.createPageSkeleton()
    };
    
    // 保存原始内容
    if (!element.dataset.originalContent) {
      element.dataset.originalContent = element.innerHTML;
    }
    
    element.innerHTML = skeletonTemplates[type] || skeletonTemplates.card;
    element.classList.add('fade-in');
  }

  /**
   * 创建卡片骨架屏
   */
  createCardSkeleton() {
    return `
      <div class="skeleton-card">
        <div class="skeleton skeleton-text title"></div>
        <div class="skeleton skeleton-text subtitle"></div>
        <div class="skeleton skeleton-text line"></div>
        <div class="skeleton skeleton-text medium"></div>
        <div style="display: flex; gap: 10px; margin-top: 16px;">
          <div class="skeleton skeleton-button"></div>
          <div class="skeleton skeleton-button"></div>
        </div>
      </div>
    `;
  }

  /**
   * 创建列表骨架屏
   */
  createListSkeleton() {
    const items = Array(5).fill(0).map(() => `
      <div class="pages-skeleton-item">
        <div class="skeleton skeleton-avatar"></div>
        <div class="pages-skeleton-content">
          <div class="skeleton skeleton-text title"></div>
          <div class="skeleton skeleton-text line"></div>
        </div>
        <div class="pages-skeleton-actions">
          <div class="skeleton skeleton-button"></div>
          <div class="skeleton skeleton-button"></div>
        </div>
      </div>
    `).join('');
    
    return `<div class="pages-skeleton">${items}</div>`;
  }

  /**
   * 创建表格骨架屏
   */
  createTableSkeleton() {
    const rows = Array(6).fill(0).map((_, index) => {
      if (index === 0) {
        // 表头
        return `
          <tr>
            <th><div class="skeleton skeleton-text short"></div></th>
            <th><div class="skeleton skeleton-text medium"></div></th>
            <th><div class="skeleton skeleton-text short"></div></th>
            <th><div class="skeleton skeleton-text short"></div></th>
          </tr>
        `;
      } else {
        // 数据行
        return `
          <tr>
            <td><div class="skeleton skeleton-text short"></div></td>
            <td><div class="skeleton skeleton-text line"></div></td>
            <td><div class="skeleton skeleton-text short"></div></td>
            <td><div class="skeleton skeleton-text short"></div></td>
          </tr>
        `;
      }
    }).join('');
    
    return `<table class="table"><tbody>${rows}</tbody></table>`;
  }

  /**
   * 创建页面骨架屏
   */
  createPageSkeleton() {
    return `
      <div class="skeleton-card">
        <div class="skeleton skeleton-text title"></div>
        <div class="skeleton skeleton-text line"></div>
        <div class="skeleton skeleton-text medium"></div>
        <br>
        <div class="skeleton skeleton-text line"></div>
        <div class="skeleton skeleton-text line"></div>
        <div class="skeleton skeleton-text short"></div>
      </div>
    `;
  }

  /**
   * 显示空状态
   */
  showEmptyState(element, config = {}) {
    if (typeof element === 'string') {
      element = document.querySelector(element);
    }
    
    if (!element) return;
    
    const defaultConfig = {
      type: 'default',
      title: '暂无数据',
      description: '这里还没有任何内容',
      actionText: '刷新',
      actionCallback: null,
      secondaryText: null,
      secondaryCallback: null
    };
    
    const emptyConfig = { ...defaultConfig, ...config };
    
    // 获取对应的空状态配置
    const emptyStates = {
      pages: {
        title: '还没有创建页面',
        description: '开始创建您的第一个页面吧',
        actionText: '创建页面',
        className: 'empty-pages'
      },
      search: {
        title: '没有找到匹配的结果',
        description: '试试调整搜索关键词或筛选条件',
        actionText: '清空筛选',
        className: 'empty-search'
      },
      apikeys: {
        title: '还没有API密钥',
        description: '创建API密钥来访问系统API',
        actionText: '创建API密钥',
        className: 'empty-api-keys'
      }
    };
    
    const stateConfig = emptyStates[emptyConfig.type] || {};
    const finalConfig = { ...emptyConfig, ...stateConfig };
    
    // 创建空状态HTML
    let emptyHtml = `
      <div class="empty-state ${finalConfig.className || ''}">
        <div class="empty-state-icon">
          ${this.getEmptyStateIcon(finalConfig.type)}
        </div>
        <h3 class="empty-state-title">${finalConfig.title}</h3>
        <p class="empty-state-description">${finalConfig.description}</p>
        <div class="empty-state-actions">
    `;
    
    if (finalConfig.actionText && finalConfig.actionCallback) {
      emptyHtml += `
        <button class="empty-state-action" onclick="(${finalConfig.actionCallback})()">
          ${finalConfig.actionText}
        </button>
      `;
    } else if (finalConfig.actionText) {
      emptyHtml += `
        <button class="empty-state-action" onclick="location.reload()">
          ${finalConfig.actionText}
        </button>
      `;
    }
    
    if (finalConfig.secondaryText && finalConfig.secondaryCallback) {
      emptyHtml += `
        <button class="empty-state-action empty-state-secondary" onclick="(${finalConfig.secondaryCallback})()">
          ${finalConfig.secondaryText}
        </button>
      `;
    }
    
    emptyHtml += `
        </div>
      </div>
    `;
    
    // 保存原始内容
    if (!element.dataset.originalContent) {
      element.dataset.originalContent = element.innerHTML;
    }
    
    element.innerHTML = emptyHtml;
    element.classList.add('fade-in');
  }

  /**
   * 获取空状态图标
   */
  getEmptyStateIcon(type) {
    const icons = {
      pages: '<svg viewBox="0 0 24 24"><path d="M14,2H6A2,2 0 0,0 4,4V20A2,2 0 0,0 6,22H18A2,2 0 0,0 20,20V8L14,2M18,20H6V4H13V9H18V20Z" /></svg>',
      search: '<svg viewBox="0 0 24 24"><path d="M9.5,3A6.5,6.5 0 0,1 16,9.5C16,11.11 15.41,12.59 14.44,13.73L14.71,14H15.5L20.5,19L19,20.5L14,15.5V14.71L13.73,14.44C12.59,15.41 11.11,16 9.5,16A6.5,6.5 0 0,1 3,9.5A6.5,6.5 0 0,1 9.5,3M9.5,5C7,5 5,7 5,9.5C5,12 7,14 9.5,14C12,14 14,12 14,9.5C14,7 12,5 9.5,5Z" /></svg>',
      apikeys: '<svg viewBox="0 0 24 24"><path d="M7,14A2,2 0 0,1 5,12A2,2 0 0,1 7,10A2,2 0 0,1 9,12A2,2 0 0,1 7,14M12.65,10C11.83,7.67 9.61,6 7, 6A6,6 0 0,0 1,12A6,6 0 0,0 7,18C9.61,18 11.83,16.33 12.65,14H17V18H21V14H23V10H12.65Z" /></svg>',
      default: '<svg viewBox="0 0 24 24"><path d="M12,2A10,10 0 0,0 2,12A10,10 0 0,0 12,22A10,10 0 0,0 22,12A10,10 0 0,0 12,2Z" /></svg>'
    };
    
    return icons[type] || icons.default;
  }

  /**
   * 显示错误状态
   */
  showErrorState(element, error = {}) {
    if (typeof element === 'string') {
      element = document.querySelector(element);
    }
    
    if (!element) return;
    
    const errorConfig = {
      title: '加载失败',
      message: error.message || '出现了一些问题，请稍后重试',
      retry: true,
      ...error
    };
    
    const errorHtml = `
      <div class="error-state">
        <div class="error-state-icon">
          <svg viewBox="0 0 24 24">
            <path d="M13,13H11V7H13M13,17H11V15H13M12,2A10,10 0 0,0 2,12A10,10 0 0,0 12,22A10,10 0 0,0 22,12A10,10 0 0,0 12,2Z" />
          </svg>
        </div>
        <h4 class="error-state-title">${errorConfig.title}</h4>
        <p class="error-state-message">${errorConfig.message}</p>
        ${errorConfig.retry ? '<button class="error-state-action" onclick="location.reload()">重试</button>' : ''}
      </div>
    `;
    
    // 保存原始内容
    if (!element.dataset.originalContent) {
      element.dataset.originalContent = element.innerHTML;
    }
    
    element.innerHTML = errorHtml;
    element.classList.add('fade-in');
  }

  /**
   * 恢复元素原始内容
   */
  restore(element) {
    if (typeof element === 'string') {
      element = document.querySelector(element);
    }
    
    if (!element) return;
    
    // 移除所有加载相关的类
    element.classList.remove('is-loading', 'fade-in', 'fade-out');
    
    // 恢复原始内容
    if (element.dataset.originalContent) {
      element.innerHTML = element.dataset.originalContent;
      delete element.dataset.originalContent;
    }
  }

  /**
   * 按钮加载状态
   */
  setButtonLoading(button, loading = true) {
    if (typeof button === 'string') {
      button = document.querySelector(button);
    }
    
    if (!button) return;
    
    if (loading) {
      button.classList.add('btn-loading');
      button.disabled = true;
      
      // 保存原始文本
      if (!button.dataset.originalText) {
        button.dataset.originalText = button.innerHTML;
      }
      
      button.innerHTML = '<span class="btn-text">' + button.dataset.originalText + '</span>';
    } else {
      button.classList.remove('btn-loading');
      button.disabled = false;
      
      // 恢复原始文本
      if (button.dataset.originalText) {
        button.innerHTML = button.dataset.originalText;
        delete button.dataset.originalText;
      }
    }
  }

  /**
   * 批量管理加载状态
   */
  batch() {
    const operations = [];
    
    return {
      showOverlay: (options) => {
        operations.push({ type: 'showOverlay', options });
        return this;
      },
      showSkeleton: (element, type) => {
        operations.push({ type: 'showSkeleton', element, skeletonType: type });
        return this;
      },
      showElementLoading: (element, options) => {
        operations.push({ type: 'showElementLoading', element, options });
        return this;
      },
      execute: () => {
        const loaderIds = [];
        operations.forEach(op => {
          switch (op.type) {
            case 'showOverlay':
              loaderIds.push(this.showOverlay(op.options));
              break;
            case 'showSkeleton':
              this.showSkeleton(op.element, op.skeletonType);
              break;
            case 'showElementLoading':
              this.showElementLoading(op.element, op.options);
              break;
          }
        });
        return loaderIds;
      }
    };
  }

  /**
   * 获取活动的加载器数量
   */
  getActiveLoadersCount() {
    return this.activeLoaders.size;
  }

  /**
   * 检查是否有活动的加载器
   */
  hasActiveLoaders() {
    return this.activeLoaders.size > 0;
  }
}

// 创建全局实例
window.LoadingManager = new LoadingManager();

// 便捷函数
window.showLoading = function(message, options = {}) {
  return window.LoadingManager.showOverlay({ message, ...options });
};

window.hideLoading = function(loaderId) {
  if (loaderId) {
    window.LoadingManager.hideOverlay(loaderId);
  } else {
    window.LoadingManager.hideAllOverlays();
  }
};

window.showSkeleton = function(element, type) {
  window.LoadingManager.showSkeleton(element, type);
};

window.showEmptyState = function(element, config) {
  window.LoadingManager.showEmptyState(element, config);
};

window.showErrorState = function(element, error) {
  window.LoadingManager.showErrorState(element, error);
};

console.log('✅ 加载状态管理器已加载'); 