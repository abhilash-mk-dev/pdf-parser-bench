# Benchmark Results

| Sample | Parser | Status | Chars Extracted | Median Latency (ms) |
|---|---|---|---|---|
| 01_single_column_clean.pdf | pymupdf | OK | 884 | 2.65 |
| 01_single_column_clean.pdf | pdfplumber | OK | 873 | 34.35 |
| 01_single_column_clean.pdf | unstructured_fast | FAIL | 0 | - |
| 01_single_column_clean.pdf | llamaparse | OK | 899 | 4174.7 |
| 01_single_column_clean.pdf | vision_claude | FAIL | 0 | - |
| 02_two_column_sidebar_icons.pdf | pymupdf | OK | 579 | 2.39 |
| 02_two_column_sidebar_icons.pdf | pdfplumber | OK | 823 | 34.23 |
| 02_two_column_sidebar_icons.pdf | unstructured_fast | FAIL | 0 | - |
| 02_two_column_sidebar_icons.pdf | llamaparse | OK | 547 | 3662.1 |
| 02_two_column_sidebar_icons.pdf | vision_claude | FAIL | 0 | - |
| 03_table_heavy_skills_matrix.pdf | pymupdf | OK | 919 | 2.59 |
| 03_table_heavy_skills_matrix.pdf | pdfplumber | OK | 1400 | 50.37 |
| 03_table_heavy_skills_matrix.pdf | unstructured_fast | FAIL | 0 | - |
| 03_table_heavy_skills_matrix.pdf | llamaparse | OK | 1360 | 3527.0 |
| 03_table_heavy_skills_matrix.pdf | vision_claude | FAIL | 0 | - |
| 04_three_column_layout.pdf | pymupdf | OK | 591 | 2.25 |
| 04_three_column_layout.pdf | pdfplumber | OK | 580 | 23.0 |
| 04_three_column_layout.pdf | unstructured_fast | FAIL | 0 | - |
| 04_three_column_layout.pdf | llamaparse | OK | 636 | 3645.4 |
| 04_three_column_layout.pdf | vision_claude | FAIL | 0 | - |
| 05_scanned_no_text_layer.pdf | pymupdf | OK | 0 | 1.0 |
| 05_scanned_no_text_layer.pdf | pdfplumber | OK | 0 | 3.6 |
| 05_scanned_no_text_layer.pdf | unstructured_fast | FAIL | 0 | - |
| 05_scanned_no_text_layer.pdf | llamaparse | **OK** | **498** | 6481.1 |
| 05_scanned_no_text_layer.pdf | vision_claude | FAIL | 0 | - |

**Key finding:** on `05_scanned_no_text_layer.pdf`, LlamaParse extracted 498
characters where both no-LLM parsers (pymupdf, pdfplumber) returned 0. This
is the clearest measured differentiator in the whole benchmark — LlamaParse
is doing OCR/vision-based extraction under the hood, so it isn't dependent
on the PDF having a text layer at all, unlike the entire no-LLM tier.

LlamaParse results were obtained with a live LlamaCloud API key (free tier)
and a real network call per document — note the ~3.5-6.5 second latency,
roughly 3 orders of magnitude slower than PyMuPDF, consistent with an
async, network-bound, LLM-backed parsing job rather than local computation.

`unstructured_fast` and `vision_claude` remain untested/unresolved in this
run. For `unstructured_fast`: the required spaCy model downloaded
successfully (confirmed -- this is not a blocked-network issue), but
`partition_pdf` still returned 0 elements with no exception, for an
unconfirmed reason. The `hi_res` strategy failed separately and more
specifically, with an OCR-backend initialization error (`Could not get
the OCRAgent instance`), suggesting a missing Tesseract install. See the
written report (Section 3.3) for the full writeup, and Section 3.5 for
why `vision_claude` is still untested.
