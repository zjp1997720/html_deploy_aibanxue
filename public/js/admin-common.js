/**
 * 管理后台通用JavaScript功能
 */

class AdminApp {
    constructor() {
        this.init();
    }

    init() {
        this.bindEvents();
        this.initResponsive();
        this.initTooltips();
        console.log('🚀 HTML-GO Admin initialized');
    }

    /**
     * 绑定事件
     */
    bindEvents() {
        // 侧边栏切换
        const sidebarToggle = document.getElementById('sidebarToggle');
        const sidebar = document.getElementById('sidebar');
        const mainContent = document.getElementById('mainContent');
        const mobileOverlay = document.getElementById('mobileOverlay');

        if (sidebarToggle && sidebar) {
            sidebarToggle.addEventListener('click', () => {
                this.toggleSidebar();
            });
        }

        // 移动端遮罩点击
        if (mobileOverlay) {
            mobileOverlay.addEventListener('click', () => {
                this.closeSidebar();
            });
        }

        // ESC键关闭侧边栏
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                this.closeSidebar();
            }
        });

        // 导航链接点击效果
        document.querySelectorAll('.nav-link').forEach(link => {
            link.addEventListener('click', (e) => {
                // 移除其他active状态
                document.querySelectorAll('.nav-link').forEach(l => l.classList.remove('active'));
                // 添加当前active状态
                link.classList.add('active');
            });
        });
    }

    /**
     * 初始化响应式功能
     */
    initResponsive() {
        const mediaQuery = window.matchMedia('(max-width: 768px)');
        
        const handleMediaChange = (e) => {
            if (!e.matches) {
                // 桌面端，确保侧边栏显示
                this.showSidebar();
                this.hideMobileOverlay();
            } else {
                // 移动端，隐藏侧边栏
                this.closeSidebar();
            }
        };

        mediaQuery.addListener(handleMediaChange);
        handleMediaChange(mediaQuery);
    }

    /**
     * 初始化工具提示
     */
    initTooltips() {
        document.querySelectorAll('[title]').forEach(element => {
            element.addEventListener('mouseenter', (e) => {
                this.showTooltip(e.target, e.target.getAttribute('title'));
            });
            
            element.addEventListener('mouseleave', () => {
                this.hideTooltip();
            });
        });
    }

    /**
     * 切换侧边栏
     */
    toggleSidebar() {
        const sidebar = document.getElementById('sidebar');
        const mobileOverlay = document.getElementById('mobileOverlay');
        
        if (window.innerWidth <= 768) {
            // 移动端
            if (sidebar.classList.contains('mobile-open')) {
                this.closeSidebar();
            } else {
                this.openSidebar();
            }
        }
    }

    /**
     * 打开侧边栏（移动端）
     */
    openSidebar() {
        const sidebar = document.getElementById('sidebar');
        const mobileOverlay = document.getElementById('mobileOverlay');
        
        if (sidebar) sidebar.classList.add('mobile-open');
        if (mobileOverlay) mobileOverlay.classList.add('show');
        
        // 防止背景滚动
        document.body.style.overflow = 'hidden';
    }

    /**
     * 关闭侧边栏
     */
    closeSidebar() {
        const sidebar = document.getElementById('sidebar');
        const mobileOverlay = document.getElementById('mobileOverlay');
        
        if (sidebar) sidebar.classList.remove('mobile-open');
        this.hideMobileOverlay();
        
        // 恢复背景滚动
        document.body.style.overflow = '';
    }

    /**
     * 显示侧边栏（桌面端）
     */
    showSidebar() {
        const sidebar = document.getElementById('sidebar');
        if (sidebar) {
            sidebar.style.transform = 'translateX(0)';
        }
    }

    /**
     * 隐藏移动端遮罩
     */
    hideMobileOverlay() {
        const mobileOverlay = document.getElementById('mobileOverlay');
        if (mobileOverlay) mobileOverlay.classList.remove('show');
    }

    /**
     * 显示通知
     */
    static showNotification(message, type = 'info', duration = 3000) {
        const notification = document.createElement('div');
        notification.className = `notification notification-${type}`;
        notification.innerHTML = `
            <div class="notification-content">
                <span class="notification-icon">${this.getNotificationIcon(type)}</span>
                <span class="notification-message">${message}</span>
            </div>
        `;
        
        document.body.appendChild(notification);
        
        // 自动移除
        setTimeout(() => {
            notification.style.animation = 'slideOutRight 0.3s ease-out';
            setTimeout(() => {
                if (notification.parentNode) {
                    notification.parentNode.removeChild(notification);
                }
            }, 300);
        }, duration);
        
        // 点击关闭
        notification.addEventListener('click', () => {
            notification.style.animation = 'slideOutRight 0.3s ease-out';
            setTimeout(() => {
                if (notification.parentNode) {
                    notification.parentNode.removeChild(notification);
                }
            }, 300);
        });
        
        return notification;
    }

    /**
     * 获取通知图标
     */
    static getNotificationIcon(type) {
        const icons = {
            success: '✅',
            warning: '⚠️',
            error: '❌',
            info: 'ℹ️'
        };
        return icons[type] || icons.info;
    }

    /**
     * 确认对话框
     */
    static confirmAction(message, title = '确认操作') {
        return confirm(`${title}\n\n${message}`);
    }

    /**
     * HTTP请求工具
     */
    static async request(url, options = {}) {
        const defaultOptions = {
            headers: {
                'Content-Type': 'application/json',
            },
        };

        const mergedOptions = {
            ...defaultOptions,
            ...options,
            headers: {
                ...defaultOptions.headers,
                ...options.headers,
            },
        };

        try {
            const response = await fetch(url, mergedOptions);
            
            if (!response.ok) {
                let errorMessage = `HTTP ${response.status}`;
                try {
                    const errorData = await response.json();
                    errorMessage = errorData.error?.message || errorData.error || errorMessage;
                } catch (e) {
                    errorMessage = await response.text() || errorMessage;
                }
                throw new Error(errorMessage);
            }
            
            const contentType = response.headers.get('content-type');
            if (contentType && contentType.includes('application/json')) {
                return await response.json();
            } else {
                return await response.text();
            }
        } catch (error) {
            console.error('Request failed:', error);
            throw error;
        }
    }

    /**
     * 显示工具提示
     */
    showTooltip(element, text) {
        this.hideTooltip(); // 先隐藏现有的
        
        const tooltip = document.createElement('div');
        tooltip.className = 'tooltip';
        tooltip.textContent = text;
        tooltip.id = 'admin-tooltip';
        
        document.body.appendChild(tooltip);
        
        const rect = element.getBoundingClientRect();
        const tooltipRect = tooltip.getBoundingClientRect();
        
        let top = rect.top - tooltipRect.height - 8;
        let left = rect.left + (rect.width - tooltipRect.width) / 2;
        
        // 边界检查
        if (top < 0) {
            top = rect.bottom + 8;
        }
        if (left < 0) {
            left = 8;
        }
        if (left + tooltipRect.width > window.innerWidth) {
            left = window.innerWidth - tooltipRect.width - 8;
        }
        
        tooltip.style.position = 'fixed';
        tooltip.style.top = top + 'px';
        tooltip.style.left = left + 'px';
        tooltip.style.zIndex = '9999';
    }

    /**
     * 隐藏工具提示
     */
    hideTooltip() {
        const tooltip = document.getElementById('admin-tooltip');
        if (tooltip) {
            tooltip.remove();
        }
    }

    /**
     * 复制文本到剪贴板
     */
    static async copyToClipboard(text) {
        try {
            await navigator.clipboard.writeText(text);
            this.showNotification('已复制到剪贴板', 'success');
            return true;
        } catch (error) {
            console.error('复制失败:', error);
            // 回退方案
            const textArea = document.createElement('textarea');
            textArea.value = text;
            document.body.appendChild(textArea);
            textArea.select();
            try {
                document.execCommand('copy');
                this.showNotification('已复制到剪贴板', 'success');
                return true;
            } catch (e) {
                this.showNotification('复制失败', 'error');
                return false;
            } finally {
                document.body.removeChild(textArea);
            }
        }
    }

    /**
     * 格式化日期
     */
    static formatDate(date, format = 'YYYY-MM-DD HH:mm:ss') {
        const d = new Date(date);
        if (isNaN(d)) return '无效日期';
        
        const year = d.getFullYear();
        const month = String(d.getMonth() + 1).padStart(2, '0');
        const day = String(d.getDate()).padStart(2, '0');
        const hours = String(d.getHours()).padStart(2, '0');
        const minutes = String(d.getMinutes()).padStart(2, '0');
        const seconds = String(d.getSeconds()).padStart(2, '0');
        
        return format
            .replace('YYYY', year)
            .replace('MM', month)
            .replace('DD', day)
            .replace('HH', hours)
            .replace('mm', minutes)
            .replace('ss', seconds);
    }

    /**
     * 格式化文件大小
     */
    static formatFileSize(bytes) {
        if (bytes === 0) return '0 B';
        
        const k = 1024;
        const sizes = ['B', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }

    /**
     * 防抖函数
     */
    static debounce(func, wait, immediate = false) {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                timeout = null;
                if (!immediate) func(...args);
            };
            const callNow = immediate && !timeout;
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
            if (callNow) func(...args);
        };
    }

    /**
     * 节流函数
     */
    static throttle(func, limit) {
        let inThrottle;
        return function() {
            const args = arguments;
            const context = this;
            if (!inThrottle) {
                func.apply(context, args);
                inThrottle = true;
                setTimeout(() => inThrottle = false, limit);
            }
        };
    }
}

