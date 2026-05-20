import streamlit as st
import pandas as pd
import json
from pathlib import Path

from ..simulation.world_model import get_world_state, simulate_tankers
from ..simulation.scenarios import (
    fresh_state, evolve_scenario, apply_nuclear_deterrence,
    add_composite_shock, composite_risk_score, risk_label, risk_color,
)
from ..simulation.monte_carlo import geopolitical_mc
from ..simulation.belief import fuse_beliefs, run_strategy_evolution
from .components import (
    risk_gauge, energy_globe, mc_histogram,
    strategy_chart, risk_matrix_chart, scenario_card_html,
)


def _load_scenarios():
    path = Path(__file__).parent.parent.parent / "data" / "scenarios.json"
    with open(path) as f:
        return json.load(f)


# ── Dashboard ─────────────────────────────────────────────────────────────────

def page_dashboard():
    world = get_world_state()
    st.markdown("## Mission Overview")

    sc = st.session_state.get("scenario", {})
    state = st.session_state.get("sim_state", {})
    score = composite_risk_score(state) if state else 0.0
    label = risk_label(score)
    color = risk_color(score)

    # Top status bar
    c1, c2, c3, c4 = st.columns(4)
    c1.metric("Global Stress", f"{score:.3f}", delta=None)
    c2.metric("Threat Level", label)
    c3.metric("Active Triggers",
              sum([sc.get("triggers", {}).get(k, False) for k in ["energy", "chokepoint", "sanctions"]]))
    c4.metric("Deterrence", "ON" if sc.get("nuclear_deterrence") else "OFF")

    st.markdown("---")
    col_gauge, col_matrix = st.columns([1, 2])
    with col_gauge:
        st.plotly_chart(risk_gauge(score), use_container_width=True)
        st.markdown(
            f"<div style='text-align:center'>"
            f"<span class='risk-badge' style='background:{color}22;color:{color};border:1px solid {color}'>"
            f"  {label}  </span></div>",
            unsafe_allow_html=True,
        )
    with col_matrix:
        scenarios = _load_scenarios()
        st.plotly_chart(risk_matrix_chart(scenarios), use_container_width=True)

    # Scenario library preview
    st.markdown("### Scenario Library — click to load")
    scenarios = _load_scenarios()
    cols = st.columns(4)
    for i, s in enumerate(scenarios):
        with cols[i % 4]:
            active = st.session_state.get("loaded_scenario_id") == s["id"]
            st.markdown(scenario_card_html(s, active=active), unsafe_allow_html=True)
            if st.button(f"Load", key=f"load_{s['id']}"):
                _apply_scenario(s)
                st.rerun()


def _apply_scenario(s: dict):
    st.session_state["scenario"] = {
        "base_escalation": s["base_escalation"],
        "triggers": dict(s["triggers"]),
        "theories": dict(s.get("theories", {"escalation": 1.0})),
        "nuclear_deterrence": s.get("nuclear_deterrence", False),
        "aggression": dict(s.get("aggression", {})),
    }
    state = fresh_state(s["base_escalation"])
    state = evolve_scenario(state, s["triggers"], s.get("theories", {"escalation": 1.0}))
    if s.get("nuclear_deterrence"):
        state["escalation_level"] = apply_nuclear_deterrence(state["escalation_level"])
    st.session_state["sim_state"] = state
    st.session_state["loaded_scenario_id"] = s["id"]


# ── Scenario Editor ───────────────────────────────────────────────────────────

