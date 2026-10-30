# LOCIVA Agent Skills and Technical Expectations

This file defines the working skills and engineering practices needed for this task. It is not permission to redesign the project.

## Repository analysis
- Trace data flow end-to-end: UI state → API client → request payload → Laravel route/middleware → controller → service/model/policy → response → UI state.
- Use existing naming, folder structure, validation, error handling, and response-envelope conventions.
- Inspect migrations and model relationships before modifying queries or persistence.
- Distinguish a real empty result from an unauthorized request, validation error, timeout, and server failure.

## Laravel and API
- Use the project's installed Laravel conventions.
- Verify route middleware and policies/ownership checks.
- Validate IDs and request payloads at the appropriate boundary.
- Scope list/search queries on the server by the authenticated user and selected business as required by the data model.
- Apply search and pagination in the database/API layer rather than retrieving everything for client-side filtering.
- Keep response shapes compatible with the existing frontend unless a justified correction is required.
- Add focused feature/unit tests using the project's current test setup.

## React and TypeScript
- Follow the existing React state and component architecture.
- Avoid stale closures, race conditions, duplicate requests, and state updates from outdated responses.
- Use the existing API client and auth context/store rather than adding parallel implementations.
- Ensure debounced search is cleaned up correctly and that business/query changes reset pagination.
- Use stable selectors or refs for guided-tour targets; avoid brittle positional selectors.
- Keep state transitions explicit for location-picking mode.
- Do not use `any` to bypass type errors unless the existing project has a documented reason; prefer correct types.

## React Joyride
- Read current official docs: https://react-joyride.com/
- Confirm the installed React version and Joyride package compatibility.
- Follow the installed version's API and callback types; do not copy examples for another major version without checking.
- Make the tour controlled when the UI requires interaction-aware step transitions.
- Handle missing targets, route changes, tour completion, skip, and replay.
- Keep authenticated-only steps unavailable to unauthenticated users.
- Do not add a large abstraction for a small tour.

## Map interaction
- Keep map browsing separate from temporary candidate-picking mode.
- Ensure success, cancel, failure, and unmount paths all restore the correct interaction state.
- Verify cursor behavior in the actual map library and existing event handlers.
- Do not assume that a point near a road proves legal or safe access.
- Do not trigger analysis automatically after a coordinate update.

## Testing and review
- Run the narrowest relevant tests first, then broader available checks.
- Inspect `git diff` for accidental changes and secrets.
- Never weaken security checks to make a test pass.
- If an external service is not available during testing, report that limitation and test the local failure-handling path where possible.
