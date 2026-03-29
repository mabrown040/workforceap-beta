# Jules Playbook

## Use Cases

- API-driven task orchestration
- repeatable multi-step workflows
- event-driven execution after the repo contract is already stable

## Best Fit

Use Jules when:

- the workflow is deterministic
- inputs and outputs are clear
- the task can be repeated across branches, previews, or releases

## Avoid

- ambiguous product work
- early-stage debugging where human iteration is still faster
- tasks that do not yet have a stable repo command path

## Rules

- keep Jules downstream of local verification, not upstream of it
- use repo scripts like `npm run typecheck`, `npm run qa:preview`, and `npm run ship:check` as the contract Jules calls
- avoid letting Jules become a hidden source of one-off build logic
- log in with `jules login` before expecting remote sessions to work
- prefer repo commands over ad hoc shell prompts so Jules executions stay reproducible
