## 2024-05-17 - Asynchronous Button Loading State Accessibility
**Learning:** Found multiple buttons across the application, especially inside `components/portal/tools/`, that indicate a loading/saving state (e.g. changing from "Download PDF" to "Saving..."). Some buttons lacked `aria-busy` and the text updates were not enclosed in a live region, meaning screen readers would not announce the state transition. We also found some `material-symbols-outlined` spans within these buttons were missing `aria-hidden="true"`, causing screen readers to incorrectly read the ligature text.
**Action:** Always wrap dynamically changing button text like "Saving..." or "Copied!" in an `<span aria-live="polite">` tag. Apply `aria-busy={loading}` to the wrapping `<button>` to correctly communicate the loading state to screen readers. Add `aria-hidden="true"` to decorative `material-symbols-outlined` spans.

## 2024-05-18 - Asynchronous Button Dynamic Icons and States
**Learning:** Found an admin cleanup button ("Run Cleanup Now") that merely changed its text to "Running…" during execution. It lacked necessary ARIA attributes to announce this change to screen readers, and the static icon inside did not convey a loading state visually, causing a disconnected experience.
**Action:** Always wrap dynamically changing button text in an `<span aria-live="polite">` tag. Add `aria-busy={isLoading}` to the parent `<button>`. If the button includes an icon (e.g. `material-symbols-outlined`), dynamically change the icon to `progress_activity` and apply a spin animation (`animation: isLoading ? 'spin 1s linear infinite' : 'none'`) while the async action executes. Ensure the icon span has `aria-hidden="true"`.

## 2026-05-22 - Added aria-label to icon-only action buttons
**Learning:** The administrative tools in this app often utilize compact data tables relying on icon-only action buttons (e.g., using Lucide icons) to preserve space. While `title` tooltips are provided for mouse users, these buttons frequently lack explicit `aria-label`s, negatively impacting screen reader accessibility.
**Action:** When auditing or expanding admin table components, actively check for icon-only action buttons and ensure they are paired with a descriptive `aria-label`.

## 2026-05-26 - Accessible async button states using aria-live
**Learning:** Found multiple instances where asynchronous form submission and generation buttons (e.g., "Generate Resume" and "Write My Elevator Pitch") altered their visible text dynamically during loading ("Generating..."), but without `aria-live` or `aria-busy` attributes, the status changes weren't announced to screen readers properly. While testing locally with `pnpm build` or `pnpm test`, I observed tests lacking environment support (like `tsx`), but it confirmed the UI changes are syntax-safe.
**Action:** When a button triggers an async process, wrap the dynamic text label inside a `<span aria-live="polite">` and append `aria-busy={loading}` to the `<button>` element. This ensures the change to "Loading..." or "Generating..." is consistently announced.

## 2024-05-28 - Custom Modal Accessibility
**Learning:** Custom destructive confirmation dialogs that lack a properly linked `aria-controls` from their trigger, and lack `autoFocus` on their confirmation input, cause screen reader and keyboard users significant friction as focus isn't naturally routed into the modal's primary interaction point.
**Action:** Always verify `aria-haspopup`, `aria-expanded`, and `aria-controls` on the trigger button. Apply `autoFocus` on the primary text input for custom modals so the user's keyboard cursor is immediately placed inside the interactive context.

## 2024-05-18 - [Accessibility on Dynamic State Buttons]
**Learning:** Found a recurring UX/accessibility issue where `aria-live="polite"` was missing from dynamically updating texts within AI tool clipboards (e.g., toggling from "Copy to clipboard" to "Copied!" with icon change). Without `aria-live`, screen readers remain silent upon the copy action, depriving users of critical success feedback. This pattern exists due to manual copy-pasting of initial component mockups.
**Action:** When implementing any micro-interactions where state is updated temporarily (like clipboards, loaders), ensure the updated text region is wrapped in an `aria-live="polite"` region and the parent button relies on semantic `<span aria-hidden="true">` for the visual icon rather than a blocking `aria-label`.

## 2024-05-29 - Accessible Filter Chips State
**Learning:** Filter chip buttons (e.g., in Application Tracker) that use CSS classes like `active` to visually denote selection do not inherently communicate their state to screen reader users, leading to an inaccessible filtering experience.
**Action:** When implementing or fixing toggle buttons or filter chips that remain on the screen, add the `aria-pressed={isActive}` attribute to ensure screen readers announce whether the filter is currently active or pressed.

## 2026-06-19 - Expandable Action Button Accessibility
**Learning:** Found an 'Update Status' button inside a mobile view of JobApplicationKanban that triggered a conditional drop-down panel. It lacked `aria-expanded` and `aria-controls` attributes, preventing screen readers from understanding the button's relationship to the revealed panel.
**Action:** When a button reveals an adjacent panel or form, even if conditionally rendered, ensure the button receives `aria-expanded={isOpen}` and an `aria-controls` ID that matches the revealed panel.

## 2024-06-20 - Redundant aria-label on aria-live copy buttons
**Learning:** Found instances where custom copy buttons had a visually hidden `aria-label` attribute alongside an inner `aria-live` region containing dynamic state text (e.g., changing from "📋 Copy" to "✓ Copied!"). The outer `aria-label` can overshadow the inner live region, preventing screen readers from announcing the dynamic status update.
**Action:** When implementing custom copy buttons that utilize an inner `<span aria-live="polite">` element to announce a "Copied!" state, remove any static or conditionally rendered `aria-label` from the parent `<button>` element.

## 2024-06-25 - Expandable Action Button Accessibility in Admin Panel
**Learning:** Found an "Override" action button in `AdminMemberSkillCheckpointPanel` that triggered a drop-down panel but lacked `aria-haspopup`, `aria-expanded` and `aria-controls`. Screen readers were not informed of the popup relationship. Also noted the need to use `aria-haspopup="menu"` for menus instead of `"true"`.
**Action:** Always add `aria-haspopup="menu"`, `aria-expanded={isOpen}`, and an `aria-controls` referencing the dropdown panel ID for buttons that toggle contextual menus or overrides.

## 2024-11-20 - Persistent aria-live Regions for Dynamic Updates
**Learning:** In buttons like DownloadMyDataButton where text swaps conditionally (e.g. between "Preparing download..." and "Download My Data"), dynamically mounting/unmounting an `<span aria-live="polite">` can cause screen readers to miss the state change announcement.
**Action:** Ensure elements with `aria-live` are continuously present in the DOM from the initial mount, with only their inner text conditionally updating, to guarantee screen readers capture dynamic status changes reliably.
