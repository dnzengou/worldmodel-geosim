/* GeoSim v2 — lean vanilla SPA. Zero frameworks, surgical state. */

// ── State ──────────────────────────────────────────────────────────────────────
const S = {
  page: 'dashboard',
  scenario: {
    base_escalation: 0.3,
    triggers: { energy: false, chokepoint: false, sanctions: false },
    theories: { escalation: 1.0 },
    nuclear_deterrence: false,
    aggression: { US: 0.6, EU: 0.4, RU: 0.7, CN: 0.55 },
  },
  simResult: null,
  mcResult: null,
  beliefResult: null,
  scenarios: [],
  worldState: null,
  loadedScenarioId: null,
  wargame: { us: 0.6, eu: 0.4, ru: 0.7, cn: 0.55, blockade: false, energy: false, deterrence: true },
  compareA: null,
  compareB: null,
  cmpResult: null,
};

// ── API ────────────────────────────────────────────────────────────────────────
const API = {
  async post(path, data) {
    const r = await fetch(path, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!r.ok) throw new Error(await r.text());
    return r.json();
  },
  async get(path) {
    const r = await fetch(path);
    if (!r.ok) throw new Error(await r.text());
    return r.json();
  },
};

// ── Helpers ────────────────────────────────────────────────────────────────────
function riskColor(s) {
  return s < 0.35 ? '#00ff88' : s < 0.6 ? '#ffa500' : s < 0.8 ? '#ff6b35' : '#ff3855';
}
function riskLabel(s) {
  return s < 0.35 ? 'LOW' : s < 0.6 ? 'MODERATE' : s < 0.8 ? 'HIGH' : 'CRITICAL';
}
function badgeClass(s) {
  return s < 0.35 ? 'badge-low' : s < 0.6 ? 'badge-mod' : s < 0.8 ? 'badge-high' : 'badge-crit';
}
function fmt(n) { return typeof n === 'number' ? n.toFixed(3) : n; }
function dl(data, fname) {
  const a = document.createElement('a');
  a.href = 'data:application/json,' + encodeURIComponent(JSON.stringify(data, null, 2));
  a.download = fname; a.click();
}

// ── Plotly chart helpers ───────────────────────────────────────────────────────
const LAYOUT_BASE = {
  paper_bgcolor: '#0a0e1a', plot_bgcolor: '#0d1117',
  font: { family: "'JetBrains Mono', monospace", color: '#e2e8f0', size: 11 },
  margin: { l: 40, r: 20, t: 40, b: 40 },
};

function drawGauge(elId, value, title = 'Global Stress Index') {
  if (!document.getElementById(elId)) return;
  const c = riskColor(value);
  Plotly.react(elId, [{
    type: 'indicator', mode: 'gauge+number', value,
    title: { text: title, font: { color: '#94a3b8', size: 12 } },
    number: { font: { color: c, size: 30 }, valueformat: '.3f' },
    gauge: {
      axis: { range: [0, 1], tickcolor: '#64748b', tickfont: { size: 9 } },
      bar: { color: c, thickness: 0.3 }, bgcolor: '#0d1117', bordercolor: '#1e2a3a',
      steps: [
        { range: [0, 0.35], color: '#0f1f1a' }, { range: [0.35, 0.6], color: '#1a1500' },
        { range: [0.6, 0.8], color: '#1a0e00' }, { range: [0.8, 1], color: '#1a060a' },
      ],
      threshold: { value: 0.8, line: { color: '#ff3855', width: 2 } },
    },
  }], { ...LAYOUT_BASE, height: 260, margin: { l: 20, r: 20, t: 40, b: 10 } }, { responsive: true });
}

function drawHistogram(elId, res) {
  if (!document.getElementById(elId)) return;
  const pts = res.histogram || [];
  Plotly.react(elId, [
    { x: pts, type: 'histogram', nbinsx: 50, marker: { color: '#00d4ff', opacity: 0.7 }, name: '' },
  ], {
    ...LAYOUT_BASE,
    title: { text: 'Escalation Distribution', font: { color: '#94a3b8', size: 12 } },
    xaxis: { title: 'Escalation', color: '#64748b', range: [0, 1], gridcolor: '#1e2a3a' },
    yaxis: { title: 'Count', color: '#64748b', gridcolor: '#1e2a3a' },
    height: 320,
    shapes: [
      { type: 'line', x0: res.p10, x1: res.p10, y0: 0, y1: 1, yref: 'paper', line: { color: '#00ff88', dash: 'dash', width: 2 } },
      { type: 'line', x0: res.p50, x1: res.p50, y0: 0, y1: 1, yref: 'paper', line: { color: '#ffa500', dash: 'dash', width: 2 } },
      { type: 'line', x0: res.p90, x1: res.p90, y0: 0, y1: 1, yref: 'paper', line: { color: '#ff3855', dash: 'dash', width: 2 } },
    ],
  }, { responsive: true });
}

function drawStrategyChart(elId, history) {
  if (!document.getElementById(elId)) return;
  const steps = history.map((_, i) => i);
  Plotly.react(elId, [
    { x: steps, y: history.map(h => h.Hawk || 0), name: 'Hawk', mode: 'lines+markers', line: { color: '#ff3855', width: 2 }, marker: { size: 4 } },
    { x: steps, y: history.map(h => h.Dove || 0), name: 'Dove', mode: 'lines+markers', line: { color: '#00ff88', width: 2 }, fill: 'tonexty', fillcolor: 'rgba(0,255,136,0.05)', marker: { size: 4 } },
  ], {
    ...LAYOUT_BASE,
    title: { text: 'Strategy Evolution (Replicator + Mimic)', font: { color: '#94a3b8', size: 12 } },
    xaxis: { title: 'Step', color: '#64748b', gridcolor: '#1e2a3a' },
    yaxis: { title: 'Frequency', color: '#64748b', range: [0, 1], gridcolor: '#1e2a3a' },
    height: 280, legend: { bgcolor: '#0d1117', bordercolor: '#1e2a3a', borderwidth: 1, font: { size: 10 } },
  }, { responsive: true });
}

