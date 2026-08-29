# TWC program syllabus source manifest

**Received:** July 2026; rows 6, 7, and 9 superseded by EDvera-approved PDF amendments received August 27, 2026
**Canonical transcription:** `shared/programSyllabi.ts`
**Website mappings:** Existing public and enrollment slugs are preserved.

The SHA-256 values below identify the exact source documents supplied by the program owner. The canonical TypeScript transcription preserves every program title, provider line, delivery format, hour statement, tuition/fee statement, prerequisite, description, course order, per-course hour value, and course description used on the public website.

| # | Existing website slug | Source document | SHA-256 |
|---|---|---|---|
| 1 | `it-support-professional-certificate-ibm` | `1-IT_Support_Professional_Certificate_IBM.docx` | `107b080538dbd2b9dbf9a15274a071cbce40cb480092ee96c66f4cee1bf5aeac` |
| 2 | `comptia-a-professional-certificate` | `2-CompTIA_A_Professional_Certificate_CompTIA_A.docx` | `e25f11cea5d1fb19078a74a715f0e608fc40d5e82297785f3137323eaea36a9e` |
| 3 | `cybersecurity-professional-certificate-google` | `3-Cybersecurity_and_Networking_Professional_Certificate_Net_Sec.docx` | `90cf7911a4e909f5fc13e6d60c634ebf743bce10251b22aaf00894bb41e48960` |
| 4 | `project-management-professional-certificate-microsoft` | `4-Project_Management_Professional_Certificate_Microsoft.docx` | `d8cf4a5b52674f3c025115b29f59d49b4460eafbdab120e31a35ca395ba4539f` |
| 5 | `ai-practitioner-professional-certificate-aws` | `5-AI_Practitioner_Professional_Certificate_AWS.docx` | `463235611e3bbdc611e382bbfd6bd19a1c895d5e70ea34f572549e4447f3b3ab` |
| 6 | `data-analytics-professional-certificate-google` | `6-Management Analyst & Business Intelligence Professional Certificate (IBM).pdf` | `49079c1479a516089f3a374dbcbc35dc2b0b267eb99c22b22db93ea9777a41af` |
| 7 | `data-science-professional-certificate-ibm` | `7-Database Administrator (DBA) Professional Certificate (IBM).pdf` | `f1c3f8eb3838bc76bc7863b72ab7245ca5f632131cde28775f1b212037a1289f` |
| 8 | `aws-cloud-technology-amazon` | `8-AWS_Cloud_Technology_Professional_Certificate_AWS.docx` | `91f2848866dc01fd057dccbf66e4afc28b54e2faf473281cb5c77ef7864743c0` |
| 9 | `ux-design-professional-certificate-google` | `9-User Experience & Interface Design Professional Certificate (Google).pdf` | `6ac3ac7d95b30786356fbc702245ac0ea42d5410594aa6add3629bdf2385ff08` |
| 10 | `digital-marketing-e-commerce-google` | `10-Digital_Marketing__E-Commerce_Professional_Certificate_Google.docx` | `57396b1b42bbe53ed58b08992c146da9f758585f99e04d4fcd6f6e6f7192c0ca` |
| 11 | `software-developer-professional-certificate-ibm` | `11-AI_and_Software_Developer_Professional_Certificate_IBM.docx` | `260e264c661fe627d4f963c7b83d687124b94d7a17e73cbc409a1de4ec83197b` |
| 12 | `health-information-technology-mchit` | `12-Medical_Billing_Coding_and_Health_Information_Technician_Certificate_MBCHIT.docx` | `146aed96a69baa289c0956d460d4742b0d89fc8f1c5ea4809bcb572010710778` |

## Source-document inconsistencies preserved for owner/TWC resolution

1. **IBM IT Support:** The course title says “CompTIA Tech+ Certification”; its description says “CompTIA ITF+ Certification exam.”
2. **AWS AI Practitioner:** The description calls it a 16-course pathway; the source contains 16 topical courses plus one 15-hour lab/project/test-preparation module. The source phrase “practical use cacross knowledge work” is preserved verbatim.
3. **IBM AI and Software Developer:** The description calls it a 16-course pathway; the source contains 16 topical courses plus one 4-hour lab/project/test-preparation module. The document states 200 total hours and its course rows total 200 hours, but its header says 197 clock hours plus 4 lab hours, which equals 201.
4. **MBCHIT:** The description calls it a 15-course program; the source contains 15 topical courses plus one 35-hour lab/project/test-preparation module.

## August 2026 amendment handling

The public Astro catalog now renders the approved Management Analyst & Business Intelligence, Database Administrator, and User Experience & Interface Design syllabi from rows 6, 7, and 9. Their stable website slugs remain unchanged so applications and enrollment references continue to resolve.

Management and DBA are repurposed curricula. Existing portal course-progress keys remain frozen to their previously assigned Coursera curricula until a versioned migration is reconciled with live Coursera for Business assignments. This prevents a public syllabus update from resetting member progress or launching a retired course by array position.

No assumptions or silent corrections were made for these conflicts.
