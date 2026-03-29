import base64
from pathlib import Path
from reportlab.lib.pagesizes import letter
from reportlab.lib.units import inch
from reportlab.lib import colors
from reportlab.lib.styles import ParagraphStyle
from reportlab.platypus import (
    SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle,
    HRFlowable, KeepTogether, PageBreak, Image as RLImage
)
from reportlab.pdfgen import canvas as pdfcanvas

LOGO_DARK_PATH = '/tmp/logo-dark.png'
LOGO_WHITE_PATH = '/tmp/logo-white.png'

BRAND = {
    'accent': '#AD2C4D', 'accent_dark': '#8B1F38',
    'accent_light': '#FFB2BC', 'gold': '#FFBB00',
    'near_black': '#121416', 'text_primary': '#1C1B1B',
    'on_surface_var': '#584144', 'surface_low': '#F7F8FA',
    'white': '#FFFFFF', 'gray_200': '#E8E8E8',
    'gray_400': '#A3A3A3', 'green': '#4A9B4F', 'blue': '#2B7BB9',
}

def color(h):
    h = h.lstrip('#')
    return colors.Color(int(h[:2],16)/255, int(h[2:4],16)/255, int(h[4:],16)/255)

def hex_to_rgb(h):
    h = h.lstrip('#')
    return tuple(int(h[i:i+2],16)/255 for i in (0,2,4))

S = {
    'section_label': ParagraphStyle('SL', fontName='Helvetica-Bold', fontSize=8, leading=10, textColor=color(BRAND['accent']), spaceBefore=20, spaceAfter=5, letterSpacing=1.2),
    'section_title': ParagraphStyle('ST', fontName='Helvetica-Bold', fontSize=20, leading=26, textColor=color(BRAND['text_primary']), spaceAfter=6),
    'section_desc': ParagraphStyle('SD', fontName='Helvetica', fontSize=9.5, leading=14, textColor=color(BRAND['on_surface_var']), spaceAfter=14),
    'label': ParagraphStyle('LB', fontName='Helvetica-Bold', fontSize=7.5, leading=10, textColor=color(BRAND['on_surface_var'])),
    'value': ParagraphStyle('VA', fontName='Helvetica', fontSize=8.5, leading=13, textColor=color(BRAND['text_primary'])),
    'mono': ParagraphStyle('MO', fontName='Courier', fontSize=8.5, leading=13, textColor=color(BRAND['text_primary'])),
    'toc_item': ParagraphStyle('TI', fontName='Helvetica', fontSize=10, leading=17, textColor=color(BRAND['text_primary'])),
    'do_dont': ParagraphStyle('DD', fontName='Helvetica', fontSize=8.5, leading=13, textColor=color(BRAND['text_primary'])),
    'h1_s': ParagraphStyle('H1S', fontName='Helvetica-Bold', fontSize=26, leading=32, textColor=color(BRAND['text_primary'])),
    'h2_s': ParagraphStyle('H2S', fontName='Helvetica-Bold', fontSize=20, leading=26, textColor=color(BRAND['text_primary'])),
    'h3_s': ParagraphStyle('H3S', fontName='Helvetica-Bold', fontSize=16, leading=21, textColor=color(BRAND['text_primary'])),
    'h4_s': ParagraphStyle('H4S', fontName='Helvetica-Bold', fontSize=13, leading=18, textColor=color(BRAND['text_primary'])),
    'body_s': ParagraphStyle('BOS', fontName='Helvetica', fontSize=10, leading=16, textColor=color(BRAND['text_primary'])),
    'small_s': ParagraphStyle('SMS', fontName='Helvetica', fontSize=8.5, leading=13, textColor=color(BRAND['on_surface_var'])),
    'caption': ParagraphStyle('CA', fontName='Helvetica', fontSize=7.5, leading=11, textColor=color(BRAND['gray_400'])),
}

W = letter[0] - 1.2*inch

def section_header(title, subtitle=None, label=None):
    items = []
    if label:
        items.append(Paragraph(label.upper(), S['section_label']))
    items.append(Paragraph(title, S['section_title']))
    if subtitle:
        items.append(Paragraph(subtitle, S['section_desc']))
    items.append(HRFlowable(width='100%', thickness=0.5, color=color(BRAND['gray_200']), spaceAfter=12))
    return items

