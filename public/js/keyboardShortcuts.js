/**
 * 键盘快捷键管理器
 * Phase 3: UI/UX优化 - 键盘快捷键支持
 */

class KeyboardShortcuts {
  constructor(options = {}) {
    this.config = {
      enableGlobalShortcuts: true,
      enableModalShortcuts: true,
      enableFormShortcuts: true,
      enableNavigationShortcuts: true,
      showHelpOnStart: false,
      preventDefaultBehavior: true,
      ...options
    };

    this.shortcuts = new Map();
    this.contextualShortcuts = new Map();
    this.activeContext = 'global';
    this.helpVisible = false;
    this.pressedKeys = new Set();
    this.keySequence = [];
    this.sequenceTimeout = null;

    this.init();
  }

  init() {
    this.setupEventListeners();
    this.registerDefaultShortcuts();
    this.createHelpOverlay();
    
    if (this.config.showHelpOnStart) {
      this.showHelp();
    }
  }

  // ===== 事件监听 =====
  setupEventListeners() {
    document.addEventListener('keydown', this.handleKeyDown.bind(this));
    document.addEventListener('keyup', this.handleKeyUp.bind(this));
    document.addEventListener('blur', this.handleBlur.bind(this));
    
    // 监听焦点变化以切换上下文
    document.addEventListener('focusin', this.handleFocusIn.bind(this));
    document.addEventListener('focusout', this.handleFocusOut.bind(this));
  }

  handleKeyDown(e) {
    this.pressedKeys.add(e.code);
    
    // 构建快捷键字符串
    const shortcutKey = this.buildShortcutKey(e);
    
    // 记录按键序列
    this.recordKeySequence(e.key);
    
    // 查找并执行快捷键
    const result = this.findAndExecuteShortcut(shortcutKey, e);
    
    if (result && this.config.preventDefaultBehavior) {
      e.preventDefault();
      e.stopPropagation();
    }
  }

  handleKeyUp(e) {
    this.pressedKeys.delete(e.code);
  }

  handleBlur(e) {
    this.pressedKeys.clear();
  }

  handleFocusIn(e) {
    const context = this.determineContext(e.target);
    this.setContext(context);
  }

  handleFocusOut(e) {
    // 延迟重置上下文，以防快速焦点变化
    setTimeout(() => {
      if (!document.activeElement || document.activeElement === document.body) {
        this.setContext('global');
      }
    }, 100);
  }

  // ===== 快捷键构建和匹配 =====
  buildShortcutKey(e) {
    const modifiers = [];
    
    if (e.ctrlKey || e.metaKey) modifiers.push('cmd');
    if (e.altKey) modifiers.push('alt');
    if (e.shiftKey) modifiers.push('shift');
    
    const key = e.key.toLowerCase();
    
    return modifiers.length > 0 ? `${modifiers.join('+)}+${key}` : key;
  }

  recordKeySequence(key) {
    this.keySequence.push(key.toLowerCase());
    
    // 限制序列长度
    if (this.keySequence.length > 3) {
      this.keySequence.shift();
    }
    
    // 重置序列超时
    if (this.sequenceTimeout) {
      clearTimeout(this.sequenceTimeout);
    }
    
    this.sequenceTimeout = setTimeout(() => {
      this.keySequence = [];
    }, 1000);
  }

  findAndExecuteShortcut(shortcutKey, originalEvent) {
    // 首先查找上下文相关的快捷键
    const contextShortcuts = this.contextualShortcuts.get(this.activeContext);
    if (contextShortcuts && contextShortcuts.has(shortcutKey)) {
      const shortcut = contextShortcuts.get(shortcutKey);
      return this.executeShortcut(shortcut, originalEvent);
    }

    // 然后查找全局快捷键
    if (this.shortcuts.has(shortcutKey)) {
      const shortcut = this.shortcuts.get(shortcutKey);
      return this.executeShortcut(shortcut, originalEvent);
    }

    // 检查键盘序列
    const sequence = this.keySequence.join(' ');
    if (this.shortcuts.has(sequence)) {
      const shortcut = this.shortcuts.get(sequence);
      this.keySequence = []; // 清空序列
      return this.executeShortcut(shortcut, originalEvent);
    }

    return false;
  }

