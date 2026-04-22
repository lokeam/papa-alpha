"""Tests for OTEL tracing + Phoenix wiring (PRD e §5.4)."""

from __future__ import annotations

import io
import json
import logging
import sys
from contextlib import redirect_stdout
from pathlib import Path

import pytest
import structlog
from opentelemetry import trace
from opentelemetry.sdk.trace import TracerProvider
from opentelemetry.sdk.trace.export import SimpleSpanProcessor
from opentelemetry.sdk.trace.export.in_memory_span_exporter import InMemorySpanExporter

# Mirror conftest path setup so this test loads standalone.
_workers_dir = str(Path(__file__).resolve().parent.parent)
if _workers_dir not in sys.path:
    sys.path.insert(0, _workers_dir)

import tracing as tracing_mod
from logging_config import configure_logging
from tests.conftest import make_job


@pytest.fixture
def reset_tracing_state():
    """Force configure_tracing() to re-initialize on each test.

    Three layers of state need clearing so a fresh provider can be
    installed: our own module cache, OTEL's global ``_TRACER_PROVIDER``,
    and OTEL's ``_TRACER_PROVIDER_SET_ONCE`` guard (which otherwise
    rejects the second ``set_tracer_provider`` with a warning).
    """
    from opentelemetry.util._once import Once

    def _clear() -> None:
        tracing_mod._TRACER_PROVIDER = None
        tracing_mod._OPENAI_INSTRUMENTED = False
        trace._TRACER_PROVIDER = None  # type: ignore[attr-defined]
        trace._TRACER_PROVIDER_SET_ONCE = Once()  # type: ignore[attr-defined]

    _clear()
    yield
    _clear()


# ---------------------------------------------------------------------------
# Module-level configuration behavior
# ---------------------------------------------------------------------------


def test_configure_tracing_no_endpoint_runs_local_only(reset_tracing_state):
    """With no PHOENIX_OTLP_ENDPOINT, configure_tracing installs a provider
    but no exporter — spans still execute, nothing is shipped."""
    provider = tracing_mod.configure_tracing(endpoint=None)

    assert isinstance(provider, TracerProvider)
    # No span processors means no exporter wired up.
    assert len(provider._active_span_processor._span_processors) == 0


def test_configure_tracing_is_idempotent(reset_tracing_state):
    """Second call returns the same provider; doesn't stack exporters."""
    first = tracing_mod.configure_tracing(endpoint=None)
    second = tracing_mod.configure_tracing(endpoint=None)
    assert first is second


def test_configure_tracing_with_endpoint_registers_exporter(reset_tracing_state):
    """A non-empty endpoint installs an OTLP BatchSpanProcessor."""
    provider = tracing_mod.configure_tracing(endpoint="http://phoenix:4317")

    processors = provider._active_span_processor._span_processors
    assert len(processors) == 1
    # BatchSpanProcessor wraps a single exporter under .span_exporter.
    exporter = processors[0].span_exporter
    assert exporter.__class__.__name__ == "OTLPSpanExporter"


def test_configure_tracing_swallows_exporter_error(reset_tracing_state, monkeypatch):
    """If the OTLP exporter fails to construct (bad endpoint, missing dep)
    the worker continues with a local-only provider — the job must not die."""
    import opentelemetry.exporter.otlp.proto.grpc.trace_exporter as otlp_mod

    def boom(*_a, **_kw):
        raise RuntimeError("simulated exporter failure")

    monkeypatch.setattr(otlp_mod, "OTLPSpanExporter", boom)

    provider = tracing_mod.configure_tracing(endpoint="http://nowhere:4317")

    # Provider is still installed locally, just with no exporter.
    assert isinstance(provider, TracerProvider)
    assert len(provider._active_span_processor._span_processors) == 0


def test_get_tracer_returns_real_tracer_after_configure(reset_tracing_state):
    tracing_mod.configure_tracing(endpoint=None)
    tracer = tracing_mod.get_tracer("test")
    # Just exercise it — the call should not raise.
    with tracer.start_as_current_span("smoke"):
        pass