def swatch_table(swatches, cols=4):
    col_w = W / cols
    rows = []
    for i in range(0, len(swatches), cols):
        chunk = swatches[i:i+cols]
        while len(chunk) < cols:
            chunk.append(('', '#ffffff', ''))
        rows.append(['' for _ in range(cols)])
        rows.append([Paragraph(f'<b>{n}</b><br/><font name="Courier" size="7">{h}</font><br/><font size="6.5">{u}</font>', S['value']) if n else '' for n, h, u in chunk])
    t = Table(rows, colWidths=[col_w]*cols)
    ts = [('VALIGN',(0,0),(-1,-1),'TOP'),('BOTTOMPADDING',(0,0),(-1,-1),3),('TOPPADDING',(0,0),(-1,-1),0)]
    for ri, i in enumerate(range(0, len(swatches), cols)):
        for ci, (n, h, u) in enumerate(swatches[i:i+cols]):
            if n:
                ar = ri*2
                ts += [('BACKGROUND',(ci,ar),(ci,ar),color(h)),('ROWHEIGHT',(ci,ar),(ci,ar),38),('BOX',(ci,ar),(ci,ar),0.3,colors.white)]
    t.setStyle(TableStyle(ts))
    return t

def std_table(data, col_widths):
    t = Table(data, colWidths=col_widths)
    t.setStyle(TableStyle([
        ('BACKGROUND',(0,0),(-1,0),color(BRAND['near_black'])),
        ('TEXTCOLOR',(0,0),(-1,0),color(BRAND['white'])),
        ('FONTNAME',(0,0),(-1,0),'Helvetica-Bold'),
        ('FONTSIZE',(0,0),(-1,-1),8.5),
        ('ROWHEIGHT',(0,0),(-1,-1),20),
        ('GRID',(0,0),(-1,-1),0.5,color(BRAND['gray_200'])),
        ('LEFTPADDING',(0,0),(-1,-1),8),
        ('VALIGN',(0,0),(-1,-1),'MIDDLE'),
        ('ROWBACKGROUNDS',(0,1),(-1,-1),[colors.white, color(BRAND['surface_low'])]),
    ]))
    return t

def on_page(c, doc):
    Wp, H = letter
    pg = doc.page
    if pg == 1:
        return
    c.setStrokeColor(color(BRAND['gray_200'])); c.setLineWidth(0.5)
    c.line(0.6*inch, H-0.52*inch, Wp-0.6*inch, H-0.52*inch)
    c.setFont('Helvetica-Bold',7); c.setFillColor(color(BRAND['accent']))
    c.drawString(0.6*inch, H-0.42*inch, 'WORKFORCEAP')
    c.setFont('Helvetica',7); c.setFillColor(color(BRAND['gray_400']))
    c.drawRightString(Wp-0.6*inch, H-0.42*inch, 'Brand Style Guide')
    c.line(0.6*inch, 0.52*inch, Wp-0.6*inch, 0.52*inch)
    c.drawString(0.6*inch, 0.36*inch, 'WorkforceAP Brand Style Guide — Confidential')
    c.drawRightString(Wp-0.6*inch, 0.36*inch, f'Page {pg}')

def draw_cover(c, doc):
    Wp, H = letter
    c.setFillColor(color(BRAND['near_black'])); c.rect(0,0,Wp,H,fill=1,stroke=0)
    c.setFillColor(color(BRAND['accent'])); c.rect(0, H-0.2*inch, Wp, 0.2*inch, fill=1, stroke=0)
    c.setFillColor(colors.Color(*hex_to_rgb(BRAND['accent']),0.12)); c.circle(Wp-0.8*inch, H*0.38, 2.2*inch, fill=1, stroke=0)
    c.setFillColor(colors.Color(*hex_to_rgb(BRAND['gold']),0.07)); c.circle(Wp-0.4*inch, H*0.6, 1.3*inch, fill=1, stroke=0)
    # Logo — 4:1 aspect ratio, preserveAspectRatio
    lw = 2.4*inch; lh = lw/4
    c.drawImage(LOGO_WHITE_PATH, 0.75*inch, H-0.72*inch-lh, width=lw, height=lh, preserveAspectRatio=True, mask='auto')
    c.setFillColor(colors.Color(1,1,1,0.45)); c.setFont('Helvetica',8)
    c.drawString(0.75*inch, H*0.52, 'VISUAL IDENTITY & DESIGN SYSTEM')
    c.setFont('Helvetica-Bold',44); c.setFillColor(color(BRAND['white']))
    c.drawString(0.75*inch, H*0.43, 'Brand Style')
    c.setFillColor(color(BRAND['accent_light']))
    c.drawString(0.75*inch, H*0.43-52, 'Guide')
    c.setFont('Helvetica',11); c.setFillColor(colors.Color(1,1,1,0.45))
    c.drawString(0.75*inch, H*0.43-78, 'WorkforceAP  ·  Version 1.0  ·  March 2026')
    c.setFillColor(color(BRAND['accent'])); c.rect(0, 0.6*inch, Wp, 0.6*inch, fill=1, stroke=0)
    c.setFont('Helvetica-Bold',8); c.setFillColor(colors.Color(1,1,1,0.8))
    c.drawString(0.75*inch, 0.86*inch, "workforceap.org  ·  Building Tomorrow's Workforce")

