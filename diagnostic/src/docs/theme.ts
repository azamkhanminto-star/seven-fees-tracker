/** Print stylesheet for all SEVEN documents: teal and white, with the logo's four-colour bars. */
export const THEME_CSS = `
:root {
  --teal: #0F766E;
  --teal-dark: #0B4F4A;
  --teal-deep: #083B37;
  --teal-50: #EEF6F5;
  --teal-100: #D5EAE7;
  --teal-200: #A9D3CD;
  --ink: #0E0F12;
  --body: #26302F;
  --muted: #5F6F6D;
  --line: #DCE6E4;
  --yellow: #FFC72C;
  --yellow-soft: #FFF3CC;
  --red: #FF5A4E;
  --red-soft: #FFE7E5;
  --green: #22B573;
  --green-soft: #E2F6EC;
  --blue: #3D8BFF;
}
* { box-sizing: border-box; }
html, body { margin: 0; padding: 0; }
body {
  font-family: Poppins, "Noto Sans", "Noto Sans Math", "Noto Sans Devanagari", sans-serif;
  color: var(--body); font-size: 9.6pt; line-height: 1.5;
  -webkit-print-color-adjust: exact; print-color-adjust: exact;
}
.hi, [lang=hi] { font-family: "Noto Sans Devanagari", "Noto Sans", Poppins, sans-serif; }
h1, h2, h3, h4 { color: var(--ink); margin: 0; line-height: 1.15; font-weight: 700; }
p { margin: 0 0 6pt; }
strong { color: var(--ink); font-weight: 600; }
.muted { color: var(--muted); }
.small { font-size: 8.4pt; }
.tiny { font-size: 7.4pt; letter-spacing: .14em; text-transform: uppercase; }

/* ── page model: covers are full-bleed; body pages get margins + running footer from the PDF step */
@page { size: A4; margin: 0; }
.sheet { width: 210mm; min-height: 297mm; position: relative; overflow: hidden; break-after: page; }
.sheet:last-child { break-after: auto; }
.flow { padding: 0; }
.page-break { break-before: page; }
.avoid { break-inside: avoid; }

/* ── four-colour bars from the logo */
.bars { display: flex; gap: 4pt; height: 4pt; width: 120pt; }
.bars i { display: block; height: 100%; border-radius: 4pt; }
.bars i:nth-child(1) { background: var(--yellow); flex: 9; }
.bars i:nth-child(2) { background: var(--red); flex: 4.5; }
.bars i:nth-child(3) { background: var(--green); flex: 7; }
.bars i:nth-child(4) { background: var(--blue); flex: 5.5; }
.bars.light i:nth-child(2) { background: #FF8A80; }
.bars.light i:nth-child(3) { background: #7FE0B4; }
.bars.light i:nth-child(4) { background: #8EC2FF; }

/* ── cover */
.cover { background: #fff; }
.cover .top { padding: 16mm 16mm 0; display: flex; justify-content: space-between; align-items: flex-start; height: 62mm; }
.cover .top img { height: 15mm; }
.cover .kicker { color: var(--muted); font-size: 7.6pt; letter-spacing: .28em; text-transform: uppercase; margin-top: 3mm; }
.cover .lead { position: absolute; left: 16mm; top: 34mm; width: 92mm; color: var(--muted); font-size: 8.6pt; }
.cover .band {
  position: absolute; left: 0; right: 0; top: 62mm; bottom: 0;
  background: var(--teal-dark);
  background-image: repeating-linear-gradient(115deg, rgba(255,255,255,.035) 0 1.2mm, transparent 1.2mm 7mm);
}
.cover .year {
  position: absolute; right: 8mm; top: 72mm; font-weight: 700; font-size: 66pt; letter-spacing: .04em;
  color: rgba(255,255,255,.07); writing-mode: vertical-rl;
}
.cover .title-strip { position: absolute; left: 0; right: 0; top: 128mm; height: 52mm; background: rgba(0,0,0,.14); }
.cover .title { position: absolute; left: 16mm; top: 134mm; color: #fff; }
.cover .title h1 { color: #fff; font-size: 34pt; line-height: 1.05; font-weight: 700; }
.cover .title h1 span { display: block; font-weight: 300; font-family: Poppins, sans-serif; }
.cover .title .bars { margin-top: 7mm; width: 70mm; }
.cover .rule { position: absolute; left: 16mm; right: 30mm; top: 182mm; height: 0.4pt; background: rgba(255,255,255,.28); }
.cover .foot { position: absolute; left: 16mm; right: 16mm; bottom: 20mm; display: flex; justify-content: space-between; align-items: flex-end; color: #fff; }
.cover .foot .sub b { display: block; font-weight: 600; }
.cover .foot .sub { font-size: 8.8pt; color: rgba(255,255,255,.88); max-width: 85mm; }
.cover .foot .who { font-size: 8.4pt; color: rgba(255,255,255,.8); min-width: 60mm; }
.cover .foot .who b { color: #fff; font-weight: 600; display: block; margin-bottom: 2mm; }
.cover .badge { display: inline-block; border: 0.6pt solid rgba(255,255,255,.5); color: #fff; font-size: 7pt; letter-spacing: .2em; padding: 1.2mm 3mm; border-radius: 2mm; margin-top: 3mm; }

/* ── section heads */
.part-head { background: var(--teal-dark); color: #fff; padding: 7mm 8mm; border-radius: 0 0 3mm 3mm; margin: 0 0 6mm; position: relative; }
.part-head .tiny { color: var(--yellow); }
.part-head h2 { color: #fff; font-size: 20pt; margin-top: 1.5mm; }
.part-head p { margin: 1.5mm 0 0; color: rgba(255,255,255,.85); font-size: 9pt; }
.h-big { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 5mm; padding-top: 2mm; }
/* padding-top: large glyphs at the top of a page otherwise paint a sliver onto the previous page (Chromium) */
.h-big h2 { font-size: 24pt; line-height: 1.08; }
.h-big h2 em { font-style: normal; color: var(--teal); display: block; }
.h-big .num { font-size: 40pt; font-weight: 700; color: var(--teal-100); line-height: 1; }
.label { color: var(--teal); font-weight: 600; font-size: 8.6pt; margin-bottom: 1.5mm; }
.area-head { background: var(--teal); color: #fff; padding: 4mm 6mm; border-radius: 2mm; margin: 6mm 0 4mm; }
.area-head .tiny { color: var(--yellow); }
.area-head h3 { color: #fff; font-size: 13pt; margin-top: 1mm; }
.area-head p { margin: .5mm 0 0; font-size: 8.6pt; color: rgba(255,255,255,.88); }
h3.sub { font-size: 10.5pt; margin: 4mm 0 2mm; }

/* ── cards and callouts */
.card { border: 0.6pt solid var(--line); border-radius: 2.5mm; padding: 4mm 5mm; background: #fff; }
.card.soft { background: var(--teal-50); border-color: var(--teal-100); }
.callout { background: var(--yellow-soft); border-left: 1.4mm solid var(--yellow); padding: 4mm 5mm; border-radius: 0 2mm 2mm 0; margin: 4mm 0; }
.callout h4 { font-size: 10pt; margin-bottom: 1mm; }
.callout.teal { background: var(--teal-50); border-left-color: var(--teal); }
.quote-box { background: var(--teal); color: #fff; border-radius: 2.5mm; padding: 6mm 7mm 6mm 18mm; position: relative; margin-top: 6mm; }
.quote-box::before { content: "“"; position: absolute; left: 6mm; top: 2mm; font-size: 34pt; font-weight: 700; color: var(--yellow); }
.quote-box h4 { color: #fff; font-size: 10.5pt; margin-bottom: 1.5mm; }
.quote-box p { color: rgba(255,255,255,.92); margin: 0; }
.wrong { color: #D93A2F; }
.right { color: var(--green); }

/* ── mistakes report */
.overview-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 6mm; }
.stat { font-size: 26pt; font-weight: 700; color: var(--teal); line-height: 1; }
.stat-label { color: var(--muted); font-size: 8pt; margin-top: 1mm; }
.stats { display: flex; gap: 10mm; justify-content: flex-end; }
.mistake-list { margin: 0; padding: 0; list-style: none; }
.mistake-list li { display: grid; grid-template-columns: 11mm 1fr; gap: 2mm; padding: 2.4mm 0; border-bottom: 0.5pt solid var(--line); }
.mistake-list .n { font-weight: 700; color: var(--teal); font-size: 12pt; }
.mistake-list b { color: var(--ink); display: block; font-weight: 600; }
.writes { background: var(--teal-dark); color: #fff; border-radius: 2.5mm; padding: 6mm 7mm;
  background-image: repeating-linear-gradient(115deg, rgba(255,255,255,.04) 0 1.2mm, transparent 1.2mm 7mm); }
.writes .tiny { color: rgba(255,255,255,.65); margin-bottom: 1.5mm; }
.writes .bad { color: #FF8A80; font-weight: 600; font-size: 11.5pt; margin-bottom: 5mm; }
.writes .good { color: var(--yellow); font-weight: 600; font-size: 11.5pt; }
.ev { display: grid; grid-template-columns: 8mm 1fr; gap: 3mm; margin-bottom: 4mm; }
.ev .dot { width: 7mm; height: 7mm; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-weight: 700; font-size: 8pt; color: var(--ink); background: var(--yellow); }
.ev .dot.alt { background: var(--teal-dark); color: #fff; }
.ev h4 { font-size: 9.4pt; margin-bottom: .5mm; }
.mistake-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 8mm; align-items: start; margin-top: 4mm; }
.split li { margin-bottom: 1mm; }
.split .sw { display: inline-block; width: 2.4mm; height: 2.4mm; border-radius: 50%; margin-right: 2mm; background: var(--teal); }

/* ── tables */
table { width: 100%; border-collapse: collapse; font-size: 8.6pt; }
th { text-align: left; color: var(--teal-dark); font-weight: 600; font-size: 8pt; padding: 2mm 2.5mm; border-bottom: 1pt solid var(--teal); }
td { padding: 2mm 2.5mm; border-bottom: 0.5pt solid var(--line); vertical-align: top; }
tr { break-inside: avoid; }
td.ok { color: var(--green); font-weight: 600; white-space: nowrap; }
td.cls, td.nowrap { white-space: nowrap; }

/* ── lineage chains */
.chain { display: flex; flex-wrap: wrap; align-items: center; gap: 1.5mm 1.2mm; margin: 1mm 0 3mm; }
.pill { border: 0.6pt solid var(--teal-200); border-radius: 1.6mm; padding: 1mm 2.2mm; font-size: 7.8pt; background: #fff; }
.pill b { color: var(--teal-dark); font-weight: 600; }
.pill.cur { background: var(--teal); border-color: var(--teal); color: #fff; }
.pill.cur b { color: #fff; }
.pill.brk { background: var(--yellow); border-color: var(--yellow); color: var(--ink); }
.pill.brk b { color: var(--ink); }
.arrow { color: var(--yellow); font-weight: 700; font-size: 9pt; }
.hl { background: var(--yellow); padding: 0 1.2mm; border-radius: 1mm; color: var(--ink); font-weight: 600; }

/* ── workbook */
.level-head { background: var(--teal-dark); color: #fff; padding: 4mm 6mm; border-radius: 0 0 2.5mm 2.5mm; margin-bottom: 4mm; }
.level-head .tiny { color: var(--yellow); }
.level-head h2 { color: #fff; font-size: 14pt; margin-top: 1mm; }
.see { background: var(--teal-50); border-left: 1.2mm solid var(--teal); padding: 3mm 4mm; margin: 3mm 0; border-radius: 0 2mm 2mm 0; }
.see h4 { font-size: 9pt; margin-bottom: 1mm; }
.ex { background: #F5F7F7; border-radius: 2mm; padding: 2.6mm 4mm; margin-bottom: 2.4mm; }
.ex b { display: block; color: var(--ink); }
ol.practice { margin: 0 0 3mm; padding-left: 6mm; }
ol.practice li { margin-bottom: .8mm; }
.watch li { list-style: none; margin-left: -5mm; }
.watch li::before { content: "✗ "; color: #D93A2F; font-weight: 700; }
.checkpoint { border: 0.9pt solid var(--teal); border-radius: 2.5mm; padding: 3mm 5mm; margin-top: 3mm; break-inside: avoid; }
.checkpoint .row { display: flex; justify-content: space-between; align-items: center; margin-bottom: 1.5mm; }
.checkpoint h4 { font-size: 10pt; color: var(--teal-dark); }
.need { background: var(--yellow); color: var(--ink); font-size: 7.4pt; font-weight: 600; padding: .8mm 2.4mm; border-radius: 1.2mm; }
.score { text-align: right; font-weight: 600; color: var(--ink); margin-top: 1mm; }
.answers { border-top: 0.5pt dashed var(--line); margin-top: 4mm; padding-top: 2mm; font-size: 7.8pt; color: var(--muted); }
.term { font-weight: 600; }
.term .hi { font-weight: 400; color: var(--teal); }
.plan-table td:last-child { width: 14mm; }
.tick-box { display: inline-block; width: 4mm; height: 4mm; border: 0.7pt solid var(--teal-200); border-radius: .8mm; }

/* ── question papers */
.paper-head { display: flex; justify-content: space-between; align-items: center; border-bottom: 1.2pt solid var(--teal); padding-bottom: 3mm; margin-bottom: 4mm; }
.paper-head img { height: 10mm; }
.paper-title h1 { font-size: 20pt; }
.paper-title .muted { font-size: 8pt; letter-spacing: .14em; text-transform: uppercase; }
.fields { display: grid; grid-template-columns: 2fr 1fr 1fr; gap: 4mm; margin: 4mm 0; }
.field { border-bottom: 0.6pt solid var(--muted); padding-bottom: 6mm; font-size: 7.6pt; color: var(--muted); }
.boxes { display: grid; grid-template-columns: repeat(3, 1fr); gap: 3mm; margin-bottom: 5mm; }
.boxes .card h4 { font-size: 9pt; margin-bottom: 1mm; color: var(--teal-dark); }
.sec-head { display: flex; justify-content: space-between; align-items: baseline; background: var(--teal-50); padding: 2mm 4mm; border-radius: 1.5mm; margin: 5mm 0 2mm; }
.sec-head h3 { font-size: 11pt; color: var(--teal-dark); }
.qrow { display: grid; grid-template-columns: 11mm 1fr 10mm; gap: 2mm; padding: 2mm 0; break-inside: avoid; }
.qrow .qn { font-weight: 600; color: var(--teal-dark); }
.qrow .mk { text-align: right; color: var(--muted); font-size: 8pt; }
.space { height: 14mm; }

/* ── parent summary */
.parent-cols { display: grid; grid-template-columns: 1fr 1fr; gap: 8mm; }
.parent-cols h4 { color: var(--teal); font-size: 9.6pt; margin: 4mm 0 1mm; }
`;
