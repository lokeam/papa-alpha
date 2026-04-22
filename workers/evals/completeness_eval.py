"""Completeness eval — structural check that required sections are present
and non-trivially populated.

For each category we define a small set of required leaf fields and a
minimum length for any list/string those fields point at. Score is the
fraction of required checks that pass.

Why structural rather than semantic: the schema eval already enforces
*type* correctness via Pydantic. Completeness catches the failure mode
where the model returns a structurally valid stub (empty lists, one-word
strings) that passes Pydantic but is useless to a reviewer.
"""

from __future__ import annotations

from typing import Any, Callable, Dict, List, Tuple

from .types import CATEGORIES, CategoryScores


def _safe_get(d: Any, *keys: Any) -> Any:
    """Walk a nested dict/list path; return None if any step is missing.

    Accepts string keys for dicts and integer indices for lists.
    """
    cur = d
    for k in keys:
        if isinstance(cur, dict):
            cur = cur.get(k)
        elif isinstance(cur, list) and isinstance(k, int) and -len(cur) <= k < len(cur):
            cur = cur[k]
        else:
            return None
    return cur


# Each check returns True if the section satisfies that completeness rule.
Check = Callable[[Dict[str, Any]], bool]


def _len_at_least(value: Any, minimum: int) -> bool:
    return value is not None and hasattr(value, "__len__") and len(value) >= minimum


_RISKS_CHECKS: List[Tuple[str, Check]] = [
    ("section_analyzed_present", lambda s: bool(_safe_get(s, "section_analyzed", "name"))),
    ("summary_present", lambda s: _safe_get(s, "analysis_summary") is not None),
    ("at_least_one_risk", lambda s: _len_at_least(s.get("risks"), 1)),
    (
        "first_risk_has_substantive_reasoning",
        lambda s: _len_at_least(_safe_get(s, "risks", 0, "reasoning"), 50),
    ),
    ("self_critique_performed", lambda s: bool(_safe_get(s, "self_critique", "review_performed"))),
]

_ACCESSIBILITY_CHECKS: List[Tuple[str, Check]] = [
    ("score_present", lambda s: _safe_get(s, "accessibility_analysis", "final_score") is not None),
    ("at_least_one_barrier", lambda s: _len_at_least(s.get("barriers"), 1)),
    (
        "first_barrier_has_impact",
        lambda s: _len_at_least(_safe_get(s, "barriers", 0, "impact"), 20),
    ),
    ("self_critique_present", lambda s: _safe_get(s, "self_critique", "standards_applied_correctly") is not None),
]

_QUESTIONS_CHECKS: List[Tuple[str, Check]] = [
    ("urgency_breakdown_present", lambda s: _safe_get(s, "urgency_breakdown") is not None),
    ("at_least_one_question", lambda s: _len_at_least(s.get("questions"), 1)),
    (
        "first_question_has_text",
        lambda s: _len_at_least(_safe_get(s, "questions", 0, "predicted_question"), 20),
    ),
    (
        "first_question_has_confusion_analysis",
        lambda s: _len_at_least(_safe_get(s, "questions", 0, "confusion_analysis", "why_confusing"), 50),
    ),
    ("self_critique_present", lambda s: _safe_get(s, "self_critique", "questions_are_realistic") is not None),
]

_SUBCONTRACTING_CHECKS: List[Tuple[str, Check]] = [
    ("summary_present", lambda s: _safe_get(s, "subcontracting_analysis") is not None),
    ("at_least_one_opportunity", lambda s: _len_at_least(s.get("opportunities"), 1)),
    (
        "first_opp_has_reasoning",
        lambda s: _len_at_least(_safe_get(s, "opportunities", 0, "reasoning"), 50),
    ),
    ("self_critique_present", lambda s: _safe_get(s, "self_critique", "opportunities_are_realistic") is not None),
]


_CHECKS_BY_CATEGORY: Dict[str, List[Tuple[str, Check]]] = {
    "risks": _RISKS_CHECKS,
    "accessibility": _ACCESSIBILITY_CHECKS,
    "questions": _QUESTIONS_CHECKS,
    "subcontracting": _SUBCONTRACTING_CHECKS,
}


def eval_completeness(analysis: Dict[str, Any]) -> CategoryScores:
    """Fraction of required structural checks that pass per category."""
    scores: CategoryScores = {}
    for category in CATEGORIES:
        section = analysis.get(category)
        checks = _CHECKS_BY_CATEGORY[category]
        if section is None:
            scores[category] = 0.0
            continue
        passed = 0
        for _, check in checks:
            try:
                if check(section):
                    passed += 1
            except Exception:  # noqa: BLE001 — a malformed section just fails the check
                pass
        scores[category] = passed / len(checks)
    return scores
