"""WorkforceAP Brand Style Guide v2 — fresh build, all colors inline."""
import base64
from pathlib import Path
from playwright.sync_api import sync_playwright

with open('/tmp/logo-white.svg', 'rb') as f:
    LOGO_WHITE = f"data:image/svg+xml;base64,{base64.b64encode(f.read()).decode()}"
with open('/tmp/logo-dark.svg', 'rb') as f:
    LOGO_DARK = f"data:image/svg+xml;base64,{base64.b64encode(f.read()).decode()}"

# All colors hardcoded — no CSS vars
C = {
    'accent': '#AD2C4D',
    'accent_light': '#FFB2BC',
    'gold': '#FFBB00',
    'black': '#121416',
    'dark_surface': '#1A1C1E',
    'dark_high': '#282A2C',
    'text': '#1C1B1B',
    'text2': '#584144',
    'surface': '#FAFAFA',
    'surface_low': '#F7F8FA',
    'border': '#E8E8E8',
    'green': '#4A9B4F',
    'blue': '#2B7BB9',
    'white': '#FFFFFF',
    'gray': '#A3A3A3',
}

def swatch(color, name, hex_val, usage):
    return f'''<div style="border-radius:8px;overflow:hidden;border:1px solid rgba(0,0,0,0.08);">
      <div style="height:52px;background:{color};"></div>
      <div style="padding:8px 10px;background:#f7f8fa;">
        <div style="font-size:8pt;font-weight:700;color:#1c1b1b;margin-bottom:2px;">{name}</div>
        <div style="font-size:7.5pt;font-family:monospace;color:#584144;margin-bottom:2px;">{hex_val}</div>
        <div style="font-size:6.5pt;color:#a3a3a3;line-height:1.3;">{usage}</div>
      </div>
    </div>'''

def th(text):
    return f'<th style="background:#121416;color:white;font-weight:700;font-size:8pt;padding:7px 10px;text-align:left;">{text}</th>'

def td(text, bold=False, color='#1c1b1b', mono=False):
    fw = '700' if bold else '400'
    ff = 'monospace' if mono else 'inherit'
    return f'<td style="padding:7px 10px;font-size:8.5pt;font-weight:{fw};color:{color};font-family:{ff};border-bottom:1px solid #e8e8e8;">{text}</td>'

def td_acc(text):
    return td(text, bold=True, color=C['accent'])

def tr(cells, bg='white'):
    return f'<tr style="background:{bg};">{"".join(cells)}</tr>'

def section_label(num, title, desc=''):
    return f'''
    <div style="border-left:4px solid {C["accent"]};padding:0 0 0 12px;margin-bottom:6px;">
      <div style="font-size:7.5pt;font-weight:700;letter-spacing:0.15em;text-transform:uppercase;color:{C["accent"]};margin-bottom:4px;">{num}</div>
      <div style="font-size:22pt;font-weight:800;letter-spacing:-0.02em;color:{C["text"]};line-height:1.1;">{title}</div>
      {f'<div style="font-size:9.5pt;color:{C["text2"]};margin-top:4px;">{desc}</div>' if desc else ''}
    </div>
    <div style="height:1px;background:{C["border"]};margin:14px 0 18px;"></div>'''

def page_footer(pg):
    return f'''<div style="position:absolute;bottom:0;left:0;right:0;height:32px;border-top:1px solid {C["border"]};display:flex;align-items:center;justify-content:space-between;padding:0 32px;font-size:7pt;color:{C["gray"]};">
      <span>WorkforceAP Brand Style Guide v2.0 — Confidential</span>
      <span>{pg}</span>
    </div>'''

def page(content, pg, accent_bar=True):
    bar = f'<div style="height:10px;background:{C["accent"]};"></div>' if accent_bar else ''
    return f'''<div style="width:210mm;min-height:297mm;background:white;position:relative;overflow:hidden;page-break-after:always;">
  {bar}
  <div style="padding:28px 36px 50px;">
    {content}
  </div>
  {page_footer(pg)}
</div>'''

