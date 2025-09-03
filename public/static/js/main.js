// HTML-GO 主JavaScript文件

// 页面加载完成后执行
document.addEventListener('DOMContentLoaded', function() {
  console.log('HTML-GO initialized');
  
  // 初始化所有功能
  initializeApp();
});

function initializeApp() {
  // 检测并初始化各种功能
  initializeTooltips();
  initializeAnimations();
  initializeEventListeners();
}

// 初始化工具提示
function initializeTooltips() {
  const tooltips = document.querySelectorAll('[data-tooltip]');
  tooltips.forEach(element => {
    element.addEventListener('mouseenter', function() {
      const tooltip = document.createElement('div');
      tooltip.className = 'tooltip';
      tooltip.textContent = this.getAttribute('data-tooltip');
      document.body.appendChild(tooltip);
      
      const rect = this.getBoundingClientRect();
      tooltip.style.position = 'absolute';
      tooltip.style.left = rect.left + 'px';
      tooltip.style.top = (rect.top - tooltip.offsetHeight - 5) + 'px';
      tooltip.style.zIndex = '1000';
      
      this._tooltip = tooltip;
    });
    
    element.addEventListener('mouseleave', function() {
      if (this._tooltip) {
        this._tooltip.remove();
        delete this._tooltip;
      }
    });
  });
}

// 初始化动画
function initializeAnimations() {
  // 添加滚动动画
  const observerOptions = {
    threshold: 0.1,
    rootMargin: '0px 0px -50px 0px'
  };
  
  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('animate-in');
      }
    });
  }, observerOptions);
  
  // 观察需要动画的元素
  document.querySelectorAll('.card, .section-title').forEach(el => {
    observer.observe(el);
  });
}

// 初始化事件监听器
function initializeEventListeners() {
  // 初始化所有按钮的点击效果
  const buttons = document.querySelectorAll('button');
  buttons.forEach(button => {
    button.addEventListener('click', function() {
      this.style.transform = 'scale(0.95)';
      setTimeout(() => {
        this.style.transform = 'scale(1)';
      }, 100);
    });
  });
}