story = []
story.append(Spacer(1, 0.1*inch))
story.append(PageBreak())

# TOC
story += section_header('Contents', label='Navigation')
for num, title, desc in [
    ('01','Brand Identity','Mission, voice, positioning'),
    ('02','Color System','Palette, semantic colors, dark mode'),
    ('03','Typography','Typeface, scale, hierarchy'),
    ('04','Spacing & Layout','Grid, tokens, breakpoints'),
    ('05','Buttons & CTAs','Primary, secondary, ghost, copy rules'),
    ('06','Logo Usage','Placement, clear space, color variants'),
    ('07','Voice & Copy','Tone, do/don\'t, terminology'),
    ('08','Quick Reference','All rules on one page'),
]:
    t = Table([[Paragraph(f'<font color="#{BRAND["accent"][1:]}"><b>{num}</b></font>', S['toc_item']), Paragraph(title, S['toc_item']), Paragraph(desc, S['small_s'])]], colWidths=[0.5*inch, 2.5*inch, W-3*inch])
    t.setStyle(TableStyle([('VALIGN',(0,0),(-1,-1),'MIDDLE'),('BOTTOMPADDING',(0,0),(-1,-1),7),('LINEBELOW',(0,0),(-1,-1),0.5,color(BRAND['gray_200']))]))
    story.append(t)
story.append(PageBreak())

# BRAND IDENTITY
story += section_header('Brand Identity', 'Mission, positioning, and personality.', '01')
story.append(Paragraph('Mission', S['label'])); story.append(Spacer(1,4))
story.append(Paragraph('WorkforceAP is the operating system for workforce development — connecting underserved adults, the organizations that serve them, and the employers that need them, in one verified closed loop.', S['body_s']))
story.append(Spacer(1,16)); story.append(Paragraph('Brand Personality', S['label'])); story.append(Spacer(1,6))
t = std_table([['Trait','Definition'],['Grounded','Show outcomes, not promises.'],['Direct','Plain language. No jargon.'],['Warm','This is someone\'s livelihood.'],['Ambitious','Infrastructure, not a charity.'],['Inclusive','No age gate. No degree. No exclusion.']], [1.5*inch, W-1.5*inch])
t.setStyle(TableStyle([('BACKGROUND',(0,0),(-1,0),color(BRAND['near_black'])),('TEXTCOLOR',(0,0),(-1,0),color(BRAND['white'])),('FONTNAME',(0,0),(-1,0),'Helvetica-Bold'),('FONTSIZE',(0,0),(-1,-1),8.5),('ROWHEIGHT',(0,0),(-1,-1),20),('GRID',(0,0),(-1,-1),0.5,color(BRAND['gray_200'])),('LEFTPADDING',(0,0),(-1,-1),8),('VALIGN',(0,0),(-1,-1),'MIDDLE'),('ROWBACKGROUNDS',(0,1),(-1,-1),[colors.white, color(BRAND['surface_low'])]),('FONTNAME',(0,1),(0,-1),'Helvetica-Bold'),('TEXTCOLOR',(0,1),(0,-1),color(BRAND['accent']))]))
story.append(t); story.append(PageBreak())

