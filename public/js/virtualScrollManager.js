/**
 * 虚拟滚动管理器
 * Phase 3: 前端性能优化 - 虚拟滚动实现（大量数据）
 */

class VirtualScrollManager {
  constructor(options = {}) {
    this.config = {
      itemHeight: 50,
      bufferSize: 10,
      threshold: 1000,
      enableDynamicHeight: false,
      enableHorizontalScroll: false,
      enableSmoothScrolling: true,
      overscan: 5,
      debounceDelay: 16,
      cacheSize: 100,
      enableInfiniteScroll: false,
      loadMoreThreshold: 200,
      ...options
    };

    this.instances = new Map();
    this.heightCache = new Map();
    this.observers = new Map();
    this.scrollDebounceMap = new Map();

    this.init();
  }

  init() {
    this.setupAutoDetection();
    this.createHelperStyles();
  }

  // ===== 自动检测和初始化 =====
  setupAutoDetection() {
    const observer = new MutationObserver((mutations) => {
      mutations.forEach(mutation => {
        mutation.addedNodes.forEach(node => {
          if (node.nodeType === Node.ELEMENT_NODE) {
            this.checkForVirtualScrollContainers(node);
          }
        });
      });
    });

    observer.observe(document.body, {
      childList: true,
      subtree: true
    });

    // 检查现有元素
    this.checkForVirtualScrollContainers(document.body);
  }

  checkForVirtualScrollContainers(element) {
    // 查找标记为虚拟滚动的容器
    const containers = element.querySelectorAll?.('[data-virtual-scroll]') || [];
    containers.forEach(container => {
      if (!this.instances.has(container)) {
        this.initializeVirtualScroll(container);
      }
    });

    // 如果元素本身是虚拟滚动容器
    if (element.dataset?.virtualScroll) {
      this.initializeVirtualScroll(element);
    }
  }

  // ===== 虚拟滚动初始化 =====
  initializeVirtualScroll(container, options = {}) {
    const config = { ...this.config, ...options };
    const dataSource = this.getDataSource(container);
    
    if (!dataSource || dataSource.length < config.threshold) {
      return; // 数据量不够，不需要虚拟滚动
    }

    const instance = this.createVirtualScrollInstance(container, dataSource, config);
    this.instances.set(container, instance);
    
    return instance;
  }

  createVirtualScrollInstance(container, dataSource, config) {
    const instance = {
      container,
      config,
      dataSource,
      visibleStart: 0,
      visibleEnd: 0,
      scrollTop: 0,
      containerHeight: 0,
      totalHeight: 0,
      renderedItems: new Map(),
      itemHeights: new Map(),
      isTable: container.tagName === 'TABLE' || container.querySelector('table'),
      isHorizontal: config.enableHorizontalScroll,
      scrollContainer: null,
      contentContainer: null,
      observer: null
    };

    this.setupVirtualScrollStructure(instance);
    this.bindVirtualScrollEvents(instance);
    this.updateVirtualScroll(instance);

    return instance;
  }

  setupVirtualScrollStructure(instance) {
    const { container, isTable, config } = instance;
    
    if (isTable) {
      this.setupTableVirtualScroll(instance);
    } else {
      this.setupListVirtualScroll(instance);
    }
    
    // 设置容器样式
    container.style.position = 'relative';
    container.style.overflow = 'auto';
    
    if (config.enableSmoothScrolling) {
      container.style.scrollBehavior = 'smooth';
    }
  }

  setupTableVirtualScroll(instance) {
    const { container } = instance;
    const table = container.tagName === 'TABLE' ? container : container.querySelector('table');
    
    if (!table) return;

    // 保存原始表格结构
    const thead = table.querySelector('thead');
    const tbody = table.querySelector('tbody');
    const originalRows = Array.from(tbody?.children || []);

    // 创建虚拟滚动容器
    const scrollContainer = document.createElement('div');
    scrollContainer.className = 'virtual-scroll-container';
    scrollContainer.style.cssText = `
      height: 100%;
      overflow: auto;
      position: relative;
    `;

    // 创建表格容器
    const tableContainer = document.createElement('div');
    tableContainer.className = 'virtual-table-container';
    tableContainer.style.cssText = `
      position: relative;
      width: 100%;
    `;

    // 创建固定表头
    if (thead) {
      const headerTable = table.cloneNode(false);
      headerTable.appendChild(thead.cloneNode(true));
      headerTable.style.cssText = `
        position: sticky;
        top: 0;
        z-index: 10;
        background: var(--color-surface, #fff);
        margin-bottom: 0;
      `;
      tableContainer.appendChild(headerTable);
    }

    // 创建内容区域
    const contentArea = document.createElement('div');
    contentArea.className = 'virtual-scroll-content';
    contentArea.style.position = 'relative';

    // 创建可见表格
    const visibleTable = table.cloneNode(false);
    const visibleTbody = document.createElement('tbody');
    visibleTable.appendChild(visibleTbody);
    contentArea.appendChild(visibleTable);

    tableContainer.appendChild(contentArea);
    scrollContainer.appendChild(tableContainer);

    // 替换原容器内容
    container.innerHTML = '';
    container.appendChild(scrollContainer);

    // 更新实例属性
    instance.scrollContainer = scrollContainer;
    instance.contentContainer = contentArea;
    instance.visibleTable = visibleTable;
    instance.visibleTbody = visibleTbody;
    instance.originalRows = originalRows;
  }

