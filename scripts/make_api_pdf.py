# scripts/make_api_pdf.py
# Generates docs/API_Reference.pdf — a printable reference of every API endpoint.
import os
from reportlab.lib.pagesizes import A4
from reportlab.lib.units import mm
from reportlab.lib import colors
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.platypus import (
    SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, HRFlowable
)
from reportlab.lib.enums import TA_LEFT

OUT_DIR = os.path.join(os.path.dirname(__file__), "..", "docs")
os.makedirs(OUT_DIR, exist_ok=True)
OUT = os.path.join(OUT_DIR, "API_Reference.pdf")

BASE = "http://localhost:4000/api/v1"

# Brand-ish palette
NAVY = colors.HexColor("#1f2d3d")
BLUE = colors.HexColor("#2563eb")
LIGHT = colors.HexColor("#eef2f7")
GREY = colors.HexColor("#6b7280")
HEAD_BG = colors.HexColor("#1f2d3d")

styles = getSampleStyleSheet()
styles.add(ParagraphStyle("H1c", parent=styles["Title"], textColor=NAVY, fontSize=22, spaceAfter=2))
styles.add(ParagraphStyle("Sub", parent=styles["Normal"], textColor=GREY, fontSize=10, spaceAfter=10))
styles.add(ParagraphStyle("Sec", parent=styles["Heading2"], textColor=BLUE, fontSize=13,
                          spaceBefore=14, spaceAfter=6))
styles.add(ParagraphStyle("Cell", parent=styles["Normal"], fontSize=8.2, leading=10.5))
styles.add(ParagraphStyle("CellMono", parent=styles["Normal"], fontName="Courier",
                          fontSize=7.8, leading=10, textColor=NAVY))
styles.add(ParagraphStyle("Note", parent=styles["Normal"], fontSize=9, leading=13, textColor=NAVY))

P = lambda t, s="Cell": Paragraph(t, styles[s])

story = []

# ── Header ────────────────────────────────────────────────
story.append(Paragraph("E-commerce REST API", styles["H1c"]))
story.append(Paragraph("Endpoint Reference &mdash; Node.js (Express) + PostgreSQL", styles["Sub"]))
story.append(HRFlowable(width="100%", thickness=1.2, color=BLUE, spaceAfter=10))

meta = [
    [P("<b>Base URL</b>", "Note"), P(f'<font face="Courier">{BASE}</font>', "Note")],
    [P("<b>Auth header</b>", "Note"), P('<font face="Courier">Authorization: Bearer &lt;token&gt;</font>', "Note")],
    [P("<b>Health check</b>", "Note"), P('<font face="Courier">GET http://localhost:4000/health</font>', "Note")],
    [P("<b>Response shape</b>", "Note"),
     P('Success: <font face="Courier">{ "success": true, "data": ... }</font> &nbsp; '
       'Error: <font face="Courier">{ "success": false, "error": {...} }</font>', "Note")],
    [P("<b>Demo logins</b>", "Note"),
     P('admin@example.com / Admin123! &nbsp;&bull;&nbsp; customer@example.com / Customer123!', "Note")],
]
mt = Table(meta, colWidths=[32 * mm, 145 * mm])
mt.setStyle(TableStyle([
    ("BACKGROUND", (0, 0), (-1, -1), LIGHT),
    ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
    ("TOPPADDING", (0, 0), (-1, -1), 5),
    ("BOTTOMPADDING", (0, 0), (-1, -1), 5),
    ("LEFTPADDING", (0, 0), (-1, -1), 8),
    ("LINEBELOW", (0, 0), (-1, -2), 0.4, colors.white),
    ("BOX", (0, 0), (-1, -1), 0.5, colors.HexColor("#d1d9e6")),
]))
story.append(mt)
story.append(Spacer(1, 6))