# ─── COVER ───────────────────────────────────────────────────────────────────
cover = f'''<div style="width:210mm;min-height:297mm;background:#121416;position:relative;overflow:hidden;page-break-after:always;">
  <div style="height:8px;background:{C["accent"]};"></div>
  <!-- decorative circles -->
  <div style="position:absolute;right:-60px;top:30%;width:280px;height:280px;border-radius:50%;background:rgba(173,44,77,0.15);"></div>
  <div style="position:absolute;right:80px;top:12%;width:140px;height:140px;border-radius:50%;background:rgba(255,187,0,0.08);"></div>
  <!-- content -->
  <div style="padding:52px 56px;">
    <img src="{LOGO_WHITE}" style="height:32px;width:128px;object-fit:contain;margin-bottom:72px;" alt="WorkforceAP">
    <div style="font-size:8pt;font-weight:700;letter-spacing:0.18em;text-transform:uppercase;color:{C["accent_light"]};margin-bottom:14px;">Visual Identity &amp; Design System</div>
    <div style="font-size:52pt;font-weight:900;line-height:0.9;letter-spacing:-0.03em;color:white;margin-bottom:8px;">Brand<br><span style="color:{C["accent_light"]};">Style</span><br>Guide</div>
    <div style="font-size:14pt;font-weight:300;color:rgba(255,255,255,0.5);margin-top:20px;margin-bottom:44px;">Marketing Standards for WorkforceAP</div>
    <div style="font-size:8pt;color:rgba(255,255,255,0.3);letter-spacing:0.05em;">Version 2.0 &nbsp;·&nbsp; March 2026 &nbsp;·&nbsp; Confidential</div>
  </div>
  <!-- bottom bar -->
  <div style="position:absolute;bottom:0;left:0;right:0;height:64px;background:{C["accent"]};display:flex;align-items:center;padding:0 56px;">
    <span style="font-size:8.5pt;font-weight:700;letter-spacing:0.1em;text-transform:uppercase;color:rgba(255,255,255,0.8);">workforceap.org &nbsp;·&nbsp; Building Tomorrow's Workforce</span>
  </div>
</div>'''

# ─── TOC ─────────────────────────────────────────────────────────────────────
toc_rows = ''
for num, title, desc in [
    ('01','Brand Identity','Mission, voice, positioning'),
    ('02','Color System','Primary palette, semantic colors, dark mode'),
    ('03','Typography','Typeface, scale, hierarchy'),
    ('04','Spacing &amp; Layout','Grid, tokens, breakpoints'),
    ('05','Buttons &amp; CTAs','Primary, secondary, ghost, copy rules'),
    ('06','Cards &amp; Surfaces','Elevation, containers, dark mode'),
    ('07','Logo Usage','Placement, clear space, color variants'),
    ('08','Photography','Shot style, overlays, diversity'),
    ('09','Voice &amp; Copy','Tone, do/don\'t, terminology'),
    ('10','Quick Reference','All rules on one page'),
]:
    toc_rows += f'''<div style="display:flex;align-items:baseline;gap:10px;padding:8px 0;border-bottom:1px solid {C["border"]};">
      <span style="font-size:11pt;font-weight:800;color:{C["accent"]};width:28px;flex-shrink:0;">{num}</span>
      <span style="font-size:10.5pt;font-weight:600;color:{C["text"]};flex:1;">{title}</span>
      <span style="font-size:8pt;color:{C["text2"]};">{desc}</span>
    </div>'''

toc_content = f'''{section_label('00', 'Contents')}
{toc_rows}
<div style="margin-top:28px;background:#121416;border-radius:10px;padding:18px 22px;">
  <div style="font-size:8pt;font-weight:700;letter-spacing:0.12em;text-transform:uppercase;color:{C["gold"]};margin-bottom:8px;">How to use this guide</div>
  <div style="font-size:9pt;color:rgba(255,255,255,0.7);line-height:1.7;">This document defines visual and verbal standards for all WorkforceAP marketing — website, social media, collateral, presentations, and partner communications. When in doubt: use the token system, not hardcoded values.</div>
</div>'''

