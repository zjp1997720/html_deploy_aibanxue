/**
 * 主题管理器
 * Phase 3: UI/UX优化 - 主题切换功能（可选）
 */

class ThemeManager {
  constructor(options = {}) {
    this.config = {
      defaultTheme: 'auto',
      enableCustomThemes: true,
      enableColorPicker: true,
      enableSystemFollow: true,
      animateTransitions: true,
      persistTheme: true,
      storageKey: 'app-theme-settings',
      transitionDuration: 300,
      ...options
    };

    this.themes = new Map();
    this.currentTheme = null;
    this.customThemes = new Map();
    this.systemPreference = null;
    this.mediaQuery = null;
    this.themeTransitioning = false;

    this.init();
  }

  init() {
    this.registerDefaultThemes();
    this.setupSystemDetection();
    this.loadSavedTheme();
    this.createThemeControls();
    this.setupEventListeners();
    this.applyInitialTheme();
  }

  // ===== 默认主题注册 =====
  registerDefaultThemes() {
    // 浅色主题
    this.registerTheme('light', {
      name: '浅色',
      type: 'light',
      colors: {
        primary: '#0066cc',
        secondary: '#6c757d',
        success: '#28a745',
        danger: '#dc3545',
        warning: '#ffc107',
        info: '#17a2b8',
        background: '#ffffff',
        surface: '#f8f9fa',
        text: '#333333',
        textSecondary: '#666666',
        border: '#e1e5e9',
        shadow: 'rgba(0, 0, 0, 0.1)'
      }
    });

    // 深色主题
    this.registerTheme('dark', {
      name: '深色',
      type: 'dark',
      colors: {
        primary: '#66ccff',
        secondary: '#868e96',
        success: '#40c057',
        danger: '#ff6b6b',
        warning: '#ffd43b',
        info: '#74c0fc',
        background: '#1a1a1a',
        surface: '#2a2a2a',
        text: '#e1e1e1',
        textSecondary: '#b0b0b0',
        border: '#444444',
        shadow: 'rgba(0, 0, 0, 0.3)'
      }
    });

    // 蓝色主题
    this.registerTheme('blue', {
      name: '蓝色',
      type: 'light',
      colors: {
        primary: '#2196f3',
        secondary: '#607d8b',
        success: '#4caf50',
        danger: '#f44336',
        warning: '#ff9800',
        info: '#00bcd4',
        background: '#f5f7fa',
        surface: '#ffffff',
        text: '#1e3a8a',
        textSecondary: '#64748b',
        border: '#cbd5e1',
        shadow: 'rgba(33, 150, 243, 0.1)'
      }
    });

    // 绿色主题
    this.registerTheme('green', {
      name: '绿色',
      type: 'light',
      colors: {
        primary: '#4caf50',
        secondary: '#795548',
        success: '#8bc34a',
        danger: '#e91e63',
        warning: '#ff9800',
        info: '#009688',
        background: '#f1f8f4',
        surface: '#ffffff',
        text: '#2e7d2e',
        textSecondary: '#5a6c57',
        border: '#c8e6c9',
        shadow: 'rgba(76, 175, 80, 0.1)'
      }
    });

    // 紫色主题
    this.registerTheme('purple', {
      name: '紫色',
      type: 'light',
      colors: {
        primary: '#9c27b0',
        secondary: '#673ab7',
        success: '#4caf50',
        danger: '#f44336',
        warning: '#ff9800',
        info: '#2196f3',
        background: '#faf5ff',
        surface: '#ffffff',
        text: '#6b21a8',
        textSecondary: '#7c3aed',
        border: '#e9d5ff',
        shadow: 'rgba(156, 39, 176, 0.1)'
      }
    });

    // 高对比度主题
    this.registerTheme('high-contrast', {
      name: '高对比度',
      type: 'light',
      colors: {
        primary: '#000000',
        secondary: '#333333',
        success: '#008000',
        danger: '#ff0000',
        warning: '#ffff00',
        info: '#0000ff',
        background: '#ffffff',
        surface: '#f0f0f0',
        text: '#000000',
        textSecondary: '#333333',
        border: '#000000',
        shadow: 'rgba(0, 0, 0, 0.5)'
      }
    });
  }

