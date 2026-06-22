"""
Category 2: Layout-aware parsers -- understand document structure
(titles, list items, tables) beyond raw character streams.

Unstructured.io's `partition_pdf` classifies text blocks into semantic
element types (Title, NarrativeText, ListItem, Table, ...) using a
layout-detection model, rather than just dumping characters in reading
order.

IMPORTANT setup finding (see report): partition_pdf hard-imports
`unstructured_inference`, which in turn pulls in torch. Even the "fast"
strategy (no OCR, text-layer only) cannot be imported without that
dependency tree installed. This is a real integration cost worth weighing
against the no-LLM parsers, which have zero such overhead.
"""

import time
from .schemas import ParseResult

try:
    from unstructured.partition.pdf import partition_pdf
    UNSTRUCTURED_AVAILABLE = True
    UNSTRUCTURED_IMPORT_ERROR = None
except Exception as e:  # pragma: no cover - exercised when deps are missing
    UNSTRUCTURED_AVAILABLE = False
    UNSTRUCTURED_IMPORT_ERROR = str(e)


def parse_with_unstructured(file_path: str, strategy: str = "fast") -> ParseResult:
    """
    strategy="fast"  -> text-layer extraction via pdfminer, no OCR/model
                        inference. Cheapest, but degrades on scanned PDFs.
    strategy="hi_res"-> runs a layout-detection model (detectron2-style) to
                        find titles/tables/figures. Much slower, needs the
                        full unstructured_inference + model weights.
    """
    start = time.perf_counter()

    if not UNSTRUCTURED_AVAILABLE:
        latency_ms = (time.perf_counter() - start) * 1000
        return ParseResult(
            parser="unstructured",
            text="",
            page_count=0,
            latency_ms=latency_ms,
            success=False,
            error=f"unstructured/unstructured_inference not importable: "
                  f"{UNSTRUCTURED_IMPORT_ERROR}",
            meta={"category": "layout-aware", "strategy": strategy},
        )

    try:
        elements = partition_pdf(filename=file_path, strategy=strategy)

        if len(elements) == 0:
            # Known failure mode (see report): unstructured's text-type
            # classifier lazily downloads a spaCy model
            # (en_core_web_sm) from GitHub release assets on first use.
            # If that download is blocked (corporate proxy, firewalled
            # sandbox, no internet), unstructured logs a warning and
            # silently returns zero elements -- it does NOT raise an
            # exception. We surface that here instead of pretending the
            # parse succeeded with empty output.
            latency_ms = (time.perf_counter() - start) * 1000
            return ParseResult(
                parser="unstructured", text="", page_count=0,
                latency_ms=latency_ms, success=False,
                error=(
                    "partition_pdf returned 0 elements. Likely cause: the "
                    "spaCy model 'en_core_web_sm' (needed for text-type "
                    "classification) failed to download at runtime, which "
                    "happens silently -- no exception is raised. Check logs "
                    "for 'Failed to download spaCy model'."
                ),
                meta={"category": "layout-aware", "strategy": strategy},
            )

        text_parts = []
        element_type_counts: dict[str, int] = {}
        max_page = 0

        for el in elements:
            el_type = type(el).__name__
            element_type_counts[el_type] = element_type_counts.get(el_type, 0) + 1
            page_num = getattr(el.metadata, "page_number", None) if hasattr(el, "metadata") else None
            if page_num:
                max_page = max(max_page, page_num)

            if el_type == "Table":
                # Unstructured exposes an HTML rendition of detected tables
                # via metadata.text_as_html when available.
                html = getattr(el.metadata, "text_as_html", None)
                text_parts.append(f"[TABLE]\n{html or str(el)}")
            else:
                text_parts.append(str(el))

        text = "\n".join(text_parts)
        latency_ms = (time.perf_counter() - start) * 1000
        return ParseResult(
            parser="unstructured",
            text=text,
            page_count=max_page,
            latency_ms=latency_ms,
            meta={
                "category": "layout-aware",
                "strategy": strategy,
                "cost_per_page_usd": 0.0,
                "element_type_counts": element_type_counts,
                "element_count": len(elements),
            },
        )
    except Exception as e:
        latency_ms = (time.perf_counter() - start) * 1000
        return ParseResult(
            parser="unstructured", text="", page_count=0, latency_ms=latency_ms,
            success=False, error=str(e),
            meta={"category": "layout-aware", "strategy": strategy},
        )
