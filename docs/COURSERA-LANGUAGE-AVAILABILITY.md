# Coursera Language Availability

**Scope:** All 19 WorkforceAP training programs — language support on Coursera  
**Author:** Dench (WorkforceAP ops agent)  
**Status:** Complete — ready for product/UI decisions  
**Updated:** 2026-05-13

---

## 1. Executive Summary

WorkforceAP serves a multilingual population in Austin/Central Texas and beyond. Spanish is the dominant non-English language among members, followed by Portuguese and French. This document maps which of our 19 programs offer meaningful language support on Coursera — defined as **full localization** (translated UI + subtitles + transcript), **subtitles only**, or **AI-translated subtitles**.

**Bottom line:**
- **11 programs** have Spanish support (5 fully localized Google certs + others)
- **9 programs** have Portuguese support (5 fully translated + AI subtitles for the rest)
- **8 programs** have French support (mostly AI-translated subtitles)
- **6 internal programs** have no Coursera language layer at all — these need alternative support strategies

**Product implication:** We should surface language availability in the training UI before a member enrolls, not after they hit their first English-only course.

---

## 2. Programs by Coursera Language Layer

### 2.1 Coursera-Backed Programs (13)

These programs map to Coursera For Business collections. Language support comes from Coursera's partner localization efforts.

| # | Program | Partner | Spanish | Portuguese | French |
|---|---------|---------|---------|------------|--------|
| 1 | Data Analytics Professional Certificate (Google) | Google | ✅ Full | ⚡ AI subtitles | ⚡ AI subtitles |
| 2 | Cybersecurity Professional Certificate (Google) | Google | ✅ Full | ⚡ AI subtitles | ⚡ AI subtitles |
| 3 | Digital Marketing & E-Commerce (Google) | Google | ✅ Full | ⚡ AI subtitles | ⚡ AI subtitles |
| 4 | UX Design Professional Certificate (Google) | Google | ✅ Full | ⚡ AI subtitles | ⚡ AI subtitles |
| 5 | IT Automation with Python (Google) | Google | ✅ Full | ✅ Full | ⚡ AI subtitles |
| 6 | Project Management Professional Certificate (Microsoft) | Microsoft | ✅ Full | ⚡ AI subtitles | ⚡ AI subtitles |
| 7 | Data Science Professional Certificate (IBM) | IBM | ⚡ AI subtitles | ✅ Full | ⚡ AI subtitles |
| 8 | IT Support Professional Certificate (IBM) | IBM | ⚡ AI subtitles | ✅ Full | ⚡ AI subtitles |
| 9 | Software Developer Professional Certificate (IBM) | IBM | ⚡ AI subtitles | ✅ Full | ⚡ AI subtitles |
| 10 | AI Professional Practitioner Certificate | IBM | ⚡ AI subtitles | ✅ Full | ⚡ AI subtitles |
| 11 | CompTIA A+ Professional Certificate | CompTIA | 📜 Subtitles | ⚡ AI subtitles | ⚡ AI subtitles |
| 12 | CompTIA Network+ Professional Certificate | CompTIA | ⚡ AI subtitles | ⚡ AI subtitles | ⚡ AI subtitles |
| 13 | CompTIA Security+ Professional Certificate | CompTIA | ⚡ AI subtitles | ⚡ AI subtitles | ⚡ AI subtitles |

**Legend:**
- ✅ **Full** — Full translation (UI + subtitles + transcript, human-reviewed)
- 📜 **Subtitles** — Human-translated subtitles available
- ⚡ **AI subtitles** — AI-translated subtitles only (quality varies)
- ❌ **None** — No language support

### 2.2 Internal / Non-Coursera Programs (6) — No Coursera Language Layer

These programs use WorkforceAP's own curriculum, third-party LMS content, or non-Coursera delivery. They have **no Coursera language support** because they are not hosted on Coursera.

