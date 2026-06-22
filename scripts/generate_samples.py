"""
Generates synthetic resume PDFs that mimic real-world layout patterns
(single-column, two-column, table-based skill grids, icon-heavy headers).

These are fabricated names/data -- not real people -- so they're safe to
commit to a public repo per the assignment's "no personal/confidential
documents" rule.

Run: python3 generate_samples.py
Output: ../samples/*.pdf
"""

from reportlab.lib.pagesizes import letter
from reportlab.lib.units import inch
from reportlab.lib import colors
from reportlab.pdfgen import canvas
from reportlab.platypus import Table, TableStyle
import os

OUT_DIR = os.path.join(os.path.dirname(__file__), "..", "samples")
os.makedirs(OUT_DIR, exist_ok=True)

PAGE_W, PAGE_H = letter


def draw_icon_circle(c, x, y, r, label):
    """Fake a little icon glyph (circle + 1-2 letters) -- mimics the
    icon fonts/glyphs that Canva/LinkedIn exports embed for contact info,
    which are a known parser failure mode (icons -> garbled unicode or
    dropped entirely)."""
    c.setFillColor(colors.HexColor("#2563eb"))
    c.circle(x, y, r, fill=1, stroke=0)
    c.setFillColor(colors.white)
    c.setFont("Helvetica-Bold", 7)
    c.drawCentredString(x, y - 3, label)


# ---------------------------------------------------------------------------
# Sample 1: Clean single-column resume (the "easy mode" baseline)
# ---------------------------------------------------------------------------
def make_single_column(path):
    c = canvas.Canvas(path, pagesize=letter)
    c.setFont("Helvetica-Bold", 20)
    c.drawString(1 * inch, 10.3 * inch, "Priya Nandakumar")
    c.setFont("Helvetica", 10)
    c.drawString(1 * inch, 10.05 * inch, "priya.n.dev@example.com | +1 (415) 555-0142 | San Francisco, CA")

    sections = [
        ("SUMMARY", [
            "Backend engineer with 4 years building distributed systems in Python and Go.",
            "Focused on observability tooling and reliability for payments infrastructure.",
        ]),
        ("EXPERIENCE", [
            "Senior Software Engineer, Northstar Payments (2022 - Present)",
            "  - Led migration of the ledger service from MySQL to a sharded Postgres cluster.",
            "  - Reduced p99 latency on the settlement API by 38% via query batching.",
            "  - Mentored 2 junior engineers; ran the on-call rotation for 6 months.",
            "",
            "Software Engineer, Northstar Payments (2020 - 2022)",
            "  - Built internal alerting service on top of Prometheus + Alertmanager.",
            "  - Wrote the integration test harness adopted across 5 backend teams.",
        ]),
        ("EDUCATION", [
            "B.S. Computer Science, University of Washington, 2020",
        ]),
        ("SKILLS", [
            "Python, Go, PostgreSQL, Kafka, Docker, Kubernetes, Terraform, Prometheus",
        ]),
    ]

    y = 9.6 * inch
    for title, lines in sections:
        c.setFont("Helvetica-Bold", 12)
        c.setFillColor(colors.HexColor("#111827"))
        c.drawString(1 * inch, y, title)
        y -= 0.05 * inch
        c.setStrokeColor(colors.HexColor("#d1d5db"))
        c.line(1 * inch, y, 7.5 * inch, y)
        y -= 0.22 * inch
        c.setFont("Helvetica", 10)
        c.setFillColor(colors.black)
        for line in lines:
            c.drawString(1 * inch, y, line)
            y -= 0.19 * inch
        y -= 0.15 * inch

    c.save()


