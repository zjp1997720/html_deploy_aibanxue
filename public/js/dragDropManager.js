/**
 * 拖拽排序管理器
 * Phase 3: UI/UX优化 - 拖拽排序功能
 */

class DragDropManager {
  constructor(options = {}) {
    this.config = {
      enableTableSort: true,
      enableListSort: true,
      enableCardSort: true,
      enableFileUpload: true,
      dragThreshold: 5,
      snapBackDuration: 300,
      autoScroll: true,
      autoScrollSpeed: 10,
      autoScrollZone: 50,
      showDropZones: true,
      enableKeyboardSupport: true,
      ...options
    };

    this.draggedElement = null;
    this.draggedData = null;
    this.dropTarget = null;
    this.placeholder = null;
    this.ghostElement = null;
    this.sortableContainers = new Set();
    this.dragStartPosition = { x: 0, y: 0 };
    this.hasMoved = false;
    this.autoScrollTimer = null;

    this.init();
  }

  init() {
    this.setupEventListeners();
    this.initializeSortableElements();
    this.createDropZoneStyles();
  }

  // ===== 事件监听器设置 =====
  setupEventListeners() {
    document.addEventListener('dragstart', this.handleDragStart.bind(this));
    document.addEventListener('dragover', this.handleDragOver.bind(this));
    document.addEventListener('dragenter', this.handleDragEnter.bind(this));
    document.addEventListener('dragleave', this.handleDragLeave.bind(this));
    document.addEventListener('drop', this.handleDrop.bind(this));
    document.addEventListener('dragend', this.handleDragEnd.bind(this));

    // 文件拖拽上传
    if (this.config.enableFileUpload) {
      document.addEventListener('dragover', this.handleFileDragOver.bind(this));
      document.addEventListener('drop', this.handleFileDrop.bind(this));
    }

    // 键盘支持
    if (this.config.enableKeyboardSupport) {
      document.addEventListener('keydown', this.handleKeyDown.bind(this));
    }

    // 鼠标事件（用于移动端兼容）
    document.addEventListener('mousedown', this.handleMouseDown.bind(this));
  }

  // ===== 可排序元素初始化 =====
  initializeSortableElements() {
    if (this.config.enableTableSort) {
      this.initializeTableSorting();
    }
    
    if (this.config.enableListSort) {
      this.initializeListSorting();
    }
    
    if (this.config.enableCardSort) {
      this.initializeCardSorting();
    }

    // 自动检测新添加的可排序元素
    const observer = new MutationObserver(this.handleDOMChanges.bind(this));
    observer.observe(document.body, {
      childList: true,
      subtree: true
    });
  }

  initializeTableSorting() {
    document.querySelectorAll('table.sortable, .sortable-table').forEach(table => {
      this.makeSortable(table, 'table');
    });
  }

  initializeListSorting() {
    document.querySelectorAll('ul.sortable, ol.sortable, .sortable-list').forEach(list => {
      this.makeSortable(list, 'list');
    });
  }

  initializeCardSorting() {
    document.querySelectorAll('.sortable-cards, .card-container.sortable').forEach(container => {
      this.makeSortable(container, 'cards');
    });
  }

  makeSortable(container, type) {
    if (container.dataset.sortable === 'true') return;

    container.dataset.sortable = 'true';
    container.dataset.sortableType = type;
    this.sortableContainers.add(container);

    const items = this.getSortableItems(container, type);
    items.forEach(item => {
      this.makeItemDraggable(item, container, type);
    });
  }

  getSortableItems(container, type) {
    switch (type) {
      case 'table':
        return container.querySelectorAll('tbody tr');
      case 'list':
        return container.querySelectorAll('li');
      case 'cards':
        return container.querySelectorAll('.card, .sortable-item');
      default:
        return container.children;
    }
  }

  makeItemDraggable(item, container, type) {
    if (item.draggable) return;

    item.draggable = true;
    item.dataset.sortableItem = 'true';
    item.dataset.sortableType = type;
    
    // 添加拖拽手柄
    this.addDragHandle(item, type);
    
    // 添加视觉反馈样式
    item.classList.add('sortable-item');
  }

