const {
  Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell,
  Header, Footer, AlignmentType, LevelFormat, HeadingLevel, BorderStyle,
  WidthType, ShadingType, VerticalAlign, PageNumber, PageBreak, TableOfContents,
} = require("docx");
const fs = require("fs");

// ---------------------------------------------------------------------
// Shared style helpers
// ---------------------------------------------------------------------
const border = { style: BorderStyle.SINGLE, size: 1, color: "CCCCCC" };
const borders = { top: border, bottom: border, left: border, right: border };
const cellMargins = { top: 80, bottom: 80, left: 120, right: 120 };

function h1(text) {
  return new Paragraph({ heading: HeadingLevel.HEADING_1, children: [new TextRun(text)] });
}
function h2(text) {
  return new Paragraph({ heading: HeadingLevel.HEADING_2, children: [new TextRun(text)] });
}
function h3(text) {
  return new Paragraph({ heading: HeadingLevel.HEADING_3, children: [new TextRun(text)] });
}
function p(text, opts = {}) {
  return new Paragraph({
    spacing: { after: 160 },
    children: [new TextRun({ text, ...opts })],
  });
}
function pRich(runs, opts = {}) {
  return new Paragraph({ spacing: { after: 160 }, ...opts, children: runs });
}
function bullet(text, opts = {}) {
  return new Paragraph({
    numbering: { reference: "bullets", level: 0 },
    spacing: { after: 80 },
    children: [new TextRun({ text, ...opts })],
  });
}
function codeBlock(lines) {
  return lines.map((line, i) => new Paragraph({
    spacing: { after: i === lines.length - 1 ? 160 : 0 },
    shading: { fill: "F3F4F6", type: ShadingType.CLEAR },
    children: [new TextRun({ text: line || " ", font: "Courier New", size: 19 })],
  }));
}
function headerCell(text, width) {
  return new TableCell({
    borders,
    width: { size: width, type: WidthType.DXA },
    shading: { fill: "1F2937", type: ShadingType.CLEAR },
    margins: cellMargins,
    verticalAlign: VerticalAlign.CENTER,
    children: [new Paragraph({ children: [new TextRun({ text, bold: true, color: "FFFFFF", size: 20 })] })],
  });
}
function bodyCell(text, width, opts = {}) {
  return new TableCell({
    borders,
    width: { size: width, type: WidthType.DXA },
    margins: cellMargins,
    verticalAlign: VerticalAlign.CENTER,
    shading: opts.fill ? { fill: opts.fill, type: ShadingType.CLEAR } : undefined,
    children: [new Paragraph({ children: [new TextRun({ text, size: 20, bold: !!opts.bold, color: opts.color })] })],
  });
}

// ---------------------------------------------------------------------
// Table 1: Parser comparison overview
// ---------------------------------------------------------------------
const overviewWidths = [1500, 1700, 1500, 1500, 1500, 2160];
const overviewTable = new Table({
  width: { size: 9860, type: WidthType.DXA },
  columnWidths: overviewWidths,
  rows: [
    new TableRow({
      children: [
        headerCell("Parser", overviewWidths[0]),
        headerCell("Category", overviewWidths[1]),
        headerCell("Setup effort", overviewWidths[2]),
        headerCell("Median latency*", overviewWidths[3]),
        headerCell("Cost/page", overviewWidths[4]),
        headerCell("Best for", overviewWidths[5]),
      ],
    }),
    new TableRow({ children: [
      bodyCell("PyMuPDF", overviewWidths[0], { bold: true }),
      bodyCell("No-LLM", overviewWidths[1]),
      bodyCell("Trivial", overviewWidths[2]),
      bodyCell("~2.5 ms", overviewWidths[3]),
      bodyCell("$0", overviewWidths[4]),
      bodyCell("Clean, born-digital PDFs", overviewWidths[5]),
    ]}),
    new TableRow({ children: [
      bodyCell("pdfplumber", overviewWidths[0], { bold: true }),
      bodyCell("No-LLM", overviewWidths[1]),
      bodyCell("Trivial", overviewWidths[2]),
      bodyCell("~25-50 ms", overviewWidths[3]),
      bodyCell("$0", overviewWidths[4]),
      bodyCell("Documents with real tables", overviewWidths[5]),
    ]}),
    new TableRow({ children: [
      bodyCell("Unstructured.io", overviewWidths[0], { bold: true }),
      bodyCell("Layout-aware", overviewWidths[1]),
      bodyCell("High", overviewWidths[2], { color: "B91C1C" }),
      bodyCell("Failed*", overviewWidths[3], { color: "B91C1C" }),
      bodyCell("$0 (local)", overviewWidths[4]),
      bodyCell("Mixed doc types at scale, once deployed somewhere with open egress", overviewWidths[5]),
    ]}),
    new TableRow({ children: [
      bodyCell("LlamaParse", overviewWidths[0], { bold: true }),
      bodyCell("LLM-based", overviewWidths[1]),
      bodyCell("Low (API)", overviewWidths[2]),
      bodyCell("Not tested**", overviewWidths[3]),
      bodyCell("~$0.003 est.", overviewWidths[4]),
      bodyCell("Messy multi-column or table-heavy docs", overviewWidths[5]),
    ]}),
    new TableRow({ children: [
      bodyCell("Vision LLM (Claude)", overviewWidths[0], { bold: true }),
      bodyCell("Vision LLM", overviewWidths[1]),
      bodyCell("Low (API)", overviewWidths[2]),
      bodyCell("Not tested**", overviewWidths[3]),
      bodyCell("Higher, ~$0.01-0.03 est.", overviewWidths[4]),
      bodyCell("Scanned docs with no text layer", overviewWidths[5]),
    ]}),
  ],
});

