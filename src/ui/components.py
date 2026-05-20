import streamlit as st
import plotly.graph_objects as go
import numpy as np
import pandas as pd
from typing import Dict, Optional


# ── Risk gauge ────────────────────────────────────────────────────────────────

def risk_gauge(value: float, title: str = "Global Stress Index", height: int = 280) -> go.Figure:
    color = (
        "#00ff88" if value < 0.35 else
        "#ffa500" if value < 0.60 else
        "#ff6b35" if value < 0.80 else
        "#ff3855"
    )
    fig = go.Figure(go.Indicator(
        mode="gauge+number+delta",
        value=round(value, 3),
        title={"text": title, "font": {"color": "#94a3b8", "size": 13, "family": "JetBrains Mono"}},
        number={"font": {"color": color, "size": 32, "family": "JetBrains Mono"}},
        gauge={
            "axis": {"range": [0, 1], "tickcolor": "#64748b", "tickfont": {"color": "#64748b", "size": 10}},
            "bar": {"color": color, "thickness": 0.3},
            "bgcolor": "#0d1117",
            "bordercolor": "#1e2a3a",
            "steps": [
                {"range": [0.00, 0.35], "color": "#0f1f1a"},
                {"range": [0.35, 0.60], "color": "#1a1500"},
                {"range": [0.60, 0.80], "color": "#1a0e00"},
                {"range": [0.80, 1.00], "color": "#1a060a"},
            ],
            "threshold": {"value": 0.80, "line": {"color": "#ff3855", "width": 3}},
        },
    ))
    fig.update_layout(
        height=height,
        paper_bgcolor="#0a0e1a",
        plot_bgcolor="#0a0e1a",
        margin=dict(l=20, r=20, t=40, b=10),
        font={"family": "JetBrains Mono", "color": "#e2e8f0"},
    )
    return fig


# ── Energy flow globe ─────────────────────────────────────────────────────────

def energy_globe(
    ships_df: pd.DataFrame,
    chokepoints: Dict,
    routes: list,
    show_routes: bool = True,
) -> go.Figure:
    fig = go.Figure()

    # Energy flow arcs
    if show_routes:
        for r in routes:
            lons = [r["from"][0], r["to"][0], None]
            lats = [r["from"][1], r["to"][1], None]
            fig.add_trace(go.Scattergeo(
                lon=lons, lat=lats,
                mode="lines",
                line=dict(width=1.5, color="#00d4ff"),
                opacity=0.5,
                name=r["label"],
                hovertemplate=f"<b>{r['label']}</b><br>{r['volume']} billion m³/yr<extra></extra>",
                showlegend=False,
            ))

    # Chokepoints
    cp_lons = [v["lon"] for v in chokepoints.values()]
    cp_lats = [v["lat"] for v in chokepoints.values()]
    cp_texts = list(chokepoints.keys())
    cp_risks = [v["risk"] for v in chokepoints.values()]
    cp_colors = ["#ff3855" if r > 0.7 else "#ffa500" if r > 0.5 else "#00ff88" for r in cp_risks]

    fig.add_trace(go.Scattergeo(
        lon=cp_lons, lat=cp_lats,
        text=cp_texts,
        mode="markers+text",
        marker=dict(size=14, color=cp_colors, symbol="diamond", line=dict(color="#0a0e1a", width=1)),
        textposition="top center",
        textfont=dict(color="#e2e8f0", size=10, family="JetBrains Mono"),
        name="Chokepoints",
        hovertemplate="<b>%{text}</b><br>Risk: %{marker.color}<extra></extra>",
    ))

    # Tankers
    if not ships_df.empty:
        fig.add_trace(go.Scattergeo(
            lon=ships_df["lon"], lat=ships_df["lat"],
            text=ships_df["name"],
            mode="markers",
            marker=dict(size=5, color="#00ff88", opacity=0.7, symbol="circle"),
            name="Tankers",
            hovertemplate="<b>%{text}</b><br>Lon: %{lon:.1f} Lat: %{lat:.1f}<extra></extra>",
        ))

    fig.update_geos(
        projection_type="orthographic",
        showland=True, landcolor="#111827",
        showocean=True, oceancolor="#0a0e1a",
        showcoastlines=True, coastlinecolor="#1e2a3a",
        showcountries=True, countrycolor="#1e2a3a",
        showframe=False,
        bgcolor="#0a0e1a",
    )
    fig.update_layout(
        height=580,
        paper_bgcolor="#0a0e1a",
        margin=dict(l=0, r=0, t=0, b=0),
        legend=dict(
            bgcolor="#111827", bordercolor="#1e2a3a", borderwidth=1,
            font=dict(color="#94a3b8", size=10),
        ),
    )
    return fig


# ── Monte Carlo histogram ─────────────────────────────────────────────────────

def mc_histogram(raw: np.ndarray, p10: float, p50: float, p90: float) -> go.Figure:
    fig = go.Figure()
    fig.add_trace(go.Histogram(
        x=raw, nbinsx=60,
        marker_color="#00d4ff", opacity=0.7,
        name="Frequency",
        hovertemplate="Escalation: %{x:.3f}<br>Count: %{y}<extra></extra>",
    ))
    for val, label, color in [(p10, "P10", "#00ff88"), (p50, "P50", "#ffa500"), (p90, "P90", "#ff3855")]:
        fig.add_vline(x=val, line_color=color, line_width=2, line_dash="dash",
                      annotation_text=f"  {label}={val:.3f}",
                      annotation_font_color=color, annotation_font_size=11)
    fig.update_layout(
        title=dict(text="Escalation Distribution (10k runs)", font=dict(color="#94a3b8", size=13)),
        xaxis=dict(title="Escalation Level", color="#64748b", range=[0, 1], gridcolor="#1e2a3a"),
        yaxis=dict(title="Frequency", color="#64748b", gridcolor="#1e2a3a"),
        paper_bgcolor="#0a0e1a", plot_bgcolor="#0d1117",
        margin=dict(l=40, r=20, t=50, b=40),
        height=360,
        font=dict(family="JetBrains Mono", color="#e2e8f0"),
        showlegend=False,
    )
    return fig


