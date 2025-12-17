"""Progress Publisher - publishes real-time progress updates to Redis pub/sub"""

import json
import logging
from datetime import datetime
from typing import Optional
from redis import Redis

from config import (
    PROGRESS_MILESTONES,
    PROGRESS_MESSAGES,
    PROGRESS_CHANNEL_PREFIX,
)

logger = logging.getLogger(__name__)


class ProgressPublisher:
    """Publishes progress updates to Redis pub/sub for real-time frontend updates"""

    def __init__(self, redis_client: Redis, document_id: str):
        """Initialize progress publisher

        Accepts:
            redis_client: Redis client instance
            document_id: Document UUID to track
        """
        self.redis = redis_client
        self.document_id = document_id
        self.channel = f"{PROGRESS_CHANNEL_PREFIX}:{document_id}"

    def publish(self, step: str, custom_message: Optional[str] = None) -> None:
        """Publish progress update to Redis channel

        Accepts:
            step: Progress milestone name (must be in PROGRESS_MILESTONES)
            custom_message: Optional custom message (overrides default)
        """
        try:
            # Get progress percentage from config
            progress = PROGRESS_MILESTONES.get(step)
            if progress is None:
                logger.warning(f"Unknown progress step: {step}")
                return

            # Get message (custom or default)
            message = custom_message or PROGRESS_MESSAGES.get(step, f"Processing: {step}")

            # Build progress payload
            payload = {
                "step": step,
                "progress": progress,
                "message": message,
                "timestamp": datetime.utcnow().isoformat() + "Z",
            }

            # Publish to Redis channel (fire-and-forget)
            self.redis.publish(self.channel, json.dumps(payload))

            logger.info(
                f"📡 Progress: {step} ({progress}%) → {self.channel}"
            )

        except Exception as e:
            # Don't fail job if progress publishing fails
            logger.warning(f"Failed to publish progress for {step}: {e}")

    def publish_error(self, error_message: str) -> None:
        """Publish error message to progress channel

        Accepts:
            error_message: Error description
        """
        try:
            payload = {
                "step": "error",
                "progress": 0,
                "message": error_message,
                "timestamp": datetime.utcnow().isoformat() + "Z",
                "error": True,
            }

            self.redis.publish(self.channel, json.dumps(payload))
            logger.info(f"📡 Error published to {self.channel}")

        except Exception as e:
            logger.warning(f"Failed to publish error: {e}")