# ---------------------------------------------------------------------------
# Span hierarchy emitted during a successful job
# ---------------------------------------------------------------------------


@pytest.fixture
def in_memory_spans(reset_tracing_state):
    """Install a fresh provider with an in-memory exporter.

    Bypasses configure_tracing() so we can assert on the spans directly.
    """
    exporter = InMemorySpanExporter()
    provider = TracerProvider()
    provider.add_span_processor(SimpleSpanProcessor(exporter))
    trace.set_tracer_provider(provider)
    tracing_mod._TRACER_PROVIDER = provider
    yield exporter
    provider.shutdown()
    # Spans were captured against module-level tracers grabbed at import
    # time. Drop them so the next test gets a freshly-resolved tracer.
    import worker as worker_mod
    worker_mod.tracer = trace.get_tracer("worker")


@pytest.mark.asyncio
async def test_process_job_emits_expected_span_tree(
    in_memory_spans, worker, storage_service
):
    """Happy path produces root + child spans matching the plan's tree.

    Plan §Phase 6: root worker.process_job → pdf.download, pdf.extract,
    llm.analyze_rfp, supabase.mark_completed.
    """
    doc_id = "trace-001"
    storage_service.seed(doc_id)

    # The worker module imported its tracer at module import time, before
    # the in-memory provider existed. Rebind it so spans hit the in-memory
    # exporter for this test.
    import worker as worker_mod

    worker_mod.tracer = trace.get_tracer("worker")

    await worker.process_job(make_job(doc_id))

    names = [s.name for s in in_memory_spans.get_finished_spans()]

    assert "worker.process_job" in names
    assert "pdf.download" in names
    assert "pdf.extract" in names
    assert "llm.analyze_rfp" in names
    assert "supabase.mark_completed" in names


@pytest.mark.asyncio
async def test_process_job_root_span_carries_document_id(
    in_memory_spans, worker, storage_service
):
    """Acceptance: document_id is present as a span attribute on the root span."""
    doc_id = "trace-attr-001"
    storage_service.seed(doc_id)

    import worker as worker_mod

    worker_mod.tracer = trace.get_tracer("worker")

    await worker.process_job(make_job(doc_id))

    spans = in_memory_spans.get_finished_spans()
    root = next(s for s in spans if s.name == "worker.process_job")

    assert root.attributes["document_id"] == doc_id
    assert root.attributes["attempts"] == 1
    assert root.attributes["worker_id"] == worker.worker_id


# ---------------------------------------------------------------------------
# Log → trace correlation: trace_id and span_id appear on log records
# ---------------------------------------------------------------------------


@pytest.fixture(autouse=True)
def _reset_logging_state():
    yield
    structlog.contextvars.clear_contextvars()
    structlog.reset_defaults()
    root = logging.getLogger()
    for h in list(root.handlers):
        root.removeHandler(h)


def _captured_records(buf: io.StringIO) -> list[dict]:
    return [
        json.loads(line)
        for line in buf.getvalue().splitlines()
        if line.strip()
    ]


def test_logs_inside_span_carry_trace_and_span_ids(reset_tracing_state):
    tracing_mod.configure_tracing(endpoint=None)
    tracer = tracing_mod.get_tracer("test")

    buf = io.StringIO()
    with redirect_stdout(buf):
        configure_logging()
        with tracer.start_as_current_span("unit-test-span"):
            logging.getLogger("svc.x").info("inside")
        logging.getLogger("svc.x").info("outside")

    records = _captured_records(buf)
    assert len(records) == 2

    inside, outside = records
    assert inside["event"] == "inside"
    assert "trace_id" in inside, f"missing trace_id: {inside}"
    assert "span_id" in inside, f"missing span_id: {inside}"
    # 32 hex chars (16 bytes) for trace_id, 16 for span_id.
    assert len(inside["trace_id"]) == 32
    assert len(inside["span_id"]) == 16

    # Outside the span there is no active context → keys are omitted so
    # idle/boot lines don't grow misleading all-zero fields.
    assert outside["event"] == "outside"
    assert "trace_id" not in outside
    assert "span_id" not in outside
