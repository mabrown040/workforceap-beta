# AI Tools Rollout Backlog

## Current Sprint: Stitch UI Implementation
- [x] AI Career Toolkit hub page (bento grid of 9 tools)
- [x] Job Match Scorer UI (circular score, dual-pane, keyword gaps)
- [x] Resume Rewriter UI (split editor, tone selector, ATS toggle)
- [x] Interview Practice Generator UI (setup form, question preview)
- [x] Cover Letter Builder UI
- [x] LinkedIn Headline Generator UI
- [x] LinkedIn About Section Generator UI
- [x] Member Certifications page ("Verification Vault" with roadmap)
- [x] Member Learning Hub (with CivicBot floating panel)
- [x] Member Job Board (CivicBot match scores, portal-only)
- [x] Programs Catalog dark mode (bento grid with featured card)
- [x] Admin Audit Logs page (compliance registry table)
- [x] Refined Job Match Scorer (floating analyze button)
- [x] Refined Resume Rewriter (controls bar, knowledge card)
- [x] Refined Interview Practice (focus cards, difficulty slider, preview)
- [x] Salary Negotiation Script Generator UI
- [x] Gap Analyzer UI
- [x] Application Tracker UI

## Next Sprint: Functional Enhancements

### PDF/DOC Export (High Priority)
- [x] Resume Rewriter — download optimized resume as PDF/DOCX
- [x] Cover Letter Builder — download as PDF/DOCX
- [x] Interview Practice — export session transcript + feedback as PDF
- [x] Salary Negotiation — export scripts as PDF
- **Tech**: Use `react-pdf` or `@react-pdf/renderer` for PDF generation; `docx` npm package for DOCX

### Skill Mapper (Medium Priority)
- [ ] Research free skills taxonomy APIs/databases:
  - O*NET (US Dept of Labor) — free API for occupation skills, knowledge, abilities
  - ESCO (European Skills/Competences) — open data
  - LinkedIn Skills API (if available)
  - Lightcast (formerly EMSI/Burning Glass) — paid but comprehensive
- [ ] Build radar chart visualization with real skill data
- [ ] Map member certifications/training to skill categories
- [ ] Compare member skills vs. job market demand
- [ ] Recommend courses/certs to fill gaps
- **Tech**: SVG radar chart (already mocked in stitch), O*NET API for skills taxonomy

### Interview Simulator (Future Sprint)
- [ ] ElevenLabs integration for AI interviewer voice
- [ ] Speech-to-text for candidate responses (Web Speech API or Deepgram)
- [ ] Real-time coaching panel (speech clarity, confidence, keyword usage)
- [ ] Video recording via WebRTC (optional)
- [ ] STAR framework response scaffolding
- [ ] Session transcript + scoring export
- **Tech**: ElevenLabs (have account), Web Speech API for STT, WebRTC for video

### Resume Auditor (Future Sprint)
- [ ] Split-pane: resume preview (white document) + AI analysis panel
- [ ] Target alignment score (circular SVG)
- [ ] Section-by-section audit with color-coded markers
- [ ] Missing metrics detection
- [ ] Bullet point optimization suggestions with before/after
- [ ] Skill match tags (green = matched, red = missing)
- **Tech**: Parse resume text, run against job description via AI, return structured analysis

## API & Infrastructure Notes
- ElevenLabs account available for voice synthesis
- AI tools currently use server-side API routes for generation
- PDF export should happen client-side to avoid server load
- Skill data could be seeded from O*NET OnLine (free, public domain)
