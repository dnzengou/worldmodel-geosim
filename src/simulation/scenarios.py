import numpy as np
from copy import deepcopy
from typing import Dict


DEFAULT_STATE = {
    "escalation_level": 0.3,
    "infrastructure_risk_index": 0.4,
    "maritime_blockade_persistence": 0.5,
    "energy_price_pressure": 0.6,
    "partner_diversification_rate": 0.3,
}


def fresh_state(base_escalation: float = 0.3) -> Dict:
    s = deepcopy(DEFAULT_STATE)
    s["escalation_level"] = float(np.clip(base_escalation, 0.0, 1.0))
    return s


def add_composite_shock(state: Dict) -> Dict:
    state["infrastructure_risk_index"] = min(1.0, state["infrastructure_risk_index"] + 0.30)
    state["maritime_blockade_persistence"] = min(1.0, state["maritime_blockade_persistence"] + 0.25)
    state["energy_price_pressure"] = min(1.0, state["energy_price_pressure"] + 0.40)
    state["partner_diversification_rate"] = max(0.0, state["partner_diversification_rate"] - 0.10)
    return state


def evolve_scenario(base_state: Dict, triggers: Dict, theories: Dict) -> Dict:
    state = deepcopy(base_state)
    if triggers.get("energy"):
        state["escalation_level"] += 0.15
        state["energy_price_pressure"] = min(1.0, state["energy_price_pressure"] + 0.20)
    if triggers.get("chokepoint"):
        state["escalation_level"] += 0.20
        state["maritime_blockade_persistence"] = min(1.0, state["maritime_blockade_persistence"] + 0.30)
    if triggers.get("sanctions"):
        state["partner_diversification_rate"] = max(0.0, state["partner_diversification_rate"] - 0.15)
        state["escalation_level"] += 0.10
    state["escalation_level"] *= theories.get("escalation", 1.0)
    state["escalation_level"] = float(np.clip(state["escalation_level"], 0.0, 1.0))
    return state


def apply_nuclear_deterrence(escalation: float, deterrence_factor: float = 0.8) -> float:
    penalty = deterrence_factor * (escalation ** 3)
    return float(max(0.0, escalation - penalty))


def composite_risk_score(state: Dict) -> float:
    weights = {
        "escalation_level": 0.40,
        "infrastructure_risk_index": 0.25,
        "maritime_blockade_persistence": 0.20,
        "energy_price_pressure": 0.15,
    }
    return float(sum(state.get(k, 0) * w for k, w in weights.items()))


def risk_label(score: float) -> str:
    if score < 0.35:
        return "LOW"
    if score < 0.60:
        return "MODERATE"
    if score < 0.80:
        return "HIGH"
    return "CRITICAL"


def risk_color(score: float) -> str:
    if score < 0.35:
        return "#00ff88"
    if score < 0.60:
        return "#ffa500"
    if score < 0.80:
        return "#ff6b35"
    return "#ff3855"