  executeShortcut(shortcut, originalEvent) {
    if (typeof shortcut.condition === 'function' && !shortcut.condition()) {
      return false;
    }

    if (typeof shortcut.action === 'function') {
      shortcut.action(originalEvent);
      
      // 显示快捷键提示
      if (shortcut.description) {
        this.showShortcutFeedback(shortcut.description);
      }
      
      return true;
    }

    return false;
  }

  // ===== 上下文管理 =====
  determineContext(element) {
    if (!element) return 'global';

    // 检查特定元素类型
    if (element.tagName === 'INPUT' || element.tagName === 'TEXTAREA') {
      return 'form';
    }

    if (element.closest('.modal')) {
      return 'modal';
    }

    if (element.closest('table')) {
      return 'table';
    }

    if (element.closest('.search-container, .search-box')) {
      return 'search';
    }

    if (element.closest('.code-editor, .editor')) {
      return 'editor';
    }

    return 'global';
  }

  setContext(context) {
    this.activeContext = context;
    this.updateHelpDisplay();
  }

  // ===== 快捷键注册 =====
  register(key, action, options = {}) {
    const shortcut = {
      key,
      action,
      description: options.description || '',
      condition: options.condition || null,
      context: options.context || 'global'
    };

    if (shortcut.context === 'global') {
      this.shortcuts.set(key, shortcut);
    } else {
      if (!this.contextualShortcuts.has(shortcut.context)) {
        this.contextualShortcuts.set(shortcut.context, new Map());
      }
      this.contextualShortcuts.get(shortcut.context).set(key, shortcut);
    }

    return this;
  }

  unregister(key, context = 'global') {
    if (context === 'global') {
      return this.shortcuts.delete(key);
    } else {
      const contextShortcuts = this.contextualShortcuts.get(context);
      return contextShortcuts ? contextShortcuts.delete(key) : false;
    }
  }

  // ===== 默认快捷键 =====
  registerDefaultShortcuts() {
    // ===== 全局快捷键 =====
    this.register('cmd+k', () => this.focusSearch(), {
      description: '快速搜索'
    });

    this.register('cmd+/', () => this.toggleHelp(), {
      description: '显示/隐藏帮助'
    });

    this.register('escape', () => this.handleEscape(), {
      description: '取消/关闭'
    });

    this.register('cmd+shift+d', () => this.toggleDarkMode(), {
      description: '切换深色模式'
    });

    this.register('cmd+r', (e) => this.handleRefresh(e), {
      description: '刷新页面'
    });

    // ===== 导航快捷键 =====
    this.register('g h', () => this.navigateTo('/'), {
      description: '回到首页'
    });

    this.register('g d', () => this.navigateTo('/admin/dashboard'), {
      description: '进入控制台'
    });

    this.register('g p', () => this.navigateTo('/admin/pages'), {
      description: '页面管理'
    });

    this.register('g k', () => this.navigateTo('/admin/apikeys'), {
      description: 'API密钥管理'
    });

    // ===== 操作快捷键 =====
    this.register('cmd+n', () => this.createNew(), {
      description: '新建'
    });

    this.register('cmd+s', (e) => this.save(e), {
      description: '保存'
    });

    this.register('cmd+enter', () => this.submit(), {
      description: '提交表单'
    });

    // ===== 表格快捷键 =====
    this.register('j', () => this.navigateTable('down'), {
      description: '下一行',
      context: 'table'
    });

    this.register('k', () => this.navigateTable('up'), {
      description: '上一行',
      context: 'table'
    });

    this.register('enter', () => this.activateTableRow(), {
      description: '选择/激活行',
      context: 'table'
    });

    this.register('d', () => this.deleteTableRow(), {
      description: '删除行',
      context: 'table'
    });

    // ===== 模态框快捷键 =====
    this.register('escape', () => this.closeModal(), {
      description: '关闭模态框',
      context: 'modal'
    });

    this.register('cmd+enter', () => this.confirmModal(), {
      description: '确认操作',
      context: 'modal'
    });

    // ===== 表单快捷键 =====
    this.register('cmd+enter', () => this.submitForm(), {
      description: '提交表单',
      context: 'form'
    });

    this.register('escape', () => this.cancelForm(), {
      description: '取消编辑',
      context: 'form'
    });

    // ===== 搜索快捷键 =====
    this.register('escape', () => this.clearSearch(), {
      description: '清空搜索',
      context: 'search'
    });

    this.register('cmd+a', () => this.selectAllResults(), {
      description: '选择所有结果',
      context: 'search'
    });
  }