# ---------------------------------------------------------------------------
# Sample 2: Two-column "modern template" resume with icon-glyph contact row
# (the classic Canva/LinkedIn export failure mode: column order, icons)
# ---------------------------------------------------------------------------
def make_two_column(path):
    c = canvas.Canvas(path, pagesize=letter)

    # Sidebar background
    c.setFillColor(colors.HexColor("#1e3a5f"))
    c.rect(0, 0, 2.6 * inch, PAGE_H, fill=1, stroke=0)

    # Sidebar content (white text)
    c.setFillColor(colors.white)
    c.setFont("Helvetica-Bold", 16)
    c.drawString(0.3 * inch, 10.3 * inch, "Marcus Olawale")
    c.setFont("Helvetica", 10)
    c.drawString(0.3 * inch, 10.05 * inch, "Product Designer")

    # Contact row with fake icon glyphs
    contact_y = 9.6 * inch
    draw_icon_circle(c, 0.45 * inch, contact_y, 0.1 * inch, "@")
    c.setFont("Helvetica", 8)
    c.setFillColor(colors.white)
    c.drawString(0.65 * inch, contact_y - 3, "marcus.o@example.com")
    contact_y -= 0.3 * inch
    draw_icon_circle(c, 0.45 * inch, contact_y, 0.1 * inch, "T")
    c.drawString(0.65 * inch, contact_y - 3, "+1 (212) 555-0198")
    contact_y -= 0.3 * inch
    draw_icon_circle(c, 0.45 * inch, contact_y, 0.1 * inch, "P")
    c.drawString(0.65 * inch, contact_y - 3, "New York, NY")

    # Sidebar: skill grid as small filled bars (icon-grid pattern)
    y = 8.4 * inch
    c.setFont("Helvetica-Bold", 11)
    c.drawString(0.3 * inch, y, "SKILLS")
    y -= 0.25 * inch
    skills = [("Figma", 5), ("Sketch", 4), ("User Research", 5), ("Prototyping", 4), ("HTML/CSS", 3)]
    for skill, level in skills:
        c.setFont("Helvetica", 9)
        c.drawString(0.3 * inch, y, skill)
        for i in range(5):
            box_color = colors.HexColor("#60a5fa") if i < level else colors.HexColor("#3b5876")
            c.setFillColor(box_color)
            c.rect(0.3 * inch + i * 0.16 * inch, y - 0.16 * inch, 0.12 * inch, 0.08 * inch, fill=1, stroke=0)
        y -= 0.35 * inch

    y -= 0.2 * inch
    c.setFillColor(colors.white)
    c.setFont("Helvetica-Bold", 11)
    c.drawString(0.3 * inch, y, "LANGUAGES")
    y -= 0.22 * inch
    c.setFont("Helvetica", 9)
    for lang in ["English (Native)", "Yoruba (Fluent)", "French (Basic)"]:
        c.drawString(0.3 * inch, y, lang)
        y -= 0.2 * inch

    # Main column (right side)
    main_x = 2.9 * inch
    c.setFillColor(colors.black)
    y = 10.3 * inch
    c.setFont("Helvetica-Bold", 13)
    c.drawString(main_x, y, "EXPERIENCE")
    y -= 0.28 * inch
    exp = [
        ("Senior Product Designer -- Lumen Health (2021-Present)", [
            "Redesigned the patient onboarding flow, cutting drop-off by 22%.",
            "Built and maintained the company-wide design system in Figma.",
        ]),
        ("Product Designer -- Lumen Health (2019-2021)", [
            "Owned end-to-end design for the mobile appointment booking feature.",
        ]),
    ]
    for title, bullets in exp:
        c.setFont("Helvetica-Bold", 10)
        c.drawString(main_x, y, title)
        y -= 0.2 * inch
        c.setFont("Helvetica", 9.5)
        for b in bullets:
            c.drawString(main_x + 0.15 * inch, y, "- " + b)
            y -= 0.18 * inch
        y -= 0.12 * inch

    y -= 0.1 * inch
    c.setFont("Helvetica-Bold", 13)
    c.drawString(main_x, y, "EDUCATION")
    y -= 0.25 * inch
    c.setFont("Helvetica", 9.5)
    c.drawString(main_x, y, "B.F.A. Graphic Design, Parsons School of Design, 2019")

    c.save()


