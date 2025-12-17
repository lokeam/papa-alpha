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
