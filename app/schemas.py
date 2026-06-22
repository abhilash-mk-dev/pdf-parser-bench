"""
Common interface every parser wrapper implements, so the FastAPI layer and
the benchmark script can treat all four parser categories identically.
"""

from dataclasses import dataclass, field


@dataclass
class ParseResult:
    parser: str
    text: str
    page_count: int
    latency_ms: float
    success: bool = True
    error: str | None = None
    # Free-form bag for parser-specific extras (e.g. detected tables,
    # element types, cost estimate) -- surfaced in the API response but
    # not required.
    meta: dict = field(default_factory=dict)

    def to_dict(self):
        return {
            "parser": self.parser,
            "text": self.text,
            "page_count": self.page_count,
            "latency_ms": round(self.latency_ms, 2),
            "success": self.success,
            "error": self.error,
            "meta": self.meta,
        }
