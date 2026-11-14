# 2030 GeoSim — Agent-Native Geopolitical Risk Engine

> Open-source Monte Carlo geopolitical simulator. Built on Complex Adaptive
> Systems principles. 8 built-in crisis scenarios. Public JSON API callable
> by humans **and** AI agents. No signup, no tracking, free forever.

**Live:** https://worldmodel-geosim.vercel.app · **Docs:** `/about.html` · **Agents:** `/llms.txt`

---

## What it does

- **Monte Carlo war-gaming** — 10k stochastic runs per scenario, histogram-ready output, composite risk score (LOW / MEDIUM / HIGH / CRITICAL).
- **Nuclear deterrence** model with second-strike posture.
- **Chokepoint analysis** — Taiwan Strait, Hormuz, Suez, Arctic, with great-circle shipping routes on a 3D globe.
- **Scenario editor + side-by-side comparison** — build your own crisis, diff it against the baseline.
- **Natural-language parser** — type `"simulate Hormuz closure for 30 days"` and go.
- **Public JSON API** — `/api/scenarios`, `/api/monte-carlo`, `/api/simulate`, `/api/belief`, `/api/nl`. CORS-open. No auth.

## For AI agents

This service is explicitly designed to be queried by LLM agents and autonomous research pipelines.

| File | Purpose |
|---|---|
| [`/llms.txt`](public/llms.txt) | Compact agent-readable summary. |
| [`/llms-full.txt`](public/llms-full.txt) | Full documentation. |
| [`/agent.json`](public/agent.json) | Typed capabilities manifest. |
| [`/.well-known/ai-plugin.json`](public/.well-known/ai-plugin.json) | Plugin manifest. |
| [`/api/openapi.json`](https://worldmodel-geosim.vercel.app/api/openapi.json) | OpenAPI spec. |
| [`/api/docs`](https://worldmodel-geosim.vercel.app/api/docs) | Swagger UI. |

## Use cases

- **Research & analysts** — reproducible probability estimates under explicit scenarios.
- **Journalists & editors** — cite-worthy risk scores backed by an open model.
- **Educators** — classroom-ready scenarios with editable parameters.
- **AI research agents** — a stable, free, CORS-open tool for retrieval and tool-use.
- **Supply-chain risk teams** — query chokepoint exposure against your own supplier graph.
- **Policy & wargaming teams** — side-by-side comparison under custom weights.

## Quick start

```bash
# list scenarios
curl https://worldmodel-geosim.vercel.app/api/scenarios

# run 1000 Monte Carlo trajectories
curl -X POST https://worldmodel-geosim.vercel.app/api/monte-carlo \
  -H "Content-Type: application/json" \
  -d '{"scenario":"Taiwan Strait Blockade 2026","n_runs":1000}'

# natural-language
curl -X POST https://worldmodel-geosim.vercel.app/api/nl \
  -H "Content-Type: application/json" \
  -d '{"text":"simulate Hormuz closure for 30 days"}'
```

## Local development

```bash
# Streamlit UI
pip install -r requirements.txt
streamlit run app.py

# Serverless API only (FastAPI)
pip install -r api/requirements.txt
uvicorn api.index:app --reload --port 8000
```

## Architecture

```
public/        lean vanilla SPA — zero framework dependencies
  index.html   crawler-visible, JSON-LD @graph, OG + Twitter Card
  app.js       state, routing, NL command bar, onboarding, share actions
  globe.js     Three.js 3D globe (lazy-loaded on /globe navigation)
  llms.txt     +  agent.json  +  .well-known/*   —  agent discovery

api/           FastAPI serverless (Mangum on Vercel)
  index.py     /api/{scenarios,world-state,simulate,monte-carlo,belief,nl}

src/
  simulation/  scenarios, Monte Carlo, belief fusion, world model
  nlp/         natural-language → structured scenario
  ui/          Streamlit components (local dev only)

app.py         Streamlit entry (local dev)
vercel.json    deployment config + correct Content-Types for agent files

.claude/skills/
  agent-seo/   reusable GEO (Generative Engine Optimization) kit
```

## Security & trust

- Full CSP, HSTS, X-Frame-Options, Referrer-Policy, Permissions-Policy — set at the edge in [`vercel.json`](vercel.json).
- No cookies, no analytics, no third-party pixels.
- Public disclosure: [`/.well-known/security.txt`](public/.well-known/security.txt).
- Issues and discussions: public on GitHub.

## License

See [`LICENSE`](LICENSE).

## Citation

> 2030 GeoSim — worldmodel-geosim.vercel.app — Open-source geopolitical risk simulator.