/**
 * 分页组件
 */
class Pagination {
    constructor(container, options = {}) {
        this.container = typeof container === 'string' ? document.getElementById(container) : container;
        this.options = {
            page: 1,
            totalPages: 1,
            showPages: 5,
            showFirstLast: true,
            showPrevNext: true,
            onPageChange: () => {},
            ...options
        };
        
        if (this.container) {
            this.render();
        }
    }

    render() {
        if (!this.container) return;
        
        const { page, totalPages, showPages, showFirstLast, showPrevNext } = this.options;
        
        if (totalPages <= 1) {
            this.container.innerHTML = '';
            return;
        }
        
        let html = '<div class="pagination-controls">';
        
        // 首页
        if (showFirstLast && page > 1) {
            html += `<button class="pagination-btn" data-page="1">首页</button>`;
        }
        
        // 上一页
        if (showPrevNext && page > 1) {
            html += `<button class="pagination-btn" data-page="${page - 1}">上一页</button>`;
        }
        
        // 页码
        const startPage = Math.max(1, page - Math.floor(showPages / 2));
        const endPage = Math.min(totalPages, startPage + showPages - 1);
        
        if (startPage > 1) {
            html += `<button class="pagination-btn" data-page="1">1</button>`;
            if (startPage > 2) {
                html += `<span class="pagination-ellipsis">...</span>`;
            }
        }
        
        for (let i = startPage; i <= endPage; i++) {
            const active = i === page ? 'active' : '';
            html += `<button class="pagination-btn ${active}" data-page="${i}">${i}</button>`;
        }
        
        if (endPage < totalPages) {
            if (endPage < totalPages - 1) {
                html += `<span class="pagination-ellipsis">...</span>`;
            }
            html += `<button class="pagination-btn" data-page="${totalPages}">${totalPages}</button>`;
        }
        
        // 下一页
        if (showPrevNext && page < totalPages) {
            html += `<button class="pagination-btn" data-page="${page + 1}">下一页</button>`;
        }
        
        // 末页
        if (showFirstLast && page < totalPages) {
            html += `<button class="pagination-btn" data-page="${totalPages}">末页</button>`;
        }
        
        html += '</div>';
        
        this.container.innerHTML = html;
        
        // 绑定事件
        this.container.querySelectorAll('.pagination-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const newPage = parseInt(e.target.dataset.page);
                if (newPage !== page) {
                    this.options.onPageChange(newPage);
                }
            });
        });
    }

    updatePage(page, totalPages) {
        this.options.page = page;
        if (totalPages !== undefined) {
            this.options.totalPages = totalPages;
        }
        this.render();
    }
}

// 页面加载完成后初始化
document.addEventListener('DOMContentLoaded', () => {
    window.adminApp = new AdminApp();
});

// 全局暴露工具函数
window.AdminApp = AdminApp;
window.Pagination = Pagination; 