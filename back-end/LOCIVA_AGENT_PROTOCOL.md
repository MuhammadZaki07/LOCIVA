# LOCIVA Agent Protocol

## Mandatory execution protocol

### Before editing
- [ ] Read `LOCIVA_IMPLEMENTATION_PLAN.md`.
- [ ] Run `git status --short`.
- [ ] Inspect recent commits.
- [ ] Locate relevant frontend/backend files and existing tests.
- [ ] Record a concise root-cause hypothesis for each issue, backed by code evidence.
- [ ] Do not edit until the relevant request/data/auth flow is understood.

### For every stage
- [ ] Make the smallest change that fixes the verified problem.
- [ ] Add/update regression coverage where practical.
- [ ] Run focused tests.
- [ ] Inspect the diff.
- [ ] Update `LOCIVA_IMPLEMENTATION_PLAN.md` accurately.
- [ ] Report results before proceeding.

### Security protocol
- Frontend feature hiding is UX only; backend authorization remains mandatory.
- Do not trust a business ID, candidate ID, user ID, or ownership claim supplied by the client.
- Do not expose protected candidate/report/analysis data in unauthenticated API responses.
- Do not weaken middleware, policies, validation, or ownership checks.
- Clear or invalidate protected client-side data when identity changes or the user logs out.

### Data and API protocol
- Server-side filtering must be implemented in the actual API/database query.
- Do not fetch every candidate and filter only in React.
- Preserve the existing API envelope and pagination format where possible.
- Distinguish empty results from request failures and authorization errors.
- Do not silently swallow API errors or substitute fake data.

### Map protocol
- Candidate location selection is a temporary mode.
- On successful coordinate selection, save the coordinates and return to normal map interaction.
- Cancel, navigation, unmount, and errors must not leave the map in picking mode.
- Coordinate changes do not automatically rerun analysis.

### Tour protocol
- Joyride selectors must point to real, stable UI targets.
- Steps that depend on user actions must wait for the intended state transition.
- The tour must not trap users or route unauthenticated users into protected flows.
- Provide skip/close and replay behavior.
- Handle missing targets and responsive layouts.

### Plan-file protocol
Update `LOCIVA_IMPLEMENTATION_PLAN.md`:
- `- [x] ✅` only when implementation and relevant verification are complete.
- `🟡 PARTIAL` when only partly implemented or not fully verified.
- Keep unfinished items unchecked.
- Record changed files, test commands/results, and remaining risks.
- Do not overwrite unrelated existing plan content. Make focused edits.

### Stop conditions
Stop and ask for clarification instead of guessing if:
- The actual data model conflicts with the assumed business/candidate relationship.
- A proposed fix would require changing scoring logic or a public API contract.
- Required authentication/ownership semantics are ambiguous.
- A migration or dependency is proposed but its necessity is not established.
- Existing project instructions conflict with this task.

### Final report format
1. **Root causes found**
2. **Changes made by stage**
3. **Files changed**
4. **Tests/checks executed and results**
5. **Plan-file updates**
6. **Remaining issues and risks**
