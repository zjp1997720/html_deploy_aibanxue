/**
 * 智能搜索防抖优化器
 * Phase 3: 前端性能优化
 */

class SearchOptimizer {
  constructor(options = {}) {
    this.config = {
      // 基础防抖延迟（毫秒）
      baseDelay: 300,
      // 最小防抖延迟
      minDelay: 150,
      // 最大防抖延迟
      maxDelay: 1000,
      // 最小搜索字符数
      minChars: 2,
      // 缓存大小
      cacheSize: 50,
      // 搜索历史大小
      historySize: 20,
      // 是否启用智能延迟调整
      adaptiveDelay: true,
      // 是否启用搜索缓存
      enableCache: true,
      // 是否启用搜索历史
      enableHistory: true,
      // 是否启用结果高亮
      enableHighlight: true,
      // 搜索状态指示器选择器
      statusIndicator: null,
      // 自定义CSS类
      cssClasses: {
        loading: 'search-loading',
        highlight: 'search-highlight',
        suggestion: 'search-suggestion'
      },
      ...options
    };

    // 内部状态
    this.searchCache = new Map();
    this.searchHistory = [];
    this.currentTimeout = null;
    this.lastSearchTime = 0;
    this.searchSpeedHistory = [];
    this.isSearching = false;
    this.abortController = null;

    console.log('🔍 搜索优化器已初始化', this.config);
  }

  /**
   * 创建防抖搜索函数
   */
  createDebouncedSearch(searchFunction, inputElement, options = {}) {
    const config = { ...this.config, ...options };
    let lastValue = '';
    let searchStartTime = 0;

    return (value, forceImmediate = false) => {
      const currentTime = Date.now();
      
      // 清除之前的超时
      if (this.currentTimeout) {
        clearTimeout(this.currentTimeout);
        this.currentTimeout = null;
      }

      // 中止之前的请求
      if (this.abortController) {
        this.abortController.abort();
      }

      // 值未变化，不执行搜索
      if (value === lastValue && !forceImmediate) {
        return;
      }

      lastValue = value;

      // 空值或长度不足
      if (!value || value.length < config.minChars) {
        this.clearSearch();
        return;
      }

      // 检查缓存
      if (config.enableCache && this.searchCache.has(value)) {
        const cachedResult = this.searchCache.get(value);
        this.handleSearchResult(cachedResult, value, true);
        return;
      }

      // 计算智能延迟
      const delay = forceImmediate ? 0 : this.calculateDelay(currentTime);
      
      // 显示搜索状态
      this.showSearchStatus('searching');

      this.currentTimeout = setTimeout(async () => {
        try {
          searchStartTime = Date.now();
          this.isSearching = true;
          
          // 创建新的AbortController
          this.abortController = new AbortController();
          
          // 执行搜索
          const result = await searchFunction(value, {
            signal: this.abortController.signal
          });
          
          const searchTime = Date.now() - searchStartTime;
          this.recordSearchTime(searchTime);
          
          // 缓存结果
          if (config.enableCache) {
            this.cacheResult(value, result);
          }
          
          // 记录搜索历史
          if (config.enableHistory) {
            this.addToHistory(value);
          }
          
          this.handleSearchResult(result, value, false);
          
        } catch (error) {
          if (error.name !== 'AbortError') {
            console.error('搜索失败:', error);
            this.showSearchStatus('error');
          }
        } finally {
          this.isSearching = false;
          this.abortController = null;
        }
      }, delay);
    };
  }

  /**
   * 计算智能延迟
   */
  calculateDelay(currentTime) {
    if (!this.config.adaptiveDelay) {
      return this.config.baseDelay;
    }

    // 计算打字速度
    const timeSinceLastSearch = currentTime - this.lastSearchTime;
    this.lastSearchTime = currentTime;

    // 如果打字很快（间隔小于200ms），增加延迟
    if (timeSinceLastSearch < 200) {
      return Math.min(this.config.maxDelay, this.config.baseDelay * 1.5);
    }
    
    // 如果打字较慢，减少延迟
    if (timeSinceLastSearch > 800) {
      return Math.max(this.config.minDelay, this.config.baseDelay * 0.7);
    }

    return this.config.baseDelay;
  }

