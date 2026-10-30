# LOCIVA Fix Plan

## Objective
Fix the five reported LOCIVA issues in small, verifiable stages without broad refactoring or changing the existing market-potential scoring algorithm.

## Scope and priority

### Stage 0 — Repository reconnaissance
- Read the existing `LOCIVA_IMPLEMENTATION_PLAN.md` before making changes.
- Inspect `git status` and recent commits before editing.
- Trace the relevant frontend components, API clients, Laravel routes, middleware, controllers, services, models, policies, and tests.
- Confirm the actual implementation and data model. Do not assume file names or schema.
- Record findings and a short implementation plan before changing code.

### Stage 1 — Fix candidate saving
Reported error:
`Gagal Menyimpan Objek usaha tidak ditemukan atau Anda tidak memiliki akses ke usaha ini.`

- Trace the selected business ID from the frontend through the API request and Laravel authorization/query logic.
- Determine whether the root cause is a missing/wrong ID, wrong route payload, ownership mismatch, relationship mismatch, stale client state, or another verified cause.
- Fix the root cause, not merely the toast message.
- Preserve ownership checks and authorization.
- Prevent orphaned or duplicate candidate records where relevant.
- Add or update regression tests.

### Stage 2 — Server-side Saved Candidates filtering
- Saved Candidates must show candidates belonging to the currently selected business.
- Search and filtering must happen through the backend API; do not fetch all records and filter them only in the frontend.
- Support debounced search and server-side pagination if the existing API/UI architecture supports pagination.
- Reset pagination when the business or search query changes.
- Prevent stale/racing responses from replacing newer results.
- Provide loading, empty, error, and clear-search states.
- Enforce the authenticated user's access on the backend.

### Stage 3 — Authentication-aware map features
When unauthenticated, retain public map browsing but do not expose protected feature content/actions for:
- Running analysis.
- Saving analysis results.
- Creating/saving candidates.
- Adding citizen reports.
- Viewing Saved Candidates.
- Using the “Rute Usaha Keliling” / business route planner.

Requirements:
- Use the project's existing authentication state and routing patterns.
- Show a clear login/registration entry point where appropriate.
- If supported by the existing architecture, return users to the intended destination after login.
- Handle expired/invalid sessions consistently.
- Clear or invalidate protected cached data on logout/account changes.
- Enforce authorization on the backend as well; frontend hiding is not a security boundary.
- Do not hide unrelated public map features.

### Stage 4 — Map location-picking cursor
- Treat candidate location selection as a temporary interaction mode.
- After a valid map click selects and stores the coordinates, exit location-picking mode and restore the normal cursor.
- Provide a clear cancel path.
- Ensure errors, route changes, component unmounts, or cancellation cannot leave the map stuck in crosshair/plus mode.
- Coordinate changes must mark old analysis results stale when applicable; they must not silently trigger analysis.

### Stage 5 — React Joyride onboarding
- Review the official React Joyride documentation: https://react-joyride.com/
- Verify compatibility with the project's installed React version and current setup before adding or changing dependencies.
- Build a concise, useful onboarding tour for relevant map workflows:
  1. Map navigation and public browsing.
  2. Selecting a business.
  3. Adding a candidate.
  4. Picking a location.
  5. Running analysis (authenticated users only).
  6. Opening Saved Candidates (authenticated users only).
- Use stable selectors or refs that match the real UI.
- Control the tour through React state and handle Joyride callbacks correctly.
- For steps requiring user interaction, wait for the relevant action/target state instead of advancing prematurely.
- Do not advance solely because the map was clicked unless the expected selection action actually succeeded.
- Make the tour responsive, dismissible, and replayable.
- Avoid restarting the tour on every render or route change.
- Unauthenticated users must not be directed into protected actions. Use an appropriate public-only tour or skip protected steps until authenticated.
- Use a custom tooltip only if it improves the existing design and remains maintainable.

### Stage 6 — Verification and documentation
- Run focused tests after each stage.
- Run relevant Laravel tests, frontend tests, lint/type checks, and production build where available.
- Do not claim a command passed unless it was actually run and passed.
- Update `LOCIVA_IMPLEMENTATION_PLAN.md` with verified outcomes, changed files, tests and remaining risks.
- Mark only verified completed items with `- [x] ✅`.
- Mark partial work with `🟡 PARTIAL`.
- Stop after the scoped work and report the actual results.

## Out of scope
- Do not change market-potential scoring formulas, weights, thresholds, or recommendation rules.
- Do not rebuild or duplicate the analysis engine.
- Do not redesign unrelated pages or perform broad refactors.
- Do not add migrations or dependencies unless the audit shows they are necessary.
- Do not weaken authentication, authorization, ownership checks, or validation.
- Do not replace real API behavior with hardcoded or fabricated data.

## Acceptance criteria
1. Candidate saving works for a valid business the user is authorized to access, and invalid access remains rejected.
2. Saved Candidates results are scoped to the selected business and searched/paginated by the API.
3. Unauthenticated users can browse the public map but cannot access protected feature content or actions.
4. Selecting a candidate location restores the normal map cursor and exits picking mode.
5. Joyride guides users through valid actions without broken selectors, premature advancement, or auth-gated dead ends.
6. Relevant regression tests and build checks are run and honestly reported.