# ---------------------------------------------------------------------------
# Sample 3: Table-heavy resume (skills grid as an actual PDF table object)
# -- tables are a known weak point for plain text extractors that don't
# preserve column/row structure.
# ---------------------------------------------------------------------------
def make_table_heavy(path):
    from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer
    from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle

    doc = SimpleDocTemplate(path, pagesize=letter,
                             topMargin=0.7 * inch, bottomMargin=0.7 * inch,
                             leftMargin=0.8 * inch, rightMargin=0.8 * inch)
    styles = getSampleStyleSheet()
    h1 = ParagraphStyle("h1", parent=styles["Heading1"], fontSize=18, spaceAfter=4)
    h2 = ParagraphStyle("h2", parent=styles["Heading2"], fontSize=12, spaceAfter=4, spaceBefore=12)
    body = styles["BodyText"]

    elems = []
    elems.append(Paragraph("Sara Kowalczyk", h1))
    elems.append(Paragraph("Data Analyst &nbsp;|&nbsp; sara.k@example.com &nbsp;|&nbsp; Chicago, IL", body))
    elems.append(Spacer(1, 10))

    elems.append(Paragraph("SUMMARY", h2))
    elems.append(Paragraph(
        "Data analyst with 3 years of experience in SQL-based reporting and dashboarding "
        "for retail operations. Comfortable translating ambiguous business questions into "
        "concrete, monitored metrics.", body))

    elems.append(Paragraph("SKILLS MATRIX", h2))
    data = [
        ["Skill", "Proficiency", "Years", "Last Used"],
        ["SQL", "Expert", "5", "2026"],
        ["Python (pandas)", "Advanced", "3", "2026"],
        ["Tableau", "Advanced", "4", "2026"],
        ["Excel / Power Query", "Expert", "6", "2026"],
        ["R", "Intermediate", "2", "2024"],
        ["dbt", "Intermediate", "1", "2025"],
    ]
    t = Table(data, colWidths=[1.9 * inch, 1.3 * inch, 0.8 * inch, 1.0 * inch])
    t.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#111827")),
        ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
        ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
        ("FONTSIZE", (0, 0), (-1, -1), 9),
        ("GRID", (0, 0), (-1, -1), 0.5, colors.HexColor("#d1d5db")),
        ("ROWBACKGROUNDS", (0, 1), (-1, -1), [colors.white, colors.HexColor("#f3f4f6")]),
        ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
        ("TOPPADDING", (0, 0), (-1, -1), 5),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 5),
    ]))
    elems.append(t)
    elems.append(Spacer(1, 14))

    elems.append(Paragraph("EXPERIENCE", h2))
    exp_data = [
        ["Role", "Company", "Dates"],
        ["Data Analyst II", "Brightline Retail Co.", "2023 - Present"],
        ["Data Analyst I", "Brightline Retail Co.", "2021 - 2023"],
        ["Reporting Intern", "Vantage Logistics", "2020 - 2021"],
    ]
    t2 = Table(exp_data, colWidths=[1.6 * inch, 2.4 * inch, 1.5 * inch])
    t2.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#374151")),
        ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
        ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
        ("FONTSIZE", (0, 0), (-1, -1), 9),
        ("GRID", (0, 0), (-1, -1), 0.5, colors.HexColor("#d1d5db")),
        ("TOPPADDING", (0, 0), (-1, -1), 5),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 5),
    ]))
    elems.append(t2)
    elems.append(Spacer(1, 10))
    elems.append(Paragraph(
        "At Brightline, built the weekly inventory-variance dashboard now used by 4 regional "
        "managers, and automated a manual month-end reconciliation process that previously "
        "took 2 days, cutting it to under 1 hour.", body))

    elems.append(Paragraph("EDUCATION", h2))
    elems.append(Paragraph("B.A. Economics, University of Illinois at Chicago, 2021", body))

    doc.build(elems)


