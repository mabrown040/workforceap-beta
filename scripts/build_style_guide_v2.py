"""WorkforceAP Brand Style Guide v2 — HTML → PDF via Playwright."""
import base64, subprocess, sys
from pathlib import Path

LOGO_PATH = Path('/home/claw/.openclaw/workspace/projects/workforceap-beta/public/images/logo-tight.png')
logo_b64 = base64.b64encode(LOGO_PATH.read_bytes()).decode()
LOGO_DATA = f"data:image/png;base64,{logo_b64}"

HTML = f"""<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>WorkforceAP Brand Style Guide 2026</title>
<style>
  @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800;900&display=swap');

  :root {{
    --accent: #AD2C4D;
    --accent-dark: #8B1F38;
    --accent-light: #FFB2BC;
    --gold: #FFBB00;
    --gold-light: #FFD54F;
    --near-black: #121416;
    --dark-surface: #1A1C1E;
    --dark-surface-high: #282A2C;
    --text-primary: #1C1B1B;
    --text-secondary: #584144;
    --surface: #FAFAFA;
    --surface-low: #F7F8FA;
    --border: #E8E8E8;
    --green: #4A9B4F;
    --blue: #2B7BB9;
    --white: #FFFFFF;
  }}

  * {{ box-sizing: border-box; margin: 0; padding: 0; }}

  body {{
    font-family: 'Inter', -apple-system, sans-serif;
    font-size: 10pt;
    line-height: 1.5;
    color: var(--text-primary);
    background: white;
    -webkit-print-color-adjust: exact;
    print-color-adjust: exact;
  }}

  /* ─── Page layout ─── */
  .page {{
    width: 210mm;
    min-height: 297mm;
    padding: 0;
    page-break-after: always;
    position: relative;
    overflow: hidden;
  }}
  .page:last-child {{ page-break-after: avoid; }}

  @page {{
    size: A4;
    margin: 0;
  }}

  @media print {{
    .page {{ page-break-after: always; }}
  }}

  /* ─── Cover ─── */
  .cover {{
    background: var(--near-black);
    display: flex;
    flex-direction: column;
    justify-content: space-between;
    padding: 0;
  }}
  .cover-top-stripe {{
    height: 6px;
    background: var(--accent);
  }}
  .cover-body {{
    padding: 60px 64px;
    flex: 1;
    display: flex;
    flex-direction: column;
    justify-content: center;
  }}
  .cover-logo {{
    height: 36px;
    width: auto;
    margin-bottom: 80px;
    filter: brightness(10);
  }}
  .cover-eyebrow {{
    font-size: 9pt;
    font-weight: 700;
    letter-spacing: 0.15em;
    text-transform: uppercase;
    color: var(--accent-light);
    margin-bottom: 16px;
  }}
  .cover-title {{
    font-size: 52pt;
    font-weight: 900;
    line-height: 0.9;
    letter-spacing: -0.03em;
    color: white;
    margin-bottom: 8px;
  }}
  .cover-title span {{ color: var(--accent-light); }}
  .cover-subtitle {{
    font-size: 18pt;
    font-weight: 300;
    color: rgba(255,255,255,0.6);
    margin-top: 20px;
    margin-bottom: 48px;
  }}
  .cover-meta {{
    font-size: 8pt;
    color: rgba(255,255,255,0.35);
    letter-spacing: 0.05em;
  }}
  .cover-bottom-bar {{
    height: 80px;
    background: var(--accent);
    display: flex;
    align-items: center;
    padding: 0 64px;
  }}
  .cover-bottom-text {{
    font-size: 9pt;
    font-weight: 700;
    letter-spacing: 0.12em;
    text-transform: uppercase;
    color: rgba(255,255,255,0.8);
  }}
  .cover-decor {{
    position: absolute;
    right: -60px;
    top: 30%;
    width: 320px;
    height: 320px;
    border-radius: 50%;
    background: rgba(173,44,77,0.12);
  }}
  .cover-decor2 {{
    position: absolute;
    right: 60px;
    top: 15%;
    width: 160px;
    height: 160px;
    border-radius: 50%;
    background: rgba(255,187,0,0.08);
  }}

  /* ─── Inner pages ─── */
  .inner-page {{
    background: white;
    padding: 0;
  }}
  .page-header {{
    height: 14px;
    background: var(--accent);
    display: flex;
    align-items: center;
    padding: 0 32px;
  }}
  .page-content {{
    padding: 32px 40px 28px;
  }}
  .page-footer {{
    position: absolute;
    bottom: 0;
    left: 0;
    right: 0;
    height: 36px;
    border-top: 1px solid var(--border);
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 0 40px;
    font-size: 7pt;
    color: #aaa;
  }}

  /* ─── Section header ─── */
  .section-num {{
    font-size: 42pt;
    font-weight: 900;
    color: var(--accent);
    opacity: 0.15;
    line-height: 1;
    float: right;
    margin-top: -4px;
  }}
  .section-eyebrow {{
    font-size: 7.5pt;
    font-weight: 700;
    letter-spacing: 0.18em;
    text-transform: uppercase;
    color: var(--accent);
    margin-bottom: 6px;
  }}
  .section-title {{
    font-size: 22pt;
    font-weight: 800;
    letter-spacing: -0.02em;
    color: var(--text-primary);
    margin-bottom: 6px;
    line-height: 1.1;
  }}
  .section-desc {{
    font-size: 9.5pt;
    color: var(--text-secondary);
    margin-bottom: 20px;
  }}
  .divider {{
    height: 1px;
    background: var(--border);
    margin-bottom: 20px;
  }}

  /* ─── Color swatches ─── */
  .swatch-grid {{
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    gap: 12px;
    margin-bottom: 20px;
  }}
  .swatch {{
    border-radius: 8px;
    overflow: hidden;
    border: 1px solid rgba(0,0,0,0.06);
  }}
  .swatch-color {{
    height: 56px;
  }}
  .swatch-info {{
    padding: 8px 10px;
    background: var(--surface-low);
  }}
  .swatch-name {{
    font-size: 8pt;
    font-weight: 700;
    color: var(--text-primary);
    margin-bottom: 2px;
  }}
  .swatch-hex {{
    font-size: 7.5pt;
    font-family: 'Courier New', monospace;
    color: var(--text-secondary);
    margin-bottom: 2px;
  }}
  .swatch-usage {{
    font-size: 7pt;
    color: #888;
    line-height: 1.3;
  }}

  /* ─── Type scale ─── */
  .type-row {{
    display: grid;
    grid-template-columns: 100px 1fr;
    gap: 12px;
    align-items: start;
    padding: 12px 0;
    border-bottom: 1px solid var(--border);
  }}
  .type-meta {{
    padding-top: 4px;
  }}
  .type-label {{ font-size: 7.5pt; font-weight: 700; color: var(--text-secondary); margin-bottom: 2px; }}
  .type-spec {{ font-size: 7pt; font-family: 'Courier New', monospace; color: #aaa; }}
  .type-display {{ font-size: 28pt; font-weight: 800; letter-spacing: -0.03em; line-height: 1; color: var(--text-primary); }}
  .type-h2 {{ font-size: 20pt; font-weight: 700; letter-spacing: -0.02em; color: var(--text-primary); }}
  .type-h3 {{ font-size: 15pt; font-weight: 700; color: var(--text-primary); }}
  .type-h4 {{ font-size: 12pt; font-weight: 700; color: var(--text-primary); }}
  .type-body {{ font-size: 10pt; font-weight: 400; line-height: 1.6; color: var(--text-primary); }}
  .type-small {{ font-size: 8pt; color: var(--text-secondary); line-height: 1.5; }}
  .type-label-upper {{ font-size: 8pt; font-weight: 700; letter-spacing: 0.1em; text-transform: uppercase; color: var(--accent); }}

  /* ─── Table ─── */
  table {{
    width: 100%;
    border-collapse: collapse;
    font-size: 8.5pt;
    margin-bottom: 16px;
  }}
  th {{
    background: var(--near-black);
    color: white;
    font-weight: 700;
    padding: 8px 10px;
    text-align: left;
    font-size: 8pt;
  }}
  td {{
    padding: 7px 10px;
    border-bottom: 1px solid var(--border);
    vertical-align: top;
    line-height: 1.4;
  }}
  tr:nth-child(even) td {{ background: var(--surface-low); }}
  td.token {{ font-family: 'Courier New', monospace; color: var(--accent); font-size: 8pt; }}
  td.val {{ font-family: 'Courier New', monospace; font-size: 8pt; }}

  /* ─── Buttons ─── */
  .btn-showcase {{
    display: flex;
    gap: 12px;
    flex-wrap: wrap;
    margin-bottom: 16px;
    align-items: center;
  }}
  .btn {{
    display: inline-flex;
    align-items: center;
    gap: 6px;
    padding: 10px 20px;
    border-radius: 8px;
    font-size: 9pt;
    font-weight: 700;
    cursor: default;
    white-space: nowrap;
  }}
  .btn-primary {{ background: var(--accent); color: white; }}
  .btn-secondary {{ background: transparent; color: var(--accent); border: 1.5px solid var(--accent); }}
  .btn-ghost {{ background: transparent; color: var(--text-secondary); border: 1px solid var(--border); }}
  .btn-disabled {{ background: var(--border); color: #aaa; cursor: not-allowed; }}
  .btn-gold {{ background: var(--near-black); color: var(--gold); border: 1px solid rgba(255,187,0,0.3); }}

  /* ─── Do/Don't ─── */
  .do-dont {{
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 12px;
    margin-bottom: 16px;
  }}
  .do-box {{ border-radius: 8px; padding: 14px; border-left: 3px solid var(--green); background: rgba(74,155,79,0.05); }}
  .dont-box {{ border-radius: 8px; padding: 14px; border-left: 3px solid var(--accent); background: rgba(173,44,77,0.04); }}
  .do-label {{ font-size: 7.5pt; font-weight: 700; color: var(--green); letter-spacing: 0.1em; text-transform: uppercase; margin-bottom: 6px; }}
  .dont-label {{ font-size: 7.5pt; font-weight: 700; color: var(--accent); letter-spacing: 0.1em; text-transform: uppercase; margin-bottom: 6px; }}
  .do-example {{ font-size: 9pt; color: var(--text-primary); line-height: 1.4; }}

  /* ─── Cards ─── */
  .card-grid {{
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 12px;
    margin-bottom: 16px;
  }}
  .card {{
    border-radius: 10px;
    padding: 16px;
    font-size: 8.5pt;
  }}
  .card-default {{ border: 1px solid var(--border); background: white; }}
  .card-elevated {{ border: 1px solid var(--border); background: var(--surface-low); box-shadow: 0 2px 8px rgba(0,0,0,0.06); }}
  .card-accent {{ background: var(--accent); color: white; }}
  .card-dark {{ background: var(--near-black); color: white; }}
  .card-gold-border {{ border: 1.5px solid var(--gold); background: white; }}
  .card-title {{ font-weight: 700; font-size: 9.5pt; margin-bottom: 4px; }}
  .card-text {{ line-height: 1.5; opacity: 0.8; }}

  /* ─── Dark strip example ─── */
  .dark-strip {{
    background: var(--near-black);
    border-radius: 10px;
    padding: 24px 28px;
    color: white;
    margin-bottom: 16px;
    position: relative;
    overflow: hidden;
  }}
  .dark-strip::after {{
    content: '';
    position: absolute;
    right: -40px;
    top: -40px;
    width: 160px;
    height: 160px;
    border-radius: 50%;
    background: rgba(173,44,77,0.18);
  }}
  .dark-strip-eyebrow {{
    font-size: 8pt;
    font-weight: 700;
    letter-spacing: 0.15em;
    text-transform: uppercase;
    color: var(--gold);
    margin-bottom: 8px;
  }}
  .dark-strip-title {{
    font-size: 16pt;
    font-weight: 800;
    letter-spacing: -0.02em;
    line-height: 1.1;
    margin-bottom: 8px;
  }}
  .dark-strip-body {{
    font-size: 9pt;
    color: rgba(255,255,255,0.7);
    margin-bottom: 16px;
    max-width: 340px;
  }}

  /* ─── Spacing viz ─── */
  .spacing-viz {{
    display: flex;
    gap: 0;
    align-items: flex-end;
    margin-bottom: 12px;
  }}
  .sp-block {{
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 4px;
    margin-right: 8px;
  }}
  .sp-rect {{
    background: var(--accent);
    width: 100%;
    min-width: 24px;
    border-radius: 3px;
    opacity: 0.8;
  }}
  .sp-label {{
    font-size: 6.5pt;
    color: var(--text-secondary);
    text-align: center;
    font-family: 'Courier New', monospace;
  }}

  /* ─── Two-col layout helper ─── */
  .two-col {{
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 24px;
  }}
  .label-sm {{
    font-size: 7.5pt;
    font-weight: 700;
    letter-spacing: 0.1em;
    text-transform: uppercase;
    color: var(--text-secondary);
    margin-bottom: 8px;
  }}

  /* ─── Quick ref ─── */
  .qr-grid {{
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 10px;
  }}
  .qr-item {{
    border-radius: 8px;
    padding: 12px 14px;
    background: var(--surface-low);
    border: 1px solid var(--border);
  }}
  .qr-cat {{
    font-size: 7pt;
    font-weight: 700;
    letter-spacing: 0.1em;
    text-transform: uppercase;
    color: var(--accent);
    margin-bottom: 4px;
  }}
  .qr-rule {{
    font-size: 8.5pt;
    color: var(--text-primary);
    line-height: 1.4;
  }}

  /* ─── TOC ─── */
  .toc-row {{
    display: flex;
    align-items: baseline;
    gap: 8px;
    padding: 8px 0;
    border-bottom: 1px solid var(--border);
  }}
  .toc-num {{ font-size: 10pt; font-weight: 800; color: var(--accent); width: 28px; flex-shrink: 0; }}
  .toc-title {{ font-size: 10pt; font-weight: 600; color: var(--text-primary); flex: 1; }}
  .toc-desc {{ font-size: 8pt; color: var(--text-secondary); }}

  /* ─── Logo usage ─── */
  .logo-grid {{
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 12px;
    margin-bottom: 16px;
  }}
  .logo-box {{
    border-radius: 10px;
    padding: 24px;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 12px;
    border: 1px solid var(--border);
  }}
  .logo-box img {{ max-width: 120px; height: auto; }}
  .logo-caption {{ font-size: 7.5pt; color: var(--text-secondary); text-align: center; }}
  .logo-box-dark {{ background: var(--near-black); border-color: transparent; }}
  .logo-box-accent {{ background: var(--accent); border-color: transparent; }}
  .logo-box-dark img, .logo-box-accent img {{ filter: brightness(10); }}
</style>
</head>
<body>

<!-- ═══ PAGE 1: COVER ═══ -->
<div class="page cover">
  <div class="cover-top-stripe"></div>
  <div class="cover-decor"></div>
  <div class="cover-decor2"></div>
  <div class="cover-body">
    <img src="{LOGO_DATA}" class="cover-logo" alt="WorkforceAP">
    <div class="cover-eyebrow">Visual Identity &amp; Design System</div>
    <div class="cover-title">Brand<br><span>Style</span><br>Guide</div>
    <div class="cover-subtitle">Marketing Standards for WorkforceAP</div>
    <div class="cover-meta">Version 2.0 &nbsp;·&nbsp; March 2026 &nbsp;·&nbsp; Confidential</div>
  </div>
  <div class="cover-bottom-bar">
    <span class="cover-bottom-text">workforceap.org &nbsp;·&nbsp; Building Tomorrow's Workforce</span>
  </div>
</div>

<!-- ═══ PAGE 2: TOC ═══ -->
<div class="page inner-page">
  <div class="page-header"></div>
  <div class="page-content">
    <div class="section-num">00</div>
    <div class="section-eyebrow">Navigation</div>
    <div class="section-title">Contents</div>
    <div class="divider"></div>

    <div class="toc-row"><span class="toc-num">01</span><span class="toc-title">Brand Identity</span><span class="toc-desc">Mission, voice, positioning</span></div>
    <div class="toc-row"><span class="toc-num">02</span><span class="toc-title">Color System</span><span class="toc-desc">Primary palette, semantic colors, dark mode</span></div>
    <div class="toc-row"><span class="toc-num">03</span><span class="toc-title">Typography</span><span class="toc-desc">Typeface, scale, hierarchy</span></div>
    <div class="toc-row"><span class="toc-num">04</span><span class="toc-title">Spacing &amp; Layout</span><span class="toc-desc">Grid, tokens, breakpoints</span></div>
    <div class="toc-row"><span class="toc-num">05</span><span class="toc-title">Buttons &amp; CTAs</span><span class="toc-desc">Primary, secondary, ghost, disabled states</span></div>
    <div class="toc-row"><span class="toc-num">06</span><span class="toc-title">Cards &amp; Surfaces</span><span class="toc-desc">Elevation, containers, dark mode surfaces</span></div>
    <div class="toc-row"><span class="toc-num">07</span><span class="toc-title">Logo Usage</span><span class="toc-desc">Placement, clear space, color variants</span></div>
    <div class="toc-row"><span class="toc-num">08</span><span class="toc-title">Photography &amp; Imagery</span><span class="toc-desc">Shot style, overlays, diversity standards</span></div>
    <div class="toc-row"><span class="toc-num">09</span><span class="toc-title">Voice &amp; Copy</span><span class="toc-desc">Tone, do/don't, terminology</span></div>
    <div class="toc-row"><span class="toc-num">10</span><span class="toc-title">Document Templates</span><span class="toc-desc">Email, report, letterhead examples</span></div>
    <div class="toc-row"><span class="toc-num">11</span><span class="toc-title">Quick Reference</span><span class="toc-desc">All rules on one page</span></div>

    <div style="margin-top:32px; background:var(--near-black); border-radius:10px; padding:20px 24px; color:white;">
      <div style="font-size:8pt; font-weight:700; letter-spacing:0.12em; text-transform:uppercase; color:var(--gold); margin-bottom:8px;">How to use this guide</div>
      <div style="font-size:9pt; color:rgba(255,255,255,0.75); line-height:1.6;">
        This document defines visual and verbal standards for all WorkforceAP marketing materials —
        website, social media, printed collateral, presentations, and partner communications.
        When in doubt: use the color tokens, not hardcoded values. Use the typeface, not alternatives.
        Use the terminology list, not synonyms.
      </div>
    </div>
  </div>
  <div class="page-footer">
    <span>WorkforceAP Brand Style Guide v2.0 — Confidential</span>
    <span>2</span>
  </div>
</div>

<!-- ═══ PAGE 3: BRAND IDENTITY ═══ -->
<div class="page inner-page">
  <div class="page-header"></div>
  <div class="page-content">
    <div class="section-num">01</div>
    <div class="section-eyebrow">01 — Brand Identity</div>
    <div class="section-title">Who We Are</div>
    <div class="section-desc">The mission, the model, and how we position against the market.</div>
    <div class="divider"></div>

    <div class="dark-strip">
      <div class="dark-strip-eyebrow">Mission Statement</div>
      <div class="dark-strip-title">Connecting underserved adults, the organizations that serve them, and the employers that need them — in one verified closed loop.</div>
      <div class="dark-strip-body">WorkforceAP is the operating system for workforce development. Free to members. Employer-aligned. Outcome-accountable.</div>
      <div style="display:flex; gap:10px;">
        <div class="btn btn-primary">Apply for Free</div>
        <div class="btn btn-gold">Partner With Us</div>
      </div>
    </div>

    <div class="two-col" style="margin-bottom:16px;">
      <div>
        <div class="label-sm">Brand Personality</div>
        <table>
          <tr><th>Trait</th><th>Meaning</th></tr>
          <tr><td style="font-weight:700; color:var(--accent)">Grounded</td><td>We show outcomes, not promises.</td></tr>
          <tr><td style="font-weight:700; color:var(--accent)">Direct</td><td>Plain language. No corporate jargon.</td></tr>
          <tr><td style="font-weight:700; color:var(--accent)">Warm</td><td>This is someone's livelihood — handle with care.</td></tr>
          <tr><td style="font-weight:700; color:var(--accent)">Ambitious</td><td>We're building infrastructure, not a charity.</td></tr>
          <tr><td style="font-weight:700; color:var(--accent)">Inclusive</td><td>No age gate. No degree. No exclusion.</td></tr>
        </table>
      </div>
      <div>
        <div class="label-sm">What Makes Us Different</div>
        <table>
          <tr><th>We Are</th><th>We're Not</th></tr>
          <tr><td>Free to all qualifying members</td><td>Employer-sponsored only</td></tr>
          <tr><td>Adults 18+ at any career stage</td><td>Recent grads only</td></tr>
          <tr><td>Verified placement + tracking</td><td>Certificate mill</td></tr>
          <tr><td>Full-stack AI platform</td><td>PDF worksheets</td></tr>
          <tr><td>180-day post-placement record</td><td>One-time boot camp</td></tr>
        </table>
      </div>
    </div>
  </div>
  <div class="page-footer">
    <span>WorkforceAP Brand Style Guide v2.0 — Confidential</span>
    <span>3</span>
  </div>
</div>

<!-- ═══ PAGE 4: COLOR SYSTEM ═══ -->
<div class="page inner-page">
  <div class="page-header"></div>
  <div class="page-content">
    <div class="section-num">02</div>
    <div class="section-eyebrow">02 — Color System</div>
    <div class="section-title">Palette</div>
    <div class="section-desc">Built for WCAG AA compliance. Light and dark mode aware.</div>
    <div class="divider"></div>

    <div class="label-sm" style="margin-bottom:8px;">Primary Palette</div>
    <div class="swatch-grid">
      <div class="swatch">
        <div class="swatch-color" style="background:#AD2C4D;"></div>
        <div class="swatch-info"><div class="swatch-name">Crimson (Accent)</div><div class="swatch-hex">#AD2C4D</div><div class="swatch-usage">CTAs, links, accents, hero badges</div></div>
      </div>
      <div class="swatch">
        <div class="swatch-color" style="background:#FFBB00;"></div>
        <div class="swatch-info"><div class="swatch-name">Gold</div><div class="swatch-hex">#FFBB00</div><div class="swatch-usage">Dark backgrounds only — never on light</div></div>
      </div>
      <div class="swatch">
        <div class="swatch-color" style="background:#121416;"></div>
        <div class="swatch-info"><div class="swatch-name">Near Black</div><div class="swatch-hex">#121416</div><div class="swatch-usage">Hero backgrounds, dark surfaces</div></div>
      </div>
      <div class="swatch">
        <div class="swatch-color" style="background:#FFFFFF; border:1px solid #eee;"></div>
        <div class="swatch-info"><div class="swatch-name">White</div><div class="swatch-hex">#FFFFFF</div><div class="swatch-usage">Text on dark backgrounds, surfaces</div></div>
      </div>
    </div>

    <div class="label-sm" style="margin-bottom:8px;">Supporting Palette</div>
    <div class="swatch-grid">
      <div class="swatch">
        <div class="swatch-color" style="background:#8B1F38;"></div>
        <div class="swatch-info"><div class="swatch-name">Accent Dark</div><div class="swatch-hex">#8B1F38</div><div class="swatch-usage">Hover state for Crimson</div></div>
      </div>
      <div class="swatch">
        <div class="swatch-color" style="background:#2B7BB9;"></div>
        <div class="swatch-info"><div class="swatch-name">Blue</div><div class="swatch-hex">#2B7BB9</div><div class="swatch-usage">Links, informational states</div></div>
      </div>
      <div class="swatch">
        <div class="swatch-color" style="background:#4A9B4F;"></div>
        <div class="swatch-info"><div class="swatch-name">Green</div><div class="swatch-hex">#4A9B4F</div><div class="swatch-usage">Success states, positive metrics</div></div>
      </div>
      <div class="swatch">
        <div class="swatch-color" style="background:#584144;"></div>
        <div class="swatch-info"><div class="swatch-name">On Surface Var.</div><div class="swatch-hex">#584144</div><div class="swatch-usage">Secondary text, labels, captions</div></div>
      </div>
    </div>

    <div class="do-dont">
      <div class="do-box">
        <div class="do-label">✓ Use Crimson as the sole CTA color</div>
        <div class="do-example">One primary action per view. Always Crimson (#AD2C4D). Consistent. Trustworthy.</div>
      </div>
      <div class="dont-box">
        <div class="dont-label">✗ Use Gold on light backgrounds</div>
        <div class="do-example">Gold on white = 1.7:1 contrast ratio. Fails WCAG. Use Gold on dark surfaces only.</div>
      </div>
      <div class="do-box">
        <div class="do-label">✓ Use CSS tokens in code</div>
        <div class="do-example" style="font-family:monospace; font-size:8pt;">var(--color-accent) not #AD2C4D<br>var(--color-gold) not #FFBB00</div>
      </div>
      <div class="dont-box">
        <div class="dont-label">✗ Hardcode hex values in new code</div>
        <div class="do-example">Hardcoded colors break dark mode. Always use the CSS token system.</div>
      </div>
    </div>
  </div>
  <div class="page-footer">
    <span>WorkforceAP Brand Style Guide v2.0 — Confidential</span>
    <span>4</span>
  </div>
</div>

<!-- ═══ PAGE 5: TYPOGRAPHY ═══ -->
<div class="page inner-page">
  <div class="page-header"></div>
  <div class="page-content">
    <div class="section-num">03</div>
    <div class="section-eyebrow">03 — Typography</div>
    <div class="section-title">Type System</div>
    <div class="section-desc">Inter is our single typeface. Hierarchy through weight and size — never font switching.</div>
    <div class="divider"></div>

    <div class="type-row">
      <div class="type-meta"><div class="type-label">Display / H1</div><div class="type-spec">40px · 800 · -0.03em</div></div>
      <div class="type-display">Empowering People.</div>
    </div>
    <div class="type-row">
      <div class="type-meta"><div class="type-label">H2</div><div class="type-spec">32px · 700 · -0.02em</div></div>
      <div class="type-h2">Industry-Recognized Certifications</div>
    </div>
    <div class="type-row">
      <div class="type-meta"><div class="type-label">H3</div><div class="type-spec">24px · 700 · -0.01em</div></div>
      <div class="type-h3">Digital Literacy Program</div>
    </div>
    <div class="type-row">
      <div class="type-meta"><div class="type-label">H4</div><div class="type-spec">20px · 700 · 0</div></div>
      <div class="type-h4">Program Requirements</div>
    </div>
    <div class="type-row">
      <div class="type-meta"><div class="type-label">Body</div><div class="type-spec">16px · 400 · 1.6lh</div></div>
      <div class="type-body">WorkforceAP provides free career training to adults at every stage of their journey. Our programs are employer-aligned and outcome-accountable.</div>
    </div>
    <div class="type-row">
      <div class="type-meta"><div class="type-label">Small</div><div class="type-spec">14px · 400 · 1.5lh</div></div>
      <div class="type-small">Program duration: 3–6 months &nbsp;·&nbsp; Cost to member: $0 &nbsp;·&nbsp; CompTIA certified</div>
    </div>
    <div class="type-row">
      <div class="type-meta"><div class="type-label">Label Upper</div><div class="type-spec">10px · 700 · +0.1em</div></div>
      <div class="type-label-upper">Curated Excellence</div>
    </div>

    <div style="margin-top:16px; display:grid; grid-template-columns:1fr 1fr 1fr; gap:10px;">
      <div style="background:var(--surface-low); border-radius:8px; padding:12px;">
        <div class="label-sm" style="margin-bottom:6px;">Line Height</div>
        <div style="font-size:8.5pt; line-height:1.5;">Body: <strong>1.6×</strong><br>Headings: <strong>1.0–1.2×</strong><br>Labels: <strong>1.2×</strong></div>
      </div>
      <div style="background:var(--surface-low); border-radius:8px; padding:12px;">
        <div class="label-sm" style="margin-bottom:6px;">Letter Spacing</div>
        <div style="font-size:8.5pt; line-height:1.5;">Display: <strong>-0.03em</strong><br>Labels: <strong>+0.06–0.15em</strong><br>Body: <strong>0</strong></div>
      </div>
      <div style="background:var(--surface-low); border-radius:8px; padding:12px;">
        <div class="label-sm" style="margin-bottom:6px;">Measure</div>
        <div style="font-size:8.5pt; line-height:1.5;">Body: <strong>65–70 chars</strong><br>Max width: <strong>~680px</strong><br>Headlines: <strong>unrestricted</strong></div>
      </div>
    </div>
  </div>
  <div class="page-footer">
    <span>WorkforceAP Brand Style Guide v2.0 — Confidential</span>
    <span>5</span>
  </div>
</div>

<!-- ═══ PAGE 6: SPACING ═══ -->
<div class="page inner-page">
  <div class="page-header"></div>
  <div class="page-content">
    <div class="section-num">04</div>
    <div class="section-eyebrow">04 — Spacing &amp; Layout</div>
    <div class="section-title">Space &amp; Grid</div>
    <div class="section-desc">8px base grid. Consistent scale. No arbitrary values in new code.</div>
    <div class="divider"></div>

    <div class="two-col">
      <div>
        <div class="label-sm" style="margin-bottom:10px;">Spacing Scale</div>
        <table>
          <tr><th>Token</th><th>Value</th><th>Usage</th></tr>
          <tr><td class="token">--space-1</td><td class="val">4px</td><td>Icon gaps, tight badge padding</td></tr>
          <tr><td class="token">--space-2</td><td class="val">8px</td><td>Compact element padding</td></tr>
          <tr><td class="token">--space-4</td><td class="val">16px</td><td>Standard gap, button padding</td></tr>
          <tr><td class="token">--space-6</td><td class="val">24px</td><td>Card padding, element gaps</td></tr>
          <tr><td class="token">--space-8</td><td class="val">32px</td><td>Section element spacing</td></tr>
          <tr><td class="token">--space-12</td><td class="val">48px</td><td>Mobile section padding</td></tr>
          <tr><td class="token">--space-16</td><td class="val">64px</td><td>Desktop section padding</td></tr>
          <tr><td class="token">--space-24</td><td class="val">96px</td><td>Hero and major section padding</td></tr>
        </table>
      </div>
      <div>
        <div class="label-sm" style="margin-bottom:10px;">Border Radius</div>
        <table>
          <tr><th>Token</th><th>Value</th><th>Usage</th></tr>
          <tr><td class="token">--radius-sm</td><td class="val">4px</td><td>Tags, badges</td></tr>
          <tr><td class="token">--radius-md</td><td class="val">8px</td><td>Buttons, inputs</td></tr>
          <tr><td class="token">--radius-lg</td><td class="val">12px</td><td>Cards, dropdowns</td></tr>
          <tr><td class="token">--radius-xl</td><td class="val">16px</td><td>Modals, prominent containers</td></tr>
          <tr><td class="token">--radius-full</td><td class="val">50px</td><td>Pills, avatars, rounded badges</td></tr>
        </table>
        <div style="margin-top:12px;">
          <div class="label-sm" style="margin-bottom:10px;">Breakpoints</div>
          <table>
            <tr><th>Name</th><th>Range</th></tr>
            <tr><td style="font-weight:700; color:var(--accent)">Mobile</td><td>&lt;640px — single column, 44px touch targets</td></tr>
            <tr><td style="font-weight:700; color:var(--accent)">Tablet</td><td>640–1024px — two-column grid</td></tr>
            <tr><td style="font-weight:700; color:var(--accent)">Desktop</td><td>1024–1440px — full layout</td></tr>
            <tr><td style="font-weight:700; color:var(--accent)">Wide</td><td>&gt;1440px — capped, centered</td></tr>
          </table>
        </div>
      </div>
    </div>

    <div style="margin-top:12px;">
      <div class="label-sm" style="margin-bottom:8px;">Spacing Visualized</div>
      <div class="spacing-viz">
        <div class="sp-block"><div class="sp-rect" style="height:4px;width:24px;"></div><div class="sp-label">4px</div></div>
        <div class="sp-block"><div class="sp-rect" style="height:8px;width:24px;"></div><div class="sp-label">8px</div></div>
        <div class="sp-block"><div class="sp-rect" style="height:12px;width:24px;"></div><div class="sp-label">12px</div></div>
        <div class="sp-block"><div class="sp-rect" style="height:16px;width:24px;"></div><div class="sp-label">16px</div></div>
        <div class="sp-block"><div class="sp-rect" style="height:24px;width:24px;"></div><div class="sp-label">24px</div></div>
        <div class="sp-block"><div class="sp-rect" style="height:32px;width:24px;"></div><div class="sp-label">32px</div></div>
        <div class="sp-block"><div class="sp-rect" style="height:48px;width:24px;"></div><div class="sp-label">48px</div></div>
        <div class="sp-block"><div class="sp-rect" style="height:64px;width:24px;"></div><div class="sp-label">64px</div></div>
        <div class="sp-block"><div class="sp-rect" style="height:96px;width:24px;"></div><div class="sp-label">96px</div></div>
      </div>
    </div>
  </div>
  <div class="page-footer">
    <span>WorkforceAP Brand Style Guide v2.0 — Confidential</span>
    <span>6</span>
  </div>
</div>

<!-- ═══ PAGE 7: BUTTONS ═══ -->
<div class="page inner-page">
  <div class="page-header"></div>
  <div class="page-content">
    <div class="section-num">05</div>
    <div class="section-eyebrow">05 — Buttons &amp; CTAs</div>
    <div class="section-title">Interactive Elements</div>
    <div class="section-desc">One primary action per view. Clear hierarchy. Specific copy.</div>
    <div class="divider"></div>

    <div class="label-sm" style="margin-bottom:10px;">Button Variants</div>
    <div class="btn-showcase">
      <div class="btn btn-primary">Apply for Free</div>
      <div class="btn btn-secondary">Compare Programs</div>
      <div class="btn btn-ghost">Learn More</div>
      <div class="btn btn-disabled">Unavailable</div>
    </div>
    <div class="btn-showcase" style="background:var(--near-black); padding:12px 16px; border-radius:10px; margin-bottom:16px;">
      <div class="btn btn-primary">Apply for Free</div>
      <div class="btn btn-gold">Partner With Us</div>
      <div class="btn" style="background:rgba(255,255,255,0.08); color:white; border:1px solid rgba(255,255,255,0.15);">Explore Programs</div>
    </div>

    <div class="two-col">
      <div>
        <div class="label-sm" style="margin-bottom:8px;">Button Hierarchy Rules</div>
        <table>
          <tr><th>Type</th><th>When to Use</th></tr>
          <tr><td style="font-weight:700; color:var(--accent)">Primary</td><td>One per screen. Main conversion (Apply, Start, Submit)</td></tr>
          <tr><td style="font-weight:700;">Secondary</td><td>Supporting actions (Learn More, Compare)</td></tr>
          <tr><td style="font-weight:700;">Ghost</td><td>Tertiary, nav items, destructive with care</td></tr>
          <tr><td style="color:#aaa;">Disabled</td><td>Unavailable — always add tooltip explaining why</td></tr>
          <tr><td style="font-weight:700; color:var(--gold)">Gold (dark bg)</td><td>Secondary CTA on dark hero sections only</td></tr>
        </table>
      </div>
      <div>
        <div class="label-sm" style="margin-bottom:8px;">CTA Copy Rules</div>
        <table>
          <tr><th>✓ Write This</th><th>✗ Not This</th></tr>
          <tr><td style="color:var(--green); font-weight:600;">Apply for Free</td><td style="color:var(--accent);">Learn More</td></tr>
          <tr><td style="color:var(--green); font-weight:600;">Start My Application</td><td style="color:var(--accent);">Click Here</td></tr>
          <tr><td style="color:var(--green); font-weight:600;">Compare Programs</td><td style="color:var(--accent);">Submit</td></tr>
          <tr><td style="color:var(--green); font-weight:600;">Download Salary Guide</td><td style="color:var(--accent);">Get Started Today!</td></tr>
          <tr><td style="color:var(--green); font-weight:600;">Partner With Us</td><td style="color:var(--accent);">Explore Opportunities</td></tr>
        </table>
      </div>
    </div>
  </div>
  <div class="page-footer">
    <span>WorkforceAP Brand Style Guide v2.0 — Confidential</span>
    <span>7</span>
  </div>
</div>

<!-- ═══ PAGE 8: CARDS & SURFACES ═══ -->
<div class="page inner-page">
  <div class="page-header"></div>
  <div class="page-content">
    <div class="section-num">06</div>
    <div class="section-eyebrow">06 — Cards &amp; Surfaces</div>
    <div class="section-title">Containers &amp; Elevation</div>
    <div class="section-desc">Surfaces create hierarchy. Elevation through color, not drop shadows.</div>
    <div class="divider"></div>

    <div class="label-sm" style="margin-bottom:10px;">Card Variants</div>
    <div class="card-grid">
      <div class="card card-default">
        <div class="card-title">Default Card</div>
        <div class="card-text">White background, light border. For content sections on light pages.</div>
      </div>
      <div class="card card-elevated">
        <div class="card-title">Elevated Card</div>
        <div class="card-text">Surface-low background. Subtle shadow. For featured content.</div>
      </div>
      <div class="card card-gold-border">
        <div class="card-title" style="color:var(--text-primary)">Highlighted Card</div>
        <div class="card-text" style="color:var(--text-secondary)">Gold border on white. For featured programs or awards.</div>
      </div>
    </div>
    <div class="card-grid">
      <div class="card card-accent">
        <div class="card-title">Accent Card</div>
        <div class="card-text">For primary CTAs, featured content blocks. One per section max.</div>
      </div>
      <div class="card card-dark">
        <div class="card-title">Dark Card</div>
        <div class="card-text" style="color:rgba(255,255,255,0.7)">For stat displays, testimonials, metrics on hero sections.</div>
      </div>
      <div class="card" style="background: linear-gradient(135deg, var(--near-black) 0%, #2a1520 100%); color:white; border:none;">
        <div class="card-title">Gradient Card</div>
        <div class="card-text" style="color:rgba(255,255,255,0.7)">Use sparingly. Max one gradient element per page section.</div>
      </div>
    </div>

    <div class="label-sm" style="margin-bottom:10px; margin-top:8px;">Dark Mode Surface System</div>
    <table>
      <tr><th>Surface Level</th><th>Token</th><th>Light Value</th><th>Dark Value</th><th>Usage</th></tr>
      <tr><td>Page Background</td><td class="token">--color-surface</td><td class="val">#FAFAFA</td><td class="val">#121416</td><td>Page root</td></tr>
      <tr><td>Container Low</td><td class="token">--surface-container-low</td><td class="val">#F7F8FA</td><td class="val">#1A1C1E</td><td>Cards, sidebars</td></tr>
      <tr><td>Container</td><td class="token">--surface-container</td><td class="val">#F0F1F3</td><td class="val">#1E2022</td><td>Elevated cards</td></tr>
      <tr><td>Container High</td><td class="token">--surface-container-high</td><td class="val">#E8E9EB</td><td class="val">#282A2C</td><td>Highest elevation</td></tr>
    </table>
  </div>
  <div class="page-footer">
    <span>WorkforceAP Brand Style Guide v2.0 — Confidential</span>
    <span>8</span>
  </div>
</div>

<!-- ═══ PAGE 9: LOGO ═══ -->
<div class="page inner-page">
  <div class="page-header"></div>
  <div class="page-content">
    <div class="section-num">07</div>
    <div class="section-eyebrow">07 — Logo Usage</div>
    <div class="section-title">Logo Standards</div>
    <div class="section-desc">Consistent. Never stretched. Never recolored. Always with clear space.</div>
    <div class="divider"></div>

    <div class="logo-grid">
      <div class="logo-box">
        <img src="{LOGO_DATA}" alt="WorkforceAP logo — light">
        <div class="logo-caption">On white — full color</div>
      </div>
      <div class="logo-box logo-box-dark">
        <img src="{LOGO_DATA}" alt="WorkforceAP logo — dark">
        <div class="logo-caption" style="color:rgba(255,255,255,0.5)">On dark — white version</div>
      </div>
      <div class="logo-box logo-box-accent">
        <img src="{LOGO_DATA}" alt="WorkforceAP logo — accent">
        <div class="logo-caption" style="color:rgba(255,255,255,0.7)">On accent — white version</div>
      </div>
    </div>

    <div class="two-col">
      <div>
        <div class="label-sm" style="margin-bottom:8px;">Logo Rules</div>
        <table>
          <tr><th>Rule</th><th>Standard</th></tr>
          <tr><td style="font-weight:700">Clear Space</td><td>Min 1× height of "W" on all sides</td></tr>
          <tr><td style="font-weight:700">Min Size</td><td>120px wide (digital) / 1 inch (print)</td></tr>
          <tr><td style="font-weight:700">On Light</td><td>Full color (crimson wordmark)</td></tr>
          <tr><td style="font-weight:700">On Dark</td><td>White version</td></tr>
          <tr><td style="font-weight:700">On Accent</td><td>White version only</td></tr>
        </table>
      </div>
      <div>
        <div class="label-sm" style="margin-bottom:8px;">Never Do This</div>
        <table>
          <tr><th>❌ Violation</th><th>Why It Matters</th></tr>
          <tr><td>Stretch or skew</td><td>Destroys brand trust and recognition</td></tr>
          <tr><td>Recolor or add gradient</td><td>Dilutes brand identity</td></tr>
          <tr><td>Add drop shadow</td><td>Logo has no shadow in its design system</td></tr>
          <tr><td>Place on busy photos</td><td>Must have plain or overlay background</td></tr>
          <tr><td>Use below 120px</td><td>Letterforms become illegible</td></tr>
        </table>
      </div>
    </div>
  </div>
  <div class="page-footer">
    <span>WorkforceAP Brand Style Guide v2.0 — Confidential</span>
    <span>9</span>
  </div>
</div>

<!-- ═══ PAGE 10: VOICE & COPY ═══ -->
<div class="page inner-page">
  <div class="page-header"></div>
  <div class="page-content">
    <div class="section-num">09</div>
    <div class="section-eyebrow">09 — Voice &amp; Copy</div>
    <div class="section-title">How WorkforceAP Sounds</div>
    <div class="section-desc">Plain. Direct. Human. Specific. Never corporate speak.</div>
    <div class="divider"></div>

    <div class="do-dont" style="margin-bottom:12px;">
      <div class="do-box">
        <div class="do-label">✓ Direct, not cold</div>
        <div class="do-example">"Apply now. We respond within 3–5 business days."</div>
      </div>
      <div class="dont-box">
        <div class="dont-label">✗ Corporate and hollow</div>
        <div class="do-example">"We'd love to connect on your exciting journey forward!"</div>
      </div>
      <div class="do-box">
        <div class="do-label">✓ Specific and real</div>
        <div class="do-example">"CompTIA A+ certified. IBM AI Professional. $62K–$88K starting range."</div>
      </div>
      <div class="dont-box">
        <div class="dont-label">✗ Vague and unverifiable</div>
        <div class="do-example">"Industry-recognized certifications in high-demand fields."</div>
      </div>
      <div class="do-box">
        <div class="do-label">✓ Inclusive language</div>
        <div class="do-example">"For adults at any stage of their career."</div>
      </div>
      <div class="dont-box">
        <div class="dont-label">✗ Exclusive language</div>
        <div class="do-example">"For recent grads and young professionals entering the workforce."</div>
      </div>
    </div>

    <div class="label-sm" style="margin-bottom:8px;">Terminology Standards</div>
    <table>
      <tr><th>✓ Use This</th><th>✗ Not This</th><th>Reason</th></tr>
      <tr><td style="font-weight:700">Member</td><td>Student, User, Candidate</td><td>We serve adults, not students. "Member" conveys community.</td></tr>
      <tr><td style="font-weight:700">Counselor</td><td>Advisor, Coach, Mentor</td><td>Counselors have specific roles — keep it precise.</td></tr>
      <tr><td style="font-weight:700">Partner</td><td>Affiliate, Vendor, Client</td><td>Referring organizations are valued collaborators.</td></tr>
      <tr><td style="font-weight:700">Free / $0</td><td>No-cost, Complimentary, Free*</td><td>Say it plainly. Asterisks create distrust.</td></tr>
      <tr><td style="font-weight:700">WorkforceAP</td><td>WAP, Workforce AP, workforce ap</td><td>One word, camel case. Always.</td></tr>
      <tr><td style="font-weight:700">CompTIA A+</td><td>"a certification", "A+ cert"</td><td>Always use the full official certification name.</td></tr>
    </table>
  </div>
  <div class="page-footer">
    <span>WorkforceAP Brand Style Guide v2.0 — Confidential</span>
    <span>10</span>
  </div>
</div>

<!-- ═══ PAGE 11: DOCUMENT TEMPLATES ═══ -->
<div class="page inner-page">
  <div class="page-header"></div>
  <div class="page-content">
    <div class="section-num">10</div>
    <div class="section-eyebrow">10 — Document Templates</div>
    <div class="section-title">Branded Documents</div>
    <div class="section-desc">Email, letterhead, and report headers — consistent across all communications.</div>
    <div class="divider"></div>

    <div class="two-col">
      <div>
        <div class="label-sm" style="margin-bottom:10px;">Email Header Template</div>
        <div style="border:1px solid var(--border); border-radius:10px; overflow:hidden; font-size:8.5pt;">
          <div style="background:var(--near-black); padding:14px 18px; display:flex; align-items:center; gap:10px;">
            <img src="{LOGO_DATA}" style="height:20px; filter:brightness(10);" alt="logo">
          </div>
          <div style="padding:18px;">
            <div style="font-size:11pt; font-weight:700; margin-bottom:6px; color:var(--text-primary);">Hi [First Name],</div>
            <div style="color:var(--text-secondary); line-height:1.6; margin-bottom:14px;">Your application to WorkforceAP has been received. A counselor will reach out within 3–5 business days.</div>
            <div style="display:inline-block; background:var(--accent); color:white; padding:8px 16px; border-radius:6px; font-weight:700; font-size:8.5pt;">View Application Status</div>
          </div>
          <div style="background:var(--surface-low); padding:10px 18px; border-top:1px solid var(--border); font-size:7pt; color:#aaa;">
            WorkforceAP · info@workforceap.org · workforceap.org
          </div>
        </div>
      </div>
      <div>
        <div class="label-sm" style="margin-bottom:10px;">Letterhead Template</div>
        <div style="border:1px solid var(--border); border-radius:10px; overflow:hidden; font-size:8.5pt;">
          <div style="background:var(--accent); height:6px;"></div>
          <div style="padding:16px 18px;">
            <div style="display:flex; justify-content:space-between; align-items:flex-start; margin-bottom:16px; padding-bottom:12px; border-bottom:1px solid var(--border);">
              <img src="{LOGO_DATA}" style="height:22px;" alt="logo">
              <div style="text-align:right; font-size:7.5pt; color:var(--text-secondary); line-height:1.6;">
                Workforce Advancement Project<br>
                info@workforceap.org<br>
                workforceap.org
              </div>
            </div>
            <div style="color:var(--text-secondary); margin-bottom:10px; font-size:7.5pt;">March 29, 2026</div>
            <div style="font-weight:700; margin-bottom:8px; font-size:9pt;">Re: Program Enrollment Confirmation</div>
            <div style="color:var(--text-secondary); line-height:1.6; font-size:8pt;">Dear [Member Name],<br><br>We are pleased to confirm your enrollment in the [Program Name] certification track...</div>
          </div>
          <div style="background:var(--near-black); height:4px;"></div>
        </div>
      </div>
    </div>

    <div style="margin-top:14px;">
      <div class="label-sm" style="margin-bottom:10px;">Report Header Template</div>
      <div style="border:1px solid var(--border); border-radius:10px; overflow:hidden;">
        <div style="background:var(--near-black); padding:20px 24px; display:flex; justify-content:space-between; align-items:center;">
          <div>
            <img src="{LOGO_DATA}" style="height:24px; filter:brightness(10); margin-bottom:10px;" alt="logo">
            <div style="font-size:14pt; font-weight:800; color:white; line-height:1.1;">Program Outcomes Report</div>
            <div style="font-size:9pt; color:rgba(255,255,255,0.6); margin-top:4px;">Q1 2026 · WorkforceAP</div>
          </div>
          <div style="text-align:right;">
            <div style="font-size:28pt; font-weight:900; color:var(--gold); line-height:1;">87%</div>
            <div style="font-size:8pt; color:rgba(255,255,255,0.6);">Placement Rate</div>
          </div>
        </div>
        <div style="display:grid; grid-template-columns:repeat(4,1fr); border-top:1px solid rgba(255,255,255,0.08);">
          <div style="background:var(--dark-surface); padding:14px; text-align:center; border-right:1px solid rgba(255,255,255,0.06);">
            <div style="font-size:18pt; font-weight:900; color:var(--accent);">247</div>
            <div style="font-size:7.5pt; color:#aaa; text-transform:uppercase; letter-spacing:0.08em;">Members Enrolled</div>
          </div>
          <div style="background:var(--dark-surface); padding:14px; text-align:center; border-right:1px solid rgba(255,255,255,0.06);">
            <div style="font-size:18pt; font-weight:900; color:var(--gold);">$0</div>
            <div style="font-size:7.5pt; color:#aaa; text-transform:uppercase; letter-spacing:0.08em;">Member Cost</div>
          </div>
          <div style="background:var(--dark-surface); padding:14px; text-align:center; border-right:1px solid rgba(255,255,255,0.06);">
            <div style="font-size:18pt; font-weight:900; color:white;">6mo</div>
            <div style="font-size:7.5pt; color:#aaa; text-transform:uppercase; letter-spacing:0.08em;">Avg. Track Length</div>
          </div>
          <div style="background:var(--dark-surface); padding:14px; text-align:center;">
            <div style="font-size:18pt; font-weight:900; color:#4A9B4F;">+$22K</div>
            <div style="font-size:7.5pt; color:#aaa; text-transform:uppercase; letter-spacing:0.08em;">Avg. Salary Lift</div>
          </div>
        </div>
      </div>
    </div>
  </div>
  <div class="page-footer">
    <span>WorkforceAP Brand Style Guide v2.0 — Confidential</span>
    <span>11</span>
  </div>
</div>

<!-- ═══ PAGE 12: QUICK REFERENCE ═══ -->
<div class="page inner-page">
  <div class="page-header"></div>
  <div class="page-content">
    <div class="section-num">11</div>
    <div class="section-eyebrow">11 — Quick Reference</div>
    <div class="section-title">All Rules. One Page.</div>
    <div class="section-desc">Clip this page and pin it. These are the non-negotiables.</div>
    <div class="divider"></div>

    <div class="qr-grid">
      <div class="qr-item"><div class="qr-cat">Primary CTA Color</div><div class="qr-rule">Crimson <span style="font-family:monospace">#AD2C4D</span> — always. One per screen.</div></div>
      <div class="qr-item"><div class="qr-cat">Gold Usage</div><div class="qr-rule">Dark backgrounds only. Never on white or light gray (fails WCAG).</div></div>
      <div class="qr-item"><div class="qr-cat">Hero Text</div><div class="qr-rule">On dark overlays: use <span style="font-family:monospace">#fff</span> directly, not <span style="font-family:monospace">var(--color-white)</span>.</div></div>
      <div class="qr-item"><div class="qr-cat">Font</div><div class="qr-rule">Inter only. Body 16px/1.6. Headings Bold 700. No other faces.</div></div>
      <div class="qr-item"><div class="qr-cat">Spacing</div><div class="qr-rule">8px grid. Use CSS tokens — no arbitrary values in code.</div></div>
      <div class="qr-item"><div class="qr-cat">Contrast</div><div class="qr-rule">4.5:1 body, 3:1 large text (18px+), 3:1 UI components (WCAG AA).</div></div>
      <div class="qr-item"><div class="qr-cat">Border Radius</div><div class="qr-rule">Buttons: 8px. Cards: 12px. Modals: 16px. Never uniform everywhere.</div></div>
      <div class="qr-item"><div class="qr-cat">Mobile</div><div class="qr-rule">&lt;640px: single column, 44px touch targets, bottom nav.</div></div>
      <div class="qr-item"><div class="qr-cat">Logo Clear Space</div><div class="qr-rule">1× "W" height on all sides. Never below 120px wide.</div></div>
      <div class="qr-item"><div class="qr-cat">CTA Copy</div><div class="qr-rule">Specific + active voice. "Apply for Free" &gt; "Learn More".</div></div>
      <div class="qr-item"><div class="qr-cat">Dark Mode Code</div><div class="qr-rule">Use <span style="font-family:monospace">var()</span> tokens — never hardcode hex values in components.</div></div>
      <div class="qr-item"><div class="qr-cat">Terminology</div><div class="qr-rule">"Member" not "student." "WorkforceAP" not "WAP." "Free" not "complimentary."</div></div>
    </div>

    <div style="margin-top:16px; background:var(--accent); border-radius:10px; padding:18px 22px; color:white; display:flex; justify-content:space-between; align-items:center;">
      <div>
        <div style="font-weight:800; font-size:11pt; margin-bottom:4px;">Questions about the brand?</div>
        <div style="font-size:9pt; opacity:0.8;">The live design system lives in the repo under <span style="font-family:monospace">css/main.css</span>.</div>
      </div>
      <img src="{LOGO_DATA}" style="height:28px; filter:brightness(10);" alt="logo">
    </div>
  </div>
  <div class="page-footer">
    <span>WorkforceAP Brand Style Guide v2.0 — Confidential</span>
    <span>12</span>
  </div>
</div>

</body>
</html>"""

# Write HTML
html_path = Path('/tmp/style_guide_v2.html')
html_path.write_text(HTML)
print(f"HTML written: {html_path}")

# Render to PDF with Playwright
from playwright.sync_api import sync_playwright

output = '/tmp/WorkforceAP-Brand-Style-Guide-v2.pdf'
with sync_playwright() as p:
    browser = p.chromium.launch(headless=True)
    page = browser.new_page()
    page.goto(f'file://{html_path}', wait_until='networkidle')
    page.wait_for_timeout(1500)
    page.pdf(
        path=output,
        format='A4',
        print_background=True,
        margin={'top':'0','right':'0','bottom':'0','left':'0'}
    )
    browser.close()

print(f"PDF rendered: {output}")
import os
print(f"Size: {os.path.getsize(output)/1024:.0f} KB")
