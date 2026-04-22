"""Structured JSON logging configuration (PRD c §5.5).

`configure_logging()` wires structlog with a JSON renderer to stdout and
installs a stdlib bridge so existing `logger.*` call sites inherit the same
output without any code changes.

Standard fields per line: ``timestamp`` (ISO-8601 UTC), ``level``, ``logger``
(record name), ``event`` (the log message). Anything bound through
``structlog.contextvars.bind_contextvars`` — typically ``worker_id`` at boot
and ``document_id`` for the duration of a job — is merged in automatically,
including across ``await`` boundaries and into nested service calls.

The function is idempotent so test setups can call it repeatedly without
stacking handlers.
"""

from __future__ import annotations

import logging
import os
import sys

import structlog


def configure_logging(level: str | None = None) -> None:
    """Initialize JSON logging on stdout for both structlog and stdlib loggers.

    Accepts:
        level: Log level name (e.g. "INFO", "DEBUG"). Defaults to the
               LOG_LEVEL env var, falling back to "INFO".
    """
    log_level = (level or os.getenv("LOG_LEVEL") or "INFO").upper()

    # Processors that run for both native structlog calls and for stdlib
    # records routed through the ProcessorFormatter below.
    shared_processors: list = [
        structlog.contextvars.merge_contextvars,
        structlog.stdlib.add_logger_name,
        structlog.stdlib.add_log_level,
        structlog.processors.TimeStamper(fmt="iso", utc=True, key="timestamp"),
        structlog.processors.StackInfoRenderer(),
        structlog.processors.format_exc_info,
    ]

    structlog.configure(
        processors=shared_processors
        + [structlog.stdlib.ProcessorFormatter.wrap_for_formatter],
        logger_factory=structlog.stdlib.LoggerFactory(),
        wrapper_class=structlog.stdlib.BoundLogger,
        cache_logger_on_first_use=True,
    )

    formatter = structlog.stdlib.ProcessorFormatter(
        foreign_pre_chain=shared_processors,
        processors=[
            structlog.stdlib.ProcessorFormatter.remove_processors_meta,
            structlog.processors.JSONRenderer(),
        ],
    )

    handler = logging.StreamHandler(sys.stdout)
    handler.setFormatter(formatter)

    root = logging.getLogger()
    # Idempotent: replace any handlers a previous configure_logging() (or
    # logging.basicConfig) installed so a second call doesn't duplicate output.
    for existing in list(root.handlers):
        root.removeHandler(existing)
    root.addHandler(handler)
    root.setLevel(getattr(logging, log_level, logging.INFO))