  /**
   * 记录搜索时间
   */
  recordSearchTime(searchTime) {
    this.searchSpeedHistory.push({
      time: searchTime,
      timestamp: Date.now()
    });

    // 保持最近20次记录
    if (this.searchSpeedHistory.length > 20) {
      this.searchSpeedHistory = this.searchSpeedHistory.slice(-20);
    }
  }

  /**
   * 缓存搜索结果
   */
  cacheResult(query, result) {
    // LRU缓存清理
    if (this.searchCache.size >= this.config.cacheSize) {
      const firstKey = this.searchCache.keys().next().value;
      this.searchCache.delete(firstKey);
    }

    this.searchCache.set(query, {
      result,
      timestamp: Date.now(),
      hits: 1
    });
  }

  /**
   * 添加到搜索历史
   */
  addToHistory(query) {
    // 移除重复项
    this.searchHistory = this.searchHistory.filter(item => item.query !== query);
    
    // 添加到开头
    this.searchHistory.unshift({
      query,
      timestamp: Date.now()
    });

    // 保持历史大小
    if (this.searchHistory.length > this.config.historySize) {
      this.searchHistory = this.searchHistory.slice(0, this.config.historySize);
    }

    // 保存到localStorage
    try {
      localStorage.setItem('searchHistory', JSON.stringify(this.searchHistory));
    } catch (e) {
      console.warn('无法保存搜索历史:', e);
    }
  }

  /**
   * 加载搜索历史
   */
  loadHistory() {
    try {
      const saved = localStorage.getItem('searchHistory');
      if (saved) {
        this.searchHistory = JSON.parse(saved);
      }
    } catch (e) {
      console.warn('无法加载搜索历史:', e);
      this.searchHistory = [];
    }
  }

  /**
   * 处理搜索结果
   */
  handleSearchResult(result, query, fromCache) {
    this.showSearchStatus('completed');
    
    if (this.config.enableHighlight) {
      this.highlightResults(result, query);
    }

    // 触发自定义事件
    window.dispatchEvent(new CustomEvent('searchCompleted', {
      detail: { result, query, fromCache }
    }));
  }

  /**
   * 高亮搜索结果
   */
  highlightResults(result, query) {
    if (!query || query.length < 2) return;

    const highlightClass = this.config.cssClasses.highlight;
    const regex = new RegExp(`(${this.escapeRegex(query)})`, 'gi');

    // 查找所有可能包含搜索结果的元素
    const resultElements = document.querySelectorAll('[data-searchable]');
    
    resultElements.forEach(element => {
      const originalText = element.textContent;
      const highlightedText = originalText.replace(regex, `<span class="${highlightClass}">$1</span>`);
      
      if (highlightedText !== originalText) {
        element.innerHTML = highlightedText;
      }
    });
  }

  /**
   * 清除搜索高亮
   */
  clearHighlight() {
    const highlightClass = this.config.cssClasses.highlight;
    const highlightedElements = document.querySelectorAll(`.${highlightClass}`);
    
    highlightedElements.forEach(element => {
      const parent = element.parentNode;
      parent.replaceChild(document.createTextNode(element.textContent), element);
      parent.normalize();
    });
  }

  /**
   * 显示搜索状态
   */
  showSearchStatus(status) {
    const indicator = this.config.statusIndicator 
      ? document.querySelector(this.config.statusIndicator) 
      : null;

    if (!indicator) return;

    indicator.className = `search-status ${status}`;
    
    switch (status) {
      case 'searching':
        indicator.innerHTML = '<i class="loading-spinner"></i> 搜索中...';
        indicator.style.display = 'block';
        break;
      case 'completed':
        indicator.innerHTML = '<i class="icon-check"></i> 搜索完成';
        setTimeout(() => {
          indicator.style.display = 'none';
        }, 1000);
        break;
      case 'error':
        indicator.innerHTML = '<i class="icon-error"></i> 搜索失败';
        setTimeout(() => {
          indicator.style.display = 'none';
        }, 3000);
        break;
      default:
        indicator.style.display = 'none';
    }
  }