# COLOR
story += section_header('Color System', 'WCAG AA compliant. Token-based. Light and dark mode aware.', '02')
story.append(Paragraph('Primary Palette', S['label'])); story.append(Spacer(1,6))
story.append(swatch_table([('Crimson (Accent)','#AD2C4D','CTAs, links, all accent uses'),('Gold','#FFBB00','Dark bg only — fails on light'),('Near Black','#121416','Hero bg, dark surfaces'),('White','#FFFFFF','Text on dark, light surfaces')]))
story.append(Spacer(1,12)); story.append(Paragraph('Supporting Palette', S['label'])); story.append(Spacer(1,6))
story.append(swatch_table([('Accent Dark','#8B1F38','Hover on Crimson'),('Blue','#2B7BB9','Links, info states'),('Green','#4A9B4F','Success, positive metrics'),('On Surface Var.','#584144','Secondary text, labels')]))
story.append(Spacer(1,12))
for tag, rule in [('✓ DO','Use Crimson (#AD2C4D) as the sole CTA color.'),('✓ DO','Use Gold on dark backgrounds only — fails WCAG on light.'),('✓ DO','Use var() CSS tokens — never hardcode hex values.'),('✗ DON\'T','Gold on white/light gray — 1.7:1 contrast, fails WCAG.'),('✗ DON\'T','var(--color-white) for hero text — remaps to near-black in dark mode.')]:
    clr = BRAND['green'] if '✓' in tag else BRAND['accent']
    t = Table([[Paragraph(f'<font color="#{clr[1:]}"><b>{tag}</b></font>', S['value']), Paragraph(rule, S['value'])]], colWidths=[0.8*inch, W-0.8*inch])
    t.setStyle(TableStyle([('VALIGN',(0,0),(-1,-1),'TOP'),('BOTTOMPADDING',(0,0),(-1,-1),5),('LINEBELOW',(0,0),(-1,-1),0.5,color(BRAND['gray_200']))]))
    story.append(t)
story.append(PageBreak())

# TYPOGRAPHY
story += section_header('Typography', 'Inter is our single typeface. Hierarchy through weight and size.', '03')
for name, spec, sk, ex in [
    ('Display / H1','40px · 800 · -0.03em','h1_s','Empowering People. Advancing Futures.'),
    ('H2','32px · 700 · -0.02em','h2_s','Industry-Recognized Certifications'),
    ('H3','24px · 700','h3_s','Digital Literacy Program'),
    ('H4','20px · 700','h4_s','Program Requirements'),
    ('Body','16px · 400 · 1.6lh','body_s','Free career training for adults at every stage of their journey.'),
    ('Small','14px · 400','small_s','Duration: 3–6 months · Cost to member: $0'),
]:
    story.append(KeepTogether([
        Table([[Paragraph(f'<b>{name}</b>', S['label']), Paragraph(spec, S['mono'])]], colWidths=[1.2*inch, W-1.2*inch]),
        Spacer(1,3), Paragraph(ex, S[sk]),
        HRFlowable(width='100%', thickness=0.5, color=color(BRAND['gray_200']), spaceBefore=6, spaceAfter=10),
    ]))
story.append(PageBreak())

