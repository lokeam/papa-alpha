"""Papa-Alpha RFP Analysis Worker

Background worker for processing RFP documents with LLM analysis.
"""

import os
import sys
import signal
import logging

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
# Graceful Shutdown
# ============================================================================
graceful_shutdown_requested = False


def signal_handler(signum, frame):
    """Gracefully handle shutdown signals"""
    global graceful_shutdown_requested
    logger.info(f"Received signal {signum}, starting graceful shutdown...")
    graceful_shutdown_requested = True


# ============================================================================
# Main Entry Point
# ============================================================================
if __name__ == "__main__":
    # Register signal handlers for graceful shutdown
    signal.signal(signal.SIGINT, signal_handler)
    signal.signal(signal.SIGTERM, signal_handler)

    # Create and run worker
    worker = RFPWorker()

    try:
        worker.connect()
        worker.run()

    except Exception as e:
        logger.error(f"Worker failed with this error: {e}")
        sys.exit(1)

    finally:
        worker.disconnect()
        logger.info("Worker stopped gracefully")