# ─── BRAND IDENTITY ──────────────────────────────────────────────────────────
brand_content = f'''{section_label('01', 'Brand Identity', 'Mission, positioning, and personality.')}
<div style="background:#121416;border-radius:10px;padding:22px 26px;color:white;margin-bottom:20px;">
  <div style="font-size:8pt;font-weight:700;letter-spacing:0.14em;text-transform:uppercase;color:{C["gold"]};margin-bottom:10px;">Mission Statement</div>
  <div style="font-size:13pt;font-weight:700;line-height:1.4;margin-bottom:12px;">Connecting underserved adults, the organizations that serve them, and the employers that need them — in one verified closed loop.</div>
  <div style="font-size:9pt;color:rgba(255,255,255,0.65);line-height:1.6;">Free to members. Employer-aligned. Outcome-accountable.</div>
</div>
<div style="display:grid;grid-template-columns:1fr 1fr;gap:20px;">
  <div>
    <div style="font-size:7.5pt;font-weight:700;letter-spacing:0.12em;text-transform:uppercase;color:{C["text2"]};margin-bottom:10px;">Brand Personality</div>
    <table style="width:100%;border-collapse:collapse;">
      {th("Trait")}{th("Meaning")}
      {tr([td_acc("Grounded"), td("Show outcomes, not promises.")], C["surface_low"])}
      {tr([td_acc("Direct"), td("Plain language. No jargon.")])}
      {tr([td_acc("Warm"), td("This is someone's livelihood.")], C["surface_low"])}
      {tr([td_acc("Ambitious"), td("Infrastructure, not a charity.")])}
      {tr([td_acc("Inclusive"), td("No age gate. No degree. No exclusion.")], C["surface_low"])}
    </table>
  </div>
  <div>
    <div style="font-size:7.5pt;font-weight:700;letter-spacing:0.12em;text-transform:uppercase;color:{C["text2"]};margin-bottom:10px;">What Makes Us Different</div>
    <table style="width:100%;border-collapse:collapse;">
      <tr style="background:#121416;"><th style="background:#121416;color:white;font-weight:700;font-size:8pt;padding:7px 10px;text-align:left;">We Are</th><th style="background:#AD2C4D;color:white;font-weight:700;font-size:8pt;padding:7px 10px;text-align:left;">We're Not</th></tr>
      {tr([td("Free to all qualifying members"), td("Employer-sponsored only")], C["surface_low"])}
      {tr([td("Adults 18+ at any career stage"), td("Recent grads only")])}
      {tr([td("Verified placement + 180-day tracking"), td("Certificate mill")], C["surface_low"])}
      {tr([td("Full-stack AI platform"), td("PDF worksheets")])}
    </table>
  </div>
</div>'''

# ─── COLOR SYSTEM ────────────────────────────────────────────────────────────
color_content = f'''{section_label('02', 'Color System', 'WCAG AA compliant. All backgrounds hardcoded for consistency.')}
<div style="font-size:7.5pt;font-weight:700;letter-spacing:0.12em;text-transform:uppercase;color:{C["text2"]};margin-bottom:10px;">Primary Palette</div>
<div style="display:grid;grid-template-columns:repeat(4,1fr);gap:10px;margin-bottom:20px;">
  {swatch(C["accent"],"Crimson (Accent)","#AD2C4D","CTAs, links, all accent uses")}
  {swatch(C["gold"],"Gold","#FFBB00","Dark bg only — fails on light")}
  {swatch(C["black"],"Near Black","#121416","Hero bg, dark surfaces")}
  {swatch(C["white"],"White","#FFFFFF","Text on dark, light surfaces")}
</div>
<div style="font-size:7.5pt;font-weight:700;letter-spacing:0.12em;text-transform:uppercase;color:{C["text2"]};margin-bottom:10px;">Supporting Palette</div>
<div style="display:grid;grid-template-columns:repeat(4,1fr);gap:10px;margin-bottom:20px;">
  {swatch("#8B1F38","Accent Dark","#8B1F38","Hover state for Crimson")}
  {swatch(C["blue"],"Blue","#2B7BB9","Links, informational states")}
  {swatch(C["green"],"Green","#4A9B4F","Success, positive metrics")}
  {swatch(C["text2"],"On Surface Var.","#584144","Secondary text, labels")}
</div>
<div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;">
  <div style="border-radius:8px;padding:14px;border-left:3px solid {C["green"]};background:rgba(74,155,79,0.05);">
    <div style="font-size:7.5pt;font-weight:700;color:{C["green"]};letter-spacing:0.1em;text-transform:uppercase;margin-bottom:6px;">✓ Crimson is the sole CTA color</div>
    <div style="font-size:8.5pt;color:{C["text"]};">One primary action per view. Always #AD2C4D. Never swap to another color.</div>
  </div>
  <div style="border-radius:8px;padding:14px;border-left:3px solid {C["accent"]};background:rgba(173,44,77,0.04);">
    <div style="font-size:7.5pt;font-weight:700;color:{C["accent"]};letter-spacing:0.1em;text-transform:uppercase;margin-bottom:6px;">✗ Gold fails on light backgrounds</div>
    <div style="font-size:8.5pt;color:{C["text"]};">Gold on white = 1.7:1 contrast. Use Gold on dark (#121416) surfaces only.</div>
  </div>
  <div style="border-radius:8px;padding:14px;border-left:3px solid {C["green"]};background:rgba(74,155,79,0.05);">
    <div style="font-size:7.5pt;font-weight:700;color:{C["green"]};letter-spacing:0.1em;text-transform:uppercase;margin-bottom:6px;">✓ Use CSS tokens in code</div>
    <div style="font-size:8.5pt;color:{C["text"]};font-family:monospace;">var(--color-accent) not #AD2C4D<br>var(--color-gold) not #FFBB00</div>
  </div>
  <div style="border-radius:8px;padding:14px;border-left:3px solid {C["accent"]};background:rgba(173,44,77,0.04);">
    <div style="font-size:7.5pt;font-weight:700;color:{C["accent"]};letter-spacing:0.1em;text-transform:uppercase;margin-bottom:6px;">✗ Never use var(--color-white) on hero text</div>
    <div style="font-size:8.5pt;color:{C["text"]};">In dark mode, --color-white remaps to #121417 (near-black). Use literal #fff on dark overlays.</div>
  </div>
</div>'''

