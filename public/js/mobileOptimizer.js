/**
 * 移动端优化器
 * Phase 3: UI/UX优化 - 移动端体验进一步优化
 */

class MobileOptimizer {
  constructor(options = {}) {
    this.config = {
      enableSwipeGestures: true,
      enablePullToRefresh: true,
      enableMobileDrawer: true,
      enableTouchFeedback: true,
      enableVirtualKeyboardFix: true,
      swipeThreshold: 50,
      pullThreshold: 60,
      ...options
    };

    this.isMobile = this.detectMobile();
    this.isIOS = this.detectIOS();
    this.touchStartX = 0;
    this.touchStartY = 0;
    this.activeSwipeItem = null;
    this.drawerOpen = false;
    this.keyboardVisible = false;
    this.originalViewportHeight = window.innerHeight;

    this.init();
  }

  init() {
    if (!this.isMobile) return;

    this.setupViewportMeta();
    this.setupTouchHandlers();
    this.setupSwipeGestures();
    this.setupPullToRefresh();
    this.setupMobileDrawer();
    this.setupVirtualKeyboardFix();
    this.setupMobileNavigation();
    this.setupTouchFeedback();
    this.setupMobileTable();
    this.setupOrientationChange();
    this.setupSafeArea();
  }

  // ===== 设备检测 =====
  detectMobile() {
    return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
  }

  detectIOS() {
    return /iPad|iPhone|iPod/.test(navigator.userAgent);
  }

  detectAndroid() {
    return /Android/.test(navigator.userAgent);
  }

  // ===== 视口设置 =====
  setupViewportMeta() {
    let viewport = document.querySelector('meta[name="viewport"]');
    if (!viewport) {
      viewport = document.createElement('meta');
      viewport.name = 'viewport';
      document.head.appendChild(viewport);
    }
    
    // 防止iOS Safari缩放
    viewport.content = 'width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no, shrink-to-fit=no, viewport-fit=cover';
  }

  // ===== 触控事件处理 =====
  setupTouchHandlers() {
    document.addEventListener('touchstart', this.handleTouchStart.bind(this), { passive: false });
    document.addEventListener('touchmove', this.handleTouchMove.bind(this), { passive: false });
    document.addEventListener('touchend', this.handleTouchEnd.bind(this), { passive: false });
  }

  handleTouchStart(e) {
    this.touchStartX = e.touches[0].clientX;
    this.touchStartY = e.touches[0].clientY;
    this.touchStartTime = Date.now();
  }

  handleTouchMove(e) {
    if (!this.config.enableSwipeGestures) return;

    const touch = e.touches[0];
    const deltaX = touch.clientX - this.touchStartX;
    const deltaY = touch.clientY - this.touchStartY;

    // 检查是否在可滑动容器内
    const swipeContainer = e.target.closest('.swipe-container');
    if (swipeContainer) {
      this.handleSwipeMove(e, deltaX, deltaY);
    }

    // 检查抽屉手势
    if (this.config.enableMobileDrawer) {
      this.handleDrawerGesture(deltaX, deltaY);
    }
  }

  handleTouchEnd(e) {
    const deltaTime = Date.now() - this.touchStartTime;
    const touch = e.changedTouches[0];
    const deltaX = touch.clientX - this.touchStartX;
    const deltaY = touch.clientY - this.touchStartY;

    // 快速滑动检测
    if (deltaTime < 300) {
      const velocity = Math.abs(deltaX) / deltaTime;
      if (velocity > 0.5) {
        this.handleSwipeGesture(deltaX, deltaY);
      }
    }

    this.resetSwipeState();
  }

  // ===== 滑动手势 =====
  setupSwipeGestures() {
    if (!this.config.enableSwipeGestures) return;

    document.querySelectorAll('.swipe-container').forEach(container => {
      const items = container.querySelectorAll('.swipe-item');
      items.forEach(item => {
        this.initializeSwipeItem(item);
      });
    });
  }

