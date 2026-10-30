# Final Prompt for Antigravity

You are working inside the existing LOCIVA repository. Implement the task using the project documentation below as the source of truth:

1. Read `LOCIVA_AGENT_INSTRUCTIONS.md`.
2. Read `LOCIVA_AGENT_PROTOCOL.md`.
3. Read `LOCIVA_AGENT_SKILLS.md`.
4. Follow `LOCIVA_FIX_PLAN.md` for scope, priority, and acceptance criteria.
5. Read the existing `LOCIVA_IMPLEMENTATION_PLAN.md` before making any changes.

Do not paste the contents of these files back into the chat. Use them as working instructions to reduce repeated context and token usage.

## Task
Fix these five issues in the existing project:
1. Candidate save fails with: `Gagal Menyimpan Objek usaha tidak ditemukan atau Anda tidak memiliki akses ke usaha ini.`
2. Saved Candidates must be scoped to the currently selected business, with debounced search and filtering performed by the backend API.
3. Unauthenticated users may browse the public map but must not see or use protected map features: analysis, saving analysis, candidate creation/saving, citizen reports, Saved Candidates, and “Rute Usaha Keliling” / business route planner.
4. Integrate React Joyride for an interactive, action-aware map onboarding tour.
5. After a candidate location is selected, exit location-picking mode and restore the normal cursor.

## Execution
- Start with repository reconnaissance and a root-cause audit. Do not change code before tracing the relevant flows.
- Implement one stage at a time in the order defined by `LOCIVA_FIX_PLAN.md`.
- Test each stage before continuing.
- Preserve existing LOCIVA scoring formulas, weights, thresholds, recommendation rules, data contracts, and architecture unless a verified bug requires a narrowly scoped compatible correction.
- Do not perform unrelated refactors, create duplicate engines, add unnecessary dependencies/migrations, weaken authorization, or use fabricated data.
- Verify React Joyride compatibility against the project's installed React version and current official documentation: https://react-joyride.com/
- Update `LOCIVA_IMPLEMENTATION_PLAN.md` with only verified progress and actual test results.
- Stop after the defined scope is complete and provide the final report format specified in `LOCIVA_AGENT_PROTOCOL.md`.

If a required behavior is already implemented, verify it and fix only the defect. If an assumption is contradicted by the actual code/schema, follow the repository evidence and document the difference rather than guessing.