# ─── TYPOGRAPHY ──────────────────────────────────────────────────────────────
type_content = f'''{section_label('03', 'Typography', 'Inter is our single typeface. Hierarchy through weight and size.')}
<div style="border-bottom:1px solid {C["border"]};padding-bottom:12px;margin-bottom:12px;display:grid;grid-template-columns:100px 1fr;gap:10px;align-items:start;">
  <div><div style="font-size:7.5pt;font-weight:700;color:{C["text2"]};">Display/H1</div><div style="font-size:7pt;font-family:monospace;color:{C["gray"]};">40px · 800</div></div>
  <div style="font-size:26pt;font-weight:800;letter-spacing:-0.03em;color:{C["text"]};">Empowering People.</div>
</div>
<div style="border-bottom:1px solid {C["border"]};padding-bottom:12px;margin-bottom:12px;display:grid;grid-template-columns:100px 1fr;gap:10px;align-items:start;">
  <div><div style="font-size:7.5pt;font-weight:700;color:{C["text2"]};">H2</div><div style="font-size:7pt;font-family:monospace;color:{C["gray"]};">32px · 700</div></div>
  <div style="font-size:20pt;font-weight:700;letter-spacing:-0.02em;color:{C["text"]};">Industry-Recognized Certifications</div>
</div>
<div style="border-bottom:1px solid {C["border"]};padding-bottom:12px;margin-bottom:12px;display:grid;grid-template-columns:100px 1fr;gap:10px;align-items:start;">
  <div><div style="font-size:7.5pt;font-weight:700;color:{C["text2"]};">H3</div><div style="font-size:7pt;font-family:monospace;color:{C["gray"]};">24px · 700</div></div>
  <div style="font-size:16pt;font-weight:700;color:{C["text"]};">Digital Literacy Program</div>
</div>
<div style="border-bottom:1px solid {C["border"]};padding-bottom:12px;margin-bottom:12px;display:grid;grid-template-columns:100px 1fr;gap:10px;align-items:start;">
  <div><div style="font-size:7.5pt;font-weight:700;color:{C["text2"]};">Body</div><div style="font-size:7pt;font-family:monospace;color:{C["gray"]};">16px · 400 · 1.6lh</div></div>
  <div style="font-size:10pt;line-height:1.6;color:{C["text"]};">Free career training for adults at every stage of their journey. Our programs are employer-aligned and outcome-accountable.</div>
</div>
<div style="border-bottom:1px solid {C["border"]};padding-bottom:12px;margin-bottom:16px;display:grid;grid-template-columns:100px 1fr;gap:10px;align-items:start;">
  <div><div style="font-size:7.5pt;font-weight:700;color:{C["text2"]};">Small</div><div style="font-size:7pt;font-family:monospace;color:{C["gray"]};">14px · 400</div></div>
  <div style="font-size:8.5pt;color:{C["text2"]};">Duration: 3–6 months &nbsp;·&nbsp; Cost to member: $0 &nbsp;·&nbsp; CompTIA certified</div>
</div>
<div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:10px;">
  <div style="background:{C["surface_low"]};border-radius:8px;padding:12px;">
    <div style="font-size:7.5pt;font-weight:700;letter-spacing:0.1em;text-transform:uppercase;color:{C["text2"]};margin-bottom:6px;">Line Height</div>
    <div style="font-size:8.5pt;line-height:1.6;color:{C["text"]};">Body: <strong>1.6×</strong><br>Headings: <strong>1.0–1.2×</strong></div>
  </div>
  <div style="background:{C["surface_low"]};border-radius:8px;padding:12px;">
    <div style="font-size:7.5pt;font-weight:700;letter-spacing:0.1em;text-transform:uppercase;color:{C["text2"]};margin-bottom:6px;">Letter Spacing</div>
    <div style="font-size:8.5pt;line-height:1.6;color:{C["text"]};">Display: <strong>-0.03em</strong><br>Labels: <strong>+0.06–0.15em</strong></div>
  </div>
  <div style="background:{C["surface_low"]};border-radius:8px;padding:12px;">
    <div style="font-size:7.5pt;font-weight:700;letter-spacing:0.1em;text-transform:uppercase;color:{C["text2"]};margin-bottom:6px;">Line Width</div>
    <div style="font-size:8.5pt;line-height:1.6;color:{C["text"]};">Body: <strong>65–70 chars</strong><br>Max: <strong>~680px</strong></div>
  </div>
</div>'''