function drawGlobe(elId, worldState) {
  if (!document.getElementById(elId) || !worldState) return;
  const traces = [];
  // Energy route arcs
  (worldState.energy_routes || []).forEach(r => {
    traces.push({
      type: 'scattergeo', mode: 'lines', showlegend: false,
      lon: [r.from[0], r.to[0], null], lat: [r.from[1], r.to[1], null],
      line: { width: 1.5, color: '#00d4ff' }, opacity: 0.5,
    });
  });
  // Chokepoints
  const cp = worldState.chokepoints || {};
  const cpNames = Object.keys(cp);
  traces.push({
    type: 'scattergeo', mode: 'markers+text',
    lon: cpNames.map(k => cp[k].lon), lat: cpNames.map(k => cp[k].lat),
    text: cpNames, textposition: 'top center',
    textfont: { color: '#e2e8f0', size: 10 },
    marker: { size: 12, color: cpNames.map(k => riskColor(cp[k].risk)), symbol: 'diamond' },
    name: 'Chokepoints',
    hovertemplate: '<b>%{text}</b><extra></extra>',
  });
  Plotly.react(elId, traces, {
    ...LAYOUT_BASE, height: 520, margin: { l: 0, r: 0, t: 0, b: 0 },
    geo: {
      projection: { type: 'orthographic' },
      showland: true, landcolor: '#111827',
      showocean: true, oceancolor: '#0a0e1a',
      showcoastlines: true, coastlinecolor: '#1e2a3a',
      showcountries: true, countrycolor: '#1e2a3a',
      bgcolor: '#0a0e1a',
    },
  }, { responsive: true });
}

function drawRiskMatrix(elId, scenarios) {
  if (!document.getElementById(elId)) return;
  const traces = scenarios.map(s => {
    const impact = (s.triggers.energy ? 0.4 : 0) + (s.triggers.chokepoint ? 0.4 : 0) + (s.triggers.sanctions ? 0.2 : 0);
    return {
      x: [impact], y: [s.base_escalation], mode: 'markers+text',
      name: s.name, text: [s.icon], textfont: { size: 18 },
      marker: { size: 18, color: riskColor(s.base_escalation), opacity: 0.85 },
      hovertemplate: `<b>${s.name}</b><br>Prob: ${s.base_escalation.toFixed(2)}<br>Impact: ${impact.toFixed(2)}<extra></extra>`,
    };
  });
  Plotly.react(elId, traces, {
    ...LAYOUT_BASE,
    title: { text: 'Risk Matrix — Probability vs Impact', font: { color: '#94a3b8', size: 12 } },
    xaxis: { title: 'Impact', color: '#64748b', range: [0, 1.05], gridcolor: '#1e2a3a' },
    yaxis: { title: 'Probability', color: '#64748b', range: [0, 1.05], gridcolor: '#1e2a3a' },
    height: 360, showlegend: false,
    shapes: [{ type: 'rect', x0: 0.5, y0: 0.5, x1: 1.05, y1: 1.05, fillcolor: 'rgba(255,56,85,0.06)', line: { color: '#ff3855', width: 1, dash: 'dot' } }],
  }, { responsive: true });
}

// ── Pages ──────────────────────────────────────────────────────────────────────

function scCard(s) {
  const c = riskColor(s.base_escalation);
  const w = Math.round(s.base_escalation * 100);
  const active = S.loadedScenarioId === s.id ? ' active' : '';
  return `<div class="sc-card${active}" onclick="loadScenario('${s.id}')">
    <div class="sc-card-header">
      <span class="sc-icon">${s.icon}</span>
      <span class="sc-esc">ESC ${s.base_escalation.toFixed(2)}</span>
    </div>
    <div class="sc-name">${s.name}</div>
    <div class="sc-desc">${s.description.slice(0, 75)}…</div>
    <div class="sc-bar"><div class="sc-bar-fill" style="width:${w}%;background:${c}"></div></div>
  </div>`;
}

function pageDashboard() {
  const r = S.simResult;
  const score = r ? r.score : 0;
  const label = r ? r.label : 'N/A';
  const color = r ? r.color : '#64748b';
  const triggers = Object.entries(S.scenario.triggers).filter(([,v]) => v).map(([k]) => k);

  return `<h1>🏠 Mission Overview</h1>
    <div class="grid-4" style="margin-bottom:1rem">
      <div class="metric"><div class="metric-label">Global Stress</div><div class="metric-value">${r ? fmt(score) : '—'}</div></div>
      <div class="metric"><div class="metric-label">Threat Level</div><div class="metric-value" style="color:${color};font-size:1.1rem">${label}</div></div>
      <div class="metric"><div class="metric-label">Active Triggers</div><div class="metric-value">${triggers.length}</div></div>
      <div class="metric"><div class="metric-label">Deterrence</div><div class="metric-value" style="font-size:1rem">${S.scenario.nuclear_deterrence ? 'ON' : 'OFF'}</div></div>
    </div>
    <div class="grid-2" style="margin-bottom:1rem">
      <div class="chart-box"><div id="dash-gauge" style="height:260px"></div></div>
      <div class="chart-box"><div id="dash-matrix" style="height:360px"></div></div>
    </div>
    <h2>Scenario Library</h2>
    <div class="grid-auto" id="sc-grid">Loading…</div>`;
}

function pageEditor() {
  const sc = S.scenario;
  return `<h1>📝 Scenario Editor</h1>
    <div class="grid-2">
      <div>
        <h2>Parameters</h2>
        <label class="field-label">Base Escalation <span style="color:var(--green)" id="esc-val">${fmt(sc.base_escalation)}</span></label>
        <input type="range" min="0" max="1" step="0.01" value="${sc.base_escalation}" id="esc-slider"
          oninput="S.scenario.base_escalation=+this.value;document.getElementById('esc-val').textContent=fmt(+this.value)">
        <div style="margin-top:1rem">
          <label class="field-label">Escalation Theory Factor</label>
          <select id="theory-sel" onchange="S.scenario.theories.escalation=+this.value">
            ${[0.5,0.7,0.8,0.9,1.0,1.1,1.2].map(v=>`<option value="${v}" ${sc.theories.escalation==v?'selected':''}>${v}</option>`).join('')}
          </select>
        </div>
        <div class="check-row" style="margin-top:0.75rem">
          <input type="checkbox" id="det-cb" ${sc.nuclear_deterrence?'checked':''} onchange="S.scenario.nuclear_deterrence=this.checked">
          <label for="det-cb">Nuclear deterrence (cubic dampening)</label>
        </div>
      </div>
      <div>
        <h2>Triggers</h2>
        ${['energy:Energy crisis / LNG shock','chokepoint:Chokepoint blockade','sanctions:Economic sanctions / decoupling'].map(t => {
          const [k, label] = t.split(':');
          return `<div class="check-row">
            <input type="checkbox" id="trig-${k}" ${sc.triggers[k]?'checked':''} onchange="S.scenario.triggers.${k}=this.checked">
            <label for="trig-${k}">${label}</label>
          </div>`;
        }).join('')}
      </div>
    </div>
    <div style="max-width:320px;margin:1.25rem 0">
      <button class="btn" id="sim-btn" onclick="runSimulate()">▶ Simulate Step</button>
    </div>
    <div id="sim-results"></div>`;
}

