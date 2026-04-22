"""Worker-level exception types."""


class LLMServiceError(Exception):
    """Base for LLM service failures. Classified as retryable by the worker."""


class AnalysisFailedError(LLMServiceError):
    """Raised when one or more LLM analysis categories fail after retries.

    Attributes:
        category: The name of the first category that failed.
        cause: The underlying exception.
    """

    def __init__(self, category: str, cause: Exception):
        self.category = category
        self.cause = cause
        super().__init__(
            f"Analysis failed: {category} category raised {type(cause).__name__}: {cause}"
        )


class StorageError(Exception):
    """Raised when a Supabase storage / database call fails. Retryable."""
