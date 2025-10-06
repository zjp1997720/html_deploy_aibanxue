# 物理交互式课件提示词（few-shot 合规版，三段 CDN + Chart.js/Matter.js 兜底 + 统一初始化）

## 目标
- 面向中国大陆教学场景，强调可用性与稳定性。

## 技术规范（强约束）
- 使用 HTML5、CSS3 和必要的 JavaScript。
- 所有第三方资源必须提供三段 CDN：BootCDN（主）→ jsDelivr（第一备）→ cdnjs（第二备）。
- 禁止使用依赖 Google 的资源（fonts.googleapis.com、fonts.gstatic.com）；禁止使用 cdn.tailwindcss.com。
- 必须使用 Bootstrap 5 与 Font Awesome（主链为 BootCDN，注释中列出备链）。
- 必须使用 Chart.js 4.4.1（曲线与数据可视化）与 Matter.js 0.19.0（2D 物理引擎），两者均需运行时兜底回退。
- 禁止内联 on* 事件，统一入口函数 initInteractiveModules() 绑定交互。
- 允许在文档底部放置少量内联初始化脚本块（需保留函数级注释），以适配单文件/离线场景。
- CSP 友好基线：script-src 'self' 'unsafe-inline' https: data: blob:；style-src 'self' 'unsafe-inline' https: data: blob:；font-src 'self' https: data: blob:

## 输出要求
- 仅输出完整 HTML；单一文件即可运行。
- 必须保留合规标记与 JSON 自检块，便于后置自动校验。

## few-shot 正例（请严格遵循结构与锚点）

<!-- COMPLIANCE: triple-cdn + chartjs@4.4.1 + matter@0.19.0 + initInteractiveModules -->
<link rel="stylesheet" href="https://cdn.bootcdn.net/ajax/libs/bootstrap/5.3.3/css/bootstrap.min.css" data-cdn-name="bootcdn-bootstrap">
<link rel="stylesheet" href="https://cdn.bootcdn.net/ajax/libs/font-awesome/6.5.1/css/all.min.css" data-cdn-name="bootcdn-fa">
<!-- 备链（部署端选择，不做 onerror 回退）
Bootstrap 备链1: https://cdn.jsdelivr.net/npm/bootstrap@5.3.3/dist/css/bootstrap.min.css
Bootstrap 备链2: https://cdnjs.cloudflare.com/ajax/libs/bootstrap/5.3.3/css/bootstrap.min.css
FA 备链1: https://cdn.jsdelivr.net/npm/@fortawesome/fontawesome-free@6.5.1/css/all.min.css
FA 备链2: https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.1/css/all.min.css -->

<!-- 核心库主链（BootCDN） -->
<script src="https://cdn.bootcdn.net/ajax/libs/Chart.js/4.4.1/chart.umd.min.js" data-cdn-name="bootcdn-chart"></script>
<script src="https://cdn.bootcdn.net/ajax/libs/matter-js/0.19.0/matter.min.js" data-cdn-name="bootcdn-matter"></script>

<!-- 自检清单 -->
<script type="application/json" id="compliance">
{ "tripleCdn": true, "chartJs": "4.4.1", "matterJs": "0.19.0", "init": "initInteractiveModules" }
</script>

<main class="container my-4">
  <h1 class="h5 mb-3">斜抛 / 碰撞 / 简谐振动 交互示例（轻量模板）</h1>
  <div class="row g-3">
    <div class="col-12 col-md-4">
      <label for="mass" class="form-label">质量 kg <span id="massVal" class="text-primary fw-semibold">1.00</span></label>
      <input id="mass" type="range" class="form-range" min="0.1" max="5" step="0.1" value="1">
      <label for="k" class="form-label mt-3">弹性系数 <span id="kVal" class="text-primary fw-semibold">10.0</span></label>
      <input id="k" type="range" class="form-range" min="1" max="50" step="1" value="10">
    </div>
    <div class="col-12 col-md-8">
      <canvas id="simChart" height="180"></canvas>
      <div class="border rounded mt-3 p-3">
        <div id="simCanvas" style="width:100%;height:220px;background:#fff;border:1px solid #e5e7eb"></div>
      </div>
    </div>
  </div>
</main>

<script>
/**
 * 保证 Chart.js 已加载；若主链失败则依次注入备链。
 * @returns {Promise<boolean>} 是否最终可用
 */
async function ensureChartLoaded() {
  if (window.Chart) return true;
  const fallbacks = [
    'https://cdn.jsdelivr.net/npm/chart.js@4.4.1/dist/chart.umd.min.js',
    'https://cdnjs.cloudflare.com/ajax/libs/Chart.js/4.4.1/chart.umd.min.js'
  ];
  for (const url of fallbacks) {
    await new Promise((resolve) => { const s=document.createElement('script'); s.src=url; s.onload=resolve; s.onerror=resolve; document.head.appendChild(s); });
    if (window.Chart) return true;
  }
  return false;
}