  addDragHandle(item, type) {
    let handle = item.querySelector('.drag-handle');
    if (handle) return;

    handle = document.createElement('div');
    handle.className = 'drag-handle';
    handle.innerHTML = '⋮⋮';
    handle.title = '拖拽排序';
    
    // 根据类型确定插入位置
    switch (type) {
      case 'table':
        const firstCell = item.querySelector('td');
        if (firstCell) {
          firstCell.insertBefore(handle, firstCell.firstChild);
        }
        break;
      case 'list':
        item.insertBefore(handle, item.firstChild);
        break;
      case 'cards':
        const header = item.querySelector('.card-header');
        if (header) {
          header.appendChild(handle);
        } else {
          item.insertBefore(handle, item.firstChild);
        }
        break;
    }
  }

  // ===== 拖拽事件处理 =====
  handleDragStart(e) {
    const item = e.target.closest('[data-sortable-item="true"]');
    if (!item) return;

    this.draggedElement = item;
    this.draggedData = this.extractItemData(item);
    this.hasMoved = false;

    // 创建幽灵元素
    this.createGhostElement(item);
    
    // 创建占位符
    this.createPlaceholder(item);
    
    // 设置拖拽数据
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/html', item.outerHTML);
    e.dataTransfer.setData('application/x-sortable', JSON.stringify(this.draggedData));

    // 添加拖拽样式
    item.classList.add('dragging');
    document.body.classList.add('dragging-active');

    // 延迟隐藏原元素，避免闪烁
    setTimeout(() => {
      if (this.draggedElement) {
        this.draggedElement.style.opacity = '0.3';
      }
    }, 0);
  }

  handleDragOver(e) {
    if (!this.draggedElement) return;

    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';

    const container = e.target.closest('[data-sortable="true"]');
    if (!container) return;

    const targetItem = this.findClosestSortableItem(e.target, container);
    if (!targetItem || targetItem === this.draggedElement) return;

    this.updatePlaceholderPosition(container, targetItem, e.clientY);
    
    // 自动滚动
    if (this.config.autoScroll) {
      this.handleAutoScroll(e);
    }
  }

  handleDragEnter(e) {
    if (!this.draggedElement) return;
    
    const container = e.target.closest('[data-sortable="true"]');
    if (container) {
      container.classList.add('drag-over');
    }
  }

  handleDragLeave(e) {
    if (!this.draggedElement) return;
    
    const container = e.target.closest('[data-sortable="true"]');
    if (container && !container.contains(e.relatedTarget)) {
      container.classList.remove('drag-over');
    }
  }

  handleDrop(e) {
    if (!this.draggedElement) return;

    e.preventDefault();
    
    const container = e.target.closest('[data-sortable="true"]');
    if (!container) {
      this.revertDrag();
      return;
    }

    const newPosition = this.calculateNewPosition(container);
    const oldPosition = this.getElementPosition(this.draggedElement);

    if (newPosition !== oldPosition) {
      this.performSort(container, oldPosition, newPosition);
      this.triggerSortEvent(container, oldPosition, newPosition);
    }

    this.cleanupDrag();
  }

  handleDragEnd(e) {
    this.cleanupDrag();
  }

  // ===== 拖拽辅助方法 =====
  extractItemData(item) {
    return {
      id: item.id || `item-${Date.now()}`,
      dataset: { ...item.dataset },
      text: item.textContent.trim(),
      html: item.innerHTML
    };
  }

  createGhostElement(item) {
    this.ghostElement = item.cloneNode(true);
    this.ghostElement.style.cssText = `
      position: absolute;
      top: -1000px;
      left: -1000px;
      opacity: 0.8;
      transform: rotate(3deg);
      z-index: 9999;
      pointer-events: none;
      box-shadow: 0 8px 24px rgba(0, 0, 0, 0.2);
    `;
    document.body.appendChild(this.ghostElement);
  }

