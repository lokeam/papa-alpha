"""Schema-compliance eval.

Per-category boolean: does the analysis JSON validate against the
Pydantic model for that category? Score is 1.0 if yes, 0.0 if no.

Aggregated across fixtures, the runner reports the pass rate per category
(mean of 0/1 scores). This catches the ``"required field missing"`` and
``"value out of range"`` classes of regression that often slip through
when prompts or models are tweaked.
"""

from __future__ import annotations

from typing import Any, Dict

from pydantic import BaseModel, ValidationError

from models import (
    AccessibilityAnalysis,
    QuestionsAnalysis,
    RisksAnalysis,
    SubcontractingAnalysis,
)

from .types import CATEGORIES, CategoryScores

_MODEL_BY_CATEGORY: Dict[str, type[BaseModel]] = {
    "risks": RisksAnalysis,
    "accessibility": AccessibilityAnalysis,
    "questions": QuestionsAnalysis,
    "subcontracting": SubcontractingAnalysis,
}


def eval_schema_compliance(analysis: Dict[str, Any]) -> CategoryScores:
    """Score each category 1.0 if the dict validates, 0.0 if it does not.

    Missing categories score 0.0 — a missing section is also a failure.
    """
    scores: CategoryScores = {}
    for category in CATEGORIES:
        model = _MODEL_BY_CATEGORY[category]
        section = analysis.get(category)
        if section is None:
            scores[category] = 0.0
            continue
        try:
            model(**section)
            scores[category] = 1.0
        except (ValidationError, TypeError):
            scores[category] = 0.0
    return scores