/**
 * 保证 Matter.js 已加载；若主链失败则依次注入备链。
 * @returns {Promise<boolean>} 是否最终可用
 */
async function ensureMatterLoaded() {
  if (window.Matter) return true;
  const fallbacks = [
    'https://cdn.jsdelivr.net/npm/matter-js@0.19.0/build/matter.min.js',
    'https://cdnjs.cloudflare.com/ajax/libs/matter-js/0.19.0/matter.min.js'
  ];
  for (const url of fallbacks) {
    await new Promise((resolve) => { const s=document.createElement('script'); s.src=url; s.onload=resolve; s.onerror=resolve; document.head.appendChild(s); });
    if (window.Matter) return true;
  }
  return false;
}

/**
 * 统一初始化入口：绑定交互、启动物理世界、绘制曲线。
 */
async function initInteractiveModules() {
  const okChart = await ensureChartLoaded();
  const okMatter = await ensureMatterLoaded();
  if (!okChart || !okMatter) return; // 最坏情况降级不中断

  // 简化：构建一条位移-时间曲线；Matter 构建静态场景占位
  const ctx = document.getElementById('simChart').getContext('2d');
  const xs = Array.from({ length: 181 }, (_, i) => i * 0.05); // 0..9s, step=0.05s
  const state = { m: parseFloat(document.getElementById('mass').value), k: parseFloat(document.getElementById('k').value) };

  function dispSeries(m, k) { return xs.map(t => Math.sin(Math.sqrt(k / m) * t)); }

  const chart = new Chart(ctx, { type:'line', data:{ labels: xs, datasets:[{ label:'x(t)', data: dispSeries(state.m, state.k), borderColor:'#5B5FC7', borderWidth:2, pointRadius:0 }] }, options:{ animation:false, scales:{ x:{ display:false } } } });

  const Engine = Matter.Engine, Render = Matter.Render, Runner = Matter.Runner, Bodies = Matter.Bodies, World = Matter.World;
  const engine = Engine.create();
  const render = Render.create({ element: document.getElementById('simCanvas'), engine, options: { width: 640, height: 220, wireframes: false, background: '#fff' } });
  const ground = Bodies.rectangle(320, 210, 640, 20, { isStatic: true });
  const ball = Bodies.circle(120, 60, 12, { restitution: 0.8 });
  World.add(engine.world, [ground, ball]);
  Render.run(render); Runner.run(Runner.create(), engine);

  function update() {
    document.getElementById('massVal').textContent = state.m.toFixed(2);
    document.getElementById('kVal').textContent = state.k.toFixed(1);
    chart.data.datasets[0].data = dispSeries(state.m, state.k);
    chart.update();
  }

  document.getElementById('mass').addEventListener('input', (e)=>{ state.m = parseFloat(e.target.value); update(); });
  document.getElementById('k').addEventListener('input', (e)=>{ state.k = parseFloat(e.target.value); update(); });
  update();
}

if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', initInteractiveModules); else initInteractiveModules();
</script>

## 合规模板锚点（硬性校验）
- 必须包含：
  - data-cdn-name="bootcdn-bootstrap"、data-cdn-name="bootcdn-fa"、data-cdn-name="bootcdn-chart"、data-cdn-name="bootcdn-matter"
  - Bootstrap 三段、FA 三段 URL（见上注释）
  - Chart.js 三段：
    - https://cdn.bootcdn.net/ajax/libs/Chart.js/4.4.1/chart.umd.min.js
    - https://cdn.jsdelivr.net/npm/chart.js@4.4.1/dist/chart.umd.min.js
    - https://cdnjs.cloudflare.com/ajax/libs/Chart.js/4.4.1/chart.umd.min.js
  - Matter.js 三段：
    - https://cdn.bootcdn.net/ajax/libs/matter-js/0.19.0/matter.min.js
    - https://cdn.jsdelivr.net/npm/matter-js@0.19.0/build/matter.min.js
    - https://cdnjs.cloudflare.com/ajax/libs/matter-js/0.19.0/matter.min.js
  - ensureChartLoaded( 、 ensureMatterLoaded( 、 initInteractiveModules(
  - <script type="application/json" id="compliance">{"tripleCdn":true,"chartJs":"4.4.1","matterJs":"0.19.0","init":"initInteractiveModules"}</script>
- 必须避免：cdn.tailwindcss.com、fonts.googleapis.com、fonts.gstatic.com；内联 on* 事件

## 用户给你的物理交互课件的描述如下

{{String1}}
