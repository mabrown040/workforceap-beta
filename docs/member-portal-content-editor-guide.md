# Member Portal Content Editor Guide

This guide helps non-developers add and update content for the WorkforceAP Member Portal.

---

## Overview

The portal has two main content areas:

1. **Member Resources** (`/resources`) — Job-seeker guides, templates, and checklists
2. **Career Brief** (`/dashboard/career-brief`) — Weekly guidance and opportunity updates

---

## Adding a Member Resource

### 1. Create the content file

Create a new Markdown file in `content/member-resources/`:

- **Filename:** Use lowercase with hyphens, e.g. `my-new-guide.md`
- **Format:** Standard Markdown (headers, lists, links, etc.)

Example:

```markdown
# My New Guide Title

Short intro paragraph.

## Section 1

Content here...

## Section 2

More content...
```

### 2. Register in the index

Edit `content/member-resources/index.json` and add a new entry:

```json
{
  "id": "my-new-guide",
  "title": "My New Guide Title",
  "summary": "One sentence description for the card.",
  "category": "Resume",
  "stage": "New to workforce",
  "tags": ["tag1", "tag2"],
  "url": "/resources/my-new-guide",
  "type": "document",
  "file": "my-new-guide.md"
}
```

### Required fields

| Field | Allowed values |
|-------|----------------|
| **category** | `Resume`, `Interviewing`, `Career Planning`, `AI Skills`, `Job Search` |
| **stage** | `New to workforce`, `Mid-career pivot`, `Recent graduate` |
| **type** | `document`, `video`, `link` |
| **file** | Must match your `.md` filename (only for `document` type) |

### 3. Commit and deploy

- Commit both the new `.md` file and the updated `index.json`
- Push to your branch; after merge, the resource will appear on `/resources`

---

## Adding a Career Brief

The Career Brief page shows a personalized **For You** section (location, program interest, recommended actions, job search link) above the list of weekly briefs. Brief content is static Markdown; personalization is driven by member profile and activity.

### 1. Create the brief file

Create a new file in `content/career-brief/`:

- **Filename:** `YYYY-MM-DD-weekly-brief.md` (use the issue date)
- **Format:** Markdown with headers, lists, and links

Example:

```markdown
# Weekly Career Brief — March 21, 2026

Intro paragraph...

## This Week's Focus

### 1. Topic
Content...

### 2. Another Topic
More content...

---
*Questions? Contact info@workforceap.org*
```

### 2. Register in the loader

Edit `lib/content/careerBriefs.ts` and add to the `BRIEFS` array:

```typescript
{ id: '2026-03-21', title: 'Weekly Career Brief — March 21, 2026', date: '2026-03-21', slug: '2026-03-21-weekly-brief' },
```

- **id:** Unique ID (often the date)
- **slug:** Filename without `.md`

### 3. Commit and deploy

- Commit the new `.md` file and the updated `careerBriefs.ts`
- The brief will appear on `/dashboard/career-brief`

---

## Content Schema Checklist

Before submitting, verify:

- [ ] **Member resources:** `id` is unique, `category` and `stage` use allowed values, `file` matches the `.md` filename
- [ ] **Career briefs:** `slug` matches the filename (without `.md`), `date` is correct
- [ ] **Links:** Internal links use `/resources/...` or `/dashboard/career-brief/...`; external links use `https://`
- [ ] **No broken links:** All linked pages exist

---

## File Locations Summary

| Content type | Files | Index/Config |
|--------------|-------|--------------|
| Member resources | `content/member-resources/*.md` | `content/member-resources/index.json` |
| Career briefs | `content/career-brief/*.md` | `lib/content/careerBriefs.ts` |

---

## Troubleshooting

**Resource doesn't appear:** Check that the entry in `index.json` has the correct `id` and `file`, and that the `.md` file exists.

**Brief doesn't appear:** Check that the `slug` in `careerBriefs.ts` matches the filename (without `.md`).

**Build fails:** Run `npm run build` locally. Common issues: typos in JSON, missing commas, invalid category/stage values.
