/**
 * 懒加载管理器
 * Phase 3: 前端性能优化 - 代码分割和懒加载
 */

class LazyLoadManager {
  constructor(options = {}) {
    this.config = {
      imageThreshold: 100,
      componentThreshold: 50,
      enableImageLazyLoad: true,
      enableComponentLazyLoad: true,
      enableCodeSplitting: true,
      enablePreloading: true,
      retryCount: 3,
      retryDelay: 1000,
      placeholder: 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMzIwIiBoZWlnaHQ9IjI0MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiBmaWxsPSIjZGRkIi8+PHRleHQgeD0iNTAlIiB5PSI1MCUiIGZvbnQtZmFtaWx5PSJBcmlhbCIgZm9udC1zaXplPSIxNCIgZmlsbD0iIzk5OSIgdGV4dC1hbmNob3I9Im1pZGRsZSIgZHk9Ii4zZW0iPkxvYWRpbmcuLi48L3RleHQ+PC9zdmc+',
      enableIntersectionObserver: 'IntersectionObserver' in window,
      rootMargin: '50px',
      enableProgressiveLoading: true,
      chunkSize: 5,
      ...options
    };

    this.imageObserver = null;
    this.componentObserver = null;
    this.loadedImages = new Set();
    this.loadedComponents = new Set();
    this.loadingQueue = new Map();
    this.moduleCache = new Map();
    this.loadingPromises = new Map();
    this.errorRetryCount = new Map();

    this.init();
  }

  init() {
    this.setupImageLazyLoad();
    this.setupComponentLazyLoad();
    this.setupCodeSplitting();
    this.setupPreloading();
    this.processExistingElements();
  }

  // ===== 图片懒加载 =====
  setupImageLazyLoad() {
    if (!this.config.enableImageLazyLoad) return;

    if (this.config.enableIntersectionObserver) {
      this.imageObserver = new IntersectionObserver(
        this.handleImageIntersection.bind(this),
        {
          rootMargin: this.config.rootMargin,
          threshold: 0.1
        }
      );
    } else {
      // 降级到滚动事件
      this.setupScrollBasedImageLoading();
    }
  }

