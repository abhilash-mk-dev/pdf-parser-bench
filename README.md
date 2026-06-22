# PDF Parser Benchmark — Resume Domain

Take-home assignment: research and benchmark four categories of PDF parser
(no-LLM, layout-aware, LLM-based, vision-LLM) against resume PDFs, and wire
the findings into a minimal FastAPI service.

**Full written analysis:** [`report/PDF_Parsing_Research_Report.docx`](report/PDF_Parsing_Research_Report.docx)
**Raw benchmark numbers:** [`results/benchmark_results.json`](results/benchmark_results.json) / [`results/benchmark_summary.md`](results/benchmark_summary.md)

## What's here

```
pdf-parser-bench/
  app/
    main.py                  FastAPI app, single POST /parse endpoint
    schemas.py                Shared ParseResult dataclass
    parsers_no_llm.py          PyMuPDF + pdfplumber
    parsers_layout_aware.py    Unstructured.io
    parsers_llm.py              LlamaParse
    parsers_vision.py           Claude vision
  scripts/
    generate_samples.py        Generates the 5 synthetic sample resumes
    run_benchmark.py            Runs every parser against every sample, saves results/
  samples/                    5 synthetic resume PDFs (no real people)
  results/                    benchmark_results.json, benchmark_summary.md
  report/                     Written report (.docx)
  requirements.txt
```

## Setup

```bash
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
```

Two of the four parser categories need an API key to actually run (rather
than reporting a clearly-labeled "skipped" result — see the report for why):

```bash
export LLAMA_CLOUD_API_KEY="your-key-here"     # for LlamaParse
export ANTHROPIC_API_KEY="your-key-here"       # for the vision-LLM parser
```

Without these set, the corresponding endpoints/benchmark rows still run —
they just return `success: false` with an explanatory error instead of
crashing the service.

**Note on Unstructured.io:** `partition_pdf` transitively requires `torch`
even for the "fast" (non-OCR) strategy, and lazily downloads a spaCy model
from a GitHub release URL on first use. If your network blocks that
download, it will fail with `0 elements extracted` (see report Section 3.3
for the full writeup of this failure mode). It is **not** an error in this
code — it's how the upstream library behaves.

## Run the API

```bash
uvicorn app.main:app --reload --port 8000
```

Interactive docs: http://localhost:8000/docs

### Example request

```bash
curl -X POST http://localhost:8000/parse \
  -F "file=@samples/02_two_column_sidebar_icons.pdf" \
  -F "parser=pymupdf"
```

```json
{
  "parser": "pymupdf",
  "text": "Marcus Olawale\nProduct Designer\n...",
  "page_count": 1,
  "latency_ms": 2.4,
  "success": true,
  "error": null,
  "meta": { "category": "no-llm", "cost_per_page_usd": 0.0 }
}
```

### Supported `parser` values

| Value | Library | Category |
|---|---|---|
| `pymupdf` | PyMuPDF | No-LLM |
| `pdfplumber` | pdfplumber | No-LLM |
| `unstructured` | Unstructured.io ("fast" strategy) | Layout-aware |
| `unstructured_hi_res` | Unstructured.io ("hi_res" strategy) | Layout-aware |
| `llamaparse` | LlamaParse | LLM-based |
| `vision` | Claude (claude-sonnet-4-6) with vision | Vision-LLM |

## Regenerate the sample documents

```bash
python3 scripts/generate_samples.py
```

Produces 5 synthetic resumes in `samples/`, each isolating one layout
failure mode (single column, two-column sidebar with icons, table-heavy
skills matrix, three-column layout, scanned/no-text-layer). They're
fabricated, not real people, so they're safe to commit.

## Re-run the benchmark

```bash
python3 scripts/run_benchmark.py
```

Runs every parser against every sample (3 runs each, median latency
reported) and writes `results/benchmark_results.json` and
`results/benchmark_summary.md`.

## Regenerate the written report

The report is built programmatically from the data in `results/` using
[docx-js](https://www.npmjs.com/package/docx), so it can be regenerated
after a fresh benchmark run rather than hand-edited:

```bash
npm install -g docx
cd scripts/report_build
node build_report.js
```

Writes `report/PDF_Parsing_Research_Report.docx`.

## Key findings (see the full report for details)

- **PyMuPDF and pdfplumber fail silently on scanned PDFs** — they return
  `success: true` with an empty string, not an error. This is the most
  important production risk in this whole assignment.
- **PyMuPDF's reading order held up well** on both the two-column sidebar
  and three-column layouts in testing, which was a genuine surprise.
- **pdfplumber's table detector false-positived** on a sidebar resume's
  decorative skill-level bar graphics, reporting 5 tables that were all
  empty — a reminder that table detection works on geometry, not semantics.
- **Unstructured.io was the hardest of the four to get running**, due to
  a heavy transitive dependency on `torch` and a runtime model download
  from a non-PyPI source that fails silently when blocked.
- **LlamaParse and the vision-LLM parser were not independently
  benchmarked** in this environment (no API keys available) — the report
  documents what would have been tested and why, per the assignment's
  guidance on tools requiring a paid key.
