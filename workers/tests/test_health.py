"""Tests for HealthServer (PRD c §5.6).

The server runs on the worker's event loop. We exercise it via
aiohttp.test_utils so we don't need real network sockets.
"""

import asyncio

import pytest
from aiohttp.test_utils import TestClient, TestServer

from health import HealthServer


# ---------------------------------------------------------------------------
# Fixtures
# ---------------------------------------------------------------------------


def _ok_check():
    async def _check():
        return None
    return _check


def _failing_check(exc: Exception):
    async def _check():
        raise exc
    return _check


def _hanging_check():
    async def _check():
        await asyncio.sleep(60)
    return _check


def _make_server(
    *,
    check_redis=None,
    check_supabase=None,
    is_config_validated=lambda: True,
    redis_timeout=2.0,
    supabase_timeout=5.0,
) -> HealthServer:
    return HealthServer(
        check_redis=check_redis or _ok_check(),
        check_supabase=check_supabase or _ok_check(),
        is_config_validated=is_config_validated,
        redis_timeout=redis_timeout,
        supabase_timeout=supabase_timeout,
    )


@pytest.fixture
async def client_for():
    """Factory that wires a HealthServer into an in-process aiohttp client."""
    created: list[TestClient] = []

    async def _factory(server: HealthServer) -> TestClient:
        app = server.build_app()
        ts = TestServer(app)
        client = TestClient(ts)
        await client.start_server()
        created.append(client)
        return client

    yield _factory

    for client in created:
        await client.close()


# ---------------------------------------------------------------------------
# /healthz — liveness only
# ---------------------------------------------------------------------------


async def test_healthz_returns_200_when_alive(client_for):
    client = await client_for(_make_server())

    resp = await client.get("/healthz")

    assert resp.status == 200
    assert (await resp.json()) == {"status": "ok"}


async def test_healthz_does_not_invoke_dependency_checks(client_for):
    """Liveness must succeed even if Redis/Supabase are down."""
    redis_called = {"n": 0}
    supabase_called = {"n": 0}

    async def redis_check():
        redis_called["n"] += 1
        raise RuntimeError("redis is down")

    async def supabase_check():
        supabase_called["n"] += 1
        raise RuntimeError("supabase is down")

    server = _make_server(check_redis=redis_check, check_supabase=supabase_check)
    client = await client_for(server)

    resp = await client.get("/healthz")

    assert resp.status == 200
    assert redis_called["n"] == 0
    assert supabase_called["n"] == 0


# ---------------------------------------------------------------------------
# /readyz — strict readiness
# ---------------------------------------------------------------------------


async def test_readyz_returns_200_when_all_dependencies_pass(client_for):
    client = await client_for(_make_server())

    resp = await client.get("/readyz")

    assert resp.status == 200
    body = await resp.json()
    assert body["status"] == "ready"


async def test_readyz_returns_503_when_redis_down(client_for):
    server = _make_server(
        check_redis=_failing_check(ConnectionError("ECONNREFUSED")),
    )
    client = await client_for(server)

    resp = await client.get("/readyz")

    assert resp.status == 503
    body = await resp.json()
    failing = {f["dependency"] for f in body["failures"]}
    assert "redis" in failing
    assert "supabase" not in failing


async def test_readyz_503_names_redis_when_redis_check_times_out(client_for):
    server = _make_server(
        check_redis=_hanging_check(),
        redis_timeout=0.05,
    )
    client = await client_for(server)

    resp = await client.get("/readyz")

    assert resp.status == 503
    body = await resp.json()
    redis_failure = next(f for f in body["failures"] if f["dependency"] == "redis")
    assert "timed out" in redis_failure["error"]


async def test_readyz_returns_503_when_supabase_down(client_for):
    server = _make_server(
        check_supabase=_failing_check(RuntimeError("supabase blocked")),
    )
    client = await client_for(server)

    resp = await client.get("/readyz")

    assert resp.status == 503
    body = await resp.json()
    failing = {f["dependency"] for f in body["failures"]}
    assert "supabase" in failing
    assert "redis" not in failing


async def test_readyz_503_names_supabase_when_supabase_check_times_out(client_for):
    server = _make_server(
        check_supabase=_hanging_check(),
        supabase_timeout=0.05,
    )
    client = await client_for(server)

    resp = await client.get("/readyz")

    assert resp.status == 503
    body = await resp.json()
    supabase_failure = next(
        f for f in body["failures"] if f["dependency"] == "supabase"
    )
    assert "timed out" in supabase_failure["error"]


async def test_readyz_returns_503_when_config_not_validated(client_for):
    server = _make_server(is_config_validated=lambda: False)
    client = await client_for(server)

    resp = await client.get("/readyz")

    assert resp.status == 503
    body = await resp.json()
    failing = {f["dependency"] for f in body["failures"]}
    assert "config" in failing


async def test_readyz_lists_all_failing_dependencies(client_for):
    """A single probe must surface every failure, not just the first."""
    server = _make_server(
        check_redis=_failing_check(RuntimeError("redis offline")),
        check_supabase=_failing_check(RuntimeError("supabase offline")),
        is_config_validated=lambda: False,
    )
    client = await client_for(server)

    resp = await client.get("/readyz")

    assert resp.status == 503
    body = await resp.json()
    failing = {f["dependency"] for f in body["failures"]}
    assert failing == {"redis", "supabase", "config"}


async def test_readyz_recovers_when_dependency_returns(client_for):
    """When a dep recovers, /readyz returns 200 on the next poll."""
    redis_state = {"healthy": False}

    async def redis_check():
        if not redis_state["healthy"]:
            raise ConnectionError("redis down")

    server = _make_server(check_redis=redis_check)
    client = await client_for(server)

    resp = await client.get("/readyz")
    assert resp.status == 503

    redis_state["healthy"] = True

    resp = await client.get("/readyz")
    assert resp.status == 200


# ---------------------------------------------------------------------------
# Lifecycle — start/stop are idempotent and clean
# ---------------------------------------------------------------------------


async def test_server_start_and_stop_leave_no_orphans():
    """A graceful stop releases the runner so the event loop can exit cleanly."""
    server = _make_server()

    # Bind to port 0 so the OS picks a free port — keeps the test hermetic.
    server._port = 0
    await server.start()
    try:
        assert server._runner is not None
        assert server._site is not None
    finally:
        await server.stop()

    assert server._runner is None
    assert server._site is None


async def test_server_stop_is_idempotent():
    server = _make_server()
    await server.stop()  # before start — no-op, no exception
    server._port = 0
    await server.start()
    await server.stop()
    await server.stop()  # second stop — no exception
