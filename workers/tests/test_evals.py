"""Tests for the offline eval suite (PRD e §5.8 / Plan phase 7).

Covers each acceptance criterion from the plan:

* schema_compliance accepts valid analysis and rejects a structurally
  invalid one (missing required field)
* completeness gives a per-category fraction in [0, 1]
* groundedness scores in [0, 1] with both the offline substring judge
  and a stub LLM-style judge
* runner emits well-formed JSON to stdout and exits 0 on a clean run
* runner exits non-zero with regressions named when a score drops past
  the threshold
* runner runs without Phoenix when --no-phoenix is set (no exceptions)
"""

from __future__ import annotations

import copy
import io
import json
import sys
from contextlib import redirect_stdout
from pathlib import Path

import pytest

# Mirror conftest path setup so this test loads standalone.
_workers_dir = str(Path(__file__).resolve().parent.parent)
if _workers_dir not in sys.path:
    sys.path.insert(0, _workers_dir)

from evals import (
    detect_regressions,
    eval_completeness,
    eval_groundedness,
    eval_schema_compliance,
    load_baselines,
    load_fixtures,
)
from evals.groundedness_eval import Claim, substring_judge
from evals.runner import main as runner_main


# ---------------------------------------------------------------------------
# Fixtures + helpers
# ---------------------------------------------------------------------------


@pytest.fixture
def fixtures():
    fxs = load_fixtures()
    assert len(fxs) >= 5, "expected at least 5 seed fixtures"
    return fxs


@pytest.fixture
def first_fixture(fixtures):
    return fixtures[0]


def _write_baselines(tmp_path: Path, content: dict) -> Path:
    p = tmp_path / "baselines.json"
    p.write_text(json.dumps(content), encoding="utf-8")
    return p


# ---------------------------------------------------------------------------
# Schema compliance
# ---------------------------------------------------------------------------


def test_schema_eval_passes_for_valid_fixture(first_fixture):
    scores = eval_schema_compliance(first_fixture.expected_analysis)
    assert scores == {
        "risks": 1.0,
        "accessibility": 1.0,
        "questions": 1.0,
        "subcontracting": 1.0,
    }


def test_schema_eval_rejects_missing_required_field(first_fixture):
    """Drop a required field from the risks analysis; that category goes to 0."""
    bad = copy.deepcopy(first_fixture.expected_analysis)
    bad["risks"]["risks"][0].pop("severity")  # severity is required
    scores = eval_schema_compliance(bad)
    assert scores["risks"] == 0.0
    # Other categories untouched
    assert scores["accessibility"] == 1.0


def test_schema_eval_missing_category_scores_zero(first_fixture):
    bad = copy.deepcopy(first_fixture.expected_analysis)
    bad.pop("subcontracting")
    scores = eval_schema_compliance(bad)
    assert scores["subcontracting"] == 0.0


# ---------------------------------------------------------------------------
# Completeness
# ---------------------------------------------------------------------------


def test_completeness_full_for_valid_fixture(first_fixture):
    scores = eval_completeness(first_fixture.expected_analysis)
    for cat in ("risks", "accessibility", "questions", "subcontracting"):
        assert scores[cat] == 1.0


def test_completeness_drops_when_lists_empty(first_fixture):
    bad = copy.deepcopy(first_fixture.expected_analysis)
    bad["risks"]["risks"] = []  # no findings
    scores = eval_completeness(bad)
    # at_least_one_risk and first_risk_has_substantive_reasoning both fail
    assert 0.0 < scores["risks"] < 1.0


def test_completeness_score_in_unit_interval(first_fixture):
    scores = eval_completeness(first_fixture.expected_analysis)
    for s in scores.values():
        assert 0.0 <= s <= 1.0


# ---------------------------------------------------------------------------
# Groundedness
# ---------------------------------------------------------------------------


def test_groundedness_with_substring_judge(first_fixture):
    scores = eval_groundedness(first_fixture.rfp_text, first_fixture.expected_analysis)
    # Every quote in our seed fixtures is verbatim in the rfp_text
    for cat, s in scores.items():
        assert s == 1.0, f"{cat} grounded {s}"


def test_groundedness_drops_when_quote_not_in_source(first_fixture):
    bad = copy.deepcopy(first_fixture.expected_analysis)
    bad["risks"]["risks"][0]["exact_quote"] = "this string does not appear anywhere"
    scores = eval_groundedness(first_fixture.rfp_text, bad)
    assert scores["risks"] == 0.0
    assert scores["accessibility"] == 1.0


