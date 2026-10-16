# LOCIVA MAPS --- Implementation Brief for Antigravity

## Purpose

Fix and improve Lociva Maps end-to-end. Read this file before changing
code. Audit the existing repository first, reuse existing
architecture/components, and implement in the three phases requested by
the user. Do not rewrite working features unnecessarily.

## Mandatory engineering and design rules

-   Backend: Laravel OOP and SOLID principles are mandatory. Keep
    controllers thin; use services, requests, resources, policies, and
    repositories only where appropriate.
-   Frontend: follow the existing React + TypeScript architecture and
    API client.
-   UI: use the project's existing reusable components first. If a
    needed component does not exist, create a reusable one.
-   **Claymorphism is mandatory** and must follow the existing design
    tokens/classes. Do not introduce a separate visual system.
-   **Icons are mandatory** (use the project's icon library,
    e.g. lucide-react if already installed). Do not use emoji as UI
    icons.
-   Prioritize clear, accessible UX for both younger and older users:
    understandable labels, tooltips, contrast, responsive behavior,
    sensible empty/loading/error states, and keyboard/touch usability.
-   Do not use hardcoded/random production data or fake analysis scores.
    Clearly distinguish seeded demo data from live data.
-   Never reset Git, force-push, or perform destructive operations
    without approval.
-   If a significant decision cannot be resolved by inspecting the
    repo/spec, ask the user. Otherwise proceed.

## Problem list and requirements

### 1. Map coverage and existing locations

Current issue: markers only appear when a candidate is added and only
within its radius, leaving the map empty otherwise. - Show available
mapped places/businesses even when no candidate exists. - Do not
hard-limit the map to Malang. Support any country/region covered by the
selected data provider. - Do not attempt to download the entire planet's
dataset at once. Query by current viewport/bounds and load more as the
user pans/zooms; use pagination, clustering, caching, and provider
limits as appropriate. - Explain the actual coverage/limits of each
source. Do not imply that OSM contains every place in every country. -
Render source-backed business/POI markers and distinguish them from
candidate markers.

### 2. Nearby POI accuracy and completeness

Current issue: many places visible on the map do not appear in the
Nearby POI list. - Audit the current POI query, categories, radius,
bounds, filters, limits, pagination, and provider/API constraints. -
Improve coverage without claiming complete data when the provider cannot
guarantee it. - Keep map markers and Nearby POI list consistent where
they refer to the same query. - Show loading, empty, partial-result, and
provider-error states clearly. - Document source and limitations. Never
fabricate missing POIs.

### 3. Icons, not emoji

-   Replace all emoji used as interface icons with proper icons from the
    existing icon library.
-   Ensure consistent size, stroke, alignment, and accessible labels.
-   Emojis may remain only when they are actual user-provided content,
    not UI controls/decoration.

### 4. Invalid candidate locations

Current issue: location scores still appear when a candidate is dragged
to open sea or an uninhabited/non-serviceable area. - Validate candidate
coordinates and surrounding context using real available geospatial
data. - Detect sea/offshore or otherwise unsupported locations where
data supports that decision. - Return a clear
unavailable/insufficient-data state rather than misleading scores. - Do
not infer that an area is uninhabited based only on missing POIs. -
Backend must validate analysis results; frontend must display the
explanation and not present stale scores.

### 5. Saved candidates UX and delete

-   Improve the saved/pinned candidates UI so users can easily
    understand and manage saved candidates.
-   Add delete/remove candidate functionality with confirmation where
    appropriate.
-   Keep frontend state and backend persistence consistent; show
    success/error feedback.
-   Include proper empty/loading/error states and responsive
    Claymorphism styling.

### 6. Demo vendors and live user locations

-   Provide realistic seeded **demo vendor/business records** across
    multiple distinct locations so the team can test the map and see
    sample vendors in different places. Mark them clearly as demo/seeded
    records; do not present them as real active users.
-   Support showing live vendor/user locations only when the user
    explicitly enables location sharing and grants permission.
-   Live location must be opt-in, privacy-aware, access-controlled, and
    stop sharing when disabled. Do not track users silently or persist
    precise location unnecessarily.
-   Distinguish demo vendors, registered businesses, and opt-in live
    locations visually and in the legend.
-   Define update frequency, expiry/staleness, and access rules; do not
    claim "real-time" unless the implementation genuinely updates.
-   Seed data must be loaded through Laravel API, not hardcoded in
    frontend.

### 7. Intermittent external API fetch errors

