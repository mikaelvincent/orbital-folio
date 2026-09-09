# V10 independent render review plan

Scope: spacecraft, spatial camera/navigation/input, Earth and space background. Do not change, optimize, or exercise the separate Projects/Experience/About/Contact reading interfaces in this review. The preceding revision’s score is not evidence of this revision’s quality. No checkout edits or shared-browser operations by this reviewer.

The five equally weighted areas are: (1) spacecraft art/design, (2) geometry/spatial navigation, (3) Earth/space atmosphere, (4) responsive accessible input/render navigation, and (5) render performance/maintainability. Overall is twice the sum of five 0–10 scores. Acceptance requires at least 90/100, every area at least 8, and no blocker within this render scope.

## Source-informed risks to resolve first

- The current model treats Projects/About as the left column in multiple independent branches (`spacecraft-model.ts` around 1115, 3547 and 3941); adjacency/portal pairs also encode Projects–About. `spacecraft.tsx` around 693–715 constructs the old Experience → Projects → walkway → About → Contact itinerary. Swapping only room centers would leave plausible-looking but incorrect holes, dimming, routes or camera bends. Expected new order is Projects → Experience → stairs → About → Contact, with Experience upper left and Projects upper right. Derive topology from shared metadata where practical.
- `cursorViewSamples` currently duplicates the old pitch ±0.025 and yaw ±0.045 rad constants. Enlarging the drag response without changing framing extrema would invalidate fitting evidence. Keep a shared angle contract; distinguish passive cursor motion, doorway peek and deliberate drag. Inspect intermediate angles as well as endpoint corners when the range increases.
- Moving `.flight-navigation` from bottom center to bottom left collides with the current bottom-left status/admin item and may place the centered dropdown partly offscreen. Verify both container and dropdown placement, not only the toggle. A persistent Home control must exist with the menu closed and throughout flights.
- Current model creation passes room/project labels but not necessarily the new hull identity. New branding must come from persistent site data and fit long text; do not bake a name/domain into an asset.

## Required working evidence

### 1. Spacecraft art/design

Inspect settled, clean production overview and each cabin exterior/interior scene at desktop, 390px and 320px; no reading panel needed. Compare room lighting in an identical overview before/during hover: stronger interior dimming should preserve material shapes while docking, exterior structure and stairs remain lit. Rapid hover reversals should not flash or snap. Inspect real door lintels, flat attached plaques, text normals/readability, consistent fittings, symmetric hull branding and docking interior depth. Show empty project bays with enough distinct equipment to substantiate uniqueness, rather than cycling three identical props. Pure model inputs can cover 0/1/5/9 occupied bays without editing published content or opening dossiers.

### 2. Geometry/spatial navigation

Audit the new six directed neighboring portals and both directions through the stairs. Verify their openings, lintels, target sections, passage waypoints and left/right signs against final geometry for wide/compact layouts. Show a complete native-control journey through P → E → stairs → A → C and reverse, retaining one renderer. Record a flight interrupted while velocity is nonzero; route from the actual camera location rather than the previous requested destination. Docking should have a believable interior without opaque closure, floating trim or exposed self-intersections. Verify drag extrema keep the promised interactable geometry visible; document any portrait exterior framing compromise instead of claiming full hull visibility.

### 3. Earth/space atmosphere

Judge final pixels as well as the researched algorithm: cloud depth, non-repeating structure, soft edges and coherent limb/horizon; no obvious coarse cells, unstable distant detail, flicker or visible spherical seams. Inspect both quality tiers, close and wide framing, and a short naturally elapsed sequence. Record actual Earth/cloud angular rates and meteor interval/concurrency against baseline (formerly 5–9 second groups with periodic pairs). More frequent events must remain bounded and disappear in reduced-motion mode. Retain procedural/no-image constraints unless the latest user instruction explicitly supersedes them. Cite actual algorithm sources and any asset provenance; a paper citation alone does not verify rendering quality.

### 4. Responsive accessible input/render navigation

At actual 320/390/768/1440 widths, check bottom-left menu and persistent Home, safe-area spacing, long editable labels, no clipped expanded menu, >=44px targets, visible focus and logical Tab order. Verify Home during a flight, same-destination selection, Escape focus return, outside dismissal, and keyboard-driven room highlighting/activation without requiring a pointer. Native mouse tests: drag from empty canvas, occupied locker and doorway; drag out and back; release beyond canvas; cancel/blur/lost capture; no accidental room/project activation after a drag. Touch-handler synthetic evidence is useful but must remain explicitly distinct from physical touch testing. Larger drag must remain bounded, not accumulate a free orbit. Check reduced motion and scene loading/failure escape at renderer level only; do not test the separate reading interfaces.

### 5. Render performance/maintainability

Collect clean built-production measurements with actual viewport, native DPR, renderer DPR/buffer, visibility, active time, route, draw calls and triangles. Compare like-for-like initial and settled windows of at least 360 frames; include active drag/flight and idle atmosphere. Preserve slow samples: V9 showed both ~50/66.7ms and ~16.7/18.6ms median/p95 on the same host. A later fast run cannot erase variability or identify its cause. CPU submission is not GPU time. A renderer-absent RAF control measures host scheduling, not cloud cost. Check bounded texture/shader/event counts, teardown, hidden/offscreen behavior, shader compilation fallback and no new external texture dependency. Build/type/lint and render-specific pure tests are appropriate; skip the broad reading-UI workflow suite in this scoped review.

## Reporting standard

Final report will identify exactly which screenshots, source audits and browser traces support each score, separate synthetic/numerical evidence from observed behavior, and retain unresolved visual/performance/device limits. Public hosting remains the historical external incident, not a new local render blocker. Leave localhost:3000 running. No fresh score until the final working revision and evidence are ready.
