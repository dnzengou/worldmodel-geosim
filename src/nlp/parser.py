import re
from typing import Dict, Optional


_RULES = [
    # Chokepoint / blockade
    (r'\b(taiwan|strait|blockade|hormuz|malacca|suez|bab|chokepoint|maritime)\b',
     {"triggers": {"chokepoint": True}}),
    # Energy
    (r'\b(energy|oil|gas|lng|pipeline|sanction|opec|embargo)\b',
     {"triggers": {"energy": True}}),
    # Sanctions
    (r'\b(sanction|decouple|decoupling|freeze|ban|export control)\b',
     {"triggers": {"sanctions": True}}),
    # Nuclear deterrence
    (r'\b(nuclear|deterren|nuke|nato|article.?5|escalat.*ladder)\b',
     {"nuclear_deterrence": True}),
    # Severity — worst case
    (r'\b(worst.case|critical|maximum|catastrophic|severe|crisis|all.trigger)\b',
     {"base_escalation": 0.85, "triggers": {"energy": True, "chokepoint": True, "sanctions": True}}),
    # Severity — best case
    (r'\b(best.case|minimal|stable|peace|low.risk|baseline)\b',
     {"base_escalation": 0.10, "triggers": {"energy": False, "chokepoint": False, "sanctions": False}}),
    # Country aggression — high
    (r'\b(russia|moscow|putin).{0,20}(high|escalat|aggress|attack)',
     {"aggression": {"RU": 0.9}}),
    (r'\b(china|beijing|ccp|pla).{0,20}(high|escalat|aggress|attack)',
     {"aggression": {"CN": 0.9}}),
    (r'\b(us|usa|america|washington).{0,20}(high|escalat|aggress)',
     {"aggression": {"US": 0.9}}),
    # Country aggression — low
    (r'\b(russia|moscow).{0,20}(back.?down|retreat|de.?escalat)',
     {"aggression": {"RU": 0.2}}),
    (r'\b(china|beijing).{0,20}(back.?down|retreat|de.?escalat)',
     {"aggression": {"CN": 0.2}}),
    # Navigation intent
    (r'\b(monte.?carlo|simulation|mc|run|10k|stochastic)\b',
     {"_navigate": "Monte Carlo Risk"}),
    (r'\b(war.?game|override|manual|sandbox)\b',
     {"_navigate": "War-Game Mode"}),
    (r'\b(globe|map|vessel|tanker|ship)\b',
     {"_navigate": "3D Globe Viewer"}),
    (r'\b(risk.?preview|belief|hawk|dove|strateg)\b',
     {"_navigate": "Risk Preview"}),
]


def _numeric_escalation(text: str) -> Optional[float]:
    m = re.search(r'escalat\w*\s*(?:at|to|=|:)?\s*(\d+(?:\.\d+)?)\s*%?', text, re.I)
    if m:
        v = float(m.group(1))
        return v / 100 if v > 1 else v
    m = re.search(r'(\d+(?:\.\d+)?)\s*%\s*escalat', text, re.I)
    if m:
        v = float(m.group(1))
        return v / 100 if v > 1 else v
    return None


def _deep_merge(base: Dict, patch: Dict) -> Dict:
    for k, v in patch.items():
        if k in base and isinstance(base[k], dict) and isinstance(v, dict):
            _deep_merge(base[k], v)
        else:
            base[k] = v
    return base


def parse_command(text: str) -> Dict:
    if not text or not text.strip():
        return {}

    text_lower = text.lower()
    result: Dict = {}

    for pattern, params in _RULES:
        if re.search(pattern, text_lower):
            _deep_merge(result, params)

    num_esc = _numeric_escalation(text_lower)
    if num_esc is not None:
        result["base_escalation"] = num_esc

    return result


HELP_TEXT = """**NL command examples:**
- `taiwan strait blockade`
- `worst case energy crisis`
- `escalation at 70%`
- `russia high aggression + chokepoint`
- `nuclear deterrence scenario`
- `run monte carlo`
- `show globe`
- `best case baseline`
- `decouple china sanctions`
"""