# ── Endpoint sections ─────────────────────────────────────
# (method, path, auth, body / params)
SECTIONS = [
    ("Authentication", [
        ("POST", "/auth/signup", "Public", '{"name","email","password"}'),
        ("POST", "/auth/login", "Public", '{"email","password"}'),
        ("POST", "/auth/forgot-password", "Public", '{"email"}  (token logged to server console)'),
        ("POST", "/auth/reset-password", "Public", '{"token","password"}'),
    ]),
    ("Products", [
        ("GET", "/products", "Public",
         "query: page, limit, category, minPrice, maxPrice, q, sort(created_at|price|name), order(asc|desc)"),
        ("GET", "/products/:id", "Public", "—"),
        ("POST", "/products", "Admin", '{"name","price","category","stock?","description?","image_url?"}'),
        ("PUT", "/products/:id", "Admin", "any subset of product fields"),
        ("DELETE", "/products/:id", "Admin", "—"),
    ]),
    ("Wishlist (protected)", [
        ("GET", "/wishlist", "User", "—"),
        ("POST", "/wishlist", "User", '{"productId"}'),
        ("DELETE", "/wishlist/:productId", "User", "—"),
    ]),
    ("Shopping Cart (protected)", [
        ("GET", "/cart", "User", "returns items + dynamic total"),
        ("POST", "/cart", "User", '{"productId","quantity"}  (increments if exists)'),
        ("PATCH", "/cart/:productId", "User", '{"quantity"}  (0 = remove line)'),
        ("DELETE", "/cart/:productId", "User", "—"),
    ]),
    ("Checkout & Orders (protected)", [
        ("POST", "/orders/checkout", "User", "validates stock, creates pending order"),
        ("POST", "/orders/:id/confirm-payment", "User", '{"success": true}  -> paid, stock down, cart cleared'),
        ("GET", "/orders", "User", "query: page, limit"),
        ("GET", "/orders/:id", "User", "own order detail"),
    ]),
]

METHOD_COLORS = {
    "GET": colors.HexColor("#16a34a"),
    "POST": colors.HexColor("#2563eb"),
    "PUT": colors.HexColor("#d97706"),
    "PATCH": colors.HexColor("#7c3aed"),
    "DELETE": colors.HexColor("#dc2626"),
}

AUTH_COLORS = {
    "Public": colors.HexColor("#16a34a"),
    "User": colors.HexColor("#2563eb"),
    "Admin": colors.HexColor("#dc2626"),
}

def method_badge(m):
    c = METHOD_COLORS[m]
    return Paragraph(f'<font color="{c.hexval()[2:]}"><b>{m}</b></font>', styles["Cell"])

def auth_badge(a):
    c = AUTH_COLORS[a]
    return Paragraph(f'<font color="{c.hexval()[2:]}"><b>{a}</b></font>', styles["Cell"])

for title, rows in SECTIONS:
    story.append(Paragraph(title, styles["Sec"]))
    data = [[P("<b>Method</b>"), P("<b>Path</b>"), P("<b>Auth</b>"), P("<b>Body / Params</b>")]]
    for m, path, auth, body in rows:
        data.append([
            method_badge(m),
            P(path, "CellMono"),
            auth_badge(auth),
            P(body.replace("<", "&lt;").replace(">", "&gt;"), "Cell"),
        ])
    t = Table(data, colWidths=[18 * mm, 52 * mm, 16 * mm, 91 * mm], repeatRows=1)
    t.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, 0), HEAD_BG),
        ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
        ("FONTSIZE", (0, 0), (-1, 0), 8.5),
        ("ROWBACKGROUNDS", (0, 1), (-1, -1), [colors.white, LIGHT]),
        ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
        ("TOPPADDING", (0, 0), (-1, -1), 4),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 4),
        ("LEFTPADDING", (0, 0), (-1, -1), 6),
        ("GRID", (0, 0), (-1, -1), 0.4, colors.HexColor("#d1d9e6")),
    ]))
    story.append(t)

# ── Typical flow ──────────────────────────────────────────
story.append(Paragraph("Typical flow", styles["Sec"]))
flow = (
    "1. <b>POST /auth/login</b> &rarr; capture the JWT token.<br/>"
    "2. <b>GET /products</b> &rarr; browse / find product IDs.<br/>"
    "3. <b>POST /cart</b> &rarr; add items (quantity increments if already in cart).<br/>"
    "4. <b>GET /cart</b> &rarr; review the dynamically calculated total.<br/>"
    "5. <b>POST /orders/checkout</b> &rarr; stock validated, a <i>pending</i> order is created.<br/>"
    "6. <b>POST /orders/:id/confirm-payment</b> &rarr; order becomes <i>paid</i>, stock is reduced, cart is cleared.<br/>"
    "7. (Admin) <b>POST /products</b> &rarr; manage catalogue after logging in as admin."
)
story.append(Paragraph(flow, styles["Note"]))

story.append(Spacer(1, 10))
story.append(HRFlowable(width="100%", thickness=0.6, color=colors.HexColor("#d1d9e6")))
story.append(Paragraph(
    '<font size=8 color="#6b7280">Generated from the project source. '
    'Import <font face="Courier">postman_collection.json</font> into Postman, or use '
    '<font face="Courier">requests.http</font> in VS Code, to exercise these endpoints.</font>',
    styles["Normal"]))

doc = SimpleDocTemplate(
    OUT, pagesize=A4,
    leftMargin=16 * mm, rightMargin=16 * mm,
    topMargin=15 * mm, bottomMargin=14 * mm,
    title="E-commerce API Reference", author="ecommerce-api",
)
doc.build(story)
print(f"PDF written to: {os.path.abspath(OUT)}")
