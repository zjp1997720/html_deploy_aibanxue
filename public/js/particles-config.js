document.addEventListener('DOMContentLoaded', () => {
  // 性能优化 - 使用 requestAnimationFrame
  let rafId = null;
  let particlesArray = [];
  let mouseX = 0;
  let mouseY = 0;
  let isMouseMoving = false;
  
  // 创建浮动粒子
  function createParticles() {
    const container = document.getElementById('particles-js');
    if (!container) return;
    
    // 清空现有粒子
    container.innerHTML = '';
    particlesArray = [];
    
    // 根据屏幕大小调整粒子数量 - 增加粒子数量
    const particleCount = window.innerWidth < 768 ? 15 : 30;
    const fragment = document.createDocumentFragment();
    
    for (let i = 0; i < particleCount; i++) {
      const particle = document.createElement('div');
      particle.classList.add('particle');
      
      // 随机大小 - 更大范围的变化
      const size = Math.random() * 12 + 2;
      particle.style.width = `${size}px`;
      particle.style.height = `${size}px`;
      
      // 随机位置 - 更均匀分布
      const posX = Math.random() * 100;
      const posY = Math.random() * 100;
      particle.style.left = `${posX}%`;
      particle.style.top = `${posY}%`;
      
      // 随机颜色 - 使用CSS变量和渐变
      const colors = ['var(--primary)', 'var(--accent)', 'var(--secondary)'];
      const color = colors[Math.floor(Math.random() * colors.length)];
      
      // 随机添加渐变效果
      if (Math.random() > 0.7) {
        const secondColor = colors[Math.floor(Math.random() * colors.length)];
        const angle = Math.floor(Math.random() * 360);
        particle.style.background = `linear-gradient(${angle}deg, ${color}, ${secondColor})`;
      } else {
        particle.style.background = color;
      }
      
      // 随机不透明度 - 增加最大不透明度
      const opacity = Math.random() * 0.4 + 0.1;
      particle.style.opacity = opacity;
      
      // 随机动画延迟
      const delay = Math.random() * 5;
      particle.style.animationDelay = `${delay}s`;
      
      // 随机动画持续时间
      const duration = Math.random() * 15 + 15;
      particle.style.animationDuration = `${duration}s`;
      
      // 随机模糊效果 - 增加模糊概率和范围
      if (Math.random() > 0.5) {
        particle.style.filter = `blur(${Math.random() * 3 + 1}px)`;
      }
      
      // 随机添加阴影效果
      if (Math.random() > 0.8) {
        const shadowColor = color.replace(')', ', 0.5)').replace('var', 'rgba');
        particle.style.boxShadow = `0 0 ${Math.random() * 10 + 5}px ${shadowColor}`;
      }
      
      // 随机形状 - 添加圆形和其他形状
      if (Math.random() > 0.7) {
        particle.style.borderRadius = '50%';
      } else if (Math.random() > 0.5) {
        particle.style.borderRadius = `${Math.random() * 40 + 10}% ${Math.random() * 40 + 10}% ${Math.random() * 40 + 10}% ${Math.random() * 40 + 10}%`;
      }
      
      // 存储粒子初始位置用于鼠标交互
      particle.dataset.initialX = posX;
      particle.dataset.initialY = posY;
      
      fragment.appendChild(particle);
      particlesArray.push(particle);
    }
    
    container.appendChild(fragment);
    
    // 添加连接线效果
    if (window.innerWidth >= 768) {
      createConnectingLines(container);
    }
  }
  
  // 创建粒子之间的连接线
  function createConnectingLines(container) {
    const canvas = document.createElement('canvas');
    canvas.classList.add('particles-canvas');
    canvas.style.position = 'absolute';
    canvas.style.top = '0';
    canvas.style.left = '0';
    canvas.style.width = '100%';
    canvas.style.height = '100%';
    canvas.style.pointerEvents = 'none';
    canvas.style.zIndex = '1';
    container.appendChild(canvas);
    
    function resizeCanvas() {
      canvas.width = container.offsetWidth;
      canvas.height = container.offsetHeight;
    }
    
    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);
    
    const ctx = canvas.getContext('2d');
    
    function drawLines() {
      if (!ctx) return;
      
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      
      // 获取当前主题
      const isLight = document.documentElement.getAttribute('data-theme') === 'light';
      const lineColor = isLight ? 'rgba(79, 70, 229, 0.1)' : 'rgba(99, 102, 241, 0.1)';
      
      for (let i = 0; i < particlesArray.length; i++) {
        const p1 = particlesArray[i];
        const p1Rect = p1.getBoundingClientRect();
        const containerRect = container.getBoundingClientRect();
        
        const p1x = p1Rect.left + p1Rect.width / 2 - containerRect.left;
        const p1y = p1Rect.top + p1Rect.height / 2 - containerRect.top;
        
        for (let j = i + 1; j < particlesArray.length; j++) {
          const p2 = particlesArray[j];
          const p2Rect = p2.getBoundingClientRect();
          
          const p2x = p2Rect.left + p2Rect.width / 2 - containerRect.left;
          const p2y = p2Rect.top + p2Rect.height / 2 - containerRect.top;
          
          const distance = Math.sqrt(Math.pow(p2x - p1x, 2) + Math.pow(p2y - p1y, 2));
          const maxDistance = 150;
          
          if (distance < maxDistance) {
            ctx.beginPath();
            ctx.moveTo(p1x, p1y);
            ctx.lineTo(p2x, p2y);
            ctx.strokeStyle = lineColor;
            ctx.globalAlpha = 1 - (distance / maxDistance);
            ctx.lineWidth = 0.5;
            ctx.stroke();
          }
        }
      }
      
      requestAnimationFrame(drawLines);
    }
    
    drawLines();
  }
  
  // 鼠标交互效果
  function setupMouseInteraction() {
    const container = document.getElementById('particles-js');
    if (!container) return;
    
    container.addEventListener('mousemove', (e) => {
      const rect = container.getBoundingClientRect();
      mouseX = ((e.clientX - rect.left) / rect.width) * 100;
      mouseY = ((e.clientY - rect.top) / rect.height) * 100;
      isMouseMoving = true;
      
      // 设置一个定时器，如果鼠标停止移动，则重置标志
      clearTimeout(container.mouseTimeout);
      container.mouseTimeout = setTimeout(() => {
        isMouseMoving = false;
      }, 100);
    });
    
    function animateParticles() {
      if (isMouseMoving && particlesArray.length > 0) {
        particlesArray.forEach(particle => {
          const initialX = parseFloat(particle.dataset.initialX);
          const initialY = parseFloat(particle.dataset.initialY);
          
          // 计算粒子与鼠标的距离
          const dx = mouseX - initialX;
          const dy = mouseY - initialY;
          const distance = Math.sqrt(dx * dx + dy * dy);
          
          // 影响范围
          const maxDistance = 30;
          
          if (distance < maxDistance) {
            // 计算排斥力 - 鼠标接近时粒子会远离
            const force = (maxDistance - distance) / maxDistance;
            const angle = Math.atan2(dy, dx);
            
            // 新位置 - 从鼠标位置反方向移动
            const newX = initialX - Math.cos(angle) * force * 15;
            const newY = initialY - Math.sin(angle) * force * 15;
            
            // 应用新位置
            particle.style.left = `${newX}%`;
            particle.style.top = `${newY}%`;
          } else {
            // 如果超出影响范围，逐渐回到初始位置
            const currentX = parseFloat(particle.style.left);
            const currentY = parseFloat(particle.style.top);
            
            if (currentX !== initialX || currentY !== initialY) {
              const returnX = currentX + (initialX - currentX) * 0.05;
              const returnY = currentY + (initialY - currentY) * 0.05;
              
              particle.style.left = `${returnX}%`;
              particle.style.top = `${returnY}%`;
            }
          }
        });
      } else if (particlesArray.length > 0) {
        // 鼠标不动时，粒子回到原位
        particlesArray.forEach(particle => {
          const initialX = parseFloat(particle.dataset.initialX);
          const initialY = parseFloat(particle.dataset.initialY);
          const currentX = parseFloat(particle.style.left);
          const currentY = parseFloat(particle.style.top);
          
          if (Math.abs(currentX - initialX) > 0.1 || Math.abs(currentY - initialY) > 0.1) {
            const returnX = currentX + (initialX - currentX) * 0.05;
            const returnY = currentY + (initialY - currentY) * 0.05;
            
            particle.style.left = `${returnX}%`;
            particle.style.top = `${returnY}%`;
          }
        });
      }
      
      requestAnimationFrame(animateParticles);
    }
    
    animateParticles();
  }
  
  // 根据主题更新粒子颜色
  function updateParticlesForTheme(isLight) {
    const particles = document.querySelectorAll('.particle');
    particles.forEach(particle => {
      // 随机选择颜色
      const colors = ['var(--primary)', 'var(--accent)', 'var(--secondary)'];
      const color = colors[Math.floor(Math.random() * colors.length)];
      
      // 随机添加渐变效果
      if (Math.random() > 0.7) {
        const secondColor = colors[Math.floor(Math.random() * colors.length)];
        const angle = Math.floor(Math.random() * 360);
        particle.style.background = `linear-gradient(${angle}deg, ${color}, ${secondColor})`;
      } else {
        particle.style.background = color;
      }
      
      // 根据主题调整不透明度
      const opacity = isLight ? (Math.random() * 0.3 + 0.1) : (Math.random() * 0.4 + 0.1);
      particle.style.opacity = opacity;
      
      // 随机添加阴影效果
      if (Math.random() > 0.8) {
        const shadowColor = color.replace(')', ', 0.5)').replace('var', 'rgba');
        particle.style.boxShadow = `0 0 ${Math.random() * 10 + 5}px ${shadowColor}`;
      } else {
        particle.style.boxShadow = 'none';
      }
    });
  }
  
  // 添加动态标题效果
  function enhanceTitleEffect() {
    const titleContainer = document.querySelector('.title-container');
    if (!titleContainer) return;
    
    // 确保标题容器有相对定位
    titleContainer.style.position = 'relative';
    titleContainer.style.display = 'inline-block';
    
    // 获取标题文本
    const titleElement = titleContainer.querySelector('.cyber-title');
    if (!titleElement) return;
    
    // 添加打字机效果
    setTimeout(() => {
      const appDescription = document.querySelector('.app-description');
      if (appDescription) {
        appDescription.classList.add('fade-in');
      }
    }, 500);
  }
  
  // 使用 requestAnimationFrame 创建粒子
  function initParticles() {
    cancelAnimationFrame(rafId);
    rafId = requestAnimationFrame(() => {
      createParticles();
      enhanceTitleEffect();
      setupMouseInteraction();
    });
  }
  
  // 初始化粒子
  initParticles();
  
  // 窗口大小变化时重新创建粒子
  let resizeTimeout;
  window.addEventListener('resize', () => {
    clearTimeout(resizeTimeout);
    resizeTimeout = setTimeout(() => {
      initParticles();
    }, 200);
  });
  
  // 监听主题变化
  const themeToggleBtn = document.getElementById('theme-toggle-btn');
  if (themeToggleBtn) {
    themeToggleBtn.addEventListener('click', () => {
      const isLight = document.documentElement.getAttribute('data-theme') === 'light';
      updateParticlesForTheme(isLight);
      
      // 添加反馈动画
      themeToggleBtn.classList.add('success-pulse');
      setTimeout(() => {
        themeToggleBtn.classList.remove('success-pulse');
      }, 500);
    });
  }
  
  // 初始检查主题
  const isLight = document.documentElement.getAttribute('data-theme') === 'light';
  updateParticlesForTheme(isLight);
});