  initializeSwipeItem(item) {
    item.style.transform = 'translateX(0)';
    item.dataset.swiped = 'false';
  }

  handleSwipeMove(e, deltaX, deltaY) {
    const swipeItem = e.target.closest('.swipe-item');
    if (!swipeItem) return;

    // 只处理水平滑动
    if (Math.abs(deltaY) > Math.abs(deltaX)) return;

    e.preventDefault();
    
    this.activeSwipeItem = swipeItem;
    const maxSwipe = -80;
    const translateX = Math.max(maxSwipe, Math.min(0, deltaX));
    
    swipeItem.style.transform = `translateX(${translateX}px)`;
    
    if (translateX < maxSwipe / 2) {
      swipeItem.classList.add('swiped');
    } else {
      swipeItem.classList.remove('swiped');
    }
  }

  handleSwipeGesture(deltaX, deltaY) {
    if (!this.activeSwipeItem) return;

    const threshold = this.config.swipeThreshold;
    
    if (deltaX < -threshold) {
      // 左滑，显示操作按钮
      this.activeSwipeItem.classList.add('swiped');
      this.activeSwipeItem.style.transform = 'translateX(-80px)';
      this.activeSwipeItem.dataset.swiped = 'true';
    } else {
      // 恢复原位
      this.resetSwipeItem(this.activeSwipeItem);
    }
  }

  resetSwipeItem(item) {
    if (!item) return;
    
    item.classList.remove('swiped');
    item.style.transform = 'translateX(0)';
    item.dataset.swiped = 'false';
  }

  resetSwipeState() {
    this.activeSwipeItem = null;
  }

  // ===== 下拉刷新 =====
  setupPullToRefresh() {
    if (!this.config.enablePullToRefresh) return;

    const containers = document.querySelectorAll('.pull-to-refresh');
    containers.forEach(container => {
      this.initializePullToRefresh(container);
    });
  }

  initializePullToRefresh(container) {
    let startY = 0;
    let pullDistance = 0;
    let pullIndicator = container.querySelector('.pull-indicator');
    
    if (!pullIndicator) {
      pullIndicator = document.createElement('div');
      pullIndicator.className = 'pull-indicator';
      pullIndicator.innerHTML = '<div class="spinner"></div>';
      container.appendChild(pullIndicator);
    }

    container.addEventListener('touchstart', (e) => {
      if (container.scrollTop === 0) {
        startY = e.touches[0].clientY;
      }
    }, { passive: true });

    container.addEventListener('touchmove', (e) => {
      if (container.scrollTop === 0 && startY > 0) {
        pullDistance = e.touches[0].clientY - startY;
        
        if (pullDistance > 0) {
          e.preventDefault();
          const threshold = this.config.pullThreshold;
          const progress = Math.min(pullDistance / threshold, 1);
          
          container.style.transform = `translateY(${Math.min(pullDistance * 0.5, threshold / 2)}px)`;
          pullIndicator.style.opacity = progress;
          
          if (pullDistance > threshold) {
            pullIndicator.classList.add('active');
          } else {
            pullIndicator.classList.remove('active');
          }
        }
      }
    }, { passive: false });

    container.addEventListener('touchend', (e) => {
      if (pullDistance > this.config.pullThreshold) {
        this.triggerRefresh(container, pullIndicator);
      } else {
        this.resetPullToRefresh(container, pullIndicator);
      }
      
      startY = 0;
      pullDistance = 0;
    }, { passive: true });
  }

  triggerRefresh(container, indicator) {
    indicator.classList.add('active');
    container.style.transform = 'translateY(30px)';
    
    // 触发自定义刷新事件
    const refreshEvent = new CustomEvent('pullrefresh', {
      detail: { container }
    });
    container.dispatchEvent(refreshEvent);

    // 默认2秒后重置
    setTimeout(() => {
      this.resetPullToRefresh(container, indicator);
    }, 2000);
  }

