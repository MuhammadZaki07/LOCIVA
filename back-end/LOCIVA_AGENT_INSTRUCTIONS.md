# LOCIVA Agent Instructions

## First, understand the project
1. Read `LOCIVA_IMPLEMENTATION_PLAN.md` first.
2. Run `git status --short` and inspect recent commits before editing.
3. Inspect the existing code paths and conventions before deciding what to change.
4. Confirm the current API contract, database schema, auth mechanism, and component state flow from source code.
5. If the repository contains a more specific project instruction file, read and follow it.

## Implementation rules
- Work only on the five issues in `LOCIVA_FIX_PLAN.md`.
- Follow the stages in the plan in order. Do not start all changes at once.
- Fix the underlying cause; do not hide errors by changing toast text.
- Reuse existing services, API clients, auth providers, components, and patterns where suitable.
- Avoid duplicating existing business logic or creating a second analysis engine.
- Keep changes narrow and explain why each changed file is necessary.
- Preserve existing API response conventions unless a verified bug requires a compatible correction.
- Preserve authorization and ownership enforcement.
- Do not silently treat missing data or failed requests as valid empty results.
- Do not introduce mock data into production flows.
- Do not make unrelated formatting or refactoring changes.
- Do not add dependencies before checking whether the functionality already exists.
- If a requirement conflicts with the actual architecture, explain the conflict and propose the smallest safe adjustment instead of guessing.

## Work checkpoints
After each stage:
1. Summarize the verified root cause or implementation decision.
2. List the files changed.
3. Run focused tests for that stage.
4. Report actual command results, including failures and commands not run.
5. Update the project plan only for work actually completed.
6. Continue to the next stage only after the current stage is stable.

## Completion report
At the end, report:
- Root cause of each issue.
- What changed and why.
- Files changed.
- Tests/checks run and exact outcomes.
- Remaining limitations, unresolved risks, and anything not verified.
- Plan-file updates.

Never claim success based only on code inspection. Never claim tests passed unless the commands were run successfully.