function pageRiskPreview() {
  const b = S.beliefResult;
  const sc = S.scenario;
  return `<h1>⚠️ Risk Preview</h1>
    <div class="grid-2">
      <div>
        <h2>Dempster-Shafer Belief Fusion</h2>
        <p style="margin-bottom:0.75rem">Fusing US · EU · RU aggression signals via D-S combination rule</p>
        ${['us:US aggression','eu:EU aggression','ru:RU aggression'].map(row => {
          const [k, lbl] = row.split(':');
          const val = sc.aggression[k.toUpperCase()] || (k==='us'?0.6:k==='eu'?0.4:0.7);
          return `<label class="field-label">${lbl} <span style="color:var(--green)" id="agg-${k}-val">${val.toFixed(2)}</span></label>
          <input type="range" min="0" max="1" step="0.01" value="${val}" id="agg-${k}"
            oninput="document.getElementById('agg-${k}-val').textContent=(+this.value).toFixed(2);runBelief()">`;
        }).join('')}
        <div id="belief-table" style="margin-top:0.75rem">${b ? renderBeliefTable(b.beliefs) : '<p>Adjust sliders above to compute.</p>'}</div>
        <div class="chart-box" style="margin-top:0.75rem"><div id="belief-gauge" style="height:240px"></div></div>
      </div>
      <div>
        <h2>Evolutionary Game Theory</h2>
        <p style="margin-bottom:0.75rem">Hawk / Dove replicator + imitation dynamics — 20 steps</p>
        <div class="chart-box"><div id="strategy-chart" style="height:280px"></div></div>
        <div id="strategy-summary" style="margin-top:0.5rem;font-size:0.78rem;color:var(--muted)">
          ${b ? renderStrategySummary(b.strategy_history) : ''}
        </div>
      </div>
    </div>`;
}

function renderBeliefTable(beliefs) {
  const rows = [
    ['H (Hostile)', beliefs.H, 'High threat'],
    ['L (Low)', beliefs.L, 'Low threat'],
    ['Θ (Uncertain)', beliefs['Θ'] ?? beliefs['Th'] ?? beliefs[Object.keys(beliefs).find(k=>k!=='H'&&k!=='L')], 'Inconclusive'],
  ];
  return `<table><thead><tr><th>Frame</th><th>Mass</th><th>Interpretation</th></tr></thead><tbody>
    ${rows.map(([f,m,i])=>`<tr><td>${f}</td><td style="color:var(--green)">${fmt(m)}</td><td>${i}</td></tr>`).join('')}
  </tbody></table>`;
}

function renderStrategySummary(history) {
  if (!history?.length) return '';
  const final = history[history.length - 1];
  const dom = Object.entries(final).sort((a,b)=>b[1]-a[1])[0];
  return `Dominant strategy: <strong style="color:var(--green)">${dom[0]}</strong> (${fmt(dom[1])})`;
}

function pageWargame() {
  const wg = S.wargame;
  const esc = calcWargameEsc(wg);
  const c = riskColor(esc);
  return `<h1>⚔️ War-Game Mode</h1>
    <p style="margin-bottom:1rem">Manual override sandbox — real-time aggression → escalation</p>
    <div class="grid-3">
      <div>
        ${actorSlider('us','🇺🇸 US',wg.us)}
        ${actorSlider('eu','🇪🇺 EU',wg.eu)}
      </div>
      <div>
        ${actorSlider('ru','🇷🇺 Russia',wg.ru)}
        ${actorSlider('cn','🇨🇳 China',wg.cn)}
      </div>
      <div>
        <label class="field-label" style="margin-top:0.5rem">Modifiers</label>
        ${wgCheck('wg-blockade','Maritime blockade',wg.blockade,'S.wargame.blockade=this.checked;updateWargame()')}
        ${wgCheck('wg-energy','Energy shock',wg.energy,'S.wargame.energy=this.checked;updateWargame()')}
        ${wgCheck('wg-det','Nuclear deterrence',wg.deterrence,'S.wargame.deterrence=this.checked;updateWargame()')}
      </div>
    </div>
    <div class="grid-3" style="margin:1rem 0">
      <div class="metric"><div class="metric-label">Escalation</div><div class="metric-value" id="wg-esc" style="color:${c}">${fmt(esc)}</div></div>
      <div class="metric"><div class="metric-label">Risk Score</div><div class="metric-value" id="wg-score">—</div></div>
      <div class="metric"><div class="metric-label">Threat Level</div><div class="metric-value" id="wg-label" style="color:${c};font-size:1rem">${riskLabel(esc)}</div></div>
    </div>
    <div class="grid-2">
      <div class="chart-box"><div id="wg-gauge" style="height:260px"></div></div>
      <div id="wg-export" style="padding:1rem">
        <button class="btn btn-sm" onclick="exportWargame()">Export Snapshot</button>
      </div>
    </div>`;
}

function actorSlider(key, label, val) {
  return `<label class="field-label">${label} <span style="color:var(--green)" id="wg-${key}-val">${val.toFixed(2)}</span></label>
  <div class="range-row">
    <input type="range" min="0" max="1" step="0.01" value="${val}" id="wg-${key}"
      oninput="S.wargame.${key}=+this.value;document.getElementById('wg-${key}-val').textContent=(+this.value).toFixed(2);updateWargame()">
  </div>`;
}
function wgCheck(id, label, checked, onchange) {
  return `<div class="check-row"><input type="checkbox" id="${id}" ${checked?'checked':''} onchange="${onchange}"><label for="${id}">${label}</label></div>`;
}
function calcWargameEsc(wg) {
  let esc = (wg.us + wg.eu + wg.ru + wg.cn) / 4;
  if (wg.blockade) esc += 0.2;
  if (wg.energy) esc += 0.15;
  if (wg.deterrence) esc = Math.max(0, esc - 0.8 * Math.pow(esc, 3));
  return Math.min(1, esc);
}