  setupListVirtualScroll(instance) {
    const { container } = instance;
    const originalItems = Array.from(container.children);

    // 创建滚动容器
    const scrollContainer = document.createElement('div');
    scrollContainer.className = 'virtual-scroll-container';
    scrollContainer.style.cssText = `
      height: 100%;
      overflow: auto;
      position: relative;
    `;

    // 创建内容容器
    const contentContainer = document.createElement('div');
    contentContainer.className = 'virtual-scroll-content';
    contentContainer.style.position = 'relative';

    scrollContainer.appendChild(contentContainer);
    
    // 替换原容器内容
    container.innerHTML = '';
    container.appendChild(scrollContainer);

    // 更新实例属性
    instance.scrollContainer = scrollContainer;
    instance.contentContainer = contentContainer;
    instance.originalItems = originalItems;
  }

  // ===== 数据源处理 =====
  getDataSource(container) {
    // 从data属性获取
    if (container.dataset.virtualScrollData) {
      try {
        return JSON.parse(container.dataset.virtualScrollData);
      } catch (e) {
        console.warn('虚拟滚动数据解析失败:', e);
      }
    }

    // 从DOM元素获取
    if (container.tagName === 'TABLE' || container.querySelector('table')) {
      return this.extractTableData(container);
    } else {
      return this.extractListData(container);
    }
  }

  extractTableData(container) {
    const table = container.tagName === 'TABLE' ? container : container.querySelector('table');
    const tbody = table?.querySelector('tbody');
    const rows = tbody?.querySelectorAll('tr') || [];
    
    return Array.from(rows).map((row, index) => ({
      id: row.id || `row-${index}`,
      element: row,
      data: this.extractRowData(row)
    }));
  }

  extractRowData(row) {
    const cells = row.querySelectorAll('td, th');
    return Array.from(cells).map(cell => ({
      content: cell.innerHTML,
      text: cell.textContent
    }));
  }

  extractListData(container) {
    const items = container.children;
    return Array.from(items).map((item, index) => ({
      id: item.id || `item-${index}`,
      element: item,
      data: {
        content: item.innerHTML,
        text: item.textContent
      }
    }));
  }

  // ===== 事件绑定 =====
  bindVirtualScrollEvents(instance) {
    const { scrollContainer, config } = instance;
    
    // 滚动事件
    const scrollHandler = this.debounce(() => {
      this.handleScroll(instance);
    }, config.debounceDelay);
    
    scrollContainer.addEventListener('scroll', scrollHandler);
    
    // 尺寸变化监听
    const resizeObserver = new ResizeObserver(() => {
      this.handleResize(instance);
    });
    
    resizeObserver.observe(scrollContainer);
    instance.resizeObserver = resizeObserver;

    // 无限滚动
    if (config.enableInfiniteScroll) {
      this.setupInfiniteScroll(instance);
    }
  }

  handleScroll(instance) {
    const { scrollContainer } = instance;
    instance.scrollTop = scrollContainer.scrollTop;
    this.updateVirtualScroll(instance);
  }

  handleResize(instance) {
    const { scrollContainer } = instance;
    instance.containerHeight = scrollContainer.clientHeight;
    this.updateVirtualScroll(instance);
  }

  setupInfiniteScroll(instance) {
    const { scrollContainer, config } = instance;
    
    scrollContainer.addEventListener('scroll', () => {
      const { scrollTop, scrollHeight, clientHeight } = scrollContainer;
      const threshold = config.loadMoreThreshold;
      
      if (scrollHeight - scrollTop - clientHeight < threshold) {
        this.triggerLoadMore(instance);
      }
    });
  }

