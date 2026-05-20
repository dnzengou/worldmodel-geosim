CSS = """
<style>
/* ── Base ────────────────────────────────────────────────────────────────── */
@import url('https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;600;700&display=swap');

html, body, .stApp {
    background-color: #0a0e1a !important;
    font-family: 'JetBrains Mono', 'Courier New', monospace !important;
}

/* ── Sidebar ─────────────────────────────────────────────────────────────── */
section[data-testid="stSidebar"] {
    background: linear-gradient(180deg, #0d1117 0%, #090d18 100%) !important;
    border-right: 1px solid #1e2a3a !important;
}
section[data-testid="stSidebar"] * { color: #e2e8f0 !important; }
section[data-testid="stSidebar"] .stRadio > label {
    background: #111827;
    border: 1px solid #1e2a3a;
    border-radius: 6px;
    padding: 0.4rem 0.8rem;
    margin: 2px 0;
    cursor: pointer;
    transition: border-color 0.15s, background 0.15s;
}
section[data-testid="stSidebar"] .stRadio > label:hover {
    border-color: #00ff88;
    background: #0f1f1a;
}

/* ── Typography ──────────────────────────────────────────────────────────── */
h1 { color: #00ff88 !important; font-size: 1.6rem !important; letter-spacing: 0.05em; }
h2 { color: #e2e8f0 !important; font-size: 1.2rem !important; border-bottom: 1px solid #1e2a3a; padding-bottom: 0.3rem; }
h3 { color: #94a3b8 !important; font-size: 1rem !important; }
p, li, span { color: #cbd5e1 !important; }

/* ── Metrics ─────────────────────────────────────────────────────────────── */
div[data-testid="metric-container"] {
    background: #0d1117 !important;
    border: 1px solid #1e2a3a !important;
    border-radius: 8px !important;
    padding: 1rem !important;
}
div[data-testid="metric-container"] label { color: #64748b !important; font-size: 0.75rem !important; text-transform: uppercase; letter-spacing: 0.08em; }
div[data-testid="metric-container"] [data-testid="stMetricValue"] { color: #00ff88 !important; font-size: 1.6rem !important; font-weight: 700 !important; }
div[data-testid="metric-container"] [data-testid="stMetricDelta"] { color: #94a3b8 !important; }

/* ── Buttons ─────────────────────────────────────────────────────────────── */
.stButton > button {
    background: linear-gradient(135deg, #00ff88 0%, #00b4d8 100%) !important;
    color: #0a0e1a !important;
    border: none !important;
    border-radius: 6px !important;
    font-weight: 700 !important;
    font-family: 'JetBrains Mono', monospace !important;
    text-transform: uppercase !important;
    letter-spacing: 0.08em !important;
    padding: 0.5rem 1.5rem !important;
    transition: opacity 0.15s, transform 0.1s !important;
}
.stButton > button:hover { opacity: 0.85 !important; transform: translateY(-1px) !important; }
.stButton > button:active { transform: translateY(0) !important; }

/* ── Inputs / Sliders ────────────────────────────────────────────────────── */
.stTextInput > div > div > input {
    background: #0d1117 !important;
    border: 1px solid #00ff88 !important;
    border-radius: 6px !important;
    color: #00ff88 !important;
    font-family: 'JetBrains Mono', monospace !important;
    caret-color: #00ff88;
}
.stTextInput > div > div > input::placeholder { color: #4b5563 !important; }
.stTextInput > div > div > input:focus { box-shadow: 0 0 0 2px #00ff8840 !important; }
.stSlider [data-baseweb="slider"] [data-testid="stTickBar"] { color: #64748b; }

/* ── Checkboxes ──────────────────────────────────────────────────────────── */
.stCheckbox > label { color: #94a3b8 !important; }
.stCheckbox [data-testid="stCheckbox"] > div { border-color: #00ff88 !important; }

/* ── Select / Radio ──────────────────────────────────────────────────────── */
.stSelectbox > div > div { background: #0d1117 !important; border-color: #1e2a3a !important; color: #e2e8f0 !important; }

/* ── Dataframes ──────────────────────────────────────────────────────────── */
.stDataFrame, .stDataEditor { border: 1px solid #1e2a3a !important; border-radius: 8px !important; }

/* ── Expander ────────────────────────────────────────────────────────────── */
.streamlit-expanderHeader {
    background: #111827 !important;
    border: 1px solid #1e2a3a !important;
    border-radius: 6px !important;
    color: #94a3b8 !important;
}

/* ── Info / Warning / Error boxes ───────────────────────────────────────── */
div[data-testid="stAlert"] { border-radius: 6px !important; }

/* ── Spinner ─────────────────────────────────────────────────────────────── */
.stSpinner > div { border-top-color: #00ff88 !important; }

/* ── Risk badge util ─────────────────────────────────────────────────────── */
.risk-badge {
    display: inline-block;
    padding: 2px 10px;
    border-radius: 4px;
    font-size: 0.7rem;
    font-weight: 700;
    letter-spacing: 0.12em;
    text-transform: uppercase;
}

/* ── NL command bar glow ─────────────────────────────────────────────────── */
.nl-bar .stTextInput > div > div > input {
    border-color: #00d4ff !important;
    color: #00d4ff !important;
}

/* ── Scrollbar ───────────────────────────────────────────────────────────── */
::-webkit-scrollbar { width: 6px; height: 6px; }
::-webkit-scrollbar-track { background: #0a0e1a; }
::-webkit-scrollbar-thumb { background: #1e2a3a; border-radius: 3px; }
::-webkit-scrollbar-thumb:hover { background: #00ff88; }

/* ── Main content padding ────────────────────────────────────────────────── */
.main .block-container { padding: 1.5rem 2rem 2rem !important; max-width: 1400px; }
</style>
"""

PWA_INJECT = """
<link rel="manifest" href="app/static/manifest.json">
<meta name="theme-color" content="#0a0e1a">
<meta name="mobile-web-app-capable" content="yes">
<meta name="apple-mobile-web-app-capable" content="yes">
<meta name="apple-mobile-web-app-status-bar-style" content="black-translucent">
<meta name="apple-mobile-web-app-title" content="GeoSim">
"""
