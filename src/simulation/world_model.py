import streamlit as st
import numpy as np
import pandas as pd
from typing import Dict


@st.cache_data
def get_world_state() -> Dict:
    return {
        "GDP": {"US": 28.0, "CN": 26.5, "EU": 22.0, "RU": 2.2, "IN": 5.5, "JP": 4.5},
        "military": {"US": 0.95, "CN": 0.85, "EU": 0.70, "RU": 0.65, "IN": 0.55, "JP": 0.50},
        "energy_import_dep": {"EU": 0.85, "JP": 0.92, "IN": 0.80, "CN": 0.70, "US": 0.10},
        "lng_flow_ttl": 450,
        "chokepoint_straits": ["Malacca", "Hormuz", "Suez", "Bab el-Mandeb"],
        "chokepoint_coords": {
            "Malacca":     {"lon": 103.8, "lat": 1.3,  "risk": 0.6, "daily_ships": 90000},
            "Hormuz":      {"lon": 56.5,  "lat": 26.6, "risk": 0.8, "daily_ships": 21000},
            "Suez":        {"lon": 32.6,  "lat": 30.5, "risk": 0.7, "daily_ships": 50},
            "Bab el-Mandeb": {"lon": 43.3, "lat": 12.5, "risk": 0.75, "daily_ships": 21000},
        },
        "energy_routes": [
            {"from": [56.5, 26.6], "to": [103.8, 1.3],  "label": "Gulf→Asia",    "volume": 18},
            {"from": [32.6, 30.5], "to": [5.0,  52.0],  "label": "Suez→Europe",  "volume": 8},
            {"from": [43.3, 12.5], "to": [32.6, 30.5],  "label": "Red Sea→Suez", "volume": 6},
            {"from": [15.0, 58.0], "to": [5.0,  52.0],  "label": "Arctic LNG",   "volume": 3},
        ],
        "country_risk": {
            "US": 0.2, "CN": 0.55, "RU": 0.75, "EU": 0.35, "IN": 0.45, "JP": 0.3
        },
    }


@st.cache_data
def simulate_tankers(seed: int = 42, n: int = 25) -> pd.DataFrame:
    rng = np.random.default_rng(seed)
    # Cluster tankers near chokepoints for realism
    chokepoints = [(103.8, 1.3), (56.5, 26.6), (32.6, 30.5), (43.3, 12.5)]
    lons, lats, names = [], [], []
    per_cp = n // len(chokepoints)
    for i, (clon, clat) in enumerate(chokepoints):
        for j in range(per_cp):
            lons.append(float(np.clip(clon + rng.normal(0, 3), -180, 180)))
            lats.append(float(np.clip(clat + rng.normal(0, 2), -60, 60)))
            names.append(f"T-{i*100+j:03d}")
    return pd.DataFrame({"lon": lons, "lat": lats, "name": names})
