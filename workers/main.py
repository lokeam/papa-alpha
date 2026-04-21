"""Papa-Alpha RFP Analysis Worker

Background worker for processing RFP documents with LLM analysis.
Single async event loop per process. SIGTERM/SIGINT trigger graceful shutdown.
"""

import asyncio
import logging
import signal
import sys

from config import (
    WORKER_HEALTH_HOST,
    WORKER_HEALTH_PORT,
    is_config_validated,
    validate_config,
)
from health import HealthServer
from worker import RFPWorker

# ============================================================================
# Logging Setup
# ============================================================================
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[
        logging.StreamHandler(sys.stdout)
    ]
)
logger = logging.getLogger(__name__)


# ============================================================================
# Health Server Wiring
# ============================================================================
def _build_health_server(worker: RFPWorker) -> HealthServer:
    """Wire dependency checks against the live worker connections.

    Supabase is sync until Phase 5; offload its check to a thread so the
    event loop (and /healthz) remain responsive.
    """
    async def check_redis() -> None:
        await worker.redis_client.ping()

    async def check_supabase() -> None:
        client = worker.supabase_client
        if client is None:
            raise RuntimeError("supabase client not initialized")

        def _probe() -> None:
            client.table("documents").select("id").limit(1).execute()

        await asyncio.to_thread(_probe)

    return HealthServer(
        check_redis=check_redis,
        check_supabase=check_supabase,
        is_config_validated=is_config_validated,
        port=WORKER_HEALTH_PORT,
        host=WORKER_HEALTH_HOST,
    )


# ============================================================================
# Main Entry Point
# ============================================================================
async def _run_worker():
    """Create, connect, and run the worker with graceful-shutdown wiring."""
    worker = RFPWorker()
    worker.connect()

    health_server = _build_health_server(worker)
    await health_server.start()

    loop = asyncio.get_running_loop()

    def _request_shutdown(sig):
        logger.info(f"Received signal {sig}, requesting graceful shutdown...")
        worker._shutdown.set()

    for sig in (signal.SIGTERM, signal.SIGINT):
        loop.add_signal_handler(sig, _request_shutdown, sig)

    try:
        await worker.run()
    except asyncio.CancelledError:
        logger.info("Worker run cancelled")
    finally:
        await health_server.stop()
        await worker.disconnect()
        logger.info("Worker stopped gracefully")


if __name__ == "__main__":
    validate_config()
    try:
        asyncio.run(_run_worker())
    except KeyboardInterrupt:
        pass  # Already handled by signal handler
    except Exception as e:
        logger.error(f"Worker failed with this error: {e}")
        sys.exit(1)