# ─── BUTTONS ─────────────────────────────────────────────────────────────────
btn_content = f'''{section_label('05', 'Buttons &amp; CTAs', 'One primary action per view. Specific copy.')}
<div style="font-size:7.5pt;font-weight:700;letter-spacing:0.12em;text-transform:uppercase;color:{C["text2"]};margin-bottom:10px;">Button Variants</div>
<div style="display:flex;gap:10px;flex-wrap:wrap;margin-bottom:12px;align-items:center;">
  <div style="display:inline-flex;align-items:center;gap:6px;padding:9px 18px;border-radius:8px;font-size:9pt;font-weight:700;background:{C["accent"]};color:white;">Apply for Free</div>
  <div style="display:inline-flex;align-items:center;gap:6px;padding:9px 18px;border-radius:8px;font-size:9pt;font-weight:700;background:transparent;color:{C["accent"]};border:1.5px solid {C["accent"]};">Compare Programs</div>
  <div style="display:inline-flex;align-items:center;gap:6px;padding:9px 18px;border-radius:8px;font-size:9pt;font-weight:700;background:transparent;color:{C["text2"]};border:1px solid {C["border"]};">Learn More</div>
  <div style="display:inline-flex;align-items:center;gap:6px;padding:9px 18px;border-radius:8px;font-size:9pt;font-weight:700;background:{C["border"]};color:{C["gray"]};">Unavailable</div>
</div>
<div style="background:#121416;border-radius:10px;padding:12px 16px;display:flex;gap:10px;flex-wrap:wrap;align-items:center;margin-bottom:20px;">
  <div style="display:inline-flex;align-items:center;gap:6px;padding:9px 18px;border-radius:8px;font-size:9pt;font-weight:700;background:{C["accent"]};color:white;">Apply for Free</div>
  <div style="display:inline-flex;align-items:center;gap:6px;padding:9px 18px;border-radius:8px;font-size:9pt;font-weight:700;background:#121416;color:{C["gold"]};border:1px solid rgba(255,187,0,0.3);">Partner With Us</div>
  <div style="display:inline-flex;align-items:center;gap:6px;padding:9px 18px;border-radius:8px;font-size:9pt;font-weight:700;background:rgba(255,255,255,0.08);color:white;border:1px solid rgba(255,255,255,0.15);">Explore Programs</div>
</div>
<div style="display:grid;grid-template-columns:1fr 1fr;gap:14px;">
  <div>
    <div style="font-size:7.5pt;font-weight:700;letter-spacing:0.12em;text-transform:uppercase;color:{C["text2"]};margin-bottom:8px;">CTA Copy Rules</div>
    <table style="width:100%;border-collapse:collapse;">
      <tr style="background:#121416;"><th style="background:#121416;color:white;font-weight:700;font-size:7.5pt;padding:7px 8px;text-align:left;">✓ Write This</th><th style="background:{C["accent"]};color:white;font-weight:700;font-size:7.5pt;padding:7px 8px;text-align:left;">✗ Not This</th></tr>
      {tr([f'<td style="padding:6px 8px;font-size:8.5pt;font-weight:700;color:{C["green"]};border-bottom:1px solid {C["border"]};">Apply for Free</td>', f'<td style="padding:6px 8px;font-size:8.5pt;color:{C["accent"]};border-bottom:1px solid {C["border"]};">Learn More</td>'], C["surface_low"])}
      {tr([f'<td style="padding:6px 8px;font-size:8.5pt;font-weight:700;color:{C["green"]};border-bottom:1px solid {C["border"]};">Start My Application</td>', f'<td style="padding:6px 8px;font-size:8.5pt;color:{C["accent"]};border-bottom:1px solid {C["border"]};">Click Here</td>'])}
      {tr([f'<td style="padding:6px 8px;font-size:8.5pt;font-weight:700;color:{C["green"]};border-bottom:1px solid {C["border"]};">Compare Programs</td>', f'<td style="padding:6px 8px;font-size:8.5pt;color:{C["accent"]};border-bottom:1px solid {C["border"]};">Submit</td>'], C["surface_low"])}
      {tr([f'<td style="padding:6px 8px;font-size:8.5pt;font-weight:700;color:{C["green"]};">Partner With Us</td>', f'<td style="padding:6px 8px;font-size:8.5pt;color:{C["accent"]};">Explore Opportunities</td>'])}
    </table>
  </div>
  <div>
    <div style="font-size:7.5pt;font-weight:700;letter-spacing:0.12em;text-transform:uppercase;color:{C["text2"]};margin-bottom:8px;">Button Hierarchy</div>
    <table style="width:100%;border-collapse:collapse;">
      {th("Type")}{th("When")}
      {tr([td_acc("Primary"), td("One per screen — main conversion")], C["surface_low"])}
      {tr([td("Secondary", bold=True), td("Supporting actions")])}
      {tr([td("Ghost"), td("Tertiary, nav items")], C["surface_low"])}
      {tr([td("Gold (dark)", bold=True, color=C["gold"]), td("Secondary CTA on dark heroes only")])}
    </table>
  </div>
</div>'''

