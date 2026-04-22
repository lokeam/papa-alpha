"""Fixture loader for the eval suite.

Each fixture is a single JSON file in ``workers/evals/fixtures/`` with two
top-level keys:

    {
        "rfp_text": "<raw RFP text>",
        "expected_analysis": {
            "risks": {...},
            "accessibility": {...},
            "questions": {...},
            "subcontracting": {...}
        }
    }

PDFs are deliberately *not* used here — eval correctness is independent of
PDF parsing, and JSON keeps the suite fast enough for CI.
"""

from __future__ import annotations

import json
from pathlib import Path
from typing import Iterable, List

from .types import FixtureCase

DEFAULT_FIXTURES_DIR = Path(__file__).parent / "fixtures"


def load_fixtures(directory: Path | str | None = None) -> List[FixtureCase]:
    """Load every ``*.json`` fixture under *directory* (default: bundled)."""
    base = Path(directory) if directory is not None else DEFAULT_FIXTURES_DIR
    if not base.exists():
        return []

    fixtures: List[FixtureCase] = []
    for path in sorted(base.glob("*.json")):
        data = json.loads(path.read_text(encoding="utf-8"))
        fixtures.append(
            FixtureCase(
                name=path.stem,
                rfp_text=data["rfp_text"],
                expected_analysis=data["expected_analysis"],
            )
        )
    return fixtures


def fixture_names(fixtures: Iterable[FixtureCase]) -> List[str]:
    return [f.name for f in fixtures]
