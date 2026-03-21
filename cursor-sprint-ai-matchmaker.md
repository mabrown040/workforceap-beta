# AI Matchmaker – Weighted Scoring Algorithm

## Overview

The WorkforceAP AI Matchmaker uses a **weighted scoring algorithm** to rank job–candidate matches. Each factor contributes a normalized score (0–1) multiplied by its weight; the final match score is 0–100.

## Scoring Factors & Weights

| Factor | Weight | Description |
|--------|--------|-------------|
| Program alignment | 0.35 | Candidate's enrolled program vs job's suggested programs |
| Assessment readiness | 0.20 | Career readiness assessment score |
| Certifications | 0.25 | Match of job's preferred certifications to candidate's certs |
| Course completion | 0.10 | Progress through program courses |
| Skills matching | 0.10 | Overlap of job requirements with program skills |

**Total weight: 1.0**

## Factor Details

### 1. Program Alignment (35%)

- **1.0** – Candidate's program is in job's `suggestedPrograms`
- **0.33** – Candidate has a program but it's not suggested
- **0** – No enrolled program

### 2. Assessment Readiness (20%)

- **1.0** – Assessment score ≥ 70%
- **0.5** – Assessment score 50–69%
- **0.2** – Assessment score &lt; 50%
- **0** – No assessment score

### 3. Certifications (25%)

- **1.0** – All job preferred certifications matched
- **0.5** – At least one certification matched
- **0** – No certifications matched

Partial credit: `matchedCount / jobPreferredCount` when job has multiple preferred certs.

### 4. Course Completion (10%)

- **1.0** – 3+ courses completed
- **0.33** – 1–2 courses completed
- **0** – 0 courses completed

### 5. Skills Matching (10%)

- Compares job `requirements` to candidate's program `skills` (from `lib/content/programs.ts`)
- Score = `matchedRequirements / totalRequirements` (0–1)
- Uses fuzzy matching (substring/contains) for skill keywords

## Output

- **Match score**: 0–100 (integer)
- **Match reasons**: Human-readable bullets explaining contributing factors
- **Minimum threshold**: Candidates with score &gt; 0 are included; top 10 returned by default

## Implementation

- `lib/ai/matchWeights.ts` – Weights config and scoring helpers
- `lib/ai/matchStudents.ts` – Main matching logic using weighted algorithm

## Tuning

Adjust weights in `lib/ai/matchWeights.ts` to emphasize program fit, certifications, or readiness. Weights must sum to 1.0.