  createPlaceholder(item) {
    this.placeholder = document.createElement('div');
    this.placeholder.className = 'sortable-placeholder';
    this.placeholder.style.cssText = `
      height: ${item.offsetHeight}px;
      border: 2px dashed #0066cc;
      border-radius: 4px;
      background: rgba(0, 102, 204, 0.1);
      margin: 2px 0;
      position: relative;
      opacity: 0;
      transition: all 0.2s ease;
    `;
    
    // 添加占位符提示
    const hint = document.createElement('div');
    hint.textContent = '在此释放';
    hint.style.cssText = `
      position: absolute;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      color: #0066cc;
      font-size: 14px;
      pointer-events: none;
    `;
    this.placeholder.appendChild(hint);
    
    item.parentNode.insertBefore(this.placeholder, item.nextSibling);
    
    // 延迟显示，添加动画效果
    setTimeout(() => {
      if (this.placeholder) {
        this.placeholder.style.opacity = '1';
      }
    }, 100);
  }

  findClosestSortableItem(target, container) {
    let current = target;
    while (current && current !== container) {
      if (current.dataset.sortableItem === 'true') {
        return current;
      }
      current = current.parentElement;
    }
    return null;
  }

  updatePlaceholderPosition(container, targetItem, clientY) {
    if (!this.placeholder || !targetItem) return;

    const rect = targetItem.getBoundingClientRect();
    const midpoint = rect.top + rect.height / 2;
    
    if (clientY < midpoint) {
      // 插入到目标元素之前
      targetItem.parentNode.insertBefore(this.placeholder, targetItem);
    } else {
      // 插入到目标元素之后
      targetItem.parentNode.insertBefore(this.placeholder, targetItem.nextSibling);
    }
  }

  calculateNewPosition(container) {
    if (!this.placeholder) return -1;

    const items = this.getSortableItems(container, container.dataset.sortableType);
    const placeholderParent = this.placeholder.parentNode;
    
    let position = 0;
    for (let child of placeholderParent.children) {
      if (child === this.placeholder) {
        break;
      }
      if (child.dataset.sortableItem === 'true' && child !== this.draggedElement) {
        position++;
      }
    }
    
    return position;
  }

  getElementPosition(element) {
    const parent = element.parentNode;
    const siblings = Array.from(parent.children).filter(
      child => child.dataset.sortableItem === 'true'
    );
    return siblings.indexOf(element);
  }

  performSort(container, oldPosition, newPosition) {
    const items = this.getSortableItems(container, container.dataset.sortableType);
    const itemsArray = Array.from(items);
    
    // 移除拖拽元素
    const draggedItem = itemsArray.splice(oldPosition, 1)[0];
    
    // 插入到新位置
    itemsArray.splice(newPosition, 0, draggedItem);
    
    // 重新排列DOM
    const fragment = document.createDocumentFragment();
    itemsArray.forEach(item => {
      fragment.appendChild(item);
    });
    
    const parent = container.querySelector('tbody') || container;
    parent.appendChild(fragment);
  }

  triggerSortEvent(container, oldPosition, newPosition) {
    const sortEvent = new CustomEvent('sortupdate', {
      detail: {
        container,
        item: this.draggedElement,
        oldPosition,
        newPosition,
        data: this.draggedData
      }
    });
    container.dispatchEvent(sortEvent);
  }

  // ===== 自动滚动 =====
  handleAutoScroll(e) {
    if (this.autoScrollTimer) {
      clearTimeout(this.autoScrollTimer);
    }

    const { clientY } = e;
    const { innerHeight } = window;
    const scrollZone = this.config.autoScrollZone;
    const scrollSpeed = this.config.autoScrollSpeed;

    let scrollDirection = 0;
    
    if (clientY < scrollZone) {
      scrollDirection = -1;
    } else if (clientY > innerHeight - scrollZone) {
      scrollDirection = 1;
    }

    if (scrollDirection !== 0) {
      this.autoScrollTimer = setTimeout(() => {
        window.scrollBy(0, scrollDirection * scrollSpeed);
        this.handleAutoScroll(e);
      }, 16);
    }
  }

