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
      bodyCell("Mixed doc types at scale, once the OCR/element-typing failure is diagnosed", overviewWidths[5]),
    ]}),
    new TableRow({ children: [
      bodyCell("LlamaParse", overviewWidths[0], { bold: true }),
      bodyCell("LLM-based", overviewWidths[1]),
      bodyCell("Low (API)", overviewWidths[2]),
      bodyCell("~3.5-6.5 sec", overviewWidths[3]),
      bodyCell("Unconfirmed*", overviewWidths[4]),
      bodyCell("Scanned docs and messy multi-column/table-heavy docs", overviewWidths[5]),
    ]}),
    new TableRow({ children: [
      bodyCell("Vision LLM (Claude)", overviewWidths[0], { bold: true }),
      bodyCell("Vision LLM", overviewWidths[1]),
      bodyCell("Low (API)", overviewWidths[2]),
      bodyCell("Not tested**", overviewWidths[3]),
      bodyCell("Higher, ~$0.01-0.03 est.", overviewWidths[4]),
      bodyCell("Scanned docs, if confirmed comparable to LlamaParse", overviewWidths[5]),
    ]}),
  ],
});

// ---------------------------------------------------------------------
// Table 2: Per-sample results (the real numbers)
// ---------------------------------------------------------------------
function resultsRow(sample, pymupdf, pdfplumber, unstructured, llamaparse) {
  const w = [2260, 1900, 1900, 1900, 1900];
  return new TableRow({ children: [
    bodyCell(sample, w[0]),
    bodyCell(pymupdf, w[1]),
    bodyCell(pdfplumber, w[2]),
    bodyCell(unstructured, w[3], unstructured.startsWith("FAIL") ? { color: "B91C1C" } : {}),
    bodyCell(llamaparse, w[4], { color: "15803D" }),
  ]});
}
const resultsWidths = [2260, 1900, 1900, 1900, 1900];
const resultsTable = new Table({
  width: { size: 9860, type: WidthType.DXA },
  columnWidths: resultsWidths,
  rows: [
    new TableRow({ children: [
      headerCell("Sample document", resultsWidths[0]),
      headerCell("PyMuPDF", resultsWidths[1]),
      headerCell("pdfplumber", resultsWidths[2]),
      headerCell("Unstructured (fast)", resultsWidths[3]),
      headerCell("LlamaParse", resultsWidths[4]),
    ]}),
    resultsRow("01 - Single column, clean", "884 chars, 2.7ms", "873 chars, 34ms", "FAIL (0 elements)", "899 chars, 4175ms"),
    resultsRow("02 - Two-col sidebar + icons", "579 chars, 2.4ms", "823 chars, 34ms", "FAIL (0 elements)", "547 chars, 3662ms"),
    resultsRow("03 - Table-heavy matrix", "919 chars, 2.6ms", "1400 chars, 50ms*", "FAIL (0 elements)", "1360 chars, 3527ms"),
    resultsRow("04 - Three-column layout", "591 chars, 2.3ms", "580 chars, 23ms", "FAIL (0 elements)", "636 chars, 3645ms"),
    resultsRow("05 - Scanned, no text layer", "0 chars, 1.5ms**", "0 chars, 2.5ms**", "FAIL (0 elements)", "498 chars, 6481ms***"),
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
      p("All numbers below are measured, not estimated, except where explicitly marked as an estimate. LlamaParse was initially untested for lack of an API key; I later obtained a free LlamaCloud key and re-ran the full benchmark, so its latency and character-count figures in this report are real, measured results (Section 3.4). The vision-LLM parser remains untested for the same reason -- no Anthropic API key was available -- so Section 3.5's figures are still projections, clearly marked as such."),

      new Paragraph({ children: [new PageBreak()] }),

      // ---------------- 3. Parser-by-parser findings ----------------
      h1("3. Parser-by-parser findings"),

      h2("3.1 PyMuPDF (No-LLM)"),
      h3("Initial research"),
      pRich([new TextRun({ text: "Going in, I understood PyMuPDF as the fastest, most battle-tested option in the no-LLM tier -- a C-based engine (built on MuPDF) that most other Python PDF libraries either wrap or get compared against. The expectation from documentation and community discussion was: excellent raw speed and text fidelity on born-digital PDFs, but no semantic understanding at all -- no concept of \"this is a table\" or \"this is a title,\" just characters and their positions. The known weak point going in was multi-column reading order, since simple PDF text extractors are notorious for interleaving columns badly." })]),
      pRich([new TextRun({ text: "Good: ", bold: true }), new TextRun({ text: "fast, zero-dependency, free, mature. Bad (expected): no table structure, no semantic typing, unclear how it'd handle multi-column layouts in practice." })]),
      pRich([new TextRun({ text: "Setup: ", bold: true }), new TextRun({ text: "pip install pymupdf. One package, no system dependencies, no model downloads. This was the easiest of all four categories to integrate." })]),
      pRich([new TextRun({ text: "Accuracy: ", bold: true }), new TextRun({ text: "Surprisingly strong on reading order. I expected the three-column layout to scramble badly, but PyMuPDF's block-based text extraction reconstructed all three columns top-to-bottom, left-to-right, correctly. The two-column sidebar resume also came out in the right order (sidebar block, then main column block). It does not preserve table structure -- a real PDF table just becomes whitespace-separated text." })]),
      pRich([new TextRun({ text: "Speed: ", bold: true }), new TextRun({ text: "~2-3 ms per page across all samples. Far and away the fastest option tested." })]),
      pRich([new TextRun({ text: "Where it breaks: ", bold: true }), new TextRun({ text: "On the scanned resume (no text layer), it returns an empty string with " }), new TextRun({ text: "success = true", font: "Courier New" }), new TextRun({ text: " and no error. This is not a crash -- it's worse, because it looks like success. Icon glyphs in the sidebar resume (the circular @ / phone / pin icons) were dropped silently; only the fallback text label I'd put inside them survived." })]),
      pRich([new TextRun({ text: "Production recommendation: ", bold: true }), new TextRun({ text: "Default choice for born-digital PDFs where you don't expect tables to matter. Pair it with a page-level heuristic (e.g., flag any page where extracted character count is near zero) so the silent-empty failure mode doesn't pass downstream unnoticed." })]),

      h2("3.2 pdfplumber (No-LLM)"),
      h3("Initial research"),
      pRich([new TextRun({ text: "Research framed pdfplumber as the table-and-layout specialist of the no-LLM tier -- still rule-based and free, but built specifically to expose word/line/rect bounding boxes and a dedicated table-extraction API, where PyMuPDF treats the page as more of a flat character stream. The tradeoff signaled everywhere in the docs and community comparisons was speed: pdfplumber is pure Python and does real geometric analysis per page, so it's consistently described as slower than PyMuPDF for the same job." })]),
      pRich([new TextRun({ text: "Good: ", bold: true }), new TextRun({ text: "real table extraction, fine-grained positional data, still free and dependency-light. Bad (expected): meaningfully slower than PyMuPDF, and table detection is geometry-based rather than content-aware, which sounded like a theoretical risk worth testing rather than a given." })]),
      pRich([new TextRun({ text: "Setup: ", bold: true }), new TextRun({ text: "pip install pdfplumber. Equally trivial -- pure Python, no compiled extensions beyond what it pulls in automatically." })]),
      pRich([new TextRun({ text: "Accuracy: ", bold: true }), new TextRun({ text: "Text extraction quality was comparable to PyMuPDF (873 vs 884 characters on the clean sample -- the difference is just whitespace normalization). The real value-add is " }), new TextRun({ text: "extract_tables()", font: "Courier New" }), new TextRun({ text: ", which correctly recovered both tables in the skills-matrix resume as proper row/column grids -- something PyMuPDF cannot do at all." })]),
      pRich([new TextRun({ text: "Speed: ", bold: true }), new TextRun({ text: "23-50 ms per page, roughly 10-20x slower than PyMuPDF. The table-detection pass (line and rect geometry analysis) is the likely cost driver -- the table-heavy sample took the longest of the four (50ms) even though it's one page." })]),
      pRich([new TextRun({ text: "Where it breaks: ", bold: true }), new TextRun({ text: "Two distinct failure modes, both worth flagging. First, the same silent-empty-string behavior as PyMuPDF on the scanned resume. Second, and more interesting: on the icon/sidebar resume, " }), new TextRun({ text: "extract_tables()", font: "Courier New" }), new TextRun({ text: " reported 5 separate tables -- all false positives. I drew small rectangles to represent skill-proficiency bars (e.g., 4 of 5 filled boxes next to \"Figma\"), and pdfplumber's line-intersection table detector matched that rectangle grid as table structure, even though every cell was empty text. This is a structural risk: any resume template using decorative boxes, dividers, or progress-bar-style skill indicators can pollute your table output with garbage." })]),
      pRich([new TextRun({ text: "Production recommendation: ", bold: true }), new TextRun({ text: "Use when tables genuinely matter (e.g., skills matrices, education tables) and you can afford the latency. Don't trust " }), new TextRun({ text: "extract_tables()", font: "Courier New" }), new TextRun({ text: " output blindly -- filter out detected tables where most cells are empty strings before passing them downstream." })]),

      h2("3.3 Unstructured.io (Layout-aware)"),
      h3("Initial research"),
      pRich([new TextRun({ text: "Unstructured.io is positioned in its own documentation and in most third-party writeups as the bridge between cheap rule-based parsers and expensive LLM-based ones: it classifies text into semantic element types (Title, NarrativeText, ListItem, Table) using a layout-detection model, rather than just returning characters in reading order. The selling point I took from research was structure-awareness without per-call LLM cost. The expected tradeoff was heavier setup than PyMuPDF/pdfplumber, since layout detection implies some kind of model, but I expected that cost to be a one-time install, not a recurring runtime dependency." })]),
      pRich([new TextRun({ text: "Good: ", bold: true }), new TextRun({ text: "semantic element typing (not just raw text), positioned as free/local rather than per-call LLM pricing. Bad (discovered, not expected): the model/asset dependency turned out to be far heavier and more fragile than the marketing materials suggest -- this is the one category where research did not prepare me for what actually happened." })]),
      pRich([new TextRun({ text: "Setup: ", bold: true }), new TextRun({ text: "This was the hardest integration of the four, and the difficulty had nothing to do with the resumes themselves -- it was packaging. " }), new TextRun({ text: "partition_pdf()", font: "Courier New" }), new TextRun({ text: " hard-imports " }), new TextRun({ text: "unstructured_inference", font: "Courier New" }), new TextRun({ text: ", which pulls in torch as a transitive dependency, even for the \"fast\" (non-OCR, text-layer-only) strategy. That's roughly 600MB+ of install just to extract text from a PDF." })]),
      pRich([new TextRun({ text: "More importantly: ", bold: true }), new TextRun({ text: "even after installing everything (including " }), new TextRun({ text: "pi-heif", font: "Courier New" }), new TextRun({ text: ", another transitive dependency the initial install didn't pull in), neither strategy actually worked end-to-end. With the " }), new TextRun({ text: "fast", font: "Courier New" }), new TextRun({ text: " strategy, " }), new TextRun({ text: "partition_pdf()", font: "Courier New" }), new TextRun({ text: " returned 0 elements in roughly 7ms -- too fast to have done any real layout analysis, and with no exception raised. My first hypothesis was a blocked spaCy model download (en_core_web_sm normally downloads from a GitHub release URL on first use, not PyPI), but I confirmed the model downloaded successfully and " }), new TextRun({ text: "still got 0 elements", italics: true }), new TextRun({ text: ". The library gives no further diagnostic at the API level -- it fails exactly the same way whether the cause is a blocked download or something else entirely, which is itself a usability problem: there's no way to distinguish \"nothing to extract\" from \"something went wrong internally\" without instrumenting the library's internals directly." })]),
      pRich([new TextRun({ text: "The hi_res strategy", bold: true }), new TextRun({ text: " (full layout-detection model) failed with a different, more specific error: " }), new TextRun({ text: "\"Could not get the OCRAgent instance. Please check the OCR package and the OCR_AGENT environment variable.\"", font: "Courier New" }), new TextRun({ text: " after roughly 7.3 seconds -- long enough to suggest it loaded its layout model before failing on a separate OCR-engine initialization step. This points to a missing or misconfigured OCR backend (Unstructured expects Tesseract or a similar OCR agent for hi_res, on top of the layout-detection model itself), which is a distinct dependency from anything in the fast-strategy path. I did not install or configure an OCR engine separately, so this is plausibly fixable, but it's another concrete example of the library expecting infrastructure beyond a plain pip install." })]),
      pRich([new TextRun({ text: "Accuracy / speed: ", bold: true }), new TextRun({ text: "I still cannot honestly report these numbers. Both strategies returned 0 elements in every run, with internet access confirmed working and the required model file confirmed downloaded. I do not want to guess at a root cause I haven't actually diagnosed -- see Section 6 for what I'd test next (most likely: running with debug-level logging enabled inside the partition_pdf call itself, and separately installing/configuring a Tesseract OCR backend for the hi_res path)." })]),
      pRich([new TextRun({ text: "Production recommendation: ", bold: true }), new TextRun({ text: "I'm not going to attribute this to a specific root cause I haven't confirmed -- both \"network restrictions\" and \"a deeper bug in this version\" are still on the table, and the honest position is that I don't yet know which. What I can say with confidence: this was the only one of the four parser categories where a plain pip install plus a successful asset download still wasn't enough to get a working result, and the failure mode is opaque -- a generic \"0 elements\" with no further detail on the fast path, and a separate OCR-backend error on the hi_res path that implies yet another system dependency (an OCR engine) beyond what the package documentation surfaces upfront. If I were piloting this for production, I would not treat \"pip install unstructured[pdf]\" as sufficient -- I'd budget real debugging time, expect to install Tesseract separately, and verify with a single known-good PDF before trusting it on the actual document set. The layout classification (genuine Title/Table/ListItem typing, instead of plain reading-order text) remains a real and useful capability on paper; I just can't confirm it works as documented without further investigation." })]),

      h2("3.4 LlamaParse (LLM-based)"),
      h3("Initial research"),
      pRich([new TextRun({ text: "LlamaParse is marketed by LlamaIndex as a parser purpose-built for \"complex\" documents -- specifically the cases that defeat rule-based parsers: multi-column layouts, embedded tables, and (per their docs) scanned pages, since it routes through OCR/LLM extraction rather than reading a text layer directly. The expected tradeoff was the usual LLM-based one: better structural understanding, but per-page cost and network latency instead of free, instant, local extraction. Research suggested it would meaningfully outperform PyMuPDF/pdfplumber on messy layouts and tables, at the cost of being slower and not free." })]),
      pRich([new TextRun({ text: "Good (expected): ", bold: true }), new TextRun({ text: "better handling of complex/messy layouts than rule-based parsers, markdown table output. Bad (expected): per-page cost, async job-queue latency instead of a synchronous call. After actually running it (see below), one expected-good turned out better than anticipated -- it handled the scanned PDF -- and the latency cost was confirmed and larger than the no-LLM tier by roughly three orders of magnitude." })]),
      pRich([new TextRun({ text: "Setup: ", bold: true }), new TextRun({ text: "pip install llama-parse installed cleanly with no system dependencies -- much lighter than Unstructured's footprint. It requires a LLAMA_CLOUD_API_KEY. I initially didn't have one and documented this as a gap; I later created a free LlamaCloud account, generated a key, and re-ran the full benchmark against all 5 samples with live results below." })]),
      pRich([new TextRun({ text: "Accuracy: ", bold: true }), new TextRun({ text: "Character counts came back close to PyMuPDF/pdfplumber on the born-digital samples (899 vs. 884/873 on the clean sample; 1360 vs. 919/1400 on the table-heavy sample), so on these particular layouts it isn't extracting dramatically more content than the free parsers -- the value isn't raw character count, it's structure (markdown-formatted output) and robustness to harder inputs, which the scanned sample demonstrates directly below." })]),
      pRich([new TextRun({ text: "The headline result: ", bold: true }), new TextRun({ text: "on the scanned, no-text-layer resume, LlamaParse returned " }), new TextRun({ text: "498 characters", bold: true }), new TextRun({ text: " of real extracted text, where PyMuPDF and pdfplumber both returned 0. This is the single clearest differentiator measured in this report: LlamaParse is doing OCR or vision-based extraction under the hood, so it doesn't depend on a PDF having a text layer at all. That's a capability the entire no-LLM tier structurally lacks, confirmed with a live API call rather than inferred from documentation." })]),
      pRich([new TextRun({ text: "Speed: ", bold: true }), new TextRun({ text: "3.5-6.5 seconds per document (4174ms / 3662ms / 3527ms / 3645ms / 6481ms across the 5 samples), roughly 100-1000x slower than PyMuPDF and 60-250x slower than pdfplumber. Notably, the scanned PDF was also the slowest call (6.5s) -- consistent with extra OCR/vision processing time when there's no text layer to read directly. The CLI output also showed the same job_id printed 3 times per document, once per benchmark run, confirming this is a real network round-trip each time, not a cached or local response." })]),
      pRich([new TextRun({ text: "Where it breaks / costs: ", bold: true }), new TextRun({ text: "I have real latency now but not yet a real cost-per-page figure -- that requires checking the LlamaCloud usage dashboard against credits consumed, which I haven't done. The async job-queue API shape (\"Started parsing the file under job_id...\") is confirmed as a different integration pattern than the synchronous local parsers -- the SDK abstracts the polling away, but it's still a network-dependent, queue-based call underneath, which matters for timeout handling and retry logic in a production service." })]),
      pRich([new TextRun({ text: "Production recommendation: ", bold: true }), new TextRun({ text: "Confirmed, not provisional: route documents to LlamaParse specifically when a cheap PyMuPDF pass returns near-zero characters (i.e., likely scanned), since that's the one case in this report where it provided something the free tier structurally cannot. For born-digital resumes where PyMuPDF/pdfplumber already extract full text in milliseconds, the ~4-6 second latency and per-page cost are hard to justify on accuracy grounds alone, since character counts were comparable. The right architecture is tiered: PyMuPDF first, LlamaParse (or a vision LLM) as a fallback gated on the first pass failing." })]),

      h2("3.5 Vision LLM -- Claude with vision (Vision-LLM)"),
      h3("Initial research"),
      pRich([new TextRun({ text: "Vision LLMs are the most architecturally different option of the four: rather than reading any embedded text layer, the page is rendered to an image and a multimodal model reads it the way a person would, looking at the page. Research suggested this should be the most robust category against malformed PDFs, scans, and unusual layouts, since it doesn't depend on PDF text extraction succeeding at all -- but at the highest per-page cost of the four categories, since each page is a full multimodal model call rather than a parsing operation." })]),
      pRich([new TextRun({ text: "Good (expected): ", bold: true }), new TextRun({ text: "should handle anything a human could read off the page, including scans, unusual fonts, and graphical layouts no parser-specific heuristic was built for. Bad (expected): highest cost per page, slowest due to per-page network + inference, and simplest integration (no job-queue complexity, unlike LlamaParse) but still fully API-dependent." })]),
      pRich([new TextRun({ text: "Setup: ", bold: true }), new TextRun({ text: "pip install anthropic, then render each page to a PNG (I used PyMuPDF purely for rasterization, not text extraction) and send it as an image content block with a transcription prompt. This is the simplest API integration of the four once you have a key -- a single synchronous call per page, no job polling, no model downloads. I did not have an ANTHROPIC_API_KEY in this sandbox, so no live numbers." })]),
      pRich([new TextRun({ text: "What I would have tested with a key: ", bold: true })]),
      bullet("Transcription accuracy on the scanned resume specifically -- this is the sample that defeated both no-LLM parsers entirely (Section 3.1-3.2). LlamaParse already confirmed it can extract real text from it (498 characters, Section 3.4); the open question is whether a vision LLM matches, beats, or underperforms that, and at what cost and latency relative to LlamaParse's measured 6.5 seconds on this same file."),
      bullet("Whether icon glyphs (the @ / phone / pin circles in the sidebar resume) get described in some useful way or silently ignored, since a vision model is looking at the rendered page, not the text layer."),
      bullet("Per-page cost at volume: each page is a separate image input plus a text completion, so cost scales with both image resolution and page count in a way the other categories' costs don't."),
      bullet("Latency per page, since (unlike PyMuPDF/pdfplumber) every page requires a network round-trip and model inference, not a local computation."),
      pRich([new TextRun({ text: "Production recommendation (provisional): ", bold: true }), new TextRun({ text: "LlamaParse has already confirmed that at least one non-text-layer-dependent option exists and works (Section 3.4), so vision LLMs are likely a second option in that same fallback tier rather than the only one. Once tested, the comparison that matters is vision-LLM vs. LlamaParse head-to-head on the scanned sample -- accuracy, cost, and latency -- not vision-LLM vs. the no-LLM tier, which is already a settled question. Either way, route to this tier only when a cheap text-layer check (e.g., near-zero PyMuPDF character count) confirms there's nothing to extract; running every document through a per-page LLM call by default would be paying for capability that PyMuPDF already provides for free in 2 milliseconds on most resumes." })]),

      new Paragraph({ children: [new PageBreak()] }),

      // ---------------- 4. Comparison ----------------
      h1("4. Cross-parser comparison"),
      h2("4.1 Overview"),
      overviewTable,
      p("* PyMuPDF/pdfplumber latency is measured wall-clock, median of 3 in-process runs; LlamaParse latency is measured wall-clock per live API call (see Section 3.4). Vision-LLM is not independently verified against live API calls in this environment -- no key was available; see Section 3.5 for what that would test. LlamaParse cost-per-page is unconfirmed because it requires checking the LlamaCloud usage dashboard against credits consumed, which I have not done yet.", { size: 18, italics: true, color: "6B7280" }),

      new Paragraph({ spacing: { before: 280 } }),
      h2("4.2 Measured results by sample"),
      resultsTable,
      p("* Elevated latency on the table-heavy sample reflects pdfplumber's table-detection pass, not raw text extraction. ** PyMuPDF/pdfplumber both report success = true with 0 extracted characters on the scanned PDF -- this is the silent-failure mode discussed in Section 3.1-3.2, not a crash. *** LlamaParse extracted 498 characters from the same scanned PDF where the no-LLM tier got nothing -- the clearest measured differentiator in this report -- and was also its slowest run of the five, consistent with extra OCR/vision processing.", { size: 18, italics: true, color: "6B7280" }),

      new Paragraph({ children: [new PageBreak()] }),

      // ---------------- 5. When to use what ----------------
      h1("5. When to use what"),
      pRich([new TextRun({ text: "Start with PyMuPDF as the default.", bold: true }), new TextRun({ text: " It's free, it's fast, and -- at least on the layouts I tested, including a 3-column resume -- its reading order held up better than I expected. Use it as the first pass on every document." })]),
      pRich([new TextRun({ text: "Add a text-layer sanity check immediately after.", bold: true }), new TextRun({ text: " If extracted character count is near zero relative to page count, you almost certainly have a scanned document, not a malformed one. Don't pass that empty string further down the pipeline as if it were a legitimately short resume." })]),
      pRich([new TextRun({ text: "Route flagged scanned documents to LlamaParse, and likely a vision LLM too once tested.", bold: true }), new TextRun({ text: " LlamaParse measurably handled the no-text-layer scan that defeated PyMuPDF and pdfplumber entirely (Section 3.4); a vision LLM should do the same by a different mechanism, but that's not yet confirmed in this report (Section 3.5). Don't run everything through either by default -- both are far more expensive per page than the no-LLM tier and unnecessary for the (likely majority) of born-digital resumes." })]),
      pRich([new TextRun({ text: "Reach for pdfplumber specifically when tables matter,", bold: true }), new TextRun({ text: " e.g. a skills matrix or an education table -- but sanity-check its output, since decorative rectangles (skill-bars, dividers) can get misdetected as tables with no real content." })]),
      pRich([new TextRun({ text: "LlamaParse is confirmed, not provisional, for the scanned-document case,", bold: true }), new TextRun({ text: " at a measured cost of roughly 3.5-6.5 seconds per document (Section 3.4). On the four born-digital samples its character counts were comparable to the free parsers, so that latency isn't justified by accuracy alone there -- the case for it is specifically the documents the no-LLM tier can't read at all." })]),
      pRich([new TextRun({ text: "Treat Unstructured.io as a research line, not a default,", bold: true }), new TextRun({ text: " until the failure is actually diagnosed. It promises better handling of complex layouts than rule-based parsers, but I could not get it to produce output in this assignment, with internet access confirmed working and the relevant model file confirmed downloaded -- both strategies returned 0 elements (fast) or a distinct OCR-backend initialization error (hi_res), and I have not yet identified the specific root cause (Section 3.3). This is an unresolved finding, not a confirmed verdict either way -- it would need real debugging (enabling internal debug logging, installing a Tesseract OCR backend) before I'd trust it in production." })]),

      new Paragraph({ children: [new PageBreak()] }),

      // ---------------- 6. Observations and surprises ----------------
      h1("6. Personal observations and surprises"),
      bullet("The biggest surprise was how good PyMuPDF's reading order was on the 3-column layout. I expected it to interleave columns badly, the way naive PDF text extraction often does -- it didn't, on any of my samples. I'd want to test it against a real, more irregular Canva export before trusting this generalizes, since my synthetic samples use fairly regular column geometry."),
      bullet("The most production-relevant finding wasn't a quality difference between parsers -- it was that two different libraries (PyMuPDF/pdfplumber on scans, Unstructured on every sample tested) both fail by returning something that looks like a normal, if short or empty, result, rather than raising an error a calling system would naturally catch. A pipeline that doesn't explicitly check for this will degrade silently, exactly as the assignment brief warned."),
      bullet("I didn't expect pdfplumber's table detector to false-positive on decorative graphics. It's a useful reminder that 'layout-aware' and 'table-aware' tools are reasoning over geometry (lines, rectangles, whitespace), not semantics -- they don't know the difference between a data table and a row of progress bars unless you tell them."),
      bullet("I initially didn't have an API key for LlamaParse or the vision LLM, so I documented what I'd test instead of fabricating numbers. I later obtained a free LlamaCloud key and re-ran the benchmark -- the result (498 characters extracted from a PDF with zero text layer) was the single most useful data point in this report, and I wouldn't have had it if I'd settled for the provisional writeup. I'd still like to do the same for the vision LLM before calling Section 3.5 complete."),
      bullet("LlamaParse's per-document latency (3.5-6.5 seconds) was higher than I expected even knowing it's an async, network-bound API -- it's roughly three orders of magnitude slower than PyMuPDF. That's a real architectural consideration, not just a footnote: a service routing documents to LlamaParse needs to handle that latency explicitly (timeouts, async processing, user-facing loading states), not bolt it onto a code path built around millisecond-scale local parsing."),
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