  // ===== 快捷键实现 =====
  focusSearch() {
    const searchInput = document.querySelector('input[type="search"], .search-input, #search');
    if (searchInput) {
      searchInput.focus();
      searchInput.select();
    } else {
      this.showShortcutFeedback('未找到搜索框');
    }
  }

  toggleHelp() {
    if (this.helpVisible) {
      this.hideHelp();
    } else {
      this.showHelp();
    }
  }

  handleEscape() {
    // 优先级：模态框 > 搜索 > 选择 > 其他
    if (this.closeModal()) return;
    if (this.clearSearch()) return;
    if (this.clearSelections()) return;
    if (this.helpVisible) {
      this.hideHelp();
    }
  }

  toggleDarkMode() {
    document.body.classList.toggle('dark-mode');
    const isDark = document.body.classList.contains('dark-mode');
    localStorage.setItem('dark-mode', isDark);
    this.showShortcutFeedback(`${isDark ? '启用' : '关闭'}深色模式`);
  }

  handleRefresh(e) {
    // 如果在表格或列表页面，刷新数据而不是整个页面
    const refreshBtn = document.querySelector('.refresh-btn, [data-action="refresh"]');
    if (refreshBtn) {
      e.preventDefault();
      refreshBtn.click();
      this.showShortcutFeedback('数据已刷新');
    }
  }

  navigateTo(path) {
    if (window.location.pathname !== path) {
      window.location.href = path;
    } else {
      this.showShortcutFeedback('已在当前页面');
    }
  }

  createNew() {
    const newBtn = document.querySelector('.btn-primary, .create-btn, [data-action="create"], .btn-new');
    if (newBtn) {
      newBtn.click();
    } else {
      this.showShortcutFeedback('未找到新建按钮');
    }
  }

  save(e) {
    const saveBtn = document.querySelector('.btn-save, [data-action="save"], .save-btn');
    if (saveBtn && !saveBtn.disabled) {
      e.preventDefault();
      saveBtn.click();
      this.showShortcutFeedback('已保存');
    }
  }

  submit() {
    const form = document.querySelector('form');
    if (form) {
      const submitBtn = form.querySelector('button[type="submit"], .btn-submit');
      if (submitBtn && !submitBtn.disabled) {
        submitBtn.click();
      } else {
        form.submit();
      }
    }
  }

