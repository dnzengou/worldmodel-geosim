# 2030 GeoSim — CAS Geopolitical Risk Engine

Lean, agent-ready web app that models geopolitical escalation, chokepoint risk,
nuclear deterrence, Dempster-Shafer belief fusion and evolutionary game theory.
No login. No PII. Free forever.

→ **Live:** https://worldmodel-geosim.vercel.app
→ **API docs:** `/api/docs` (OpenAPI 3.1)
→ **For agents:** [`/llms.txt`](public/llms.txt) · [`/agents.json`](public/agents.json) · [`/.well-known/ai-plugin.json`](public/.well-known/ai-plugin.json)

## What ships

- **SPA** (`public/`) — vanilla JS, Plotly, Three.js globe, ~50 KB app code.
- **API** (`api/index.py`) — FastAPI + Mangum on Vercel serverless (Python).
- **Models** (`src/simulation/`) — scenarios, Monte Carlo, D-S belief, world model.
- **NL parser** (`src/nlp/`) — plain-English scenario commands.

## Deep-link anatomy

```
/#/wargame?s=taiwan_blockade&e=0.80&t=chokepoint,energy&d=1
```

Share a configured scenario with one URL. Embed with `?embed=1[&page=mc]`.

## Run locally

```bash
pip install -r api/requirements.txt
uvicorn api.index:app --reload
# serve public/ in parallel (any static server)
python -m http.server --directory public 3000
```

## Disclosure

Outputs are deterministic research artifacts of a simulation model.
They are **not forecasts** and must not be the sole input to any real decision.

Apache-2.0 · [BLUEPRINT.md](BLUEPRINT.md) · [DEVFLOW_SKILL.md](DEVFLOW_SKILL.md)
