/**
 * HTML-GO 移动端优化JavaScript
 * 提供移动设备特定的功能和优化
 */

(function() {
  'use strict';

  // 移动端检测
  const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
  const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
  const isAndroid = /Android/.test(navigator.userAgent);
  const isTablet = /(tablet|ipad|playbook|silk)|(android(?!.*mobi))/i.test(navigator.userAgent);
  
  // 设备信息
  const deviceInfo = {
    isMobile,
    isIOS,
    isAndroid,
    isTablet,
    isDesktop: !isMobile,
    screenWidth: window.screen.width,
    screenHeight: window.screen.height,
    pixelRatio: window.devicePixelRatio || 1
  };

  // 移动端优化类
  class MobileOptimizer {
    constructor() {
      this.init();
    }

    init() {
      this.setupViewport();
      this.setupTouchEvents();
      this.setupScrollOptimization();
      this.setupOrientationChange();
      this.setupKeyboardHandling();
      this.setupTableOptimization();
      this.setupImageOptimization();
      this.exposeGlobalAPI();
    }

    // 视口优化
    setupViewport() {
      // 添加设备信息到HTML元素
      document.documentElement.setAttribute('data-device', isMobile ? 'mobile' : 'desktop');
      document.documentElement.setAttribute('data-platform', isIOS ? 'ios' : isAndroid ? 'android' : 'desktop');
      
      // 防止双击缩放（如果需要）
      if (isMobile) {
        let viewport = document.querySelector('meta[name="viewport"]');
        if (!viewport) {
          viewport = document.createElement('meta');
          viewport.name = 'viewport';
          document.head.appendChild(viewport);
        }
        
        // 根据设备类型调整viewport
        if (isIOS) {
          viewport.content = 'width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no, viewport-fit=cover';
        } else {
          viewport.content = 'width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no';
        }
      }
    }

    // 触摸事件优化
    setupTouchEvents() {
      if (!isMobile) return;

      // 添加触摸反馈类
      document.addEventListener('touchstart', (e) => {
        const target = e.target.closest('.btn, .card, .nav-link, .mobile-nav-link');
        if (target) {
          target.classList.add('touching');
        }
      }, { passive: true });

      document.addEventListener('touchend', (e) => {
        const target = e.target.closest('.btn, .card, .nav-link, .mobile-nav-link');
        if (target) {
          setTimeout(() => {
            target.classList.remove('touching');
          }, 150);
        }
      }, { passive: true });

      // 长按菜单优化
      let longPressTimer;
      document.addEventListener('touchstart', (e) => {
        if (e.target.closest('.no-long-press')) {
          longPressTimer = setTimeout(() => {
            e.preventDefault();
          }, 500);
        }
      }, { passive: false });

      document.addEventListener('touchend', () => {
        if (longPressTimer) {
          clearTimeout(longPressTimer);
        }
      }, { passive: true });
    }

    // 滚动优化
    setupScrollOptimization() {
      if (!isMobile) return;

      // 添加滚动性能优化类
      const scrollContainers = document.querySelectorAll('.card-body, .table-responsive, main');
      scrollContainers.forEach(container => {
        container.classList.add('scroll-container');
      });

      // 滚动节流
      let ticking = false;
      const updateScrollPosition = () => {
        // 这里可以添加滚动位置相关的逻辑
        ticking = false;
      };

      document.addEventListener('scroll', () => {
        if (!ticking) {
          requestAnimationFrame(updateScrollPosition);
          ticking = true;
        }
      }, { passive: true });
    }

    // 屏幕方向变化处理
    setupOrientationChange() {
      if (!isMobile) return;

      const handleOrientationChange = () => {
        // 延迟执行，等待浏览器完成方向变化
        setTimeout(() => {
          // 重新计算视口高度
          const vh = window.innerHeight * 0.01;
          document.documentElement.style.setProperty('--vh', `${vh}px`);
          
          // 触发重新布局事件
          window.dispatchEvent(new CustomEvent('orientationChanged', {
            detail: {
              orientation: window.screen.orientation?.angle || 0,
              width: window.innerWidth,
              height: window.innerHeight
            }
          }));
        }, 100);
      };

      // 监听方向变化
      if ('orientation' in screen) {
        screen.orientation.addEventListener('change', handleOrientationChange);
      } else {
        window.addEventListener('orientationchange', handleOrientationChange);
      }

      // 初始设置
      handleOrientationChange();
    }

    // 虚拟键盘处理
    setupKeyboardHandling() {
      if (!isMobile) return;

      let initialViewportHeight = window.innerHeight;
      
      const handleResize = () => {
        const currentHeight = window.innerHeight;
        const heightDifference = initialViewportHeight - currentHeight;
        
        // 检测虚拟键盘是否打开（高度减少超过150px）
        if (heightDifference > 150) {
          document.documentElement.classList.add('keyboard-open');
          
          // 确保输入框可见
          const activeElement = document.activeElement;
          if (activeElement && activeElement.tagName === 'INPUT' || activeElement.tagName === 'TEXTAREA') {
            setTimeout(() => {
              activeElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
            }, 100);
          }
        } else {
          document.documentElement.classList.remove('keyboard-open');
        }
      };

      window.addEventListener('resize', handleResize, { passive: true });

      // 输入框聚焦优化
      document.addEventListener('focusin', (e) => {
        if (e.target.matches('input, textarea')) {
          // 添加聚焦类用于样式调整
          e.target.classList.add('input-focused');
          
          // 滚动到输入框
          if (isMobile) {
            setTimeout(() => {
              e.target.scrollIntoView({ behavior: 'smooth', block: 'center' });
            }, 300);
          }
        }
      });

      document.addEventListener('focusout', (e) => {
        if (e.target.matches('input, textarea')) {
          e.target.classList.remove('input-focused');
        }
      });
    }

    // 表格移动端优化
    setupTableOptimization() {
      if (!isMobile) return;

      const optimizeTables = () => {
        const tables = document.querySelectorAll('.admin-table');
        tables.forEach(table => {
          if (window.innerWidth <= 768) {
            // 创建响应式表格容器
            if (!table.closest('.table-responsive')) {
              const wrapper = document.createElement('div');
              wrapper.className = 'table-responsive';
              table.parentNode.insertBefore(wrapper, table);
              wrapper.appendChild(table);
            }

            // 为移动端添加数据标签
            const headers = Array.from(table.querySelectorAll('th')).map(th => th.textContent.trim());
            const rows = table.querySelectorAll('tbody tr');
            
            rows.forEach(row => {
              const cells = row.querySelectorAll('td');
              cells.forEach((cell, index) => {
                if (headers[index]) {
                  cell.setAttribute('data-label', headers[index]);
                }
              });
            });
          }
        });
      };

      // 初始优化
      optimizeTables();
      
      // 窗口大小变化时重新优化
      window.addEventListener('resize', optimizeTables, { passive: true });
    }

    // 图片懒加载和优化
    setupImageOptimization() {
      if (!('IntersectionObserver' in window)) return;

      const imageObserver = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            const img = entry.target;
            
            // 懒加载
            if (img.dataset.src) {
              img.src = img.dataset.src;
              img.removeAttribute('data-src');
            }
            
            // 添加加载完成类
            img.addEventListener('load', () => {
              img.classList.add('loaded');
            });
            
            imageObserver.unobserve(img);
          }
        });
      });

      // 观察所有懒加载图片
      document.querySelectorAll('img[data-src]').forEach(img => {
        imageObserver.observe(img);
      });
    }

    // 暴露全局API
    exposeGlobalAPI() {
      window.MobileOptimizer = {
        deviceInfo,
        
        // 检测是否为移动设备
        isMobile: () => deviceInfo.isMobile,
        
        // 检测网络状态
        getNetworkInfo: () => {
          if ('connection' in navigator) {
            const connection = navigator.connection;
            return {
              effectiveType: connection.effectiveType,
              downlink: connection.downlink,
              saveData: connection.saveData
            };
          }
          return null;
        },
        
        // 触觉反馈（如果支持）
        vibrate: (pattern = 50) => {
          if ('vibrate' in navigator && deviceInfo.isMobile) {
            navigator.vibrate(pattern);
          }
        },
        
        // 切换移动端表格显示模式
        toggleTableMode: (table, mode = 'auto') => {
          if (!table) return;
          
          if (mode === 'cards' || (mode === 'auto' && window.innerWidth <= 768)) {
            table.classList.add('mobile-card-table');
          } else {
            table.classList.remove('mobile-card-table');
          }
        },
        
        // 安全区域适配
        setupSafeArea: () => {
          if (isIOS) {
            document.documentElement.classList.add('ios-safe-area');
          }
        },
        
        // 性能监控
        getPerformanceInfo: () => {
          if ('performance' in window) {
            return {
              navigation: performance.getEntriesByType('navigation')[0],
              memory: performance.memory ? {
                used: performance.memory.usedJSHeapSize,
                total: performance.memory.totalJSHeapSize,
                limit: performance.memory.jsHeapSizeLimit
              } : null
            };
          }
          return null;
        }
      };
    }
  }

  // 样式增强
  const addMobileStyles = () => {
    if (!isMobile) return;

    const style = document.createElement('style');
    style.textContent = `
      /* 触摸反馈 */
      .touching {
        transform: scale(0.98) !important;
        transition: transform 0.1s ease !important;
      }
      
      /* 键盘打开时的样式调整 */
      .keyboard-open {
        --vh: 50vh;
      }
      
      .keyboard-open .fixed.bottom-0 {
        display: none;
      }
      
      /* 输入框聚焦样式 */
      .input-focused {
        border-color: var(--brand-600) !important;
        box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1) !important;
      }
      
      /* iOS安全区域适配 */
      .ios-safe-area .status-bar-safe {
        padding-top: env(safe-area-inset-top);
      }
      
      /* 图片懒加载效果 */
      img[data-src] {
        opacity: 0;
        transition: opacity 0.3s ease;
      }
      
      img.loaded {
        opacity: 1;
      }
    `;
    document.head.appendChild(style);
  };

  // 初始化
  const init = () => {
    // 等待DOM加载完成
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', () => {
        addMobileStyles();
        new MobileOptimizer();
      });
    } else {
      addMobileStyles();
      new MobileOptimizer();
    }
  };

  init();

})(); 