  triggerLoadMore(instance) {
    const event = new CustomEvent('virtualscrollloadmore', {
      detail: {
        instance,
        currentLength: instance.dataSource.length
      }
    });
    instance.container.dispatchEvent(event);
  }

  // ===== 虚拟滚动核心逻辑 =====
  updateVirtualScroll(instance) {
    const { config, dataSource, scrollTop, isTable } = instance;
    
    if (!dataSource.length) return;

    // 计算容器高度
    instance.containerHeight = instance.scrollContainer.clientHeight;
    
    // 计算可见范围
    const { start, end } = this.calculateVisibleRange(instance);
    
    // 应用缓冲区
    const bufferStart = Math.max(0, start - config.bufferSize);
    const bufferEnd = Math.min(dataSource.length, end + config.bufferSize);
    
    // 更新可见范围
    instance.visibleStart = bufferStart;
    instance.visibleEnd = bufferEnd;
    
    // 渲染可见项目
    if (isTable) {
      this.renderTableItems(instance, bufferStart, bufferEnd);
    } else {
      this.renderListItems(instance, bufferStart, bufferEnd);
    }
    
    // 更新滚动器高度
    this.updateScrollerHeight(instance);
  }

  calculateVisibleRange(instance) {
    const { config, scrollTop, containerHeight, dataSource } = instance;
    
    let start, end;
    
    if (config.enableDynamicHeight) {
      // 动态高度计算
      start = this.findStartIndexForDynamicHeight(instance, scrollTop);
      end = this.findEndIndexForDynamicHeight(instance, scrollTop + containerHeight);
    } else {
      // 固定高度计算
      const itemHeight = config.itemHeight;
      start = Math.floor(scrollTop / itemHeight);
      end = Math.ceil((scrollTop + containerHeight) / itemHeight);
    }
    
    return {
      start: Math.max(0, start),
      end: Math.min(dataSource.length, end + config.overscan)
    };
  }

  findStartIndexForDynamicHeight(instance, targetOffset) {
    const { dataSource } = instance;
    let totalHeight = 0;
    
    for (let i = 0; i < dataSource.length; i++) {
      const itemHeight = this.getItemHeight(instance, i);
      if (totalHeight + itemHeight > targetOffset) {
        return i;
      }
      totalHeight += itemHeight;
    }
    
    return dataSource.length - 1;
  }

  findEndIndexForDynamicHeight(instance, targetOffset) {
    const { dataSource } = instance;
    let totalHeight = 0;
    
    for (let i = 0; i < dataSource.length; i++) {
      const itemHeight = this.getItemHeight(instance, i);
      totalHeight += itemHeight;
      if (totalHeight >= targetOffset) {
        return i + 1;
      }
    }
    
    return dataSource.length;
  }

  getItemHeight(instance, index) {
    const { config, dataSource } = instance;
    
    if (config.enableDynamicHeight) {
      // 从缓存获取或测量
      if (instance.itemHeights.has(index)) {
        return instance.itemHeights.get(index);
      }
      
      // 测量实际高度
      const height = this.measureItemHeight(instance, index);
      instance.itemHeights.set(index, height);
      return height;
    }
    
    return config.itemHeight;
  }

  measureItemHeight(instance, index) {
    const { dataSource, config } = instance;
    const item = dataSource[index];
    
    if (!item) return config.itemHeight;
    
    // 创建临时元素测量
    const tempElement = this.createTempElement(instance, item);
    document.body.appendChild(tempElement);
    
    const height = tempElement.offsetHeight;
    document.body.removeChild(tempElement);
    
    return height || config.itemHeight;
  }

  createTempElement(instance, item) {
    const { isTable } = instance;
    
    if (isTable) {
      const table = document.createElement('table');
      table.style.cssText = 'position: absolute; visibility: hidden; top: -9999px;';
      table.innerHTML = `<tbody><tr>${item.element.innerHTML}</tr></tbody>`;
      return table;
    } else {
      const div = document.createElement('div');
      div.style.cssText = 'position: absolute; visibility: hidden; top: -9999px;';
      div.innerHTML = item.element.outerHTML;
      return div;
    }
  }

