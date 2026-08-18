#!/usr/bin/env python3
"""Build the Mannu briefing document: markdown-ish body -> styled HTML -> PDF."""
import base64, pathlib, subprocess, sys, re

SP = pathlib.Path(__file__).parent
IMG = SP / "img"
OUT_DIR = pathlib.Path("/Users/shivamsharma/Downloads/UrbanOS (Mannu)/output/docs")
OUT_DIR.mkdir(parents=True, exist_ok=True)

def b64(name):
    return base64.b64encode((IMG / name).read_bytes()).decode()

CSS = """
@page { size: A4; margin: 16mm 15mm 14mm 15mm; }
* { box-sizing: border-box; }
body {
  font-family: "Iowan Old Style", Georgia, "Times New Roman", serif;
  font-size: 11.4pt; line-height: 1.62; color: #23211c; margin: 0;
  -webkit-print-color-adjust: exact; print-color-adjust: exact;
}
h1 { font-size: 25pt; line-height: 1.16; margin: 0 0 2mm; letter-spacing: -0.4px; color: #1a1815; }
h2 {
  font-size: 14.2pt; margin: 9mm 0 2.5mm; color: #1a1815; letter-spacing: -0.2px;
  padding-bottom: 1.6mm; border-bottom: 1.5px solid #d8d3c6;
}
h3 { font-size: 11.6pt; margin: 5mm 0 1.5mm; color: #6b5330; }
p { margin: 0 0 3.2mm; }
strong { color: #16140f; }
em { color: #55503f; }
a { color: #6b5330; }
.deck {
  font-size: 11pt; color: #6d6857; margin: 0 0 6mm; padding-bottom: 4mm;
  border-bottom: 2.5px solid #8a6d3f;
}
.lede { font-size: 12.6pt; line-height: 1.55; color: #3a362c; }
.pull {
  background: #f6f3ea; border-left: 4px solid #8a6d3f; padding: 4mm 5mm;
  margin: 4mm 0 5mm; font-size: 11.2pt;
}
.pull p:last-child { margin-bottom: 0; }
.assume {
  background: #fbf7ec; border: 1px dashed #c2a878; padding: 3mm 4mm;
  margin: 3.5mm 0; font-size: 10.4pt; color: #5c4a2c;
}
.assume p:last-child { margin-bottom: 0; }
figure { margin: 5mm 0 6mm; page-break-inside: avoid; }
figure img { width: 100%; display: block; border: 1px solid #d5d0c2; }
figcaption { font-size: 9.6pt; color: #6d6857; margin-top: 2mm; line-height: 1.45; }
figcaption b { color: #3a362c; }
ol, ul { margin: 0 0 3.5mm; padding-left: 6mm; }
li { margin-bottom: 2mm; }
.stages { list-style: none; padding: 0; margin: 3mm 0 4mm; counter-reset: st; }
.stages li {
  counter-increment: st; position: relative; padding: 0 0 0 11mm; margin-bottom: 3.2mm;
  page-break-inside: avoid;
}
.stages li::before {
  content: counter(st); position: absolute; left: 0; top: -0.4mm;
  width: 7.5mm; height: 7.5mm; border-radius: 50%; background: #8a6d3f; color: #fff;
  font-size: 10pt; font-weight: bold; text-align: center; line-height: 7.5mm;
  font-family: -apple-system, Helvetica, sans-serif;
}
.stages b { display: block; font-size: 11.4pt; }
.q {
  border: 1.5px solid #cfc7b4; border-radius: 2mm; padding: 4mm 5mm 4mm;
  margin: 0 0 4mm; page-break-inside: avoid; background: #fdfcf8;
}
.q .num {
  display: inline-block; background: #8a6d3f; color: #fff; font-size: 9.4pt; font-weight: bold;
  padding: 0.6mm 2.6mm; border-radius: 1mm; margin-bottom: 2mm;
  font-family: -apple-system, Helvetica, sans-serif; letter-spacing: 0.4px;
}
.q .ask { font-size: 12.2pt; font-weight: bold; color: #16140f; margin: 0 0 1.5mm; line-height: 1.4; }
.q .why { font-size: 10.3pt; color: #6d6857; margin: 0; }
.q.first { border-color: #8a6d3f; border-width: 2px; background: #f8f5ec; }
.answer { border-top: 1px dotted #c9c1ae; margin-top: 3mm; padding-top: 2mm;
  font-size: 9.4pt; color: #9a927e; font-style: italic; }
.foot {
  margin-top: 8mm; padding-top: 4mm; border-top: 2.5px solid #8a6d3f;
  font-size: 10.6pt; color: #55503f;
}
.pagebreak { page-break-before: always; }
"""

def render(body_html, title):
    return f"""<!doctype html>
<html><head><meta charset="utf-8"><title>{title}</title><style>{CSS}</style></head>
<body>{body_html}</body></html>"""

def to_pdf(html_path, pdf_path):
    subprocess.run([
        "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
        "--headless", "--disable-gpu", "--no-pdf-header-footer",
        f"--print-to-pdf={pdf_path}", f"file://{html_path}",
    ], capture_output=True)
    return pathlib.Path(pdf_path).exists()

if __name__ == "__main__":
    body = pathlib.Path(sys.argv[1]).read_text()
    body = body.replace("{{IMG_2BHK}}", f"data:image/png;base64,{b64('2bhk.png')}")
    body = body.replace("{{IMG_MAP}}", f"data:image/png;base64,{b64('map.png')}")
    title = sys.argv[2] if len(sys.argv) > 2 else "UrbanOS"
    html = render(body, title)
    hp = SP / "doc.html"
    hp.write_text(html)
    out_pdf = OUT_DIR / "UrbanOS-for-Mannu.pdf"
    ok = to_pdf(hp, out_pdf)
    print("PDF:", out_pdf, "ok" if ok else "FAILED", out_pdf.stat().st_size // 1024 if ok else "", "KB")