def page_scenario_editor():
    st.markdown("## Scenario Editor")

    sc = st.session_state.get("scenario", {
        "base_escalation": 0.3,
        "triggers": {"energy": False, "chokepoint": False, "sanctions": False},
        "theories": {"escalation": 1.0},
        "nuclear_deterrence": False,
    })

    col_left, col_right = st.columns([1, 1])

    with col_left:
        st.markdown("### Parameters")
        base_esc = st.slider("Base escalation", 0.0, 1.0, float(sc.get("base_escalation", 0.3)), 0.01)
        theory_factor = st.select_slider(
            "Escalation theory factor",
            options=[0.5, 0.7, 0.8, 0.9, 1.0, 1.1, 1.2],
            value=float(sc.get("theories", {}).get("escalation", 1.0)),
        )
        nuclear_det = st.checkbox("Nuclear deterrence (cubic dampening)", value=bool(sc.get("nuclear_deterrence", False)))

    with col_right:
        st.markdown("### Triggers")
        energy_t = st.checkbox("Energy crisis / LNG shock", value=bool(sc.get("triggers", {}).get("energy", False)))
        chokepoint_t = st.checkbox("Chokepoint blockade", value=bool(sc.get("triggers", {}).get("chokepoint", False)))
        sanctions_t = st.checkbox("Economic sanctions / decoupling", value=bool(sc.get("triggers", {}).get("sanctions", False)))

    triggers = {"energy": energy_t, "chokepoint": chokepoint_t, "sanctions": sanctions_t}
    theories = {"escalation": theory_factor}

    # Persist in session
    st.session_state["scenario"] = {
        "base_escalation": base_esc,
        "triggers": triggers,
        "theories": theories,
        "nuclear_deterrence": nuclear_det,
    }

    if st.button("▶  Simulate Step", use_container_width=True):
        state = fresh_state(base_esc)
        state = evolve_scenario(state, triggers, theories)
        if nuclear_det:
            state["escalation_level"] = apply_nuclear_deterrence(state["escalation_level"])
        st.session_state["sim_state"] = state
        _show_results(state)

    # Show previous results if available
    elif "sim_state" in st.session_state:
        _show_results(st.session_state["sim_state"])

    # Export
    with st.expander("Export scenario (JSON)"):
        st.json(st.session_state.get("scenario", {}))
        export_str = json.dumps(st.session_state.get("scenario", {}), indent=2)
        st.download_button("Download JSON", export_str, "scenario.json", "application/json")


def _show_results(state: dict):
    score = composite_risk_score(state)
    color = risk_color(score)
    label = risk_label(score)

    st.markdown("---")
    st.markdown("### Results")
    cols = st.columns(5)
    fields = [
        ("Escalation", "escalation_level"),
        ("Infrastructure", "infrastructure_risk_index"),
        ("Blockade", "maritime_blockade_persistence"),
        ("Energy Pressure", "energy_price_pressure"),
        ("Partner Divers.", "partner_diversification_rate"),
    ]
    for col, (name, key) in zip(cols, fields):
        col.metric(name, f"{state.get(key, 0):.3f}")

    st.markdown(
        f"**Composite risk:** "
        f"<span style='color:{color};font-weight:700'>{score:.3f} — {label}</span>",
        unsafe_allow_html=True,
    )
    st.plotly_chart(risk_gauge(score, "Composite Risk Score"), use_container_width=True)


# ── Risk Preview ──────────────────────────────────────────────────────────────

def page_risk_preview():
    st.markdown("## Risk Preview — Belief Fusion & Strategy Dynamics")

    sc = st.session_state.get("scenario")
    if not sc:
        st.info("Build a scenario in Scenario Editor first (or load one from Dashboard).")
        return

    base_esc = sc["base_escalation"]
    aggr = sc.get("aggression", {"US": 0.6, "CN": 0.55, "EU": 0.4, "RU": 0.7})

    col_l, col_r = st.columns([1, 1])

    with col_l:
        st.markdown("### Dempster-Shafer Belief Fusion")
        st.caption("Fusing US + EU + RU aggression assessments via D-S combination rule")
        us_a = st.slider("US aggression signal", 0.0, 1.0, float(aggr.get("US", 0.6)), 0.01, key="ds_us")
        eu_a = st.slider("EU aggression signal", 0.0, 1.0, float(aggr.get("EU", 0.4)), 0.01, key="ds_eu")
        ru_a = st.slider("RU aggression signal", 0.0, 1.0, float(aggr.get("RU", 0.7)), 0.01, key="ds_ru")

        beliefs = fuse_beliefs(us_a, eu_a, ru_a)
        df_b = pd.DataFrame([
            {"Frame": "H (Hostile)", "Mass": round(beliefs["H"], 4), "Interpretation": "High threat"},
            {"Frame": "L (Low)", "Mass": round(beliefs["L"], 4), "Interpretation": "Low threat"},
            {"Frame": "Θ (Uncertain)", "Mass": round(beliefs["Θ"], 4), "Interpretation": "Inconclusive"},
        ])
        st.dataframe(df_b, use_container_width=True, hide_index=True)

        hostile = beliefs["H"]
        color = risk_color(hostile)
        st.markdown(
            f"**Fused hostile belief: <span style='color:{color}'>{hostile:.3f}</span>**",
            unsafe_allow_html=True,
        )
        st.plotly_chart(risk_gauge(hostile, "Fused Threat Belief", height=220), use_container_width=True)

    with col_r:
        st.markdown("### Evolutionary Game Theory (Hawk / Dove)")
        st.caption("Replicator dynamics + imitation — 20 steps")
        steps_history = run_strategy_evolution(base_esc, steps=20)
        st.plotly_chart(strategy_chart(steps_history), use_container_width=True)

        final = steps_history[-1]
        dominant = max(final, key=final.get)
        st.markdown(f"**Dominant strategy: `{dominant}` ({final[dominant]:.3f})**")
        st.caption(
            "Hawk dominates at high escalation. "
            "Dove survives when deterrence or diplomacy lowers expected payoffs."
        )