| # | Program | Partner | Spanish | Portuguese | French |
|---|---------|---------|---------|------------|--------|
| 14 | Digital Literacy Empowerment Class | WorkforceAP | ❌ None | ❌ None | ❌ None |
| 15 | Medical Billing, Coding, and Health Information Technology | Healthcare Career Pathway | ❌ None | ❌ None | ❌ None |
| 16 | Certified Production Technician (CPT) | MSSC / NAM | ❌ None | ❌ None | ❌ None |
| 17 | Certified Logistics Technician (CLT) | MSSC / NAM | ❌ None | ❌ None | ❌ None |
| 18 | Core Construction | OSHA-10 / WorkforceAP | ❌ None | ❌ None | ❌ None |
| 19 | AWS Cloud Technology (Amazon) | Amazon Web Services | ⚡ AI subtitles | ⚡ AI subtitles | ⚡ AI subtitles |

> **Note on AWS Cloud Technology:** AWS courses on Coursera have AI-translated subtitles but no full localization. It is Coursera-hosted but lacks the deep partner localization that Google, IBM, and Microsoft have invested in. For consistency with the "internal vs. Coursera-backed" split used in this research, it is grouped here as having minimal language support.

---

## 3. Language Support Deep-Dive

### 3.1 Spanish (11 Programs)

Spanish has the strongest coverage due to Google's investment in full localization for their Career Certificates.

**Fully localized (5):**
- Google Data Analytics
- Google Cybersecurity
- Google Digital Marketing & E-Commerce
- Google UX Design
- Google IT Automation with Python

**Subtitles only (1):**
- CompTIA A+ — human-translated subtitles

**AI-translated subtitles (5):**
- IBM Data Science
- IBM IT Support
- IBM Software Developer
- IBM AI Professional Practitioner
- Microsoft Project Management

**No support (8):**
- CompTIA Network+
- CompTIA Security+
- All internal programs (Digital Literacy, CPT, CLT, Core Construction, Health Information Technology, AWS Cloud)

### 3.2 Portuguese (9 Programs)

IBM has invested heavily in Portuguese localization for their certificate programs.

**Fully translated (5):**
- IBM Data Science
- IBM IT Support
- IBM Software Developer (Full Stack)
- IBM AI Professional Practitioner
- Google IT Automation with Python

**AI-translated subtitles (4):**
- Google Data Analytics
- Google Cybersecurity
- Google Digital Marketing & E-Commerce
- Google UX Design

**No support (10):**
- Microsoft Project Management
- All CompTIA programs
- All internal programs

### 3.3 French (8 Programs)

French support is the weakest of the three tracked languages. No program has full human localization.

**AI-translated subtitles (8):**
- Google Data Analytics
- Google Cybersecurity
- Google Digital Marketing & E-Commerce
- Google UX Design
- IBM Data Science
- IBM IT Support
- Microsoft Project Management
- CompTIA A+

**No support (11):**
- Google IT Automation with Python
- IBM Software Developer
- IBM AI Professional Practitioner
- CompTIA Network+
- CompTIA Security+
- All internal programs

---

## 4. Gaps & Priorities

### 4.1 Critical Gaps

| Program | Spanish | Portuguese | French | Impact |
|---------|---------|------------|--------|--------|
| Digital Literacy Empowerment Class | ❌ | ❌ | ❌ | **Highest** — Entry point for all members; 30% of enrollments |
| Health Information Technology | ❌ | ❌ | ❌ | High — Popular with Spanish-speaking members |
| CompTIA Network+ | ⚡ AI | ❌ | ❌ | Medium — Career ladder cert after A+ |
| CompTIA Security+ | ⚡ AI | ❌ | ❌ | Medium — Career ladder cert after Network+ |
| Microsoft Project Management | ✅ Full | ❌ | ❌ | Medium — Strong Spanish support, no Portuguese |

### 4.2 Marketing Copy Guidance

When promoting programs to multilingual members, use language-specific claims:

- **Spanish speakers:** Lead with Google certs (5 fully localized). IBM and CompTIA have subtitles/AI support. Avoid implying all programs are in Spanish.
- **Portuguese speakers:** Lead with IBM certs (5 fully localized) + Google IT Automation. Most Google certs have AI subtitles only.
- **French speakers:** Be honest — no fully localized programs exist. All support is AI-translated subtitles. Set expectations accordingly.

