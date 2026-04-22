"""Worker configuration and constants"""

import logging
import os
import sys
from urllib.parse import urlparse

logger = logging.getLogger(__name__)


# ============================================================================
# LLM Configuration
# ============================================================================


# Model selection
DEFAULT_LLM_MODEL = "gpt-4o-mini"
LLM_MODEL = "gpt-4o-mini"  # Cheapest option: $0.150/1M input, $0.600/1M output

# Pricing (USD per 1M tokens)
# Source: OpenAI pricing as of Dec 2024
LLM_PRICING = {
    "gpt-4o-mini": {
        "input": 0.150 / 1_000_000,   # $0.150 per 1M tokens
        "output": 0.600 / 1_000_000,  # $0.600 per 1M tokens
    },
}

# Temperature for LLM calls (lower = more deterministic)
LLM_TEMPERATURE = float(os.getenv("LLM_TEMPERATURE", "0.1"))

# Max risks passed as context to the questions prompt (token budget management)
RISKS_CONTEXT_LIMIT = 5

# Retry configuration
MAX_RETRIES = 5
RETRY_BASE_DELAY = 1  # seconds
RETRY_MAX_DELAY = 32  # seconds

# API timeouts
LLM_TIMEOUT = 120  # seconds

# ============================================================================
# Environment Variables
# ============================================================================

REDIS_URL = os.getenv("REDIS_URL", "redis://localhost:6379")
SUPABASE_URL = os.getenv("SUPABASE_URL", "http://localhost:54321")
SUPABASE_SERVICE_ROLE_KEY = os.getenv("SUPABASE_SERVICE_ROLE_KEY")
OPENAI_API_KEY = os.getenv("OPENAI_API_KEY")

# ============================================================================
# Worker Identity & Shutdown
# ============================================================================

WORKER_ID = os.getenv("WORKER_ID") or os.getenv("HOSTNAME")
WORKER_SHUTDOWN_GRACE_SECONDS = int(
    os.getenv("WORKER_SHUTDOWN_GRACE_SECONDS", "600")
)
WORKER_HEALTH_PORT = int(os.getenv("WORKER_HEALTH_PORT", "8080"))
WORKER_HEALTH_HOST = os.getenv("WORKER_HEALTH_HOST", "0.0.0.0")

# ============================================================================
# Queue Config
# ============================================================================

QUEUE_NAME = "rfp-analysis-queue"
PROCESSING_LIST_PREFIX = "rfp-analysis-processing"
DLQ_NAME = "rfp-analysis-dlq"
QUEUE_POLL_TIMEOUT = 5  # seconds

# Maximum attempts for a retryable failure before the job lands in the DLQ.
WORKER_MAX_JOB_ATTEMPTS = int(os.getenv("WORKER_MAX_JOB_ATTEMPTS", "3"))

# ============================================================================
# Storage Config
# ============================================================================

STORAGE_BUCKET = "documents"

# ============================================================================
# Progress Tracking Config
# ============================================================================

# Progress milestones (step name -> percentage)
PROGRESS_MILESTONES = {
    "uploaded": 10,
    "extracting_text": 30,
    "analyzing_risks": 40,
    "analyzing_accessibility": 60,
    "analyzing_questions": 80,
    "analyzing_subcontracting": 90,
    "completed": 100,
}

# Progress messages (user-friendly descriptions)
PROGRESS_MESSAGES = {
    "uploaded": "PDF uploaded successfully",
    "extracting_text": "Extracting text from PDF...",
    "analyzing_risks": "Analyzing identified risks...",
    "analyzing_accessibility": "Analyzing small business accessibility...",
    "analyzing_questions": "Generating clarifying questions...",
    "analyzing_subcontracting": "Identifying subcontracting opportunities...",
    "completed": "Analysis complete!",
}

# Redis channel prefix for progress updates
PROGRESS_CHANNEL_PREFIX = "progress"


# ============================================================================
# Boot-time Config Validation
# ============================================================================

_URL_VARS = ("SUPABASE_URL", "REDIS_URL")
_REQUIRED_VARS = (
    "SUPABASE_URL",
    "SUPABASE_SERVICE_ROLE_KEY",
    "OPENAI_API_KEY",
    "REDIS_URL",
)

_CONFIG_VALIDATED = False


def is_config_validated() -> bool:
    """Whether validate_config() has completed successfully in this process.

    Used by the readiness endpoint to confirm secrets were checked at boot,
    so /readyz never has to make a network call to OpenAI.
    """
    return _CONFIG_VALIDATED


def validate_config() -> None:
    """Assert every required secret is present and URL-shaped values parse.

    Called from the worker entrypoint before any connection is attempted.
    On any failure: emit a single CRITICAL line naming every missing/invalid
    variable, then sys.exit(1). No network calls — reachability is /readyz's job.
    """
    global _CONFIG_VALIDATED

    errors: list[str] = []

    for name in _REQUIRED_VARS:
        value = globals().get(name)
        if value is None or not str(value).strip():
            errors.append(f"{name} is missing or empty")
            continue
        if name in _URL_VARS:
            parsed = urlparse(str(value))
            if not parsed.scheme or not parsed.netloc:
                errors.append(f"{name} is not a valid URL: {value!r}")

    if errors:
        logger.critical("Worker config invalid: %s", "; ".join(errors))
        sys.exit(1)

    _CONFIG_VALIDATED = True