  resetPullToRefresh(container, indicator) {
    container.style.transform = 'translateY(0)';
    indicator.classList.remove('active');
    indicator.style.opacity = '0';
  }

  // ===== 移动端抽屉导航 =====
  setupMobileDrawer() {
    if (!this.config.enableMobileDrawer) return;

    this.createMobileDrawer();
    this.setupDrawerTriggers();
  }

  createMobileDrawer() {
    if (document.querySelector('.mobile-drawer')) return;

    const drawer = document.createElement('div');
    drawer.className = 'mobile-drawer';
    drawer.innerHTML = `
      <div class="drawer-content">
        <div class="drawer-header">
          <h3>导航菜单</h3>
          <button class="drawer-close" aria-label="关闭菜单">&times;</button>
        </div>
        <div class="drawer-body">
          ${this.generateDrawerMenu()}
        </div>
      </div>
    `;

    document.body.appendChild(drawer);

    // 点击背景关闭
    drawer.addEventListener('click', (e) => {
      if (e.target === drawer) {
        this.closeDrawer();
      }
    });

    // 关闭按钮
    drawer.querySelector('.drawer-close').addEventListener('click', () => {
      this.closeDrawer();
    });
  }

  generateDrawerMenu() {
    const navItems = document.querySelectorAll('nav a, .nav-link');
    let menuHTML = '';

    navItems.forEach(item => {
      const href = item.getAttribute('href') || '#';
      const text = item.textContent.trim();
      const icon = item.querySelector('i') ? item.querySelector('i').className : 'fas fa-link';
      
      if (text) {
        menuHTML += `
          <a href="${href}" class="drawer-item">
            <i class="${icon}"></i>
            ${text}
          </a>
        `;
      }
    });

    return menuHTML || '<p style="padding: 16px; color: #666;">暂无菜单项</p>';
  }