# ── War-Game Mode ─────────────────────────────────────────────────────────────

def page_wargame():
    st.markdown("## War-Game Mode — Manual Override Sandbox")
    st.caption("Adjust per-actor decisions in real time. Results update instantly.")

    col1, col2, col3 = st.columns(3)
    with col1:
        us_a = st.slider("🇺🇸 US aggression", 0.0, 1.0, 0.60, 0.01)
        eu_a = st.slider("🇪🇺 EU aggression", 0.0, 1.0, 0.40, 0.01)
    with col2:
        ru_a = st.slider("🇷🇺 Russia aggression", 0.0, 1.0, 0.70, 0.01)
        cn_a = st.slider("🇨🇳 China aggression", 0.0, 1.0, 0.55, 0.01)
    with col3:
        blockade = st.checkbox("Maritime blockade active", value=False)
        energy_shock = st.checkbox("Energy shock active", value=False)
        det_active = st.checkbox("Nuclear deterrence", value=True)

    # Compute escalation
    base_esc = (us_a + ru_a + cn_a + eu_a) / 4
    if blockade:
        base_esc += 0.20
    if energy_shock:
        base_esc += 0.15
    if det_active:
        base_esc = apply_nuclear_deterrence(base_esc)
    base_esc = min(1.0, base_esc)

    score = composite_risk_score({
        "escalation_level": base_esc,
        "infrastructure_risk_index": 0.5 if blockade else 0.3,
        "maritime_blockade_persistence": 0.8 if blockade else 0.2,
        "energy_price_pressure": 0.8 if energy_shock else 0.4,
        "partner_diversification_rate": 0.2 if energy_shock else 0.4,
    })

    st.markdown("---")
    m1, m2, m3 = st.columns(3)
    m1.metric("Predicted Escalation", f"{base_esc:.3f}")
    m2.metric("Composite Risk Score", f"{score:.3f}")
    m3.metric("Threat Level", risk_label(score))

    st.plotly_chart(risk_gauge(base_esc, "Live Escalation Meter"), use_container_width=True)

    # Belief fusion from live inputs
    with st.expander("Belief fusion from current inputs"):
        beliefs = fuse_beliefs(us_a, eu_a, ru_a)
        st.json({k: round(v, 4) for k, v in beliefs.items()})

    # Export snapshot
    snapshot = {
        "aggression": {"US": us_a, "EU": eu_a, "RU": ru_a, "CN": cn_a},
        "blockade": blockade, "energy_shock": energy_shock,
        "nuclear_deterrence": det_active,
        "escalation": round(base_esc, 4),
        "composite_risk": round(score, 4),
    }
    st.download_button(
        "Export snapshot (JSON)", json.dumps(snapshot, indent=2),
        "wargame_snapshot.json", "application/json",
    )


# ── Monte Carlo Risk ──────────────────────────────────────────────────────────

