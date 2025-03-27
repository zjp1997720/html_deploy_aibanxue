document.addEventListener('DOMContentLoaded', () => {
  // 检查是否是密码页面
  const isPasswordPage = document.documentElement.getAttribute('data-page') === 'password-page';
  
  // 检查本地存储中的主题设置
  const savedTheme = localStorage.getItem('theme');
  const prefersDarkScheme = window.matchMedia('(prefers-color-scheme: dark)').matches;
  
  // 设置初始主题 - 默认使用深色模式
  let currentTheme;
  if (savedTheme === 'light') {
    document.documentElement.setAttribute('data-theme', 'light');
    currentTheme = 'light';
  } else {
    // 默认使用深色模式
    document.documentElement.setAttribute('data-theme', 'dark');
    currentTheme = 'dark';
    // 如果没有保存过主题设置，将深色模式保存到本地存储
    if (!savedTheme) {
      localStorage.setItem('theme', 'dark');
    }
  }
  
  // 如果是密码页面，不添加主题切换按钮
  if (isPasswordPage) {
    return;
  }
  
  // 创建并添加主题切换按钮
  if (!document.getElementById('theme-toggle-btn')) {
    const themeToggleBtn = document.createElement('button');
    themeToggleBtn.id = 'theme-toggle-btn';
    themeToggleBtn.className = 'theme-toggle';
    // 按照设计惯例，图标应该表示“点击后将变成什么”
    // 亮色模式下显示月亮（点击后切换到暗色）
    // 暗色模式下显示太阳（点击后切换到亮色）
    themeToggleBtn.innerHTML = '<i class="fas ' + (currentTheme === 'light' ? 'fa-moon' : 'fa-sun') + '"></i>';
    document.body.appendChild(themeToggleBtn);
  }
  
  const themeToggleBtn = document.getElementById('theme-toggle-btn');
  const themeIcon = themeToggleBtn.querySelector('i');
  
  // 主题切换事件
  themeToggleBtn.addEventListener('click', () => {
    const currentTheme = document.documentElement.getAttribute('data-theme') || 'dark';
    const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
    
    // 更新 DOM
    document.documentElement.setAttribute('data-theme', newTheme);
    
    // 更新图标 - 图标表示“点击后将变成什么”
    if (newTheme === 'light') {
      // 当前是亮色模式，显示月亮图标（点击后切换到暗色）
      themeIcon.classList.remove('fa-sun');
      themeIcon.classList.add('fa-moon');
    } else {
      // 当前是暗色模式，显示太阳图标（点击后切换到亮色）
      themeIcon.classList.remove('fa-moon');
      themeIcon.classList.add('fa-sun');
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
