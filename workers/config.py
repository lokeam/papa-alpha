"""Worker configuration and constants"""

import os


# ============================================================================
# LLM Configuration
# ============================================================================


# Model names
LLM_MODEL_GPT4_TURBO = "gpt-4-turbo-preview"
LLM_MODEL_GPT4 = "gpt-4"
LLM_MODEL_GPT35 = "gpt-3.5-turbo"
DEFAULT_LLM_MODEL = LLM_MODEL_GPT4_TURBO

# Pricing (USD per 1000 tokens)
# Source: OpenAI pricing as of Dec 2024
LLM_PRICING = {
    LLM_MODEL_GPT4_TURBO: {
        "input": 0.01 / 1000,
        "output": 0.03 / 1000,
    },
    "gpt-4-turbo": {  # Note: using alias for compatibility
        "input": 0.01 / 1000,
        "output": 0.03 / 1000,
    },
    LLM_MODEL_GPT4: {
        "input": 0.03 / 1000,
        "output": 0.06 / 1000,
    },
    LLM_MODEL_GPT35: {
        "input": 0.0005 / 1000,
        "output": 0.0015 / 1000,
    },
}

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
