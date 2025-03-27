document.addEventListener('DOMContentLoaded', () => {
  const themeToggleBtn = document.getElementById('theme-toggle-btn');
  const themeIcon = themeToggleBtn.querySelector('i');
  
  // 检查本地存储中的主题设置
  const savedTheme = localStorage.getItem('theme');
  const prefersDarkScheme = window.matchMedia('(prefers-color-scheme: dark)').matches;
  
  // 设置初始主题
  if (savedTheme === 'light') {
    document.documentElement.setAttribute('data-theme', 'light');
    themeIcon.classList.remove('fa-moon');
    themeIcon.classList.add('fa-sun');
  } else if (savedTheme === 'dark' || prefersDarkScheme || !savedTheme) {
    document.documentElement.setAttribute('data-theme', 'dark');
    themeIcon.classList.remove('fa-sun');
    themeIcon.classList.add('fa-moon');
  }
  
  // 主题切换事件
  themeToggleBtn.addEventListener('click', () => {
    const currentTheme = document.documentElement.getAttribute('data-theme') || 'dark';
    const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
    
    // 更新 DOM
    document.documentElement.setAttribute('data-theme', newTheme);
    
    // 更新图标
    if (newTheme === 'light') {
      themeIcon.classList.remove('fa-moon');
      themeIcon.classList.add('fa-sun');
    } else {
      themeIcon.classList.remove('fa-sun');
      themeIcon.classList.add('fa-moon');
    }
    
    // 保存到本地存储
    localStorage.setItem('theme', newTheme);
    
    // 触发主题变更事件，用于更新其他组件
    const themeChangeEvent = new CustomEvent('themeChange', {
      detail: { theme: newTheme }
    });
    document.dispatchEvent(themeChangeEvent);
  });
});