def test_groundedness_with_stub_llm_judge(first_fixture):
    """Custom judge always returns False; every category should score 0.0."""

    def reject_all(rfp_text: str, claim: Claim) -> bool:
        return False

    scores = eval_groundedness(
        first_fixture.rfp_text, first_fixture.expected_analysis, judge=reject_all
    )
    for s in scores.values():
        assert s == 0.0


def test_substring_judge_handles_empty_quote(first_fixture):
    assert substring_judge(first_fixture.rfp_text, Claim("risks", "", "ctx")) is False


# ---------------------------------------------------------------------------
# Regression detection
# ---------------------------------------------------------------------------


def test_detect_regressions_flags_drop_past_threshold():
    scores = {"schema_compliance": {"risks": 0.5, "accessibility": 1.0}}
    baselines = {"schema_compliance": {"risks": 1.0, "accessibility": 1.0}}
    regressions = detect_regressions(scores, baselines, threshold=0.05)
    assert len(regressions) == 1
    r = regressions[0]
    assert r.eval_name == "schema_compliance"
    assert r.category == "risks"
    assert r.delta == pytest.approx(0.5)


def test_detect_regressions_ignores_small_drops():
    scores = {"schema_compliance": {"risks": 0.97}}
    baselines = {"schema_compliance": {"risks": 1.0}}
    assert detect_regressions(scores, baselines, threshold=0.05) == []


def test_detect_regressions_ignores_categories_without_baseline():
    scores = {"new_eval": {"risks": 0.0}}
    baselines = {"schema_compliance": {"risks": 1.0}}
    # New eval not in baseline = no regression (gate is opt-in per category)
    assert detect_regressions(scores, baselines, threshold=0.05) == []


# ---------------------------------------------------------------------------
# Runner end-to-end
# ---------------------------------------------------------------------------


def _run_runner(args: list[str]) -> tuple[int, dict]:
    buf = io.StringIO()
    with redirect_stdout(buf):
        rc = runner_main(args)
    out = buf.getvalue().strip()
    return rc, json.loads(out)


def test_runner_clean_run_returns_zero_and_summary_json():
    rc, summary = _run_runner(["--no-phoenix"])
    assert rc == 0
    assert summary["regressions"] == []
    assert set(summary["scores"].keys()) == {
        "schema_compliance",
        "completeness",
        "groundedness",
    }
    assert len(summary["fixtures"]) >= 5
    assert "git_sha" in summary


def test_runner_returns_one_when_baseline_unattainable(tmp_path):
    """Baseline of 1.5 is unattainable; runner must report regression and exit 1."""
    baselines = _write_baselines(
        tmp_path,
        {
            "schema_compliance": {
                "risks": 1.5,  # > current 1.0 by 0.5, well past threshold
                "accessibility": 1.0,
                "questions": 1.0,
                "subcontracting": 1.0,
            },
        },
    )
    rc, summary = _run_runner(
        ["--no-phoenix", "--baselines", str(baselines), "--threshold", "0.05"]
    )
    assert rc == 1
    regs = summary["regressions"]
    assert any(
        r["eval"] == "schema_compliance" and r["category"] == "risks" for r in regs
    )


def test_runner_returns_two_when_no_fixtures(tmp_path):
    rc, payload = _run_runner(["--no-phoenix", "--fixtures", str(tmp_path)])
    assert rc == 2
    assert "error" in payload


def test_runner_no_phoenix_does_not_export(monkeypatch):
    """With --no-phoenix the export function must not be invoked."""
    called = {"n": 0}

    from evals import runner as runner_mod

    def fake_export(*a, **kw):
        called["n"] += 1

    monkeypatch.setattr(runner_mod, "export_to_phoenix", fake_export)
    rc, _ = _run_runner(["--no-phoenix"])
    assert rc == 0
    assert called["n"] == 0


def test_runner_export_to_phoenix_swallows_errors(monkeypatch):
    """Phoenix export wrapped in try/except; an unreachable endpoint is not fatal."""
    from evals import runner as runner_mod
    from evals.types import RunSummary

    # Endpoint is fictional; the function must return without raising.
    summary = RunSummary(git_sha="deadbeef", fixtures=["a"], scores={"x": {"risks": 1.0}})
    runner_mod.export_to_phoenix(summary, endpoint="http://invalid-host:9999")


# ---------------------------------------------------------------------------
# Baselines file shape
# ---------------------------------------------------------------------------


def test_committed_baselines_cover_every_eval():
    bl = load_baselines()
    assert set(bl.keys()) == {"schema_compliance", "completeness", "groundedness"}
    for eval_name, cats in bl.items():
        assert set(cats.keys()) == {
            "risks",
            "accessibility",
            "questions",
            "subcontracting",
        }, f"{eval_name} missing categories"
