import numpy as np
from typing import Dict
from .scenarios import add_composite_shock, apply_nuclear_deterrence


def geopolitical_mc(scenario: Dict, n_runs: int = 10_000) -> Dict:
    rng = np.random.default_rng(42)
    base = float(scenario.get("base_escalation", 0.3))
    use_deterrence = bool(scenario.get("nuclear_deterrence", False))

    esc = np.full(n_runs, base)
    if scenario.get("triggers", {}).get("energy"):
        esc += rng.normal(0.15, 0.05, n_runs)
    if scenario.get("triggers", {}).get("chokepoint"):
        esc += rng.normal(0.20, 0.07, n_runs)
    if scenario.get("triggers", {}).get("sanctions"):
        esc += rng.normal(0.10, 0.04, n_runs)

    # Random shock events (30% probability)
    shock_mask = rng.random(n_runs) < 0.30
    esc[shock_mask] += rng.normal(0.25, 0.10, shock_mask.sum())

    # Random noise
    esc += rng.normal(0.0, 0.05, n_runs)
    esc = np.clip(esc, 0.0, 1.0)

    if use_deterrence:
        esc = esc - 0.8 * (esc ** 3)
        esc = np.clip(esc, 0.0, 1.0)

    return {
        "p10": float(np.percentile(esc, 10)),
        "p25": float(np.percentile(esc, 25)),
        "p50": float(np.percentile(esc, 50)),
        "p75": float(np.percentile(esc, 75)),
        "p90": float(np.percentile(esc, 90)),
        "mean": float(np.mean(esc)),
        "std": float(np.std(esc)),
        "raw": esc,
    }