# SPACING
story += section_header('Spacing & Layout', '8px base grid. Consistent scale. No arbitrary values.', '04')
story.append(Paragraph('Spacing Scale', S['label'])); story.append(Spacer(1,6))
rows = [['Token','Value','Usage']] + [r for r in [
    ['--space-1','4px','Icon gaps, tight badge padding'],['--space-2','8px','Compact element padding'],
    ['--space-4','16px','Standard gap, button padding'],['--space-6','24px','Card padding, element gaps'],
    ['--space-8','32px','Section element spacing'],['--space-12','48px','Mobile section padding'],
    ['--space-16','64px','Desktop section padding'],['--space-24','96px','Hero and major section padding'],
]]
t = Table(rows, colWidths=[1.4*inch, 0.8*inch, W-2.2*inch])
t.setStyle(TableStyle([('BACKGROUND',(0,0),(-1,0),color(BRAND['near_black'])),('TEXTCOLOR',(0,0),(-1,0),color(BRAND['white'])),('FONTNAME',(0,0),(-1,0),'Helvetica-Bold'),('FONTSIZE',(0,0),(-1,-1),8),('ROWHEIGHT',(0,0),(-1,-1),20),('GRID',(0,0),(-1,-1),0.5,color(BRAND['gray_200'])),('LEFTPADDING',(0,0),(-1,-1),8),('VALIGN',(0,0),(-1,-1),'MIDDLE'),('FONTNAME',(0,1),(0,-1),'Courier'),('TEXTCOLOR',(0,1),(0,-1),color(BRAND['accent'])),('ROWBACKGROUNDS',(0,1),(-1,-1),[colors.white, color(BRAND['surface_low'])])]))
story.append(t); story.append(Spacer(1,14)); story.append(Paragraph('Border Radius', S['label'])); story.append(Spacer(1,6))
rows2 = [['Token','Value','Usage']] + [['--radius-sm','4px','Tags, badges'],['--radius-md','8px','Buttons, inputs'],['--radius-lg','12px','Cards, dropdowns'],['--radius-xl','16px','Modals, prominent containers'],['--radius-full','50px','Pills, avatars']]
t2 = Table(rows2, colWidths=[1.4*inch, 0.8*inch, W-2.2*inch])
pass  # style set below
t2.setStyle(TableStyle([('BACKGROUND',(0,0),(-1,0),color(BRAND['near_black'])),('TEXTCOLOR',(0,0),(-1,0),color(BRAND['white'])),('FONTNAME',(0,0),(-1,0),'Helvetica-Bold'),('FONTSIZE',(0,0),(-1,-1),8),('ROWHEIGHT',(0,0),(-1,-1),20),('GRID',(0,0),(-1,-1),0.5,color(BRAND['gray_200'])),('LEFTPADDING',(0,0),(-1,-1),8),('VALIGN',(0,0),(-1,-1),'MIDDLE'),('FONTNAME',(0,1),(0,-1),'Courier'),('TEXTCOLOR',(0,1),(0,-1),color(BRAND['accent'])),('ROWBACKGROUNDS',(0,1),(-1,-1),[colors.white, color(BRAND['surface_low'])])]))
story.append(t2); story.append(PageBreak())

# BUTTONS
story += section_header('Buttons & CTAs', 'One primary action per view. Specific copy. Clear hierarchy.', '05')
story.append(Paragraph('CTA Copy Rules', S['label'])); story.append(Spacer(1,6))
cta = [['✓ Write This','✗ Not This','Principle'],['Apply for Free','Learn More','Specific + zero-cost signal'],['Start My Application','Click Here','Personal + action verb'],['Compare Programs','Submit','Describes what happens next'],['Download Salary Guide','Get Started Today!','No fake urgency'],['Partner With Us','Explore Opportunities','Clear intent']]
t = Table(cta, colWidths=[1.8*inch, 1.8*inch, W-3.6*inch])
t.setStyle(TableStyle([('BACKGROUND',(0,0),(-1,0),color(BRAND['near_black'])),('TEXTCOLOR',(0,0),(-1,0),color(BRAND['white'])),('FONTNAME',(0,0),(-1,0),'Helvetica-Bold'),('FONTSIZE',(0,0),(-1,-1),8.5),('ROWHEIGHT',(0,0),(-1,-1),20),('GRID',(0,0),(-1,-1),0.5,color(BRAND['gray_200'])),('LEFTPADDING',(0,0),(-1,-1),8),('VALIGN',(0,0),(-1,-1),'MIDDLE'),('TEXTCOLOR',(0,1),(0,-1),color(BRAND['green'])),('FONTNAME',(0,1),(0,-1),'Helvetica-Bold'),('TEXTCOLOR',(1,1),(1,-1),color(BRAND['accent'])),('ROWBACKGROUNDS',(0,1),(-1,-1),[colors.white, color(BRAND['surface_low'])])]))
story.append(t); story.append(PageBreak())