  // ===== 清理方法 =====
  cleanupDrag() {
    if (this.draggedElement) {
      this.draggedElement.classList.remove('dragging');
      this.draggedElement.style.opacity = '';
      this.draggedElement = null;
    }

    if (this.placeholder) {
      this.placeholder.remove();
      this.placeholder = null;
    }

    if (this.ghostElement) {
      this.ghostElement.remove();
      this.ghostElement = null;
    }

    if (this.autoScrollTimer) {
      clearTimeout(this.autoScrollTimer);
      this.autoScrollTimer = null;
    }

    document.body.classList.remove('dragging-active');
    document.querySelectorAll('.drag-over').forEach(el => {
      el.classList.remove('drag-over');
    });

    this.draggedData = null;
    this.dropTarget = null;
    this.hasMoved = false;
  }

  revertDrag() {
    if (this.draggedElement) {
      // 添加回弹动画
      this.draggedElement.style.transition = `transform ${this.config.snapBackDuration}ms ease-out`;
      this.draggedElement.style.transform = 'scale(1.05)';
      
      setTimeout(() => {
        if (this.draggedElement) {
          this.draggedElement.style.transform = '';
          this.draggedElement.style.transition = '';
        }
      }, this.config.snapBackDuration);
    }
    this.cleanupDrag();
  }

  // ===== 文件拖拽上传 =====
  handleFileDragOver(e) {
    if (!this.config.enableFileUpload) return;
    
    const files = e.dataTransfer.files;
    if (files.length > 0) {
      e.preventDefault();
      e.dataTransfer.dropEffect = 'copy';
      
      const dropZone = e.target.closest('.file-drop-zone, .upload-area');
      if (dropZone) {
        dropZone.classList.add('drag-over');
      }
    }
  }

  handleFileDrop(e) {
    if (!this.config.enableFileUpload) return;
    
    const files = e.dataTransfer.files;
    if (files.length > 0) {
      e.preventDefault();
      
      const dropZone = e.target.closest('.file-drop-zone, .upload-area');
      if (dropZone) {
        dropZone.classList.remove('drag-over');
        this.handleFileUpload(files, dropZone);
      }
    }
  }

  handleFileUpload(files, dropZone) {
    const uploadEvent = new CustomEvent('fileupload', {
      detail: { files, dropZone }
    });
    dropZone.dispatchEvent(uploadEvent);
  }

  // ===== 键盘支持 =====
  handleKeyDown(e) {
    if (!this.config.enableKeyboardSupport) return;

    const focusedItem = document.querySelector('.sortable-item:focus');
    if (!focusedItem) return;

    switch (e.key) {
      case 'ArrowUp':
        e.preventDefault();
        this.moveItemUp(focusedItem);
        break;
      case 'ArrowDown':
        e.preventDefault();
        this.moveItemDown(focusedItem);
        break;
      case ' ':
      case 'Enter':
        e.preventDefault();
        this.toggleItemSelection(focusedItem);
        break;
    }
  }

  moveItemUp(item) {
    const prevSibling = item.previousElementSibling;
    if (prevSibling && prevSibling.dataset.sortableItem === 'true') {
      item.parentNode.insertBefore(item, prevSibling);
      this.triggerKeyboardSortEvent(item, 'up');
    }
  }

  moveItemDown(item) {
    const nextSibling = item.nextElementSibling;
    if (nextSibling && nextSibling.dataset.sortableItem === 'true') {
      item.parentNode.insertBefore(nextSibling, item);
      this.triggerKeyboardSortEvent(item, 'down');
    }
  }

  toggleItemSelection(item) {
    item.classList.toggle('selected');
  }

  triggerKeyboardSortEvent(item, direction) {
    const container = item.closest('[data-sortable="true"]');
    if (container) {
      const keyboardSortEvent = new CustomEvent('keyboardsort', {
        detail: { item, direction, container }
      });
      container.dispatchEvent(keyboardSortEvent);
    }
  }