# ─── LOGO ─────────────────────────────────────────────────────────────────────
logo_content = f'''{section_label('07', 'Logo Usage', 'Never stretched. Never recolored. Always with clear space.')}
<div style="display:grid;grid-template-columns:repeat(3,1fr);gap:12px;margin-bottom:20px;">
  <div style="border-radius:10px;padding:20px;display:flex;flex-direction:column;align-items:center;gap:10px;border:1px solid {C["border"]};">
    <img src="{LOGO_DARK}" style="width:120px;height:30px;object-fit:contain;" alt="logo light">
    <div style="font-size:7.5pt;color:{C["text2"]};text-align:center;">On white / light backgrounds</div>
  </div>
  <div style="border-radius:10px;padding:20px;display:flex;flex-direction:column;align-items:center;gap:10px;background:#121416;border:none;">
    <img src="{LOGO_WHITE}" style="width:120px;height:30px;object-fit:contain;" alt="logo dark">
    <div style="font-size:7.5pt;color:rgba(255,255,255,0.5);text-align:center;">On dark / photo backgrounds</div>
  </div>
  <div style="border-radius:10px;padding:20px;display:flex;flex-direction:column;align-items:center;gap:10px;background:{C["accent"]};border:none;">
    <img src="{LOGO_WHITE}" style="width:120px;height:30px;object-fit:contain;" alt="logo accent">
    <div style="font-size:7.5pt;color:rgba(255,255,255,0.7);text-align:center;">On accent (crimson) backgrounds</div>
  </div>
</div>
<table style="width:100%;border-collapse:collapse;">
  <tr><{th("Rule")}{th("Standard")}</tr>
  {tr([td_acc("Clear Space"), td("Min 1× height of \"W\" letterform on all sides")], C["surface_low"])}
  {tr([td_acc("Min Size"), td("120px wide (digital) / 1 inch (print)")])}
  {tr([td_acc("On Light"), td("Full color — crimson icon, dark wordmark")], C["surface_low"])}
  {tr([td_acc("On Dark"), td("White version — never use color logo on dark")])}
  {tr([td_acc("Never"), td("Stretch, skew, recolor, add shadow, crop below 120px")], C["surface_low"])}
</table>'''

