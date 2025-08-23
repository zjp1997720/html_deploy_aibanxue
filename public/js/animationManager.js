/**
 * 动画管理器
 * Phase 3: UI/UX优化 - 动画效果和交互优化
 */

class AnimationManager {
  constructor(options = {}) {
    this.config = {
      respectReducedMotion: true,
      enableScrollReveal: true,
      enableRippleEffects: true,
      enablePageTransitions: true,
      enableMicroInteractions: true,
      ...options
    };

    this.observerInstances = new Map();
    this.activeAnimations = new Set();
    this.prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    this.init();
  }

  init() {
    this.setupScrollReveal();
    this.setupRippleEffects();
    this.setupPageTransitions();
    this.setupMicroInteractions();
    this.setupCounterAnimations();
    this.setupFormAnimations();
    this.setupModalAnimations();
    this.setupNavigationAnimations();
    this.setupTooltipAnimations();
    this.setupNotificationAnimations();
  }

  // ===== 滚动揭示动画 =====
  setupScrollReveal() {
    if (!this.config.enableScrollReveal || this.prefersReducedMotion) return;

    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          this.revealElement(entry.target);
        }
      });
    }, {
      threshold: 0.1,
      rootMargin: '0px 0px -50px 0px'
    });

    document.querySelectorAll('.scroll-reveal').forEach(el => {
      observer.observe(el);
    });

    this.observerInstances.set('scrollReveal', observer);
  }

  revealElement(element) {
    if (this.prefersReducedMotion) {
      element.style.opacity = '1';
      element.style.transform = 'translateY(0)';
      return;
    }

    element.classList.add('revealed');
    
    // 添加延迟动画效果
    const index = Array.from(element.parentNode.children).indexOf(element);
    element.style.animationDelay = `${index * 0.1}s`;
  }

  // ===== 涟漪效果 =====
  setupRippleEffects() {
    if (!this.config.enableRippleEffects || this.prefersReducedMotion) return;

    document.addEventListener('click', (e) => {
      const rippleTarget = e.target.closest('.ripple');
      if (!rippleTarget) return;

      this.createRipple(rippleTarget, e);
    });
  }

  createRipple(element, event) {
    const rect = element.getBoundingClientRect();
    const size = Math.max(rect.width, rect.height);
    const x = event.clientX - rect.left - size / 2;
    const y = event.clientY - rect.top - size / 2;

    const ripple = document.createElement('div');
    ripple.style.cssText = `
      position: absolute;
      border-radius: 50%;
      background: rgba(255, 255, 255, 0.6);
      transform: scale(0);
      left: ${x}px;
      top: ${y}px;
      width: ${size}px;
      height: ${size}px;
      pointer-events: none;
      animation: ripple-animation 0.6s linear;
    `;

    element.appendChild(ripple);

    ripple.addEventListener('animationend', () => {
      ripple.remove();
    });
  }

  // ===== 页面过渡动画 =====
  setupPageTransitions() {
    if (!this.config.enablePageTransitions || this.prefersReducedMotion) return;

    // 为页面内容添加入场动画
    const pageContent = document.querySelector('main, .content, .container');
    if (pageContent && !pageContent.classList.contains('page-enter')) {
      pageContent.classList.add('page-enter');
    }
  }

  // ===== 微交互动画 =====
  setupMicroInteractions() {
    if (!this.config.enableMicroInteractions || this.prefersReducedMotion) return;

    // 为所有按钮添加微交互
    document.querySelectorAll('button, .btn, .button').forEach(btn => {
      if (!btn.classList.contains('micro-interaction')) {
        btn.classList.add('micro-interaction');
      }
    });

    // 为卡片添加悬浮效果
    document.querySelectorAll('.card, .panel, .item').forEach(card => {
      if (!card.classList.contains('card-animated')) {
        card.classList.add('card-animated');
      }
    });

    // 为表格行添加动画
    document.querySelectorAll('tbody tr').forEach(row => {
      if (!row.classList.contains('table-row-animated')) {
        row.classList.add('table-row-animated');
      }
    });

    // 为列表项添加动画
    document.querySelectorAll('ul li, ol li').forEach(item => {
      if (!item.classList.contains('list-item-animated')) {
        item.classList.add('list-item-animated');
      }
    });
  }

  // ===== 数字计数动画 =====
  setupCounterAnimations() {
    const counters = document.querySelectorAll('.counter, [data-counter]');
    
    const counterObserver = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          this.animateCounter(entry.target);
          counterObserver.unobserve(entry.target);
        }
      });
    });

    counters.forEach(counter => {
      counterObserver.observe(counter);
    });

    this.observerInstances.set('counter', counterObserver);
  }

  animateCounter(element) {
    const target = parseInt(element.dataset.count || element.textContent.replace(/[^\d]/g, ''));
    const duration = parseInt(element.dataset.duration || '2000');
    const step = target / (duration / 16);
    let current = 0;

    if (this.prefersReducedMotion) {
      element.textContent = target;
      return;
    }

    const updateCounter = () => {
      current += step;
      if (current < target) {
        element.textContent = Math.floor(current);
        requestAnimationFrame(updateCounter);
      } else {
        element.textContent = target;
      }
    };

    updateCounter();
  }

  // ===== 表单动画 =====
  setupFormAnimations() {
    // 输入框动画
    document.querySelectorAll('input, textarea, select').forEach(input => {
      if (!input.classList.contains('input-animated')) {
        input.classList.add('input-animated');
      }

      // 添加表单验证动画
      input.addEventListener('invalid', () => {
        this.triggerValidationAnimation(input, 'error');
      });

      input.addEventListener('input', () => {
        if (input.validity.valid && input.value) {
          this.triggerValidationAnimation(input, 'success');
        }
      });
    });

    // 浮动标签动画
    this.setupFloatingLabels();
  }

  setupFloatingLabels() {
    document.querySelectorAll('.input-group-animated').forEach(group => {
      const input = group.querySelector('input, textarea');
      const label = group.querySelector('.input-label');
      
      if (input && label) {
        // 检查初始状态
        if (input.value || input.placeholder) {
          label.style.transform = 'translateY(-20px)';
          label.style.fontSize = '12px';
        }
      }
    });
  }

  triggerValidationAnimation(input, type) {
    if (this.prefersReducedMotion) return;

    input.classList.remove('form-field-error', 'form-field-success');
    
    requestAnimationFrame(() => {
      input.classList.add(`form-field-${type}`);
      
      setTimeout(() => {
        input.classList.remove(`form-field-${type}`);
      }, 500);
    });
  }

  // ===== 模态框动画 =====
  setupModalAnimations() {
    document.addEventListener('click', (e) => {
      const modalTrigger = e.target.closest('[data-modal-target]');
      if (modalTrigger) {
        const modalId = modalTrigger.dataset.modalTarget;
        const modal = document.getElementById(modalId);
        if (modal) {
          this.showModal(modal);
        }
      }

      const modalClose = e.target.closest('[data-modal-close]');
      if (modalClose) {
        const modal = modalClose.closest('.modal');
        if (modal) {
          this.hideModal(modal);
        }
      }
    });
  }

  showModal(modal) {
    modal.style.display = 'flex';
    
    if (!this.prefersReducedMotion) {
      modal.classList.add('modal-enter');
      
      requestAnimationFrame(() => {
        modal.classList.remove('modal-enter');
      });
    }
  }

  hideModal(modal) {
    if (this.prefersReducedMotion) {
      modal.style.display = 'none';
      return;
    }

    modal.classList.add('modal-exit');
    
    setTimeout(() => {
      modal.style.display = 'none';
      modal.classList.remove('modal-exit');
    }, 300);
  }

  // ===== 导航动画 =====
  setupNavigationAnimations() {
    document.querySelectorAll('nav a, .nav-link').forEach(link => {
      if (!link.classList.contains('nav-item')) {
        link.classList.add('nav-item');
      }
    });

    // 标签页动画
    document.querySelectorAll('.tab, .tab-item').forEach(tab => {
      if (!tab.classList.contains('tab-animated')) {
        tab.classList.add('tab-animated');
      }
    });
  }

  // ===== 工具提示动画 =====
  setupTooltipAnimations() {
    document.querySelectorAll('[data-tooltip]').forEach(element => {
      element.addEventListener('mouseenter', (e) => {
        this.showTooltip(e.target);
      });

      element.addEventListener('mouseleave', (e) => {
        this.hideTooltip(e.target);
      });
    });
  }

  showTooltip(element) {
    const tooltipText = element.dataset.tooltip;
    if (!tooltipText) return;

    const tooltip = document.createElement('div');
    tooltip.className = 'tooltip';
    tooltip.textContent = tooltipText;
    tooltip.style.cssText = `
      position: absolute;
      background: rgba(0, 0, 0, 0.8);
      color: white;
      padding: 8px 12px;
      border-radius: 4px;
      font-size: 12px;
      white-space: nowrap;
      z-index: 1000;
      pointer-events: none;
    `;

    document.body.appendChild(tooltip);

    const rect = element.getBoundingClientRect();
    tooltip.style.left = `${rect.left + rect.width / 2 - tooltip.offsetWidth / 2}px`;
    tooltip.style.top = `${rect.top - tooltip.offsetHeight - 8}px`;

    element._tooltip = tooltip;
  }

  hideTooltip(element) {
    if (element._tooltip) {
      element._tooltip.remove();
      delete element._tooltip;
    }
  }

  // ===== 通知动画 =====
  setupNotificationAnimations() {
    this.notificationContainer = this.createNotificationContainer();
  }

  createNotificationContainer() {
    let container = document.querySelector('.notification-container');
    if (!container) {
      container = document.createElement('div');
      container.className = 'notification-container';
      container.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        z-index: 10000;
        pointer-events: none;
      `;
      document.body.appendChild(container);
    }
    return container;
  }

  showNotification(message, type = 'info', duration = 3000) {
    const notification = document.createElement('div');
    notification.className = `notification notification-${type} notification-slide-in`;
    notification.style.cssText = `
      background: ${this.getNotificationColor(type)};
      color: white;
      padding: 12px 16px;
      border-radius: 4px;
      margin-bottom: 8px;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
      pointer-events: auto;
      cursor: pointer;
      max-width: 300px;
      word-wrap: break-word;
    `;
    notification.textContent = message;

    this.notificationContainer.appendChild(notification);

    // 自动隐藏
    setTimeout(() => {
      this.hideNotification(notification);
    }, duration);

    // 点击隐藏
    notification.addEventListener('click', () => {
      this.hideNotification(notification);
    });

    return notification;
  }

  hideNotification(notification) {
    if (this.prefersReducedMotion) {
      notification.remove();
      return;
    }

    notification.classList.remove('notification-slide-in');
    notification.classList.add('notification-slide-out');

    setTimeout(() => {
      notification.remove();
    }, 300);
  }

  getNotificationColor(type) {
    const colors = {
      success: '#28a745',
      error: '#dc3545',
      warning: '#ffc107',
      info: '#0066cc'
    };
    return colors[type] || colors.info;
  }

  // ===== 进度条动画 =====
  animateProgressBar(element, targetWidth, duration = 1000) {
    if (this.prefersReducedMotion) {
      element.style.width = `${targetWidth}%`;
      return;
    }

    element.classList.add('progress-bar-animated');
    
    requestAnimationFrame(() => {
      element.style.width = `${targetWidth}%`;
    });

    setTimeout(() => {
      element.classList.remove('progress-bar-animated');
    }, duration);
  }

  // ===== 图标动画 =====
  spinIcon(icon, duration = 1000) {
    if (this.prefersReducedMotion) return;

    icon.classList.add('icon-spin');
    
    setTimeout(() => {
      icon.classList.remove('icon-spin');
    }, duration);
  }

  bounceIcon(icon) {
    if (this.prefersReducedMotion) return;

    icon.classList.add('icon-bounce');
    
    icon.addEventListener('animationend', () => {
      icon.classList.remove('icon-bounce');
    }, { once: true });
  }

  // ===== 状态指示器 =====
  setStatus(element, status) {
    const statusDot = element.querySelector('.status-dot') || element;
    statusDot.className = `status-dot ${status}`;
  }

  // ===== 代码高亮动画 =====
  highlightCode(codeElement) {
    if (this.prefersReducedMotion) return;

    codeElement.classList.add('code-highlight');
    
    setTimeout(() => {
      codeElement.classList.remove('code-highlight');
    }, 2000);
  }

  // ===== 工具方法 =====
  addDelayedAnimation(elements, baseDelay = 100) {
    elements.forEach((element, index) => {
      element.style.animationDelay = `${index * baseDelay}ms`;
    });
  }

  enableGPUAcceleration(element) {
    element.classList.add('gpu-accelerated');
  }

  disableAnimationsForElement(element) {
    element.style.cssText += `
      animation: none !important;
      transition: none !important;
    `;
  }

  // ===== 批量操作 =====
  batch() {
    const operations = [];
    
    return {
      addAnimation: (element, animation) => {
        operations.push(() => this.addAnimation(element, animation));
        return this;
      },
      addDelay: (element, delay) => {
        operations.push(() => {
          element.style.animationDelay = `${delay}ms`;
        });
        return this;
      },
      execute: () => {
        operations.forEach(op => op());
      }
    };
  }

  addAnimation(element, animationClass) {
    element.classList.add(animationClass);
    
    element.addEventListener('animationend', () => {
      element.classList.remove(animationClass);
    }, { once: true });
  }

  // ===== 清理方法 =====
  destroy() {
    this.observerInstances.forEach(observer => {
      observer.disconnect();
    });
    this.observerInstances.clear();
    this.activeAnimations.clear();

    if (this.notificationContainer) {
      this.notificationContainer.remove();
    }
  }

  // ===== 获取状态 =====
  getActiveAnimationsCount() {
    return this.activeAnimations.size;
  }

  isReducedMotionPreferred() {
    return this.prefersReducedMotion;
  }
}

// ===== 全局实例和便捷方法 =====
window.AnimationManager = AnimationManager;
window.animationManager = new AnimationManager();

// 便捷方法
window.showNotification = function(message, type, duration) {
  return window.animationManager.showNotification(message, type, duration);
};

window.animateProgress = function(element, targetWidth, duration) {
  return window.animationManager.animateProgressBar(element, targetWidth, duration);
};

window.spinIcon = function(icon, duration) {
  return window.animationManager.spinIcon(icon, duration);
};

window.bounceIcon = function(icon) {
  return window.animationManager.bounceIcon(icon);
};

window.highlightCode = function(codeElement) {
  return window.animationManager.highlightCode(codeElement);
};

window.setStatus = function(element, status) {
  return window.animationManager.setStatus(element, status);
};

// ===== 页面加载完成后初始化 =====
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    window.animationManager.init();
  });
} else {
  window.animationManager.init();
}

// ===== 监听设备偏好设置变化 =====
window.matchMedia('(prefers-reduced-motion: reduce)').addEventListener('change', (e) => {
  window.animationManager.prefersReducedMotion = e.matches;
});

// ===== 导出 =====
if (typeof module !== 'undefined' && module.exports) {
  module.exports = AnimationManager;
} 