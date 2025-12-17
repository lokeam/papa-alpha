"""Worker configuration and constants"""

import os


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
# Queue Config
# ============================================================================

QUEUE_NAME = "rfp-analysis-queue"
QUEUE_POLL_TIMEOUT = 5  # seconds

# ============================================================================
# Storage Config
# ============================================================================

STORAGE_BUCKET = "documents"