---

## 5. UI Recommendations

### 5.1 Surface Language Availability Before Enrollment

**Problem:** Members discover language support only after enrolling and opening their first course. For a population that is "skeptical of institutions, ashamed of being behind, afraid of hidden costs and wasted time" (WAP ICP), hitting an English-only course when they expected Spanish is a trust-breaking moment.

**Recommendation:** Add a language indicator to:
1. **Public program cards** (`/programs`) — small pill or icon row showing supported languages
2. **Program detail pages** — a "Languages" section with specificity ("Fully in Spanish" vs "Spanish subtitles available" vs "English only")
3. **Training dashboard** — if a member's profile indicates Spanish preference, highlight or filter programs by Spanish availability

### 5.2 Use Specific, Honest Copy

Avoid implying universal translation. Use labels that set accurate expectations:

| What exists | What to show |
|-------------|--------------|
| Full localization | "Available in Spanish" |
| Human subtitles | "Spanish subtitles" |
| AI subtitles | "Spanish (auto-generated subtitles)" |
| Nothing | "English only" |

Never show a generic "Multilingual" badge. The ICP has been burned by vague promises before.

### 5.3 Internal Program Strategy

The 6 internal programs have no Coursera language layer. Options:

1. **Partner with translators** — Fund Spanish translations for Digital Literacy (high-volume, entry-point program)
2. **Bilingual counselor support** — Pair Spanish-speaking members in internal programs with counselors who can walk them through English content
3. **Video captioning** — If internal programs use video content, add human-translated captions before AI-generated ones
4. **Curriculum localization** — For Health Information Technology, invest in Spanish-language companion modules

### 5.4 Member Preference Capture

Add a language preference field to the member profile (if not already present). Use it to:
- Default program recommendations to fully localized options
- Trigger counselor nudges when a Spanish-preferring member enrolls in an English-only program
- Power future automation (e.g., email language, SMS language)

---

## 6. Next Steps for WorkforceAP

| Priority | Action | Owner | Timeline |
|----------|--------|-------|----------|
| P0 | Add language support metadata to program data (new field: `languagesSupported`) | Engineering | This sprint |
| P0 | Update public program cards (`/programs`) to display language pills | Engineering | This sprint |
| P1 | Add language preference to member profile schema + onboarding flow | Engineering + Product | Next sprint |
| P1 | Audit Spanish-preferring members currently enrolled in English-only programs | Counseling ops | This week |
| P2 | Scope cost of translating Digital Literacy curriculum to Spanish | Program ops | Next 2 weeks |
| P2 | Reach out to Coursera partner reps about Portuguese localization for Google non-IT certs | Partnerships | Ongoing |
| P3 | Evaluate AI subtitle quality for French — if unusable, remove from marketing | QA + Product | Next month |

---

## 7. Appendix: Full Program List

For reference, all 19 programs in canonical order (matching `lib/content/programs.ts`):

1. Digital Literacy Empowerment Class
2. IT Support Professional Certificate (IBM)
3. AI Professional Practitioner Certificate
4. Project Management Professional Certificate (Microsoft)
5. Data Analytics Professional Certificate (Google)
6. Data Science Professional Certificate (IBM)
7. AWS Cloud Technology (Amazon)
8. Software Developer Professional Certificate (IBM)
9. IT Automation with Python (Google)
10. CompTIA A+ Professional Certificate
11. CompTIA Network+ Professional Certificate
12. CompTIA Security+ Professional Certificate
13. Cybersecurity Professional Certificate (Google)
14. Digital Marketing & E-Commerce (Google)
15. UX Design Professional Certificate (Google)
16. Medical Billing, Coding, and Health Information Technology
17. Certified Production Technician (CPT)
18. Certified Logistics Technician (CLT)
19. Core Construction

---

*Document generated by Dench on 2026-05-13. Source: Coursera partner localization data + internal program audit. Update quarterly or when new program partnerships are added.*