function pageMC() {
  const res = S.mcResult;
  return `<h1>📊 Monte Carlo Risk</h1>
    <div class="grid-2">
      <div>
        <h2>Configuration</h2>
        <label class="field-label">Base Escalation <span style="color:var(--green)" id="mc-esc-val">${S.scenario.base_escalation.toFixed(2)}</span></label>
        <input type="range" min="0" max="1" step="0.01" value="${S.scenario.base_escalation}" id="mc-esc"
          oninput="S.scenario.base_escalation=+this.value;document.getElementById('mc-esc-val').textContent=(+this.value).toFixed(2)">
        <div style="margin-top:0.5rem">
          ${['energy:Energy trigger','chokepoint:Chokepoint trigger','sanctions:Sanctions trigger'].map(t=>{
            const [k,lbl]=t.split(':');
            return `<div class="check-row"><input type="checkbox" id="mc-${k}" ${S.scenario.triggers[k]?'checked':''}
              onchange="S.scenario.triggers.${k}=this.checked"><label for="mc-${k}">${lbl}</label></div>`;
          }).join('')}
          <div class="check-row"><input type="checkbox" id="mc-det" ${S.scenario.nuclear_deterrence?'checked':''}
            onchange="S.scenario.nuclear_deterrence=this.checked"><label for="mc-det">Nuclear deterrence</label></div>
        </div>
        <label class="field-label" style="margin-top:0.75rem">Runs</label>
        <select id="mc-runs">
          ${[1000,5000,10000,50000].map(n=>`<option value="${n}" ${n===10000?'selected':''}>${n.toLocaleString()}</option>`).join('')}
        </select>
        <div style="margin-top:1rem"><button class="btn" id="mc-btn" onclick="runMC()">▶ Run Simulation</button></div>
      </div>
      <div>
        <h2>Results</h2>
        <div id="mc-results">${res ? renderMCResults(res) : '<p>Configure and run simulation.</p>'}</div>
        <div class="chart-box" style="margin-top:0.75rem"><div id="mc-hist" style="height:320px"></div></div>
      </div>
    </div>`;
}

function renderMCResults(res) {
  const metrics = [['P10', res.p10,'var(--green)'],['Median P50',res.p50,'var(--amber)'],['P90',res.p90,'var(--red)'],['Mean',res.mean,'var(--cyan)'],['Std Dev',res.std,'var(--muted)']];
  return `<div class="grid-3" style="margin-bottom:0.5rem">
    ${metrics.slice(0,3).map(([l,v,c])=>`<div class="metric"><div class="metric-label">${l}</div><div class="metric-value" style="color:${c};font-size:1.1rem">${fmt(v)}</div></div>`).join('')}
  </div>
  <div class="grid-2">
    ${metrics.slice(3).map(([l,v,c])=>`<div class="metric"><div class="metric-label">${l}</div><div class="metric-value" style="color:${c};font-size:1.1rem">${fmt(v)}</div></div>`).join('')}
  </div>
  <a class="dl-link" href="#" onclick="dl(${JSON.stringify({p10:res.p10,p50:res.p50,p90:res.p90,mean:res.mean,std:res.std})},'mc_results.json');return false" style="display:block;margin-top:0.5rem">↓ Download JSON</a>`;
}

function pageGlobe() {
  return `<h1>🌍 3D Energy Flow Globe</h1>
    <div class="grid-2">
      <div>
        <h2>Chokepoint Status</h2>
        <div id="cp-table">Loading…</div>
      </div>
      <div class="chart-box"><div id="globe-chart" style="height:520px">Loading world state…</div></div>
    </div>`;
}

function pageCompare() {
  const options = S.scenarios.map(s => `<option value="${s.id}">${s.icon} ${s.name} (esc ${s.base_escalation.toFixed(2)})</option>`).join('');
  const noScenarios = !S.scenarios.length ? '<p style="color:var(--amber)">Loading scenarios…</p>' : '';
  return `<h1>🆚 Scenario Comparison</h1>
    <p style="margin-bottom:1rem">Run two scenarios side-by-side and diff every risk metric.</p>
    ${noScenarios}
    <div class="cmp-selector">
      <div>
        <label class="field-label">Scenario A</label>
        <select id="cmp-a" onchange="S.compareA=this.value">
          <option value="">— Select —</option>${options}
        </select>
      </div>
      <div class="cmp-vs">VS</div>
      <div>
        <label class="field-label">Scenario B</label>
        <select id="cmp-b" onchange="S.compareB=this.value">
          <option value="">— Select —</option>${options}
        </select>
      </div>
    </div>
    <div style="max-width:320px;margin:1rem 0">
      <button class="btn" id="cmp-btn" onclick="runCompare()">▶ Compare</button>
    </div>
    <div id="cmp-results">${S.cmpResult ? renderCompareResults(S.cmpResult) : '<p>Select two scenarios above and run the comparison.</p>'}</div>`;
}

