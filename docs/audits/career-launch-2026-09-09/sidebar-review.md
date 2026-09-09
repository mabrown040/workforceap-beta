# Member navigation and workspace proportions

The member rail and course outline now leave the learner's actual work as the main surface. The public homepage is unchanged.

## Corrected

| Finding | Change and evidence |
| --- | --- |
| A 260px rail beside a course outline taking roughly 42% of the workbench made navigation dominate the page. | Desktop rail is 232px, the outline is capped at 304px, and the work area is 790px at a 1440px viewport. Smaller laptops use a 208px rail. |
| Two rows of header links enlarged the chrome. | The member brand and public-site link share one row; header height is 68px. The resume reminder sits in member content so the rail starts immediately under the header and fits the viewport. |
| Home and My Program appeared current together; account shortcuts duplicated Home. | The most specific matching route or alias receives the sole current-page state. Repeated destination shortcuts are omitted from the rendered rail. |
| Every secondary destination was displayed at once. | Four daily destinations stay visible. Tools & careers, Training & progress, and Account & support disclose on demand; a section opens for its active route. All distinct destinations remain available. |
| Small navigation text was competing with a large dark surface. | Member navigation uses 16px labels and at least 44px targets; metadata uses the existing 13px token. |
| The closed mobile drawer remained available to keyboard and screen-reader navigation. | It is inert and hidden from accessibility navigation when closed; the opened drawer is a modal dialog. It has an explicit Close menu button, Escape handling, focus restoration, and background-content isolation. |
| Collapsed member footer controls could be clipped into the narrow rail. | The member footer returns when expanded. Existing staff footer behavior is preserved. |

## Browser verification

The authenticated local app used a disposable PostgreSQL database and a local GoTrue fixture through the normal Supabase SSR session path. Records were synthetic. No production writes or real messages were sent.

375, 768, 900, 1024, and 1440px viewports were checked: no document overflow and exactly one current member destination. At 375px the drawer opened its secondary section, isolated background content, closed on Escape, and returned focus to the menu trigger. Dark mode loaded without application exceptions. See [recorded dimensions](sidebar-browser-checks.json).

- [Desktop](sidebar-1440.png)
- [Laptop](sidebar-1024.png)
- [Tablet](sidebar-768.png)
- [Mobile](sidebar-375.png)
- [Dark mode](sidebar-dark.png)

13 focused component regressions cover route/alias specificity, locale prefixes, all destination access, automatic group opening, collapse persistence, mobile inert/dialog behavior, and preservation of staff navigation/footer controls. Focused ESLint and diff checks passed. Full application validation is recorded in the overall delivery report.

## Next small improvements

- Check the translated longer navigation labels in the remaining supported locales.
- Use the same course-context pattern for resume evidence and counselor-request follow-up.
- Audit real returning-learner sessions for the next most common destination before changing the four daily links.

These are follow-up candidates, not claims of completed work.
