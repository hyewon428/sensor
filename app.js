/**
 * 산업 설비 다변량 센서 시계열 정밀 분석 대시보드 애플리케이션
 * Pure Vanilla JavaScript ES6+ (No Build Framework, Zero External Data Transmission)
 */

(function () {
  'use strict';

  // Global state
  let gData = null;
  let chartInstances = {};
  let isDarkMode = true;

  // Chart color palette
  const colors = {
    blue: '#3b82f6',
    cyan: '#06b6d4',
    emerald: '#10b981',
    amber: '#f59e0b',
    rose: '#f43f5e',
    purple: '#8b5cf6',
    indigo: '#6366f1',
    gray: '#6b7280',
    gridDark: '#374151',
    gridLight: '#e5e7eb',
    textDark: '#f9fafb',
    textLight: '#111827'
  };

  // Wait for DOM
  document.addEventListener('DOMContentLoaded', initApp);

  function initApp() {
    setupThemeToggle();
    setupCategoryNav();
    setupPrintAndExport();

    // Load data from inline payload or local JSON
    if (window.DATASET_PAYLOAD) {
      gData = window.DATASET_PAYLOAD;
      renderAllAnalytics();
    } else {
      fetch('complete_analytics.json')
        .then(res => res.json())
        .then(data => {
          gData = data;
          renderAllAnalytics();
        })
        .catch(err => {
          console.error("Data load failed:", err);
          alert("데이터를 로드하는 중 오류가 발생했습니다. 브라우저 설정을 확인해 주세요.");
        });
    }
  }

  // =========================================================================
  // Theme & Navigation
  // =========================================================================
  function setupThemeToggle() {
    const btn = document.getElementById('themeToggleBtn');
    if (!btn) return;

    btn.addEventListener('click', () => {
      isDarkMode = !isDarkMode;
      document.body.classList.toggle('light-theme', !isDarkMode);
      updateAllChartThemes();
    });
  }

  function setupCategoryNav() {
    const nav = document.getElementById('categoryNav');
    if (!nav) return;

    nav.addEventListener('click', (e) => {
      const target = e.target.closest('.tab-btn');
      if (!target) return;

      nav.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
      target.classList.add('active');

      const cat = target.dataset.category;
      const sections = document.querySelectorAll('.category-section');

      if (cat === 'all') {
        sections.forEach(sec => sec.style.display = 'block');
      } else {
        sections.forEach(sec => {
          if (sec.id === `section-${cat}`) {
            sec.style.display = 'block';
            sec.scrollIntoView({ behavior: 'smooth', block: 'start' });
          } else {
            sec.style.display = 'none';
          }
        });
      }
    });
  }

  function setupPrintAndExport() {
    const printBtn = document.getElementById('printReportBtn');
    if (printBtn) {
      printBtn.addEventListener('click', () => window.print());
    }

    const dlBtn = document.getElementById('downloadDataBtn');
    if (dlBtn) {
      dlBtn.addEventListener('click', () => {
        if (!gData) return;
        const blob = new Blob([JSON.stringify(gData, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `sensor_analytics_20methods_${new Date().toISOString().slice(0, 10)}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      });
    }
  }

  function updateAllChartThemes() {
    const gridColor = isDarkMode ? colors.gridDark : colors.gridLight;
    const textColor = isDarkMode ? colors.textDark : colors.textLight;

    Chart.defaults.color = textColor;
    Chart.defaults.borderColor = gridColor;

    Object.values(chartInstances).forEach(chart => {
      if (!chart) return;
      if (chart.options.scales) {
        Object.values(chart.options.scales).forEach(scale => {
          if (scale.grid) scale.grid.color = gridColor;
          if (scale.ticks) scale.ticks.color = textColor;
          if (scale.pointLabels) scale.pointLabels.color = textColor;
        });
      }
      chart.update();
    });
  }

  // =========================================================================
  // Master Render Function
  // =========================================================================
  function renderAllAnalytics() {
    if (!gData) return;

    // Default chart styling
    Chart.defaults.color = isDarkMode ? colors.textDark : colors.textLight;
    Chart.defaults.borderColor = isDarkMode ? colors.gridDark : colors.gridLight;
    Chart.defaults.font.family = '-apple-system, BlinkMacSystemFont, "Pretendard", "Segoe UI", Roboto, sans-serif';

    // Render M01 ~ M20
    renderM01_DescriptiveTable();
    renderM02_HistKDE();
    renderM03_BoxWhisker();
    renderM04_SMA();
    renderM05_EMA();
    renderM06_SavitzkyGolay();
    renderM07_PeakEnvelope();
    renderM08_Kalman();
    renderM09_Benchmark();
    renderM10_SPC();
    renderM11_Hampel();
    renderM12_LOF();
    renderM13_Correlation();
    renderM14_CrossCorr();
    renderM15_MultivariateZScore();
    renderM16_Decomposition();
    renderM17_FFT();
    renderM18_Radar();
    renderM19_KMeans();
    renderM20_Markov();
  }

  // =========================================================================
  // M01: Descriptive Table
  // =========================================================================
  function renderM01_DescriptiveTable() {
    const stats = gData.analytics.m01_descriptive;
    const tbody = document.getElementById('tbody-m01');
    if (!tbody) return;

    const rows = [
      { name: '온도센서 원시값 (°C)', d: stats.raw_temp },
      { name: '온도 참값·비교용 (°C)', d: stats.true_temp },
      { name: '진동 RMS (mm/s)', d: stats.vibration },
      { name: '압력 (kPa)', d: stats.pressure }
    ];

    tbody.innerHTML = rows.map(r => `
      <tr>
        <td style="font-weight: 700;">${r.name}</td>
        <td>${r.d.count.toLocaleString()}</td>
        <td class="text-cyan font-bold">${r.d.mean.toFixed(2)}</td>
        <td>${r.d.median.toFixed(2)}</td>
        <td>${r.d.std.toFixed(3)}</td>
        <td>${r.d.variance ? r.d.variance.toFixed(3) : '-'}</td>
        <td>${r.d.min.toFixed(2)}</td>
        <td>${r.d.q25 ? r.d.q25.toFixed(2) : '-'}</td>
        <td>${r.d.q75 ? r.d.q75.toFixed(2) : '-'}</td>
        <td>${r.d.max.toFixed(2)}</td>
        <td>${r.d.iqr ? r.d.iqr.toFixed(2) : '-'}</td>
        <td class="${r.d.skew > 0.5 ? 'text-amber font-bold' : ''}">${r.d.skew ? r.d.skew.toFixed(3) : '-'}</td>
        <td>${r.d.kurtosis ? r.d.kurtosis.toFixed(3) : '-'}</td>
        <td class="${r.d.cv_percent > 20 ? 'text-rose font-bold' : ''}">${r.d.cv_percent ? r.d.cv_percent.toFixed(1) + '%' : '-'}</td>
      </tr>
    `).join('');
  }

  // =========================================================================
  // M02: Histogram & KDE
  // =========================================================================
  function renderM02_HistKDE() {
    const ctx = document.getElementById('chart-m02');
    if (!ctx) return;

    const dataObj = gData.analytics.m02_hist_kde;
    const select = document.getElementById('select-m02-var');

    function updateChart(varKey) {
      if (chartInstances['m02']) chartInstances['m02'].destroy();

      let datasets = [];
      let labels = [];

      if (varKey === 'temp') {
        const raw = dataObj.raw_temp;
        const tru = dataObj.true_temp;
        labels = raw.x_grid;
        datasets = [
          {
            type: 'line',
            label: '원시값 KDE (노이즈 확산)',
            data: raw.kde_vals,
            borderColor: colors.rose,
            backgroundColor: 'rgba(244, 63, 94, 0.1)',
            fill: true,
            tension: 0.3,
            borderWidth: 2,
            pointRadius: 0
          },
          {
            type: 'line',
            label: '참값 KDE (이상적 분포)',
            data: tru.kde_vals,
            borderColor: colors.emerald,
            backgroundColor: 'rgba(16, 185, 129, 0.1)',
            fill: true,
            tension: 0.3,
            borderWidth: 2,
            pointRadius: 0
          }
        ];
      } else {
        const d = dataObj[varKey];
        labels = d.x_grid;
        datasets = [
          {
            type: 'line',
            label: `${varKey === 'vibration' ? '진동 RMS' : '압력'} 커널 밀도 추정 (KDE)`,
            data: d.kde_vals,
            borderColor: varKey === 'vibration' ? colors.amber : colors.cyan,
            backgroundColor: varKey === 'vibration' ? 'rgba(245, 158, 11, 0.15)' : 'rgba(6, 182, 212, 0.15)',
            fill: true,
            tension: 0.3,
            borderWidth: 2,
            pointRadius: 0
          }
        ];
      }

      chartInstances['m02'] = new Chart(ctx, {
        data: { labels, datasets },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          interaction: { mode: 'index', intersect: false },
          scales: {
            x: { title: { display: true, text: '측정 단위값' } },
            y: { title: { display: true, text: '확률 밀도 (Density)' } }
          }
        }
      });
    }

    if (select) {
      select.addEventListener('change', (e) => updateChart(e.target.value));
    }
    updateChart('temp');
  }

  // =========================================================================
  // M03: Box & Whisker by Event
  // =========================================================================
  function renderM03_BoxWhisker() {
    const ctx = document.getElementById('chart-m03');
    if (!ctx) return;

    const boxData = gData.analytics.m03_box_whisker;
    const events = Object.keys(boxData);
    const select = document.getElementById('select-m03-metric');

    function updateChart(metricKey) {
      if (chartInstances['m03']) chartInstances['m03'].destroy();

      const medians = events.map(e => boxData[e][metricKey].median);
      const q1s = events.map(e => boxData[e][metricKey].q1);
      const q3s = events.map(e => boxData[e][metricKey].q3);
      const mins = events.map(e => boxData[e][metricKey].min);
      const maxs = events.map(e => boxData[e][metricKey].max);

      chartInstances['m03'] = new Chart(ctx, {
        type: 'bar',
        data: {
          labels: events,
          datasets: [
            {
              label: '중앙값 (Median)',
              data: medians,
              backgroundColor: colors.blue,
              borderRadius: 4
            },
            {
              label: '3사분위 (Q3 상단)',
              data: q3s,
              backgroundColor: 'rgba(59, 130, 246, 0.3)',
              borderRadius: 4
            },
            {
              label: '1사분위 (Q1 하단)',
              data: q1s,
              backgroundColor: 'rgba(59, 130, 246, 0.15)',
              borderRadius: 4
            }
          ]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            tooltip: {
              callbacks: {
                afterBody: function (context) {
                  const idx = context[0].dataIndex;
                  const ev = events[idx];
                  const info = boxData[ev][metricKey];
                  return `최소: ${info.min} | Q1: ${info.q1} | 중앙: ${info.median} | Q3: ${info.q3} | 최대: ${info.max} (건수: ${info.count})`;
                }
              }
            }
          },
          scales: {
            y: { title: { display: true, text: metricKey === 'temp' ? '온도 (°C)' : metricKey === 'vib' ? '진동 (mm/s)' : '압력 (kPa)' } }
          }
        }
      });
    }

    if (select) {
      select.addEventListener('change', (e) => updateChart(e.target.value));
    }
    updateChart('temp');
  }

  // =========================================================================
  // M04: Simple Moving Average (SMA)
  // =========================================================================
  function renderM04_SMA() {
    const ctx = document.getElementById('chart-m04');
    if (!ctx) return;

    const time = gData.raw_data.time_str;
    const raw = gData.raw_data.raw_temp;
    const tru = gData.raw_data.true_temp;
    const sma = gData.analytics.m04_sma;

    const sampleStep = 2; // Decimate slightly for snappy UI
    const labels = time.filter((_, i) => i % sampleStep === 0);

    const dsConfig = {
      raw: { label: '원시값', data: raw.filter((_, i) => i % sampleStep === 0), borderColor: colors.gray, borderWidth: 1, pointRadius: 0 },
      true: { label: '참값(기준)', data: tru.filter((_, i) => i % sampleStep === 0), borderColor: colors.emerald, borderWidth: 2, pointRadius: 0 },
      w5: { label: 'SMA (5분)', data: sma.sma_5.filter((_, i) => i % sampleStep === 0), borderColor: colors.cyan, borderWidth: 1.5, pointRadius: 0 },
      w15: { label: 'SMA (15분)', data: sma.sma_15.filter((_, i) => i % sampleStep === 0), borderColor: colors.blue, borderWidth: 2, pointRadius: 0 },
      w30: { label: 'SMA (30분)', data: sma.sma_30.filter((_, i) => i % sampleStep === 0), borderColor: colors.amber, borderWidth: 2, pointRadius: 0 },
      w60: { label: 'SMA (60분)', data: sma.sma_60.filter((_, i) => i % sampleStep === 0), borderColor: colors.rose, borderWidth: 2.5, pointRadius: 0 }
    };

    function getActiveDatasets() {
      const active = [];
      if (document.getElementById('chk-m04-raw')?.checked) active.push(dsConfig.raw);
      if (document.getElementById('chk-m04-true')?.checked) active.push(dsConfig.true);
      if (document.getElementById('chk-m04-w5')?.checked) active.push(dsConfig.w5);
      if (document.getElementById('chk-m04-w15')?.checked) active.push(dsConfig.w15);
      if (document.getElementById('chk-m04-w30')?.checked) active.push(dsConfig.w30);
      if (document.getElementById('chk-m04-w60')?.checked) active.push(dsConfig.w60);
      return active;
    }

    chartInstances['m04'] = new Chart(ctx, {
      type: 'line',
      data: { labels, datasets: getActiveDatasets() },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        animation: false,
        interaction: { mode: 'index', intersect: false },
        scales: {
          x: { maxTicksLimit: 12 },
          y: { title: { display: true, text: '온도 (°C)' } }
        }
      }
    });

    ['raw', 'true', 'w5', 'w15', 'w30', 'w60'].forEach(k => {
      document.getElementById(`chk-m04-${k}`)?.addEventListener('change', () => {
        chartInstances['m04'].data.datasets = getActiveDatasets();
        chartInstances['m04'].update();
      });
    });
  }

  // =========================================================================
  // M05: Exponential Moving Average (EMA) with Interactive Slider
  // =========================================================================
  function renderM05_EMA() {
    const ctx = document.getElementById('chart-m05');
    if (!ctx) return;

    const time = gData.raw_data.time_str;
    const raw = gData.raw_data.raw_temp;
    const tru = gData.raw_data.true_temp;
    const slider = document.getElementById('slider-m05-alpha');
    const valSpan = document.getElementById('val-m05-alpha');

    const sampleStep = 2;
    const labels = time.filter((_, i) => i % sampleStep === 0);
    const rawSampled = raw.filter((_, i) => i % sampleStep === 0);
    const truSampled = tru.filter((_, i) => i % sampleStep === 0);

    // Compute client-side dynamic EMA
    function calcEMA(arr, alpha) {
      const res = new Float32Array(arr.length);
      res[0] = arr[0];
      for (let i = 1; i < arr.length; i++) {
        res[i] = alpha * arr[i] + (1 - alpha) * res[i - 1];
      }
      return Array.from(res).map(v => Math.round(v * 1000) / 1000);
    }

    let currentAlpha = parseFloat(slider?.value || '0.15');
    let emaVals = calcEMA(raw, currentAlpha).filter((_, i) => i % sampleStep === 0);

    chartInstances['m05'] = new Chart(ctx, {
      type: 'line',
      data: {
        labels,
        datasets: [
          { label: '원시값', data: rawSampled, borderColor: colors.gray, borderWidth: 1, pointRadius: 0 },
          { label: '참값 (기준)', data: truSampled, borderColor: colors.emerald, borderWidth: 2, pointRadius: 0 },
          { label: `EMA (α=${currentAlpha})`, data: emaVals, borderColor: colors.cyan, borderWidth: 2.5, pointRadius: 0 }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        animation: false,
        interaction: { mode: 'index', intersect: false },
        scales: {
          x: { maxTicksLimit: 12 },
          y: { title: { display: true, text: '온도 (°C)' } }
        }
      }
    });

    if (slider && valSpan) {
      slider.addEventListener('input', (e) => {
        const a = parseFloat(e.target.value);
        valSpan.textContent = a.toFixed(2);
        const newEma = calcEMA(raw, a).filter((_, i) => i % sampleStep === 0);
        chartInstances['m05'].data.datasets[2].data = newEma;
        chartInstances['m05'].data.datasets[2].label = `EMA (α=${a.toFixed(2)})`;
        chartInstances['m05'].update();
      });
    }
  }

  // =========================================================================
  // M06: Savitzky-Golay Filter
  // =========================================================================
  function renderM06_SavitzkyGolay() {
    const ctx = document.getElementById('chart-m06');
    if (!ctx) return;

    const time = gData.raw_data.time_str;
    const raw = gData.raw_data.raw_temp;
    const tru = gData.raw_data.true_temp;
    const sg = gData.analytics.m06_savgol;
    const sma = gData.analytics.m04_sma;

    const sampleStep = 2;
    const labels = time.filter((_, i) => i % sampleStep === 0);

    chartInstances['m06'] = new Chart(ctx, {
      type: 'line',
      data: {
        labels,
        datasets: [
          { label: '원시값', data: raw.filter((_, i) => i % sampleStep === 0), borderColor: 'rgba(107, 114, 128, 0.4)', borderWidth: 1, pointRadius: 0 },
          { label: '참값 (Ground Truth)', data: tru.filter((_, i) => i % sampleStep === 0), borderColor: colors.emerald, borderWidth: 2, pointRadius: 0 },
          { label: 'SMA (15분 - 피크 둔화)', data: sma.sma_15.filter((_, i) => i % sampleStep === 0), borderColor: colors.amber, borderWidth: 1.5, borderDash: [4, 4], pointRadius: 0 },
          { label: 'Savitzky-Golay (31, 3차 - 피크보존 1위)', data: sg.sg_31_3.filter((_, i) => i % sampleStep === 0), borderColor: colors.purple, borderWidth: 2.5, pointRadius: 0 }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        animation: false,
        interaction: { mode: 'index', intersect: false },
        scales: {
          x: { maxTicksLimit: 12 },
          y: { title: { display: true, text: '온도 (°C)' } }
        }
      }
    });
  }

  // =========================================================================
  // M07: Peak Envelope & Bandwidth
  // =========================================================================
  function renderM07_PeakEnvelope() {
    const ctx = document.getElementById('chart-m07');
    if (!ctx) return;

    const time = gData.raw_data.time_str;
    const raw = gData.raw_data.raw_temp;
    const env = gData.analytics.m07_envelope;

    const sampleStep = 2;
    const labels = time.filter((_, i) => i % sampleStep === 0);

    chartInstances['m07'] = new Chart(ctx, {
      type: 'line',
      data: {
        labels,
        datasets: [
          {
            label: '상단 포락선 (Upper Envelope)',
            data: env.upper.filter((_, i) => i % sampleStep === 0),
            borderColor: colors.rose,
            borderWidth: 1.5,
            pointRadius: 0
          },
          {
            label: '원시 신호',
            data: raw.filter((_, i) => i % sampleStep === 0),
            borderColor: colors.gray,
            borderWidth: 1,
            pointRadius: 0
          },
          {
            label: '하단 포락선 (Lower Envelope)',
            data: env.lower.filter((_, i) => i % sampleStep === 0),
            borderColor: colors.cyan,
            backgroundColor: 'rgba(6, 182, 212, 0.1)',
            fill: '-2', // fill towards upper envelope
            borderWidth: 1.5,
            pointRadius: 0
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        animation: false,
        interaction: { mode: 'index', intersect: false },
        scales: {
          x: { maxTicksLimit: 12 },
          y: { title: { display: true, text: '온도 (°C)' } }
        }
      }
    });
  }

  // =========================================================================
  // M08: 1D Kalman Filter with Real-time Q/R Tuning
  // =========================================================================
  function renderM08_Kalman() {
    const ctx = document.getElementById('chart-m08');
    if (!ctx) return;

    const time = gData.raw_data.time_str;
    const raw = gData.raw_data.raw_temp;
    const tru = gData.raw_data.true_temp;
    const sliderQ = document.getElementById('slider-m08-q');
    const sliderR = document.getElementById('slider-m08-r');
    const valQ = document.getElementById('val-m08-q');
    const valR = document.getElementById('val-m08-r');

    const sampleStep = 2;
    const labels = time.filter((_, i) => i % sampleStep === 0);

    // Dynamic 1D Kalman Filter execution in JS
    function runKalmanJS(z, Q, R) {
      const n = z.length;
      const xhat = new Float32Array(n);
      let P = 1.0;
      xhat[0] = z[0];

      for (let k = 1; k < n; k++) {
        const xminus = xhat[k - 1];
        const Pminus = P + Q;
        const K = Pminus / (Pminus + R);
        xhat[k] = xminus + K * (z[k] - xminus);
        P = (1 - K) * Pminus;
      }
      return Array.from(xhat).map(v => Math.round(v * 1000) / 1000);
    }

    let curQ = parseFloat(sliderQ?.value || '0.010');
    let curR = parseFloat(sliderR?.value || '0.40');
    let kEst = runKalmanJS(raw, curQ, curR).filter((_, i) => i % sampleStep === 0);

    chartInstances['m08'] = new Chart(ctx, {
      type: 'line',
      data: {
        labels,
        datasets: [
          { label: '원시값', data: raw.filter((_, i) => i % sampleStep === 0), borderColor: 'rgba(107, 114, 128, 0.4)', borderWidth: 1, pointRadius: 0 },
          { label: '참값 (기준)', data: tru.filter((_, i) => i % sampleStep === 0), borderColor: colors.emerald, borderWidth: 2, pointRadius: 0 },
          { label: '칼만 필터 최적 상태 추정치', data: kEst, borderColor: colors.blue, borderWidth: 2.5, pointRadius: 0 }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        animation: false,
        interaction: { mode: 'index', intersect: false },
        scales: {
          x: { maxTicksLimit: 12 },
          y: { title: { display: true, text: '온도 (°C)' } }
        }
      }
    });

    function onParamChange() {
      curQ = parseFloat(sliderQ.value);
      curR = parseFloat(sliderR.value);
      valQ.textContent = curQ.toFixed(3);
      valR.textContent = curR.toFixed(2);
      const updated = runKalmanJS(raw, curQ, curR).filter((_, i) => i % sampleStep === 0);
      chartInstances['m08'].data.datasets[2].data = updated;
      chartInstances['m08'].update();
    }

    if (sliderQ) sliderQ.addEventListener('input', onParamChange);
    if (sliderR) sliderR.addEventListener('input', onParamChange);
  }

  // =========================================================================
  // M09: Performance Benchmark Table & Bar Chart
  // =========================================================================
  function renderM09_Benchmark() {
    const list = gData.analytics.m09_benchmark;
    const tbody = document.getElementById('tbody-m09');
    const ctx = document.getElementById('chart-m09');

    if (tbody) {
      tbody.innerHTML = list.map((item, idx) => {
        const isWinner = idx === 0;
        return `
          <tr class="${isWinner ? 'highlight-winner' : ''}">
            <td><strong>#${idx + 1}</strong></td>
            <td><strong>${item.name}</strong> ${isWinner ? '👑 (최우수)' : ''}</td>
            <td class="font-bold">${item.rmse.toFixed(4)}</td>
            <td>${item.mae.toFixed(4)}</td>
            <td>${item.mape.toFixed(2)}%</td>
            <td>${item.max_err.toFixed(4)}</td>
            <td>${item.corr.toFixed(4)}</td>
            <td>${item.r2 ? item.r2.toFixed(4) : '-'}</td>
            <td class="${item.snr_db > 20 ? 'text-emerald font-bold' : ''}">${item.snr_db.toFixed(2)} dB</td>
            <td>${item.name.includes('Savitzky') ? '사후 배치' : '실시간 가능'}</td>
            <td>${isWinner ? '⭐ 종합 1위' : idx < 4 ? '우수' : '지연 주의'}</td>
          </tr>
        `;
      }).join('');
    }

    if (ctx) {
      chartInstances['m09'] = new Chart(ctx, {
        type: 'bar',
        data: {
          labels: list.map(d => d.name),
          datasets: [
            {
              label: 'RMSE (°C) - 낮을수록 우수',
              data: list.map(d => d.rmse),
              backgroundColor: list.map((_, i) => i === 0 ? colors.emerald : i < 3 ? colors.blue : colors.gray),
              borderRadius: 6
            },
            {
              label: '최대 오차 Max Error (°C)',
              data: list.map(d => d.max_err),
              backgroundColor: 'rgba(244, 63, 94, 0.4)',
              borderRadius: 6
            }
          ]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          scales: {
            x: { ticks: { maxRotation: 45, minRotation: 20 } },
            y: { title: { display: true, text: '오차 단위 (°C)' } }
          }
        }
      });
    }
  }

  // =========================================================================
  // M10: SPC 3-Sigma Control Chart
  // =========================================================================
  function renderM10_SPC() {
    const ctx = document.getElementById('chart-m10');
    if (!ctx) return;

    const time = gData.raw_data.time_str;
    const raw = gData.raw_data.raw_temp;
    const spc = gData.analytics.m10_spc;

    const sampleStep = 2;
    const labels = time.filter((_, i) => i % sampleStep === 0);

    const uclLine = Array(labels.length).fill(spc.ucl);
    const lclLine = Array(labels.length).fill(spc.lcl);
    const clLine = Array(labels.length).fill(spc.center_line);
    const uwlLine = Array(labels.length).fill(spc.uwl);

    // Detect violation points for scatter highlight
    const violationSet = new Set(spc.violation_indices_3sigma);
    const pointColors = raw.filter((_, i) => i % sampleStep === 0).map((_, idx) => {
      return violationSet.has(idx * sampleStep) ? colors.rose : colors.blue;
    });
    const pointRadii = raw.filter((_, i) => i % sampleStep === 0).map((_, idx) => {
      return violationSet.has(idx * sampleStep) ? 4 : 0;
    });

    chartInstances['m10'] = new Chart(ctx, {
      type: 'line',
      data: {
        labels,
        datasets: [
          {
            label: '원시 측정값 (이탈점 적색 표시)',
            data: raw.filter((_, i) => i % sampleStep === 0),
            borderColor: colors.blue,
            pointBackgroundColor: pointColors,
            pointBorderColor: pointColors,
            pointRadius: pointRadii,
            borderWidth: 1.5
          },
          {
            label: `UCL (+3σ = ${spc.ucl}°C)`,
            data: uclLine,
            borderColor: colors.rose,
            borderWidth: 2,
            borderDash: [6, 4],
            pointRadius: 0
          },
          {
            label: `UWL (+2σ = ${spc.uwl}°C 경고선)`,
            data: uwlLine,
            borderColor: colors.amber,
            borderWidth: 1.5,
            borderDash: [3, 3],
            pointRadius: 0
          },
          {
            label: `CL (중심선 = ${spc.center_line}°C)`,
            data: clLine,
            borderColor: colors.emerald,
            borderWidth: 1.5,
            pointRadius: 0
          },
          {
            label: `LCL (-3σ = ${spc.lcl}°C)`,
            data: lclLine,
            borderColor: colors.rose,
            borderWidth: 2,
            borderDash: [6, 4],
            pointRadius: 0
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        animation: false,
        scales: {
          x: { maxTicksLimit: 12 },
          y: { title: { display: true, text: '온도 (°C)' } }
        }
      }
    });
  }

  // =========================================================================
  // M11: Hampel Filter (Robust Spike Outlier Detection)
  // =========================================================================
  function renderM11_Hampel() {
    const ctx = document.getElementById('chart-m11');
    if (!ctx) return;

    const time = gData.raw_data.time_str;
    const raw = gData.raw_data.raw_temp;
    const hampel = gData.analytics.m11_hampel;

    const sampleStep = 2;
    const labels = time.filter((_, i) => i % sampleStep === 0);

    const spikeSet = new Set(hampel.detected_indices);
    const spikePoints = labels.map((_, idx) => {
      const origIdx = idx * sampleStep;
      return spikeSet.has(origIdx) ? raw[origIdx] : null;
    });

    chartInstances['m11'] = new Chart(ctx, {
      type: 'line',
      data: {
        labels,
        datasets: [
          {
            label: '원시 센서값 (스파이크 포함)',
            data: raw.filter((_, i) => i % sampleStep === 0),
            borderColor: 'rgba(107, 114, 128, 0.5)',
            borderWidth: 1,
            pointRadius: 0
          },
          {
            label: '험펠 필터 복원 시계열 (Reconstructed)',
            data: hampel.reconstructed.filter((_, i) => i % sampleStep === 0),
            borderColor: colors.emerald,
            borderWidth: 2,
            pointRadius: 0
          },
          {
            type: 'scatter',
            label: `탐지된 스파이크 이상치 (${hampel.detected_count}건)`,
            data: spikePoints,
            backgroundColor: colors.rose,
            pointRadius: 6,
            pointHoverRadius: 8
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        animation: false,
        scales: {
          x: { maxTicksLimit: 12 },
          y: { title: { display: true, text: '온도 (°C)' } }
        }
      }
    });
  }

  // =========================================================================
  // M12: Local Outlier Factor (LOF)
  // =========================================================================
  function renderM12_LOF() {
    const ctx = document.getElementById('chart-m12');
    if (!ctx) return;

    const time = gData.raw_data.time_str;
    const lof = gData.analytics.m12_lof;

    const sampleStep = 2;
    const labels = time.filter((_, i) => i % sampleStep === 0);
    const scores = lof.knn_scores.filter((_, i) => i % sampleStep === 0);
    const threshLine = Array(labels.length).fill(lof.threshold);

    chartInstances['m12'] = new Chart(ctx, {
      type: 'line',
      data: {
        labels,
        datasets: [
          {
            label: '다변량 밀도 이상치 점수 (LOF Score)',
            data: scores,
            borderColor: colors.purple,
            backgroundColor: 'rgba(139, 92, 246, 0.15)',
            fill: true,
            borderWidth: 1.5,
            pointRadius: 0
          },
          {
            label: `이상치 임계선 (95th% = ${lof.threshold})`,
            data: threshLine,
            borderColor: colors.rose,
            borderWidth: 2,
            borderDash: [6, 4],
            pointRadius: 0
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        animation: false,
        scales: {
          x: { maxTicksLimit: 12 },
          y: { title: { display: true, text: 'LOF 이상치 스코어' } }
        }
      }
    });
  }

  // =========================================================================
  // M13: Correlation Heatmap & Scatter
  // =========================================================================
  function renderM13_Correlation() {
    const ctx = document.getElementById('chart-m13');
    if (!ctx) return;

    const m13 = gData.analytics.m13_correlation;
    const cols = m13.columns;

    function drawCorr(type) {
      if (chartInstances['m13']) chartInstances['m13'].destroy();
      const matrix = m13[type];

      // Convert 4x4 matrix to bar comparison
      const pairs = [
        { name: '원시온도 ↔ 참값온도', val: matrix['원시온도']['참값온도'] },
        { name: '진동RMS ↔ 압력', val: matrix['진동RMS']['압력'] },
        { name: '원시온도 ↔ 진동RMS', val: matrix['원시온도']['진동RMS'] },
        { name: '원시온도 ↔ 압력', val: matrix['원시온도']['압력'] },
        { name: '참값온도 ↔ 진동RMS', val: matrix['참값온도']['진동RMS'] }
      ];

      chartInstances['m13'] = new Chart(ctx, {
        type: 'bar',
        data: {
          labels: pairs.map(p => p.name),
          datasets: [
            {
              label: `${type === 'pearson' ? '피어슨 선형' : '스피어만 순위'} 상관계수 (r)`,
              data: pairs.map(p => p.val),
              backgroundColor: pairs.map(p => p.val > 0.8 ? colors.emerald : p.val > 0.4 ? colors.blue : colors.cyan),
              borderRadius: 6
            }
          ]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          indexAxis: 'y',
          scales: {
            x: { min: 0, max: 1.0, title: { display: true, text: '상관계수 값 (0.0 ~ 1.0)' } }
          }
        }
      });
    }

    document.querySelectorAll('input[name="corr_type"]').forEach(radio => {
      radio.addEventListener('change', (e) => drawCorr(e.target.value));
    });
    drawCorr('pearson');
  }

  // =========================================================================
  // M14: Cross-Correlation & Time Lag
  // =========================================================================
  function renderM14_CrossCorr() {
    const ctx = document.getElementById('chart-m14');
    if (!ctx) return;

    const m14 = gData.analytics.m14_cross_corr;
    const lags = m14.lags.map(d => d.lag);
    const corrs = m14.lags.map(d => d.corr);

    chartInstances['m14'] = new Chart(ctx, {
      type: 'line',
      data: {
        labels: lags,
        datasets: [
          {
            label: '진동 ↔ 온도 시차 상호상관계수 (CCF)',
            data: corrs,
            borderColor: colors.amber,
            backgroundColor: 'rgba(245, 158, 11, 0.1)',
            fill: true,
            borderWidth: 2.5,
            pointRadius: 2,
            pointHoverRadius: 6
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          tooltip: {
            callbacks: {
              afterLabel: function (ctx) {
                const lag = lags[ctx.dataIndex];
                if (lag > 0) return `👉 진동이 온도보다 ${lag}분 선행 발생`;
                if (lag < 0) return `👉 온도가 진동보다 ${-lag}분 선행`;
                return '동시 시점 (Lag=0)';
              }
            }
          }
        },
        scales: {
          x: { title: { display: true, text: '시차 Lag (분) - 양수: 진동 선행' } },
          y: { title: { display: true, text: '상관계수 (CCF)' } }
        }
      }
    });
  }

  // =========================================================================
  // M15: Multivariate Z-Score Trend
  // =========================================================================
  function renderM15_MultivariateZScore() {
    const ctx = document.getElementById('chart-m15');
    if (!ctx) return;

    const time = gData.raw_data.time_str;
    const zData = gData.analytics.m15_multivariate_zscore;

    const sampleStep = 2;
    const labels = time.filter((_, i) => i % sampleStep === 0);

    chartInstances['m15'] = new Chart(ctx, {
      type: 'line',
      data: {
        labels,
        datasets: [
          {
            label: '온도 Z-Score',
            data: zData.z_temp.filter((_, i) => i % sampleStep === 0),
            borderColor: colors.rose,
            borderWidth: 1.8,
            pointRadius: 0
          },
          {
            label: '진동 RMS Z-Score (선행 거동)',
            data: zData.z_vib.filter((_, i) => i % sampleStep === 0),
            borderColor: colors.amber,
            borderWidth: 1.8,
            pointRadius: 0
          },
          {
            label: '압력 Z-Score',
            data: zData.z_press.filter((_, i) => i % sampleStep === 0),
            borderColor: colors.cyan,
            borderWidth: 1.8,
            pointRadius: 0
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        animation: false,
        interaction: { mode: 'index', intersect: false },
        scales: {
          x: { maxTicksLimit: 12 },
          y: { title: { display: true, text: '표준 정규화 점수 (Z-Score = σ)' } }
        }
      }
    });
  }

  // =========================================================================
  // M16: Additive Decomposition
  // =========================================================================
  function renderM16_Decomposition() {
    const ctx = document.getElementById('chart-m16');
    if (!ctx) return;

    const time = gData.raw_data.time_str;
    const raw = gData.raw_data.raw_temp;
    const decomp = gData.analytics.m16_decomposition;

    const sampleStep = 2;
    const labels = time.filter((_, i) => i % sampleStep === 0);

    function updateDecomp(view) {
      if (chartInstances['m16']) chartInstances['m16'].destroy();

      let datasets = [];
      if (view === 'all') {
        datasets = [
          { label: '원시 시계열 Y(t)', data: raw.filter((_, i) => i % sampleStep === 0), borderColor: colors.gray, borderWidth: 1, pointRadius: 0 },
          { label: '장기 추세 성분 T(t)', data: decomp.trend.filter((_, i) => i % sampleStep === 0), borderColor: colors.blue, borderWidth: 2.5, pointRadius: 0 },
          { label: '주기/계절 성분 S(t)', data: decomp.seasonal.filter((_, i) => i % sampleStep === 0), borderColor: colors.emerald, borderWidth: 1.5, pointRadius: 0 },
          { label: '불규칙 잔차 R(t)', data: decomp.residual.filter((_, i) => i % sampleStep === 0), borderColor: colors.rose, borderWidth: 1, pointRadius: 0 }
        ];
      } else {
        datasets = [
          {
            label: '불규칙 잔차 성분 R(t) = Y(t) - T(t) - S(t)',
            data: decomp.residual.filter((_, i) => i % sampleStep === 0),
            borderColor: colors.rose,
            backgroundColor: 'rgba(244, 63, 94, 0.2)',
            fill: true,
            borderWidth: 1.5,
            pointRadius: 0
          }
        ];
      }

      chartInstances['m16'] = new Chart(ctx, {
        type: 'line',
        data: { labels, datasets },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          animation: false,
          scales: {
            x: { maxTicksLimit: 12 },
            y: { title: { display: true, text: '신호 진폭 (°C)' } }
          }
        }
      });
    }

    document.querySelectorAll('input[name="decomp_view"]').forEach(radio => {
      radio.addEventListener('change', (e) => updateDecomp(e.target.value));
    });
    updateDecomp('all');
  }

  // =========================================================================
  // M17: FFT Frequency Spectrum
  // =========================================================================
  function renderM17_FFT() {
    const ctx = document.getElementById('chart-m17');
    if (!ctx) return;

    const m17 = gData.analytics.m17_fft;
    const labels = m17.frequencies.map((f, i) => `${f.toFixed(4)} (주기 ${m17.period_min[i]}분)`);

    chartInstances['m17'] = new Chart(ctx, {
      type: 'line',
      data: {
        labels: labels.slice(1, 40),
        datasets: [
          {
            label: '원시 센서 파워 스펙트럼 (PSD Raw)',
            data: m17.psd_raw.slice(1, 40),
            borderColor: colors.rose,
            backgroundColor: 'rgba(244, 63, 94, 0.1)',
            fill: true,
            borderWidth: 2,
            pointRadius: 2
          },
          {
            label: '참값 파워 스펙트럼 (PSD True)',
            data: m17.psd_true.slice(1, 40),
            borderColor: colors.emerald,
            borderWidth: 2.5,
            pointRadius: 2
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        scales: {
          x: { maxTicksLimit: 8, title: { display: true, text: '주파수 (cycles/min)' } },
          y: { type: 'logarithmic', title: { display: true, text: '파워 스펙트럼 밀도 (Log Scale)' } }
        }
      }
    });
  }

  // =========================================================================
  // M18: Radar Chart Profiling by Event
  // =========================================================================
  function renderM18_Radar() {
    const ctx = document.getElementById('chart-m18');
    if (!ctx) return;

    const rData = gData.analytics.m18_radar;
    const events = ['정상', '부하 증가', '장시간 부하', '단기 과열', '급격한 과열'];
    const features = ['온도 평균(°C)', '진동 RMS (x10)', '압력 (-100kPa)', '온도 변동성(σ)', '진동 변동성(x10)'];

    const eventColors = {
      '정상': colors.blue,
      '부하 증가': colors.amber,
      '장시간 부하': colors.purple,
      '단기 과열': colors.cyan,
      '급격한 과열': colors.rose
    };

    const datasets = events.map(ev => {
      const d = rData[ev];
      return {
        label: `${ev} (${d.count}건)`,
        data: [
          d.temp_mean,
          d.vib_mean * 10,
          (d.press_mean - 100) * 5,
          d.temp_std * 3,
          d.vib_std * 15
        ],
        borderColor: eventColors[ev],
        backgroundColor: eventColors[ev] + '22',
        borderWidth: 2,
        pointRadius: 3
      };
    });

    chartInstances['m18'] = new Chart(ctx, {
      type: 'radar',
      data: { labels: features, datasets },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        scales: {
          r: {
            angleLines: { color: isDarkMode ? colors.gridDark : colors.gridLight },
            grid: { color: isDarkMode ? colors.gridDark : colors.gridLight },
            pointLabels: { font: { size: 11, weight: 'bold' } }
          }
        }
      }
    });
  }

  // =========================================================================
  // M19: Unsupervised K-Means Clustering
  // =========================================================================
  function renderM19_KMeans() {
    const ctx = document.getElementById('chart-m19');
    if (!ctx) return;

    const rawTemp = gData.raw_data.raw_temp;
    const vib = gData.raw_data.vib;
    const km = gData.analytics.m19_kmeans;

    const clusterColors = [colors.blue, colors.amber, colors.rose, colors.purple];
    const clusterNames = km.clusters.map(c => `Cluster ${c.cluster_id}: ${c.dominant_event} (${c.size}건)`);

    const sampleStep = 2;
    const datasets = km.clusters.map((c, cIdx) => {
      const pts = [];
      for (let i = 0; i < km.labels.length; i += sampleStep) {
        if (km.labels[i] === cIdx) {
          pts.push({ x: rawTemp[i], y: vib[i] });
        }
      }
      return {
        label: clusterNames[cIdx],
        data: pts,
        backgroundColor: clusterColors[cIdx],
        pointRadius: 4,
        pointHoverRadius: 6
      };
    });

    chartInstances['m19'] = new Chart(ctx, {
      type: 'scatter',
      data: { datasets },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        scales: {
          x: { title: { display: true, text: '온도센서 원시값 (°C)' } },
          y: { title: { display: true, text: '진동 RMS (mm/s)' } }
        }
      }
    });
  }

  // =========================================================================
  // M20: Markov State Transition Matrix
  // =========================================================================
  function renderM20_Markov() {
    const ctx = document.getElementById('chart-m20');
    const tbody = document.getElementById('tbody-m20');
    if (!ctx) return;

    const markov = gData.analytics.m20_markov;
    const states = markov.states;
    const mat = markov.transition_matrix;

    // Heatmap bar chart representation of top transition probabilities
    chartInstances['m20'] = new Chart(ctx, {
      type: 'bar',
      data: {
        labels: states,
        datasets: states.map((st, j) => ({
          label: `→ ${st}`,
          data: mat.map(row => row[j]),
          backgroundColor: [colors.blue, colors.rose, colors.amber, colors.cyan, colors.emerald, colors.purple, colors.gray][j % 7]
        }))
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        scales: {
          x: { stacked: true, title: { display: true, text: '현재 상태 (Source State)' } },
          y: { stacked: true, max: 1.0, title: { display: true, text: '전이 확률 (P)' } }
        }
      }
    });

    if (tbody) {
      const keyTransitions = [
        { src: '정상', dst: '정상', p: mat[states.indexOf('정상')][states.indexOf('정상')], level: '안전' },
        { src: '부하 증가', dst: '급격한 과열', p: mat[states.indexOf('부하 증가')][states.indexOf('급격한 과열')], level: '위험 주의' },
        { src: '부하 증가', dst: '장시간 부하', p: mat[states.indexOf('부하 증가')][states.indexOf('장시간 부하')], level: '경고' },
        { src: '급격한 과열', dst: '정상', p: mat[states.indexOf('급격한 과열')][states.indexOf('정상')], level: '회복' },
        { src: '단기 과열', dst: '정상', p: mat[states.indexOf('단기 과열')][states.indexOf('정상')], level: '정상화' },
        { src: '일시 냉각', dst: '정상', p: mat[states.indexOf('일시 냉각')][states.indexOf('정상')], level: '정상화' }
      ];

      tbody.innerHTML = keyTransitions.map(tr => `
        <tr>
          <td><strong>${tr.src}</strong></td>
          <td><strong>${tr.dst}</strong></td>
          <td class="font-bold ${(tr.p > 0.05 && tr.level.includes('위험')) ? 'text-rose' : 'text-cyan'}">${(tr.p * 100).toFixed(1)}%</td>
          <td><span class="method-tag ${tr.level.includes('위험') ? 'text-rose' : ''}">${tr.level}</span></td>
        </tr>
      `).join('');
    }
  }

})();