  handleImageIntersection(entries) {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        this.loadImage(entry.target);
        this.imageObserver.unobserve(entry.target);
      }
    });
  }

  setupScrollBasedImageLoading() {
    const checkImages = this.throttle(() => {
      document.querySelectorAll('img[data-src]').forEach(img => {
        if (this.isInViewport(img, this.config.imageThreshold)) {
          this.loadImage(img);
        }
      });
    }, 100);

    window.addEventListener('scroll', checkImages);
    window.addEventListener('resize', checkImages);
    checkImages(); // 初始检查
  }

  async loadImage(img) {
    if (this.loadedImages.has(img)) return;

    const src = img.dataset.src;
    const srcSet = img.dataset.srcset;
    
    if (!src) return;

    this.loadedImages.add(img);
    
    try {
      // 显示加载状态
      this.showImageLoading(img);
      
      // 创建新图片对象预加载
      const newImg = new Image();
      
      if (srcSet) {
        newImg.srcset = srcSet;
      }
      
      // 设置加载完成处理
      await new Promise((resolve, reject) => {
        newImg.onload = resolve;
        newImg.onerror = reject;
        newImg.src = src;
      });
      
      // 应用图片
      this.applyImage(img, newImg);
      
      // 触发加载完成事件
      this.triggerImageLoadEvent(img, 'loaded');
      
    } catch (error) {
      this.handleImageError(img, src, error);
    }
  }

  showImageLoading(img) {
    if (!img.src) {
      img.src = this.config.placeholder;
    }
    img.classList.add('lazy-loading');
  }

  applyImage(img, newImg) {
    // 应用渐显效果
    img.style.opacity = '0';
    img.style.transition = 'opacity 0.3s ease';
    
    img.src = newImg.src;
    if (newImg.srcset) {
      img.srcset = newImg.srcset;
    }
    
    img.onload = () => {
      img.style.opacity = '1';
      img.classList.remove('lazy-loading');
      img.classList.add('lazy-loaded');
      
      // 清理属性
      delete img.dataset.src;
      delete img.dataset.srcset;
    };
  }

  handleImageError(img, src, error) {
    const retryKey = img.dataset.src || src;
    const retryCount = this.errorRetryCount.get(retryKey) || 0;
    
    if (retryCount < this.config.retryCount) {
      this.errorRetryCount.set(retryKey, retryCount + 1);
      
      setTimeout(() => {
        this.loadedImages.delete(img);
        this.loadImage(img);
      }, this.config.retryDelay * (retryCount + 1));
    } else {
      img.classList.add('lazy-error');
      this.triggerImageLoadEvent(img, 'error', error);
    }
  }

  triggerImageLoadEvent(img, type, error = null) {
    const event = new CustomEvent(`lazyimage${type}`, {
      detail: { image: img, error }
    });
    img.dispatchEvent(event);
  }

  // ===== 组件懒加载 =====
  setupComponentLazyLoad() {
    if (!this.config.enableComponentLazyLoad) return;

    if (this.config.enableIntersectionObserver) {
      this.componentObserver = new IntersectionObserver(
        this.handleComponentIntersection.bind(this),
        {
          rootMargin: this.config.rootMargin,
          threshold: 0.1
        }
      );
    } else {
      this.setupScrollBasedComponentLoading();
    }
  }

  handleComponentIntersection(entries) {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        this.loadComponent(entry.target);
        this.componentObserver.unobserve(entry.target);
      }
    });
  }

  setupScrollBasedComponentLoading() {
    const checkComponents = this.throttle(() => {
      document.querySelectorAll('[data-lazy-component]').forEach(element => {
        if (this.isInViewport(element, this.config.componentThreshold)) {
          this.loadComponent(element);
        }
      });
    }, 100);

    window.addEventListener('scroll', checkComponents);
    window.addEventListener('resize', checkComponents);
    checkComponents();
  }

  async loadComponent(element) {
    if (this.loadedComponents.has(element)) return;

    const componentName = element.dataset.lazyComponent;
    const componentConfig = element.dataset.lazyConfig;
    
    if (!componentName) return;

    this.loadedComponents.add(element);
    
    try {
      // 显示加载状态
      this.showComponentLoading(element);
      
      // 加载组件
      const component = await this.importComponent(componentName);
      
      // 渲染组件
      await this.renderComponent(element, component, componentConfig);
      
      // 触发加载完成事件
      this.triggerComponentLoadEvent(element, 'loaded');
      
    } catch (error) {
      this.handleComponentError(element, componentName, error);
    }
  }

  showComponentLoading(element) {
    element.classList.add('lazy-component-loading');
    
    if (!element.innerHTML.trim()) {
      element.innerHTML = `
        <div class="lazy-component-placeholder">
          <div class="lazy-spinner"></div>
          <div class="lazy-text">加载中...</div>
        </div>
      `;
    }
  }

  async importComponent(componentName) {
    // 检查缓存
    if (this.moduleCache.has(componentName)) {
      return this.moduleCache.get(componentName);
    }

    // 检查是否已在加载
    if (this.loadingPromises.has(componentName)) {
      return this.loadingPromises.get(componentName);
    }

    // 开始加载
    const loadPromise = this.dynamicImportComponent(componentName);
    this.loadingPromises.set(componentName, loadPromise);

    try {
      const component = await loadPromise;
      this.moduleCache.set(componentName, component);
      this.loadingPromises.delete(componentName);
      return component;
    } catch (error) {
      this.loadingPromises.delete(componentName);
      throw error;
    }
  }

  async dynamicImportComponent(componentName) {
    // 根据组件名称动态导入
    const componentPath = this.getComponentPath(componentName);
    
    try {
      const module = await import(componentPath);
      return module.default || module;
    } catch (error) {
      // 尝试备用路径
      const fallbackPath = `./components/${componentName}.js`;
      const fallbackModule = await import(fallbackPath);
      return fallbackModule.default || fallbackModule;
    }
  }

  getComponentPath(componentName) {
    // 组件路径映射
    const componentPaths = {
      'DataTable': './js/components/DataTable.js',
      'Chart': './js/components/Chart.js',
      'Editor': './js/components/Editor.js',
      'Dashboard': './js/components/Dashboard.js',
      'Modal': './js/components/Modal.js'
    };

    return componentPaths[componentName] || `./js/components/${componentName}.js`;
  }

  async renderComponent(element, component, configStr) {
    const config = configStr ? JSON.parse(configStr) : {};
    
    if (typeof component === 'function') {
      // 函数组件
      const result = component(element, config);
      if (result instanceof Promise) {
        await result;
      }
    } else if (component.render) {
      // 对象组件
      await component.render(element, config);
    } else if (component.default) {
      // ES6模块
      await this.renderComponent(element, component.default, configStr);
    } else {
      throw new Error(`无效的组件格式: ${typeof component}`);
    }
    
    element.classList.remove('lazy-component-loading');
    element.classList.add('lazy-component-loaded');
  }

  handleComponentError(element, componentName, error) {
    const retryCount = this.errorRetryCount.get(componentName) || 0;
    
    if (retryCount < this.config.retryCount) {
      this.errorRetryCount.set(componentName, retryCount + 1);
      
      setTimeout(() => {
        this.loadedComponents.delete(element);
        this.loadComponent(element);
      }, this.config.retryDelay * (retryCount + 1));
    } else {
      element.classList.add('lazy-component-error');
      element.innerHTML = `
        <div class="lazy-component-error-message">
          <div>组件加载失败</div>
          <button onclick="window.lazyLoadManager.retryComponent(this.closest('[data-lazy-component]'))">
            重试
          </button>
        </div>
      `;
      
      this.triggerComponentLoadEvent(element, 'error', error);
    }
  }

  triggerComponentLoadEvent(element, type, error = null) {
    const event = new CustomEvent(`lazycomponent${type}`, {
      detail: { element, error }
    });
    element.dispatchEvent(event);
  }

  retryComponent(element) {
    this.loadedComponents.delete(element);
    this.errorRetryCount.delete(element.dataset.lazyComponent);
    this.loadComponent(element);
  }

  // ===== 代码分割 =====
  setupCodeSplitting() {
    if (!this.config.enableCodeSplitting) return;

    this.setupRouteBasedSplitting();
    this.setupFeatureBasedSplitting();
  }

  setupRouteBasedSplitting() {
    // 监听路由变化
    window.addEventListener('popstate', () => {
      this.loadRouteComponents();
    });

    // 监听链接点击
    document.addEventListener('click', (e) => {
      const link = e.target.closest('a[data-route]');
      if (link) {
        e.preventDefault();
        this.loadRoute(link.dataset.route);
      }
    });
  }

  setupFeatureBasedSplitting() {
    // 为特定功能按钮添加懒加载
    document.addEventListener('click', (e) => {
      const trigger = e.target.closest('[data-lazy-feature]');
      if (trigger) {
        e.preventDefault();
        this.loadFeature(trigger.dataset.lazyFeature, trigger);
      }
    });
  }

  async loadRoute(route) {
    try {
      const routeModule = await this.importRoute(route);
      if (routeModule.render) {
        routeModule.render();
      }
      
      // 更新URL
      history.pushState({}, '', route);
      
    } catch (error) {
      console.error('路由加载失败:', error);
    }
  }

  async importRoute(route) {
    const routePath = this.getRoutePath(route);
    return await import(routePath);
  }

  getRoutePath(route) {
    const routePaths = {
      '/dashboard': './js/routes/Dashboard.js',
      '/pages': './js/routes/Pages.js',
      '/apikeys': './js/routes/ApiKeys.js',
      '/settings': './js/routes/Settings.js'
    };

    return routePaths[route] || `./js/routes${route}.js`;
  }

  async loadFeature(featureName, trigger) {
    try {
      trigger.disabled = true;
      trigger.textContent = '加载中...';
      
      const feature = await this.importFeature(featureName);
      
      if (feature.init) {
        feature.init(trigger);
      }
      
    } catch (error) {
      console.error('功能加载失败:', error);
      trigger.textContent = '加载失败';
    } finally {
      trigger.disabled = false;
    }
  }

  async importFeature(featureName) {
    const featurePath = this.getFeaturePath(featureName);
    return await import(featurePath);
  }

  getFeaturePath(featureName) {
    const featurePaths = {
      'export': './js/features/Export.js',
      'import': './js/features/Import.js',
      'analytics': './js/features/Analytics.js',
      'search': './js/features/Search.js'
    };

    return featurePaths[featureName] || `./js/features/${featureName}.js`;
  }

  // ===== 预加载 =====
  setupPreloading() {
    if (!this.config.enablePreloading) return;

    this.setupIdlePreloading();
    this.setupHoverPreloading();
    this.setupVisibilityPreloading();
  }

  setupIdlePreloading() {
    if ('requestIdleCallback' in window) {
      requestIdleCallback(() => {
        this.preloadCriticalResources();
      });
    } else {
      setTimeout(() => {
        this.preloadCriticalResources();
      }, 1000);
    }
  }

  setupHoverPreloading() {
    document.addEventListener('mouseenter', (e) => {
      const preloadTrigger = e.target.closest('[data-preload]');
      if (preloadTrigger) {
        const resource = preloadTrigger.dataset.preload;
        this.preloadResource(resource);
      }
    });
  }

  setupVisibilityPreloading() {
    if (this.config.enableIntersectionObserver) {
      const preloadObserver = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            const resource = entry.target.dataset.preloadOnVisible;
            if (resource) {
              this.preloadResource(resource);
              preloadObserver.unobserve(entry.target);
            }
          }
        });
      }, { rootMargin: '200px' });

      document.querySelectorAll('[data-preload-on-visible]').forEach(el => {
        preloadObserver.observe(el);
      });
    }
  }

  async preloadCriticalResources() {
    const criticalResources = [
      './js/components/DataTable.js',
      './js/components/Modal.js',
      './js/features/Search.js'
    ];

    // 分批预加载，避免阻塞
    for (let i = 0; i < criticalResources.length; i += this.config.chunkSize) {
      const chunk = criticalResources.slice(i, i + this.config.chunkSize);
      
      await Promise.allSettled(
        chunk.map(resource => this.preloadResource(resource))
      );
      
      // 让出控制权
      await new Promise(resolve => setTimeout(resolve, 100));
    }
  }

  async preloadResource(resourcePath) {
    if (this.moduleCache.has(resourcePath)) return;

    try {
      const module = await import(resourcePath);
      this.moduleCache.set(resourcePath, module);
    } catch (error) {
      console.warn('预加载失败:', resourcePath, error);
    }
  }

  // ===== 渐进式加载 =====
  setupProgressiveLoading() {
    if (!this.config.enableProgressiveLoading) return;

    this.loadInChunks();
  }

  async loadInChunks() {
    const allImages = document.querySelectorAll('img[data-src]');
    const allComponents = document.querySelectorAll('[data-lazy-component]');
    
    // 分块加载图片
    await this.loadElementsInChunks(allImages, this.loadImage.bind(this));
    
    // 分块加载组件
    await this.loadElementsInChunks(allComponents, this.loadComponent.bind(this));
  }

  async loadElementsInChunks(elements, loadFunction) {
    const chunks = this.chunkArray(Array.from(elements), this.config.chunkSize);
    
    for (const chunk of chunks) {
      // 只加载视口内或接近视口的元素
      const visibleElements = chunk.filter(el => 
        this.isInViewport(el, this.config.imageThreshold * 2)
      );
      
      await Promise.allSettled(
        visibleElements.map(element => loadFunction(element))
      );
      
      // 让出控制权
      await new Promise(resolve => setTimeout(resolve, 50));
    }
  }

  chunkArray(array, size) {
    const chunks = [];
    for (let i = 0; i < array.length; i += size) {
      chunks.push(array.slice(i, i + size));
    }
    return chunks;
  }

  // ===== 工具方法 =====
  isInViewport(element, threshold = 0) {
    const rect = element.getBoundingClientRect();
    const windowHeight = window.innerHeight || document.documentElement.clientHeight;
    const windowWidth = window.innerWidth || document.documentElement.clientWidth;

    return (
      rect.bottom >= -threshold &&
      rect.right >= -threshold &&
      rect.top <= windowHeight + threshold &&
      rect.left <= windowWidth + threshold
    );
  }

  throttle(func, delay) {
    let timeoutId;
    let lastExecTime = 0;
    
    return (...args) => {
      const currentTime = Date.now();
      
      if (currentTime - lastExecTime > delay) {
        func.apply(this, args);
        lastExecTime = currentTime;
      } else {
        clearTimeout(timeoutId);
        timeoutId = setTimeout(() => {
          func.apply(this, args);
          lastExecTime = Date.now();
        }, delay - (currentTime - lastExecTime));
      }
    };
  }

  processExistingElements() {
    // 处理现有的懒加载元素
    document.querySelectorAll('img[data-src]').forEach(img => {
      if (this.imageObserver) {
        this.imageObserver.observe(img);
      }
    });

    document.querySelectorAll('[data-lazy-component]').forEach(element => {
      if (this.componentObserver) {
        this.componentObserver.observe(element);
      }
    });
  }

  // ===== 公共API =====
  loadImageNow(img) {
    return this.loadImage(img);
  }

  loadComponentNow(element) {
    return this.loadComponent(element);
  }

  preloadImages(selector = 'img[data-src]') {
    document.querySelectorAll(selector).forEach(img => {
      this.loadImage(img);
    });
  }

  preloadComponents(selector = '[data-lazy-component]') {
    document.querySelectorAll(selector).forEach(element => {
      this.loadComponent(element);
    });
  }

  refreshObservers() {
    // 重新观察所有懒加载元素
    this.processExistingElements();
  }

  getLoadingStats() {
    return {
      loadedImages: this.loadedImages.size,
      loadedComponents: this.loadedComponents.size,
      cachedModules: this.moduleCache.size,
      pendingLoads: this.loadingPromises.size,
      totalErrors: this.errorRetryCount.size
    };
  }

  // ===== 样式创建 =====
  createLazyLoadStyles() {
    const styles = `
      .lazy-loading {
        filter: blur(2px);
        transition: filter 0.3s ease;
      }
      
      .lazy-loaded {
        filter: none;
      }
      
      .lazy-error {
        background-color: #f8d7da;
        color: #721c24;
        display: flex;
        align-items: center;
        justify-content: center;
        min-height: 100px;
      }
      
      .lazy-component-loading {
        min-height: 100px;
        display: flex;
        align-items: center;
        justify-content: center;
      }
      
      .lazy-component-placeholder {
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 12px;
        color: #666;
      }
      
      .lazy-spinner {
        width: 32px;
        height: 32px;
        border: 3px solid #f3f3f3;
        border-top: 3px solid #0066cc;
        border-radius: 50%;
        animation: lazySpinnerRotate 1s linear infinite;
      }
      
      @keyframes lazySpinnerRotate {
        0% { transform: rotate(0deg); }
        100% { transform: rotate(360deg); }
      }
      
      .lazy-text {
        font-size: 14px;
      }
      
      .lazy-component-loaded {
        animation: lazyFadeIn 0.3s ease;
      }
      
      @keyframes lazyFadeIn {
        from { opacity: 0; }
        to { opacity: 1; }
      }
      
      .lazy-component-error {
        background-color: #f8d7da;
        color: #721c24;
        padding: 20px;
        border-radius: 4px;
        text-align: center;
      }
      
      .lazy-component-error-message button {
        margin-top: 10px;
        padding: 6px 12px;
        background: #dc3545;
        color: white;
        border: none;
        border-radius: 4px;
        cursor: pointer;
      }
      
      .lazy-component-error-message button:hover {
        background: #c82333;
      }
      
      /* 渐进式图片加载效果 */
      .progressive-image {
        position: relative;
        overflow: hidden;
      }
      
      .progressive-image::before {
        content: '';
        position: absolute;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: linear-gradient(90deg, 
          transparent, 
          rgba(255, 255, 255, 0.4), 
          transparent
        );
        transform: translateX(-100%);
        animation: lazyShimmer 1.5s infinite;
      }
      
      .progressive-image.lazy-loaded::before {
        display: none;
      }
      
      @keyframes lazyShimmer {
        0% { transform: translateX(-100%); }
        100% { transform: translateX(100%); }
      }
      
      /* 减少动画 */
      @media (prefers-reduced-motion: reduce) {
        .lazy-loading,
        .lazy-component-loaded,
        .progressive-image::before {
          animation: none !important;
          transition: none !important;
        }
      }
    `;

    const styleSheet = document.createElement('style');
    styleSheet.textContent = styles;
    document.head.appendChild(styleSheet);
  }

  // ===== 销毁方法 =====
  destroy() {
    if (this.imageObserver) {
      this.imageObserver.disconnect();
    }
    
    if (this.componentObserver) {
      this.componentObserver.disconnect();
    }
    
    this.loadedImages.clear();
    this.loadedComponents.clear();
    this.loadingQueue.clear();
    this.moduleCache.clear();
    this.loadingPromises.clear();
    this.errorRetryCount.clear();
  }
}

// 注入样式
const lazyLoadManager = new LazyLoadManager();
lazyLoadManager.createLazyLoadStyles();

// ===== 全局实例和便捷方法 =====
window.LazyLoadManager = LazyLoadManager;
window.lazyLoadManager = lazyLoadManager;

// 便捷方法
window.lazyLoadImage = function(img) {
  return window.lazyLoadManager.loadImageNow(img);
};

window.lazyLoadComponent = function(element) {
  return window.lazyLoadManager.loadComponentNow(element);
};

window.preloadImages = function(selector) {
  return window.lazyLoadManager.preloadImages(selector);
};

window.preloadComponents = function(selector) {
  return window.lazyLoadManager.preloadComponents(selector);
};

window.refreshLazyLoad = function() {
  return window.lazyLoadManager.refreshObservers();
};

// ===== 自动初始化 =====
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    console.log('懒加载管理器已启用，为图片添加 data-src，为组件添加 data-lazy-component');
  });
} else {
  console.log('懒加载管理器已启用，为图片添加 data-src，为组件添加 data-lazy-component');
}

// ===== 导出 =====
if (typeof module !== 'undefined' && module.exports) {
  module.exports = LazyLoadManager;
} 