def page_monte_carlo():
    st.markdown("## Monte Carlo Risk Simulation — 10k runs")

    sc = st.session_state.get("scenario", {
        "base_escalation": 0.3,
        "triggers": {"energy": False, "chokepoint": False, "sanctions": False},
        "nuclear_deterrence": False,
    })

    col_cfg, col_res = st.columns([1, 2])

    with col_cfg:
        st.markdown("### Configuration")
        base_esc = st.slider("Base escalation", 0.0, 1.0, float(sc.get("base_escalation", 0.3)), 0.01)
        energy_t = st.checkbox("Energy trigger", value=bool(sc.get("triggers", {}).get("energy", False)))
        cp_t = st.checkbox("Chokepoint trigger", value=bool(sc.get("triggers", {}).get("chokepoint", False)))
        san_t = st.checkbox("Sanctions trigger", value=bool(sc.get("triggers", {}).get("sanctions", False)))
        det = st.checkbox("Nuclear deterrence", value=bool(sc.get("nuclear_deterrence", False)))
        n_runs = st.select_slider("Runs", [1000, 5000, 10000, 50000], value=10000)

        run = st.button("▶  Run Simulation", use_container_width=True)

    with col_res:
        if run:
            scenario_cfg = {
                "base_escalation": base_esc,
                "triggers": {"energy": energy_t, "chokepoint": cp_t, "sanctions": san_t},
                "nuclear_deterrence": det,
            }
            with st.spinner(f"Running {n_runs:,} simulations…"):
                res = geopolitical_mc(scenario_cfg, n_runs=n_runs)
            st.session_state["mc_result"] = res

        res = st.session_state.get("mc_result")
        if res:
            m1, m2, m3 = st.columns(3)
            m1.metric("P10 (Optimistic)", f"{res['p10']:.4f}")
            m2.metric("Median (P50)", f"{res['p50']:.4f}")
            m3.metric("P90 (Pessimistic)", f"{res['p90']:.4f}")

            m4, m5 = st.columns(2)
            m4.metric("Mean", f"{res['mean']:.4f}")
            m5.metric("Std Dev", f"{res['std']:.4f}")

            st.plotly_chart(mc_histogram(res["raw"], res["p10"], res["p50"], res["p90"]),
                            use_container_width=True)

            # IQR interpretation
            iqr = res["p75"] - res["p25"]
            st.caption(
                f"IQR (P25–P75): {res['p25']:.3f} – {res['p75']:.3f} (width {iqr:.3f}). "
                f"Wider IQR = higher uncertainty in outcome."
            )
            export = {k: (float(v) if k != "raw" else None) for k, v in res.items()}
            export.pop("raw")
            st.download_button("Export results (JSON)", json.dumps(export, indent=2),
                               "mc_results.json", "application/json")
        else:
            st.info("Configure parameters and click Run Simulation.")


# ── 3D Globe Viewer ───────────────────────────────────────────────────────────

def page_globe():
    st.markdown("## 3D Energy Flow Globe")

    world = get_world_state()
    col_ctrl, col_globe = st.columns([1, 3])

    with col_ctrl:
        st.markdown("### Controls")
        show_tankers = st.checkbox("Show tankers", value=True)
        show_routes = st.checkbox("Show energy routes", value=True)
        rotation_hint = st.empty()
        rotation_hint.caption("Drag to rotate the globe. Scroll to zoom.")
        st.markdown("---")
        st.markdown("### Chokepoint Risk")
        for name, data in world["chokepoint_coords"].items():
            r = data["risk"]
            c = risk_color(r)
            st.markdown(
                f"<div style='display:flex;justify-content:space-between;margin:4px 0'>"
                f"<span style='color:#94a3b8;font-size:0.8rem'>{name}</span>"
                f"<span style='color:{c};font-weight:700;font-size:0.8rem'>{r:.2f}</span>"
                f"</div>",
                unsafe_allow_html=True,
            )

    with col_globe:
        ships = simulate_tankers() if show_tankers else None
        fig = energy_globe(
            ships if ships is not None else pd.DataFrame(),
            world["chokepoint_coords"],
            world["energy_routes"],
            show_routes=show_routes,
        )
        st.plotly_chart(fig, use_container_width=True)
