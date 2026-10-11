"""Splits the two logo pages (exact vectors from SEVEN_Logo_White_and_Teal.pdf) into animatable parts.
Nothing is redrawn or recoloured: every part is the PDF's own SVG markup."""
import json, re, sys
VIEWBOX = [249, 219, 344, 151]  # tight crop around the logo, in PDF points (same for both pages)

def split(svg):
    defs = re.search(r"<defs>(.*?)</defs>", svg, re.S).group(1)
    defs = re.sub(r'<clipPath id="clip-0">.*?</clipPath>', "", defs, flags=re.S)
    body = svg[svg.index("</defs>") + 7: svg.rindex("</svg>")]
    body = re.sub(r'<g clip-path="url\(#clip-0\)">\s*<path[^>]*/>\s*</g>', "", body, count=1)  # page background
    parts = re.findall(r"(<g fill=.*?</g>|<path[^>]*/>)", body, re.S)
    glyph_groups = [p for p in parts if p.startswith("<g")]
    ticks = [p for p in parts if p.startswith("<path") and 'fill="none"' in p]
    bars = [p for p in parts if p.startswith("<path") and 'fill="none"' not in p]
    assert len(glyph_groups) == 3 and len(ticks) == 2 and len(bars) == 4, (len(glyph_groups), len(ticks), len(bars))
    def bbox(p):
        d = re.search(r' d="([^"]+)"', p).group(1)
        nums = list(map(float, re.findall(r"-?\d+\.?\d*", d)))
        xs, ys = nums[0::2], nums[1::2]
        return [min(xs), min(ys), max(xs), max(ys)]
    return {
        "defs": defs,
        "se": glyph_groups[0], "en": glyph_groups[1], "tagline": glyph_groups[2],
        "tickShort": ticks[0].replace("<path ", '<path pathLength="1" '),
        "tickLong": ticks[1].replace("<path ", '<path pathLength="1" '),
        "bars": bars, "barBoxes": [bbox(b) for b in bars],
    }

out = {"viewBox": VIEWBOX,
       "onWhite": split(open(sys.argv[1]).read()),   # page 1: dark lettering
       "onTeal": split(open(sys.argv[2]).read())}    # page 2: white lettering
# Glyph ids differ between pages: prefix them so both can live in one document.
for k, pre in (("onWhite", "w"), ("onTeal", "t")):
    for key in ("defs", "se", "en", "tagline"):
        out[k][key] = out[k][key].replace('id="glyph-', f'id="{pre}glyph-').replace('href="#glyph-', f'href="#{pre}glyph-')
json.dump(out, open(sys.argv[3], "w"), indent=1)
print("ok", out["onTeal"]["barBoxes"])