# ─── VOICE ────────────────────────────────────────────────────────────────────
voice_content = f'''{section_label('09', 'Voice &amp; Copy', 'Plain. Direct. Human. Specific.')}
<div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:18px;">
  <div style="border-radius:8px;padding:12px;border-left:3px solid {C["green"]};background:rgba(74,155,79,0.05);">
    <div style="font-size:7.5pt;font-weight:700;color:{C["green"]};letter-spacing:0.1em;text-transform:uppercase;margin-bottom:6px;">✓ Direct</div>
    <div style="font-size:9pt;color:{C["text"]};">"Apply now. We respond within 3–5 business days."</div>
  </div>
  <div style="border-radius:8px;padding:12px;border-left:3px solid {C["accent"]};background:rgba(173,44,77,0.04);">
    <div style="font-size:7.5pt;font-weight:700;color:{C["accent"]};letter-spacing:0.1em;text-transform:uppercase;margin-bottom:6px;">✗ Corporate</div>
    <div style="font-size:9pt;color:{C["text"]};">"We'd love to connect on your exciting journey forward!"</div>
  </div>
  <div style="border-radius:8px;padding:12px;border-left:3px solid {C["green"]};background:rgba(74,155,79,0.05);">
    <div style="font-size:7.5pt;font-weight:700;color:{C["green"]};letter-spacing:0.1em;text-transform:uppercase;margin-bottom:6px;">✓ Specific</div>
    <div style="font-size:9pt;color:{C["text"]};">"CompTIA A+, IBM AI Professional, $62K–$88K starting."</div>
  </div>
  <div style="border-radius:8px;padding:12px;border-left:3px solid {C["accent"]};background:rgba(173,44,77,0.04);">
    <div style="font-size:7.5pt;font-weight:700;color:{C["accent"]};letter-spacing:0.1em;text-transform:uppercase;margin-bottom:6px;">✗ Vague</div>
    <div style="font-size:9pt;color:{C["text"]};">"Industry-recognized certs in high-demand fields."</div>
  </div>
</div>
<div style="font-size:7.5pt;font-weight:700;letter-spacing:0.12em;text-transform:uppercase;color:{C["text2"]};margin-bottom:8px;">Terminology Standards</div>
<table style="width:100%;border-collapse:collapse;">
  <tr><{th("✓ Use This")}{th("✗ Not This")}{th("Reason")}</tr>
  {tr([f'<td style="padding:7px 8px;font-size:8.5pt;font-weight:700;color:{C["green"]};border-bottom:1px solid {C["border"]};">Member</td>', f'<td style="padding:7px 8px;font-size:8.5pt;color:{C["accent"]};border-bottom:1px solid {C["border"]};">Student / User</td>', f'<td style="padding:7px 8px;font-size:8pt;color:{C["text"]};border-bottom:1px solid {C["border"]};">Adults in a community, not students.</td>'], C["surface_low"])}
  {tr([f'<td style="padding:7px 8px;font-size:8.5pt;font-weight:700;color:{C["green"]};border-bottom:1px solid {C["border"]};">Free / $0</td>', f'<td style="padding:7px 8px;font-size:8.5pt;color:{C["accent"]};border-bottom:1px solid {C["border"]};">Complimentary</td>', f'<td style="padding:7px 8px;font-size:8pt;color:{C["text"]};border-bottom:1px solid {C["border"]};">Say it plainly. Asterisks create distrust.</td>'])}
  {tr([f'<td style="padding:7px 8px;font-size:8.5pt;font-weight:700;color:{C["green"]};border-bottom:1px solid {C["border"]};">WorkforceAP</td>', f'<td style="padding:7px 8px;font-size:8.5pt;color:{C["accent"]};border-bottom:1px solid {C["border"]};">WAP / Workforce AP</td>', f'<td style="padding:7px 8px;font-size:8pt;color:{C["text"]};border-bottom:1px solid {C["border"]};">One word, camel case. Always.</td>'], C["surface_low"])}
</table>'''