  registerTheme(id, theme) {
    this.themes.set(id, {
      id,
      ...theme,
      createdAt: new Date().toISOString()
    });
  }

  // ===== 系统主题检测 =====
  setupSystemDetection() {
    if (!this.config.enableSystemFollow) return;

    this.mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    this.systemPreference = this.mediaQuery.matches ? 'dark' : 'light';

    // 监听系统主题变化
    this.mediaQuery.addEventListener('change', (e) => {
      this.systemPreference = e.matches ? 'dark' : 'light';
      
      if (this.currentTheme === 'auto') {
        this.applySystemTheme();
      }
      
      this.triggerThemeEvent('systemchange', {
        systemPreference: this.systemPreference
      });
    });
  }

  // ===== 主题应用 =====
  applyTheme(themeId, options = {}) {
    if (this.themeTransitioning && !options.force) return;

    const theme = this.getTheme(themeId);
    if (!theme) {
      console.warn(`主题不存在: ${themeId}`);
      return;
    }

    const previousTheme = this.currentTheme;
    this.currentTheme = themeId;

    if (this.config.animateTransitions && !options.skipAnimation) {
      this.animateThemeTransition(() => {
        this.applyThemeColors(theme);
      });
    } else {
      this.applyThemeColors(theme);
    }

    // 更新HTML属性
    document.documentElement.setAttribute('data-theme', themeId);
    document.documentElement.setAttribute('data-theme-type', theme.type);

    // 保存设置
    if (this.config.persistTheme) {
      this.saveThemeSettings();
    }

    // 更新控件状态
    this.updateThemeControls();

    // 触发事件
    this.triggerThemeEvent('changed', {
      currentTheme: themeId,
      previousTheme: previousTheme,
      theme: theme
    });
  }

  applySystemTheme() {
    const systemTheme = this.systemPreference === 'dark' ? 'dark' : 'light';
    this.applyTheme(systemTheme, { skipAnimation: true });
  }

  applyThemeColors(theme) {
    const root = document.documentElement;
    
    // 应用CSS变量
    Object.entries(theme.colors).forEach(([key, value]) => {
      root.style.setProperty(`--color-${this.kebabCase(key)}`, value);
    });

    // 应用特殊属性
    root.style.setProperty('--theme-transition-duration', `${this.config.transitionDuration}ms`);
    
    // 设置meta标签颜色（移动端状态栏）
    this.updateMetaThemeColor(theme.colors.primary);
  }

