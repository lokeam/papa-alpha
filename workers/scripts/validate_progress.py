#!/usr/bin/env python3
"""Validate progress message format - used in CI and debugging

This script subscribes to Redis progress channels and validates:
- Message structure (required fields)
- Step names match config
- Progress percentages match config
- JSON format is valid

Usage:
    python scripts/validate_progress.py

Returns:
    0 if validation passes
    1 if validation fails
"""

import redis
import json
import sys
import signal
from datetime import datetime

# Add parent directory to path to import config
sys.path.insert(0, '..')
from config import REDIS_URL, PROGRESS_MILESTONES


class ProgressValidator:
    """Validates progress messages from Redis pub/sub"""

    def __init__(self, timeout=120):
        self.timeout = timeout
        self.seen_steps = set()
        self.errors = []
        self.message_count = 0
        self.start_time = None

    def validate_message(self, data):
        """Validate a single progress message"""
        self.message_count += 1

        # Validate required fields
        required = ['step', 'progress', 'message', 'timestamp']
        missing = [f for f in required if f not in data]
        if missing:
            self.errors.append(f"Message {self.message_count}: Missing fields: {missing}")
            return False

        step = data['step']
        progress = data['progress']

        # Validate step is known (or error)
        if step not in PROGRESS_MILESTONES and step != 'error':
            self.errors.append(f"Message {self.message_count}: Unknown step '{step}'")
            return False

        # Validate progress matches config (skip for error messages)
        if step != 'error':
            expected = PROGRESS_MILESTONES.get(step)
            if expected and progress != expected:
                self.errors.append(
                    f"Message {self.message_count}: Wrong progress for '{step}': "
                    f"{progress}% (expected {expected}%)"
                )
                return False

        # Track seen steps
        self.seen_steps.add(step)

        # Print progress
        timestamp = datetime.fromisoformat(data['timestamp'].replace('Z', '+00:00'))
        elapsed = (timestamp - self.start_time).total_seconds() if self.start_time else 0

        print(f"✓ [{elapsed:6.1f}s] {step:20s} ({progress:3d}%) - {data['message']}")

        return True

    def run(self):
        """Subscribe to progress channel and validate messages"""
        print(f"Connecting to Redis: {REDIS_URL}")

        try:
            r = redis.from_url(REDIS_URL)
            pubsub = r.pubsub()
            pubsub.psubscribe('progress:*')

            print("✓ Connected to Redis")
            print("✓ Subscribed to progress:*")
            print(f"\nWaiting for messages (timeout: {self.timeout}s)...\n")

            # Set up timeout handler
            def timeout_handler(signum, frame):
                raise TimeoutError("No messages received within timeout")

            signal.signal(signal.SIGALRM, timeout_handler)
            signal.alarm(self.timeout)

            for message in pubsub.listen():
                if message['type'] == 'pmessage':
                    # Reset timeout on each message
                    signal.alarm(self.timeout)

                    try:
                        data = json.loads(message['data'])

                        # Set start time on first message
                        if self.start_time is None and 'timestamp' in data:
                            self.start_time = datetime.fromisoformat(
                                data['timestamp'].replace('Z', '+00:00')
                            )

                        self.validate_message(data)

                        # Exit on completion or error
                        if data.get('step') in ['completed', 'error']:
                            signal.alarm(0)  # Cancel timeout
                            break

                    except json.JSONDecodeError as e:
                        self.errors.append(f"Message {self.message_count + 1}: Invalid JSON - {e}")

        except redis.ConnectionError as e:
            print(f"\n❌ Failed to connect to Redis: {e}")
            print("\nMake sure Redis is running: docker compose up -d redis")
            return 1
        except TimeoutError:
            print(f"\n⚠️  Timeout: No messages received in {self.timeout}s")
            print("\nMake sure a job is running. Upload a PDF to trigger analysis.")
            return 1
        except KeyboardInterrupt:
            print("\n\n⚠️  Interrupted by user")
            signal.alarm(0)
        finally:
            signal.alarm(0)  # Ensure alarm is cancelled

        # Report results
        print("\n" + "="*60)
        print("VALIDATION RESULTS")
        print("="*60)

        if self.errors:
            print(f"\n❌ FAILED: {len(self.errors)} error(s) found:\n")
            for err in self.errors:
                print(f"  - {err}")
            print()
            return 1

        print(f"\n✅ PASSED")
        print(f"  - Messages received: {self.message_count}")
        print(f"  - Unique steps: {len(self.seen_steps)}")
        print(f"  - Steps seen: {', '.join(sorted(self.seen_steps))}")
        print()

        # Check if we saw all expected steps (optional warning)
        expected_steps = set(PROGRESS_MILESTONES.keys())
        missing_steps = expected_steps - self.seen_steps
        if missing_steps and 'error' not in self.seen_steps:
            print(f"⚠️  Note: Some steps not seen: {', '.join(missing_steps)}")
            print("   (This may be normal if job completed quickly)\n")

        return 0


if __name__ == "__main__":
    validator = ProgressValidator(timeout=120)
    sys.exit(validator.run())