/**
 * 搜索高亮管理器
 * Phase 3: UI/UX优化 - 搜索结果高亮（在现有基础上完善）
 */

class SearchHighlightManager {
  constructor(options = {}) {
    this.config = {
      highlightClass: 'search-highlight',
      activeHighlightClass: 'search-highlight-active',
      caseSensitive: false,
      wholeWord: false,
      fuzzyMatch: true,
      maxHighlights: 500,
      enableNavigation: true,
      enableMultipleTerms: true,
      enableRegex: false,
      highlightDelay: 100,
      animationDuration: 300,
      scrollOffset: 100,
      ...options
    };

    this.highlights = [];
    this.currentHighlight = -1;
    this.searchTerms = [];
    this.isSearching = false;
    this.searchResults = new Map();
    this.highlightColors = [
      '#ffeb3b', '#ff9800', '#f44336', '#9c27b0',
      '#3f51b5', '#2196f3', '#00bcd4', '#009688',
      '#4caf50', '#8bc34a', '#cddc39', '#ffc107'
    ];

    this.init();
  }

  init() {
    this.setupEventListeners();
    this.createNavigationControls();
    this.enhanceExistingSearch();
  }

  // ===== 事件监听器 =====
  setupEventListeners() {
    document.addEventListener('keydown', this.handleKeyDown.bind(this));
    document.addEventListener('input', this.handleSearchInput.bind(this));
    document.addEventListener('click', this.handleClick.bind(this));
    
    // 监听现有搜索优化器的事件
    document.addEventListener('searchcompleted', this.handleSearchCompleted.bind(this));
    document.addEventListener('searchcleared', this.handleSearchCleared.bind(this));
  }

  handleKeyDown(e) {
    if (!this.config.enableNavigation || this.highlights.length === 0) return;

    // Ctrl/Cmd + F: 显示搜索
    if ((e.ctrlKey || e.metaKey) && e.key === 'f') {
      e.preventDefault();
      this.focusSearchInput();
      return;
    }

    // Ctrl/Cmd + G: 下一个结果
    if ((e.ctrlKey || e.metaKey) && e.key === 'g' && !e.shiftKey) {
      e.preventDefault();
      this.nextHighlight();
      return;
    }

    // Ctrl/Cmd + Shift + G: 上一个结果
    if ((e.ctrlKey || e.metaKey) && e.key === 'g' && e.shiftKey) {
      e.preventDefault();
      this.previousHighlight();
      return;
    }

    // Escape: 清除搜索
    if (e.key === 'Escape' && this.highlights.length > 0) {
      this.clearHighlights();
      return;
    }

    // F3: 下一个结果
    if (e.key === 'F3' && !e.shiftKey) {
      e.preventDefault();
      this.nextHighlight();
      return;
    }

    // Shift + F3: 上一个结果
    if (e.key === 'F3' && e.shiftKey) {
      e.preventDefault();
      this.previousHighlight();
      return;
    }
  }

  handleSearchInput(e) {
    const searchInput = e.target.closest('.search-input, input[type="search"]');
    if (!searchInput) return;

    const query = searchInput.value.trim();
    
    if (query.length >= 2) {
      clearTimeout(this.searchTimeout);
      this.searchTimeout = setTimeout(() => {
        this.search(query);
      }, this.config.highlightDelay);
    } else {
      this.clearHighlights();
    }
  }

  handleClick(e) {
    if (e.target.matches('.search-nav-btn')) {
      const direction = e.target.dataset.direction;
      if (direction === 'next') {
        this.nextHighlight();
      } else if (direction === 'prev') {
        this.previousHighlight();
      }
    }

    if (e.target.matches('.search-clear-btn')) {
      this.clearHighlights();
    }

    if (e.target.matches('.highlight-mode-btn')) {
      this.toggleHighlightMode();
    }
  }

  handleSearchCompleted(e) {
    if (e.detail && e.detail.query) {
      this.search(e.detail.query);
    }
  }

  handleSearchCleared(e) {
    this.clearHighlights();
  }