  setupDrawerTriggers() {
    // 汉堡菜单按钮
    document.querySelectorAll('.drawer-toggle, .mobile-menu-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.preventDefault();
        this.toggleDrawer();
      });
    });

    // 边缘滑动手势
    let edgeStartX = 0;
    document.addEventListener('touchstart', (e) => {
      edgeStartX = e.touches[0].clientX;
    }, { passive: true });

    document.addEventListener('touchend', (e) => {
      const endX = e.changedTouches[0].clientX;
      const deltaX = endX - edgeStartX;

      // 从左边缘滑动打开抽屉
      if (edgeStartX < 20 && deltaX > 50) {
        this.openDrawer();
      }
      // 在抽屉内向左滑动关闭
      else if (this.drawerOpen && deltaX < -50) {
        this.closeDrawer();
      }
    }, { passive: true });
  }

  handleDrawerGesture(deltaX, deltaY) {
    // 实现抽屉的拖动效果
    if (this.drawerOpen && deltaX < 0) {
      const drawer = document.querySelector('.mobile-drawer .drawer-content');
      if (drawer) {
        const translateX = Math.min(0, deltaX);
        drawer.style.transform = `translateX(${translateX}px)`;
      }
    }
  }

  openDrawer() {
    const drawer = document.querySelector('.mobile-drawer');
    if (drawer) {
      drawer.classList.add('open');
      this.drawerOpen = true;
      document.body.style.overflow = 'hidden';
    }
  }

  closeDrawer() {
    const drawer = document.querySelector('.mobile-drawer');
    if (drawer) {
      drawer.classList.remove('open');
      this.drawerOpen = false;
      document.body.style.overflow = '';
      
      // 重置拖动状态
      const drawerContent = drawer.querySelector('.drawer-content');
      if (drawerContent) {
        drawerContent.style.transform = '';
      }
    }
  }

  toggleDrawer() {
    if (this.drawerOpen) {
      this.closeDrawer();
    } else {
      this.openDrawer();
    }
  }

  // ===== 虚拟键盘修复 =====
  setupVirtualKeyboardFix() {
    if (!this.config.enableVirtualKeyboardFix) return;

    let initialViewportHeight = window.innerHeight;

    // 监听窗口大小变化
    window.addEventListener('resize', () => {
      const currentHeight = window.innerHeight;
      const heightDifference = initialViewportHeight - currentHeight;

      if (heightDifference > 150) {
        // 键盘可能打开了
        this.handleKeyboardShow(heightDifference);
      } else {
        // 键盘可能关闭了
        this.handleKeyboardHide();
      }
    });

    // 输入框焦点事件
    document.addEventListener('focusin', (e) => {
      if (this.isInputElement(e.target)) {
        setTimeout(() => {
          this.scrollInputIntoView(e.target);
        }, 300);
      }
    });

    document.addEventListener('focusout', (e) => {
      if (this.isInputElement(e.target)) {
        this.handleKeyboardHide();
      }
    });
  }

  isInputElement(element) {
    const inputTypes = ['INPUT', 'TEXTAREA', 'SELECT'];
    return inputTypes.includes(element.tagName);
  }

  handleKeyboardShow(heightDifference) {
    this.keyboardVisible = true;
    document.body.classList.add('keyboard-visible');
    
    // 调整视口
    document.documentElement.style.setProperty('--keyboard-height', `${heightDifference}px`);
    
    // 隐藏底部工具栏
    const toolbar = document.querySelector('.mobile-toolbar');
    if (toolbar) {
      toolbar.style.display = 'none';
    }
  }

  handleKeyboardHide() {
    this.keyboardVisible = false;
    document.body.classList.remove('keyboard-visible');
    
    document.documentElement.style.removeProperty('--keyboard-height');
    
    // 恢复底部工具栏
    const toolbar = document.querySelector('.mobile-toolbar');
    if (toolbar) {
      toolbar.style.display = 'flex';
    }
  }

  scrollInputIntoView(input) {
    if (!this.keyboardVisible) return;

    const rect = input.getBoundingClientRect();
    const viewportHeight = window.innerHeight;
    const keyboardHeight = this.originalViewportHeight - viewportHeight;
    const availableHeight = viewportHeight - keyboardHeight;

    if (rect.bottom > availableHeight) {
      const scrollOffset = rect.bottom - availableHeight + 20;
      window.scrollBy(0, scrollOffset);
    }
  }

  // ===== 移动端导航 =====
  setupMobileNavigation() {
    this.createMobileToolbar();
    this.setupTabSwitching();
  }

  createMobileToolbar() {
    if (document.querySelector('.mobile-toolbar')) return;

    const toolbar = document.createElement('div');
    toolbar.className = 'mobile-toolbar safe-bottom';
    toolbar.innerHTML = this.generateToolbarItems();
    
    document.body.appendChild(toolbar);
  }

  generateToolbarItems() {
    return `
      <a href="/" class="toolbar-item">
        <i class="fas fa-home"></i>
        <span>首页</span>
      </a>
      <a href="/admin/pages" class="toolbar-item">
        <i class="fas fa-file-alt"></i>
        <span>页面</span>
      </a>
      <a href="/admin/apikeys" class="toolbar-item">
        <i class="fas fa-key"></i>
        <span>API</span>
      </a>
      <a href="/admin/dashboard" class="toolbar-item">
        <i class="fas fa-chart-bar"></i>
        <span>控制台</span>
      </a>
    `;
  }

  setupTabSwitching() {
    document.querySelectorAll('.toolbar-item').forEach(item => {
      item.addEventListener('click', (e) => {
        // 移除所有active类
        document.querySelectorAll('.toolbar-item').forEach(i => i.classList.remove('active'));
        // 添加到当前项
        item.classList.add('active');
      });
    });

    // 根据当前页面设置active状态
    const currentPath = window.location.pathname;
    document.querySelectorAll('.toolbar-item').forEach(item => {
      const href = item.getAttribute('href');
      if (href && currentPath.includes(href) && href !== '/') {
        item.classList.add('active');
      } else if (href === '/' && currentPath === '/') {
        item.classList.add('active');
      }
    });
  }

  // ===== 触控反馈 =====
  setupTouchFeedback() {
    if (!this.config.enableTouchFeedback) return;

    document.querySelectorAll('button, .btn, .card, .list-item').forEach(element => {
      if (!element.classList.contains('touch-feedback')) {
        element.classList.add('touch-feedback');
      }
    });
  }

  // ===== 移动端表格 =====
  setupMobileTable() {
    document.querySelectorAll('table').forEach(table => {
      this.convertToMobileTable(table);
    });
  }

  convertToMobileTable(table) {
    if (table.classList.contains('mobile-optimized')) return;

    const headers = Array.from(table.querySelectorAll('thead th')).map(th => th.textContent.trim());
    const rows = table.querySelectorAll('tbody tr');

    // 为表格数据添加标签
    rows.forEach(row => {
      const cells = row.querySelectorAll('td');
      cells.forEach((cell, index) => {
        if (headers[index]) {
          cell.setAttribute('data-label', headers[index]);
        }
      });
    });

    table.classList.add('table-mobile', 'mobile-optimized');

    // 创建移动端卡片视图
    const mobileContainer = document.createElement('div');
    mobileContainer.className = 'mobile-data-table';
    
    rows.forEach(row => {
      const card = this.createMobileDataCard(row, headers);
      mobileContainer.appendChild(card);
    });

    table.parentNode.insertBefore(mobileContainer, table);
    table.classList.add('desktop-table');
  }

  createMobileDataCard(row, headers) {
    const cells = row.querySelectorAll('td');
    const card = document.createElement('div');
    card.className = 'data-card';

    let cardHTML = '';
    if (cells.length > 0) {
      cardHTML += `<div class="data-card-header">${cells[0].textContent}</div>`;
      cardHTML += '<div class="data-card-body">';
      
      for (let i = 1; i < cells.length; i++) {
        if (headers[i] && cells[i]) {
          cardHTML += `
            <div class="data-field">
              <div class="data-field-label">${headers[i]}</div>
              <div class="data-field-value">${cells[i].innerHTML}</div>
            </div>
          `;
        }
      }
      
      cardHTML += '</div>';

      // 添加操作按钮
      const actions = row.querySelectorAll('button, .btn, a[class*="btn"]');
      if (actions.length > 0) {
        cardHTML += '<div class="data-card-actions">';
        actions.forEach(action => {
          cardHTML += action.outerHTML;
        });
        cardHTML += '</div>';
      }
    }

    card.innerHTML = cardHTML;
    return card;
  }

  // ===== 屏幕方向变化 =====
  setupOrientationChange() {
    window.addEventListener('orientationchange', () => {
      setTimeout(() => {
        this.handleOrientationChange();
      }, 100);
    });
  }

  handleOrientationChange() {
    // 重新计算视口高度
    this.originalViewportHeight = window.innerHeight;
    
    // 重新初始化某些功能
    this.setupViewportMeta();
    
    // 关闭抽屉
    this.closeDrawer();
    
    // 触发自定义事件
    const orientationEvent = new CustomEvent('mobileorientationchange', {
      detail: {
        orientation: screen.orientation ? screen.orientation.angle : window.orientation
      }
    });
    window.dispatchEvent(orientationEvent);
  }

  // ===== 安全区域 =====
  setupSafeArea() {
    if (!this.isIOS) return;

    // 检测iPhone X及以上设备
    const isIPhoneX = /iPhone/.test(navigator.userAgent) && screen.height >= 812;
    
    if (isIPhoneX) {
      document.body.classList.add('has-safe-area');
    }
  }

  // ===== 性能优化 =====
  enableGPUAcceleration(element) {
    element.style.transform = 'translateZ(0)';
    element.style.backfaceVisibility = 'hidden';
    element.style.perspective = '1000px';
  }

  // ===== 工具方法 =====
  vibrate(pattern = [200]) {
    if ('vibrate' in navigator) {
      navigator.vibrate(pattern);
    }
  }

  showMobileToast(message, duration = 3000) {
    const toast = document.createElement('div');
    toast.className = 'mobile-toast';
    toast.style.cssText = `
      position: fixed;
      bottom: 100px;
      left: 50%;
      transform: translateX(-50%);
      background: rgba(0, 0, 0, 0.8);
      color: white;
      padding: 12px 24px;
      border-radius: 24px;
      font-size: 14px;
      z-index: 10000;
      max-width: 80%;
      text-align: center;
      animation: mobileToastFadeIn 0.3s ease;
    `;
    toast.textContent = message;

    document.body.appendChild(toast);

    setTimeout(() => {
      toast.style.animation = 'mobileToastFadeOut 0.3s ease';
      setTimeout(() => {
        toast.remove();
      }, 300);
    }, duration);
  }

  preventZoom() {
    document.addEventListener('gesturestart', (e) => {
      e.preventDefault();
    });

    document.addEventListener('gesturechange', (e) => {
      e.preventDefault();
    });

    document.addEventListener('gestureend', (e) => {
      e.preventDefault();
    });
  }

  // ===== 清理方法 =====
  destroy() {
    document.removeEventListener('touchstart', this.handleTouchStart);
    document.removeEventListener('touchmove', this.handleTouchMove);
    document.removeEventListener('touchend', this.handleTouchEnd);
    
    const drawer = document.querySelector('.mobile-drawer');
    if (drawer) {
      drawer.remove();
    }

    const toolbar = document.querySelector('.mobile-toolbar');
    if (toolbar) {
      toolbar.remove();
    }

    document.body.style.overflow = '';
    document.body.classList.remove('keyboard-visible', 'has-safe-area');
  }

  // ===== 获取状态 =====
  isMobileDevice() {
    return this.isMobile;
  }

  isDrawerOpen() {
    return this.drawerOpen;
  }

  isKeyboardVisible() {
    return this.keyboardVisible;
  }
}

