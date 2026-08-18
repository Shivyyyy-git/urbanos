# Mannu briefing document

Regenerates `output/docs/UrbanOS-for-Mannu.pdf` (and `.html`).

- `body.html` — the document text. Edit this.
- `img/` — the two embedded drawings, exported from the shipped artifacts.
- `build_doc.py` — inlines the images as base64 and prints to PDF via headless Chrome.

```bash
cd tools/mannu-doc && python3 build_doc.py body.html "UrbanOS — for Mannu"
```

Images were exported with:

```bash
sips -s format png --resampleWidth 1400 \
  output/townhouse-demo/slice-a/community-one-DEMO-slice-a-presentation-map.pdf \
  --out tools/mannu-doc/img/map.png
```

Re-export `map.png` after each god-level map revision so the document shows current work.
