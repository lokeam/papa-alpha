"""Eval runner — entrypoint for ``make evals`` and the CI workflow.

Run all evals over all fixtures, aggregate per-category scores by mean,
emit a single JSON summary on stdout, optionally export each fixture's
scores as eval traces to Phoenix tagged with the current git SHA, and
exit non-zero if any category regressed beyond the threshold.

Phoenix export is best-effort: if the SDK or endpoint isn't available
the run still prints its summary and returns the right exit code. Same
for the git SHA — when the runner is invoked outside a git checkout the
SHA is reported as ``"unknown"`` instead of crashing.

CLI:

    python -m evals.runner [--fixtures DIR] [--baselines FILE]
                            [--threshold FLOAT] [--no-phoenix]

Exit codes:
    0   — all categories within threshold of baseline
    1   — at least one regression detected
    2   — runner failure (bad fixtures / unreadable baselines)
"""

from __future__ import annotations

import argparse
import json
import logging
import subprocess
import sys
from pathlib import Path
from statistics import mean
from typing import Dict, List

from .baselines import (
    DEFAULT_BASELINES_PATH,
    DEFAULT_REGRESSION_THRESHOLD,
    detect_regressions,
    load_baselines,
)
from .completeness_eval import eval_completeness
from .fixtures_loader import DEFAULT_FIXTURES_DIR, load_fixtures
from .groundedness_eval import Judge, eval_groundedness, substring_judge
from .schema_eval import eval_schema_compliance
from .types import CATEGORIES, CategoryScores, FixtureCase, RunSummary

logger = logging.getLogger(__name__)


def _git_sha() -> str:
    """Return short git SHA of the current HEAD, or ``"unknown"``."""
    try:
        out = subprocess.check_output(
            ["git", "rev-parse", "--short", "HEAD"],
            stderr=subprocess.DEVNULL,
            cwd=Path(__file__).resolve().parent,
        )
        return out.decode("utf-8").strip()
    except (subprocess.CalledProcessError, FileNotFoundError):
        return "unknown"


def _mean_scores(per_fixture: List[CategoryScores]) -> CategoryScores:
    """Average each category's score across fixtures."""
    if not per_fixture:
        return {c: 0.0 for c in CATEGORIES}
    return {
        c: round(mean(s.get(c, 0.0) for s in per_fixture), 4)
        for c in CATEGORIES
    }


def run_all_evals(
    fixtures: List[FixtureCase],
    judge: Judge = substring_judge,
) -> Dict[str, CategoryScores]:
    """Run every eval against every fixture; return mean scores per eval."""
    per_eval_per_fixture: Dict[str, List[CategoryScores]] = {
        "schema_compliance": [],
        "completeness": [],
        "groundedness": [],
    }
    for fx in fixtures:
        per_eval_per_fixture["schema_compliance"].append(
            eval_schema_compliance(fx.expected_analysis)
        )
        per_eval_per_fixture["completeness"].append(
            eval_completeness(fx.expected_analysis)
        )
        per_eval_per_fixture["groundedness"].append(
            eval_groundedness(fx.rfp_text, fx.expected_analysis, judge=judge)
        )

    return {
        eval_name: _mean_scores(per_fixture)
        for eval_name, per_fixture in per_eval_per_fixture.items()
    }


def export_to_phoenix(
    summary: RunSummary,
    endpoint: str | None,
) -> None:
    """Best-effort: ship eval scores as spans to Phoenix tagged with git SHA.

    Wrapped in a broad try/except so an unreachable Phoenix never breaks
    the run. The Phoenix UI surfaces these as eval traces when grouped
    by ``git_sha`` resource attribute.
    """
    if not endpoint:
        return
    try:
        from opentelemetry import trace
        from opentelemetry.sdk.resources import Resource
        from opentelemetry.sdk.trace import TracerProvider
        from opentelemetry.sdk.trace.export import BatchSpanProcessor
        from opentelemetry.exporter.otlp.proto.grpc.trace_exporter import (
            OTLPSpanExporter,
        )

        resource = Resource.create(
            {"service.name": "rfp-evals", "git.sha": summary.git_sha}
        )
        provider = TracerProvider(resource=resource)
        provider.add_span_processor(
            BatchSpanProcessor(OTLPSpanExporter(endpoint=endpoint, insecure=True))
        )
        # Use a local tracer rather than the global one so the worker's
        # tracer provider is unaffected if the runner ever runs in-process.
        tracer = provider.get_tracer("rfp-evals")
        with tracer.start_as_current_span("evals.run") as run_span:
            run_span.set_attribute("git.sha", summary.git_sha)
            run_span.set_attribute("fixture.count", len(summary.fixtures))
            for eval_name, cat_scores in summary.scores.items():
                with tracer.start_as_current_span(f"eval.{eval_name}") as ev_span:
                    for category, score in cat_scores.items():
                        ev_span.set_attribute(f"score.{category}", score)
        provider.shutdown()
    except Exception as e:  # noqa: BLE001 — Phoenix export must never fail the run
        logger.warning("Phoenix export skipped: %s", e)


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(prog="evals.runner")
    parser.add_argument(
        "--fixtures",
        type=Path,
        default=DEFAULT_FIXTURES_DIR,
        help="Directory of fixture JSON files",
    )
    parser.add_argument(
        "--baselines",
        type=Path,
        default=DEFAULT_BASELINES_PATH,
        help="Path to baselines.json",
    )
    parser.add_argument(
        "--threshold",
        type=float,
        default=DEFAULT_REGRESSION_THRESHOLD,
        help="Maximum allowed drop below baseline (default: 0.05)",
    )
    parser.add_argument(
        "--phoenix-endpoint",
        type=str,
        default=None,
        help="OTLP gRPC endpoint for Phoenix eval-trace export (e.g. http://phoenix:4317)",
    )
    parser.add_argument(
        "--no-phoenix",
        action="store_true",
        help="Disable Phoenix export even if --phoenix-endpoint is set",
    )
    args = parser.parse_args(argv)

    fixtures = load_fixtures(args.fixtures)
    if not fixtures:
        print(
            json.dumps(
                {"error": f"No fixtures found in {args.fixtures}"},
                indent=2,
            ),
            file=sys.stdout,
        )
        return 2

    scores = run_all_evals(fixtures)
    baselines = load_baselines(args.baselines)
    regressions = detect_regressions(scores, baselines, threshold=args.threshold)

    summary = RunSummary(
        git_sha=_git_sha(),
        fixtures=[f.name for f in fixtures],
        scores=scores,
        regressions=regressions,
    )

    if not args.no_phoenix:
        export_to_phoenix(summary, args.phoenix_endpoint)

    print(json.dumps(summary.to_json(), indent=2))
    return 1 if regressions else 0


if __name__ == "__main__":
    sys.exit(main())
