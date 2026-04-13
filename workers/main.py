"""Papa-Alpha RFP Analysis Worker

Background worker for processing RFP documents with LLM analysis.
Single async event loop per process. SIGTERM/SIGINT trigger graceful shutdown.
"""

import asyncio
import logging
import signal
import sys

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
# Main Entry Point
# ============================================================================
async def _run_worker():
    """Create, connect, and run the worker with graceful-shutdown wiring."""
    worker = RFPWorker()
    worker.connect()

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
        await worker.disconnect()
        logger.info("Worker stopped gracefully")


if __name__ == "__main__":
    try:
        asyncio.run(_run_worker())
    except KeyboardInterrupt:
        pass  # Already handled by signal handler
    except Exception as e:
        logger.error(f"Worker failed with this error: {e}")
        sys.exit(1)
