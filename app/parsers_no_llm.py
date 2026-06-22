"""
Category 1: No-LLM parsers -- rule-based, fast, zero marginal cost.

PyMuPDF (fitz)  -- C-based, very fast, good general-purpose text extraction.
pdfplumber      -- pure Python, slower, but exposes word/line bounding boxes
                   and has a dedicated table-extraction API, so it's the
                   better baseline when tables matter.
"""

import time
import fitz  # PyMuPDF
import pdfplumber

from .schemas import ParseResult


def parse_with_pymupdf(file_path: str) -> ParseResult:
    start = time.perf_counter()
    try:
        doc = fitz.open(file_path)
        page_count = doc.page_count
        text_parts = []
        for page in doc:
            text_parts.append(page.get_text())
        doc.close()
        text = "\n".join(text_parts)
        latency_ms = (time.perf_counter() - start) * 1000
        return ParseResult(
            parser="pymupdf",
            text=text,
            page_count=page_count,
            latency_ms=latency_ms,
            meta={"category": "no-llm", "cost_per_page_usd": 0.0},
        )
    except Exception as e:
        latency_ms = (time.perf_counter() - start) * 1000
        return ParseResult(
            parser="pymupdf", text="", page_count=0, latency_ms=latency_ms,
            success=False, error=str(e), meta={"category": "no-llm"},
        )


def parse_with_pdfplumber(file_path: str) -> ParseResult:
    start = time.perf_counter()
    try:
        text_parts = []
        table_count = 0
        with pdfplumber.open(file_path) as pdf:
            page_count = len(pdf.pages)
            for page in pdf.pages:
                page_text = page.extract_text() or ""
                text_parts.append(page_text)
                tables = page.extract_tables()
                table_count += len(tables)
                for t_idx, table in enumerate(tables):
                    text_parts.append(f"\n[TABLE {t_idx + 1} on page, "
                                       f"{len(table)} rows x "
                                       f"{len(table[0]) if table else 0} cols]")
                    for row in table:
                        text_parts.append(" | ".join(c or "" for c in row))
        text = "\n".join(text_parts)
        latency_ms = (time.perf_counter() - start) * 1000
        return ParseResult(
            parser="pdfplumber",
            text=text,
            page_count=page_count,
            latency_ms=latency_ms,
            meta={"category": "no-llm", "cost_per_page_usd": 0.0,
                  "tables_detected": table_count},
        )
    except Exception as e:
        latency_ms = (time.perf_counter() - start) * 1000
        return ParseResult(
            parser="pdfplumber", text="", page_count=0, latency_ms=latency_ms,
            success=False, error=str(e), meta={"category": "no-llm"},
        )