-   Audit API calls, rate limits, network failures, invalid responses,
    and provider errors.
-   Add robust timeout, cancellation, retry with bounded backoff for
    transient failures, and graceful UI feedback as appropriate.
-   Avoid infinite retries and duplicate requests. Do not retry
    non-retryable errors blindly.
-   Log useful server-side diagnostics without exposing secrets or
    sensitive user data.
-   Preserve existing results when a refresh fails if that is safe, and
    indicate that data may be stale.

### 8. Route save errors

-   Reproduce and trace the route-save error from frontend through API
    validation, authentication/authorization, database schema, model
    relations, and response handling.
-   Fix the root cause; do not mask errors with fake success.
-   Add validation and automated tests for saving/loading/deleting
    routes as supported by the existing feature.
-   Show actionable UI feedback on failure and success.

### 9. Tooltip background is transparent

-   Fix tooltip/popover styling so its background is opaque and readable
    in light/dark themes.
-   Check stacking context, z-index, portal behavior, theme tokens, and
    inherited opacity/transparency.
-   Use existing reusable tooltip components/styles if available; avoid
    one-off arbitrary styles.

### 10. Nav Pill anchored floating panels

-   Existing Nav Pill is already present. When any Nav Pill item is
    clicked, show its corresponding floating card/panel immediately to
    the right of the Nav Pill, with an arrow/caret indicating the active
    item.
-   This behavior is mandatory for all applicable menu items: Catalog,
    Routes, Candidates, Nearby POI, and other existing tools.
-   **Search is the exception** and must retain its intended existing
    behavior.
-   The panel should float above the map, not push/reflow the map
    layout. It must have a solid readable background, correct z-index,
    clear active state, and responsive behavior on small screens.
-   Switching menu items must switch the panel and arrow state
    correctly. Clicking the active item again or an explicit close
    control should close it if that fits the existing interaction
    pattern.
-   Keep panel position anchored to the Nav Pill and avoid clipping
    outside the viewport.

### 11. Candidate comparison menu

-   Remove the old standalone "Compare Candidates" UI/entry that
    conflicts with the new navigation pattern.
-   Add "Compare Candidates" as a Nav Pill menu item.
-   Enable it when at least one saved/pinned candidate exists; if fewer
    than two exist, explain that comparison is more useful with two or
    more.
-   Let users select which candidates to compare (e.g. A, B, C), not
    force comparison of every candidate.
-   Show a side-by-side comparison using real analysis outputs and
    available metrics, with clear missing-data states.
-   Do not invent values or present incomparable metrics as equivalent.

## Data, architecture, and performance

-   Audit existing map provider(s), POI source, routing provider, API
    client, and backend data model before choosing changes.
-   Use viewport/bounds-based loading; do not request all global data in
    one request.
-   Use debounce for viewport/search/drag-triggered requests, cancel
    stale requests, and prevent old responses from overwriting newer
    state.
-   Keep secrets server-side. Respect provider attribution,
    caching/storage, rate-limit, and licensing terms.
-   Use database seeders/factories for development demo data. Keep
    source/provider metadata and timestamps where useful.
-   Follow Laravel OOP + SOLID. Put business logic in testable services,
    not React components or fat controllers.
-   Do not show stale candidate analysis after coordinates change; show
    loading/invalid/insufficient-data states until the new result is
    ready.

## Acceptance checklist

-   Map shows available markers even with no candidate, and supports
    browsing outside Malang using viewport-based requests.
-   Nearby POIs are improved and limitations are visible.
-   No emoji used as UI icons.
-   Sea/unsupported candidate locations do not show misleading scores.
-   Saved candidates can be viewed and deleted.
-   Demo vendors are seeded and served from backend; live locations are
    opt-in and privacy-aware.
-   External API failures have graceful recovery and understandable
    feedback.
-   Route saving works end-to-end and has tests.
-   Tooltips have opaque, readable backgrounds.
-   All applicable Nav Pill menus open floating anchored panels with
    active arrow; Search remains the exception.
-   Candidate comparison lives in Nav Pill and supports selecting
    candidates.
-   Existing reusable components and Claymorphism styling are used
    consistently.
-   Run relevant tests/build/lint and report actual results; do not
    claim tests passed unless run.

## Required final report

Summarize briefly: 1. What changed (frontend/backend/database/API). 2.
Root causes found. 3. Files/features changed. 4. Tests/build commands
run and actual outcomes. 5. Remaining limitations, especially external
data coverage/rate limits/licensing. 6. Any decisions that need the
user's input.
