"""In-process health and readiness HTTP server (PRD c §5.6).

Runs alongside the worker on the same asyncio event loop. Exposes:

  GET /healthz   liveness only — does not check dependencies
  GET /readyz    readiness — verifies Redis, Supabase, and that boot-time
                 secret validation has completed

Strict readiness is intentional: a worker that cannot reach Supabase will
dequeue and immediately fail jobs, so rotating it out is the safe move.
"""

from __future__ import annotations

import asyncio
import logging
from typing import Awaitable, Callable, Optional

from aiohttp import web

logger = logging.getLogger(__name__)


CheckFn = Callable[[], Awaitable[None]]
ConfigValidatedFn = Callable[[], bool]


class HealthServer:
    """aiohttp server exposing /healthz and /readyz on the worker's loop."""

    def __init__(
        self,
        *,
        check_redis: CheckFn,
        check_supabase: CheckFn,
        is_config_validated: ConfigValidatedFn,
        port: int = 8080,
        host: str = "0.0.0.0",
        redis_timeout: float = 2.0,
        supabase_timeout: float = 5.0,
    ):
        self._check_redis = check_redis
        self._check_supabase = check_supabase
        self._is_config_validated = is_config_validated
        self._port = port
        self._host = host
        self._redis_timeout = redis_timeout
        self._supabase_timeout = supabase_timeout

        self._runner: Optional[web.AppRunner] = None
        self._site: Optional[web.BaseSite] = None

    def build_app(self) -> web.Application:
        """Build the aiohttp Application. Exposed for in-process tests."""
        app = web.Application()
        app.router.add_get("/healthz", self._handle_healthz)
        app.router.add_get("/readyz", self._handle_readyz)
        return app

    async def start(self) -> None:
        """Bind the HTTP server to (host, port) on the current event loop."""
        if self._runner is not None:
            return

        self._runner = web.AppRunner(self.build_app())
        await self._runner.setup()
        self._site = web.TCPSite(self._runner, host=self._host, port=self._port)
        await self._site.start()
        logger.info("Health server listening on %s:%d", self._host, self._port)

    async def stop(self) -> None:
        """Shut down cleanly so the event loop has no orphan tasks."""
        if self._site is not None:
            await self._site.stop()
            self._site = None
        if self._runner is not None:
            await self._runner.cleanup()
            self._runner = None
        logger.info("Health server stopped")

    # ------------------------------------------------------------------
    # Handlers
    # ------------------------------------------------------------------

    async def _handle_healthz(self, _request: web.Request) -> web.Response:
        return web.json_response({"status": "ok"})

    async def _handle_readyz(self, _request: web.Request) -> web.Response:
        failures: list[dict[str, str]] = []

        await self._run_check(
            failures, "redis", self._check_redis, self._redis_timeout
        )
        await self._run_check(
            failures, "supabase", self._check_supabase, self._supabase_timeout
        )

        if not self._is_config_validated():
            failures.append(
                {"dependency": "config", "error": "boot-time config validation has not completed"}
            )

        if failures:
            return web.json_response(
                {"status": "not_ready", "failures": failures}, status=503
            )
        return web.json_response({"status": "ready"})

    @staticmethod
    async def _run_check(
        failures: list[dict[str, str]],
        name: str,
        check: CheckFn,
        timeout: float,
    ) -> None:
        try:
            await asyncio.wait_for(check(), timeout=timeout)
        except asyncio.TimeoutError:
            failures.append(
                {"dependency": name, "error": f"timed out after {timeout}s"}
            )
        except Exception as e:  # noqa: BLE001 — surface any failure to the probe
            failures.append({"dependency": name, "error": f"{type(e).__name__}: {e}"})
