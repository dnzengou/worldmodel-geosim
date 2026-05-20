"""
2030 GeoSim — CAS Engine
Production-ready geopolitical risk modeling and simulation.
"""
import sys
from pathlib import Path

# Make src importable when running from project root
sys.path.insert(0, str(Path(__file__).parent))

import streamlit as st

st.set_page_config(
    page_title="2030 GeoSim | CAS Engine",
    page_icon="🌐",
    layout="wide",
    initial_sidebar_state="expanded",
    menu_items={
        "Get Help": None,
        "Report a bug": None,
        "About": "2030 GeoSim — Complex Adaptive Systems Geopolitical Engine",
    },
)

from src.ui.styles import CSS, PWA_INJECT
from src.nlp.parser import parse_command, HELP_TEXT
from src.ui.pages import (
    page_dashboard,
    page_scenario_editor,
    page_risk_preview,
    page_wargame,
    page_monte_carlo,
    page_globe,
)

# ── Inject CSS + PWA ──────────────────────────────────────────────────────────
st.markdown(CSS, unsafe_allow_html=True)
st.markdown(PWA_INJECT, unsafe_allow_html=True)

PAGES = {
    "Dashboard": ("🏠", page_dashboard),
    "Scenario Editor": ("📝", page_scenario_editor),
    "Risk Preview": ("⚠️", page_risk_preview),
    "War-Game Mode": ("⚔️", page_wargame),
    "Monte Carlo Risk": ("📊", page_monte_carlo),
    "3D Globe Viewer": ("🌍", page_globe),
}


# ── Sidebar ───────────────────────────────────────────────────────────────────
def render_sidebar() -> str:
    with st.sidebar:
        st.markdown(
            "<div style='text-align:center;padding:0.5rem 0 1rem'>"
            "<span style='color:#00ff88;font-size:1.8rem'>🌐</span>"
            "<div style='color:#00ff88;font-size:1rem;font-weight:700;letter-spacing:0.1em'>2030 GeoSim</div>"
            "<div style='color:#4b5563;font-size:0.65rem;text-transform:uppercase;letter-spacing:0.12em'>CAS Engine v2.0</div>"
            "</div>",
            unsafe_allow_html=True,
        )

        # NL command bar
        st.markdown(
            "<div style='color:#64748b;font-size:0.7rem;text-transform:uppercase;"
            "letter-spacing:0.08em;margin-bottom:0.25rem'>⌨ Natural Language Command</div>",
            unsafe_allow_html=True,
        )
        nl_input = st.text_input(
            "NL command",
            placeholder="e.g. taiwan blockade worst case",
            label_visibility="collapsed",
            key="nl_command",
        )
        if nl_input:
            _handle_nl(nl_input)

        with st.expander("Command examples"):
            st.markdown(HELP_TEXT)

        st.markdown(
            "<div style='color:#64748b;font-size:0.7rem;text-transform:uppercase;"
            "letter-spacing:0.08em;margin:1rem 0 0.3rem'>Navigation</div>",
            unsafe_allow_html=True,
        )

        # Determine default page (NL may have set a navigation target)
        nav_target = st.session_state.pop("_navigate", None)
        page_names = list(PAGES.keys())
        default_idx = page_names.index(nav_target) if nav_target in PAGES else 0

        labels = [f"{icon} {name}" for name, (icon, _) in PAGES.items()]
        choice_label = st.radio(
            "Page",
            labels,
            index=default_idx,
            label_visibility="collapsed",
        )
        page_name = choice_label.split(" ", 1)[1]

        # Session state summary
        sc = st.session_state.get("scenario")
        if sc:
            st.markdown("---")
            st.markdown(
                "<div style='color:#64748b;font-size:0.65rem;text-transform:uppercase;"
                "letter-spacing:0.08em;margin-bottom:0.3rem'>Active Scenario</div>",
                unsafe_allow_html=True,
            )
            esc = sc.get("base_escalation", 0)
            triggers_on = [k for k, v in sc.get("triggers", {}).items() if v]
            st.markdown(
                f"<div style='font-size:0.75rem;color:#94a3b8'>"
                f"Esc: <b style='color:#00ff88'>{esc:.2f}</b><br>"
                f"{'  '.join(triggers_on) if triggers_on else 'no triggers'}"
                f"</div>",
                unsafe_allow_html=True,
            )

    return page_name


def _handle_nl(text: str):
    parsed = parse_command(text)
    if not parsed:
        return

    # Navigate
    nav = parsed.pop("_navigate", None)
    if nav:
        st.session_state["_navigate"] = nav

    # Merge into scenario
    if parsed:
        sc = st.session_state.get("scenario", {
            "base_escalation": 0.3,
            "triggers": {"energy": False, "chokepoint": False, "sanctions": False},
            "theories": {"escalation": 1.0},
            "nuclear_deterrence": False,
        })
        if "base_escalation" in parsed:
            sc["base_escalation"] = parsed["base_escalation"]
        if "triggers" in parsed:
            sc.setdefault("triggers", {}).update(parsed["triggers"])
        if "nuclear_deterrence" in parsed:
            sc["nuclear_deterrence"] = parsed["nuclear_deterrence"]
        if "aggression" in parsed:
            sc.setdefault("aggression", {}).update(parsed["aggression"])
        st.session_state["scenario"] = sc

        # Auto-simulate
        from src.simulation.scenarios import (
            fresh_state, evolve_scenario, apply_nuclear_deterrence
        )
        state = fresh_state(sc["base_escalation"])
        state = evolve_scenario(state, sc.get("triggers", {}), sc.get("theories", {}))
        if sc.get("nuclear_deterrence"):
            state["escalation_level"] = apply_nuclear_deterrence(state["escalation_level"])
        st.session_state["sim_state"] = state


# ── Main router ───────────────────────────────────────────────────────────────
def main():
    page_name = render_sidebar()
    _, render_fn = PAGES[page_name]
    render_fn()


if __name__ == "__main__":
    main()
