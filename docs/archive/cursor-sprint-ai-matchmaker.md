# Cursor Sprint: AI Job-Candidate Matchmaker

## Task ID
workforceap-ai-matchmaker

## Repository
https://github.com/mabrown040/workforceap-beta

## Base Branch
main

## Goal
Build AI-powered matchmaking system that matches job postings to qualified candidates based on skills, program enrollment, and assessment scores.

---

## Background

Employers post jobs. Students complete training and assessments. Currently no automated way to connect the right candidates to the right jobs.

**The Matchmaker** bridges this gap by scoring candidate-job fit and surfacing top matches to admins and employers.

---

## Requirements

### 1. Matching Algorithm

**Input Data:**
- Job: title, description, requirements, skills needed, program alignment, salary, location
- Candidate: program enrolled, courses completed, assessment scores, skills from profile, location preference

**Scoring Criteria (weighted):**
| Factor | Weight | Description |
|--------|--------|-------------|
| Program Alignment | 30% | Candidate's program matches job's target program |
| Assessment Score | 25% | Skills assessment score (if relevant to job) |
| Course Progress | 20% | % of program courses completed |
| Skills Match | 15% | Keyword overlap between job requirements and candidate skills |
| Location | 10% | Job location vs candidate preference (exact, nearby, remote) |

**Output:** Match score (0-100%) + reasoning

### 2. Admin Dashboard Integration

**Location:** `/admin/jobs/[jobId]/matches` or `/admin/matches`

**Features:**
- List top 10 matching candidates for a selected job
- Sort by match score
- Filter by minimum score threshold (e.g., 70%+)
- Show candidate preview: name, program, progress, assessment score, match %
- One-click to view full candidate profile
- "Contact Candidate" button (triggers email to candidate + admin notification)

### 3. Employer Portal Integration

**Location:** `/employer/jobs/[jobId]/matches`

**Features:**
- Employers see top 5 matching candidates for their jobs
- Anonymized view option (hide names/emails until admin approves)
- Request introduction to candidate (sends notification to admin)

### 4. Candidate View (Optional)

**Location:** `/dashboard/opportunities`

**Features:**
- Show jobs that match candidate's profile
- Match score explanation ("Good fit because you're in IT Support program")
- One-click apply

### 5. API Endpoints

```typescript
// Get matches for a job
GET /api/jobs/[jobId]/matches?minScore=70&limit=10

// Calculate match score (for debugging/testing)
POST /api/matches/calculate
Body: { jobId: string, memberId: string }

// Record match action (contact, hire, etc.)
POST /api/matches/[matchId]/action
Body: { action: 'contacted' | 'interviewed' | 'hired' | 'declined' }
```

### 6. Database Schema

```sql
-- Match results (cached)
create table job_candidate_matches (
  id uuid primary key,
  job_id uuid references jobs(id),
  member_id uuid references members(id),
  score int check (score >= 0 and score <= 100),
  factors jsonb, -- breakdown of scoring factors
  status text default 'pending', -- pending, contacted, interviewed, hired, declined
  created_at timestamp,
  updated_at timestamp
);

-- Index for fast lookups
create index idx_matches_job on job_candidate_matches(job_id, score desc);
create index idx_matches_member on job_candidate_matches(member_id);
```

### 7. Scoring Implementation

**Option A: Simple Algorithm (Start Here)**
- TypeScript function in `/lib/matching/score.ts`
- Rule-based scoring (no ML)
- Fast, predictable, easy to adjust weights

**Option B: AI-Enhanced (Future)**
- Use LLM to parse job descriptions and extract key requirements
- Compare to candidate profiles semantically
- More accurate but slower and more expensive

**Start with Option A.** Simple weighted scoring is sufficient for MVP.

---

## Success Criteria

- [ ] Match algorithm returns scores 0-100 with factor breakdown
- [ ] Admin can view top 10 matches for any job
- [ ] Employer can view top 5 matches for their jobs
- [ ] Matches sorted by score, filterable by threshold
- [ ] "Contact Candidate" action works (sends email)
- [ ] Match results cached in database (don't recalculate every page load)
- [ ] Algorithm runs on: new job posted, candidate assessment completed, candidate program progress updated

---

## Technical Notes

**Files to Create/Modify:**
- `lib/matching/score.ts` — Core scoring algorithm
- `lib/matching/types.ts` — TypeScript types
- `app/admin/jobs/[jobId]/matches/page.tsx` — Admin match view
- `app/employer/jobs/[jobId]/matches/page.tsx` — Employer match view
- `app/api/jobs/[jobId]/matches/route.ts` — API endpoint
- `app/api/matches/calculate/route.ts` — Calculate endpoint
- Database migration for `job_candidate_matches` table

**Integration Points:**
- Trigger match calculation when: job created, assessment submitted, course completed
- Use existing email system (Resend) for notifications
- Use existing auth/roles for access control

---

## Test Plan

1. **Create test job** — IT Support Specialist, requires Digital Literacy cert
2. **Seed test candidates:**
   - Candidate A: Digital Literacy, 90% assessment, 80% course complete
   - Candidate B: IT Support, 85% assessment, 100% course complete
   - Candidate C: AI Developer, 95% assessment, 50% course complete
3. **Run match algorithm** — Expect Candidate B highest, Candidate A second, Candidate C lower
4. **Verify admin view** — Shows sorted matches with scores
5. **Test contact action** — Email sends correctly

---

**Note:** Coordinate with employer portal agent (`bc-f75f7f81-db88-4872-b356-9b6b71294b20`) — they'll handle job posting UI, this agent handles matching logic.

---

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

- **1.0** – Assessment score >= 70%
- **0.5** – Assessment score 50–69%
- **0.2** – Assessment score < 50%
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
- **Minimum threshold**: Candidates with score > 0 are included; top 10 returned by default

## Implementation

- `lib/ai/matchWeights.ts` – Weights config and scoring helpers
- `lib/ai/matchStudents.ts` – Main matching logic using weighted algorithm

## Tuning

Adjust weights in `lib/ai/matchWeights.ts` to emphasize program fit, certifications, or readiness. Weights must sum to 1.0.
