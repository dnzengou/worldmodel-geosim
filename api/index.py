"""
GeoSim API — FastAPI serverless handler for Vercel.
Pure computation: no Streamlit, no heavy state.
"""
import sys
import json
from pathlib import Path
from typing import Dict

# Make src/ importable from api/
sys.path.insert(0, str(Path(__file__).parent.parent))

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
from mangum import Mangum

from src.simulation.scenarios import (
    fresh_state, evolve_scenario, apply_nuclear_deterrence,
    composite_risk_score, risk_label, risk_color,
)
from src.simulation.monte_carlo import geopolitical_mc
from src.simulation.belief import fuse_beliefs, run_strategy_evolution
from src.simulation.world_model import get_world_state
from src.nlp.parser import parse_command

app = FastAPI(title="GeoSim API", version="2.0", docs_url="/api/docs")

# Public read-only sim API — wildcard CORS is intentional (no auth, no PII).
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["GET", "POST"],
    allow_headers=["*"],
)

# Load scenarios once at cold start — the file never changes at runtime.
_SCENARIOS = json.loads(
    (Path(__file__).parent.parent / "data" / "scenarios.json").read_text(encoding="utf-8")
)


# ── Request models ─────────────────────────────────────────────────────────────

class SimRequest(BaseModel):
    base_escalation: float = Field(0.3, ge=0.0, le=1.0)
    triggers: Dict[str, bool] = Field(default_factory=dict)
    theories: Dict[str, float] = Field(default_factory=lambda: {"escalation": 1.0})
    nuclear_deterrence: bool = False
    aggression: Dict[str, float] = Field(default_factory=dict)

class BeliefRequest(BaseModel):
    us: float = Field(0.6, ge=0.0, le=1.0)
    eu: float = Field(0.4, ge=0.0, le=1.0)
    ru: float = Field(0.7, ge=0.0, le=1.0)
    base_escalation: float = Field(0.3, ge=0.0, le=1.0)

class MCRequest(BaseModel):
    base_escalation: float = Field(0.3, ge=0.0, le=1.0)
    triggers: Dict[str, bool] = Field(default_factory=dict)
    nuclear_deterrence: bool = False
    n_runs: int = Field(10_000, ge=100, le=50_000)

class NLRequest(BaseModel):
    text: str


# ── Endpoints ──────────────────────────────────────────────────────────────────

@app.get("/api/health")
def health():
    return {"status": "ok", "version": "2.0"}


@app.get("/api/scenarios")
def get_scenarios():
    return _SCENARIOS


@app.get("/api/world-state")
def world_state():
    ws = get_world_state()
    # Return only JSON-safe subsets
    return {
        "chokepoints": ws["chokepoint_coords"],
        "energy_routes": ws["energy_routes"],
        "country_risk": ws["country_risk"],
        "GDP": ws["GDP"],
        "military": ws["military"],
    }


@app.post("/api/simulate")
def simulate(req: SimRequest):
    state = fresh_state(req.base_escalation)
    state = evolve_scenario(state, req.triggers, req.theories)
    if req.nuclear_deterrence:
        state["escalation_level"] = apply_nuclear_deterrence(state["escalation_level"])
    score = composite_risk_score(state)
    return {
        "state": {k: round(v, 4) for k, v in state.items()},
        "score": round(score, 4),
        "label": risk_label(score),
        "color": risk_color(score),
    }


@app.post("/api/monte-carlo")
def monte_carlo(req: MCRequest):
    res = geopolitical_mc(
        {"base_escalation": req.base_escalation,
         "triggers": req.triggers,
         "nuclear_deterrence": req.nuclear_deterrence},
        n_runs=req.n_runs,
    )
    raw = res.pop("raw").tolist()
    # Downsample to 500 pts for frontend histogram
    step = max(1, len(raw) // 500)
    return {**{k: round(v, 4) for k, v in res.items()}, "histogram": raw[::step]}


@app.post("/api/belief")
def belief(req: BeliefRequest):
    b = fuse_beliefs(req.us, req.eu, req.ru)
    history = run_strategy_evolution(req.base_escalation, steps=20)
    return {
        "beliefs": {k: round(v, 4) for k, v in b.items()},
        "strategy_history": history,
    }


@app.post("/api/nl")
def nl_command(req: NLRequest):
    result = parse_command(req.text.strip())
    if not result:
        return {"parsed": False, "changes": {}}
    return {"parsed": True, "changes": result}


# Vercel serverless entrypoint
handler = Mangum(app, lifespan="off")