# ── Strategy evolution chart ──────────────────────────────────────────────────

def strategy_chart(history: list) -> go.Figure:
    steps = list(range(len(history)))
    hawk = [h.get("Hawk", 0) for h in history]
    dove = [h.get("Dove", 0) for h in history]
    fig = go.Figure()
    fig.add_trace(go.Scatter(x=steps, y=hawk, name="Hawk", mode="lines+markers",
                             line=dict(color="#ff3855", width=2),
                             marker=dict(size=4),
                             hovertemplate="Step %{x}: Hawk=%{y:.3f}<extra></extra>"))
    fig.add_trace(go.Scatter(x=steps, y=dove, name="Dove", mode="lines+markers",
                             line=dict(color="#00ff88", width=2),
                             marker=dict(size=4),
                             fill="tonexty", fillcolor="rgba(0,255,136,0.05)",
                             hovertemplate="Step %{x}: Dove=%{y:.3f}<extra></extra>"))
    fig.update_layout(
        title=dict(text="Strategy Frequency Evolution (Replicator + Mimic)", font=dict(color="#94a3b8", size=13)),
        xaxis=dict(title="Step", color="#64748b", gridcolor="#1e2a3a"),
        yaxis=dict(title="Frequency", color="#64748b", range=[0, 1], gridcolor="#1e2a3a"),
        paper_bgcolor="#0a0e1a", plot_bgcolor="#0d1117",
        margin=dict(l=40, r=20, t=50, b=40),
        height=300,
        legend=dict(bgcolor="#0d1117", bordercolor="#1e2a3a", borderwidth=1,
                    font=dict(color="#94a3b8", size=11)),
        font=dict(family="JetBrains Mono", color="#e2e8f0"),
    )
    return fig


# ── Risk matrix (Probability × Impact) ───────────────────────────────────────

def risk_matrix_chart(scenarios: list) -> go.Figure:
    fig = go.Figure()
    for s in scenarios:
        prob = s.get("base_escalation", 0.5)
        impact = (
            (0.4 if s["triggers"].get("energy") else 0) +
            (0.4 if s["triggers"].get("chokepoint") else 0) +
            (0.2 if s["triggers"].get("sanctions") else 0)
        )
        color = "#ff3855" if prob > 0.7 else "#ffa500" if prob > 0.4 else "#00ff88"
        fig.add_trace(go.Scatter(
            x=[impact], y=[prob],
            mode="markers+text",
            name=s["name"],
            text=[s["icon"]],
            textfont=dict(size=18),
            marker=dict(size=18, color=color, opacity=0.8),
            hovertemplate=f"<b>{s['name']}</b><br>Prob: {prob:.2f}<br>Impact: {impact:.2f}<extra></extra>",
        ))
    fig.add_shape(type="rect", x0=0.5, y0=0.5, x1=1.0, y1=1.0,
                  fillcolor="rgba(255,56,85,0.07)", line=dict(color="#ff3855", width=1, dash="dot"))
    fig.update_layout(
        title=dict(text="Risk Matrix — Probability vs Impact", font=dict(color="#94a3b8", size=13)),
        xaxis=dict(title="Impact", color="#64748b", range=[0, 1.05], gridcolor="#1e2a3a"),
        yaxis=dict(title="Probability (Escalation)", color="#64748b", range=[0, 1.05], gridcolor="#1e2a3a"),
        paper_bgcolor="#0a0e1a", plot_bgcolor="#0d1117",
        margin=dict(l=40, r=20, t=50, b=40),
        height=380,
        showlegend=False,
        font=dict(family="JetBrains Mono", color="#e2e8f0"),
    )
    return fig


# ── Scenario card (HTML) ──────────────────────────────────────────────────────

def scenario_card_html(s: Dict, active: bool = False) -> str:
    border = "#00ff88" if active else "#1e2a3a"
    bg = "#0f1f1a" if active else "#0d1117"
    esc = s.get("base_escalation", 0)
    bar_color = "#ff3855" if esc > 0.7 else "#ffa500" if esc > 0.4 else "#00ff88"
    bar_w = int(esc * 100)
    return f"""
<div style="background:{bg};border:1px solid {border};border-radius:8px;
     padding:0.8rem 1rem;margin-bottom:0.5rem;cursor:pointer;">
  <div style="display:flex;justify-content:space-between;align-items:center;">
    <span style="font-size:1.2rem">{s['icon']}</span>
    <span style="color:#64748b;font-size:0.65rem;text-transform:uppercase;letter-spacing:0.08em">
      ESC {esc:.2f}
    </span>
  </div>
  <div style="color:#e2e8f0;font-weight:700;font-size:0.85rem;margin:0.3rem 0">{s['name']}</div>
  <div style="color:#64748b;font-size:0.72rem;line-height:1.4">{s['description'][:80]}…</div>
  <div style="background:#0a0e1a;border-radius:3px;height:3px;margin-top:0.6rem;overflow:hidden">
    <div style="background:{bar_color};width:{bar_w}%;height:3px;border-radius:3px"></div>
  </div>
</div>
"""
