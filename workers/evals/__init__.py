"""Offline eval suite for the RFP analysis pipeline (PRD e §5.8).

Public API surface used by the runner and tests:

  load_fixtures(path) -> list[FixtureCase]
  eval_schema_compliance(fixture, analysis) -> CategoryScores
  eval_completeness(fixture, analysis) -> CategoryScores
  eval_groundedness(fixture, analysis, judge) -> CategoryScores
  load_baselines(path) -> Baselines
  detect_regressions(scores, baselines, threshold) -> list[Regression]
"""

from .types import (
    CATEGORIES,
    CategoryScores,
    FixtureCase,
    Regression,
    RunSummary,
)
from .fixtures_loader import load_fixtures
from .schema_eval import eval_schema_compliance
from .completeness_eval import eval_completeness
from .groundedness_eval import eval_groundedness
from .baselines import load_baselines, detect_regressions

__all__ = [
    "CATEGORIES",
    "CategoryScores",
    "FixtureCase",
    "Regression",
    "RunSummary",
    "load_fixtures",
    "eval_schema_compliance",
    "eval_completeness",
    "eval_groundedness",
    "load_baselines",
    "detect_regressions",
]
