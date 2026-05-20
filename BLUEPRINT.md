# 2030 GeoSim — Production Blueprint v2.0

> Design authority: **Karpathy principles + caveman talk + fixclaude optimization**
> Every line justifies existence. No speculation. Small diffs. Surgical only.

---

## Live URLs

| Environment | URL |
|---|---|
| **Production** | https://worldmodel-geosim.vercel.app |
| **Local (Streamlit)** | http://localhost:8501 |
| **API Docs** | https://worldmodel-geosim.vercel.app/api/docs |
| **GitHub** | https://github.com/dnzengou/worldmodel-geosim |

---

## Architecture

### Dual-mode design

```
┌─────────────────────────────────────┐
│  LOCAL DEV          PRODUCTION      │
│                                     │
│  app.py             Vercel CDN      │
│  (Streamlit)   ──── public/         │
│     │               index.html      │
│     └─── src/       style.css  ────▶ Browser SPA
│          └── sim    app.js          │
│          └── ui     manifest.json   │
│          └── nlp    sw.js (PWA)     │
│                          │          │
│                     Vercel Python   │
│                     api/index.py    │
│                     (FastAPI+Mangum)│
│                          │          │
│                     src/ sim core   │
│                     (pure Python)   │
└─────────────────────────────────────┘
```

### File structure (27 files)

```
worldmodel-geosim/
├── app.py                     Streamlit entry point (local dev)
├── requirements.txt           Full deps (Streamlit + all)
├── vercel.json                Vercel: framework=null, outputDirectory=public
├── .streamlit/config.toml     Dark theme + enableStaticServing
│
├── api/
│   ├── index.py               FastAPI + Mangum (7 endpoints)
│   └── requirements.txt       Minimal: fastapi, mangum, numpy, scipy
│
├── src/
│   ├── simulation/
│   │   ├── world_model.py     Baseline data, module-level cache (no Streamlit dep)
│   │   ├── scenarios.py       evolve/shock/deterrence, composite_risk_score
│   │   ├── monte_carlo.py     Vectorized 10-50k MC, RNG seed=42
│   │   └── belief.py          D-S combination rule + replicator dynamics
│   ├── ui/
│   │   ├── styles.py          Dark military CSS + PWA meta inject
│   │   ├── components.py      Plotly: gauge, globe, MC hist, strategy, risk matrix
│   │   └── pages.py           6 Streamlit pages
│   └── nlp/
│       └── parser.py          15+ regex rules, zero-cost NL command parser
│
├── data/
│   └── scenarios.json         8 pre-built scenario templates
│
├── public/                    Static SPA (served by Vercel CDN)
│   ├── index.html             Minimal shell — Plotly CDN + deferred JS
│   ├── style.css              CSS custom properties, dark theme, responsive
│   ├── app.js                 Vanilla JS SPA (~700 LOC): state, API, 6 views, charts
│   ├── manifest.json          PWA manifest
│   └── sw.js                  Service worker (caches static, skips /api/)
│
└── static/                    Streamlit static serve (local)
    ├── manifest.json
    └── sw.js
```

---

## API Reference

Base: `https://worldmodel-geosim.vercel.app`

| Method | Path | Body | Returns |
|--------|------|------|---------|
| GET | `/api/health` | — | `{status, version}` |
| GET | `/api/scenarios` | — | Array of 8 scenario templates |
| GET | `/api/world-state` | — | Chokepoints, energy routes, country risk |
| POST | `/api/simulate` | `SimRequest` | `{state, score, label, color}` |
| POST | `/api/monte-carlo` | `MCRequest` | `{p10,p25,p50,p75,p90,mean,std,histogram[]}` |
| POST | `/api/belief` | `BeliefRequest` | `{beliefs:{H,L,Θ}, strategy_history[]}` |
| POST | `/api/nl` | `{text}` | `{parsed, changes}` |

### SimRequest
```json
{
  "base_escalation": 0.3,
  "triggers": {"energy": false, "chokepoint": false, "sanctions": false},
  "theories": {"escalation": 1.0},
  "nuclear_deterrence": false,
  "aggression": {"US": 0.6, "EU": 0.4, "RU": 0.7, "CN": 0.55}
}
```

---

## Simulation Models

### 1. Scenario evolution
```
state = fresh_state(base_esc)
       → evolve_scenario(triggers, theories)   # +0.15/0.20/0.10 per trigger
       → apply_nuclear_deterrence()            # esc - 0.8*esc³
composite_risk = 0.4*esc + 0.25*infra + 0.20*blockade + 0.15*energy
```

### 2. Monte Carlo
- Vectorized NumPy: N runs, default 10k
- Random shocks: 30% probability, normal distribution
- Returns: p10/p25/p50/p75/p90, mean, std, histogram (downsampled 500pts)

### 3. Dempster-Shafer belief fusion
- Proper D-S combination rule (not naive Bayes)
- Frame: {H=Hostile, L=Low, Θ=Uncertain}
- Conflict mass normalized per Dempster's rule

### 4. Evolutionary game theory
- Replicator dynamics + imitation (mimic)
- Hawk/Dove over 20 steps
- Payoff: Hawk = max(0, 0.9 - escalation + noise), Dove = 0.4 + noise