  // ===== 表格导航 =====
  navigateTable(direction) {
    const activeRow = document.querySelector('tr.active, tr.selected');
    const table = document.querySelector('table tbody');
    
    if (!table) return;

    const rows = Array.from(table.querySelectorAll('tr:not(.hidden)'));
    let targetIndex = 0;

    if (activeRow) {
      const currentIndex = rows.indexOf(activeRow);
      if (direction === 'down') {
        targetIndex = Math.min(currentIndex + 1, rows.length - 1);
      } else {
        targetIndex = Math.max(currentIndex - 1, 0);
      }
      activeRow.classList.remove('active', 'selected');
    }

    if (rows[targetIndex]) {
      rows[targetIndex].classList.add('active');
      rows[targetIndex].scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
  }

  activateTableRow() {
    const activeRow = document.querySelector('tr.active');
    if (activeRow) {
      const link = activeRow.querySelector('a');
      const button = activeRow.querySelector('button:not(.btn-delete)');
      
      if (link) {
        link.click();
      } else if (button) {
        button.click();
      }
    }
  }

  deleteTableRow() {
    const activeRow = document.querySelector('tr.active');
    if (activeRow) {
      const deleteBtn = activeRow.querySelector('.btn-delete, .delete-btn, [data-action="delete"]');
      if (deleteBtn) {
        deleteBtn.click();
      }
    }
  }

  // ===== 模态框操作 =====
  closeModal() {
    const modal = document.querySelector('.modal.show, .modal:not(.hidden)');
    if (modal) {
      const closeBtn = modal.querySelector('.modal-close, .btn-close, [data-dismiss="modal"]');
      if (closeBtn) {
        closeBtn.click();
        return true;
      }
    }
    return false;
  }

  confirmModal() {
    const modal = document.querySelector('.modal.show, .modal:not(.hidden)');
    if (modal) {
      const confirmBtn = modal.querySelector('.btn-primary, .btn-confirm, .btn-ok');
      if (confirmBtn && !confirmBtn.disabled) {
        confirmBtn.click();
      }
    }
  }

  // ===== 表单操作 =====
  submitForm() {
    const activeForm = document.activeElement?.closest('form');
    if (activeForm) {
      const submitBtn = activeForm.querySelector('button[type="submit"], .btn-submit');
      if (submitBtn && !submitBtn.disabled) {
        submitBtn.click();
      }
    }
  }

  cancelForm() {
    const activeForm = document.activeElement?.closest('form');
    if (activeForm) {
      const cancelBtn = activeForm.querySelector('.btn-cancel, [data-action="cancel"]');
      if (cancelBtn) {
        cancelBtn.click();
      } else {
        // 重置表单
        activeForm.reset();
        this.showShortcutFeedback('表单已重置');
      }
    }
  }

  // ===== 搜索操作 =====
  clearSearch() {
    const searchInput = document.querySelector('input[type="search"], .search-input');
    if (searchInput && searchInput.value) {
      searchInput.value = '';
      searchInput.dispatchEvent(new Event('input', { bubbles: true }));
      this.showShortcutFeedback('搜索已清空');
      return true;
    }
    return false;
  }

  selectAllResults() {
    const checkboxes = document.querySelectorAll('.search-results input[type="checkbox"], .results input[type="checkbox"]');
    if (checkboxes.length > 0) {
      checkboxes.forEach(cb => cb.checked = true);
      this.showShortcutFeedback(`已选择 ${checkboxes.length} 项`);
    }
  }

  clearSelections() {
    const selected = document.querySelectorAll('.selected, .active');
    if (selected.length > 0) {
      selected.forEach(el => el.classList.remove('selected', 'active'));
      this.showShortcutFeedback('已清除选择');
      return true;
    }
    return false;
  }

  // ===== 帮助系统 =====
  createHelpOverlay() {
    const helpOverlay = document.createElement('div');
    helpOverlay.id = 'keyboard-shortcuts-help';
    helpOverlay.className = 'keyboard-shortcuts-help';
    helpOverlay.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background: rgba(0, 0, 0, 0.8);
      z-index: 10000;
      display: none;
      align-items: center;
      justify-content: center;
      padding: 20px;
      box-sizing: border-box;
    `;

    const helpContent = document.createElement('div');
    helpContent.className = 'help-content';
    helpContent.style.cssText = `
      background: white;
      border-radius: 12px;
      padding: 24px;
      max-width: 800px;
      max-height: 80vh;
      overflow-y: auto;
      box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
    `;

    helpContent.innerHTML = this.generateHelpContent();
    helpOverlay.appendChild(helpContent);
    document.body.appendChild(helpOverlay);

    // 点击背景关闭
    helpOverlay.addEventListener('click', (e) => {
      if (e.target === helpOverlay) {
        this.hideHelp();
      }
    });
  }

  generateHelpContent() {
    const shortcuts = this.getAllShortcuts();
    let html = `
      <div class="help-header">
        <h2>键盘快捷键</h2>
        <button class="btn-close" onclick="window.keyboardShortcuts.hideHelp()">&times;</button>
      </div>
      <div class="help-body">
    `;

    const groupedShortcuts = this.groupShortcutsByCategory(shortcuts);
    
    Object.entries(groupedShortcuts).forEach(([category, shortcuts]) => {
      html += `<div class="shortcut-category">`;
      html += `<h3>${this.getCategoryName(category)}</h3>`;
      html += `<div class="shortcut-list">`;
      
      shortcuts.forEach(shortcut => {
        html += `
          <div class="shortcut-item">
            <div class="shortcut-key">${this.formatShortcutKey(shortcut.key)}</div>
            <div class="shortcut-description">${shortcut.description}</div>
          </div>
        `;
      });
      
      html += `</div></div>`;
    });

    html += `
      </div>
      <div class="help-footer">
        <p>按 <kbd>Cmd/Ctrl + /</kbd> 可随时显示或隐藏此帮助</p>
      </div>
    `;

    return html;
  }

  getAllShortcuts() {
    const all = [];
    
    // 全局快捷键
    this.shortcuts.forEach((shortcut, key) => {
      all.push({ ...shortcut, key, context: 'global' });
    });
    
    // 上下文快捷键
    this.contextualShortcuts.forEach((contextShortcuts, context) => {
      contextShortcuts.forEach((shortcut, key) => {
        all.push({ ...shortcut, key, context });
      });
    });
    
    return all.filter(s => s.description);
  }

  groupShortcutsByCategory(shortcuts) {
    const groups = {
      global: [],
      navigation: [],
      form: [],
      table: [],
      modal: [],
      search: []
    };

    shortcuts.forEach(shortcut => {
      const category = shortcut.context === 'global' ? 'global' : shortcut.context;
      if (groups[category]) {
        groups[category].push(shortcut);
      }
    });

    return groups;
  }

  getCategoryName(category) {
    const names = {
      global: '全局快捷键',
      navigation: '导航',
      form: '表单操作',
      table: '表格操作',
      modal: '模态框',
      search: '搜索'
    };
    return names[category] || category;
  }

  formatShortcutKey(key) {
    return key
      .replace(/cmd/g, '⌘')
      .replace(/ctrl/g, 'Ctrl')
      .replace(/alt/g, 'Alt')
      .replace(/shift/g, 'Shift')
      .replace(/\+/g, ' + ')
      .split(' ')
      .map(k => k.trim() ? `<kbd>${k.trim()}</kbd>` : ' ')
      .join('');
  }

  showHelp() {
    const helpOverlay = document.getElementById('keyboard-shortcuts-help');
    if (helpOverlay) {
      helpOverlay.style.display = 'flex';
      this.helpVisible = true;
      this.updateHelpDisplay();
    }
  }

  hideHelp() {
    const helpOverlay = document.getElementById('keyboard-shortcuts-help');
    if (helpOverlay) {
      helpOverlay.style.display = 'none';
      this.helpVisible = false;
    }
  }

  updateHelpDisplay() {
    const helpContent = document.querySelector('.help-content');
    if (helpContent && this.helpVisible) {
      helpContent.innerHTML = this.generateHelpContent();
    }
  }

  // ===== 反馈系统 =====
  showShortcutFeedback(message, duration = 1500) {
    // 移除已存在的反馈
    const existing = document.querySelector('.shortcut-feedback');
    if (existing) {
      existing.remove();
    }

    const feedback = document.createElement('div');
    feedback.className = 'shortcut-feedback';
    feedback.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      background: rgba(0, 0, 0, 0.8);
      color: white;
      padding: 12px 16px;
      border-radius: 6px;
      font-size: 14px;
      z-index: 9999;
      opacity: 0;
      transform: translateY(-10px);
      transition: all 0.3s ease;
      pointer-events: none;
    `;
    feedback.textContent = message;

    document.body.appendChild(feedback);

    // 动画显示
    requestAnimationFrame(() => {
      feedback.style.opacity = '1';
      feedback.style.transform = 'translateY(0)';
    });

    // 自动隐藏
    setTimeout(() => {
      feedback.style.opacity = '0';
      feedback.style.transform = 'translateY(-10px)';
      setTimeout(() => {
        feedback.remove();
      }, 300);
    }, duration);
  }

  // ===== 工具方法 =====
  isInputFocused() {
    const active = document.activeElement;
    return active && (
      active.tagName === 'INPUT' ||
      active.tagName === 'TEXTAREA' ||
      active.tagName === 'SELECT' ||
      active.contentEditable === 'true'
    );
  }

  isModalOpen() {
    return !!document.querySelector('.modal.show, .modal:not(.hidden)');
  }

  // ===== 清理方法 =====
  destroy() {
    document.removeEventListener('keydown', this.handleKeyDown);
    document.removeEventListener('keyup', this.handleKeyUp);
    document.removeEventListener('blur', this.handleBlur);
    document.removeEventListener('focusin', this.handleFocusIn);
    document.removeEventListener('focusout', this.handleFocusOut);

    const helpOverlay = document.getElementById('keyboard-shortcuts-help');
    if (helpOverlay) {
      helpOverlay.remove();
    }

    this.shortcuts.clear();
    this.contextualShortcuts.clear();
  }
}

// ===== CSS样式 =====
const shortcutCSS = `
.keyboard-shortcuts-help {
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
}

.help-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
  padding-bottom: 16px;
  border-bottom: 1px solid #e1e5e9;
}

.help-header h2 {
  margin: 0;
  color: #333;
}

.btn-close {
  background: none;
  border: none;
  font-size: 24px;
  color: #666;
  cursor: pointer;
  padding: 0;
  width: 30px;
  height: 30px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  transition: background-color 0.2s;
}

.btn-close:hover {
  background-color: #f1f1f1;
}

.shortcut-category {
  margin-bottom: 24px;
}

.shortcut-category h3 {
  margin: 0 0 12px 0;
  color: #666;
  font-size: 16px;
  font-weight: 600;
}

.shortcut-list {
  display: grid;
  gap: 8px;
}

.shortcut-item {
  display: grid;
  grid-template-columns: 1fr 2fr;
  gap: 16px;
  align-items: center;
  padding: 8px 0;
}

.shortcut-key {
  text-align: right;
  font-family: monospace;
}

.shortcut-key kbd {
  background: #f8f9fa;
  border: 1px solid #dee2e6;
  border-radius: 3px;
  padding: 2px 6px;
  font-size: 12px;
  color: #333;
  margin: 0 2px;
  display: inline-block;
  min-width: 20px;
  text-align: center;
}

.shortcut-description {
  color: #333;
  font-size: 14px;
}

.help-footer {
  margin-top: 20px;
  padding-top: 16px;
  border-top: 1px solid #e1e5e9;
  text-align: center;
  color: #666;
  font-size: 13px;
}

.help-footer kbd {
  background: #f8f9fa;
  border: 1px solid #dee2e6;
  border-radius: 3px;
  padding: 2px 6px;
  font-size: 11px;
  color: #333;
}

.shortcut-feedback {
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
}

@media (max-width: 768px) {
  .help-content {
    margin: 20px;
    max-height: calc(100vh - 40px);
  }
  
  .shortcut-item {
    grid-template-columns: 1fr;
    gap: 4px;
  }
  
  .shortcut-key {
    text-align: left;
  }
}

@media (prefers-color-scheme: dark) {
  .help-content {
    background: #2a2a2a;
    color: #e1e1e1;
  }
  
  .help-header h2,
  .shortcut-description {
    color: #e1e1e1;
  }
  
  .shortcut-category h3 {
    color: #ccc;
  }
  
  .help-header,
  .help-footer {
    border-color: #444;
  }
  
  .shortcut-key kbd,
  .help-footer kbd {
    background: #444;
    border-color: #555;
    color: #e1e1e1;
  }
  
  .btn-close {
    color: #ccc;
  }
  
  .btn-close:hover {
    background-color: #444;
  }
}
`;

// 注入CSS
const styleSheet = document.createElement('style');
styleSheet.textContent = shortcutCSS;
document.head.appendChild(styleSheet);

// ===== 全局实例 =====
window.KeyboardShortcuts = KeyboardShortcuts;
window.keyboardShortcuts = new KeyboardShortcuts();

// ===== 便捷方法 =====
window.registerShortcut = function(key, action, options) {
  return window.keyboardShortcuts.register(key, action, options);
};

window.showShortcutHelp = function() {
  return window.keyboardShortcuts.showHelp();
};

// ===== 自动初始化 =====
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    console.log('键盘快捷键已启用，按 Cmd/Ctrl + / 查看帮助');
  });
} else {
  console.log('键盘快捷键已启用，按 Cmd/Ctrl + / 查看帮助');
}

// ===== 导出 =====
if (typeof module !== 'undefined' && module.exports) {
  module.exports = KeyboardShortcuts;
} 