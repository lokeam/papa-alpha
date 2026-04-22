"""OpenTelemetry tracing wired to Arize Phoenix (PRD e §5.4).

`configure_tracing()` is called once at worker boot. When
``PHOENIX_OTLP_ENDPOINT`` is set it installs a global ``TracerProvider``
with an OTLP gRPC exporter pointing at Phoenix and turns on OpenAI
auto-instrumentation so every chat/completions call produces a span with
prompts, completions, token usage, and latency.

When the endpoint is unset (or initialization fails for any reason) a
plain ``TracerProvider`` is registered with no exporter — calls to
``get_tracer()`` keep returning real ``Tracer`` instances, so manual
spans inside the worker still execute, but nothing is shipped off-box.
The job itself never fails because Phoenix is unreachable.

Public surface intentionally narrow:

  configure_tracing()  → call once at boot
  get_tracer(name)     → use anywhere a span is needed
  shutdown_tracing()   → optional clean shutdown of the exporter
"""

from __future__ import annotations

import logging
from typing import Optional

from opentelemetry import trace
from opentelemetry.sdk.resources import Resource
from opentelemetry.sdk.trace import TracerProvider
from opentelemetry.sdk.trace.export import BatchSpanProcessor

from config import PHOENIX_OTLP_ENDPOINT, TRACING_SERVICE_NAME

logger = logging.getLogger(__name__)

_TRACER_PROVIDER: Optional[TracerProvider] = None
_OPENAI_INSTRUMENTED = False


def configure_tracing(
    *,
    endpoint: Optional[str] = None,
    service_name: Optional[str] = None,
) -> TracerProvider:
    """Install a global TracerProvider and (optionally) an OTLP exporter.

    Idempotent: a second call is a no-op and returns the existing provider.

    Accepts:
        endpoint: OTLP gRPC endpoint. Falls back to PHOENIX_OTLP_ENDPOINT.
                  When None/empty, the provider is installed without any
                  exporter — spans run locally but nothing is shipped.
        service_name: Resource ``service.name`` reported on every span.
                      Defaults to TRACING_SERVICE_NAME.
    """
    global _TRACER_PROVIDER, _OPENAI_INSTRUMENTED
    if _TRACER_PROVIDER is not None:
        return _TRACER_PROVIDER

    resolved_endpoint = endpoint if endpoint is not None else PHOENIX_OTLP_ENDPOINT
    resolved_service = service_name or TRACING_SERVICE_NAME

    resource = Resource.create({"service.name": resolved_service})
    provider = TracerProvider(resource=resource)

    if resolved_endpoint:
        try:
            # Local import — keeps the gRPC dep optional for pure-unit tests
            # that exercise the no-op path.
            from opentelemetry.exporter.otlp.proto.grpc.trace_exporter import (
                OTLPSpanExporter,
            )

            exporter = OTLPSpanExporter(endpoint=resolved_endpoint, insecure=True)
            provider.add_span_processor(BatchSpanProcessor(exporter))
            logger.info("OTLP exporter configured: %s", resolved_endpoint)
        except Exception as e:  # noqa: BLE001 — never let tracing kill the worker
            logger.warning(
                "Failed to configure OTLP exporter (%s); tracing will run locally only: %s",
                resolved_endpoint,
                e,
            )
    else:
        logger.info(
            "PHOENIX_OTLP_ENDPOINT unset; tracing runs locally without an exporter"
        )

    trace.set_tracer_provider(provider)
    _TRACER_PROVIDER = provider

    if not _OPENAI_INSTRUMENTED:
        try:
            from openinference.instrumentation.openai import OpenAIInstrumentor

            OpenAIInstrumentor().instrument(tracer_provider=provider)
            _OPENAI_INSTRUMENTED = True
            logger.info("OpenAI auto-instrumentation enabled")
        except Exception as e:  # noqa: BLE001
            logger.warning("OpenAI auto-instrumentation failed: %s", e)

    return provider


def get_tracer(name: str) -> trace.Tracer:
    """Return a tracer for *name*. Safe before configure_tracing() is called.

    The OTEL API returns a real Tracer either way; if no provider has been
    set, it falls back to the API's default no-op tracer.
    """
    return trace.get_tracer(name)


def shutdown_tracing() -> None:
    """Flush and shut down the active TracerProvider, if any."""
    global _TRACER_PROVIDER, _OPENAI_INSTRUMENTED
    if _TRACER_PROVIDER is None:
        return
    try:
        _TRACER_PROVIDER.shutdown()
    except Exception as e:  # noqa: BLE001
        logger.warning("Error shutting down tracer provider: %s", e)
    finally:
        _TRACER_PROVIDER = None
        _OPENAI_INSTRUMENTED = False
