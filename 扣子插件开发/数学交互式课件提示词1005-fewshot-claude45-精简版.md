# 数学交互式课件提示词（Claude 4.5 Sonnet 精简 few-shot 合规版）

## Constants
- ORIGINS: BootCDN → jsDelivr → cdnjs
- VERSIONS: { bootstrap: 5.3.3, fa: 6.5.1, chart: 4.4.1 }

## Contract
- MUST
  - 使用三段 CDN；主链用 BootCDN；CSS 备链只在注释中回显；JS 使用运行时兜底
  - 必须引入 Chart.js 4.4.1，并以通用函数 `ensureLoaded` 做兜底
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
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width,initial-scale=1.0">
  <title>函数交互示例</title>

  <!-- COMPLIANCE: triple-cdn + chartjs@4.4.1 + initInteractiveModules -->
  <!-- 主链 CSS（BootCDN） -->
  <link rel="stylesheet" href="https://cdn.bootcdn.net/ajax/libs/bootstrap/5.3.3/css/bootstrap.min.css" data-cdn-name="bootcdn-bootstrap">
  <link rel="stylesheet" href="https://cdn.bootcdn.net/ajax/libs/font-awesome/6.5.1/css/all.min.css" data-cdn-name="bootcdn-fa">
  <!-- 备链（部署端健康切换，浏览器端不做 onerror 回退）
  Bootstrap 备链1: https://cdn.jsdelivr.net/npm/bootstrap@5.3.3/dist/css/bootstrap.min.css
  Bootstrap 备链2: https://cdnjs.cloudflare.com/ajax/libs/bootstrap/5.3.3/css/bootstrap.min.css
  FA 备链1: https://cdn.jsdelivr.net/npm/@fortawesome/fontawesome-free@6.5.1/css/all.min.css
  FA 备链2: https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.1/css/all.min.css
  -->

  <!-- Chart.js 主链（BootCDN），版本锁定 4.4.1 -->
  <script src="https://cdn.bootcdn.net/ajax/libs/Chart.js/4.4.1/chart.umd.min.js" data-cdn-name="bootcdn-chart"></script>

  <!-- 自检 JSON（用于后置校验，必须存在且与引用一致） -->
  <script type="application/json" id="compliance">
  { "tripleCdn": true,
    "libs": [
      {"name":"bootstrap","ver":"5.3.3"},
      {"name":"font-awesome","ver":"6.5.1"},
      {"name":"chart.js","ver":"4.4.1"}
    ],
    "init":"initInteractiveModules",
    "noInlineEvents": true,
    "fallbacks": true
  }
  </script>
</head>
<body class="container my-4">
  <h1 class="h5 mb-3">三角函数交互</h1>
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

  <script>
  /**
   * 保证指定全局库可用；若主链失败则依次注入备链脚本。
   * @param {string} globalName - 例如 'Chart'
   * @param {string[]} urls - 按顺序尝试的备用 script 链接
   * @returns {Promise<boolean>} 最终是否可用
   */
  async function ensureLoaded(globalName, urls) {
    if (window[globalName]) return true;
    for (const url of urls) {
      await new Promise((resolve) => {
        const s = document.createElement('script');
        s.src = url; s.onload = resolve; s.onerror = resolve;
        document.head.appendChild(s);
      });
      if (window[globalName]) return true;
    }
    return false;
  }

  /**
   * 统一初始化入口：绑定交互并完成首帧渲染（禁止内联 on*）。
   */
  async function initInteractiveModules() {
    const ok = await ensureLoaded('Chart', [
      'https://cdn.jsdelivr.net/npm/chart.js@4.4.1/dist/chart.umd.min.js',
      'https://cdnjs.cloudflare.com/ajax/libs/Chart.js/4.4.1/chart.umd.min.js'
    ]);
    if (!ok) return;

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

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', initInteractiveModules);
  else initInteractiveModules();
  </script>
</body>
</html>
```

## Anchors（生成物必须包含）
- ensureLoaded( / initInteractiveModules(
- chart.umd.min.js
- data-cdn-name="bootcdn-…"
- `<script type="application/json" id="compliance">` 自检 JSON
- 禁止出现：`cdn.tailwindcss.com`、`fonts.googleapis.com`、`fonts.gstatic.com`、任意 `on*` 事件
