"""
Category 3: LLM-based parsers -- use an LLM under the hood to do
intelligent extraction (reflow multi-column text, reconstruct tables as
markdown, describe figures), rather than pure layout heuristics.

LlamaParse (LlamaCloud) is the most commonly used hosted option. It is
paid beyond a small free tier and requires a LLAMA_CLOUD_API_KEY.

This wrapper is fully functional once a key is supplied via the
LLAMA_CLOUD_API_KEY environment variable. Without a key, it returns a
clearly-labeled `success=False` result rather than crashing the POC, so
the rest of the service still runs end-to-end -- per the assignment's
note: "If a tool requires a paid API key you don't have, document what
you would have tested and why."

What we WOULD have tested with a key (see report for full writeup):
  - Whether LlamaParse correctly reflows the two-column sidebar resume
    into a single reading order (vs. the column-interleaving failure we
    saw in PyMuPDF).
  - Markdown table fidelity on the skills-matrix sample vs. pdfplumber's
    raw row/col dump.
  - Cost per page at LlamaParse's published per-page pricing tier, scaled
    to a 1,000-resume/month batch.
  - Latency, since LlamaParse is an async job-queue API (submit -> poll),
    not a synchronous call -- which itself is an integration cost to
    document (you can't just call-and-get-text-back like PyMuPDF).
"""

import os
import time
from .schemas import ParseResult

LLAMA_CLOUD_API_KEY = os.environ.get("LLAMA_CLOUD_API_KEY")

try:
    from llama_parse import LlamaParse
    LLAMAPARSE_IMPORTABLE = True
except Exception:
    LLAMAPARSE_IMPORTABLE = False


def parse_with_llamaparse(file_path: str) -> ParseResult:
    start = time.perf_counter()

    if not LLAMAPARSE_IMPORTABLE:
        latency_ms = (time.perf_counter() - start) * 1000
        return ParseResult(
            parser="llamaparse", text="", page_count=0, latency_ms=latency_ms,
            success=False,
            error="llama_parse package not installed (pip install llama-parse)",
            meta={"category": "llm-based", "would_test": _would_test_note()},
        )

    if not LLAMA_CLOUD_API_KEY:
        latency_ms = (time.perf_counter() - start) * 1000
        return ParseResult(
            parser="llamaparse", text="", page_count=0, latency_ms=latency_ms,
            success=False,
            error="No LLAMA_CLOUD_API_KEY set. Skipped -- documented in report instead.",
            meta={"category": "llm-based", "would_test": _would_test_note()},
        )

    try:
        parser = LlamaParse(api_key=LLAMA_CLOUD_API_KEY, result_type="markdown")
        documents = parser.load_data(file_path)
        text = "\n\n".join(d.text for d in documents)
        latency_ms = (time.perf_counter() - start) * 1000
        return ParseResult(
            parser="llamaparse",
            text=text,
            page_count=len(documents),
            latency_ms=latency_ms,
            meta={
                "category": "llm-based",
                # LlamaParse published pricing at time of writing is per-page
                # credit based; treat as a placeholder to be confirmed against
                # current pricing before quoting in a real cost model.
                "cost_per_page_usd_estimate": 0.003,
            },
        )
    except Exception as e:
        latency_ms = (time.perf_counter() - start) * 1000
        return ParseResult(
            parser="llamaparse", text="", page_count=0, latency_ms=latency_ms,
            success=False, error=str(e), meta={"category": "llm-based"},
        )


def _would_test_note() -> str:
    return (
        "No API key available in this environment. Would have tested: "
        "(1) reading-order correctness on the two-column sidebar resume, "
        "(2) markdown table fidelity on the skills-matrix resume, "
        "(3) real per-page cost at production volume, "
        "(4) async job latency (submit+poll) vs. synchronous parsers."
    )
