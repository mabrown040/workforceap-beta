# Cursor Sprint: GA4 + Conversion Tracking Setup

**Date:** 2026-03-21
**Priority:** High — required before Google Ad Grants go live
**Sprint type:** Analytics wiring

---

## Objective
Install Google Analytics 4 (GA4) tracking in the Next.js 15 app with proper conversion event firing so we can measure performance once Google Ad Grants campaigns launch.

## Output format
Code changes in the Next.js app

## Definition of done
- [ ] GA4 pageview tracking fires on every route change
- [ ] Conversion event fires on application form submit
- [ ] Conversion event fires on contact form submit
- [ ] Conversion event fires on partner inquiry form submit
- [ ] No tracking fires in development/localhost (NODE_ENV guard)
- [ ] GA4 measurement ID loaded from environment variable (not hardcoded)
- [ ] No console errors in production build

## Implementation

### 1. Environment variable
Add to `.env.local` and `.env.production`:
```
NEXT_PUBLIC_GA_MEASUREMENT_ID=G-XXXXXXXXXX
```
(Measurement ID will be provided once GA4 property is created)

### 2. GA4 Script Installation
Use `@next/third-parties` (already available in Next.js 15) — preferred over manual gtag:

In `app/layout.tsx`:
```tsx
import { GoogleAnalytics } from '@next/third-parties/google'

// Inside <html> body, after </body> open or in RootLayout:
{process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID && (
  <GoogleAnalytics gaId={process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID} />
)}
```

### 3. Conversion event utility
Create `lib/analytics.ts`:
```ts
export const trackEvent = (eventName: string, params?: Record<string, unknown>) => {
  if (typeof window === 'undefined') return
  if (!process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID) return
  if (process.env.NODE_ENV === 'development') return
  
  window.gtag?.('event', eventName, params)
}
```

### 4. Conversion events to fire

**Application form submit** (`/apply` page, on successful form submission):
```ts
trackEvent('generate_lead', {
  event_category: 'application',
  event_label: 'apply_form_submit',
})
```

**Contact form submit** (contact page/modal, on success):
```ts
trackEvent('generate_lead', {
  event_category: 'contact',
  event_label: 'contact_form_submit',
})
```

**Partner inquiry submit** (`/partners` page, on success):
```ts
trackEvent('generate_lead', {
  event_category: 'partner',
  event_label: 'partner_inquiry_submit',
})
```

**Employer job post submit** (employer portal, on job submit):
```ts
trackEvent('generate_lead', {
  event_category: 'employer',
  event_label: 'employer_job_submit',
})
```

### 5. TypeScript declaration
Add `gtag` type to `global.d.ts` or inline:
```ts
declare global {
  interface Window {
    gtag?: (...args: unknown[]) => void
  }
}
```

## Constraints / do not
- Do NOT hardcode the measurement ID
- Do NOT fire events in development
- Do NOT block form submission if gtag fails (wrap in try/catch or optional chaining)
- Do NOT use the old `react-ga` package — use Next.js built-in or @next/third-parties

## Evidence required
- Screenshot or console log showing gtag loaded in production build
- Confirm `.env.example` updated with `NEXT_PUBLIC_GA_MEASUREMENT_ID=` placeholder

## If blocked
- If `@next/third-parties` is not installed: `npm install @next/third-parties`
- If the measurement ID isn't available yet, use a placeholder `G-PLACEHOLDER` and add a TODO comment

---

## Google Ads Conversion Import (post-GA4 setup)
Once GA4 is live, import these events into Google Ads as conversions:
- `generate_lead` (category: application) → primary conversion, value = $50
- `generate_lead` (category: partner) → primary conversion, value = $200
- `generate_lead` (category: contact) → secondary conversion

This enables Smart Bidding to optimize toward actual applications in the Ad Grants campaigns.