# LOGO
story += section_header('Logo Usage', 'Never stretched. Never recolored. Always with clear space.', '06')
logo_rules = [['Rule','Standard'],['Clear Space','Minimum 1× height of "W" letterform on all sides'],['Minimum Size','120px wide (digital) / 1 inch (print)'],['On Light Backgrounds','Full color — crimson icon, dark wordmark'],['On Dark / Photo Backgrounds','White version only'],['On Accent (crimson)','White version only'],['Never','Stretch, skew, recolor, add gradient/shadow, or crop below 120px']]
t = Table(logo_rules, colWidths=[1.8*inch, W-1.8*inch])
t.setStyle(TableStyle([('BACKGROUND',(0,0),(-1,0),color(BRAND['near_black'])),('TEXTCOLOR',(0,0),(-1,0),color(BRAND['white'])),('FONTNAME',(0,0),(-1,0),'Helvetica-Bold'),('FONTSIZE',(0,0),(-1,-1),8.5),('ROWHEIGHT',(0,0),(-1,-1),20),('GRID',(0,0),(-1,-1),0.5,color(BRAND['gray_200'])),('LEFTPADDING',(0,0),(-1,-1),8),('VALIGN',(0,0),(-1,-1),'MIDDLE'),('FONTNAME',(0,1),(0,-1),'Helvetica-Bold'),('TEXTCOLOR',(0,1),(0,-1),color(BRAND['accent'])),('ROWBACKGROUNDS',(0,1),(-1,-1),[colors.white, color(BRAND['surface_low'])])]))
story.append(t); story.append(Spacer(1,16))
story.append(Paragraph('Logo Variants', S['label'])); story.append(Spacer(1,8))
# Logo at correct 4:1 aspect ratio
lw = W/3 - 8; lh = lw/4
logo_table = Table([
    [RLImage(LOGO_DARK_PATH, width=lw*0.8, height=lh*0.8), RLImage(LOGO_WHITE_PATH, width=lw*0.8, height=lh*0.8), RLImage(LOGO_WHITE_PATH, width=lw*0.8, height=lh*0.8)],
    [Paragraph('On white / light backgrounds', S['caption']), Paragraph('On dark / photo backgrounds', S['caption']), Paragraph('On accent (crimson) backgrounds', S['caption'])],
], colWidths=[lw+8, lw+8, lw+8])
logo_table.setStyle(TableStyle([('BACKGROUND',(1,0),(1,0),color(BRAND['near_black'])),('BACKGROUND',(2,0),(2,0),color(BRAND['accent'])),('ALIGN',(0,0),(-1,-1),'CENTER'),('VALIGN',(0,0),(-1,0),'MIDDLE'),('ROWHEIGHT',(0,0),(-1,0),lh*0.8+16),('BOTTOMPADDING',(0,0),(-1,0),8),('TOPPADDING',(0,0),(-1,0),8)]))
story.append(logo_table); story.append(PageBreak())

# VOICE
story += section_header('Voice & Copy', 'Plain. Direct. Human. Specific. Never corporate speak.', '07')
for dl, de, dtl, dte in [
    ('✓ Direct','"Apply now. We respond within 3–5 business days."','✗ Corporate','"We\'d love to connect on your exciting journey forward!"'),
    ('✓ Specific','"CompTIA A+, IBM AI Professional, $62K–$88K starting."','✗ Vague','"Industry-recognized certs in high-demand fields."'),
    ('✓ Inclusive','"For adults at any stage of their career."','✗ Exclusive','"For recent grads and young professionals."'),
    ('✓ Free','"$0 cost to members."','✗ Hedged','"Complimentary training (terms apply)."'),
]:
    t = Table([[Paragraph(f'<font color="#{BRAND["green"][1:]}"><b>{dl}</b></font><br/><font size="8">{de}</font>', S['do_dont']), Paragraph(f'<font color="#{BRAND["accent"][1:]}"><b>{dtl}</b></font><br/><font size="8">{dte}</font>', S['do_dont'])]], colWidths=[W/2-6, W/2-6])
    t.setStyle(TableStyle([('VALIGN',(0,0),(-1,-1),'TOP'),('BOTTOMPADDING',(0,0),(-1,-1),8),('LINEBELOW',(0,0),(-1,-1),0.5,color(BRAND['gray_200']))]))
    story.append(t)
