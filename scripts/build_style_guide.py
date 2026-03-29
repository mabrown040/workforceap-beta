"""WorkforceAP Brand Style Guide PDF generator."""
from reportlab.lib.pagesizes import letter
from reportlab.lib.units import inch
from reportlab.lib import colors
from reportlab.lib.styles import ParagraphStyle
from reportlab.platypus import (
    SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle,
    HRFlowable, KeepTogether, PageBreak
)
from reportlab.lib.enums import TA_LEFT, TA_CENTER, TA_RIGHT
from reportlab.pdfgen import canvas as pdfcanvas

# ── Brand tokens (extracted from css/main.css) ──────────────────────────────
BRAND = {
    'accent':        '#AD2C4D',
    'accent_dark':   '#8B1F38',
    'accent_light':  '#FFB2BC',
    'gold':          '#FFBB00',
    'gold_light':    '#FFD54F',
    'blue':          '#2B7BB9',
    'green':         '#4A9B4F',
    'black':         '#121416',
    'near_black':    '#1C1B1B',
    'on_surface_var':'#584144',
    'surface_low':   '#F7F8FA',
    'surface':       '#FAFAFA',
    'white':         '#FFFFFF',
    'gray_200':      '#E8E8E8',
    'gray_400':      '#A3A3A3',
    'gray_600':      '#525252',
}

def hex_to_rgb(h):
    h = h.lstrip('#')
    return tuple(int(h[i:i+2], 16)/255 for i in (0, 2, 4))

def color(h):
    r, g, b = hex_to_rgb(h)
    return colors.Color(r, g, b)

# ── Styles ───────────────────────────────────────────────────────────────────
def make_styles():
    return {
        'cover_title': ParagraphStyle('CoverTitle',
            fontName='Helvetica-Bold', fontSize=36, leading=44,
            textColor=color(BRAND['white']), alignment=TA_LEFT),
        'cover_sub': ParagraphStyle('CoverSub',
            fontName='Helvetica', fontSize=14, leading=20,
            textColor=color(BRAND['accent_light']), alignment=TA_LEFT),
        'cover_meta': ParagraphStyle('CoverMeta',
            fontName='Helvetica', fontSize=10, leading=14,
            textColor=colors.Color(1,1,1,0.6), alignment=TA_LEFT),
        'section_label': ParagraphStyle('SectionLabel',
            fontName='Helvetica-Bold', fontSize=9, leading=11,
            textColor=color(BRAND['accent']), spaceBefore=24, spaceAfter=6,
            letterSpacing=1.5),
        'section_title': ParagraphStyle('SectionTitle',
            fontName='Helvetica-Bold', fontSize=22, leading=28,
            textColor=color(BRAND['near_black']), spaceAfter=8),
        'section_desc': ParagraphStyle('SectionDesc',
            fontName='Helvetica', fontSize=10, leading=16,
            textColor=color(BRAND['on_surface_var']), spaceAfter=16),
        'label': ParagraphStyle('Label',
            fontName='Helvetica-Bold', fontSize=8, leading=10,
            textColor=color(BRAND['on_surface_var'])),
        'value': ParagraphStyle('Value',
            fontName='Helvetica', fontSize=9, leading=13,
            textColor=color(BRAND['near_black'])),
        'mono': ParagraphStyle('Mono',
            fontName='Courier', fontSize=9, leading=13,
            textColor=color(BRAND['near_black'])),
        'h1_sample': ParagraphStyle('h1_sample',
            fontName='Helvetica-Bold', fontSize=28, leading=34,
            textColor=color(BRAND['near_black'])),
        'h2_sample': ParagraphStyle('h2_sample',
            fontName='Helvetica-Bold', fontSize=22, leading=28,
            textColor=color(BRAND['near_black'])),
        'h3_sample': ParagraphStyle('h3_sample',
            fontName='Helvetica-Bold', fontSize=17, leading=22,
            textColor=color(BRAND['near_black'])),
        'h4_sample': ParagraphStyle('h4_sample',
            fontName='Helvetica-Bold', fontSize=14, leading=19,
            textColor=color(BRAND['near_black'])),
        'body_sample': ParagraphStyle('body_sample',
            fontName='Helvetica', fontSize=11, leading=17,
            textColor=color(BRAND['near_black'])),
        'small_sample': ParagraphStyle('small_sample',
            fontName='Helvetica', fontSize=9, leading=14,
            textColor=color(BRAND['on_surface_var'])),
        'caption': ParagraphStyle('Caption',
            fontName='Helvetica', fontSize=8, leading=11,
            textColor=color(BRAND['gray_400'])),
        'footer': ParagraphStyle('Footer',
            fontName='Helvetica', fontSize=8, leading=11,
            textColor=color(BRAND['gray_400']), alignment=TA_RIGHT),
        'toc_item': ParagraphStyle('TOCItem',
            fontName='Helvetica', fontSize=11, leading=18,
            textColor=color(BRAND['near_black'])),
        'do_dont': ParagraphStyle('DoDont',
            fontName='Helvetica', fontSize=9, leading=14,
            textColor=color(BRAND['near_black'])),
        'use_case': ParagraphStyle('UseCase',
            fontName='Helvetica', fontSize=9, leading=14,
            textColor=color(BRAND['on_surface_var']), leftIndent=12),
    }

