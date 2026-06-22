"""
Runs every available parser against every sample PDF and writes a
machine-readable results file plus a human-readable summary table.

This is the script that produced the actual numbers quoted in the report
-- per the assignment's "show your numbers, don't estimate" instruction.

Run directly (no server needed -- calls the parser functions in-process):
    python3 scripts/run_benchmark.py
"""

import json
import os
import sys
import statistics

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from app.parsers_no_llm import parse_with_pymupdf, parse_with_pdfplumber
from app.parsers_layout_aware import parse_with_unstructured
from app.parsers_llm import parse_with_llamaparse
from app.parsers_vision import parse_with_vision_llm

SAMPLES_DIR = os.path.join(os.path.dirname(__file__), "..", "samples")
RESULTS_DIR = os.path.join(os.path.dirname(__file__), "..", "results")
os.makedirs(RESULTS_DIR, exist_ok=True)

PARSERS = {
    "pymupdf": lambda p: parse_with_pymupdf(p),
    "pdfplumber": lambda p: parse_with_pdfplumber(p),
    "unstructured_fast": lambda p: parse_with_unstructured(p, strategy="fast"),
    "llamaparse": lambda p: parse_with_llamaparse(p),
    "vision_claude": lambda p: parse_with_vision_llm(p),
}

# Run each parser this many times per document and report median latency,
# since single-run wall-clock numbers are noisy (disk cache, GC pauses).
RUNS_PER_DOC = 3


def main():
    sample_files = sorted(
        f for f in os.listdir(SAMPLES_DIR) if f.lower().endswith(".pdf")
    )
    if not sample_files:
        print(f"No PDFs found in {SAMPLES_DIR}")
        return

    all_results = []

    for fname in sample_files:
        fpath = os.path.join(SAMPLES_DIR, fname)
        print(f"\n=== {fname} ===")

        for parser_name, parser_fn in PARSERS.items():
            latencies = []
            last_result = None

            for run_idx in range(RUNS_PER_DOC):
                result = parser_fn(fpath)
                last_result = result
                if result.success:
                    latencies.append(result.latency_ms)
                else:
                    # No point re-running a parser that's failing for a
                    # structural reason (missing API key, blocked download).
                    break

            median_latency = statistics.median(latencies) if latencies else None
            char_count = len(last_result.text) if last_result.success else 0

            row = {
                "sample": fname,
                "parser": parser_name,
                "success": last_result.success,
                "error": last_result.error,
                "page_count": last_result.page_count,
                "char_count": char_count,
                "median_latency_ms": round(median_latency, 2) if median_latency else None,
                "runs_completed": len(latencies),
                "meta": last_result.meta,
            }
            all_results.append(row)

            status = "OK" if last_result.success else "FAIL"
            lat_str = f"{median_latency:.1f}ms" if median_latency else "n/a"
            print(f"  [{status:4s}] {parser_name:20s} chars={char_count:6d}  latency={lat_str:>10s}"
                  + (f"  error={last_result.error[:70]}" if not last_result.success else ""))

    # Save full machine-readable results
    out_json = os.path.join(RESULTS_DIR, "benchmark_results.json")
    with open(out_json, "w") as f:
        json.dump(all_results, f, indent=2)
    print(f"\nSaved full results to {out_json}")

    # Save a simple markdown summary table
    out_md = os.path.join(RESULTS_DIR, "benchmark_summary.md")
    with open(out_md, "w") as f:
        f.write("# Benchmark Results\n\n")
        f.write("| Sample | Parser | Status | Chars Extracted | Median Latency (ms) |\n")
        f.write("|---|---|---|---|---|\n")
        for row in all_results:
            status = "OK" if row["success"] else "FAIL"
            lat = row["median_latency_ms"] if row["median_latency_ms"] else "-"
            f.write(f"| {row['sample']} | {row['parser']} | {status} | "
                    f"{row['char_count']} | {lat} |\n")
    print(f"Saved summary table to {out_md}")


if __name__ == "__main__":
    main()
