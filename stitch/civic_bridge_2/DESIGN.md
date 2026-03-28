# Design System Specification: Digital Ivory Tower

## 1. Overview & Creative North Star
The "Digital Ivory Tower" is our creative North Star. It represents a shift away from the "disruptive" chaos of modern tech and toward the timeless authority of academia and civic institution. This system balances the weight of history with the clarity of the digital future.

To achieve this, we move beyond standard "flat" UI. Our layouts embrace **Intentional Asymmetry** and **Editorial Breathing Room**. We do not fill space; we curate it. By utilizing high-contrast typography scales and layered tonal depth, we create an environment that feels sophisticated, high-trust, and profoundly intentional. This is not a template; it is a digital archive for the modern citizen.

---

## 2. Colors & Surface Philosophy

### The "No-Line" Rule
Standard UI relies on borders to define space. In this design system, **1px solid borders are prohibited for sectioning.** 
Boundaries are defined exclusively through background color shifts or subtle tonal transitions. For example, a `surface-container-low` section sitting on a `surface` background creates a clear but sophisticated division without the "boxed-in" feel of a traditional grid.

### Surface Hierarchy & Nesting
Treat the UI as a series of physical layers—like stacked sheets of fine, heavy-stock paper. Use the surface-container tiers to create depth:
- **Base Layer:** `surface` (#121416 in Dark Mode)
- **Primary Content Areas:** `surface-container`
- **Interactive Elements/Cards:** `surface-container-high` or `surface-container-lowest` for "inset" effects.

### The Glass & Gradient Rule
To move beyond a generic "app" feel, use **Glassmorphism** for floating elements (Navigation bars, Modals). Use semi-transparent surface colors with a `backdrop-blur` of 12px–20px. 
**Signature Texture:** Main CTAs or Hero sections should utilize a subtle linear gradient from `primary` (#AD2C4D) to `primary-container`. This adds a "visual soul" and depth that flat hex codes cannot replicate.

---

## 3. Typography: The Inter Editorial Scale
We use **Inter** not as a system font, but as a precision instrument. The hierarchy is designed to mimic high-end journals.

| Level | Token | Size | Tracking | Weight | Intent |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Display** | `display-lg` | 3.5rem | -0.02em | 700 | Heroic, authoritative statements. |
| **Headline** | `headline-md` | 1.75rem | -0.01em | 600 | Section headers that demand attention. |
| **Title** | `title-lg` | 1.375rem | 0 | 500 | Sub-sectioning and card titles. |
| **Body** | `body-lg` | 1.0rem | +0.01em | 400 | Primary reading experience; high legibility. |
| **Label** | `label-md` | 0.75rem | +0.04em | 600 | All-caps or metadata; highly structured. |

**The Editorial Mix:** Use `display-lg` with significant leading (1.1) against `body-lg` with generous leading (1.6). This contrast creates the "Ivory Tower" aesthetic—academic yet accessible.

---

## 4. Elevation & Depth: Tonal Layering
We reject traditional drop shadows. We convey hierarchy through **Tonal Layering**.

- **The Layering Principle:** Place a `surface-container-lowest` card on a `surface-container-low` section. This creates a soft, natural "lift" through color theory alone.
- **Ambient Shadows:** If an element must float (e.g., a dropdown), use a shadow with a 24px-48px blur, 4% opacity, tinted with the `on-surface` color. It should feel like a soft glow, not a dark stain.
- **The "Ghost Border" Fallback:** If accessibility requires a border, use the `outline-variant` at **15% opacity**. Never use 100% opaque borders; they break the "Digital Ivory Tower" fluidity.
- **Glassmorphism:** Apply a 0.5px `white/10%` top-stroke to glass elements to simulate the "catch-light" on the edge of a glass pane.

---

## 5. Components

### Buttons
- **Primary:** Gradient fill (`primary` to `primary-container`). `Round-4` (0.5rem) corners. No border. Text: `label-md` in `on-primary`.
- **Secondary:** Surface-tinted. Background: `surface-container-high`. Text: `primary`.
- **Tertiary:** No background. Text: `primary`. Subtle underline on hover only.

### Cards & Lists
- **Forbidden:** Divider lines.
- **The Alternative:** Use **Vertical White Space** (Token `8` or `10`) to separate list items. For cards, use a background shift from `surface` to `surface-container`.
- **Interaction:** On hover, a card should shift from `surface-container` to `surface-container-highest` with a transition of 200ms ease-out.

### Input Fields
- **Styling:** Inset appearance using `surface-container-lowest`. 
- **Active State:** A 2px bottom-accent of `primary` (#AD2C4D). Avoid full-box glows.
- **Typography:** Placeholder text in `on-surface-variant` at 40% opacity.

### Signature Component: The "Curator" Header
A sticky top-nav using Glassmorphism (`surface` at 80% opacity + blur). It should feature a "Breadcrumb" trail in `label-sm` to emphasize the educational, hierarchical nature of the platform.

---

## 6. Do's and Don'ts

### Do
- **DO** use the spacing scale `16` (5.5rem) for section margins to create a sense of prestige.
- **DO** use "Surface Nesting" to highlight important data.
- **DO** leverage the rich dark mode (`surface` #121416) with `on-surface` (#E2E2E5) for an "OLED-first" premium feel.

### Don't
- **DON'T** use pure black (#000000) or pure white (#FFFFFF). Use our slate-tinted neutrals for a softer, more sophisticated look.
- **DON'T** use 1px borders to separate content. It feels "cheap" and "templated."
- **DON'T** use standard 45-degree shadows. Keep lighting sources centered and ambient.
- **DON'T** crowd the interface. If a screen feels full, increase the spacing tokens and remove secondary information.