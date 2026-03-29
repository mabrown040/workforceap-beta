# Stitch Playbook

## Use Cases

- first-pass layout generation
- marketing page composition
- rapid visual variants before hardening the final implementation

## Best Fit

Use Stitch MCP when:

- the team needs fast UI directions
- the page is design-heavy and copy-forward
- you want to compare multiple visual concepts before committing to code

## Handoff

Recommended flow:

1. Stitch drafts the visual direction
2. Codex implements the chosen version in the repo
3. Claude reviews the result
4. browser QA validates screenshots and route behavior

## Rules

- treat Stitch output as a starting point, not merge-ready code
- preserve the repo design system once a pattern is established
- always run screenshot or route verification after the Stitch-to-code handoff