  /**
   * 清除搜索
   */
  clearSearch() {
    this.clearHighlight();
    this.showSearchStatus('cleared');
    
    // 触发清除事件
    window.dispatchEvent(new CustomEvent('searchCleared'));
  }

  /**
   * 创建搜索建议
   */
  createSuggestions(inputElement, maxSuggestions = 5) {
    const suggestionsContainer = document.createElement('div');
    suggestionsContainer.className = 'search-suggestions';
    suggestionsContainer.style.display = 'none';
    
    inputElement.parentNode.appendChild(suggestionsContainer);

    inputElement.addEventListener('focus', () => {
      this.showSuggestions(suggestionsContainer, maxSuggestions);
    });

    inputElement.addEventListener('blur', () => {
      // 延迟隐藏，允许点击建议
      setTimeout(() => {
        suggestionsContainer.style.display = 'none';
      }, 200);
    });

    return suggestionsContainer;
  }

  /**
   * 显示搜索建议
   */
  showSuggestions(container, maxSuggestions) {
    if (this.searchHistory.length === 0) {
      container.style.display = 'none';
      return;
    }

    const suggestions = this.searchHistory
      .slice(0, maxSuggestions)
      .map(item => `
        <div class="${this.config.cssClasses.suggestion}" 
             onclick="selectSuggestion('${this.escapeHtml(item.query)}')">
          ${this.escapeHtml(item.query)}
          <small>${this.formatTime(item.timestamp)}</small>
        </div>
      `).join('');

    container.innerHTML = suggestions;
    container.style.display = 'block';
  }

  /**
   * 获取搜索统计
   */
  getStats() {
    const avgSearchTime = this.searchSpeedHistory.length > 0
      ? this.searchSpeedHistory.reduce((sum, item) => sum + item.time, 0) / this.searchSpeedHistory.length
      : 0;

    return {
      cacheSize: this.searchCache.size,
      cacheHitRate: this.calculateCacheHitRate(),
      historySize: this.searchHistory.length,
      averageSearchTime: Math.round(avgSearchTime),
      totalSearches: this.searchSpeedHistory.length,
      isSearching: this.isSearching,
      config: this.config
    };
  }

  /**
   * 计算缓存命中率
   */
  calculateCacheHitRate() {
    if (this.searchCache.size === 0) return 0;
    
    let totalHits = 0;
    let totalSearches = 0;
    
    for (const entry of this.searchCache.values()) {
      totalHits += entry.hits;
      totalSearches += entry.hits;
    }
    
    return totalSearches > 0 ? (totalHits / totalSearches) * 100 : 0;
  }

  /**
   * 工具函数
   */
  escapeRegex(string) {
    return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }

  escapeHtml(string) {
    const div = document.createElement('div');
    div.textContent = string;
    return div.innerHTML;
  }

  formatTime(timestamp) {
    const now = Date.now();
    const diff = now - timestamp;
    
    if (diff < 60000) return '刚刚';
    if (diff < 3600000) return `${Math.floor(diff / 60000)}分钟前`;
    if (diff < 86400000) return `${Math.floor(diff / 3600000)}小时前`;
    return `${Math.floor(diff / 86400000)}天前`;
  }

  /**
   * 清理资源
   */
  destroy() {
    if (this.currentTimeout) {
      clearTimeout(this.currentTimeout);
    }
    
    if (this.abortController) {
      this.abortController.abort();
    }

    this.searchCache.clear();
    console.log('🔍 搜索优化器已销毁');
  }
}

// 全局搜索优化器实例
window.SearchOptimizer = SearchOptimizer;

// 导出便捷函数
window.createSearchOptimizer = function(options) {
  return new SearchOptimizer(options);
};

// 为页面管理创建专用的搜索优化器
window.createPagesSearchOptimizer = function() {
  return new SearchOptimizer({
    minChars: 1,
    baseDelay: 400,
    enableHistory: true,
    enableCache: true,
    enableHighlight: true,
    statusIndicator: '#searchStatus',
    cssClasses: {
      loading: 'search-loading',
      highlight: 'text-highlight',
      suggestion: 'search-suggestion-item'
    }
  });
};

console.log('✅ 搜索优化器模块已加载'); 