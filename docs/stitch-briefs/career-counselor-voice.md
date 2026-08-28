# Stitch Brief: Career Counselor Voice Tool

## What We're Building
A voice-powered career counseling experience inside the WorkforceAP member portal. Members tap a button, speak to an AI counselor, and leave with a clear next step — in under 5 minutes.

---

## The Emotional Truth (Build From This)

This is not a chatbot. This is the first time some of these members have talked to anyone who sounds like they know what they're doing about their career.

Many of our members are:
- Unemployed for 6+ months, starting to lose hope
- Coming back to the workforce after a gap (disability, caregiving, incarceration)
- Mid-career and scared their skills don't translate anywhere
- Trying to provide for a family and running out of time

When they open this page, the question in their head is: *"Is anyone actually going to help me?"*

The UI needs to feel like walking into a room where someone is expecting you and ready to listen — not like opening another app feature.

---

## The Experience

### Entry State
Member arrives from their dashboard. They should feel:
- **Safe** — this is private, just them and the counselor
- **Capable** — they can do this, it's easy to start
- **Hopeful** — something is about to happen that could actually move their life forward

Visual cue: Warm, human. Not cold tech. Think: a well-lit office, not a chatbot bubble.

### Active Session
They're talking to someone who is listening. Visual:
- Clear voice activity indicator — they can tell when the AI is listening vs. speaking
- Session feels alive, not frozen
- Simple end/pause controls — they're in control

### After the Session
They get 1-3 concrete next steps based on what they said. Not generic advice. Not a wall of text. Three things they can do today.

And — critically — a path to act on those steps immediately (links to the right tools in their dashboard).

---

## Page Structure

### `/dashboard/counselor`

```
[Header]
AI Career Counselor
Your session is private. Speak naturally — I'm here to help.

[Main Card - Pre-session]
  Warm illustration or ambient visual (not a robot)
  
  "Hi [first name]. Ready when you are."
  
  [Start Session button] — prominent, warm color, not clinical blue
  
  What to expect:
  - 3-5 minute conversation
  - Ask me anything about your job search
  - You'll get a personalized action plan after

[Active Session]
  Animated voice waveform (shows listening/speaking state)
  Transcript of conversation (optional, subtle)
  [End Session] button

[Post-Session - Feedback Card]
  "Here's your action plan:"
  
  [ ] Step 1 (linked to tool or resource)
  [ ] Step 2
  [ ] Step 3
  
  "Save to my dashboard" button
  "Start a new session" link
```

---

## Design Direction

- **Color temperature:** Warm — amber/gold accents over the dark portal theme, not cold blue
- **Typography:** Human and readable — slightly larger than the rest of the portal
- **Animation:** Breathing/pulse on the active state — alive, not mechanical
- **Avatar/illustration:** Abstract warmth, not a robot face. Think: a glowing orb, a soft shape, something that suggests presence without pretending to be a person
- **Empty state / loading:** No spinners. Use soft text like "Getting your session ready…" 

---

## Technical Context

- ElevenLabs agent: `Lilley - WorkforceAP Student Career Coach` (`agent_1101kqfjfm8retm8j6md467wzxdb`)
- Uses `@elevenlabs/client` SDK → `Conversation.startSession({ signedUrl, dynamicVariables })`
- API route: POST `/api/counselor/session` → returns `{ signedUrl, dynamicVariables }`
- Post-session feedback: POST `/api/counselor/feedback` → returns `{ steps: string[] }`
- Auth: requires logged-in member (use `getUser()` from `@/lib/auth/server`)
- Follow same pattern as `/dashboard/interview-coach` (working reference implementation)

### CSP Requirements (already in next.config.ts):
- `microphone=(self)` in Permissions-Policy
- `wss://api.elevenlabs.io`, `https://api.elevenlabs.io`, `wss://*.livekit.cloud` in connect-src

---

## What Success Looks Like

A member who was about to give up on their job search opens this tool and 5 minutes later they have a list of three specific things to do, and they feel like someone listened and actually understood their situation.

That's the bar. Not "voice AI works." That someone's week got better because they used this.

---

## Files to Create

1. `app/(portal)/dashboard/counselor/page.tsx` — server page (auth check, pass user name to component)
2. `components/portal/tools/CareerCounselor.tsx` — client component (voice session UI)
3. `app/api/counselor/session/route.ts` — returns signed URL for ElevenLabs agent
4. `app/api/counselor/feedback/route.ts` — generates 3-step action plan from voice transcript

Reference implementation: `components/portal/tools/InterviewCoach.tsx`
