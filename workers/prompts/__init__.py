"""Prompts package for LLM analysis

System prompts: Static prompts that define the AI's role and constraints
User prompts: Dynamic templates that inject RFP text and metadata
"""

from .system import (
    RISKS_SYSTEM_PROMPT,
    ACCESSIBILITY_SYSTEM_PROMPT,
    QUESTIONS_SYSTEM_PROMPT,
    SUBCONTRACTING_SYSTEM_PROMPT,
)

from .analysis import (
    build_risks_prompt,
    build_accessibility_prompt,
    build_questions_prompt,
    build_subcontracting_prompt,
)

__all__ = [
    # System prompts
    "RISKS_SYSTEM_PROMPT",
    "ACCESSIBILITY_SYSTEM_PROMPT",
    "QUESTIONS_SYSTEM_PROMPT",
    "SUBCONTRACTING_SYSTEM_PROMPT",
    # User prompt builders
    "build_risks_prompt",
    "build_accessibility_prompt",
    "build_questions_prompt",
    "build_subcontracting_prompt",
]