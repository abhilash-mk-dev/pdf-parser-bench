"""
Minimal FastAPI POC: one endpoint that accepts a PDF + a parser name and
returns extracted text, which parser was used, latency in ms, and page
count. No auth, no database, by design (per assignment spec) -- this
exists to show the researched parsers wired into something runnable, not
as a production service.

Run:
    uvicorn app.main:app --reload --port 8000

Try it:
    curl -X POST http://localhost:8000/parse \
      -F "file=@samples/02_two_column_sidebar_icons.pdf" \
      -F "parser=pymupdf"

Or open http://localhost:8000/docs for the interactive Swagger UI.
"""

import os
import shutil
import tempfile
from fastapi import FastAPI, UploadFile, File, Form, HTTPException
from fastapi.responses import JSONResponse

from .parsers_no_llm import parse_with_pymupdf, parse_with_pdfplumber
from .parsers_layout_aware import parse_with_unstructured
from .parsers_llm import parse_with_llamaparse
from .parsers_vision import parse_with_vision_llm

app = FastAPI(
    title="PDF Parser Benchmark POC",
    description="Single-endpoint service for comparing PDF parsing approaches.",
    version="0.1.0",
)

SUPPORTED_PARSERS = {
    "pymupdf": lambda path: parse_with_pymupdf(path),
    "pdfplumber": lambda path: parse_with_pdfplumber(path),
    "unstructured": lambda path: parse_with_unstructured(path, strategy="fast"),
    "unstructured_hi_res": lambda path: parse_with_unstructured(path, strategy="hi_res"),
    "llamaparse": lambda path: parse_with_llamaparse(path),
    "vision": lambda path: parse_with_vision_llm(path),
}


@app.get("/")
def root():
    return {
        "service": "PDF Parser Benchmark POC",
        "endpoint": "POST /parse",
        "supported_parsers": list(SUPPORTED_PARSERS.keys()),
        "docs": "/docs",
    }


@app.post("/parse")
async def parse_pdf(
    file: UploadFile = File(..., description="PDF file to parse"),
    parser: str = Form(..., description=f"One of: {list(SUPPORTED_PARSERS.keys())}"),
):
    if parser not in SUPPORTED_PARSERS:
        raise HTTPException(
            status_code=400,
            detail=f"Unknown parser '{parser}'. Supported: {list(SUPPORTED_PARSERS.keys())}",
        )

    if not file.filename.lower().endswith(".pdf"):
        raise HTTPException(status_code=400, detail="Only .pdf files are accepted.")

    # Persist the upload to a temp file -- every parser library here expects
    # a filesystem path rather than an in-memory buffer.
    with tempfile.NamedTemporaryFile(suffix=".pdf", delete=False) as tmp:
        shutil.copyfileobj(file.file, tmp)
        tmp_path = tmp.name

    try:
        result = SUPPORTED_PARSERS[parser](tmp_path)
        return JSONResponse(content=result.to_dict())
    finally:
        os.remove(tmp_path)