function renderCompareResults(r) {
  const { a, b } = r;
  const fields = [
    ['Risk Score',     a.res.score,                               b.res.score],
    ['Escalation',     a.res.state.escalation_level,              b.res.state.escalation_level],
    ['Infrastructure', a.res.state.infrastructure_risk_index,     b.res.state.infrastructure_risk_index],
    ['Blockade',       a.res.state.maritime_blockade_persistence, b.res.state.maritime_blockade_persistence],
    ['Energy Pressure',a.res.state.energy_price_pressure,         b.res.state.energy_price_pressure],
  ];
  function delta(va, vb) {
    const d = va - vb;
    const sign = d > 0 ? '+' : '';
    const col = d > 0.05 ? 'var(--red)' : d < -0.05 ? 'var(--green)' : 'var(--muted)';
    const arrow = d > 0.05 ? ' ↑' : d < -0.05 ? ' ↓' : ' ≈';
    return `<span style="color:${col}">${sign}${d.toFixed(3)}${arrow}</span>`;
  }
  const nameA = a.sc.name.length > 24 ? a.sc.name.slice(0, 22) + '…' : a.sc.name;
  const nameB = b.sc.name.length > 24 ? b.sc.name.slice(0, 22) + '…' : b.sc.name;
  return `<div class="cmp-panels">
      <div class="cmp-panel" style="border-top:3px solid ${a.res.color}">
        <div class="cmp-panel-header">
          <span class="cmp-panel-icon">${a.sc.icon}</span>
          <span class="cmp-panel-name">${a.sc.name}</span>
        </div>
        <div class="cmp-panel-meta"><span class="badge ${badgeClass(a.res.score)}">${a.res.label}</span> &nbsp; Score: <strong style="color:${a.res.color}">${fmt(a.res.score)}</strong></div>
        <div class="chart-box" style="margin-top:0.75rem"><div id="cmp-gauge-a" style="height:220px"></div></div>
      </div>
      <div class="cmp-panel" style="border-top:3px solid ${b.res.color}">
        <div class="cmp-panel-header">
          <span class="cmp-panel-icon">${b.sc.icon}</span>
          <span class="cmp-panel-name">${b.sc.name}</span>
        </div>
        <div class="cmp-panel-meta"><span class="badge ${badgeClass(b.res.score)}">${b.res.label}</span> &nbsp; Score: <strong style="color:${b.res.color}">${fmt(b.res.score)}</strong></div>
        <div class="chart-box" style="margin-top:0.75rem"><div id="cmp-gauge-b" style="height:220px"></div></div>
      </div>
    </div>
    <h2>Diff Table</h2>
    <table class="cmp-table"><thead>
      <tr><th>Metric</th><th>A — ${nameA}</th><th>B — ${nameB}</th><th>Δ (A − B)</th></tr>
    </thead><tbody>
      ${fields.map(([lbl, va, vb]) => `<tr>
        <td>${lbl}</td>
        <td style="color:${riskColor(va)}">${fmt(va)}</td>
        <td style="color:${riskColor(vb)}">${fmt(vb)}</td>
        <td>${delta(va, vb)}</td>
      </tr>`).join('')}
    </tbody></table>
    <div style="margin-top:0.75rem">
      <a class="dl-link" href="#" onclick="dl({a:{scenario:S.cmpResult.a.sc.id,result:S.cmpResult.a.res},b:{scenario:S.cmpResult.b.sc.id,result:S.cmpResult.b.res}},'compare_diff.json');return false">↓ Export diff JSON</a>
    </div>`;
}

function drawCompareGauges(r) {
  drawGauge('cmp-gauge-a', r.a.res.score, `${r.a.sc.icon} ${r.a.sc.name.slice(0,20)}`);
  drawGauge('cmp-gauge-b', r.b.res.score, `${r.b.sc.icon} ${r.b.sc.name.slice(0,20)}`);
}

// ── Actions ────────────────────────────────────────────────────────────────────

async function runSimulate() {
  const btn = document.getElementById('sim-btn');
  if (btn) { btn.disabled = true; btn.textContent = 'Simulating…'; }
  try {
    const res = await API.post('/api/simulate', S.scenario);
    S.simResult = res;
    const el = document.getElementById('sim-results');
    if (el) el.innerHTML = renderSimResults(res);
    drawGauge('sim-gauge', res.score, 'Composite Risk Score');
    // Update sidebar
    renderSidebarSummary();
  } catch(e) {
    const el = document.getElementById('sim-results');
    if (el) el.innerHTML = `<p style="color:var(--red)">Error: ${e.message}</p>`;
  } finally {
    if (btn) { btn.disabled = false; btn.textContent = '▶ Simulate Step'; }
  }
}

function renderSimResults(res) {
  const st = res.state;
  const fields = [
    ['Escalation', st.escalation_level],
    ['Infrastructure', st.infrastructure_risk_index],
    ['Blockade', st.maritime_blockade_persistence],
    ['Energy Pressure', st.energy_price_pressure],
    ['Partner Divers.', st.partner_diversification_rate],
  ];
  return `<hr style="border-color:var(--border);margin:1rem 0">
    <h2>Results <span class="badge ${badgeClass(res.score)}" style="margin-left:0.5rem">${res.label}</span></h2>
    <div class="grid-4" style="margin-bottom:0.75rem">
      ${fields.map(([l,v])=>`<div class="metric"><div class="metric-label">${l}</div><div class="metric-value" style="font-size:1.1rem">${fmt(v)}</div></div>`).join('')}
      <div class="metric"><div class="metric-label">Composite Score</div><div class="metric-value" style="color:${res.color}">${fmt(res.score)}</div></div>
    </div>
    <div class="chart-box"><div id="sim-gauge" style="height:260px"></div></div>
    <a class="dl-link" href="#" onclick="dl(S.scenario,'scenario.json');return false" style="display:block;margin-top:0.5rem">↓ Download scenario JSON</a>`;
}

async function runBelief() {
  const us = +(document.getElementById('agg-us')?.value ?? 0.6);
  const eu = +(document.getElementById('agg-eu')?.value ?? 0.4);
  const ru = +(document.getElementById('agg-ru')?.value ?? 0.7);
  try {
    const res = await API.post('/api/belief', { us, eu, ru, base_escalation: S.scenario.base_escalation });
    S.beliefResult = res;
    const bt = document.getElementById('belief-table');
    if (bt) bt.innerHTML = renderBeliefTable(res.beliefs);
    const ss = document.getElementById('strategy-summary');
    if (ss) ss.innerHTML = renderStrategySummary(res.strategy_history);
    const bVal = res.beliefs.H || 0;
    drawGauge('belief-gauge', bVal, 'Fused Threat Belief');
    drawStrategyChart('strategy-chart', res.strategy_history);
  } catch(e) { console.error(e); }
}

function updateWargame() {
  const esc = calcWargameEsc(S.wargame);
  const c = riskColor(esc);
  const escEl = document.getElementById('wg-esc');
  const lblEl = document.getElementById('wg-label');
  if (escEl) { escEl.textContent = fmt(esc); escEl.style.color = c; }
  if (lblEl) { lblEl.textContent = riskLabel(esc); lblEl.style.color = c; }
  drawGauge('wg-gauge', esc, 'Live Escalation Meter');
}

async function runMC() {
  const btn = document.getElementById('mc-btn');
  if (btn) { btn.disabled = true; btn.textContent = 'Running…'; }
  const nRuns = +(document.getElementById('mc-runs')?.value ?? 10000);
  try {
    const res = await API.post('/api/monte-carlo', {
      base_escalation: S.scenario.base_escalation,
      triggers: S.scenario.triggers,
      nuclear_deterrence: S.scenario.nuclear_deterrence,
      n_runs: nRuns,
    });
    S.mcResult = res;
    const el = document.getElementById('mc-results');
    if (el) el.innerHTML = renderMCResults(res);
    drawHistogram('mc-hist', res);
  } catch(e) {
    const el = document.getElementById('mc-results');
    if (el) el.innerHTML = `<p style="color:var(--red)">Error: ${e.message}</p>`;
  } finally {
    if (btn) { btn.disabled = false; btn.textContent = '▶ Run Simulation'; }
  }
}

