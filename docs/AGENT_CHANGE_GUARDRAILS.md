# WorkforceAP Agent Change Guardrails

Use this workflow for agent-driven changes.

## Before coding
1. Read `docs/PRODUCT_STAKES.md`.
2. Name the product stake, if any, that this change touches.
3. Decide if the change is:
   - Locked
   - Approval Required
   - Flexible
4. Choose a fresh branch name for the slice.

## Branch / PR rules
- One narrow change per PR.
- Fresh branch, fresh PR.
- No omnibus “while I was here” work.
- If a change touches a Locked area, stop unless Mike explicitly approved it.

## PR summary format
Include these sections in every WorkforceAP PR:
- Summary
- Why
- Scope
- Stakes touched
- Approval needed? (yes/no)

### Example
- **Stakes touched:** Programs page stays visually open
- **Approval needed?** no, this preserves the stake

## Good agent behavior
- preserve existing locked decisions
- prefer concrete/member-safe copy
- make the product more guided, not more confusing
- use narrow PRs with obvious intent

## Bad agent behavior
- reopening settled homepage debates without approval
- reintroducing dropdown-heavy browsing for members
- adding self-serve program switching publicly
- drifting into hypey copy
- changing multiple product decisions in one PR