// ---------------------------------------------------------------------
// Table 2: Per-sample results (the real numbers)
// ---------------------------------------------------------------------
function resultsRow(sample, pymupdf, pdfplumber, unstructured) {
  const w = [2900, 2300, 2300, 2360];
  return new TableRow({ children: [
    bodyCell(sample, w[0]),
    bodyCell(pymupdf, w[1]),
    bodyCell(pdfplumber, w[2]),
    bodyCell(unstructured, w[3], unstructured.startsWith("FAIL") ? { color: "B91C1C" } : {}),
  ]});
}
const resultsWidths = [2900, 2300, 2300, 2360];
const resultsTable = new Table({
  width: { size: 9860, type: WidthType.DXA },
  columnWidths: resultsWidths,
  rows: [
    new TableRow({ children: [
      headerCell("Sample document", resultsWidths[0]),
      headerCell("PyMuPDF", resultsWidths[1]),
      headerCell("pdfplumber", resultsWidths[2]),
      headerCell("Unstructured (fast)", resultsWidths[3]),
    ]}),
    resultsRow("01 - Single column, clean", "884 chars, 2.7ms", "873 chars, 34ms", "FAIL (0 elements)"),
    resultsRow("02 - Two-column sidebar + icons", "579 chars, 2.4ms", "823 chars, 34ms", "FAIL (0 elements)"),
    resultsRow("03 - Table-heavy skills matrix", "919 chars, 2.6ms", "1400 chars, 50ms*", "FAIL (0 elements)"),
    resultsRow("04 - Three-column layout", "591 chars, 2.3ms", "580 chars, 23ms", "FAIL (0 elements)"),
    resultsRow("05 - Scanned, no text layer", "0 chars, 1.5ms**", "0 chars, 2.5ms**", "FAIL (0 elements)"),
  ],
});