S = make_styles()

# ── Cover page ────────────────────────────────────────────────────────────────
class CoverPage:
    def __init__(self, doc):
        self.doc = doc

    def draw(self, c, doc):
        W, H = letter
        # Dark background
        c.setFillColor(color(BRAND['black']))
        c.rect(0, 0, W, H, fill=1, stroke=0)
        # Accent stripe top
        c.setFillColor(color(BRAND['accent']))
        c.rect(0, H - 0.25*inch, W, 0.25*inch, fill=1, stroke=0)
        # Gold accent bar bottom
        c.setFillColor(color(BRAND['gold']))
        c.rect(0.75*inch, 0.75*inch, 1.5*inch, 4, fill=1, stroke=0)
        # Logo area (text)
        c.setFillColor(color(BRAND['white']))
        c.setFont('Helvetica-Bold', 11)
        c.drawString(0.75*inch, H - 0.7*inch, 'WORKFORCEAP')
        # Title
        c.setFont('Helvetica-Bold', 40)
        c.setFillColor(color(BRAND['white']))
        c.drawString(0.75*inch, H * 0.55, 'Brand Style')
        c.drawString(0.75*inch, H * 0.55 - 48, 'Guide')
        # Subtitle
        c.setFont('Helvetica', 14)
        c.setFillColor(color(BRAND['accent_light']))
        c.drawString(0.75*inch, H * 0.55 - 90, 'Visual Identity & Design System')
        # Version / date
        c.setFont('Helvetica', 9)
        c.setFillColor(colors.Color(1,1,1,0.5))
        c.drawString(0.75*inch, 1.1*inch, 'Version 1.0  •  March 2026  •  Confidential')
        # Decorative circles
        c.setFillColor(colors.Color(*hex_to_rgb(BRAND['accent']), 0.15))
        c.circle(W - 1*inch, H * 0.35, 2.5*inch, fill=1, stroke=0)
        c.setFillColor(colors.Color(*hex_to_rgb(BRAND['gold']), 0.08))
        c.circle(W - 0.5*inch, H * 0.6, 1.5*inch, fill=1, stroke=0)


# ── Page template ────────────────────────────────────────────────────────────
def on_page(c, doc):
    W, H = letter
    pg = doc.page
    if pg == 1:
        return  # Cover handled separately
    # Header rule
    c.setStrokeColor(color(BRAND['gray_200']))
    c.setLineWidth(0.5)
    c.line(0.6*inch, H - 0.55*inch, W - 0.6*inch, H - 0.55*inch)
    # Header logo text
    c.setFont('Helvetica-Bold', 7)
    c.setFillColor(color(BRAND['accent']))
    c.drawString(0.6*inch, H - 0.45*inch, 'WORKFORCEAP')
    # Header page title (from doc.section if set)
    c.setFont('Helvetica', 7)
    c.setFillColor(color(BRAND['gray_400']))
    section = getattr(doc, '_section', 'Brand Style Guide')
    c.drawRightString(W - 0.6*inch, H - 0.45*inch, section)
    # Footer rule
    c.line(0.6*inch, 0.55*inch, W - 0.6*inch, 0.55*inch)
    # Footer
    c.setFont('Helvetica', 7)
    c.setFillColor(color(BRAND['gray_400']))
    c.drawString(0.6*inch, 0.38*inch, 'WorkforceAP Brand Style Guide — Confidential')
    c.drawRightString(W - 0.6*inch, 0.38*inch, f'Page {pg}')


# ── Helpers ──────────────────────────────────────────────────────────────────
def section_header(title, subtitle=None, section_label=None):
    items = []
    if section_label:
        items.append(Paragraph(section_label.upper(), S['section_label']))
    items.append(Paragraph(title, S['section_title']))
    if subtitle:
        items.append(Paragraph(subtitle, S['section_desc']))
    items.append(HRFlowable(width='100%', thickness=0.5, color=color(BRAND['gray_200']), spaceAfter=12))
    return items

def color_swatch_table(swatches, cols=4):
    """swatches = list of (name, hex, usage)"""
    rows = []
    for i in range(0, len(swatches), cols):
        chunk = swatches[i:i+cols]
        rows.append(chunk)
    
    table_rows = []
    for row in rows:
        swatch_row = []
        label_row = []
        for (name, hex_val, usage) in row:
            # Build swatch cell
            swatch_row.append('')
            label_row.append(
                Paragraph(f'<b>{name}</b><br/><font name="Courier" size="8">{hex_val}</font><br/><font size="7" color="#{BRAND["on_surface_var"][1:]}">{usage}</font>', S['value'])
            )
        table_rows.append(swatch_row)
        table_rows.append(label_row)
    
    W = letter[0] - 1.2*inch
    col_w = W / cols
    t = Table(table_rows, colWidths=[col_w]*cols)
    
    ts = [
        ('ALIGN', (0,0), (-1,-1), 'LEFT'),
        ('VALIGN', (0,0), (-1,-1), 'TOP'),
        ('BOTTOMPADDING', (0,0), (-1,-1), 4),
        ('TOPPADDING', (0,0), (-1,-1), 0),
    ]
    # Color the swatch rows (even rows = swatches)
    for row_i, row in enumerate(rows):
        for col_i, (name, hex_val, usage) in enumerate(row):
            actual_row = row_i * 2
            ts.append(('BACKGROUND', (col_i, actual_row), (col_i, actual_row), color(hex_val)))
            ts.append(('ROWHEIGHT', (col_i, actual_row), (col_i, actual_row), 40))
            # border for swatch
            ts.append(('BOX', (col_i, actual_row), (col_i, actual_row), 0.5, colors.white))
    
    t.setStyle(TableStyle(ts))
    return t


