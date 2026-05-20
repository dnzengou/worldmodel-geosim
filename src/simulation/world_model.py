"""
World model — framework-agnostic.
Uses module-level cache (no Streamlit / no external dep).
Streamlit callers wrap with @st.cache_data at the UI layer.
"""
import numpy as np
import pandas as pd
from typing import Dict

_CACHE: Dict = {}


def get_world_state() -> Dict:
    """2030 baseline geopolitical & economic data — cached singleton."""
    if "world" in _CACHE:
        return _CACHE["world"]
    _CACHE["world"] = {
        "GDP": {"US": 28.0, "CN": 26.5, "EU": 22.0, "RU": 2.2, "IN": 5.5, "JP": 4.5},
        "military": {"US": 0.95, "CN": 0.85, "EU": 0.70, "RU": 0.65, "IN": 0.55, "JP": 0.50},
        "energy_import_dep": {"EU": 0.85, "JP": 0.92, "IN": 0.80, "CN": 0.70, "US": 0.10},
        "lng_flow_ttl": 450,
        "chokepoint_straits": ["Malacca", "Hormuz", "Suez", "Bab el-Mandeb"],
        "chokepoint_coords": {
            "Malacca":       {"lon": 103.8, "lat": 1.3,  "risk": 0.60, "daily_ships": 90000},
            "Hormuz":        {"lon": 56.5,  "lat": 26.6, "risk": 0.80, "daily_ships": 21000},
            "Suez":          {"lon": 32.6,  "lat": 30.5, "risk": 0.70, "daily_ships":   500},
            "Bab el-Mandeb": {"lon": 43.3,  "lat": 12.5, "risk": 0.75, "daily_ships": 21000},
        },
        "energy_routes": [
            {"from": [56.5, 26.6], "to": [103.8,  1.3], "label": "Gulf→Asia",    "volume": 18},
            {"from": [32.6, 30.5], "to": [  5.0, 52.0], "label": "Suez→Europe",  "volume":  8},
            {"from": [43.3, 12.5], "to": [ 32.6, 30.5], "label": "Red Sea→Suez", "volume":  6},
            {"from": [15.0, 58.0], "to": [  5.0, 52.0], "label": "Arctic LNG",        "volume":  3},
        ],
        "country_risk": {
            "US": 0.20, "CN": 0.55, "RU": 0.75, "EU": 0.35, "IN": 0.45, "JP": 0.30,
        },
    }
    return _CACHE["world"]


def simulate_tankers(seed: int = 42, n: int = 25) -> pd.DataFrame:
    """Deterministic tanker positions clustered near chokepoints."""
    key = ("tankers", seed, n)
    if key in _CACHE:
        return _CACHE[key]
    rng = np.random.default_rng(seed)
    chokepoints = [(103.8, 1.3), (56.5, 26.6), (32.6, 30.5), (43.3, 12.5)]
    lons, lats, names = [], [], []
    per_cp = n // len(chokepoints)
    for i, (clon, clat) in enumerate(chokepoints):
        for j in range(per_cp):
            lons.append(float(np.clip(clon + rng.normal(0, 3), -180, 180)))
            lats.append(float(np.clip(clat + rng.normal(0, 2), -60, 60)))
            names.append(f"T-{i*100+j:03d}")
    df = pd.DataFrame({"lon": lons, "lat": lats, "name": names})
    _CACHE[key] = df
    return df