function exportWargame() {
  const esc = calcWargameEsc(S.wargame);
  dl({ ...S.wargame, escalation: +fmt(esc), threat: riskLabel(esc) }, 'wargame_snapshot.json');
}

function loadScenario(id) {
  const sc = S.scenarios.find(s => s.id === id);
  if (!sc) return;
  S.scenario = {
    base_escalation: sc.base_escalation,
    triggers: { ...sc.triggers },
    theories: { ...sc.theories },
    nuclear_deterrence: sc.nuclear_deterrence,
    aggression: { ...sc.aggression },
  };
  S.loadedScenarioId = id;
  // Auto-simulate
  runSimulate().then(() => navigate('editor'));
}

async function runCompare() {
  const idA = S.compareA || document.getElementById('cmp-a')?.value;
  const idB = S.compareB || document.getElementById('cmp-b')?.value;
  if (!idA || !idB) { alert('Select two scenarios to compare.'); return; }
  if (idA === idB) { alert('Select two different scenarios.'); return; }
  const btn = document.getElementById('cmp-btn');
  if (btn) { btn.disabled = true; btn.textContent = 'Comparing…'; }
  const scA = S.scenarios.find(s => s.id === idA);
  const scB = S.scenarios.find(s => s.id === idB);
  if (!scA || !scB) { if (btn) { btn.disabled = false; btn.textContent = '▶ Compare'; } return; }
  function toReq(sc) {
    return {
      base_escalation: sc.base_escalation,
      triggers: { ...sc.triggers },
      theories: { ...sc.theories },
      nuclear_deterrence: sc.nuclear_deterrence,
      aggression: { ...sc.aggression },
    };
  }
  try {
    const [resA, resB] = await Promise.all([
      API.post('/api/simulate', toReq(scA)),
      API.post('/api/simulate', toReq(scB)),
    ]);
    S.cmpResult = { a: { sc: scA, res: resA }, b: { sc: scB, res: resB } };
    const el = document.getElementById('cmp-results');
    if (el) el.innerHTML = renderCompareResults(S.cmpResult);
    drawCompareGauges(S.cmpResult);
  } catch(e) {
    const el = document.getElementById('cmp-results');
    if (el) el.innerHTML = `<p style="color:var(--red)">Error: ${e.message}</p>`;
  } finally {
    if (btn) { btn.disabled = false; btn.textContent = '▶ Compare'; }
  }
}

// ── NL command ─────────────────────────────────────────────────────────────────
async function handleNL(text) {
  if (!text.trim()) return;
  try {
    const res = await API.post('/api/nl', { text });
    if (!res.parsed) { setNLFeedback('No match'); return; }
    const c = res.changes;
    if (c.base_escalation !== undefined) S.scenario.base_escalation = c.base_escalation;
    if (c.triggers) Object.assign(S.scenario.triggers, c.triggers);
    if (c.nuclear_deterrence !== undefined) S.scenario.nuclear_deterrence = c.nuclear_deterrence;
    if (c.aggression) Object.assign(S.scenario.aggression, c.aggression);
    const nav = c._navigate;
    const PAGE_MAP = { 'Monte Carlo Risk': 'mc', 'War-Game Mode': 'wargame', '3D Globe Viewer': 'globe', 'Risk Preview': 'risk' };
    setNLFeedback(`Applied: ${Object.keys(c).filter(k=>k!=='_navigate').join(', ')}`);
    if (nav && PAGE_MAP[nav]) navigate(PAGE_MAP[nav]);
    else { await runSimulate(); navigate('editor'); }
  } catch(e) { setNLFeedback('Error'); }
}
function setNLFeedback(msg) {
  const el = document.getElementById('nl-feedback');
  if (el) { el.textContent = msg; setTimeout(() => { el.textContent = ''; }, 3000); }
}

// ── Router ─────────────────────────────────────────────────────────────────────
const PAGES = {
  dashboard: { icon: '🏠', label: 'Dashboard', render: pageDashboard },
  editor:    { icon: '📝', label: 'Scenario Editor', render: pageEditor },
  risk:      { icon: '⚠️', label: 'Risk Preview', render: pageRiskPreview },
  wargame:   { icon: '⚔️', label: 'War-Game Mode', render: pageWargame },
  mc:        { icon: '📊', label: 'Monte Carlo', render: pageMC },
  globe:     { icon: '🌍', label: '3D Globe', render: pageGlobe },
  compare:   { icon: '🆚', label: 'Compare', render: pageCompare },
};

function navigate(page) {
  if (!PAGES[page]) return;
  S.page = page;
  // Update nav buttons
  document.querySelectorAll('.nav-btn').forEach(b => b.classList.toggle('active', b.dataset.page === page));
  // Render content
  document.getElementById('content').innerHTML = PAGES[page].render();
  // Post-render: init charts & async loads
  postRender(page);
}

function postRender(page) {
  if (page === 'dashboard') {
    if (S.simResult) drawGauge('dash-gauge', S.simResult.score);
    if (S.scenarios.length) {
      drawRiskMatrix('dash-matrix', S.scenarios);
      document.getElementById('sc-grid').innerHTML = S.scenarios.map(scCard).join('');
    }
  }
  if (page === 'editor' && S.simResult) {
    document.getElementById('sim-results').innerHTML = renderSimResults(S.simResult);
    drawGauge('sim-gauge', S.simResult.score, 'Composite Risk Score');
  }
  if (page === 'wargame') updateWargame();
  if (page === 'mc' && S.mcResult) drawHistogram('mc-hist', S.mcResult);
  if (page === 'risk') {
    if (!S.beliefResult) runBelief();
    else {
      drawGauge('belief-gauge', S.beliefResult.beliefs.H || 0, 'Fused Threat Belief');
      drawStrategyChart('strategy-chart', S.beliefResult.strategy_history);
      const bt = document.getElementById('belief-table');
      if (bt) bt.innerHTML = renderBeliefTable(S.beliefResult.beliefs);
    }
  }
  if (page === 'globe') {
    if (S.worldState) {
      drawGlobe('globe-chart', S.worldState);
      renderCPTable();
    } else {
      API.get('/api/world-state').then(ws => {
        S.worldState = ws;
        drawGlobe('globe-chart', ws);
        renderCPTable();
      });
    }
  }
  if (page === 'compare' && S.cmpResult) drawCompareGauges(S.cmpResult);
}