def spacing_table(sizes):
    """sizes = list of (label, px, usage)"""
    rows = [['Token', 'Value', 'Usage']]
    for label, px, usage in sizes:
        rows.append([label, px, usage])
    t = Table(rows, colWidths=[1.5*inch, 1*inch, 4*inch])
    t.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,0), color(BRAND['surface_low'])),
        ('FONTNAME', (0,0), (-1,0), 'Helvetica-Bold'),
        ('FONTSIZE', (0,0), (-1,-1), 9),
        ('ROWHEIGHT', (0,0), (-1,-1), 22),
        ('GRID', (0,0), (-1,-1), 0.5, color(BRAND['gray_200'])),
        ('LEFTPADDING', (0,0), (-1,-1), 8),
        ('VALIGN', (0,0), (-1,-1), 'MIDDLE'),
        ('TEXTCOLOR', (0,0), (-1,0), color(BRAND['near_black'])),
        ('TEXTCOLOR', (0,1), (-1,-1), color(BRAND['near_black'])),
    ]))
    return t


# ── Content builder ──────────────────────────────────────────────────────────
def build_story():
    story = []
    W = letter[0] - 1.2*inch

    # ── Page 1: Cover (blank — drawn by CoverPage) ──
    story.append(Spacer(1, 0.1*inch))
    story.append(PageBreak())

    # ── Page 2: Table of Contents ──
    story += section_header('Contents', section_label='Navigation')
    toc = [
        ('01', 'Brand Identity', 'Mission, voice, and positioning'),
        ('02', 'Color System', 'Primary palette, semantic colors, dark mode'),
        ('03', 'Typography', 'Typeface, scale, hierarchy, line-height'),
        ('04', 'Spacing & Layout', 'Grid, spacing tokens, breakpoints'),
        ('05', 'Iconography', 'Material Symbols usage rules'),
        ('06', 'Buttons & CTAs', 'Primary, secondary, ghost, disabled'),
        ('07', 'Forms & Inputs', 'Labels, states, validation'),
        ('08', 'Cards & Surfaces', 'Elevation, border-radius, containers'),
        ('09', 'Photography & Imagery', 'Shot style, overlays, diversity'),
        ('10', 'Voice & Copy', 'Tone of voice, do/don\'t, terminology'),
        ('11', 'Logo Usage', 'Clear space, placement, color variants'),
    ]
    for num, title, desc in toc:
        row_table = Table(
            [[Paragraph(f'<font color="#{BRAND["accent"][1:]}"><b>{num}</b></font>', S['toc_item']),
              Paragraph(title, S['toc_item']),
              Paragraph(desc, S['small_sample'])]],
            colWidths=[0.5*inch, 2.5*inch, W - 3*inch]
        )
        row_table.setStyle(TableStyle([
            ('VALIGN', (0,0), (-1,-1), 'MIDDLE'),
            ('BOTTOMPADDING', (0,0), (-1,-1), 8),
            ('LINEBELOW', (0,0), (-1,-1), 0.5, color(BRAND['gray_200'])),
        ]))
        story.append(row_table)
    story.append(PageBreak())

    # ── Page 3: Brand Identity ──
    story += section_header('Brand Identity', 'Who we are, what we stand for, and how we speak.', '01')

    story.append(Paragraph('Mission Statement', S['label']))
    story.append(Spacer(1, 4))
    story.append(Paragraph(
        'WorkforceAP is the operating system for workforce development — connecting underserved adults, the organizations that serve them, and the employers that need them, in one verified closed loop.',
        S['body_sample']))
    story.append(Spacer(1, 16))

    story.append(Paragraph('Brand Positioning', S['label']))
    story.append(Spacer(1, 4))
    pos_data = [
        ['Attribute', 'WorkforceAP Is', 'WorkforceAP Is Not'],
        ['Access', 'Free to all qualifying members, no prerequisites', 'Employer-sponsored only'],
        ['Audience', 'Adults 18+ at any career stage', 'Recent grads or college students only'],
        ['Outcome', 'Verified placement, 180-day tracking', 'Certificate mill with no job guarantee'],
        ['Technology', 'Full-stack platform with AI tools', 'PDF worksheets and email chains'],
    ]
    pos_table = Table(pos_data, colWidths=[1.2*inch, (W-1.2*inch)/2, (W-1.2*inch)/2])
    pos_table.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,0), color(BRAND['near_black'])),
        ('TEXTCOLOR', (0,0), (-1,0), color(BRAND['white'])),
        ('FONTNAME', (0,0), (-1,0), 'Helvetica-Bold'),
        ('FONTSIZE', (0,0), (-1,-1), 8),
        ('ROWHEIGHT', (0,0), (-1,-1), 22),
        ('GRID', (0,0), (-1,-1), 0.5, color(BRAND['gray_200'])),
        ('LEFTPADDING', (0,0), (-1,-1), 8),
        ('VALIGN', (0,0), (-1,-1), 'MIDDLE'),
        ('TEXTCOLOR', (0,1), (0,-1), color(BRAND['accent'])),
        ('FONTNAME', (0,1), (0,-1), 'Helvetica-Bold'),
        ('BACKGROUND', (1,1), (1,-1), colors.Color(*hex_to_rgb(BRAND['green']), 0.06)),
        ('BACKGROUND', (2,1), (2,-1), colors.Color(*hex_to_rgb('#cc0000'), 0.04)),
    ]))
    story.append(pos_table)
    story.append(Spacer(1, 20))

    story.append(Paragraph('Brand Personality', S['label']))
    story.append(Spacer(1, 6))
    traits = [
        ('Grounded', 'We don\'t over-promise. We show outcomes.'),
        ('Direct', 'Plain language. No jargon. No "unlock your potential."'),
        ('Warm but serious', 'Empathetic tone — this is someone\'s livelihood, not a SaaS demo.'),
        ('Ambitious', 'We\'re building infrastructure, not a nonprofit website.'),
        ('Inclusive', 'No age gate. No degree. No exclusion language.'),
    ]
    for trait, desc in traits:
        story.append(Table(
            [[Paragraph(f'<font color="#{BRAND["accent"][1:]}"><b>{trait}</b></font>', S['value']),
              Paragraph(desc, S['value'])]],
            colWidths=[1.5*inch, W - 1.5*inch]
        ))
        story.append(Spacer(1, 4))
    story.append(PageBreak())

    # ── Page 4-5: Color System ──
    story += section_header('Color System', 'The primary palette, accent usage rules, and semantic colors.', '02')

    story.append(Paragraph('Primary Palette', S['label']))
    story.append(Spacer(1, 6))
    primary_swatches = [
        ('Crimson (Accent)', '#AD2C4D', 'CTAs, links, accents, hero badges'),
        ('Gold', '#FFBB00', 'Dark backgrounds only — never on light surfaces'),
        ('Near Black', '#121416', 'Hero backgrounds, dark surfaces'),
        ('White', '#FFFFFF', 'Primary text on dark, light surfaces'),
    ]
    story.append(color_swatch_table(primary_swatches, cols=4))
    story.append(Spacer(1, 20))

    story.append(Paragraph('Supporting Palette', S['label']))
    story.append(Spacer(1, 6))
    supporting_swatches = [
        ('Accent Dark', '#8B1F38', 'Hover states for crimson'),
        ('Accent Light', '#FFB2BC', 'Light mode subtle tints'),
        ('Blue', '#2B7BB9', 'Links, informational states'),
        ('Green', '#4A9B4F', 'Success states, positive metrics'),
        ('On Surface', '#1C1B1B', 'Body text on light backgrounds'),
        ('On Surface Var.', '#584144', 'Secondary text, labels, captions'),
        ('Surface Low', '#F7F8FA', 'Page background (light mode)'),
        ('Gray 200', '#E8E8E8', 'Borders, dividers'),
    ]
    story.append(color_swatch_table(supporting_swatches, cols=4))
    story.append(Spacer(1, 20))

    story.append(Paragraph('Dark Mode Palette', S['label']))
    story.append(Spacer(1, 6))
    dark_swatches = [
        ('Background', '#121416', 'Page background'),
        ('Surface', '#1A1C1E', 'Cards, containers'),
        ('Surface High', '#282A2C', 'Elevated elements'),
        ('On Surface', '#E2E2E5', 'Primary text on dark'),
        ('On Surface Var.', '#DEBFC2', 'Secondary text, labels'),
        ('Accent (same)', '#AD2C4D', 'CTAs remain same crimson'),
        ('Gold (same)', '#FFBB00', 'Gold — reads well on dark'),
        ('Outline', '#584144', 'Borders on dark surfaces'),
    ]
    story.append(color_swatch_table(dark_swatches, cols=4))
    story.append(Spacer(1, 16))

    # Usage rules
    story.append(Paragraph('Color Usage Rules', S['label']))
    story.append(Spacer(1, 6))
    rules = [
        ('✓ DO', 'Use Crimson (#AD2C4D) as the sole CTA color — buttons, links, accents.'),
        ('✓ DO', 'Use Gold (#FFBB00) on dark backgrounds only (heroes, dark cards, stat numbers).'),
        ('✓ DO', 'Maintain 4.5:1 contrast ratio for body text, 3:1 for large text (18px+).'),
        ('✓ DO', 'Use CSS tokens (var(--color-accent)) — never hardcode hex values in new code.'),
        ('✗ DON\'T', 'Use Gold on white or light gray backgrounds — fails WCAG contrast.'),
        ('✗ DON\'T', 'Use hardcoded #fcf9f8, #1c1b1b, #584144 in new code — use CSS variables.'),
        ('✗ DON\'T', 'Add new colors without updating the design system.'),
        ('✗ DON\'T', 'Use red for non-error states or green for non-success states.'),
    ]
    rule_rows = [[
        Paragraph(f'<font color="#{BRAND["green"][1:] if "DO" in rule[0] and "DON" not in rule[0] else BRAND["accent"][1:]}"><b>{rule[0]}</b></font>', S['value']),
        Paragraph(rule[1], S['value'])
    ] for rule in rules]
    rule_table = Table(rule_rows, colWidths=[0.8*inch, W - 0.8*inch])
    rule_table.setStyle(TableStyle([
        ('VALIGN', (0,0), (-1,-1), 'TOP'),
        ('BOTTOMPADDING', (0,0), (-1,-1), 6),
        ('LINEBELOW', (0,0), (-1,-1), 0.5, color(BRAND['gray_200'])),
        ('LEFTPADDING', (0,0), (-1,-1), 0),
    ]))
    story.append(rule_table)
    story.append(PageBreak())

    # ── Page 6: Typography ──
    story += section_header('Typography', 'Inter is our single typeface. Hierarchy through weight and size, not font switching.', '03')

    story.append(Paragraph('Primary Typeface: Inter', S['label']))
    story.append(Spacer(1, 4))
    story.append(Paragraph(
        'Inter is a typeface carefully crafted for computer screens. It features a tall x-height, clean forms, and excellent readability at all sizes.',
        S['body_sample']))
    story.append(Spacer(1, 16))

    story.append(Paragraph('Type Scale', S['label']))
    story.append(Spacer(1, 8))

    type_examples = [
        ('Display / H1', '40px / Bold 700', 'Page heroes, major headlines', 'h1_sample',
         'Empowering People. Advancing Futures.'),
        ('H2', '32px / Bold 700', 'Section titles', 'h2_sample', 'Industry-Recognized Certifications'),
        ('H3', '24px / Bold 700', 'Card titles, subsections', 'h3_sample', 'Digital Literacy Program'),
        ('H4', '20px / Bold 700', 'Labels, emphasized body', 'h4_sample', 'Program Requirements'),
        ('Body', '16px / Regular 400', 'All paragraph text, 45-75 chars/line', 'body_sample',
         'WorkforceAP provides free career training to adults at every stage of their journey.'),
        ('Small / Caption', '14px / Regular 400', 'Metadata, labels, legal text', 'small_sample',
         'Program duration: 3-6 months • Cost to member: $0'),
    ]

    for name, spec, usage, style_key, example in type_examples:
        story.append(KeepTogether([
            Table([[
                Paragraph(f'<b>{name}</b>', S['label']),
                Paragraph(spec, S['mono']),
                Paragraph(usage, S['caption']),
            ]], colWidths=[1.2*inch, 1.6*inch, W - 2.8*inch]),
            Spacer(1, 4),
            Paragraph(example, S[style_key]),
            HRFlowable(width='100%', thickness=0.5, color=color(BRAND['gray_200']), spaceBefore=8, spaceAfter=12),
        ]))

    story.append(Spacer(1, 8))
    story.append(Paragraph('Typography Rules', S['label']))
    story.append(Spacer(1, 6))
    typo_rules = [
        ('Line Height', 'Body: 1.6x • Headings: 1.1–1.2x'),
        ('Max Line Width', '65–70 characters (max-width: ~680px on body text)'),
        ('Font Weight', 'Regular (400) for body, Bold (700) for headings and CTAs — no 500/600 in headlines'),
        ('Letter Spacing', 'Headings: -0.02em to -0.04em • Labels: +0.06em to +0.1em • Never on body'),
        ('Orphans', 'Use text-wrap: balance on headings ≤3 lines'),
        ('Numbers', 'Use tabular-nums on salary ranges, stats, and data tables'),
    ]
    rule_rows = [[Paragraph(f'<b>{r[0]}</b>', S['label']), Paragraph(r[1], S['value'])] for r in typo_rules]
    t = Table(rule_rows, colWidths=[1.5*inch, W - 1.5*inch])
    t.setStyle(TableStyle([
        ('VALIGN', (0,0), (-1,-1), 'TOP'),
        ('BOTTOMPADDING', (0,0), (-1,-1), 6),
        ('LINEBELOW', (0,0), (-1,-1), 0.5, color(BRAND['gray_200'])),
    ]))
    story.append(t)
    story.append(PageBreak())

    # ── Page 7: Spacing & Layout ──
    story += section_header('Spacing & Layout', 'An 8px base grid. Consistent scale. No arbitrary values.', '04')

    story.append(Paragraph('Spacing Scale (8px base)', S['label']))
    story.append(Spacer(1, 6))
    spacing_data = [
        ('--space-1', '4px', 'Icon padding, tight badge gaps'),
        ('--space-2', '8px', 'Compact padding inside small elements'),
        ('--space-3', '12px', 'Internal card padding (mobile)'),
        ('--space-4', '16px', 'Standard gap, button padding'),
        ('--space-6', '24px', 'Section element gaps'),
        ('--space-8', '32px', 'Card padding, large gaps'),
        ('--space-12', '48px', 'Section padding (mobile)'),
        ('--space-16', '64px', 'Section padding (desktop)'),
        ('--space-24', '96px', 'Hero padding, major section spacing'),
    ]
    story.append(spacing_table(spacing_data))
    story.append(Spacer(1, 20))

    story.append(Paragraph('Border Radius', S['label']))
    story.append(Spacer(1, 6))
    radius_data = [
        ('--radius-sm', '4px', 'Small badges, tags'),
        ('--radius-md', '8px', 'Buttons, inputs, small cards'),
        ('--radius-lg', '12px', 'Cards, dropdowns'),
        ('--radius-xl', '16px', 'Hero cards, modals, prominent containers'),
        ('--radius-full', '50px', 'Pills, avatar images, fully rounded badges'),
    ]
    story.append(spacing_table(radius_data))
    story.append(Spacer(1, 20))

    story.append(Paragraph('Breakpoints', S['label']))
    story.append(Spacer(1, 6))
    bp_data = [
        ('Mobile', '<640px', 'Single column, large touch targets (44px+), bottom nav'),
        ('Tablet', '640–1024px', 'Two-column grid, sidebar collapses'),
        ('Desktop', '1024–1440px', 'Full layout, multi-column grids'),
        ('Wide', '>1440px', 'Capped at --max-width, centered'),
    ]
    bp_table = Table([['Breakpoint', 'Range', 'Behavior']] + bp_data,
        colWidths=[1.2*inch, 1.3*inch, W - 2.5*inch])
    bp_table.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,0), color(BRAND['near_black'])),
        ('TEXTCOLOR', (0,0), (-1,0), color(BRAND['white'])),
        ('FONTNAME', (0,0), (-1,0), 'Helvetica-Bold'),
        ('FONTSIZE', (0,0), (-1,-1), 8),
        ('GRID', (0,0), (-1,-1), 0.5, color(BRAND['gray_200'])),
        ('LEFTPADDING', (0,0), (-1,-1), 8),
        ('ROWHEIGHT', (0,0), (-1,-1), 22),
        ('VALIGN', (0,0), (-1,-1), 'MIDDLE'),
    ]))
    story.append(bp_table)
    story.append(PageBreak())

    # ── Page 8: Buttons & CTAs ──
    story += section_header('Buttons & CTAs', 'One primary action per view. Consistent hierarchy.', '06')

    story.append(Paragraph('Button Hierarchy', S['label']))
    story.append(Spacer(1, 8))
    btn_types = [
        ('Primary', '#AD2C4D bg, white text, 700 weight', 'One per screen. Main conversion action (Apply, Start, Submit).'),
        ('Secondary / Outline', 'Transparent bg, accent border+text', 'Supporting actions (Learn More, Compare, View Details).'),
        ('Ghost', 'Transparent, muted text, subtle border', 'Tertiary actions, destructive caution, nav items.'),
        ('Disabled', 'Reduced opacity (0.5), not-allowed cursor', 'Unavailable actions — always include tooltip explaining why.'),
        ('Icon + Text', 'Material Symbol left of label', 'Download, Share, Add — icon reinforces action meaning.'),
    ]
    for btn_name, spec, usage in btn_types:
        story.append(KeepTogether([
            Table([[
                Paragraph(f'<b>{btn_name}</b>', S['label']),
                Paragraph(spec, S['mono']),
            ]], colWidths=[1.5*inch, W - 1.5*inch]),
            Paragraph(usage, S['use_case']),
            HRFlowable(width='100%', thickness=0.5, color=color(BRAND['gray_200']), spaceBefore=6, spaceAfter=8),
        ]))

    story.append(Spacer(1, 12))
    story.append(Paragraph('CTA Copy Rules', S['label']))
    story.append(Spacer(1, 6))
    cta_rules = [
        ('✓ DO', 'Apply for Free', 'Specific, zero-cost signal, active voice'),
        ('✓ DO', 'Start My Application', 'Personal pronoun, action verb'),
        ('✓ DO', 'Compare Programs', 'Specific, describes what happens next'),
        ('✗ DON\'T', 'Learn More', 'Generic — says nothing'),
        ('✗ DON\'T', 'Click Here', 'Meaningless, bad for accessibility'),
        ('✗ DON\'T', 'Submit', 'Mechanical, impersonal'),
        ('✗ DON\'T', 'Get Started Today!', 'Filler urgency, exclamation mark feels desperate'),
    ]
    cta_table = Table(
        [['', 'Copy', 'Why']] + [[r[0], r[1], r[2]] for r in cta_rules],
        colWidths=[0.7*inch, 2*inch, W - 2.7*inch]
    )
    cta_table.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,0), color(BRAND['surface_low'])),
        ('FONTNAME', (0,0), (-1,0), 'Helvetica-Bold'),
        ('FONTSIZE', (0,0), (-1,-1), 8),
        ('GRID', (0,0), (-1,-1), 0.5, color(BRAND['gray_200'])),
        ('LEFTPADDING', (0,0), (-1,-1), 8),
        ('ROWHEIGHT', (0,0), (-1,-1), 20),
        ('VALIGN', (0,0), (-1,-1), 'MIDDLE'),
        ('TEXTCOLOR', (0,1), (0,3), color(BRAND['green'])),
        ('TEXTCOLOR', (0,4), (0,-1), color(BRAND['accent'])),
    ]))
    story.append(cta_table)
    story.append(PageBreak())

    # ── Page 9: Voice & Copy ──
    story += section_header('Voice & Copy', 'How WorkforceAP sounds. Plain. Direct. Human.', '10')

    story.append(Paragraph('Tone Principles', S['label']))
    story.append(Spacer(1, 6))
    tones = [
        ('Direct, not cold',
         'We say what we mean. No corporate speak. No empty affirmations.',
         '"Apply now. We respond within 3–5 business days."',
         '"We\'d love to connect with you on your exciting journey forward!"'),
        ('Warm, not soft',
         'This is someone\'s livelihood. We take it seriously but not grimly.',
         '"No cost to you. Ever. Funded by employers and grants."',
         '"Our incredible platform empowers you to unlock your true potential!"'),
        ('Specific, not vague',
         'Use real numbers. Real outcomes. Real certifications.',
         '"CompTIA A+ certified. IBM AI Professional. $62K–$88K starting range."',
         '"Industry-recognized certifications in high-demand fields."'),
        ('Inclusive, not exclusive',
         'Never imply a gate. Never use "young professional" or "recent grad."',
         '"For adults at any stage of their career."',
         '"For recent grads and young professionals entering the workforce."'),
    ]
    for tone, principle, do_ex, dont_ex in tones:
        story.append(KeepTogether([
            Paragraph(f'<b>{tone}</b>', S['label']),
            Spacer(1, 3),
            Paragraph(principle, S['value']),
            Spacer(1, 5),
            Table([[
                Paragraph('<font color="#4A9B4F"><b>✓ WRITE THIS</b></font>', S['do_dont']),
                Paragraph('<font color="#AD2C4D"><b>✗ NOT THIS</b></font>', S['do_dont']),
            ], [
                Paragraph(f'"{do_ex}"', S['value']),
                Paragraph(f'"{dont_ex}"', S['value']),
            ]], colWidths=[W/2 - 6, W/2 - 6]),
            HRFlowable(width='100%', thickness=0.5, color=color(BRAND['gray_200']), spaceBefore=10, spaceAfter=12),
        ]))

    story.append(Paragraph('Terminology Standards', S['label']))
    story.append(Spacer(1, 6))
    terms = [
        ('Member', 'Program participants. Never "student," "user," or "candidate."'),
        ('Counselor', 'WorkforceAP staff supporting members. Not "advisor" or "coach."'),
        ('Partner', 'Referring organizations. Not "affiliate" or "vendor."'),
        ('Employer', 'Hiring companies. Not "client" or "partner" (different from Partner above).'),
        ('Certification', 'Always specific: "CompTIA A+" not "a certification." Never "certificate."'),
        ('WorkforceAP', 'One word, camel case. Never "Workforce AP," "WAP," or "WFAP."'),
        ('Free', 'Use "free" or "$0 cost to members" — never "no-cost" or "complimentary."'),
    ]
    term_rows = [[Paragraph(f'<b>{t[0]}</b>', S['label']), Paragraph(t[1], S['value'])] for t in terms]
    t = Table(term_rows, colWidths=[1.3*inch, W - 1.3*inch])
    t.setStyle(TableStyle([
        ('VALIGN', (0,0), (-1,-1), 'TOP'),
        ('BOTTOMPADDING', (0,0), (-1,-1), 6),
        ('LINEBELOW', (0,0), (-1,-1), 0.5, color(BRAND['gray_200'])),
    ]))
    story.append(t)
    story.append(PageBreak())

    # ── Page 10: Logo & Imagery ──
    story += section_header('Logo & Photography', 'Consistent logo usage and authentic imagery standards.', '11')

    story.append(Paragraph('Logo Usage Rules', S['label']))
    story.append(Spacer(1, 6))
    logo_rules = [
        ('Clear Space', 'Minimum clear space = 1x the height of the "W" letterform on all sides.'),
        ('Minimum Size', '120px wide (digital), 1 inch (print). Never smaller.'),
        ('On Light', 'Use full-color logo (crimson wordmark + dark icon)'),
        ('On Dark / Photos', 'Use white version or icon-only reversed'),
        ('On Accent', 'Use white version only'),
        ('Don\'t stretch', 'Always maintain aspect ratio. Never skew, rotate, or add effects.'),
        ('Don\'t recolor', 'Never apply gradient, shadow, or custom color to the logo.'),
        ('Don\'t crowd', 'Never place near other logos without the minimum clear space buffer.'),
    ]
    logo_rows = [[Paragraph(f'<b>{r[0]}</b>', S['label']), Paragraph(r[1], S['value'])] for r in logo_rules]
    t = Table(logo_rows, colWidths=[1.3*inch, W - 1.3*inch])
    t.setStyle(TableStyle([
        ('VALIGN', (0,0), (-1,-1), 'TOP'),
        ('BOTTOMPADDING', (0,0), (-1,-1), 6),
        ('LINEBELOW', (0,0), (-1,-1), 0.5, color(BRAND['gray_200'])),
    ]))
    story.append(t)
    story.append(Spacer(1, 20))

    story.append(Paragraph('Photography & Imagery Standards', S['label']))
    story.append(Spacer(1, 6))
    photo_rules = [
        ('People', 'Show real adults in professional contexts. Diverse in age, background, and ability. Never stock-photo "business handshake."'),
        ('Environment', 'Offices, classrooms, training centers, job sites — contexts where the skills apply.'),
        ('Overlay', 'Hero images always get a dark gradient overlay (rgba(18,20,22,0.82)). Never run text directly on an unfiltered photo.'),
        ('Tone', 'Warm and purposeful. Avoid cold/clinical or overly staged/aspirational (private jets, mansions).'),
        ('Certification logos', 'Always use official logos from Google, IBM, AWS, CompTIA, Microsoft. Never recreate.'),
        ('AI-generated', 'Do not use AI-generated images of people. Use authentic photography only.'),
    ]
    photo_rows = [[Paragraph(f'<b>{r[0]}</b>', S['label']), Paragraph(r[1], S['value'])] for r in photo_rules]
    t = Table(photo_rows, colWidths=[1.5*inch, W - 1.5*inch])
    t.setStyle(TableStyle([
        ('VALIGN', (0,0), (-1,-1), 'TOP'),
        ('BOTTOMPADDING', (0,0), (-1,-1), 6),
        ('LINEBELOW', (0,0), (-1,-1), 0.5, color(BRAND['gray_200'])),
    ]))
    story.append(t)
    story.append(PageBreak())

    # ── Final page: Quick Reference ──
    story += section_header('Quick Reference', 'The essential rules on one page.', '')

    qr_data = [
        ['Category', 'Rule'],
        ['Primary CTA color', '#AD2C4D — Crimson. Always.'],
        ['Gold usage', 'Dark backgrounds only. Never on white or light gray.'],
        ['Body font', 'Inter, 16px, line-height 1.6, #1C1B1B on light / #E2E2E5 on dark'],
        ['Heading font', 'Inter, Bold 700, -0.02em to -0.04em letter-spacing'],
        ['Spacing base', '8px grid. Use CSS tokens (--space-4, --space-8, etc.)'],
        ['Border radius', 'Buttons: --radius-md (8px). Cards: --radius-lg (12px). Modals: --radius-xl (16px)'],
        ['Contrast minimum', '4.5:1 body text, 3:1 large text (18px+), 3:1 UI components'],
        ['Mobile breakpoint', '<640px — single column, 44px touch targets, bottom nav'],
        ['Logo clear space', '1x "W" height on all sides. Never <120px wide.'],
        ['CTA copy', 'Specific + active voice. "Apply for Free" > "Learn More"'],
        ['Dark mode', 'Use CSS var() tokens — never hardcode hex values'],
        ['Terminology', '"Member" not "student." "WorkforceAP" not "WAP." "Free" not "complimentary."'],
    ]
    qr_table = Table(qr_data, colWidths=[2*inch, W - 2*inch])
    qr_table.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,0), color(BRAND['near_black'])),
        ('TEXTCOLOR', (0,0), (-1,0), color(BRAND['white'])),
        ('FONTNAME', (0,0), (-1,0), 'Helvetica-Bold'),
        ('FONTSIZE', (0,0), (-1,-1), 8),
        ('GRID', (0,0), (-1,-1), 0.5, color(BRAND['gray_200'])),
        ('LEFTPADDING', (0,0), (-1,-1), 8),
        ('ROWHEIGHT', (0,0), (-1,-1), 22),
        ('VALIGN', (0,0), (-1,-1), 'MIDDLE'),
        ('FONTNAME', (0,1), (0,-1), 'Helvetica-Bold'),
        ('TEXTCOLOR', (0,1), (0,-1), color(BRAND['accent'])),
        ('BACKGROUND', (0,1), (-1,-1), colors.white),
        ('ROWBACKGROUNDS', (0,1), (-1,-1), [colors.white, color(BRAND['surface_low'])]),
    ]))
    story.append(qr_table)

    story.append(Spacer(1, 24))
    story.append(HRFlowable(width='100%', thickness=0.5, color=color(BRAND['accent'])))
    story.append(Spacer(1, 8))
    story.append(Paragraph(
        'For questions about the brand or design system, contact the WorkforceAP product team. '
        'The live design system lives in the workforceap-beta repository under css/main.css.',
        S['caption']
    ))

    return story


# ── Build the PDF ────────────────────────────────────────────────────────────
OUTPUT = '/tmp/WorkforceAP-Brand-Style-Guide-2026.pdf'

doc = SimpleDocTemplate(
    OUTPUT,
    pagesize=letter,
    leftMargin=0.6*inch,
    rightMargin=0.6*inch,
    topMargin=0.75*inch,
    bottomMargin=0.75*inch,
    title='WorkforceAP Brand Style Guide',
    author='WorkforceAP Product Team',
    subject='Visual Identity & Design System',
)
doc._section = 'Brand Style Guide'

story = build_story()

# Custom canvas class for cover page
class MyCanvas(pdfcanvas.Canvas):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self._saved_page_states = []

    def showPage(self):
        self._saved_page_states.append(dict(self.__dict__))
        self._startPage()

    def save(self):
        num_pages = len(self._saved_page_states)
        for state in self._saved_page_states:
            self.__dict__.update(state)
            if self._pageNumber == 1:
                CoverPage(None).draw(self, None)
            self.canvas = self
            super().showPage()
        super().save()

doc.build(story, onFirstPage=on_page, onLaterPages=on_page)
print(f"Done: {OUTPUT}")