  // ===== 渲染方法 =====
  renderTableItems(instance, start, end) {
    const { visibleTbody, dataSource, config } = instance;
    
    // 清空现有内容
    visibleTbody.innerHTML = '';
    
    // 计算上方偏移
    const topOffset = this.calculateTopOffset(instance, start);
    
    // 计算下方偏移
    const bottomOffset = this.calculateBottomOffset(instance, end);
    
    // 添加上方占位符
    if (topOffset > 0) {
      const spacer = document.createElement('tr');
      spacer.innerHTML = `<td colspan="100%" style="height: ${topOffset}px; padding: 0; border: none;"></td>`;
      visibleTbody.appendChild(spacer);
    }
    
    // 渲染可见行
    for (let i = start; i < end; i++) {
      const item = dataSource[i];
      if (item) {
        const row = this.createTableRow(instance, item, i);
        visibleTbody.appendChild(row);
      }
    }
    
    // 添加下方占位符
    if (bottomOffset > 0) {
      const spacer = document.createElement('tr');
      spacer.innerHTML = `<td colspan="100%" style="height: ${bottomOffset}px; padding: 0; border: none;"></td>`;
      visibleTbody.appendChild(spacer);
    }
  }

  renderListItems(instance, start, end) {
    const { contentContainer, dataSource } = instance;
    
    // 清空现有内容
    contentContainer.innerHTML = '';
    
    // 计算偏移
    const topOffset = this.calculateTopOffset(instance, start);
    
    // 设置内容容器样式
    contentContainer.style.paddingTop = `${topOffset}px`;
    
    // 渲染可见项目
    for (let i = start; i < end; i++) {
      const item = dataSource[i];
      if (item) {
        const element = this.createListItem(instance, item, i);
        contentContainer.appendChild(element);
      }
    }
  }

  calculateTopOffset(instance, start) {
    const { config } = instance;
    
    if (config.enableDynamicHeight) {
      let offset = 0;
      for (let i = 0; i < start; i++) {
        offset += this.getItemHeight(instance, i);
      }
      return offset;
    }
    
    return start * config.itemHeight;
  }

  calculateBottomOffset(instance, end) {
    const { config, dataSource } = instance;
    
    if (config.enableDynamicHeight) {
      let offset = 0;
      for (let i = end; i < dataSource.length; i++) {
        offset += this.getItemHeight(instance, i);
      }
      return offset;
    }
    
    return (dataSource.length - end) * config.itemHeight;
  }

  createTableRow(instance, item, index) {
    const row = item.element.cloneNode(true);
    row.dataset.virtualIndex = index;
    row.classList.add('virtual-scroll-item');
    return row;
  }

  createListItem(instance, item, index) {
    const element = item.element.cloneNode(true);
    element.dataset.virtualIndex = index;
    element.classList.add('virtual-scroll-item');
    return element;
  }

  updateScrollerHeight(instance) {
    const { config, dataSource, contentContainer } = instance;
    
    let totalHeight;
    
    if (config.enableDynamicHeight) {
      totalHeight = 0;
      for (let i = 0; i < dataSource.length; i++) {
        totalHeight += this.getItemHeight(instance, i);
      }
    } else {
      totalHeight = dataSource.length * config.itemHeight;
    }
    
    instance.totalHeight = totalHeight;
    
    // 设置容器高度
    if (contentContainer) {
      contentContainer.style.height = `${totalHeight}px`;
    }
  }

  // ===== 公共API =====
  scrollToIndex(container, index, options = {}) {
    const instance = this.instances.get(container);
    if (!instance) return;

    const { config, dataSource } = instance;
    
    if (index < 0 || index >= dataSource.length) return;

    let targetOffset;
    
    if (config.enableDynamicHeight) {
      targetOffset = 0;
      for (let i = 0; i < index; i++) {
        targetOffset += this.getItemHeight(instance, i);
      }
    } else {
      targetOffset = index * config.itemHeight;
    }

    const behavior = options.smooth !== false ? 'smooth' : 'auto';
    instance.scrollContainer.scrollTo({
      top: targetOffset,
      behavior
    });
  }

  scrollToTop(container, smooth = true) {
    const instance = this.instances.get(container);
    if (!instance) return;

    instance.scrollContainer.scrollTo({
      top: 0,
      behavior: smooth ? 'smooth' : 'auto'
    });
  }

  scrollToBottom(container, smooth = true) {
    const instance = this.instances.get(container);
    if (!instance) return;

    instance.scrollContainer.scrollTo({
      top: instance.totalHeight,
      behavior: smooth ? 'smooth' : 'auto'
    });
  }

  updateData(container, newData) {
    const instance = this.instances.get(container);
    if (!instance) return;

    instance.dataSource = newData;
    instance.itemHeights.clear(); // 清除高度缓存
    this.updateVirtualScroll(instance);
  }

  appendData(container, additionalData) {
    const instance = this.instances.get(container);
    if (!instance) return;

    instance.dataSource.push(...additionalData);
    this.updateVirtualScroll(instance);
  }

