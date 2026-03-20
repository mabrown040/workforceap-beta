# WorkforceAP gstack

AI-powered development skills for the WorkforceAP platform.

## Quick Start

1. Clone this repo
2. Install [Claude Code](https://claude.ai/code) or use OpenClaw
3. Start coding with role-specific skills

## Skills

| Skill | Use When | File |
|-------|----------|------|
| **CEO Product Review** | Evaluating features, prioritizing work | `.openclaw/skills/ceo-product-review.md` |
| **Engineer** | Building features, writing code | `.openclaw/skills/engineer-feature-builder.md` |
| **Security Reviewer** | Reviewing PRs, finding vulnerabilities | `.openclaw/skills/security-reviewer.md` |
| **UX Reviewer** | Eliminating slop, improving copy | `.openclaw/skills/ux-reviewer.md` |

## Workflow Example

```bash
# 1. CEO evaluates a feature idea
"@ceo-product-review Should we build a student job alert system?"

# 2. Engineer builds it
"@engineer-feature-builder Build the job alert subscription feature"

# 3. Security reviews
"@security-reviewer Review the job alert PR"

# 4. UX polishes
"@ux-reviewer Review the job alert page copy"
```

## Project Context

WorkforceAP is a workforce development platform with 4 portals:
- **Student** (/dashboard) — Training, assessments, job matching
- **Employer** (/employer) — Post jobs, find candidates
- **Partner** (/partner) — Refer students, track progress
- **Admin** (/admin) — Manage everything

Revenue: Employer job postings, partner referrals, future SaaS.

## Installation

### Claude Code
```bash
# Copy skills to your Claude Code directory
cp -r .openclaw/skills ~/.claude/skills/workforceap
```

### OpenClaw
Skills auto-detected from `.openclaw/skills/` directory.

---

MIT License — Adapted from gstack by Garry Tan