function renderCPTable() {
  const cp = S.worldState?.chokepoints || {};
  const el = document.getElementById('cp-table');
  if (!el) return;
  el.innerHTML = `<table><thead><tr><th>Chokepoint</th><th>Risk</th><th>Ships/Day</th></tr></thead><tbody>
    ${Object.entries(cp).map(([k,v])=>`<tr>
      <td>${k}</td>
      <td><span class="badge ${badgeClass(v.risk)}">${v.risk.toFixed(2)}</span></td>
      <td>${v.daily_ships?.toLocaleString() || '—'}</td>
    </tr>`).join('')}
  </tbody></table>`;
}

function renderSidebarSummary() {
  const el = document.getElementById('sidebar-summary');
  if (!el) return;
  const esc = S.scenario.base_escalation;
  const trigs = Object.entries(S.scenario.triggers).filter(([,v])=>v).map(([k])=>k).join(' ');
  const label = S.simResult ? S.simResult.label : '—';
  const color = S.simResult ? S.simResult.color : 'var(--dim)';
  el.innerHTML = `Esc: <strong style="color:var(--green)">${esc.toFixed(2)}</strong> &nbsp;
    <span class="badge ${S.simResult ? badgeClass(S.simResult.score) : ''}" style="font-size:0.6rem">${label}</span>
    <br><span style="color:var(--dim)">${trigs || 'no triggers'}</span>`;
}

// ── Onboarding ─────────────────────────────────────────────────────────────────
const OB = {
  step: 1,
  total: 3,
  KEY: 'geosim_onboarded_v2',
  // Featured scenarios for step 2 (subset of full library)
  FEATURED: [
    { id: 'taiwan_blockade',   icon: '🚢', name: 'Taiwan Strait Blockade', esc: 0.75, color: '#ff6b35' },
    { id: 'hormuz_closure',    icon: '⛽', name: 'Hormuz Closure Crisis',   esc: 0.70, color: '#ff6b35' },
    { id: 'multi_front_crisis',icon: '⚠️', name: 'Multi-Front Crisis',      esc: 0.90, color: '#ff3855' },
  ],
  // NL commands for step 3 typewriter
  CMDS: [
    { cmd: 'taiwan blockade worst case',       result: '→ Triggers: chokepoint + energy | Esc: 0.85' },
    { cmd: 'russia high aggression',           result: '→ RU aggression: 0.90' },
    { cmd: 'nuclear deterrence at 80%',        result: '→ Deterrence ON | base_escalation: 0.80' },
    { cmd: 'run monte carlo',                  result: '→ Navigating to Monte Carlo view…' },
    { cmd: 'best case stable baseline',        result: '→ No triggers | base_escalation: 0.10' },
  ],
  _twTimer: null,
  _twIdx: 0,
  _twCharIdx: 0,
};

function onboardInit() {
  if (localStorage.getItem(OB.KEY)) return; // already onboarded
  _obRender(1);
  document.addEventListener('keydown', _obKeydown);
}

function _obKeydown(e) {
  if (e.key === 'Escape') obSkip();
}

function _obRender(step) {
  OB.step = step;
  // Remove existing overlay
  document.getElementById('ob-overlay')?.remove();

  const html = `
<div class="ob-overlay" id="ob-overlay" onclick="_obOverlayClick(event)">
  <div class="ob-modal" role="dialog" aria-modal="true" aria-label="Welcome to GeoSim">
    <button class="ob-skip" onclick="obSkip()">Skip ✕</button>

    <!-- Step 1: Welcome / hero -->
    <div class="ob-step ${step===1?'ob-active':''}" id="ob-s1">
      <span class="ob-hero-icon">🌐</span>
      <h1 class="ob-title">Welcome to <span>2030 GeoSim</span></h1>
      <p class="ob-tagline">Model geopolitical risk · Run war games · Predict escalation</p>
      <div class="ob-stats">
        <div class="ob-stat"><div class="ob-stat-val">10k</div><div class="ob-stat-lbl">MC runs / sim</div></div>
        <div class="ob-stat"><div class="ob-stat-val">8</div><div class="ob-stat-lbl">Crisis scenarios</div></div>
        <div class="ob-stat"><div class="ob-stat-val">~200ms</div><div class="ob-stat-lbl">Simulation time</div></div>
      </div>
      <ul class="ob-features">
        <li>⚔️ &nbsp;War-game any crisis with per-actor aggression controls</li>
        <li>📊 &nbsp;Monte Carlo risk — 10k stochastic runs, instant histogram</li>
        <li>⌨ &nbsp;Natural language — type <em>"taiwan blockade"</em> to simulate</li>
        <li>🌍 &nbsp;3D energy flow globe with live chokepoint risk overlay</li>
      </ul>
      <p class="ob-trust">No account required · <span>Free forever</span> · No data sent</p>
      <div class="ob-actions">
        <button class="btn" onclick="obNext()">Pick a scenario →</button>
      </div>
    </div>

    <!-- Step 2: Scenario picker -->
    <div class="ob-step ${step===2?'ob-active':''}" id="ob-s2">
      <h2 style="margin-top:0;border:none;padding:0;font-size:1.1rem;color:var(--text)">Choose your first scenario</h2>
      <p style="margin:0.3rem 0 0.25rem;font-size:0.78rem">Load a pre-built crisis and see the engine in action — or skip to build your own.</p>
      <div class="ob-sc-grid">
        ${OB.FEATURED.map(s => `
        <div class="ob-sc-card" onclick="obLoadScenario('${s.id}')">
          <span class="ob-sc-card-icon">${s.icon}</span>
          <div class="ob-sc-card-name">${s.name}</div>
          <div class="ob-sc-card-esc">Esc ${s.esc.toFixed(2)}</div>
          <div class="ob-sc-bar"><div class="ob-sc-bar-fill" style="width:${Math.round(s.esc*100)}%;background:${s.color}"></div></div>
        </div>`).join('')}
      </div>
      <div class="ob-actions">
        <button class="btn-ghost" onclick="obPrev()">← Back</button>
        <button class="btn" onclick="obNext()">Learn NL commands →</button>
      </div>
    </div>

    <!-- Step 3: NL command primer -->
    <div class="ob-step ${step===3?'ob-active':''}" id="ob-s3">
      <h2 style="margin-top:0;border:none;padding:0;font-size:1.1rem;color:var(--text)">Command in plain English</h2>
      <p style="margin:0.3rem 0 0.6rem;font-size:0.78rem">The sidebar command bar understands natural language — no syntax to learn.</p>
      <div class="ob-terminal">
        <div class="ob-terminal-header">
          <span class="ob-dot-r"></span><span class="ob-dot-y"></span><span class="ob-dot-g"></span>
          <span class="ob-terminal-label">NL Command Bar</span>
        </div>
        <div class="ob-terminal-prompt"><span id="ob-tw" class="ob-typewriter"></span><span class="ob-cursor"></span></div>
        <div class="ob-terminal-result" id="ob-tw-result">​</div>
      </div>
      <p style="font-size:0.73rem;color:var(--muted);margin-bottom:0.5rem">Try any of these — click to preview:</p>
      <div class="ob-nl-chips">
        ${OB.CMDS.map((c,i) => `<button class="ob-chip" onclick="obPreviewCmd(${i})">${c.cmd}</button>`).join('')}
      </div>
      <div class="ob-actions">
        <button class="btn-ghost" onclick="obPrev()">← Back</button>
        <button class="btn" onclick="obFinish()">Launch GeoSim →</button>
      </div>
    </div>

    <!-- Dot indicators -->
    <div class="ob-dots">
      ${[1,2,3].map(i=>`<span class="ob-dot${i===step?' ob-dot-active':''}"></span>`).join('')}
    </div>
    <p class="ob-esc-hint"><kbd>Esc</kbd> to dismiss at any time</p>
  </div>
</div>`;

  document.body.insertAdjacentHTML('beforeend', html);

  // Start typewriter on step 3
  if (step === 3) _obStartTypewriter();
  else _obStopTypewriter();
}