// ===== CSS动画样式 =====
const mobileAnimationCSS = `
@keyframes mobileToastFadeIn {
  from { opacity: 0; transform: translateX(-50%) translateY(20px); }
  to { opacity: 1; transform: translateX(-50%) translateY(0); }
}

@keyframes mobileToastFadeOut {
  from { opacity: 1; transform: translateX(-50%) translateY(0); }
  to { opacity: 0; transform: translateX(-50%) translateY(20px); }
}
`;

// 注入CSS
const styleSheet = document.createElement('style');
styleSheet.textContent = mobileAnimationCSS;
document.head.appendChild(styleSheet);

// ===== 全局实例和便捷方法 =====
window.MobileOptimizer = MobileOptimizer;
window.mobileOptimizer = new MobileOptimizer();

// 便捷方法
window.showMobileToast = function(message, duration) {
  return window.mobileOptimizer.showMobileToast(message, duration);
};

window.vibrate = function(pattern) {
  return window.mobileOptimizer.vibrate(pattern);
};

window.isMobileDevice = function() {
  return window.mobileOptimizer.isMobileDevice();
};

// ===== 自动初始化 =====
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    if (window.mobileOptimizer.isMobile) {
      console.log('移动端优化已启用');
    }
  });
} else {
  if (window.mobileOptimizer.isMobile) {
    console.log('移动端优化已启用');
  }
}

// ===== 导出 =====
if (typeof module !== 'undefined' && module.exports) {
  module.exports = MobileOptimizer;
} 