---

## NL Command Reference (zero-cost, local regex)

| Input | Effect |
|---|---|
| `taiwan strait blockade` | chokepoint=true |
| `energy crisis oil gas` | energy=true |
| `sanctions decouple` | sanctions=true |
| `worst case / critical` | all triggers, esc=0.85 |
| `best case / stable` | no triggers, esc=0.10 |
| `escalation at 70%` | base_escalation=0.70 |
| `nuclear deterrence` | nuclear_deterrence=true |
| `russia high aggression` | aggression.RU=0.9 |
| `run monte carlo` | navigate→Monte Carlo page |
| `show globe` | navigate→3D Globe page |

---

## Scenario Templates

| ID | Name | Esc | Triggers |
|---|---|---|---|
| `taiwan_blockade` | Taiwan Strait Blockade 2026 | 0.75 | energy + chokepoint |
| `russia_eu_gas` | Russia–EU Gas Cutoff | 0.55 | energy + sanctions |
| `hormuz_closure` | Hormuz Closure Crisis | 0.70 | energy + chokepoint |
| `nuclear_standoff` | Nuclear Standoff Deterrence | 0.80 | deterrence ON |
| `eu_china_decouple` | EU–China Decoupling | 0.45 | sanctions |
| `multi_front_crisis` | Multi-Front Crisis (Worst Case) | 0.90 | all + deterrence OFF |
| `arctic_lng` | Arctic LNG Race 2030 | 0.30 | none |
| `stable_baseline` | Baseline Stability 2030 | 0.15 | none |

---

## Optimization Methods Applied

### Karpathy principles
1. **Think before coding** — Restated task before each module; no silent assumptions
2. **Simplicity first** — Vanilla JS (no React/Vue), minimal Python, no ORM
3. **Surgical changes** — world_model.py touched only to fix Streamlit dep; nothing else changed
4. **Goal-driven** — Each endpoint maps to a verifiable behavior test

### Caveman talk (dev efficiency, not end-user interaction)
- Functions named for their action: `evolve_scenario`, `add_composite_shock`, `fuse_beliefs`
- No acronyms in code without context. DS = Dempster-Shafer, MC = Monte Carlo
- Inline comments only where the logic is non-obvious (e.g., cubic deterrence)
- Module boundaries = simulation / UI / NLP — zero cross-contamination

### fixclaude optimizations (from `fix-claude.md`)
- `MAX_THINKING_TOKENS` applied: full reasoning budget used for architecture decisions
- Caching strategy: module-level `_CACHE` dict replaces `@st.cache_data` (framework-agnostic)
- Agent separation: simulation modules never import UI; UI never imports NLP
- No speculative abstractions: DQN stub removed, no unused code

### Performance
- **Bundle size**: API = ~8MB (fastapi + mangum + numpy + scipy). No Streamlit (120MB) on serverless
- **Cold start**: ~400ms (Python 3.12, Vercel iad1)
- **Chart rendering**: Plotly.js deferred (`defer` attribute), non-blocking page load
- **PWA caching**: SW caches HTML/CSS/JS at install; API calls never cached
- **MC simulation**: 10k runs in ~180ms (vectorized NumPy, no Python loops)

---

## Deployment Flow

```
Edit locally → git push → auto-deploys via Vercel GitHub integration
     OR
vercel --prod   (manual from CLI)
```

Vercel config (vercel.json):
- `framework: null` — plain Python + static, no framework detection
- `outputDirectory: "public"` — serves public/ at CDN root
- `rewrites: [/api/(.*) → api/index.py]` — serverless routing

Python runtime: Python 3.12 (Vercel auto-detect), `api/requirements.txt`

---

## PWA Capabilities

- **Installable**: manifest.json provides app icon + display:standalone
- **Offline**: SW caches `/`, `/style.css`, `/app.js`, `/manifest.json`
- **Theme**: `#0a0e1a` (dark military)
- **Scope**: full root `/` (SW at `/sw.js` — native Vercel static path)

---

## Roadmap (next surgical improvements)

Priority order (Karpathy: no speculative work, only if needed):

1. **Real energy flow data** — integrate EIA or IEA API for live LNG prices
2. **Scenario comparison view** — run two scenarios side-by-side (diff view)
3. **Audit log** — append every simulation result to `results.jsonl` for reproducibility
4. **Time-series escalation** — chain N simulation steps to show escalation trajectory
5. **Export PDF report** — one-click scenario briefing (Playwright or html2pdf)
6. **Auth layer** — add Vercel Edge Config + simple token auth for enterprise use
7. **Real tanker data** — integrate MarineTraffic or Kpler free tier API
8. **RL agent integration** — wire up the DQN agent to War-Game mode for AI opponent

---

## Run Commands

```bash
# Local Streamlit
pip install -r requirements.txt
streamlit run app.py

# Local FastAPI (test API)
pip install fastapi mangum uvicorn
uvicorn api.index:app --reload

# Deploy to Vercel
vercel --prod

# Test live API
curl https://worldmodel-geosim.vercel.app/api/health
```