function _obOverlayClick(e) {
  // Dismiss if clicking backdrop (not modal)
  if (e.target.classList.contains('ob-overlay')) obSkip();
}

function obNext() {
  if (OB.step < OB.total) _obRender(OB.step + 1);
  else obFinish();
}
function obPrev() {
  if (OB.step > 1) _obRender(OB.step - 1);
}
function obSkip() {
  _obClose();
}
function obFinish() {
  localStorage.setItem(OB.KEY, '1');
  _obClose();
}
function _obClose() {
  _obStopTypewriter();
  document.removeEventListener('keydown', _obKeydown);
  const el = document.getElementById('ob-overlay');
  if (el) {
    el.style.animation = 'ob-fadein 0.2s ease reverse';
    setTimeout(() => el.remove(), 200);
  }
}
function obLoadScenario(id) {
  obFinish(); // mark as done, close overlay
  loadScenario(id); // calls existing loadScenario function
}
function obPreviewCmd(idx) {
  _obStopTypewriter();
  const { cmd, result } = OB.CMDS[idx];
  const tw = document.getElementById('ob-tw');
  const res = document.getElementById('ob-tw-result');
  if (tw) tw.textContent = cmd;
  if (res) { res.style.opacity = '0'; setTimeout(() => { res.textContent = result; res.style.opacity = '1'; }, 150); }
}

// Typewriter cycle: types each command, pauses, deletes, moves to next
function _obStartTypewriter() {
  OB._twIdx = 0; OB._twCharIdx = 0;
  _obTypeChar();
}
function _obStopTypewriter() {
  clearTimeout(OB._twTimer);
}
function _obTypeChar() {
  const tw = document.getElementById('ob-tw');
  const res = document.getElementById('ob-tw-result');
  if (!tw) return;
  const { cmd, result } = OB.CMDS[OB._twIdx % OB.CMDS.length];
  if (OB._twCharIdx <= cmd.length) {
    tw.textContent = cmd.slice(0, OB._twCharIdx);
    if (res && OB._twCharIdx === cmd.length) {
      setTimeout(() => { if (res) { res.textContent = result; } }, 200);
    }
    OB._twCharIdx++;
    OB._twTimer = setTimeout(_obTypeChar, OB._twCharIdx <= cmd.length ? 55 : 0);
  } else {
    // Pause at end, then delete
    OB._twTimer = setTimeout(_obDeleteChar, 1600);
  }
}
function _obDeleteChar() {
  const tw = document.getElementById('ob-tw');
  const res = document.getElementById('ob-tw-result');
  if (!tw) return;
  const txt = tw.textContent;
  if (txt.length > 0) {
    tw.textContent = txt.slice(0, -1);
    if (txt.length === 1 && res) res.textContent = '​'; // clear result
    OB._twTimer = setTimeout(_obDeleteChar, 28);
  } else {
    OB._twIdx++;
    OB._twCharIdx = 0;
    OB._twTimer = setTimeout(_obTypeChar, 400);
  }
}

// ── Init ───────────────────────────────────────────────────────────────────────
async function init() {
  // Build sidebar
  const sidebar = document.getElementById('sidebar');
  sidebar.innerHTML = `
    <div class="logo">
      <div class="logo-icon">🌐</div>
      <div class="logo-title">2030 GeoSim</div>
      <div class="logo-sub">CAS Engine v2.0</div>
    </div>
    <div class="nl-label">⌨ Natural Language Command</div>
    <input class="nl-input" id="nl-input" placeholder="e.g. taiwan blockade worst case"
      onkeydown="if(event.key==='Enter')handleNL(this.value)">
    <div class="nl-feedback" id="nl-feedback"></div>
    <div class="nav-section">Navigation</div>
    ${Object.entries(PAGES).map(([k,p])=>`<button class="nav-btn${k===S.page?' active':''}" data-page="${k}" onclick="navigate('${k}')">${p.icon} ${p.label}</button>`).join('')}
    <div class="scenario-summary" id="sidebar-summary">No simulation yet</div>`;

  // Load scenarios in background
  API.get('/api/scenarios').then(sc => {
    S.scenarios = sc;
    if (S.page === 'dashboard') {
      const grid = document.getElementById('sc-grid');
      if (grid) grid.innerHTML = sc.map(scCard).join('');
      drawRiskMatrix('dash-matrix', sc);
    }
  }).catch(() => {});

  // Register PWA service worker
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('/sw.js').catch(() => {});
  }

  // Render initial page
  navigate(S.page);

  // First-run onboarding — shown after page renders so app is visible behind overlay
  requestAnimationFrame(onboardInit);
}

document.addEventListener('DOMContentLoaded', init);