  animateThemeTransition(callback) {
    if (!this.config.animateTransitions) {
      callback();
      return;
    }

    this.themeTransitioning = true;
    document.body.classList.add('theme-transitioning');

    // 创建覆盖层动画
    const overlay = document.createElement('div');
    overlay.className = 'theme-transition-overlay';
    overlay.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background: currentColor;
      opacity: 0;
      z-index: 99999;
      pointer-events: none;
      transition: opacity ${this.config.transitionDuration / 2}ms ease;
    `;

    document.body.appendChild(overlay);

    // 淡入
    requestAnimationFrame(() => {
      overlay.style.opacity = '0.1';
    });

    setTimeout(() => {
      callback();
      
      // 淡出
      overlay.style.opacity = '0';
      
      setTimeout(() => {
        overlay.remove();
        document.body.classList.remove('theme-transitioning');
        this.themeTransitioning = false;
      }, this.config.transitionDuration / 2);
      
    }, this.config.transitionDuration / 2);
  }

  // ===== 主题获取 =====
  getTheme(themeId) {
    if (themeId === 'auto') {
      const systemThemeId = this.systemPreference === 'dark' ? 'dark' : 'light';
      return this.themes.get(systemThemeId);
    }
    
    return this.themes.get(themeId) || this.customThemes.get(themeId);
  }

  getAllThemes() {
    const allThemes = new Map();
    
    // 添加系统主题
    allThemes.set('auto', {
      id: 'auto',
      name: '跟随系统',
      type: 'auto',
      colors: this.getTheme('auto')?.colors || {}
    });
    
    // 添加预设主题
    this.themes.forEach((theme, id) => {
      allThemes.set(id, theme);
    });
    
    // 添加自定义主题
    this.customThemes.forEach((theme, id) => {
      allThemes.set(id, theme);
    });
    
    return allThemes;
  }

  // ===== 自定义主题 =====
  createCustomTheme(name, baseThemeId = 'light') {
    const baseTheme = this.getTheme(baseThemeId);
    if (!baseTheme) {
      throw new Error(`基础主题不存在: ${baseThemeId}`);
    }

    const customId = `custom-${Date.now()}`;
    const customTheme = {
      id: customId,
      name: name,
      type: baseTheme.type,
      colors: { ...baseTheme.colors },
      isCustom: true,
      baseTheme: baseThemeId,
      createdAt: new Date().toISOString()
    };

    this.customThemes.set(customId, customTheme);
    this.saveCustomThemes();
    
    return customId;
  }

  updateCustomTheme(themeId, updates) {
    const theme = this.customThemes.get(themeId);
    if (!theme || !theme.isCustom) {
      throw new Error('只能修改自定义主题');
    }

    Object.assign(theme, updates);
    this.customThemes.set(themeId, theme);
    this.saveCustomThemes();

    // 如果是当前主题，立即应用
    if (this.currentTheme === themeId) {
      this.applyTheme(themeId);
    }
  }

  deleteCustomTheme(themeId) {
    const theme = this.customThemes.get(themeId);
    if (!theme || !theme.isCustom) {
      throw new Error('只能删除自定义主题');
    }

    this.customThemes.delete(themeId);
    this.saveCustomThemes();

    // 如果删除的是当前主题，切换到默认主题
    if (this.currentTheme === themeId) {
      this.applyTheme(this.config.defaultTheme);
    }
  }

  // ===== 主题控件 =====
  createThemeControls() {
    this.createThemeButton();
    this.createThemePanel();
    if (this.config.enableColorPicker) {
      this.createColorPicker();
    }
  }

  createThemeButton() {
    const button = document.createElement('button');
    button.id = 'theme-toggle-btn';
    button.className = 'theme-toggle-btn';
    button.title = '切换主题';
    button.style.cssText = `
      position: fixed;
      top: 20px;
      right: 80px;
      width: 44px;
      height: 44px;
      border: none;
      border-radius: 50%;
      background: var(--color-surface, #f8f9fa);
      color: var(--color-text, #333);
      cursor: pointer;
      box-shadow: 0 2px 8px var(--color-shadow, rgba(0, 0, 0, 0.1));
      z-index: 1000;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 18px;
      transition: all 0.3s ease;
    `;
    
    button.innerHTML = '🎨';
    
    button.addEventListener('click', () => {
      this.toggleThemePanel();
    });
    
    document.body.appendChild(button);
    this.themeButton = button;
  }

  createThemePanel() {
    const panel = document.createElement('div');
    panel.id = 'theme-panel';
    panel.className = 'theme-panel';
    panel.style.cssText = `
      position: fixed;
      top: 70px;
      right: 20px;
      width: 300px;
      max-height: 80vh;
      background: var(--color-surface, #fff);
      border: 1px solid var(--color-border, #e1e5e9);
      border-radius: 12px;
      box-shadow: 0 8px 32px var(--color-shadow, rgba(0, 0, 0, 0.1));
      z-index: 9999;
      display: none;
      flex-direction: column;
      overflow: hidden;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    `;

    panel.innerHTML = `
      <div class="theme-panel-header" style="
        padding: 16px 20px;
        border-bottom: 1px solid var(--color-border, #e1e5e9);
        display: flex;
        justify-content: space-between;
        align-items: center;
      ">
        <h3 style="margin: 0; color: var(--color-text, #333); font-size: 16px;">主题设置</h3>
        <button class="theme-panel-close" style="
          background: none;
          border: none;
          font-size: 20px;
          cursor: pointer;
          color: var(--color-text-secondary, #666);
          padding: 0;
          width: 24px;
          height: 24px;
          display: flex;
          align-items: center;
          justify-content: center;
          border-radius: 50%;
        ">&times;</button>
      </div>
      <div class="theme-panel-body" style="
        padding: 20px;
        overflow-y: auto;
      ">
        <div class="theme-selector">
          <label style="
            display: block;
            margin-bottom: 12px;
            color: var(--color-text, #333);
            font-weight: 500;
            font-size: 14px;
          ">选择主题</label>
          <div class="theme-grid" style="
            display: grid;
            grid-template-columns: repeat(2, 1fr);
            gap: 12px;
            margin-bottom: 24px;
          "></div>
        </div>
        <div class="custom-theme-section" style="
          border-top: 1px solid var(--color-border, #e1e5e9);
          padding-top: 20px;
        ">
          <label style="
            display: block;
            margin-bottom: 12px;
            color: var(--color-text, #333);
            font-weight: 500;
            font-size: 14px;
          ">自定义主题</label>
          <button class="create-theme-btn" style="
            width: 100%;
            padding: 10px;
            background: var(--color-primary, #0066cc);
            color: white;
            border: none;
            border-radius: 6px;
            cursor: pointer;
            font-size: 14px;
            margin-bottom: 12px;
          ">创建自定义主题</button>
          <div class="custom-themes-list"></div>
        </div>
      </div>
    `;

    document.body.appendChild(panel);
    this.themePanel = panel;

    this.setupThemePanelEvents();
    this.updateThemeGrid();
  }

  setupThemePanelEvents() {
    // 关闭按钮
    this.themePanel.querySelector('.theme-panel-close').addEventListener('click', () => {
      this.hideThemePanel();
    });

    // 创建自定义主题
    this.themePanel.querySelector('.create-theme-btn').addEventListener('click', () => {
      this.showCreateThemeDialog();
    });

    // 点击外部关闭
    document.addEventListener('click', (e) => {
      if (!this.themePanel.contains(e.target) && 
          !this.themeButton.contains(e.target)) {
        this.hideThemePanel();
      }
    });
  }

  updateThemeGrid() {
    const grid = this.themePanel.querySelector('.theme-grid');
    const allThemes = this.getAllThemes();
    
    grid.innerHTML = '';
    
    allThemes.forEach((theme, id) => {
      if (id.startsWith('custom-')) return; // 自定义主题单独显示
      
      const item = document.createElement('div');
      item.className = 'theme-item';
      item.style.cssText = `
        padding: 12px;
        border: 2px solid var(--color-border, #e1e5e9);
        border-radius: 8px;
        cursor: pointer;
        text-align: center;
        transition: all 0.2s ease;
        background: var(--color-background, #fff);
      `;
      
      if (this.currentTheme === id) {
        item.style.borderColor = 'var(--color-primary, #0066cc)';
        item.style.backgroundColor = 'rgba(0, 102, 204, 0.05)';
      }
      
      item.innerHTML = `
        <div class="theme-preview" style="
          width: 100%;
          height: 24px;
          border-radius: 4px;
          margin-bottom: 8px;
          background: ${theme.colors.primary};
          position: relative;
        ">
          <div style="
            position: absolute;
            top: 4px;
            left: 4px;
            width: 8px;
            height: 8px;
            border-radius: 50%;
            background: ${theme.colors.background};
          "></div>
          <div style="
            position: absolute;
            top: 4px;
            right: 4px;
            width: 16px;
            height: 4px;
            border-radius: 2px;
            background: ${theme.colors.text};
            opacity: 0.7;
          "></div>
        </div>
        <div style="
          font-size: 12px;
          color: var(--color-text, #333);
          font-weight: 500;
        ">${theme.name}</div>
      `;
      
      item.addEventListener('click', () => {
        this.applyTheme(id);
        this.updateThemeGrid();
      });
      
      grid.appendChild(item);
    });
    
    // 更新自定义主题列表
    this.updateCustomThemesList();
  }

  updateCustomThemesList() {
    const list = this.themePanel.querySelector('.custom-themes-list');
    list.innerHTML = '';
    
    this.customThemes.forEach((theme, id) => {
      const item = document.createElement('div');
      item.className = 'custom-theme-item';
      item.style.cssText = `
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding: 8px 12px;
        border: 1px solid var(--color-border, #e1e5e9);
        border-radius: 6px;
        margin-bottom: 8px;
        background: var(--color-background, #fff);
      `;
      
      item.innerHTML = `
        <div style="flex: 1;">
          <div style="font-size: 14px; color: var(--color-text, #333);">${theme.name}</div>
          <div style="font-size: 12px; color: var(--color-text-secondary, #666);">
            基于 ${this.getTheme(theme.baseTheme)?.name || theme.baseTheme}
          </div>
        </div>
        <div class="custom-theme-actions" style="display: flex; gap: 8px;">
          <button class="apply-theme-btn" data-theme-id="${id}" style="
            padding: 4px 8px;
            background: var(--color-primary, #0066cc);
            color: white;
            border: none;
            border-radius: 4px;
            cursor: pointer;
            font-size: 12px;
          ">应用</button>
          <button class="edit-theme-btn" data-theme-id="${id}" style="
            padding: 4px 8px;
            background: var(--color-secondary, #6c757d);
            color: white;
            border: none;
            border-radius: 4px;
            cursor: pointer;
            font-size: 12px;
          ">编辑</button>
          <button class="delete-theme-btn" data-theme-id="${id}" style="
            padding: 4px 8px;
            background: var(--color-danger, #dc3545);
            color: white;
            border: none;
            border-radius: 4px;
            cursor: pointer;
            font-size: 12px;
          ">删除</button>
        </div>
      `;
      
      // 添加事件监听器
      item.querySelector('.apply-theme-btn').addEventListener('click', () => {
        this.applyTheme(id);
        this.updateThemeGrid();
      });
      
      item.querySelector('.edit-theme-btn').addEventListener('click', () => {
        this.showEditThemeDialog(id);
      });
      
      item.querySelector('.delete-theme-btn').addEventListener('click', () => {
        if (confirm(`确定要删除主题"${theme.name}"吗？`)) {
          this.deleteCustomTheme(id);
          this.updateCustomThemesList();
        }
      });
      
      list.appendChild(item);
    });
  }

  createColorPicker() {
    // 颜色选择器的实现
    // 这里可以集成第三方颜色选择器库或创建简单的颜色选择器
  }

  // ===== 对话框 =====
  showCreateThemeDialog() {
    const dialog = this.createDialog('创建自定义主题', `
      <div style="margin-bottom: 16px;">
        <label style="display: block; margin-bottom: 8px; color: var(--color-text, #333);">主题名称</label>
        <input type="text" id="theme-name-input" placeholder="输入主题名称" style="
          width: 100%;
          padding: 8px 12px;
          border: 1px solid var(--color-border, #e1e5e9);
          border-radius: 4px;
          font-size: 14px;
          box-sizing: border-box;
        ">
      </div>
      <div style="margin-bottom: 16px;">
        <label style="display: block; margin-bottom: 8px; color: var(--color-text, #333);">基于主题</label>
        <select id="base-theme-select" style="
          width: 100%;
          padding: 8px 12px;
          border: 1px solid var(--color-border, #e1e5e9);
          border-radius: 4px;
          font-size: 14px;
          box-sizing: border-box;
        ">
          ${Array.from(this.themes.entries()).map(([id, theme]) => 
            `<option value="${id}">${theme.name}</option>`
          ).join('')}
        </select>
      </div>
    `, [
      {
        text: '取消',
        class: 'btn-secondary',
        action: () => this.hideDialog()
      },
      {
        text: '创建',
        class: 'btn-primary',
        action: () => {
          const name = dialog.querySelector('#theme-name-input').value.trim();
          const baseTheme = dialog.querySelector('#base-theme-select').value;
          
          if (!name) {
            alert('请输入主题名称');
            return;
          }
          
          const themeId = this.createCustomTheme(name, baseTheme);
          this.hideDialog();
          this.updateCustomThemesList();
          this.showEditThemeDialog(themeId);
        }
      }
    ]);
  }

  showEditThemeDialog(themeId) {
    const theme = this.customThemes.get(themeId);
    if (!theme) return;

    const colorInputs = Object.entries(theme.colors).map(([key, value]) => `
      <div style="margin-bottom: 12px; display: flex; align-items: center; gap: 12px;">
        <label style="flex: 1; color: var(--color-text, #333); font-size: 14px;">
          ${this.formatColorName(key)}
        </label>
        <input type="color" value="${value}" data-color-key="${key}" style="
          width: 40px;
          height: 32px;
          border: 1px solid var(--color-border, #e1e5e9);
          border-radius: 4px;
          cursor: pointer;
        ">
        <input type="text" value="${value}" data-color-text="${key}" style="
          width: 80px;
          padding: 4px 8px;
          border: 1px solid var(--color-border, #e1e5e9);
          border-radius: 4px;
          font-size: 12px;
          font-family: monospace;
        ">
      </div>
    `).join('');

    const dialog = this.createDialog(`编辑主题 - ${theme.name}`, `
      <div style="max-height: 400px; overflow-y: auto;">
        ${colorInputs}
      </div>
    `, [
      {
        text: '取消',
        class: 'btn-secondary',
        action: () => this.hideDialog()
      },
      {
        text: '保存',
        class: 'btn-primary',
        action: () => {
          const updates = { colors: {} };
          
          dialog.querySelectorAll('[data-color-key]').forEach(input => {
            const key = input.dataset.colorKey;
            updates.colors[key] = input.value;
          });
          
          this.updateCustomTheme(themeId, updates);
          this.hideDialog();
          this.updateCustomThemesList();
        }
      }
    ]);

    // 同步颜色选择器和文本输入
    dialog.querySelectorAll('[data-color-key]').forEach(colorInput => {
      const key = colorInput.dataset.colorKey;
      const textInput = dialog.querySelector(`[data-color-text="${key}"]`);
      
      colorInput.addEventListener('input', () => {
        textInput.value = colorInput.value;
      });
      
      textInput.addEventListener('input', () => {
        if (this.isValidColor(textInput.value)) {
          colorInput.value = textInput.value;
        }
      });
    });
  }

  createDialog(title, content, buttons = []) {
    const overlay = document.createElement('div');
    overlay.className = 'theme-dialog-overlay';
    overlay.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background: rgba(0, 0, 0, 0.5);
      z-index: 10000;
      display: flex;
      align-items: center;
      justify-content: center;
    `;

    const dialog = document.createElement('div');
    dialog.className = 'theme-dialog';
    dialog.style.cssText = `
      background: var(--color-surface, #fff);
      border-radius: 12px;
      box-shadow: 0 20px 60px var(--color-shadow, rgba(0, 0, 0, 0.3));
      max-width: 500px;
      width: 90%;
      max-height: 80vh;
      overflow: hidden;
    `;

    dialog.innerHTML = `
      <div class="dialog-header" style="
        padding: 20px;
        border-bottom: 1px solid var(--color-border, #e1e5e9);
      ">
        <h3 style="margin: 0; color: var(--color-text, #333); font-size: 18px;">${title}</h3>
      </div>
      <div class="dialog-body" style="padding: 20px;">
        ${content}
      </div>
      <div class="dialog-footer" style="
        padding: 16px 20px;
        border-top: 1px solid var(--color-border, #e1e5e9);
        display: flex;
        gap: 12px;
        justify-content: flex-end;
      ">
        ${buttons.map(btn => `
          <button class="dialog-btn ${btn.class}" style="
            padding: 8px 16px;
            border: none;
            border-radius: 6px;
            cursor: pointer;
            font-size: 14px;
            ${btn.class === 'btn-primary' ? 
              'background: var(--color-primary, #0066cc); color: white;' : 
              'background: var(--color-secondary, #6c757d); color: white;'}
          ">${btn.text}</button>
        `).join('')}
      </div>
    `;

    overlay.appendChild(dialog);
    document.body.appendChild(overlay);

    // 添加按钮事件
    dialog.querySelectorAll('.dialog-btn').forEach((btn, index) => {
      btn.addEventListener('click', buttons[index].action);
    });

    // 点击背景关闭
    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) {
        this.hideDialog();
      }
    });

    this.currentDialog = overlay;
    return dialog;
  }

  hideDialog() {
    if (this.currentDialog) {
      this.currentDialog.remove();
      this.currentDialog = null;
    }
  }

  // ===== 面板控制 =====
  toggleThemePanel() {
    if (this.themePanel.style.display === 'none') {
      this.showThemePanel();
    } else {
      this.hideThemePanel();
    }
  }

  showThemePanel() {
    this.themePanel.style.display = 'flex';
    this.updateThemeGrid();
  }

  hideThemePanel() {
    this.themePanel.style.display = 'none';
  }

  updateThemeControls() {
    // 更新主题按钮图标
    const currentTheme = this.getTheme(this.currentTheme);
    if (currentTheme) {
      const icon = currentTheme.type === 'dark' ? '🌙' : 
                   currentTheme.type === 'auto' ? '🔄' : '☀️';
      this.themeButton.innerHTML = icon;
    }
  }

  // ===== 存储管理 =====
  saveThemeSettings() {
    try {
      const settings = {
        currentTheme: this.currentTheme,
        lastUpdated: new Date().toISOString()
      };
      localStorage.setItem(this.config.storageKey, JSON.stringify(settings));
    } catch (e) {
      console.warn('无法保存主题设置:', e);
    }
  }

  loadSavedTheme() {
    try {
      const saved = localStorage.getItem(this.config.storageKey);
      if (saved) {
        const settings = JSON.parse(saved);
        this.currentTheme = settings.currentTheme || this.config.defaultTheme;
        return;
      }
    } catch (e) {
      console.warn('无法加载主题设置:', e);
    }
    
    this.currentTheme = this.config.defaultTheme;
  }

  saveCustomThemes() {
    try {
      const customThemesData = Array.from(this.customThemes.entries());
      localStorage.setItem(`${this.config.storageKey}-custom`, JSON.stringify(customThemesData));
    } catch (e) {
      console.warn('无法保存自定义主题:', e);
    }
  }

  loadCustomThemes() {
    try {
      const saved = localStorage.getItem(`${this.config.storageKey}-custom`);
      if (saved) {
        const customThemesData = JSON.parse(saved);
        this.customThemes = new Map(customThemesData);
      }
    } catch (e) {
      console.warn('无法加载自定义主题:', e);
    }
  }

  // ===== 事件处理 =====
  setupEventListeners() {
    // 键盘快捷键
    document.addEventListener('keydown', (e) => {
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === 'T') {
        e.preventDefault();
        this.toggleThemePanel();
      }
    });
  }

  applyInitialTheme() {
    this.loadCustomThemes();
    
    if (this.currentTheme === 'auto') {
      this.applySystemTheme();
    } else {
      this.applyTheme(this.currentTheme, { skipAnimation: true });
    }
  }

  // ===== 工具方法 =====
  kebabCase(str) {
    return str.replace(/([a-z])([A-Z])/g, '$1-$2').toLowerCase();
  }

  formatColorName(key) {
    const names = {
      primary: '主色调',
      secondary: '次要色',
      success: '成功色',
      danger: '危险色',
      warning: '警告色',
      info: '信息色',
      background: '背景色',
      surface: '表面色',
      text: '文本色',
      textSecondary: '次要文本',
      border: '边框色',
      shadow: '阴影色'
    };
    return names[key] || key;
  }

  isValidColor(color) {
    const style = new Option().style;
    style.color = color;
    return style.color !== '';
  }

  updateMetaThemeColor(color) {
    let metaTag = document.querySelector('meta[name="theme-color"]');
    if (!metaTag) {
      metaTag = document.createElement('meta');
      metaTag.name = 'theme-color';
      document.head.appendChild(metaTag);
    }
    metaTag.content = color;
  }

  triggerThemeEvent(type, detail) {
    const event = new CustomEvent(`theme${type}`, {
      detail: {
        ...detail,
        manager: this
      }
    });
    document.dispatchEvent(event);
  }

  // ===== 公共API =====
  getCurrentTheme() {
    return this.currentTheme;
  }

  getThemeInfo(themeId = this.currentTheme) {
    return this.getTheme(themeId);
  }

  exportTheme(themeId) {
    const theme = this.getTheme(themeId);
    if (!theme) return null;
    
    return {
      ...theme,
      exportedAt: new Date().toISOString(),
      version: '1.0'
    };
  }

  importTheme(themeData) {
    if (!themeData || !themeData.name || !themeData.colors) {
      throw new Error('无效的主题数据');
    }
    
    const themeId = `imported-${Date.now()}`;
    this.customThemes.set(themeId, {
      ...themeData,
      id: themeId,
      isCustom: true,
      imported: true,
      importedAt: new Date().toISOString()
    });
    
    this.saveCustomThemes();
    return themeId;
  }

  // ===== 清理方法 =====
  destroy() {
    if (this.themeButton) this.themeButton.remove();
    if (this.themePanel) this.themePanel.remove();
    if (this.currentDialog) this.currentDialog.remove();
    
    if (this.mediaQuery) {
      this.mediaQuery.removeEventListener('change', this.handleSystemChange);
    }
    
    // 重置为默认主题
    document.documentElement.removeAttribute('data-theme');
    document.documentElement.removeAttribute('data-theme-type');
    
    // 清除CSS变量
    const root = document.documentElement;
    const computedStyle = getComputedStyle(root);
    Array.from(computedStyle).forEach(prop => {
      if (prop.startsWith('--color-')) {
        root.style.removeProperty(prop);
      }
    });
  }
}

// ===== CSS样式 =====
const themeCSS = `
:root {
  --theme-transition-duration: 300ms;
}

* {
  transition: background-color var(--theme-transition-duration) ease,
              color var(--theme-transition-duration) ease,
              border-color var(--theme-transition-duration) ease,
              box-shadow var(--theme-transition-duration) ease;
}

.theme-transitioning * {
  transition-duration: 0ms !important;
}

.theme-toggle-btn:hover {
  transform: scale(1.1);
}

.theme-panel-close:hover {
  background: var(--color-border, #e1e5e9) !important;
}

.theme-item:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px var(--color-shadow, rgba(0, 0, 0, 0.1));
}

@media (max-width: 768px) {
  .theme-panel {
    top: 10px !important;
    right: 10px !important;
    left: 10px !important;
    width: auto !important;
  }
  
  .theme-grid {
    grid-template-columns: 1fr !important;
  }
}

@media (prefers-reduced-motion: reduce) {
  *,
  .theme-toggle-btn,
  .theme-item {
    transition: none !important;
  }
}
`;

// 注入CSS
const styleSheet = document.createElement('style');
styleSheet.textContent = themeCSS;
document.head.appendChild(styleSheet);

// ===== 全局实例和便捷方法 =====
window.ThemeManager = ThemeManager;
window.themeManager = new ThemeManager();

// 便捷方法
window.setTheme = function(themeId) {
  return window.themeManager.applyTheme(themeId);
};

window.getCurrentTheme = function() {
  return window.themeManager.getCurrentTheme();
};

window.createCustomTheme = function(name, baseTheme) {
  return window.themeManager.createCustomTheme(name, baseTheme);
};

window.toggleThemePanel = function() {
  return window.themeManager.toggleThemePanel();
};

// ===== 自动初始化 =====
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    console.log('主题管理器已启用，按 Ctrl/Cmd + Shift + T 打开主题面板');
  });
} else {
  console.log('主题管理器已启用，按 Ctrl/Cmd + Shift + T 打开主题面板');
}

// ===== 导出 =====
if (typeof module !== 'undefined' && module.exports) {
  module.exports = ThemeManager;
} 