  // ===== 鼠标事件处理（移动端支持） =====
  handleMouseDown(e) {
    const handle = e.target.closest('.drag-handle');
    if (!handle) return;

    this.dragStartPosition.x = e.clientX;
    this.dragStartPosition.y = e.clientY;
    this.hasMoved = false;

    const item = handle.closest('[data-sortable-item="true"]');
    if (item) {
      const mouseMoveHandler = (moveEvent) => {
        const deltaX = moveEvent.clientX - this.dragStartPosition.x;
        const deltaY = moveEvent.clientY - this.dragStartPosition.y;
        const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);

        if (distance > this.config.dragThreshold && !this.hasMoved) {
          this.hasMoved = true;
          // 触发拖拽开始
          const dragStartEvent = new DragEvent('dragstart', {
            bubbles: true,
            cancelable: true
          });
          item.dispatchEvent(dragStartEvent);
        }
      };

      const mouseUpHandler = () => {
        document.removeEventListener('mousemove', mouseMoveHandler);
        document.removeEventListener('mouseup', mouseUpHandler);
      };

      document.addEventListener('mousemove', mouseMoveHandler);
      document.addEventListener('mouseup', mouseUpHandler);
    }
  }

  // ===== DOM变化处理 =====
  handleDOMChanges(mutations) {
    mutations.forEach(mutation => {
      mutation.addedNodes.forEach(node => {
        if (node.nodeType === Node.ELEMENT_NODE) {
          this.checkForNewSortableElements(node);
        }
      });
    });
  }

  checkForNewSortableElements(element) {
    // 检查新添加的可排序容器
    if (element.matches && (
      element.matches('table.sortable, .sortable-table') ||
      element.matches('ul.sortable, ol.sortable, .sortable-list') ||
      element.matches('.sortable-cards, .card-container.sortable')
    )) {
      const type = element.matches('table.sortable, .sortable-table') ? 'table' :
                   element.matches('ul.sortable, ol.sortable, .sortable-list') ? 'list' : 'cards';
      this.makeSortable(element, type);
    }

    // 检查容器内的新添加元素
    const sortableContainer = element.closest('[data-sortable="true"]');
    if (sortableContainer) {
      const type = sortableContainer.dataset.sortableType;
      const newItems = this.getSortableItems(element, type);
      newItems.forEach(item => {
        this.makeItemDraggable(item, sortableContainer, type);
      });
    }
  }

  // ===== 样式创建 =====
  createDropZoneStyles() {
    if (!this.config.showDropZones) return;

    const styles = `
      .sortable-item {
        position: relative;
        transition: all 0.2s ease;
        cursor: move;
      }

      .sortable-item:hover {
        background-color: rgba(0, 102, 204, 0.05);
      }

      .sortable-item.dragging {
        opacity: 0.5;
        transform: rotate(2deg);
        z-index: 1000;
      }

      .sortable-item.selected {
        background-color: rgba(0, 102, 204, 0.1);
        border-left: 3px solid #0066cc;
      }

      .drag-handle {
        position: absolute;
        left: 8px;
        top: 50%;
        transform: translateY(-50%);
        color: #999;
        cursor: grab;
        padding: 4px;
        border-radius: 2px;
        opacity: 0;
        transition: opacity 0.2s ease;
        user-select: none;
        font-size: 12px;
        line-height: 1;
      }

      .sortable-item:hover .drag-handle {
        opacity: 1;
      }

      .drag-handle:hover {
        background-color: rgba(0, 0, 0, 0.1);
        color: #666;
      }

      .drag-handle:active {
        cursor: grabbing;
      }

      .dragging-active .sortable-item:not(.dragging) {
        transition: transform 0.2s ease;
      }

      .drag-over {
        background-color: rgba(0, 102, 204, 0.05);
      }

      .sortable-placeholder {
        border: 2px dashed #0066cc;
        border-radius: 4px;
        background: rgba(0, 102, 204, 0.1);
        text-align: center;
        color: #0066cc;
        font-size: 14px;
        padding: 8px;
        margin: 2px 0;
      }

      .file-drop-zone.drag-over,
      .upload-area.drag-over {
        border-color: #0066cc;
        background-color: rgba(0, 102, 204, 0.1);
      }

      /* 表格行拖拽样式 */
      .sortable-table .sortable-item td:first-child {
        padding-left: 40px;
        position: relative;
      }

      /* 列表项拖拽样式 */
      .sortable-list .sortable-item {
        padding-left: 32px;
      }

      /* 卡片拖拽样式 */
      .sortable-cards .sortable-item {
        margin-bottom: 16px;
        border-radius: 8px;
        box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
      }

      .sortable-cards .sortable-item .drag-handle {
        position: absolute;
        top: 8px;
        right: 8px;
        left: auto;
        transform: none;
      }

      /* 键盘导航样式 */
      .sortable-item:focus {
        outline: 2px solid #0066cc;
        outline-offset: 2px;
      }

      /* 移动端优化 */
      @media (max-width: 768px) {
        .drag-handle {
          opacity: 1;
          font-size: 16px;
          padding: 8px;
        }

        .sortable-item {
          padding: 12px;
        }
      }

      /* 动画优化 */
      @media (prefers-reduced-motion: reduce) {
        .sortable-item,
        .sortable-placeholder,
        .drag-handle {
          transition: none !important;
        }
      }
    `;

    const styleSheet = document.createElement('style');
    styleSheet.textContent = styles;
    document.head.appendChild(styleSheet);
  }

  // ===== 公共API =====
  addSortableContainer(container, type = 'list') {
    this.makeSortable(container, type);
  }

  removeSortableContainer(container) {
    container.dataset.sortable = 'false';
    this.sortableContainers.delete(container);
    
    const items = container.querySelectorAll('[data-sortable-item="true"]');
    items.forEach(item => {
      item.draggable = false;
      item.dataset.sortableItem = 'false';
      const handle = item.querySelector('.drag-handle');
      if (handle) handle.remove();
    });
  }

  getSortOrder(container) {
    const items = this.getSortableItems(container, container.dataset.sortableType);
    return Array.from(items).map(item => ({
      id: item.id,
      data: this.extractItemData(item)
    }));
  }

  setSortOrder(container, order) {
    const type = container.dataset.sortableType;
    const items = this.getSortableItems(container, type);
    const itemsMap = new Map();
    
    items.forEach(item => {
      itemsMap.set(item.id, item);
    });

    const fragment = document.createDocumentFragment();
    order.forEach(({ id }) => {
      const item = itemsMap.get(id);
      if (item) {
        fragment.appendChild(item);
      }
    });

    const parent = container.querySelector('tbody') || container;
    parent.appendChild(fragment);
  }

  // ===== 清理方法 =====
  destroy() {
    document.removeEventListener('dragstart', this.handleDragStart);
    document.removeEventListener('dragover', this.handleDragOver);
    document.removeEventListener('dragenter', this.handleDragEnter);
    document.removeEventListener('dragleave', this.handleDragLeave);
    document.removeEventListener('drop', this.handleDrop);
    document.removeEventListener('dragend', this.handleDragEnd);
    document.removeEventListener('keydown', this.handleKeyDown);
    document.removeEventListener('mousedown', this.handleMouseDown);

    this.sortableContainers.forEach(container => {
      this.removeSortableContainer(container);
    });

    this.cleanupDrag();
    this.sortableContainers.clear();
  }
}

// ===== 全局实例和便捷方法 =====
window.DragDropManager = DragDropManager;
window.dragDropManager = new DragDropManager();

// 便捷方法
window.makeSortable = function(container, type = 'list') {
  return window.dragDropManager.addSortableContainer(container, type);
};

window.getSortOrder = function(container) {
  return window.dragDropManager.getSortOrder(container);
};

window.setSortOrder = function(container, order) {
  return window.dragDropManager.setSortOrder(container, order);
};

// ===== 自动初始化 =====
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    console.log('拖拽排序功能已启用');
  });
} else {
  console.log('拖拽排序功能已启用');
}

// ===== 导出 =====
if (typeof module !== 'undefined' && module.exports) {
  module.exports = DragDropManager;
} 