# The Design System: Editorial Excellence for Workforce Development

## 1. Overview & Creative North Star: "The Digital Ivory Tower"
The Creative North Star for this design system is **"The Digital Ivory Tower."** This concept bridges the gap between traditional academic prestige and the rapid, innovative pace of modern workforce training. It moves away from the "generic SaaS dashboard" look in favor of a high-end, editorial experience that feels curated, authoritative, and intentional.

To break the "template" aesthetic, we employ **Intentional Asymmetry**. Instead of rigid, centered grids, we utilize generous white space and off-center focal points to guide the eye. Overlapping elements—such as a title-lg heading partially breaking the boundary of a surface-container—create a sense of physical layering and depth. This system isn't just a container for data; it is a premium stage for professional growth.

---

## 2. Colors & Surface Philosophy
The palette is rooted in a sophisticated academic red (`#AD2C4D`) and a prestigious gold (`#FFBB00`), grounded by a nuanced scale of neutrals.

### The "No-Line" Rule
**Explicit Instruction:** Designers are prohibited from using 1px solid borders to define sections or cards. We do not use structural lines to separate content. Boundaries must be defined strictly through:
*   **Background Color Shifts:** A `surface-container-low` section sitting directly on a `surface` background.
*   **Tonal Transitions:** Using the `surface-container` tiers to create organic separation.

### Surface Hierarchy & Nesting
Treat the UI as a series of stacked, premium materials (fine paper or frosted glass). 
*   **Base:** `surface` (#fcf9f8)
*   **Sectioning:** Use `surface-container-low` for large content blocks.
*   **Interactive Cards:** Place `surface-container-lowest` (#ffffff) cards on top of `surface-container-low` backgrounds to create a "lifted" effect without heavy shadows.

### The "Glass & Gradient" Rule
To inject "soul" into the Next.js implementation, use **Glassmorphism** for floating navigation and modals. 
*   **Tokens:** Use `surface` with 80% opacity and a `backdrop-blur` of 12px.
*   **Signature Textures:** For Hero sections or primary CTAs, apply a subtle linear gradient from `primary` (#8c0f37) to `primary_container` (#ad2c4d) at a 135-degree angle. This prevents the "flat" look and adds a bespoke, high-end finish.

---

## 3. Typography: The Editorial Voice
We utilize **Inter** across all scales, but we vary tracking and leading to create a hierarchy that feels like a prestigious journal.

*   **Display (lg/md/sm):** Used for high-impact hero statements. Set with tight letter-spacing (-0.02em) to feel authoritative and modern.
*   **Headline & Title:** These are the "anchors." Use `headline-lg` for section starts, ensuring there is ample `spacing-16` above them to allow the typography to breathe.
*   **Body (lg/md):** Optimized for readability in a training context. Use `on_surface_variant` (#584144) for secondary body text to reduce visual fatigue while maintaining high contrast.
*   **Labels:** Always uppercase with +0.05em tracking when used for category tags or small metadata.

---

## 4. Elevation & Depth: Tonal Layering
Traditional shadows are often a crutch for poor layout. This system prioritizes **Tonal Layering**.

*   **The Layering Principle:** Depth is achieved by stacking the `surface-container` tiers. A `surface-container-highest` element feels "closest" to the user, while `surface-dim` is used for background elements that should recede.
*   **Ambient Shadows:** If a shadow is required (e.g., for a floating action button), it must be "Ambient."
    *   **Blur:** 24px - 40px.
    *   **Opacity:** 4% - 6% of the `on_surface` color.
*   **The "Ghost Border" Fallback:** If accessibility requirements demand a border, use a "Ghost Border." Apply `outline-variant` at 15% opacity. Never use 100% opaque borders.
*   **Glassmorphism:** Navigation bars should use a `surface_bright` tint with a 20px backdrop blur, allowing content to bleed through softly as the user scrolls, creating an integrated, premium feel.

---

## 5. Components

### Buttons
*   **Primary:** Gradient of `primary` to `primary_container`. No border. `rounded-md`.
*   **Secondary:** `secondary_container` background with `on_secondary_container` text.
*   **Tertiary:** No background. Text uses `primary`. Underline on hover only.

### Cards & Lists
*   **Constraint:** Forbid the use of divider lines. 
*   **Layout:** Separate list items using `spacing-4` (vertical white space) or by alternating background colors between `surface` and `surface-container-low`.
*   **Cards:** Use `rounded-xl` for a modern, approachable feel.

### Input Fields
*   **Styling:** Use `surface-container-high` as the background. No border. On focus, transition to a `ghost border` using the `primary` color at 40% opacity.
*   **Labels:** Use `label-md` positioned strictly above the input, never as placeholder text.

### Education-Specific Components
*   **Progress Orbs:** Instead of standard progress bars, use subtle circular strokes with `secondary` (#7b5800) to denote course completion.
*   **Resource Chips:** Small, `rounded-full` chips using `surface-container-highest` for "Member-only" or "Partner" tagging.

---

## 6. Do's and Don'ts

### Do
*   **Do** use asymmetrical margins (e.g., more padding on the left than the right in editorial layouts) to create visual interest.
*   **Do** use `surface-tint` sparingly to highlight active states in navigation.
*   **Do** utilize the `spacing-20` and `spacing-24` tokens to ensure the training solution feels "spacious" and low-stress for learners.

### Don't
*   **Don't** use pure black (#000000) for text. Always use `on_surface` (#1c1b1b) to maintain a premium, softened look.
*   **Don't** use 1px dividers to separate "Member," "Partner," and "Employer" sections. Use distinct `surface-container` background shifts.
*   **Don't** over-round corners. Stick to the `md` (0.375rem) and `lg` (0.5rem) tokens for a professional, "academic" structure; only use `full` for functional chips.