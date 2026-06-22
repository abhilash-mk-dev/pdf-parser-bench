"""
Category 4: Vision LLMs -- render each PDF page to an image and ask a
multimodal LLM to read it, rather than extracting a text layer at all.

This is the only category that works on scanned/flattened documents with
no embedded text layer at all (see 05_scanned_no_text_layer.pdf in
/samples), because it never depends on PDF text extraction succeeding.

Uses Claude (claude-sonnet-4-6) with vision. Requires ANTHROPIC_API_KEY.
GPT-4o would be a drop-in alternative; the pattern (rasterize page ->
send as image -> ask for transcription) is identical across vision LLM
providers, only the SDK call changes.
"""

import os
import time
import base64
import fitz  # PyMuPDF, used here only for rasterization, not text extraction

from .schemas import ParseResult

ANTHROPIC_API_KEY = os.environ.get("ANTHROPIC_API_KEY")

try:
    import anthropic
    ANTHROPIC_SDK_AVAILABLE = True
except Exception:
    ANTHROPIC_SDK_AVAILABLE = False

VISION_PROMPT = (
    "Transcribe all text visible on this resume page, preserving reading "
    "order and section structure as plain text. If there is a table, "
    "render it as a markdown table. Do not summarize or omit anything -- "
    "transcribe exactly what is written."
)


def _render_page_to_b64_png(page, zoom: float = 2.0) -> str:
    pix = page.get_pixmap(matrix=fitz.Matrix(zoom, zoom))
    png_bytes = pix.tobytes("png")
    return base64.b64encode(png_bytes).decode("utf-8")


def parse_with_vision_llm(file_path: str, model: str = "claude-sonnet-4-6") -> ParseResult:
    start = time.perf_counter()

    if not ANTHROPIC_SDK_AVAILABLE:
        latency_ms = (time.perf_counter() - start) * 1000
        return ParseResult(
            parser="vision_llm", text="", page_count=0, latency_ms=latency_ms,
            success=False, error="anthropic package not installed",
            meta={"category": "vision-llm", "model": model},
        )

    if not ANTHROPIC_API_KEY:
        latency_ms = (time.perf_counter() - start) * 1000
        return ParseResult(
            parser="vision_llm", text="", page_count=0, latency_ms=latency_ms,
            success=False,
            error="No ANTHROPIC_API_KEY set. Skipped -- documented in report instead.",
            meta={
                "category": "vision-llm", "model": model,
                "would_test": (
                    "No API key available in this environment. Would have tested: "
                    "(1) transcription accuracy on the scanned no-text-layer resume "
                    "(the one case the other 3 categories cannot handle at all), "
                    "(2) per-page cost at production volume (input image tokens + "
                    "output tokens, multiplied across a 1,000-resume batch), "
                    "(3) latency per page, since each page is a separate model call, "
                    "(4) whether icon glyphs in the sidebar resume get described or "
                    "silently dropped."
                ),
            },
        )

    try:
        client = anthropic.Anthropic(api_key=ANTHROPIC_API_KEY)
        doc = fitz.open(file_path)
        page_count = doc.page_count
        text_parts = []
        total_cost_estimate = 0.0

        for page_index in range(page_count):
            page = doc[page_index]
            b64_image = _render_page_to_b64_png(page)

            response = client.messages.create(
                model=model,
                max_tokens=2000,
                messages=[{
                    "role": "user",
                    "content": [
                        {"type": "image", "source": {
                            "type": "base64", "media_type": "image/png",
                            "data": b64_image,
                        }},
                        {"type": "text", "text": VISION_PROMPT},
                    ],
                }],
            )
            page_text = "".join(
                block.text for block in response.content if block.type == "text"
            )
            text_parts.append(page_text)

            # Rough cost estimate using published per-token pricing; treat as
            # an estimate to be reconciled with the actual invoice/usage page.
            usage = response.usage
            total_cost_estimate += (
                usage.input_tokens * 3 / 1_000_000
                + usage.output_tokens * 15 / 1_000_000
            )

        doc.close()
        text = "\n\n--- Page Break ---\n\n".join(text_parts)
        latency_ms = (time.perf_counter() - start) * 1000
        return ParseResult(
            parser="vision_llm",
            text=text,
            page_count=page_count,
            latency_ms=latency_ms,
            meta={
                "category": "vision-llm",
                "model": model,
                "cost_estimate_usd_total": round(total_cost_estimate, 5),
                "cost_estimate_usd_per_page": round(total_cost_estimate / max(page_count, 1), 5),
            },
        )
    except Exception as e:
        latency_ms = (time.perf_counter() - start) * 1000
        return ParseResult(
            parser="vision_llm", text="", page_count=0, latency_ms=latency_ms,
            success=False, error=str(e), meta={"category": "vision-llm", "model": model},
        )
