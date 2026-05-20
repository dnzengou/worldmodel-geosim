import numpy as np
from typing import Dict, List, Tuple


# ── Dempster-Shafer ──────────────────────────────────────────────────────────

def ds_mass_assign(aggr: float) -> Dict:
    uncertainty = 0.05
    return {"H": aggr * (1 - uncertainty), "L": (1 - aggr) * (1 - uncertainty), "Θ": uncertainty}


def ds_combine(m1: Dict, m2: Dict) -> Dict:
    # Dempster's rule of combination (two hypotheses + uncertainty frame)
    combined = {"H": 0.0, "L": 0.0, "Θ": 0.0}
    K = 0.0  # conflict mass

    focal_sets = list(m1.keys())
    for a in focal_sets:
        for b in focal_sets:
            intersection = a if a == b else ("Θ" if "Θ" in (a, b) else None)
            mass_product = m1[a] * m2[b]
            if intersection is None:
                K += mass_product
            else:
                combined[intersection] = combined.get(intersection, 0) + mass_product

    if K >= 1.0:
        return {"H": 0.5, "L": 0.5, "Θ": 0.0}

    norm = 1.0 - K
    return {k: v / norm for k, v in combined.items()}


def fuse_beliefs(aggr_us: float, aggr_eu: float, aggr_ru: float) -> Dict:
    m_us = ds_mass_assign(aggr_us)
    m_eu = ds_mass_assign(aggr_eu)
    m_ru = ds_mass_assign(aggr_ru)
    fused_12 = ds_combine(m_us, m_eu)
    return ds_combine(fused_12, m_ru)


# ── Evolutionary game theory ─────────────────────────────────────────────────

def evolutionary_mimic_update(
    strategy_freqs: Dict,
    mimic_strength: float,
    payoffs: Dict,
) -> Dict:
    total = sum(strategy_freqs.values())
    if total == 0:
        return strategy_freqs

    avg_payoff = sum(f * payoffs[s] for s, f in strategy_freqs.items()) / total
    new_freqs = {}
    for s, freq in strategy_freqs.items():
        imitation = mimic_strength * max(0.0, payoffs[s] - avg_payoff)
        new_freqs[s] = max(0.0, freq + freq * (payoffs[s] - avg_payoff) + imitation)

    total_new = sum(new_freqs.values())
    if total_new > 0:
        new_freqs = {s: v / total_new for s, v in new_freqs.items()}
    return new_freqs


def run_strategy_evolution(base_escalation: float, steps: int = 20) -> List[Dict]:
    freqs = {"Hawk": 0.5, "Dove": 0.5}
    history = [dict(freqs)]
    for _ in range(steps):
        payoffs = {
            "Hawk": max(0.0, 0.9 - base_escalation + np.random.normal(0, 0.02)),
            "Dove": max(0.0, 0.4 + np.random.normal(0, 0.01)),
        }
        freqs = evolutionary_mimic_update(freqs, mimic_strength=0.3, payoffs=payoffs)
        history.append(dict(freqs))
    return history