// ---------------------------------------------------------------------
// Document assembly
// ---------------------------------------------------------------------
const doc = new Document({
  styles: {
    default: { document: { run: { font: "Arial", size: 22 } } },
    paragraphStyles: [
      { id: "Heading1", name: "Heading 1", basedOn: "Normal", next: "Normal", quickFormat: true,
        run: { size: 32, bold: true, font: "Arial", color: "111827" },
        paragraph: { spacing: { before: 360, after: 200 }, outlineLevel: 0 } },
      { id: "Heading2", name: "Heading 2", basedOn: "Normal", next: "Normal", quickFormat: true,
        run: { size: 26, bold: true, font: "Arial", color: "1F2937" },
        paragraph: { spacing: { before: 280, after: 160 }, outlineLevel: 1 } },
      { id: "Heading3", name: "Heading 3", basedOn: "Normal", next: "Normal", quickFormat: true,
        run: { size: 23, bold: true, font: "Arial", color: "374151" },
        paragraph: { spacing: { before: 200, after: 120 }, outlineLevel: 2 } },
    ],
  },
  numbering: {
    config: [
      { reference: "bullets", levels: [{ level: 0, format: LevelFormat.BULLET, text: "•", alignment: AlignmentType.LEFT,
        style: { paragraph: { indent: { left: 720, hanging: 360 } } } } ] },
    ],
  },
  sections: [{
    properties: {
      page: {
        size: { width: 12240, height: 15840 },
        margin: { top: 1440, right: 1440, bottom: 1440, left: 1440 },
      },
    },
    headers: {
      default: new Header({ children: [new Paragraph({
        alignment: AlignmentType.RIGHT,
        children: [new TextRun({ text: "PDF Parsing Research -- Resume Domain", size: 16, color: "9CA3AF" })],
      })] }),
    },
    footers: {
      default: new Footer({ children: [new Paragraph({
        alignment: AlignmentType.CENTER,
        children: [new TextRun({ text: "Page ", size: 16, color: "9CA3AF" }), new TextRun({ children: [PageNumber.CURRENT], size: 16, color: "9CA3AF" })],
      })] }),
    },
    children: [
      // ---------------- Title page ----------------
      new Paragraph({ spacing: { after: 80 }, children: [new TextRun({ text: "PDF Parsing Research", bold: true, size: 48 })] }),
      new Paragraph({ spacing: { after: 40 }, children: [new TextRun({ text: "Benchmarking No-LLM, Layout-Aware, LLM-Based, and Vision-LLM Parsers on Resume PDFs", size: 26, color: "4B5563" })] }),
      new Paragraph({ spacing: { after: 360 }, children: [new TextRun({ text: "Take-home assignment -- Abilash", size: 20, color: "6B7280" })] }),

      new Paragraph({ spacing: { after: 80 }, children: [new TextRun({ text: "Table of Contents", bold: true, size: 26 })] }),
      new Paragraph({ spacing: { after: 60 }, children: [new TextRun({ text: "1. TL;DR", size: 20 })] }),
      new Paragraph({ spacing: { after: 60 }, children: [new TextRun({ text: "2. Methodology", size: 20 })] }),
      new Paragraph({ spacing: { after: 60 }, children: [new TextRun({ text: "3. Parser-by-parser findings", size: 20 })] }),
      new Paragraph({ spacing: { after: 60 }, children: [new TextRun({ text: "4. Cross-parser comparison", size: 20 })] }),
      new Paragraph({ spacing: { after: 60 }, children: [new TextRun({ text: "5. When to use what", size: 20 })] }),
      new Paragraph({ spacing: { after: 360 }, children: [new TextRun({ text: "6. Personal observations and surprises", size: 20 })] }),
      new Paragraph({ children: [new PageBreak()] }),

      // ---------------- 1. Intro / TL;DR ----------------
      h1("1. TL;DR"),
      p("Resumes look like plain text but behave like adversarial test cases for PDF parsers: multi-column sidebars, icon glyphs, decorative skill bars, real tables, and scans with no text layer at all. I benchmarked four categories of parser -- PyMuPDF and pdfplumber (no-LLM), Unstructured.io (layout-aware), LlamaParse (LLM-based), and Claude with vision (vision-LLM) -- against five synthetic resumes that each isolate one of those failure modes."),
      pRich([
        new TextRun({ text: "The single most important finding: ", bold: true }),
        new TextRun({ text: "PyMuPDF and pdfplumber don't error out on a scanned, text-layer-free PDF -- they return " }),
        new TextRun({ text: "success = true", font: "Courier New" }),
        new TextRun({ text: " with an empty string. Nothing crashes. Nothing warns you. If you don't separately check character count against page count, this silently nukes every resume that came from a scan, and you'll find out only when someone notices the model has nothing to extract skills from." }),
      ]),
      p("A close second finding: Unstructured.io, the layout-aware option, was the hardest of the four to get running at all -- not because of the resumes, but because of how the library is packaged (see Section 3)."),

      // ---------------- 2. Methodology ----------------
      h1("2. Methodology"),
      h2("2.1 Domain and samples"),
      p("Domain: resumes. I generated 5 synthetic resume PDFs (no real people, safe to commit) that each isolate one layout pattern called out in the assignment brief:"),
      bullet("01_single_column_clean.pdf -- the easy-mode baseline: single column, no tables, no graphics."),
      bullet("02_two_column_sidebar_icons.pdf -- a Canva-style sidebar layout with circular icon glyphs next to contact info and a decorative skill-level bar grid."),
      bullet("03_table_heavy_skills_matrix.pdf -- skills and work history rendered as real PDF table objects (not just visually aligned text)."),
      bullet("04_three_column_layout.pdf -- a newspaper-style 3-column resume, the classic reading-order stress test."),
      bullet("05_scanned_no_text_layer.pdf -- the same content as the others, but flattened to a raster image and re-embedded in a PDF with zero extractable text, simulating a phone-scanned resume."),
      p("Generation code is in scripts/generate_samples.py. Using synthetic documents (rather than scraping real resumes) keeps the repo free of personal data, while still reproducing the specific layout mechanics that break parsers."),

      h2("2.2 What I measured"),
      bullet("Setup/integration effort -- did the library import and run with a plain pip install, or did it need extra system packages, model downloads, or API keys?"),
      bullet("Latency -- wall-clock time per parse call, median of 3 runs, measured in-process (no network round-trip) for the local parsers."),
      bullet("Output quality -- character count as a rough completeness proxy, plus manual inspection of reading order and table structure."),
      bullet("Failure behavior -- does it raise an exception, return an error field, or fail silently?"),
      p("All numbers below are measured, not estimated, except where explicitly marked as an estimate (LlamaParse and vision-LLM cost projections, since I didn't have API keys -- see Section 3.3 and 3.4)."),

      new Paragraph({ children: [new PageBreak()] }),

      // ---------------- 3. Parser-by-parser findings ----------------
      h1("3. Parser-by-parser findings"),

      h2("3.1 PyMuPDF (No-LLM)"),
      pRich([new TextRun({ text: "Setup: ", bold: true }), new TextRun({ text: "pip install pymupdf. One package, no system dependencies, no model downloads. This was the easiest of all four categories to integrate." })]),
      pRich([new TextRun({ text: "Accuracy: ", bold: true }), new TextRun({ text: "Surprisingly strong on reading order. I expected the three-column layout to scramble badly, but PyMuPDF's block-based text extraction reconstructed all three columns top-to-bottom, left-to-right, correctly. The two-column sidebar resume also came out in the right order (sidebar block, then main column block). It does not preserve table structure -- a real PDF table just becomes whitespace-separated text." })]),
      pRich([new TextRun({ text: "Speed: ", bold: true }), new TextRun({ text: "~2-3 ms per page across all samples. Far and away the fastest option tested." })]),
      pRich([new TextRun({ text: "Where it breaks: ", bold: true }), new TextRun({ text: "On the scanned resume (no text layer), it returns an empty string with " }), new TextRun({ text: "success = true", font: "Courier New" }), new TextRun({ text: " and no error. This is not a crash -- it's worse, because it looks like success. Icon glyphs in the sidebar resume (the circular @ / phone / pin icons) were dropped silently; only the fallback text label I'd put inside them survived." })]),
      pRich([new TextRun({ text: "Production recommendation: ", bold: true }), new TextRun({ text: "Default choice for born-digital PDFs where you don't expect tables to matter. Pair it with a page-level heuristic (e.g., flag any page where extracted character count is near zero) so the silent-empty failure mode doesn't pass downstream unnoticed." })]),

      h2("3.2 pdfplumber (No-LLM)"),
      pRich([new TextRun({ text: "Setup: ", bold: true }), new TextRun({ text: "pip install pdfplumber. Equally trivial -- pure Python, no compiled extensions beyond what it pulls in automatically." })]),
      pRich([new TextRun({ text: "Accuracy: ", bold: true }), new TextRun({ text: "Text extraction quality was comparable to PyMuPDF (873 vs 884 characters on the clean sample -- the difference is just whitespace normalization). The real value-add is " }), new TextRun({ text: "extract_tables()", font: "Courier New" }), new TextRun({ text: ", which correctly recovered both tables in the skills-matrix resume as proper row/column grids -- something PyMuPDF cannot do at all." })]),
      pRich([new TextRun({ text: "Speed: ", bold: true }), new TextRun({ text: "23-50 ms per page, roughly 10-20x slower than PyMuPDF. The table-detection pass (line and rect geometry analysis) is the likely cost driver -- the table-heavy sample took the longest of the four (50ms) even though it's one page." })]),
      pRich([new TextRun({ text: "Where it breaks: ", bold: true }), new TextRun({ text: "Two distinct failure modes, both worth flagging. First, the same silent-empty-string behavior as PyMuPDF on the scanned resume. Second, and more interesting: on the icon/sidebar resume, " }), new TextRun({ text: "extract_tables()", font: "Courier New" }), new TextRun({ text: " reported 5 separate tables -- all false positives. I drew small rectangles to represent skill-proficiency bars (e.g., 4 of 5 filled boxes next to \"Figma\"), and pdfplumber's line-intersection table detector matched that rectangle grid as table structure, even though every cell was empty text. This is a structural risk: any resume template using decorative boxes, dividers, or progress-bar-style skill indicators can pollute your table output with garbage." })]),
      pRich([new TextRun({ text: "Production recommendation: ", bold: true }), new TextRun({ text: "Use when tables genuinely matter (e.g., skills matrices, education tables) and you can afford the latency. Don't trust " }), new TextRun({ text: "extract_tables()", font: "Courier New" }), new TextRun({ text: " output blindly -- filter out detected tables where most cells are empty strings before passing them downstream." })]),

      h2("3.3 Unstructured.io (Layout-aware)"),
      pRich([new TextRun({ text: "Setup: ", bold: true }), new TextRun({ text: "This was the hardest integration of the four, and the difficulty had nothing to do with the resumes themselves -- it was packaging. " }), new TextRun({ text: "partition_pdf()", font: "Courier New" }), new TextRun({ text: " hard-imports " }), new TextRun({ text: "unstructured_inference", font: "Courier New" }), new TextRun({ text: ", which pulls in torch as a transitive dependency, even for the \"fast\" (non-OCR, text-layer-only) strategy. That's roughly 600MB+ of install just to extract text from a PDF." })]),
      pRich([new TextRun({ text: "More importantly: ", bold: true }), new TextRun({ text: "even after installing everything, the \"fast\" strategy's text-type classifier (the component that decides whether a text block is a Title, NarrativeText, or ListItem) lazily downloads a spaCy model (en_core_web_sm) from a hardcoded, SHA-pinned GitHub release URL on first use -- not from PyPI. In a network environment that blocks that specific download (which describes a lot of corporate proxies, and described my own sandbox), the library logs a warning (\"Failed to download spaCy model\") and " }), new TextRun({ text: "returns zero elements without raising an exception", italics: true }), new TextRun({ text: ". I only caught this by enabling debug logging; at the API-response level it looks identical to feeding it a blank PDF." })]),
      pRich([new TextRun({ text: "The hi_res strategy", bold: true }), new TextRun({ text: " (full layout-detection model) failed differently: it tries to pull model weights from Hugging Face Hub at runtime and raises a clear " }), new TextRun({ text: "LocalEntryNotFoundError", font: "Courier New" }), new TextRun({ text: " when that's blocked -- which, while still a runtime network dependency, is at least an honest failure rather than a silent one." })]),
      pRich([new TextRun({ text: "Accuracy / speed: ", bold: true }), new TextRun({ text: "I cannot honestly report these numbers. Every run in this sandbox returned 0 elements for the reason above. I do not want to fabricate latency or accuracy figures for a path I never got working end-to-end -- see Section 6 for what I'd test with open network access." })]),
      pRich([new TextRun({ text: "Production recommendation: ", bold: true }), new TextRun({ text: "Don't dismiss it based on this -- the failure here is specific to my sandboxed, network-restricted environment, not a fundamental flaw in the tool. In a normal cloud VM or CI runner with open egress to GitHub and Hugging Face, both strategies would very likely work as documented, and the layout classification (genuine Title/Table/ListItem typing rather than reading-order text dumps) is a real capability the no-LLM tier doesn't have. The finding to take away is operational, not architectural: budget time for first-run model/asset downloads, pin or vendor those assets if you're deploying into a locked-down network, and don't assume \"fast strategy\" means \"no network dependency.\"" })]),

      h2("3.4 LlamaParse (LLM-based)"),
      pRich([new TextRun({ text: "Setup: ", bold: true }), new TextRun({ text: "pip install llama-parse installed cleanly with no system dependencies -- much lighter than Unstructured's footprint. It requires a LLAMA_CLOUD_API_KEY, which I did not have for this assignment, so I could not run it against the samples." })]),
      pRich([new TextRun({ text: "What I would have tested with a key: ", bold: true })]),
      bullet("Reading-order correctness on the two-column sidebar resume, specifically whether it reflows sidebar-then-main-column or interleaves the two -- this is the scenario LLM-based parsers are marketed as solving better than rule-based ones."),
      bullet("Markdown table fidelity on the skills-matrix resume, compared directly against pdfplumber's raw row/column dump."),
      bullet("Real cost at volume: LlamaParse bills per page/credit; I'd want the actual invoiced cost for a 1,000-resume batch, not the published list price, since OCR-mode and table-mode pricing tiers differ."),
      bullet("Latency characteristics specific to its API shape: LlamaParse is a submit-and-poll job queue, not a single synchronous call like PyMuPDF. That's a meaningfully different integration pattern (you need retry/polling logic, not just a function call) and is itself a cost worth documenting even before looking at output quality."),
      pRich([new TextRun({ text: "Production recommendation (provisional): ", bold: true }), new TextRun({ text: "Worth piloting specifically for the document types that defeat rule-based parsers -- heavily templated, multi-column, icon-dense layouts -- but only after validating real per-page cost and the async latency profile against your actual throughput needs. I would not recommend adopting it on marketing claims alone; the comparison in Section 3.3 above shows how much a layout-aware tool's real-world behavior can diverge from its on-paper category." })]),

      h2("3.5 Vision LLM -- Claude with vision (Vision-LLM)"),
      pRich([new TextRun({ text: "Setup: ", bold: true }), new TextRun({ text: "pip install anthropic, then render each page to a PNG (I used PyMuPDF purely for rasterization, not text extraction) and send it as an image content block with a transcription prompt. This is the simplest API integration of the four once you have a key -- a single synchronous call per page, no job polling, no model downloads. I did not have an ANTHROPIC_API_KEY in this sandbox, so no live numbers." })]),
      pRich([new TextRun({ text: "What I would have tested with a key: ", bold: true })]),
      bullet("Transcription accuracy on the scanned resume specifically -- this is the one sample the other three categories cannot handle at all (all return empty text), so it's the clearest head-to-head test of vision LLMs' core value proposition."),
      bullet("Whether icon glyphs (the @ / phone / pin circles in the sidebar resume) get described in some useful way or silently ignored, since a vision model is looking at the rendered page, not the text layer."),
      bullet("Per-page cost at volume: each page is a separate image input plus a text completion, so cost scales with both image resolution and page count in a way the other categories' costs don't."),
      bullet("Latency per page, since (unlike PyMuPDF/pdfplumber) every page requires a network round-trip and model inference, not a local computation."),
      pRich([new TextRun({ text: "Production recommendation (provisional): ", bold: true }), new TextRun({ text: "This is the only category in this report that can handle a fully scanned document with no text layer, which makes it not really a competitor to the other three so much as a fallback tier -- route to vision only when a cheap text-layer check (e.g., near-zero PyMuPDF character count) confirms there's nothing to extract. Running every document through a vision model by default would be paying per-page LLM costs for documents that PyMuPDF could have handled for free in 2 milliseconds." })]),

      new Paragraph({ children: [new PageBreak()] }),

      // ---------------- 4. Comparison ----------------
      h1("4. Cross-parser comparison"),
      h2("4.1 Overview"),
      overviewTable,
      p("* PyMuPDF/pdfplumber latency is measured wall-clock, median of 3 in-process runs. ** Not independently verified against live API calls in this environment; see Section 3.3-3.4 for what blocked each.", { size: 18, italics: true, color: "6B7280" }),

      new Paragraph({ spacing: { before: 280 } }),
      h2("4.2 Measured results by sample"),
      resultsTable,
      p("* Elevated latency on the table-heavy sample reflects pdfplumber's table-detection pass, not raw text extraction. ** Both parsers report success = true with 0 extracted characters on the scanned PDF -- this is the silent-failure mode discussed in Section 3.1-3.2, not a crash.", { size: 18, italics: true, color: "6B7280" }),

      new Paragraph({ children: [new PageBreak()] }),

      // ---------------- 5. When to use what ----------------
      h1("5. When to use what"),
      pRich([new TextRun({ text: "Start with PyMuPDF as the default.", bold: true }), new TextRun({ text: " It's free, it's fast, and -- at least on the layouts I tested, including a 3-column resume -- its reading order held up better than I expected. Use it as the first pass on every document." })]),
      pRich([new TextRun({ text: "Add a text-layer sanity check immediately after.", bold: true }), new TextRun({ text: " If extracted character count is near zero relative to page count, you almost certainly have a scanned document, not a malformed one. Don't pass that empty string further down the pipeline as if it were a legitimately short resume." })]),
      pRich([new TextRun({ text: "Route flagged scanned documents to a vision LLM.", bold: true }), new TextRun({ text: " This is the only tier in this report that can read a page with no text layer at all. Don't run everything through it by default -- it's the most expensive option per page by a wide margin and unnecessary for the (likely majority) of born-digital resumes." })]),
      pRich([new TextRun({ text: "Reach for pdfplumber specifically when tables matter,", bold: true }), new TextRun({ text: " e.g. a skills matrix or an education table -- but sanity-check its output, since decorative rectangles (skill-bars, dividers) can get misdetected as tables with no real content." })]),
      pRich([new TextRun({ text: "Treat LlamaParse and Unstructured.io as a research line, not a default,", bold: true }), new TextRun({ text: " until validated against your specific document mix. Both promise better handling of complex layouts than rule-based parsers, but I could not independently confirm that promise in this assignment -- Unstructured because of environment-specific download blocks (see 3.3), LlamaParse because of API access. The honest position, given the evidence I actually collected, is: plausible, unconfirmed, worth a follow-up pilot with a short list of real failure cases from PyMuPDF/pdfplumber as the test set." })]),

      new Paragraph({ children: [new PageBreak()] }),

      // ---------------- 6. Observations and surprises ----------------
      h1("6. Personal observations and surprises"),
      bullet("The biggest surprise was how good PyMuPDF's reading order was on the 3-column layout. I expected it to interleave columns badly, the way naive PDF text extraction often does -- it didn't, on any of my samples. I'd want to test it against a real, more irregular Canva export before trusting this generalizes, since my synthetic samples use fairly regular column geometry."),
      bullet("The most production-relevant finding wasn't a quality difference between parsers -- it was that two different libraries (PyMuPDF/pdfplumber on scans, Unstructured on a blocked download) both fail by returning something that looks like a normal, if short, successful result, rather than raising an error. A pipeline that doesn't explicitly check for this will degrade silently, exactly as the assignment brief warned."),
      bullet("I didn't expect pdfplumber's table detector to false-positive on decorative graphics. It's a useful reminder that 'layout-aware' and 'table-aware' tools are reasoning over geometry (lines, rectangles, whitespace), not semantics -- they don't know the difference between a data table and a row of progress bars unless you tell them."),
      bullet("Not having API keys for LlamaParse and the vision LLM was a real constraint, and I want to be upfront that Sections 3.4 and 3.5's recommendations are provisional, not measured. I'd rather flag that clearly than present estimated numbers as if they were benchmarked ones."),
      bullet("Unstructured.io's dependency footprint (transitively requiring torch even for non-OCR text extraction) and its runtime model download from a non-PyPI source were both bigger integration costs than I expected going in, relative to how the tool is usually described (\"layout-aware parsing\"). That packaging friction is itself a data point worth weighing against the no-LLM tier, independent of any output-quality comparison."),

      new Paragraph({ spacing: { before: 280 } }),
      h2("Repository structure"),
      ...codeBlock([
        "pdf-parser-bench/",
        "  app/          FastAPI service + parser wrappers",
        "  scripts/      sample generator + benchmark runner",
        "  samples/      5 synthetic resume PDFs",
        "  results/      benchmark_results.json, benchmark_summary.md",
        "  report/       this document",
        "  requirements.txt",
        "  README.md",
      ]),
    ],
  }],
});

Packer.toBuffer(doc).then((buffer) => {
  const path = require("path");
  const outPath = path.join(__dirname, "..", "..", "report", "PDF_Parsing_Research_Report.docx");
  fs.writeFileSync(outPath, buffer);
  console.log("Report written to", outPath);
});