story.append(Spacer(1,12)); story.append(Paragraph('Terminology', S['label'])); story.append(Spacer(1,6))
terms = [['Use This','Not This','Reason'],['Member','Student / User / Candidate','We serve adults in a community, not students.'],['Counselor','Advisor / Coach / Mentor','Specific role with defined responsibilities.'],['Free / $0','No-cost / Complimentary','Say it plainly. Asterisks create distrust.'],['WorkforceAP','WAP / Workforce AP','One word, camel case. Always.'],['CompTIA A+','"a certification"','Always use full official certification name.']]
t = Table(terms, colWidths=[1.3*inch, 1.6*inch, W-2.9*inch])
t.setStyle(TableStyle([('BACKGROUND',(0,0),(-1,0),color(BRAND['near_black'])),('TEXTCOLOR',(0,0),(-1,0),color(BRAND['white'])),('FONTNAME',(0,0),(-1,0),'Helvetica-Bold'),('FONTSIZE',(0,0),(-1,-1),8.5),('ROWHEIGHT',(0,0),(-1,-1),20),('GRID',(0,0),(-1,-1),0.5,color(BRAND['gray_200'])),('LEFTPADDING',(0,0),(-1,-1),8),('VALIGN',(0,0),(-1,-1),'MIDDLE'),('FONTNAME',(0,1),(0,-1),'Helvetica-Bold'),('TEXTCOLOR',(0,1),(0,-1),color(BRAND['green'])),('TEXTCOLOR',(1,1),(1,-1),color(BRAND['accent'])),('ROWBACKGROUNDS',(0,1),(-1,-1),[colors.white, color(BRAND['surface_low'])])]))
story.append(t); story.append(PageBreak())

# QUICK REF
story += section_header('Quick Reference', 'All rules. One page.', '08')
qr = [['Category','Rule'],['Primary CTA','#AD2C4D Crimson — always, one per screen'],['Gold','Dark backgrounds only. Never on white/light (fails WCAG)'],['Hero Text','Use #fff directly on dark overlays — NOT var(--color-white)'],['Font','Inter only. Body 16px/1.6lh. Headings Bold 700'],['Spacing','8px grid. CSS tokens only — no arbitrary values'],['Contrast','4.5:1 body, 3:1 large text/UI components (WCAG AA)'],['Radius','Buttons: 8px · Cards: 12px · Modals: 16px'],['Mobile','<640px: single column, 44px touch targets, bottom nav'],['Logo','1× "W" height clear space. Min 120px. Never below 120px.'],['CTA Copy','"Apply for Free" > "Learn More" — specific + active voice'],['Dark Mode','Use var() tokens — never hardcode hex in components'],['Terminology','"Member" not "student". "WorkforceAP" not "WAP"']]
t = Table(qr, colWidths=[1.8*inch, W-1.8*inch])
t.setStyle(TableStyle([('BACKGROUND',(0,0),(-1,0),color(BRAND['near_black'])),('TEXTCOLOR',(0,0),(-1,0),color(BRAND['white'])),('FONTNAME',(0,0),(-1,0),'Helvetica-Bold'),('FONTSIZE',(0,0),(-1,-1),8.5),('ROWHEIGHT',(0,0),(-1,-1),20),('GRID',(0,0),(-1,-1),0.5,color(BRAND['gray_200'])),('LEFTPADDING',(0,0),(-1,-1),8),('VALIGN',(0,0),(-1,-1),'MIDDLE'),('FONTNAME',(0,1),(0,-1),'Helvetica-Bold'),('TEXTCOLOR',(0,1),(0,-1),color(BRAND['accent'])),('ROWBACKGROUNDS',(0,1),(-1,-1),[colors.white, color(BRAND['surface_low'])])]))
story.append(t)
story.append(Spacer(1,20))
story.append(HRFlowable(width='100%', thickness=1, color=color(BRAND['accent'])))
story.append(Spacer(1,8))
story.append(Paragraph('Design system: workforceap-beta/css/main.css  ·  Questions: info@workforceap.org', S['caption']))

OUTPUT = '/tmp/WorkforceAP-Brand-Style-Guide.pdf'
doc = SimpleDocTemplate(OUTPUT, pagesize=letter, leftMargin=0.6*inch, rightMargin=0.6*inch, topMargin=0.75*inch, bottomMargin=0.75*inch, title='WorkforceAP Brand Style Guide', author='WorkforceAP Product Team')
doc._section = 'Brand Style Guide'

class CoverCanvas(pdfcanvas.Canvas):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self._page_states = []
    def showPage(self):
        self._page_states.append(dict(self.__dict__))
        self._startPage()
    def save(self):
        for state in self._page_states:
            self.__dict__.update(state)
            if self._pageNumber == 1:
                draw_cover(self, None)
            on_page(self, type('D', (), {'page': self._pageNumber, '_section': 'Brand Style Guide'})())
            super().showPage()
        super().save()

doc.build(story, canvasmaker=CoverCanvas)
import os
print(f"Done: {OUTPUT} ({os.path.getsize(OUTPUT)//1024}KB)")
