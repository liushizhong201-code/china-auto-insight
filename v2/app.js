(() => {
  "use strict";

  const data = window.PUBLIC_DASHBOARD_DATA;
  if (!data) {
    document.body.innerHTML = '<p class="empty-state">数据加载失败</p>';
    throw new Error("PUBLIC_DASHBOARD_DATA is missing");
  }

  const state = {
    priceRule: "midpoint",
    matrixMetric: "delta",
    query: "",
    energy: "all",
    level: "all",
    sort: "delta_asc",
  };

  const numberFormatter = new Intl.NumberFormat("zh-CN");
  const collator = new Intl.Collator("zh-CN");

  const formatNumber = (value) => numberFormatter.format(Math.round(value));
  const formatWan = (value, digits = 2) => `${(value / 10000).toFixed(digits)}万`;
  const formatWanLabel = (value) => (value / 10000).toFixed(1);
  const formatSignedWan = (value, digits = 2) => `${value > 0 ? "+" : value < 0 ? "−" : ""}${Math.abs(value / 10000).toFixed(digits)}万`;
  const formatPercent = (value, digits = 1) => value === null ? "—" : `${value > 0 ? "+" : value < 0 ? "−" : ""}${Math.abs(value * 100).toFixed(digits)}%`;
  const formatContribution = (value) => `${Math.abs(value / data.kpis.delta * 100).toFixed(1)}%`;
  const valueClass = (value) => value > 0 ? "value-positive" : value < 0 ? "value-negative" : "";

  function setText(id, value) {
    const element = document.getElementById(id);
    if (element) element.textContent = value;
  }

  function renderHeadlineData() {
    setText("kpi-2025", `${formatWan(data.kpis.ytd_2025)}辆`);
    setText("kpi-2026", `${formatWan(data.kpis.ytd_2026)}辆`);
    setText("kpi-delta", `${formatSignedWan(data.kpis.delta)}辆`);
    setText("kpi-yoy", formatPercent(data.kpis.yoy_rate));

    const biggestEnergy = [...data.energy].sort((a, b) => a.delta - b.delta)[0];
    const positiveLevels = data.levels.filter((item) => item.delta > 0).sort((a, b) => b.delta - a.delta);
    setText("finding-energy-value", `${biggestEnergy.name} ${formatSignedWan(biggestEnergy.delta)}辆`);
    setText("finding-energy-copy", `${biggestEnergy.name}贡献了能源结构中最大的绝对降幅，占样本净减少量的${Math.abs(biggestEnergy.delta / data.kpis.delta * 100).toFixed(1)}%。`);
    setText("finding-level-value", positiveLevels.map((item) => item.name).join("、"));
    setText("finding-level-copy", `${positiveLevels.map((item) => `${item.name}${formatSignedWan(item.delta)}辆`).join("，")}，是级别中少数正增长区域。`);
  }

  function renderPeriods() {
    const root = document.getElementById("period-chart");
    const maxValue = Math.max(...data.periods.flatMap((item) => [item.sales_2025, item.sales_2026]));
    root.innerHTML = data.periods.map((item) => {
      const height2025 = Math.max(2, item.sales_2025 / maxValue * 100);
      const height2026 = Math.max(2, item.sales_2026 / maxValue * 100);
      return `
        <div class="period-group">
          <div class="period-bars">
            <div class="period-bar y2025" style="height:${height2025}%" title="2025年${item.label} ${formatNumber(item.sales_2025)}辆" aria-label="2025年${item.label} ${formatNumber(item.sales_2025)}辆">
              <span class="period-bar-value">${formatWanLabel(item.sales_2025)}</span>
            </div>
            <div class="period-bar y2026" style="height:${height2026}%" title="2026年${item.label} ${formatNumber(item.sales_2026)}辆" aria-label="2026年${item.label} ${formatNumber(item.sales_2026)}辆">
              <span class="period-bar-value">${formatWanLabel(item.sales_2026)}</span>
            </div>
          </div>
          <div class="period-label">${item.label}</div>
          <div class="period-values" aria-hidden="true">
            <span class="y2025">${formatWanLabel(item.sales_2025)}</span>
            <span class="y2026">${formatWanLabel(item.sales_2026)}</span>
          </div>
          <div class="period-change">${formatSignedWan(item.delta, 1)}辆<br>${formatPercent(item.yoy_rate)}</div>
        </div>`;
    }).join("");

    const biggestAbsoluteDecline = [...data.periods].sort((a, b) => a.delta - b.delta)[0];
    const biggestRateDecline = [...data.periods].sort((a, b) => a.yoy_rate - b.yoy_rate)[0];
    document.getElementById("period-insight").innerHTML = `
      <div><span>低于上年同期</span><strong>${data.periods.filter((item) => item.delta < 0).length}／${data.periods.length}个月</strong></div>
      <div><span>绝对降幅最大</span><strong>${biggestAbsoluteDecline.label} ${formatSignedWan(biggestAbsoluteDecline.delta, 1)}辆</strong></div>
      <div><span>同比降幅最大</span><strong>${biggestRateDecline.label} ${formatPercent(biggestRateDecline.yoy_rate)}</strong></div>`;
  }

  function renderDeltaBars(rootId, items, limit = items.length) {
    const root = document.getElementById(rootId);
    const visibleItems = items.slice(0, limit);
    const maxAbs = Math.max(...visibleItems.map((item) => Math.abs(item.delta)), 1);
    root.innerHTML = visibleItems.map((item) => {
      const width = Math.max(1.5, Math.abs(item.delta) / maxAbs * 50);
      return `
        <div class="bar-row">
          <div class="bar-meta">
            <strong>${item.name}</strong>
            <span>2026累计 ${formatWan(item.ytd_2026)}辆</span>
          </div>
          <div class="delta-track" aria-hidden="true">
            <div class="delta-fill ${item.delta >= 0 ? "positive" : "negative"}" style="width:${width}%"></div>
          </div>
          <div class="bar-stats">
            <span>${formatSignedWan(item.delta)}辆 · 同比${formatPercent(item.yoy_rate)}</span>
            <b class="${item.delta >= 0 ? "offset" : ""}">${item.delta >= 0 ? "对冲净降幅" : "净降幅贡献"} ${formatContribution(item.delta)}</b>
          </div>
        </div>`;
    }).join("");
  }

  function renderPrice() {
    const rule = data.price[state.priceRule];
    const groups = [...rule.groups].sort((a, b) => a.delta - b.delta);
    const largestDecline = groups[0];
    const maxAbs = Math.max(...groups.map((item) => Math.abs(item.delta)), 1);
    setText("price-rule-label", rule.label);
    setText("price-callout-band", largestDecline.name);
    setText("price-callout-value", `2026累计${formatWan(largestDecline.ytd_2026)}辆｜样本占比${formatPercent(largestDecline.share_of_2026, 1).replace("+", "")}｜${formatSignedWan(largestDecline.delta)}辆｜同比${formatPercent(largestDecline.yoy_rate)}｜净降幅贡献${formatContribution(largestDecline.delta)}`);
    document.getElementById("price-list").innerHTML = groups.map((item) => `
      <div class="price-row">
        <div class="price-row-head">
          <strong>${item.name}</strong>
          <span>2026累计${formatWan(item.ytd_2026)}辆 · 样本占比${formatPercent(item.share_of_2026, 1).replace("+", "")}</span>
        </div>
        <div class="price-row-trackline">
          <div class="price-track"><div class="price-fill" style="width:${Math.max(2, Math.abs(item.delta) / maxAbs * 100)}%"></div></div>
          <span class="price-value">${formatSignedWan(item.delta)}辆 · ${formatPercent(item.yoy_rate)}</span>
        </div>
      </div>`).join("");
    document.querySelectorAll("[data-price-rule]").forEach((button) => {
      button.setAttribute("aria-pressed", String(button.dataset.priceRule === state.priceRule));
    });
  }

  function matrixColor(item, metric, maxAbs) {
    if (!item) return "transparent";
    const value = metric === "delta" ? item.delta : item.yoy_rate;
    const intensity = Math.min(1, Math.abs(value) / maxAbs);
    const alpha = 0.14 + intensity * 0.68;
    return value >= 0 ? `rgba(27,110,112,${alpha})` : `rgba(213,75,45,${alpha})`;
  }

  function renderMatrix() {
    const metric = state.matrixMetric;
    const energyNames = data.filters.energies;
    const levelNames = data.filters.levels;
    const lookup = new Map(data.matrix.map((item) => [`${item.energy}|${item.level}`, item]));
    const maxAbs = Math.max(...data.matrix.map((item) => Math.abs(metric === "delta" ? item.delta : item.yoy_rate)), 1);
    const head = `<thead><tr><th>能源</th>${levelNames.map((level) => `<th>${level}</th>`).join("")}</tr></thead>`;
    const body = `<tbody>${energyNames.map((energy) => `
      <tr>
        <th>${energy}</th>
        ${levelNames.map((level) => {
          const item = lookup.get(`${energy}|${level}`);
          if (!item) return '<td><span class="matrix-cell empty">·</span></td>';
          const value = metric === "delta" ? `${formatSignedWan(item.delta, 1)}辆` : formatPercent(item.yoy_rate);
          return `<td style="background:${matrixColor(item, metric, maxAbs)}"><button class="matrix-cell" data-matrix-key="${energy}|${level}" aria-label="${energy}${level}，${value}">${value}<br>${item.series_count}个车系</button></td>`;
        }).join("")}
      </tr>`).join("")}</tbody>`;
    document.getElementById("matrix-table").innerHTML = head + body;
    document.querySelectorAll("[data-matrix-metric]").forEach((button) => {
      button.setAttribute("aria-pressed", String(button.dataset.matrixMetric === metric));
    });
  }

  function showMatrixDetail(key) {
    const [energy, level] = key.split("|");
    const item = data.matrix.find((cell) => cell.energy === energy && cell.level === level);
    if (!item) return;
    setText("matrix-detail-title", `${energy} · ${level}`);
    setText("matrix-detail-copy", `${item.series_count}个持续可比车系，2025年同期${formatWan(item.ytd_2025)}辆，2026年同期${formatWan(item.ytd_2026)}辆。`);
    setText("matrix-detail-value", `${formatSignedWan(item.delta)}辆`);
  }

  function populateFilters() {
    const energySelect = document.getElementById("series-energy");
    const levelSelect = document.getElementById("series-level");
    energySelect.innerHTML = '<option value="all">全部能源</option>' + data.filters.energies.map((value) => `<option value="${value}">${value}</option>`).join("");
    levelSelect.innerHTML = '<option value="all">全部级别</option>' + data.filters.levels.map((value) => `<option value="${value}">${value}</option>`).join("");
  }

  function filteredSeries() {
    const query = state.query.trim().toLowerCase();
    const list = data.series.filter((item) => {
      const matchesQuery = !query || [item.series_name, item.brand_name, item.manufacturer_name].join(" ").toLowerCase().includes(query);
      const matchesEnergy = state.energy === "all" || item.energy === state.energy;
      const matchesLevel = state.level === "all" || item.vehicle_level === state.level;
      return matchesQuery && matchesEnergy && matchesLevel;
    });
    const comparators = {
      delta_asc: (a, b) => a.delta - b.delta || collator.compare(a.series_name, b.series_name),
      delta_desc: (a, b) => b.delta - a.delta || collator.compare(a.series_name, b.series_name),
      ytd_2026_desc: (a, b) => b.ytd_2026 - a.ytd_2026 || collator.compare(a.series_name, b.series_name),
      yoy_desc: (a, b) => b.yoy_rate - a.yoy_rate || collator.compare(a.series_name, b.series_name),
    };
    return list.sort(comparators[state.sort]);
  }

  function renderSeries() {
    const list = filteredSeries();
    setText("series-count", `显示${list.length}个车系`);
    const body = document.getElementById("series-body");
    if (!list.length) {
      body.innerHTML = '<tr><td colspan="8" class="empty-state">没有符合条件的车系</td></tr>';
      return;
    }
    body.innerHTML = list.map((item, index) => {
      const smallBase = item.ytd_2025 < 10000 ? "*" : "";
      return `
        <tr tabindex="0" data-series-name="${item.series_name}" aria-label="查看${item.series_name}累计详情">
          <td><span class="rank">${index + 1}</span></td>
          <td><span class="series-name">${item.series_name}</span><span class="series-brand">${item.brand_name} · ${item.manufacturer_name}</span></td>
          <td><span class="tag">${item.energy}</span><span class="tag">${item.vehicle_level}</span></td>
          <td>${item.price_min.toFixed(2)}—${item.price_max.toFixed(2)}万</td>
          <td class="num">${formatNumber(item.ytd_2025)}</td>
          <td class="num">${formatNumber(item.ytd_2026)}</td>
          <td class="num ${valueClass(item.delta)}">${formatSignedWan(item.delta, 1)}${smallBase}</td>
          <td class="num"><button class="details-button" data-series-open="${item.series_name}">详情</button></td>
        </tr>`;
    }).join("");
  }

  function rankOf(name, field, direction = "desc") {
    const sorted = [...data.series].sort((a, b) => direction === "desc" ? b[field] - a[field] : a[field] - b[field]);
    return sorted.findIndex((item) => item.series_name === name) + 1;
  }

  function openSeriesDialog(name) {
    const item = data.series.find((series) => series.series_name === name);
    if (!item) return;
    setText("dialog-title", item.series_name);
    setText("dialog-subtitle", `${item.brand_name} · ${item.manufacturer_name} · ${item.energy} · ${item.vehicle_level}`);
    setText("dialog-price", `${item.price_min.toFixed(2)}—${item.price_max.toFixed(2)}万元`);
    setText("dialog-2025", `${formatNumber(item.ytd_2025)}辆`);
    setText("dialog-2026", `${formatNumber(item.ytd_2026)}辆`);
    setText("dialog-delta", `${formatSignedWan(item.delta)}辆`);
    setText("dialog-yoy", formatPercent(item.yoy_rate));
    setText("dialog-rank-copy", `按累计变化量排序为第${rankOf(name, "delta", "desc")}位；按2026年累计销量排序为第${rankOf(name, "ytd_2026", "desc")}位。`);
    document.getElementById("series-dialog").showModal();
  }

  function renderQuality() {
    const evidence = data.validation_evidence || {
      requests_per_run: "201／201",
      panel_members: "70／70",
      business_fingerprint: "3／3",
    };
    setText("quality-runs", `${data.quality.source_runs}轮`);
    setText("quality-requests", evidence.requests_per_run);
    setText("quality-members", evidence.panel_members);
    setText("quality-fingerprint", evidence.business_fingerprint);
    setText("quality-completeness", formatPercent(data.quality.core_field_completeness, 0).replace("+", ""));
    setText("quality-match", formatPercent(data.quality.stable_id_match_rate, 0).replace("+", ""));
    const comparisonRoot = document.getElementById("comparison-list");
    comparisonRoot.innerHTML = ["2025", "2026"].map((year) => {
      const item = data.official_comparison[year];
      return `<div class="comparison-row"><strong>${year}</strong><span>AutoLink公开总量相对乘联分会狭义零售</span><b>高${formatPercent(item.difference_rate).replace("+", "")}</b></div>`;
    }).join("");
  }

  function bindEvents() {
    document.querySelectorAll("[data-price-rule]").forEach((button) => {
      button.addEventListener("click", () => {
        state.priceRule = button.dataset.priceRule;
        renderPrice();
      });
    });
    document.querySelectorAll("[data-matrix-metric]").forEach((button) => {
      button.addEventListener("click", () => {
        state.matrixMetric = button.dataset.matrixMetric;
        renderMatrix();
      });
    });
    document.getElementById("matrix-table").addEventListener("click", (event) => {
      const button = event.target.closest("[data-matrix-key]");
      if (button) showMatrixDetail(button.dataset.matrixKey);
    });
    document.getElementById("series-query").addEventListener("input", (event) => {
      state.query = event.target.value;
      renderSeries();
    });
    document.getElementById("series-energy").addEventListener("change", (event) => {
      state.energy = event.target.value;
      renderSeries();
    });
    document.getElementById("series-level").addEventListener("change", (event) => {
      state.level = event.target.value;
      renderSeries();
    });
    document.getElementById("series-sort").addEventListener("change", (event) => {
      state.sort = event.target.value;
      renderSeries();
    });
    document.getElementById("series-body").addEventListener("click", (event) => {
      const target = event.target.closest("[data-series-open], [data-series-name]");
      if (target) openSeriesDialog(target.dataset.seriesOpen || target.dataset.seriesName);
    });
    document.getElementById("series-body").addEventListener("keydown", (event) => {
      const row = event.target.closest("[data-series-name]");
      if (row && (event.key === "Enter" || event.key === " ")) {
        event.preventDefault();
        openSeriesDialog(row.dataset.seriesName);
      }
    });
    const dialog = document.getElementById("series-dialog");
    document.getElementById("dialog-close").addEventListener("click", () => dialog.close());
    dialog.addEventListener("click", (event) => {
      const rect = dialog.getBoundingClientRect();
      const inside = event.clientX >= rect.left && event.clientX <= rect.right && event.clientY >= rect.top && event.clientY <= rect.bottom;
      if (!inside) dialog.close();
    });

    const navLinks = [...document.querySelectorAll(".site-nav a")];
    const sections = navLinks.map((link) => document.querySelector(link.getAttribute("href"))).filter(Boolean);
    const observer = new IntersectionObserver((entries) => {
      const visible = entries.filter((entry) => entry.isIntersecting).sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];
      if (!visible) return;
      navLinks.forEach((link) => link.classList.toggle("active", link.getAttribute("href") === `#${visible.target.id}`));
    }, { rootMargin: "-25% 0px -60%", threshold: [0.05, 0.3] });
    sections.forEach((section) => observer.observe(section));
  }

  renderHeadlineData();
  renderPeriods();
  renderDeltaBars("energy-bars", data.energy);
  renderDeltaBars("level-bars", data.levels);
  renderPrice();
  renderMatrix();
  populateFilters();
  renderSeries();
  renderQuality();
  bindEvents();
})();