# ---------------------------------------------------------------------------
# Sample 4: Multi-column newspaper-style layout (3 columns) -- the classic
# "reading order" failure case for naive text extractors.
# ---------------------------------------------------------------------------
def make_three_column(path):
    c = canvas.Canvas(path, pagesize=letter)
    c.setFont("Helvetica-Bold", 18)
    c.drawCentredString(PAGE_W / 2, 10.4 * inch, "DAVID FEINBERG -- SENIOR ACCOUNTANT")
    c.setFont("Helvetica", 9)
    c.drawCentredString(PAGE_W / 2, 10.15 * inch, "d.feinberg@example.com  |  Boston, MA  |  +1 (617) 555-0173")
    c.line(0.6 * inch, 10.0 * inch, 7.9 * inch, 10.0 * inch)

    col_w = 2.3 * inch
    col_xs = [0.6 * inch, 3.1 * inch, 5.6 * inch]
    columns_content = [
        ("CORE SKILLS", [
            "GAAP & IFRS reporting",
            "Month-end close",
            "QuickBooks / NetSuite",
            "Variance analysis",
            "Audit prep",
            "Excel (advanced)",
            "Forecasting",
        ]),
        ("EXPERIENCE", [
            "Senior Accountant",
            "Harborview Group",
            "2021-Present",
            "",
            "- Owns monthly close for",
            "  3 business units.",
            "- Cut close timeline from",
            "  9 to 5 business days.",
            "",
            "Staff Accountant",
            "Harborview Group",
            "2018-2021",
            "- Reconciled AP/AR for",
            "  $40M annual revenue.",
        ]),
        ("EDUCATION & CERTS", [
            "B.S. Accounting",
            "Boston College, 2018",
            "",
            "CPA (Massachusetts)",
            "Licensed 2020",
            "",
            "REFERENCES",
            "Available on request",
        ]),
    ]

    for (title, lines), x in zip(columns_content, col_xs):
        y = 9.6 * inch
        c.setFont("Helvetica-Bold", 10)
        c.drawString(x, y, title)
        y -= 0.22 * inch
        c.setFont("Helvetica", 8.5)
        for line in lines:
            c.drawString(x, y, line)
            y -= 0.17 * inch

    c.save()


# ---------------------------------------------------------------------------
# Sample 5: Scanned-style resume (rendered as a flattened image inside the
# PDF -- no extractable text layer at all). This is the classic "needs OCR
# or vision" failure case.
# ---------------------------------------------------------------------------
def make_scanned_style(path):
    from PIL import Image, ImageDraw, ImageFont
    import io

    img = Image.new("RGB", (1700, 2200), "white")
    draw = ImageDraw.Draw(img)
    try:
        font_title = ImageFont.truetype("/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf", 48)
        font_body = ImageFont.truetype("/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf", 28)
        font_h2 = ImageFont.truetype("/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf", 32)
    except Exception:
        font_title = font_body = font_h2 = ImageFont.load_default()

    y = 80
    draw.text((100, y), "ANGELA TORRES", font=font_title, fill="black")
    y += 70
    draw.text((100, y), "Registered Nurse, BSN  |  angela.t@example.com  |  Houston, TX", font=font_body, fill="black")
    y += 60
    draw.line((100, y, 1600, y), fill="black", width=2)
    y += 40

    draw.text((100, y), "EXPERIENCE", font=font_h2, fill="black")
    y += 50
    lines = [
        "Charge Nurse, St. Augustine Medical Center (2020-Present)",
        "  Supervise a 12-person nursing team across two ICU wings.",
        "  Reduced average patient wait time during shift handoff by 15 minutes.",
        "",
        "Staff Nurse, St. Augustine Medical Center (2017-2020)",
        "  Provided direct patient care in a 24-bed surgical recovery unit.",
        "",
        "EDUCATION",
        "B.S. Nursing, Texas A&M University, 2017",
        "",
        "CERTIFICATIONS",
        "BLS, ACLS, CCRN",
    ]
    for line in lines:
        draw.text((100, y), line, font=font_body, fill="black")
        y += 40

    # Simulate a slight scan artifact: faint gray noise band
    draw.rectangle((0, 2150, 1700, 2160), fill=(230, 230, 230))

    img_path = path.replace(".pdf", "_tmp.png")
    img.save(img_path)

    c = canvas.Canvas(path, pagesize=letter)
    c.drawImage(img_path, 0, 0, width=PAGE_W, height=PAGE_H)
    c.save()
    os.remove(img_path)


if __name__ == "__main__":
    make_single_column(os.path.join(OUT_DIR, "01_single_column_clean.pdf"))
    make_two_column(os.path.join(OUT_DIR, "02_two_column_sidebar_icons.pdf"))
    make_table_heavy(os.path.join(OUT_DIR, "03_table_heavy_skills_matrix.pdf"))
    make_three_column(os.path.join(OUT_DIR, "04_three_column_layout.pdf"))
    make_scanned_style(os.path.join(OUT_DIR, "05_scanned_no_text_layer.pdf"))
    print("Generated 5 sample resumes in", OUT_DIR)