  getVisibleRange(container) {
    const instance = this.instances.get(container);
    if (!instance) return null;

    return {
      start: instance.visibleStart,
      end: instance.visibleEnd,
      total: instance.dataSource.length
    };
  }

  refreshVirtualScroll(container) {
    const instance = this.instances.get(container);
    if (!instance) return;

    instance.itemHeights.clear();
    this.updateVirtualScroll(instance);
  }

  // ===== 工具方法 =====
  debounce(func, delay) {
    let timeoutId;
    return (...args) => {
      clearTimeout(timeoutId);
      timeoutId = setTimeout(() => func.apply(this, args), delay);
    };
  }

  createHelperStyles() {
    const styles = `
      .virtual-scroll-container {
        position: relative;
        overflow: auto;
        height: 100%;
      }
      
      .virtual-scroll-content {
        position: relative;
        min-height: 100%;
      }
      
      .virtual-table-container {
        position: relative;
        width: 100%;
      }
      
      .virtual-scroll-item {
        transition: background-color 0.2s ease;
      }
      
      .virtual-scroll-item:hover {
        background-color: rgba(0, 102, 204, 0.05);
      }
      
      /* 滚动条样式 */
      .virtual-scroll-container::-webkit-scrollbar {
        width: 8px;
        height: 8px;
      }
      
      .virtual-scroll-container::-webkit-scrollbar-track {
        background: var(--color-surface, #f1f1f1);
        border-radius: 4px;
      }
      
      .virtual-scroll-container::-webkit-scrollbar-thumb {
        background: var(--color-border, #ccc);
        border-radius: 4px;
      }
      
      .virtual-scroll-container::-webkit-scrollbar-thumb:hover {
        background: var(--color-text-secondary, #999);
      }
      
      /* 性能优化 */
      .virtual-scroll-container {
        contain: layout style paint;
        will-change: scroll-position;
      }
      
      .virtual-scroll-item {
        contain: layout style paint;
      }
      
      /* 移动端优化 */
      @media (max-width: 768px) {
        .virtual-scroll-container {
          -webkit-overflow-scrolling: touch;
          overscroll-behavior: contain;
        }
      }
    `;

    const styleSheet = document.createElement('style');
    styleSheet.textContent = styles;
    document.head.appendChild(styleSheet);
  }

  // ===== 销毁方法 =====
  destroyVirtualScroll(container) {
    const instance = this.instances.get(container);
    if (!instance) return;

    // 清理观察器
    if (instance.resizeObserver) {
      instance.resizeObserver.disconnect();
    }

    // 恢复原始内容
    this.restoreOriginalContent(instance);

    // 删除实例
    this.instances.delete(container);
  }

  restoreOriginalContent(instance) {
    const { container, isTable, originalRows, originalItems } = instance;
    
    container.innerHTML = '';
    
    if (isTable && originalRows) {
      const table = document.createElement('table');
      const tbody = document.createElement('tbody');
      originalRows.forEach(row => tbody.appendChild(row));
      table.appendChild(tbody);
      container.appendChild(table);
    } else if (originalItems) {
      originalItems.forEach(item => container.appendChild(item));
    }
  }

  destroy() {
    // 销毁所有实例
    this.instances.forEach((instance, container) => {
      this.destroyVirtualScroll(container);
    });
    
    this.instances.clear();
    this.heightCache.clear();
  }
}

// ===== 全局实例和便捷方法 =====
window.VirtualScrollManager = VirtualScrollManager;
window.virtualScrollManager = new VirtualScrollManager();

// 便捷方法
window.enableVirtualScroll = function(container, options) {
  return window.virtualScrollManager.initializeVirtualScroll(container, options);
};

window.scrollToIndex = function(container, index, options) {
  return window.virtualScrollManager.scrollToIndex(container, index, options);
};

window.updateVirtualScrollData = function(container, newData) {
  return window.virtualScrollManager.updateData(container, newData);
};

window.refreshVirtualScroll = function(container) {
  return window.virtualScrollManager.refreshVirtualScroll(container);
};

// ===== 自动初始化 =====
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    console.log('虚拟滚动管理器已启用，为容器添加 data-virtual-scroll 属性以启用虚拟滚动');
  });
} else {
  console.log('虚拟滚动管理器已启用，为容器添加 data-virtual-scroll 属性以启用虚拟滚动');
}

// ===== 导出 =====
if (typeof module !== 'undefined' && module.exports) {
  module.exports = VirtualScrollManager;
} 