# ─── QUICK REF ────────────────────────────────────────────────────────────────
qr_items = [
    ("Primary CTA Color", "Crimson #AD2C4D — always. One per screen."),
    ("Gold Usage", "Dark backgrounds only. Never on white/light (fails WCAG)."),
    ("Hero Text", "Use #fff directly on dark overlays — not var(--color-white)."),
    ("Font", "Inter only. Body 16px/1.6. Headings Bold 700."),
    ("Spacing", "8px grid. CSS tokens only — no arbitrary values."),
    ("Contrast", "4.5:1 body, 3:1 large text/UI (WCAG AA minimum)."),
    ("Border Radius", "Buttons: 8px · Cards: 12px · Modals: 16px."),
    ("Mobile", "<640px: single column, 44px touch targets, bottom nav."),
    ("Logo Clear Space", "1× height of 'W' on all sides. Min 120px wide."),
    ("CTA Copy", '"Apply for Free" > "Learn More" — specific + active voice.'),
    ("Dark Mode Code", "Use var() tokens — never hardcode hex in components."),
    ("Terminology", '"Member" not "student". "WorkforceAP" not "WAP".'),
]
qr_grid = '<div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-bottom:20px;">'
for cat, rule in qr_items:
    qr_grid += f'<div style="border-radius:8px;padding:11px 13px;background:{C["surface_low"]};border:1px solid {C["border"]};"><div style="font-size:7pt;font-weight:700;letter-spacing:0.1em;text-transform:uppercase;color:{C["accent"]};margin-bottom:3px;">{cat}</div><div style="font-size:8.5pt;color:{C["text"]};line-height:1.4;">{rule}</div></div>'
qr_grid += '</div>'

qr_content = f'''{section_label('11', 'Quick Reference', 'All rules. One page.')}
{qr_grid}
<div style="background:{C["accent"]};border-radius:10px;padding:16px 20px;display:flex;justify-content:space-between;align-items:center;">
  <div>
    <div style="font-weight:800;font-size:11pt;color:white;margin-bottom:3px;">Questions about the brand?</div>
    <div style="font-size:8.5pt;color:rgba(255,255,255,0.75);">Design system: <span style="font-family:monospace;">workforceap-beta/css/main.css</span></div>
  </div>
  <img src="{LOGO_WHITE}" style="height:28px;width:112px;object-fit:contain;" alt="logo">
</div>'''

# ─── BUILD HTML ───────────────────────────────────────────────────────────────
HTML = f"""<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<title>WorkforceAP Brand Style Guide 2026</title>
<style>
@import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;600;700;800;900&display=swap');
* {{ box-sizing: border-box; margin: 0; padding: 0; -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }}
body {{ font-family: 'Inter', Arial, sans-serif; font-size: 10pt; background: white; }}
@page {{ size: A4; margin: 0; }}
</style>
</head>
<body>
{cover}
{page(toc_content, 2)}
{page(brand_content, 3)}
{page(color_content, 4)}
{page(type_content, 5)}
{page(btn_content, 6)}
{page(logo_content, 7)}
{page(voice_content, 8)}
{page(qr_content, 9)}
</body>
</html>"""

html_path = Path('/tmp/style_guide_v2_clean.html')
html_path.write_text(HTML)
print(f"HTML written: {len(HTML)//1024}KB")

output = '/tmp/WorkforceAP-Brand-Style-Guide-v2.pdf'
with sync_playwright() as p:
    browser = p.chromium.launch(headless=True)
    page = browser.new_page()
    page.goto(f'file://{html_path}', wait_until='networkidle')
    page.wait_for_timeout(2000)
    page.pdf(path=output, format='A4', print_background=True, margin={'top':'0','right':'0','bottom':'0','left':'0'})
    browser.close()

import os
print(f"PDF: {os.path.getsize(output)//1024}KB")
EOF