"""Baseline scores + regression gate.

Baselines live in ``workers/evals/baselines.json`` keyed as:

    {
        "<eval_name>": {"<category>": <baseline_score>, ...},
        ...
    }

A regression is any category whose current score drops more than
``threshold`` below its baseline. ``EVAL_REGRESSION_THRESHOLD`` (default
0.05) controls the gate. Categories or evals absent from the baseline
file are treated as "no baseline yet" and never fail the gate — that
makes adding new evals a non-breaking change. Updates to baselines are
deliberate commits that touch ``baselines.json`` directly.
"""

from __future__ import annotations

import json
import os
from pathlib import Path
from typing import Dict

from .types import CategoryScores, Regression

DEFAULT_BASELINES_PATH = Path(__file__).parent / "baselines.json"
DEFAULT_REGRESSION_THRESHOLD = float(os.getenv("EVAL_REGRESSION_THRESHOLD", "0.05"))

# eval_name -> category -> baseline score
Baselines = Dict[str, CategoryScores]


def load_baselines(path: Path | str | None = None) -> Baselines:
    """Load baselines.json. Returns an empty dict if the file is absent."""
    p = Path(path) if path is not None else DEFAULT_BASELINES_PATH
    if not p.exists():
        return {}
    return json.loads(p.read_text(encoding="utf-8"))


def detect_regressions(
    scores: Dict[str, CategoryScores],
    baselines: Baselines,
    threshold: float = DEFAULT_REGRESSION_THRESHOLD,
) -> list[Regression]:
    """Return one Regression per (eval, category) drop greater than *threshold*."""
    out: list[Regression] = []
    for eval_name, cat_scores in scores.items():
        eval_baseline = baselines.get(eval_name, {})
        for category, score in cat_scores.items():
            if category not in eval_baseline:
                continue
            baseline = eval_baseline[category]
            delta = baseline - score  # positive = drop
            if delta > threshold:
                out.append(
                    Regression(
                        eval_name=eval_name,
                        category=category,
                        baseline=baseline,
                        score=score,
                        delta=delta,
                    )
                )
    return out
