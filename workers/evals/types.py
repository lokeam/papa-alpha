"""Shared dataclasses for the eval suite.

Eval scores are normalized to a per-category dict so the runner, baseline
gate, and Phoenix exporter all agree on shape:

    {"risks": 1.0, "accessibility": 0.83, "questions": 1.0, "subcontracting": 1.0}
"""

from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any, Dict, List

CATEGORIES = ("risks", "accessibility", "questions", "subcontracting")

# Per-category score in [0, 1].
CategoryScores = Dict[str, float]


@dataclass(frozen=True)
class FixtureCase:
    """One RFP fixture with the analysis JSON we expect to grade."""

    name: str
    rfp_text: str
    expected_analysis: Dict[str, Any]


@dataclass(frozen=True)
class Regression:
    eval_name: str
    category: str
    baseline: float
    score: float
    delta: float  # positive = drop


@dataclass
class RunSummary:
    git_sha: str
    fixtures: List[str] = field(default_factory=list)
    # eval_name -> category -> score (mean across fixtures)
    scores: Dict[str, CategoryScores] = field(default_factory=dict)
    regressions: List[Regression] = field(default_factory=list)

    def to_json(self) -> Dict[str, Any]:
        return {
            "git_sha": self.git_sha,
            "fixtures": list(self.fixtures),
            "scores": {ev: dict(cats) for ev, cats in self.scores.items()},
            "regressions": [
                {
                    "eval": r.eval_name,
                    "category": r.category,
                    "baseline": r.baseline,
                    "score": r.score,
                    "delta": r.delta,
                }
                for r in self.regressions
            ],
        }