  // ===== 搜索功能 =====
  search(query, options = {}) {
    if (!query || query.length < 1) {
      this.clearHighlights();
      return;
    }

    this.isSearching = true;
    this.searchTerms = this.parseSearchQuery(query);
    
    // 清除之前的高亮
    this.clearHighlights();
    
    // 执行搜索
    const results = this.performSearch(this.searchTerms, options);
    
    // 应用高亮
    this.applyHighlights(results);
    
    // 更新导航
    this.updateNavigationControls();
    
    // 滚动到第一个结果
    if (this.highlights.length > 0) {
      this.goToHighlight(0);
    }

    this.isSearching = false;
    
    // 触发搜索完成事件
    this.triggerSearchEvent('highlighted', {
      query,
      totalResults: this.highlights.length,
      terms: this.searchTerms
    });
  }

  parseSearchQuery(query) {
    if (!this.config.enableMultipleTerms) {
      return [query];
    }

    // 支持引号包围的短语和多个词语
    const terms = [];
    const regex = /"([^"]+)"|(\S+)/g;
    let match;

    while ((match = regex.exec(query)) !== null) {
      terms.push(match[1] || match[2]);
    }

    return terms.length > 0 ? terms : [query];
  }

  performSearch(terms, options = {}) {
    const searchScope = options.scope || document.body;
    const results = new Map();
    
    terms.forEach((term, index) => {
      const termResults = this.searchTerm(term, searchScope, index);
      results.set(term, termResults);
    });

    return results;
  }

  searchTerm(term, scope, termIndex) {
    const results = [];
    const searchFlags = this.config.caseSensitive ? 'g' : 'gi';
    
    let pattern;
    if (this.config.enableRegex && this.isValidRegex(term)) {
      try {
        pattern = new RegExp(term, searchFlags);
      } catch (e) {
        pattern = new RegExp(this.escapeRegex(term), searchFlags);
      }
    } else {
      const escapedTerm = this.escapeRegex(term);
      if (this.config.wholeWord) {
        pattern = new RegExp(`\\b${escapedTerm}\\b`, searchFlags);
      } else {
        pattern = new RegExp(escapedTerm, searchFlags);
      }
    }

    this.walkTextNodes(scope, (textNode) => {
      const text = textNode.textContent;
      let match;
      
      while ((match = pattern.exec(text)) !== null) {
        if (results.length >= this.config.maxHighlights) break;
        
        results.push({
          node: textNode,
          start: match.index,
          end: match.index + match[0].length,
          text: match[0],
          term: term,
          termIndex: termIndex
        });
        
        // 避免无限循环
        if (!pattern.global) break;
      }
    });

    return results;
  }

  walkTextNodes(node, callback) {
    if (node.nodeType === Node.TEXT_NODE) {
      // 跳过特定元素内的文本节点
      if (this.shouldSkipNode(node)) return;
      callback(node);
    } else {
      for (let child of node.childNodes) {
        this.walkTextNodes(child, callback);
      }
    }
  }

  shouldSkipNode(node) {
    const skipTags = ['SCRIPT', 'STYLE', 'NOSCRIPT', 'TEXTAREA', 'INPUT', 'SELECT'];
    const parent = node.parentElement;
    
    if (!parent) return true;
    
    // 跳过特定标签
    if (skipTags.includes(parent.tagName)) return true;
    
    // 跳过已高亮的内容
    if (parent.classList.contains(this.config.highlightClass)) return true;
    
    // 跳过隐藏元素
    const style = window.getComputedStyle(parent);
    if (style.display === 'none' || style.visibility === 'hidden') return true;
    
    return false;
  }

  // ===== 高亮应用 =====
  applyHighlights(searchResults) {
    const allMatches = [];
    
    // 收集所有匹配项
    searchResults.forEach((results, term) => {
      allMatches.push(...results);
    });

    // 按位置排序
    allMatches.sort((a, b) => {
      const aPos = this.getNodePosition(a.node);
      const bPos = this.getNodePosition(b.node);
      if (aPos !== bPos) return aPos - bPos;
      return a.start - b.start;
    });

    // 应用高亮（从后往前，避免位置偏移）
    const processedNodes = new Set();
    allMatches.reverse().forEach((match, index) => {
      if (!processedNodes.has(match.node)) {
        this.highlightInTextNode(match.node, [match]);
        processedNodes.add(match.node);
      }
    });

    // 如果同一个文本节点有多个匹配，需要特殊处理
    this.handleMultipleMatchesInNode(allMatches);
  }

  highlightInTextNode(textNode, matches) {
    const text = textNode.textContent;
    const parent = textNode.parentNode;
    
    // 按起始位置排序
    matches.sort((a, b) => a.start - b.start);
    
    let offset = 0;
    const fragment = document.createDocumentFragment();
    
    matches.forEach((match, index) => {
      // 添加匹配前的文本
      if (match.start > offset) {
        fragment.appendChild(document.createTextNode(text.slice(offset, match.start)));
      }
      
      // 创建高亮元素
      const highlight = this.createHighlightElement(match.text, match.termIndex);
      fragment.appendChild(highlight);
      this.highlights.push(highlight);
      
      offset = match.end;
    });
    
    // 添加剩余文本
    if (offset < text.length) {
      fragment.appendChild(document.createTextNode(text.slice(offset)));
    }
    
    // 替换原文本节点
    parent.replaceChild(fragment, textNode);
  }

  handleMultipleMatchesInNode(allMatches) {
    // 按文本节点分组
    const nodeMatches = new Map();
    allMatches.forEach(match => {
      if (!nodeMatches.has(match.node)) {
        nodeMatches.set(match.node, []);
      }
      nodeMatches.get(match.node).push(match);
    });

    // 处理有多个匹配的节点
    nodeMatches.forEach((matches, node) => {
      if (matches.length > 1) {
        // 合并重叠的匹配
        const mergedMatches = this.mergeOverlappingMatches(matches);
        if (mergedMatches.length !== matches.length) {
          this.highlightInTextNode(node, mergedMatches);
        }
      }
    });
  }

  mergeOverlappingMatches(matches) {
    if (matches.length <= 1) return matches;
    
    matches.sort((a, b) => a.start - b.start);
    const merged = [matches[0]];
    
    for (let i = 1; i < matches.length; i++) {
      const current = matches[i];
      const last = merged[merged.length - 1];
      
      if (current.start <= last.end) {
        // 重叠，合并
        last.end = Math.max(last.end, current.end);
        last.text = last.node.textContent.slice(last.start, last.end);
      } else {
        merged.push(current);
      }
    }
    
    return merged;
  }

  createHighlightElement(text, termIndex = 0) {
    const span = document.createElement('span');
    span.className = this.config.highlightClass;
    span.textContent = text;
    
    // 为不同的搜索词使用不同颜色
    if (this.searchTerms.length > 1) {
      const colorIndex = termIndex % this.highlightColors.length;
      span.style.backgroundColor = this.highlightColors[colorIndex];
      span.dataset.termIndex = termIndex;
    }
    
    // 添加点击事件
    span.addEventListener('click', (e) => {
      e.stopPropagation();
      this.goToHighlight(this.highlights.indexOf(span));
    });
    
    return span;
  }

  // ===== 高亮导航 =====
  nextHighlight() {
    if (this.highlights.length === 0) return;
    
    const nextIndex = (this.currentHighlight + 1) % this.highlights.length;
    this.goToHighlight(nextIndex);
  }

  previousHighlight() {
    if (this.highlights.length === 0) return;
    
    const prevIndex = this.currentHighlight === 0 ? 
      this.highlights.length - 1 : this.currentHighlight - 1;
    this.goToHighlight(prevIndex);
  }

  goToHighlight(index) {
    if (index < 0 || index >= this.highlights.length) return;
    
    // 移除之前的活动高亮
    if (this.currentHighlight >= 0 && this.highlights[this.currentHighlight]) {
      this.highlights[this.currentHighlight].classList.remove(this.config.activeHighlightClass);
    }
    
    // 设置新的活动高亮
    this.currentHighlight = index;
    const activeHighlight = this.highlights[index];
    activeHighlight.classList.add(this.config.activeHighlightClass);
    
    // 滚动到视图
    this.scrollToHighlight(activeHighlight);
    
    // 更新导航显示
    this.updateNavigationDisplay();
    
    // 触发导航事件
    this.triggerSearchEvent('navigated', {
      currentIndex: index,
      totalResults: this.highlights.length,
      element: activeHighlight
    });
  }

  scrollToHighlight(element) {
    const rect = element.getBoundingClientRect();
    const viewportHeight = window.innerHeight;
    
    // 检查元素是否在视口中
    if (rect.top < this.config.scrollOffset || 
        rect.bottom > viewportHeight - this.config.scrollOffset) {
      
      element.scrollIntoView({
        behavior: 'smooth',
        block: 'center',
        inline: 'nearest'
      });
    }
    
    // 添加闪烁效果
    this.flashHighlight(element);
  }

  flashHighlight(element) {
    element.style.transition = `all ${this.config.animationDuration}ms ease`;
    element.style.transform = 'scale(1.1)';
    element.style.boxShadow = '0 0 10px rgba(255, 235, 59, 0.8)';
    
    setTimeout(() => {
      element.style.transform = '';
      element.style.boxShadow = '';
    }, this.config.animationDuration);
  }

  // ===== 清除高亮 =====
  clearHighlights() {
    // 移除高亮元素
    this.highlights.forEach(highlight => {
      const parent = highlight.parentNode;
      if (parent) {
        // 用文本节点替换高亮元素
        const textNode = document.createTextNode(highlight.textContent);
        parent.replaceChild(textNode, highlight);
        
        // 合并相邻的文本节点
        parent.normalize();
      }
    });
    
    this.highlights = [];
    this.currentHighlight = -1;
    this.searchTerms = [];
    
    this.updateNavigationControls();
    
    // 触发清除事件
    this.triggerSearchEvent('cleared', {});
  }

  // ===== 导航控件 =====
  createNavigationControls() {
    if (!this.config.enableNavigation) return;
    
    const nav = document.createElement('div');
    nav.id = 'search-highlight-nav';
    nav.className = 'search-highlight-nav';
    nav.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      background: white;
      border: 1px solid #ddd;
      border-radius: 6px;
      padding: 8px;
      box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
      z-index: 9999;
      display: none;
      align-items: center;
      gap: 8px;
      font-size: 13px;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    `;
    
    nav.innerHTML = `
      <span class="search-results-count">0 / 0</span>
      <button class="search-nav-btn" data-direction="prev" title="上一个 (Shift+F3)">
        <svg width="12" height="12" viewBox="0 0 12 12">
          <path d="M8 2L4 6l4 4" stroke="currentColor" fill="none" stroke-width="1.5"/>
        </svg>
      </button>
      <button class="search-nav-btn" data-direction="next" title="下一个 (F3)">
        <svg width="12" height="12" viewBox="0 0 12 12">
          <path d="M4 2l4 4-4 4" stroke="currentColor" fill="none" stroke-width="1.5"/>
        </svg>
      </button>
      <button class="search-clear-btn" title="清除搜索 (Esc)">
        <svg width="12" height="12" viewBox="0 0 12 12">
          <path d="M2 2l8 8m0-8L2 10" stroke="currentColor" stroke-width="1.5"/>
        </svg>
      </button>
      <button class="highlight-mode-btn" title="切换高亮模式">
        <svg width="12" height="12" viewBox="0 0 12 12">
          <rect x="2" y="4" width="8" height="4" fill="currentColor" opacity="0.3"/>
        </svg>
      </button>
    `;
    
    document.body.appendChild(nav);
    this.navigationElement = nav;
  }

  updateNavigationControls() {
    if (!this.navigationElement) return;
    
    const countElement = this.navigationElement.querySelector('.search-results-count');
    const prevBtn = this.navigationElement.querySelector('[data-direction="prev"]');
    const nextBtn = this.navigationElement.querySelector('[data-direction="next"]');
    
    if (this.highlights.length > 0) {
      this.navigationElement.style.display = 'flex';
      countElement.textContent = `${this.currentHighlight + 1} / ${this.highlights.length}`;
      prevBtn.disabled = false;
      nextBtn.disabled = false;
    } else {
      this.navigationElement.style.display = 'none';
    }
  }

  updateNavigationDisplay() {
    this.updateNavigationControls();
  }

  // ===== 增强现有搜索 =====
  enhanceExistingSearch() {
    // 查找现有的搜索输入框
    const searchInputs = document.querySelectorAll('input[type="search"], .search-input');
    
    searchInputs.forEach(input => {
      // 添加增强功能指示
      if (!input.dataset.enhanced) {
        input.dataset.enhanced = 'true';
        input.title = input.title + ' (支持高亮搜索)';
        
        // 添加搜索建议
        this.addSearchSuggestions(input);
      }
    });
  }

  addSearchSuggestions(input) {
    const container = input.parentElement;
    const suggestions = document.createElement('div');
    suggestions.className = 'search-suggestions-enhanced';
    suggestions.style.cssText = `
      position: absolute;
      top: 100%;
      left: 0;
      right: 0;
      background: white;
      border: 1px solid #ddd;
      border-top: none;
      border-radius: 0 0 4px 4px;
      box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
      z-index: 1000;
      display: none;
      max-height: 200px;
      overflow-y: auto;
    `;
    
    container.style.position = 'relative';
    container.appendChild(suggestions);
    
    // 添加搜索历史功能
    this.addSearchHistory(input, suggestions);
  }

  addSearchHistory(input, suggestionsContainer) {
    const storageKey = 'search-highlight-history';
    
    input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        const query = input.value.trim();
        if (query) {
          this.saveSearchHistory(storageKey, query);
        }
      }
    });
    
    input.addEventListener('focus', () => {
      this.showSearchSuggestions(input, suggestionsContainer, storageKey);
    });
    
    document.addEventListener('click', (e) => {
      if (!input.contains(e.target) && !suggestionsContainer.contains(e.target)) {
        suggestionsContainer.style.display = 'none';
      }
    });
  }

  saveSearchHistory(storageKey, query) {
    try {
      const history = JSON.parse(localStorage.getItem(storageKey) || '[]');
      const index = history.indexOf(query);
      
      if (index > -1) {
        history.splice(index, 1);
      }
      
      history.unshift(query);
      history.splice(10); // 保留最近10个
      
      localStorage.setItem(storageKey, JSON.stringify(history));
    } catch (e) {
      console.warn('无法保存搜索历史:', e);
    }
  }

  showSearchSuggestions(input, container, storageKey) {
    try {
      const history = JSON.parse(localStorage.getItem(storageKey) || '[]');
      
      if (history.length === 0) {
        container.style.display = 'none';
        return;
      }
      
      container.innerHTML = history.map(query => `
        <div class="search-suggestion-item" style="
          padding: 8px 12px;
          cursor: pointer;
          border-bottom: 1px solid #f0f0f0;
          font-size: 14px;
        " data-query="${this.escapeHtml(query)}">
          <svg width="12" height="12" style="margin-right: 8px; opacity: 0.5;" viewBox="0 0 12 12">
            <circle cx="5" cy="5" r="4" stroke="currentColor" fill="none"/>
            <path d="8.5 8.5L11 11" stroke="currentColor"/>
          </svg>
          ${this.escapeHtml(query)}
        </div>
      `).join('');
      
      container.style.display = 'block';
      
      // 添加点击事件
      container.querySelectorAll('.search-suggestion-item').forEach(item => {
        item.addEventListener('click', () => {
          const query = item.dataset.query;
          input.value = query;
          input.focus();
          this.search(query);
          container.style.display = 'none';
        });
      });
      
    } catch (e) {
      console.warn('无法显示搜索建议:', e);
    }
  }

  // ===== 高级搜索功能 =====
  toggleHighlightMode() {
    // 在不同高亮模式之间切换
    const modes = ['normal', 'fuzzy', 'regex'];
    const currentMode = this.config.currentMode || 'normal';
    const currentIndex = modes.indexOf(currentMode);
    const nextIndex = (currentIndex + 1) % modes.length;
    const nextMode = modes[nextIndex];
    
    this.config.currentMode = nextMode;
    
    // 更新配置
    switch (nextMode) {
      case 'fuzzy':
        this.config.fuzzyMatch = true;
        this.config.enableRegex = false;
        break;
      case 'regex':
        this.config.fuzzyMatch = false;
        this.config.enableRegex = true;
        break;
      default:
        this.config.fuzzyMatch = false;
        this.config.enableRegex = false;
    }
    
    // 重新搜索
    if (this.searchTerms.length > 0) {
      this.search(this.searchTerms.join(' '));
    }
    
    // 显示模式提示
    this.showModeNotification(nextMode);
  }

  showModeNotification(mode) {
    const modeNames = {
      normal: '普通搜索',
      fuzzy: '模糊搜索',
      regex: '正则表达式'
    };
    
    if (window.showNotification) {
      window.showNotification(`切换到: ${modeNames[mode]}`, 'info', 1500);
    }
  }

  fuzzySearch(term, text) {
    // 简单的模糊搜索实现
    const termLower = term.toLowerCase();
    const textLower = text.toLowerCase();
    
    let termIndex = 0;
    let score = 0;
    
    for (let i = 0; i < textLower.length && termIndex < termLower.length; i++) {
      if (textLower[i] === termLower[termIndex]) {
        score++;
        termIndex++;
      }
    }
    
    return termIndex === termLower.length ? score / term.length : 0;
  }

  // ===== 工具方法 =====
  getNodePosition(node) {
    let position = 0;
    let walker = document.createTreeWalker(
      document.body,
      NodeFilter.SHOW_TEXT,
      null,
      false
    );
    
    while (walker.nextNode()) {
      if (walker.currentNode === node) {
        return position;
      }
      position++;
    }
    
    return position;
  }

  isValidRegex(pattern) {
    try {
      new RegExp(pattern);
      return true;
    } catch (e) {
      return false;
    }
  }

  escapeRegex(string) {
    return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }

  escapeHtml(string) {
    const div = document.createElement('div');
    div.textContent = string;
    return div.innerHTML;
  }

  focusSearchInput() {
    const searchInput = document.querySelector('input[type="search"], .search-input');
    if (searchInput) {
      searchInput.focus();
      searchInput.select();
    }
  }

  triggerSearchEvent(type, detail) {
    const event = new CustomEvent(`searchhighlight${type}`, {
      detail: {
        ...detail,
        manager: this
      }
    });
    document.dispatchEvent(event);
  }

  // ===== 统计和分析 =====
  getSearchStats() {
    return {
      totalHighlights: this.highlights.length,
      currentPosition: this.currentHighlight + 1,
      searchTerms: this.searchTerms.slice(),
      isSearching: this.isSearching,
      mode: this.config.currentMode || 'normal'
    };
  }

  exportSearchResults() {
    const results = this.highlights.map((highlight, index) => ({
      index: index + 1,
      text: highlight.textContent,
      termIndex: highlight.dataset.termIndex || 0,
      position: this.getNodePosition(highlight)
    }));
    
    return {
      query: this.searchTerms.join(' '),
      totalResults: results.length,
      results: results,
      timestamp: new Date().toISOString()
    };
  }

  // ===== 清理方法 =====
  destroy() {
    document.removeEventListener('keydown', this.handleKeyDown);
    document.removeEventListener('input', this.handleSearchInput);
    document.removeEventListener('click', this.handleClick);
    document.removeEventListener('searchcompleted', this.handleSearchCompleted);
    document.removeEventListener('searchcleared', this.handleSearchCleared);

    this.clearHighlights();
    
    if (this.navigationElement) {
      this.navigationElement.remove();
    }
    
    clearTimeout(this.searchTimeout);
  }
}

// ===== CSS样式增强 =====
const enhancedSearchCSS = `
.search-highlight {
  background-color: #ffeb3b !important;
  color: #000 !important;
  padding: 1px 2px;
  border-radius: 2px;
  cursor: pointer;
  transition: all 0.2s ease;
  position: relative;
}

.search-highlight:hover {
  background-color: #ffc107 !important;
  transform: scale(1.05);
}

.search-highlight-active {
  background-color: #ff5722 !important;
  color: white !important;
  box-shadow: 0 0 8px rgba(255, 87, 34, 0.5);
  font-weight: bold;
}

.search-highlight-nav {
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
}

.search-highlight-nav button {
  background: none;
  border: 1px solid #ddd;
  border-radius: 3px;
  padding: 4px 6px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s ease;
  color: #666;
}

.search-highlight-nav button:hover {
  background: #f5f5f5;
  border-color: #ccc;
}

.search-highlight-nav button:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.search-results-count {
  color: #666;
  font-weight: 500;
  min-width: 40px;
  text-align: center;
}

.search-suggestions-enhanced {
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
}

.search-suggestion-item:hover {
  background-color: #f5f5f5 !important;
}

.search-suggestion-item:last-child {
  border-bottom: none !important;
}

/* 多词高亮颜色 */
.search-highlight[data-term-index="0"] { background-color: #ffeb3b !important; }
.search-highlight[data-term-index="1"] { background-color: #ff9800 !important; }
.search-highlight[data-term-index="2"] { background-color: #f44336 !important; color: white !important; }
.search-highlight[data-term-index="3"] { background-color: #9c27b0 !important; color: white !important; }
.search-highlight[data-term-index="4"] { background-color: #3f51b5 !important; color: white !important; }

/* 深色模式 */
@media (prefers-color-scheme: dark) {
  .search-highlight-nav {
    background: #2a2a2a !important;
    border-color: #555 !important;
    color: #e1e1e1 !important;
  }
  
  .search-highlight-nav button {
    border-color: #555 !important;
    color: #e1e1e1 !important;
  }
  
  .search-highlight-nav button:hover {
    background: #444 !important;
  }
  
  .search-suggestions-enhanced {
    background: #2a2a2a !important;
    border-color: #555 !important;
    color: #e1e1e1 !important;
  }
  
  .search-suggestion-item:hover {
    background-color: #444 !important;
  }
}

/* 减少动画 */
@media (prefers-reduced-motion: reduce) {
  .search-highlight,
  .search-highlight-nav button {
    transition: none !important;
  }
}
`;

// 注入增强样式
const existingStyles = document.querySelector('style[data-search-highlight]');
if (!existingStyles) {
  const styleSheet = document.createElement('style');
  styleSheet.setAttribute('data-search-highlight', 'true');
  styleSheet.textContent = enhancedSearchCSS;
  document.head.appendChild(styleSheet);
}

// ===== 全局实例和便捷方法 =====
window.SearchHighlightManager = SearchHighlightManager;
window.searchHighlightManager = new SearchHighlightManager();

// 便捷方法
window.highlightSearch = function(query, options) {
  return window.searchHighlightManager.search(query, options);
};

window.clearSearchHighlights = function() {
  return window.searchHighlightManager.clearHighlights();
};

window.nextSearchResult = function() {
  return window.searchHighlightManager.nextHighlight();
};

window.previousSearchResult = function() {
  return window.searchHighlightManager.previousHighlight();
};

// ===== 自动初始化 =====
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    console.log('搜索高亮增强功能已启用，按 Ctrl/Cmd + F 开始搜索');
  });
} else {
  console.log('搜索高亮增强功能已启用，按 Ctrl/Cmd + F 开始搜索');
}

// ===== 导出 =====
if (typeof module !== 'undefined' && module.exports) {
  module.exports = SearchHighlightManager;
} 