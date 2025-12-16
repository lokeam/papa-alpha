"""LLM cost calculation utilities"""

import logging
from typing import Dict, Any, Optional
from datetime import datetime, timezone
from config import LLM_PRICING, DEFAULT_LLM_MODEL

logger = logging.getLogger(__name__)


class CostCalculator:
    """Calculate LLM usage costs"""

    @staticmethod
    def calculate(
        model: str,
        input_tokens: int,
        output_tokens: int,
        duration_seconds: Optional[float] = None
    ) -> Dict[str, Any]:
        """Calculate LLM usage metrics and estimated cost

        Accepts:
            model: LLM model name (e.g., "gpt-4-turbo-preview")
            input_tokens: Number of input/prompt tokens
            output_tokens: Number of output/completion tokens
            duration_seconds: Optional API call duration

        Returns:
            Dictionary with model, tokens, cost, and timestamp
        """
        # Get pricing for model (default to GPT-4 Turbo if not found)
        pricing = LLM_PRICING.get(model, LLM_PRICING[DEFAULT_LLM_MODEL])

        # Calculate costs
        input_cost = input_tokens * pricing["input"]
        output_cost = output_tokens * pricing["output"]
        total_cost = input_cost + output_cost

        # Build usage data payload
        usage_data = {
            "model": model,
            "input_tokens": input_tokens,
            "output_tokens": output_tokens,
            "total_tokens": input_tokens + output_tokens,
            "estimated_cost_usd": round(total_cost, 4),
            "timestamp": datetime.now(timezone.utc).isoformat(),
        }

        # Add duration if provided
        if duration_seconds is not None:
            usage_data["duration_seconds"] = round(duration_seconds, 2)

        logger.debug(f"Calculated cost: ${usage_data['estimated_cost_usd']} for {usage_data['total_tokens']} tokens")

        return usage_data