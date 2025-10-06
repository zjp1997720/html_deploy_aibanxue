# 物理交互式课件提示词（Claude 4.5 Sonnet 精简 few-shot 合规版）

## Constants
- ORIGINS: BootCDN → jsDelivr → cdnjs
- VERSIONS: { bootstrap: 5.3.3, fa: 6.5.1, chart: 4.4.1, matter: 0.19.0 }

## Contract
- MUST
  - 使用三段 CDN；主链用 BootCDN；CSS 备链只在注释中回显；JS 使用运行时兜底
  - 必须引入 Chart.js 4.4.1 与 Matter.js 0.19.0，并以通用函数 `ensureLoaded` 做兜底
  - 统一初始化入口名：`initInteractiveModules`；禁止内联 on* 事件；使用 `addEventListener`
  - 输出中必须包含自检 JSON（id=`compliance`），字段含 `tripleCdn/libs/init/noInlineEvents/fallbacks`
- MUST NOT
  - 禁用：`cdn.tailwindcss.com`、`fonts.googleapis.com`、`fonts.gstatic.com`
  - 禁用任意 on* 事件属性（如 `onclick`）
- Output
  - 仅输出完整 HTML；不得输出 Markdown 围栏和解释文字

## Golden Skeleton（可直接复用）
```html
<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0">
  <title>物理交互示例</title>

  <!-- COMPLIANCE: triple-cdn + chartjs@4.4.1 + matter@0.19.0 + initInteractiveModules -->
  <link rel="stylesheet" href="https://cdn.bootcdn.net/ajax/libs/bootstrap/5.3.3/css/bootstrap.min.css" data-cdn-name="bootcdn-bootstrap">
  <link rel="stylesheet" href="https://cdn.bootcdn.net/ajax/libs/font-awesome/6.5.1/css/all.min.css" data-cdn-name="bootcdn-fa">
  <!-- 备链（部署端健康切换，浏览器端不做 onerror 回退）
  Bootstrap 备链1: https://cdn.jsdelivr.net/npm/bootstrap@5.3.3/dist/css/bootstrap.min.css
  Bootstrap 备链2: https://cdnjs.cloudflare.com/ajax/libs/bootstrap/5.3.3/css/bootstrap.min.css
  FA 备链1: https://cdn.jsdelivr.net/npm/@fortawesome/fontawesome-free@6.5.1/css/all.min.css
  FA 备链2: https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.1/css/all.min.css
  -->

  <!-- 主链脚本（BootCDN） -->
  <script src="https://cdn.bootcdn.net/ajax/libs/Chart.js/4.4.1/chart.umd.min.js" data-cdn-name="bootcdn-chart"></script>
  <script src="https://cdn.bootcdn.net/ajax/libs/matter-js/0.19.0/matter.min.js" data-cdn-name="bootcdn-matter"></script>

  <!-- 自检 JSON -->
  <script type="application/json" id="compliance">
  { "tripleCdn": true,
    "libs": [
      {"name":"bootstrap","ver":"5.3.3"},
      {"name":"font-awesome","ver":"6.5.1"},
      {"name":"chart.js","ver":"4.4.1"},
      {"name":"matter.js","ver":"0.19.0"}
    ],
    "init":"initInteractiveModules",
    "noInlineEvents": true,
    "fallbacks": true
  }
  </script>
</head>
<body class="container my-4">
  <h1 class="h5 mb-3">简谐振动与弹跳（轻量模板）</h1>
  <div class="row g-3">
    <div class="col-12 col-md-4">
      <label for="mass" class="form-label">质量 kg <span id="massVal" class="text-primary fw-semibold">1.00</span></label>
      <input id="mass" type="range" class="form-range" min="0.1" max="5" step="0.1" value="1">
      <label for="k" class="form-label mt-3">弹性系数 <span id="kVal" class="text-primary fw-semibold">10.0</span></label>
      <input id="k" type="range" class="form-range" min="1" max="50" step="1" value="10">
    </div>
    <div class="col-12 col-md-8">
      <canvas id="simChart" height="180"></canvas>
      <div class="border rounded mt-3 p-3"><div id="simCanvas" style="width:100%;height:220px;background:#fff;border:1px solid #e5e7eb"></div></div>
    </div>
  </div>

  <script>
  /**
   * 保证指定全局库可用；若主链失败则依次注入备链脚本。
   * @param {string} globalName
   * @param {string[]} urls
   * @returns {Promise<boolean>}
   */
  async function ensureLoaded(globalName, urls) {
    if (window[globalName]) return true;
    for (const url of urls) {
      await new Promise((resolve) => { const s=document.createElement('script'); s.src=url; s.onload=resolve; s.onerror=resolve; document.head.appendChild(s); });
      if (window[globalName]) return true;
    }
    return false;
  }

  /**
   * 统一初始化入口：绑定交互、启动物理世界、绘制曲线（禁止内联 on*）。
   */
  async function initInteractiveModules() {
    const okChart = await ensureLoaded('Chart', [
      'https://cdn.jsdelivr.net/npm/chart.js@4.4.1/dist/chart.umd.min.js',
      'https://cdnjs.cloudflare.com/ajax/libs/Chart.js/4.4.1/chart.umd.min.js'
    ]);
    const okMatter = await ensureLoaded('Matter', [
      'https://cdn.jsdelivr.net/npm/matter-js@0.19.0/build/matter.min.js',
      'https://cdnjs.cloudflare.com/ajax/libs/matter-js/0.19.0/matter.min.js'
    ]);
    if (!okChart || !okMatter) return;

    // Chart：位移-时间曲线
    const ctx = document.getElementById('simChart').getContext('2d');
    const xs = Array.from({ length: 181 }, (_, i) => i * 0.05); // 0..9s, step=0.05
    const state = { m: parseFloat(document.getElementById('mass').value), k: parseFloat(document.getElementById('k').value) };
    function dispSeries(m, k) { return xs.map(t => Math.sin(Math.sqrt(k / m) * t)); }
    const chart = new Chart(ctx, { type:'line', data:{ labels: xs, datasets:[{ label:'x(t)', data: dispSeries(state.m, state.k), borderColor:'#5B5FC7', borderWidth:2, pointRadius:0 }] }, options:{ animation:false, scales:{ x:{ display:false } } } });

    // Matter：简场景占位（重力+弹跳）
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
    document.getElementById('mass').addEventListener('input', e=>{ state.m = parseFloat(e.target.value); update(); });
    document.getElementById('k').addEventListener('input', e=>{ state.k = parseFloat(e.target.value); update(); });
    update();
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', initInteractiveModules);
  else initInteractiveModules();
  </script>
</body>
</html>
```

## Anchors（生成物必须包含）
- ensureLoaded( / initInteractiveModules(
- chart.umd.min.js / matter.min.js
- data-cdn-name="bootcdn-…"
- `<script type="application/json" id="compliance">` 自检 JSON
- 禁止出现：`cdn.tailwindcss.com`、`fonts.googleapis.com`、`fonts.gstatic.com`、任意 `on*` 事件
