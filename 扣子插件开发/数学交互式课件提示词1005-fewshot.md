# 数学交互式课件提示词（few-shot 合规版，三段 CDN + Chart.js 兜底 + 统一初始化）

## 目标
- 面向中国大陆教师用户，页面可用性第一。
- 生成后的 HTML 必须即拷即用：资源可达、交互可用、无额外构建。

## 技术规范（强约束）
- 使用 HTML5、CSS3 和必要的 JavaScript。
- 所有第三方资源必须提供三段 CDN（主链/第一备链/第二备链）：BootCDN → jsDelivr → cdnjs。
- 严禁使用任何依赖 Google 服务（fonts.googleapis.com、fonts.gstatic.com）的资源；严禁使用 cdn.tailwindcss.com。
- 必须使用 Bootstrap 5 与 Font Awesome（主链为 BootCDN，注释中列出备链）。
- 必须使用 Chart.js 4.4.1；若主链不可用，运行时依次回退 jsDelivr/cdnjs（通过脚本函数进行兜底）。
- 禁止内联 on* 事件（如 onclick），所有交互需通过统一初始化函数 initInteractiveModules() 绑定。
- 允许在文档底部放置少量内联初始化脚本块（需保留函数级注释），以适配单文件/离线场景。
- CSP 友好基线（由服务端下发或 meta 临时生效）：
  - default-src 'self'
  - script-src 'self' 'unsafe-inline' https: data: blob:
  - style-src 'self' 'unsafe-inline' https: data: blob:
  - font-src 'self' https: data: blob:

## 输出要求
- 仅输出完整 HTML，不要使用 Markdown 代码块围栏。
- 单一 HTML 文件，包含必要的 CSS 与 JS；可包含极少量内联初始化脚本。
- 必须保留合规标记和 JSON 自检块，便于自动校验。

## few-shot 正例（请严格遵循结构与锚点）

<!-- COMPLIANCE: triple-cdn + chartjs@4.4.1 + initInteractiveModules -->
<link rel="stylesheet" href="https://cdn.bootcdn.net/ajax/libs/bootstrap/5.3.3/css/bootstrap.min.css" data-cdn-name="bootcdn-bootstrap">
<link rel="stylesheet" href="https://cdn.bootcdn.net/ajax/libs/font-awesome/6.5.1/css/all.min.css" data-cdn-name="bootcdn-fa">
<!-- 备链（供部署端健康检查/切换，不在浏览器端 onerror 回退）
Bootstrap 备链1: https://cdn.jsdelivr.net/npm/bootstrap@5.3.3/dist/css/bootstrap.min.css
Bootstrap 备链2: https://cdnjs.cloudflare.com/ajax/libs/bootstrap/5.3.3/css/bootstrap.min.css
FA 备链1: https://cdn.jsdelivr.net/npm/@fortawesome/fontawesome-free@6.5.1/css/all.min.css
FA 备链2: https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.1/css/all.min.css -->

<!-- Chart.js 主链（BootCDN），版本锁定 4.4.1 -->
<script src="https://cdn.bootcdn.net/ajax/libs/Chart.js/4.4.1/chart.umd.min.js" data-cdn-name="bootcdn-chart"></script>

<!-- 自检清单（后置校验使用，必须保留） -->
<script type="application/json" id="compliance">
{ "tripleCdn": true, "chartJs": "4.4.1", "init": "initInteractiveModules" }
</script>

<main class="container my-4">
  <h1 class="h4 mb-3">一元或三角函数交互示例</h1>
  <div class="row g-3">
    <div class="col-12 col-md-4">
      <label for="amplitude" class="form-label">振幅 <span id="ampVal" class="text-primary fw-semibold">1.00</span></label>
      <input id="amplitude" type="range" class="form-range" min="0" max="2" step="0.01" value="1">
      <label for="frequency" class="form-label mt-3">频率 <span id="freqVal" class="text-primary fw-semibold">1.00</span></label>
      <input id="frequency" type="range" class="form-range" min="0.1" max="5" step="0.1" value="1">
    </div>
    <div class="col-12 col-md-8">
      <canvas id="chart" height="240"></canvas>
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
    await new Promise((resolve) => {
      const s = document.createElement('script');
      s.src = url; s.onload = resolve; s.onerror = resolve; document.head.appendChild(s);
    });
    if (window.Chart) return true;
  }
  return false;
}

/**
 * 统一初始化入口：绑定交互并完成首帧渲染。禁止内联 on* 事件。
 */
async function initInteractiveModules() {
  const ok = await ensureChartLoaded();
  if (!ok) return; // 最坏情况无图也不中断

  const ctx = document.getElementById('chart').getContext('2d');
  const xs = Array.from({ length: 361 }, (_, i) => i);
  const ampEl = document.getElementById('amplitude');
  const freqEl = document.getElementById('frequency');
  const ampVal = document.getElementById('ampVal');
  const freqVal = document.getElementById('freqVal');

  function makeData(a, f) { return xs.map(x => a * Math.sin((x * Math.PI / 180) * f)); }

  const state = { a: parseFloat(ampEl.value), f: parseFloat(freqEl.value) };
  const chart = new Chart(ctx, {
    type: 'line',
    data: { labels: xs, datasets: [{ label: 'y = a·sin(f·x)', data: makeData(state.a, state.f), borderColor: '#5B5FC7', borderWidth: 2, pointRadius: 0 }] },
    options: { animation: false, scales: { x: { display: false } } }
  });

  function update() {
    ampVal.textContent = state.a.toFixed(2);
    freqVal.textContent = state.f.toFixed(2);
    chart.data.datasets[0].data = makeData(state.a, state.f);
    chart.update();
  }

  ampEl.addEventListener('input', () => { state.a = parseFloat(ampEl.value); update(); });
  freqEl.addEventListener('input', () => { state.f = parseFloat(freqEl.value); update(); });
  update();
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initInteractiveModules);
} else {
  initInteractiveModules();
}
</script>

## 合规模板锚点（硬性校验）
- 必须包含（字面量或结构）：
  - data-cdn-name="bootcdn-bootstrap"、data-cdn-name="bootcdn-fa"、data-cdn-name="bootcdn-chart"
  - https://cdn.bootcdn.net/ajax/libs/bootstrap/5.3.3/css/bootstrap.min.css
  - https://cdn.jsdelivr.net/npm/bootstrap@5.3.3/dist/css/bootstrap.min.css
  - https://cdnjs.cloudflare.com/ajax/libs/bootstrap/5.3.3/css/bootstrap.min.css
  - https://cdn.bootcdn.net/ajax/libs/font-awesome/6.5.1/css/all.min.css
  - https://cdn.jsdelivr.net/npm/@fortawesome/fontawesome-free@6.5.1/css/all.min.css
  - https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.1/css/all.min.css
  - https://cdn.bootcdn.net/ajax/libs/Chart.js/4.4.1/chart.umd.min.js
  - https://cdn.jsdelivr.net/npm/chart.js@4.4.1/dist/chart.umd.min.js
  - https://cdnjs.cloudflare.com/ajax/libs/Chart.js/4.4.1/chart.umd.min.js
  - ensureChartLoaded( 、 initInteractiveModules(
  - <script type="application/json" id="compliance">{"tripleCdn":true,"chartJs":"4.4.1","init":"initInteractiveModules"}</script>
- 必须避免：
  - cdn.tailwindcss.com 、 fonts.googleapis.com 、 fonts.gstatic.com
  - 任意内联 on* 事件（如 onclick="..."）

## 用户给你的数学交互课件的描述如下

{{String1}}
