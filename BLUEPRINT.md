# 2030 GeoSim — Production Blueprint v2.4

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

## Commit History

| Hash | Type | Description |
|---|---|---|
| `cfedd05` | merge | Pull LICENSE + README from remote origin |
| `82bc0d2` | feat | Vercel deployment — FastAPI serverless + lean SPA frontend |
| `78219f6` | fix | Decouple world_model from Streamlit; fix Vercel static routing |
| `ee7a800` | fix | Lazy-import pandas/numpy in simulate_tankers |
| `3064757` | docs | Production blueprint v2.0 |
| `67a8261` | feat | First-run onboarding UX — 3-step modal |
| `119166d` | docs | Blueprint v2.1 — onboarding section + LOC update |
| `(prev)` | chore | Archive genesis docs → docs/; blueprint v2.2 |
| `(prev)` | feat | Scenario comparison view — 🆚 page, side-by-side gauges, diff table |
| `(prev)` | security+hygiene | XSS fix, CSP + Vercel security headers, pinned deps, drop scipy |
| `(HEAD)` | feat | Immersive 3D Globe — Three.js earth (texture + specular + clouds + rim glow) with lat/lon chokepoint pins + great-circle route arcs; lazy-loaded on `/globe` nav |

**Deployment policy:** Vercel auto-picks up every push to `main` via GitHub integration. Manual trigger: `vercel --prod`.

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

### File structure (31 files, ~2730 LOC)

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
│   ├── app.js                 Vanilla JS SPA (~1030 LOC): state, API, 7 views, charts, onboarding, compare
│   ├── manifest.json          PWA manifest
│   └── sw.js                  Service worker (caches static, skips /api/)
│
├── static/                    Streamlit static serve (local)
│   ├── manifest.json
│   └── sw.js
│
└── docs/                      Genesis reference (not deployed)
    ├── genesis-blueprint.md   Original design blueprint
    ├── genesis-prompt.md      Original build prompt (markdown)
    └── genesis-prompt.txt     Original build prompt (plain text)
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

## Onboarding UX

Inspired by **WorldMonitor** (`worldmonitor-core.vercel.app`) hero pattern: minimal friction, immediate value, no signup required, quantified stats upfront.

### Design principles
- **First-run only** — `localStorage` flag `geosim_onboarded_v2` prevents repeat shows
- **Always skippable** — "Skip ✕" button top-right, Esc key, backdrop click all dismiss
- **Zero blocking** — `requestAnimationFrame` defers overlay until page fully paints; app is visible behind glassmorphism backdrop
- **Immediate value in step 2** — loading a scenario closes the modal and runs the simulation; user lands directly in results
- **Keyboard friendly** — Esc dismisses, natural tab order through buttons

### 3-step flow

| Step | Focus | Primary action |
|---|---|---|
| **1 — Welcome** | Hero: tagline + 3 stat cards + 4 feature bullets + trust signal | "Pick a scenario →" |
| **2 — Scenario picker** | 3 featured crisis cards (Taiwan, Hormuz, Multi-Front), one-click load | Card click → load + simulate → exit |
| **3 — NL primer** | Terminal typewriter cycling through 5 example commands; clickable chip presets | "Launch GeoSim →" |

### Step 1 — stat cards (WorldMonitor pattern)
```
┌──────────┐  ┌──────────┐  ┌──────────┐
│   10k    │  │    8     │  │  ~200ms  │
│MC runs   │  │ scenarios│  │ sim time │
└──────────┘  └──────────┘  └──────────┘
```
Trust line: `No account required · Free forever · No data sent`

### Step 3 — typewriter commands cycled
```
❯ taiwan blockade worst case▌
→ Triggers: chokepoint + energy | Esc: 0.85

❯ russia high aggression▌
→ RU aggression: 0.90

❯ nuclear deterrence at 80%▌
→ Deterrence ON | base_escalation: 0.80
```
Chip presets let users click to preview any command without dismissing the modal.

### Implementation (pure vanilla JS, no deps)
- `OB` state object: step, localStorage key, featured scenarios, NL commands
- `_obRender(step)` — re-renders the overlay for the current step (single DOM write)
- `_obTypeChar` / `_obDeleteChar` — typewriter via `setTimeout` chain, cancellable
- `obLoadScenario(id)` — calls existing `loadScenario()` then `obFinish()` in one line
- All CSS in `style.css` under `/* ── Onboarding overlay ── */` block (~130 LOC)
- JS in `app.js` under `// ── Onboarding ──` block (~200 LOC)

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
2. ~~**Scenario comparison view** — run two scenarios side-by-side (diff view)~~ ✅ **DONE v2.3** — 🆚 Compare page: dropdowns, parallel `/api/simulate`, gauges + diff table, export JSON
3. **Audit log** — append every simulation result to `results.jsonl` for reproducibility
4. **Time-series escalation** — chain N simulation steps to show escalation trajectory
5. **Export PDF report** — one-click scenario briefing (Playwright or html2pdf)
6. **Auth layer** — add Vercel Edge Config + simple token auth for enterprise use
7. **Real tanker data** — integrate MarineTraffic or Kpler free tier API
8. **RL agent integration** — wire up the DQN agent to War-Game mode for AI opponent

### Comparison View Design
- `🆚 Compare` nav entry (7th page, zero new API endpoints)
- Two scenario dropdowns → `Promise.all([simulate(A), simulate(B)])` — parallel, ~200ms
- Side-by-side Plotly gauge panels with risk-color top border
- Diff table: Risk Score, Escalation, Infrastructure, Blockade, Energy Pressure — Δ column color-coded (red↑ / green↓ / muted≈)
- Export diff as `compare_diff.json`
- CSS: `.cmp-selector` 3-col grid, `.cmp-panels` 2-col, responsive collapse at 768px

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
