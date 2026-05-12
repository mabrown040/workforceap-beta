# Counselor Weekly Runbook

Quick reference for counselors using the **at-risk roster**, **post-placement surveys**, and **funder CSV exports**.

**Who this is for:** You manage ~40 members and have about **2 hours/week** for admin. Everything below is designed to fit that window.

---

## Your 2-Hour Week (print this)

| Time | Task | Where |
|------|------|-------|
| **30 min Monday** | Triage at-risk list: Critical → High → Medium | Counselor → At-Risk |
| **45 min Mon–Wed** | Call or message flagged members | Phone / portal messages |
| **15 min Thursday** | Check pending surveys; send reminders | Admin → Placement Surveys |
| **15 min Friday** | Update statuses (Ack / Resolve), spot-check silent members | Counselor → At-Risk |
| **15 min monthly** | Export funder CSV for grants | Admin → Metrics |

> **Rule of thumb:** If you only do one thing, do the Monday at-risk triage.

---

## Monday Triage: At-Risk Dashboard

**Go to:** Counselor Portal → **At-Risk**

### Step-by-step (5 minutes)

1. Turn on **"Only unacknowledged (open alerts)"**
2. Sort **Severity ↑**
3. Start at the top. Work down until you run out of time.

### What the colors mean

| Color | Score | What it means | When to act |
|-------|-------|---------------|-------------|
| 🔴 **Critical** | 70+ | Multiple risk signals stacked up | Call or message **today or tomorrow** |
| 🟠 **High** | 50–69 | Strong signs of disengagement | Contact **this week** |
| 🔵 **Medium** | 30–49 | Starting to slip | Light nudge; watch if it climbs |
| 🟢 **Low** | Under 30 | Slightly off track | Normal check-in is fine |

### What the buttons do

| Button | When to click it |
|--------|-----------------|
| **Ack** (Acknowledge) | After you **reach out** — call, text, or portal message. This tells the system "I’m on it." |
| **Resolve** | Only when the problem is **actually fixed** — they’re back in training, placed in a job, or formally exited. |
| **Message** | Opens a portal message thread with that member. |
| **View** | Opens their full profile so you can see training progress and history. |

> **Don’t bulk-Ack without contact.** The roster only works if statuses are honest.

### Sort modes

- **Severity ↑** — Use this on Mondays. Worst first.
- **Oldest activity first** — Use this mid-week. Catches people who have gone completely quiet.

### Call script (keep it under 3 minutes)

1. **Open:** *“Hi [name], it’s [you] from WorkforceAP. I’m checking in to see how training and the job search are going.”*
2. **Barrier:** *“What’s the biggest thing in the way right now — schedule, tech, childcare, motivation, something else?”*
3. **One next step:** Agree on **one** concrete thing they’ll do this week (log in, finish one module, apply to one job).
4. **Close:** *“I’ll mark you as contacted. Text or message me if anything changes.”*

After the call: click **Ack** if you’re still working together; **Resolve** only if they’re fully back on track or placed.

---

## Placement Surveys: Follow-Up Workflow

**Go to:** Admin → **Placement Surveys**

### What this is

When a member gets placed in a job, the system sends them a short survey **about 30 days later** asking how the job is going. This gives you:
- Real job-retention data
- Satisfaction scores for funders
- Optional testimonials for marketing

### The follow-up clock

| Days since sent | What to do |
|-----------------|------------|
| **0–7 days** | Wait. People are busy settling into a new job. |
| **7–14 days** | Send one polite reminder: *“Your quick feedback helps us improve the program — link is in your email.”* |
| **14+ days** | Call or text (if you have consent). Offer to complete it over the phone or resend the link. |

### What the numbers mean

- **Pending** — Survey sent, not filled out yet. This is your follow-up list.
- **Completed** — Done. Check the satisfaction and training-relevance scores.
- **Testimonials** — Members who said yes to sharing a quote. Great for grant reports.

---

## Funder CSV Export

**Go to:** Admin → **Metrics** → **Export funder CSV**

### When to pull it

- **Monthly** for routine grant reporting
- **Any time** a funder asks for a snapshot
- **Before grant deadlines** (re-pull so the date matches your submission)

### What each column means

| Column | What it counts |
|--------|---------------|
| **Program** | The training program name |
| **Total Enrolled** | Members currently in that program |
| **Active (last 30d)** | Members who logged in or had activity in the last 30 days |
| **Completed** | Members who finished all required training |
| **Placed** | Members with a recorded job placement |
| **At-Risk** | Members with open or acknowledged alerts scoring 50+ (High or Critical) |
| **Completion %** | Completed ÷ Total Enrolled |
| **Placement %** | Placed ÷ Total Enrolled |

> The CSV includes a header note with methodology. Copy that note into emails to funders so they know how the numbers were calculated.

---

## Troubleshooting

| Problem | What to check |
|---------|--------------|
| **Too many Critical rows after a holiday** | Normal. Prioritize calls. Don’t bulk-Ack without contact. |
| **Member says they never got the survey email** | Check their email on file. If it’s wrong, update it and ask an admin to resend. |
| **CSV numbers look wrong** | Remember: At-Risk in the CSV is **High+ only** (50+). The counselor dashboard shows Medium and Low too. |
| **Someone is flagged but they just got a job** | If they’re placed, the nightly job should clear them automatically. If not, click **Resolve** and note the placement. |

---

*Last updated: aligned with `lib/member/atRiskScoring.ts`, funder CSV in `lib/admin/funderProgramMetrics.ts`, and placement survey cron in `app/api/cron/placement-survey/route.ts`.*
