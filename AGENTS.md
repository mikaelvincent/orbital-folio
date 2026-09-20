# Orbital Folio — project instructions

Repository-wide agreements distilled from the owner's conversation. Apply them
regardless of model or reasoning effort. New explicit user instructions can revise
these preferences; update the relevant record when they do. Earlier experiments
and screenshots are evidence, not new instructions or permanent prohibitions.

## Project and context

- This is an editable developer portfolio whose main interface is a Three.js
  spacecraft. React/TypeScript, Vinext/Vite, Cloudflare D1/R2 and Drizzle support
  the application and authenticated content studio. Use npm and the existing stack.
- Read [project context](docs/PROJECT-CONTEXT.md) before changing architecture,
  room design, camera/navigation or the orbital environment. It maps current
  decisions to source/evidence and identifies superseded requests.
- Before performance work, read the latest entries and **Next candidates** in
  [the performance ledger](docs/performance-ledger.md), then the relevant
  [diagnostics/protocol guide](docs/performance-diagnostics.md). Historical reports
  can describe designs and recommendations that are no longer current.
- Inspect Git status and relevant source before editing. Preserve unrelated work.
  Give parallel agents bounded file ownership or isolated checkouts; do not
  overwrite another agent's unfinished changes.

## Carry the work through

- Treat "can you", "please fix" and similar requests as instructions to act.
  Resolve routine choices from established context and continue authorized work
  without repeated confirmation. Ask only when a consequential ambiguity or
  genuinely missing authorization cannot be resolved from context.
- Look for analogous defects when relevant: both paired objects, other affected
  rooms and useful screen/camera states. Scale this to the change; documentation
  edits do not need a rendered-screen sweep.
- Keep progress and final reports concise and understandable. State the result,
  verification and material limitations. Do not call a proposal or partial
  implementation complete.
- Use the **hidden built-in browser** for visual checks. Do not capture/control
  native Safari, other native apps or the user's screen without a new explicit
  request authorizing that interaction. Old native Safari recordings are not
  standing permission. Never label built-in Chromium results as Safari tests.
- Reuse the existing local server. When asked to run the site, leave it accessible
  at `http://localhost:3000` for the user's Safari and verify the response; do not
  focus their browser. Clean up temporary review servers/tabs while preserving
  the main development server.

## Design priorities

- **Design quality takes priority over optimization in authored visual work.**
  Spend geometry where it improves the approved design and report the cost
  honestly. Do not sacrifice appearance or motion to hit an old geometry budget.
- Aim for an artistic, futuristic, believable spacecraft. Objects should have an
  apparent purpose and convincing attachments. Avoid generic filler boxes,
  arbitrary orange blocks, repeated vent patterns, floating parts and unmotivated
  equipment. Legitimate storage boxes/panels are fine when their function is clear.
- Relate colors to nearby objects: cream ceramic hull, dark navy/graphite, satin
  alloy and restrained amber. Favor **justified spacing and visual balance** in
  the usable space between neighbors and curved walls. Grid discipline helps;
  forced symmetry is not universal. Explicitly paired assemblies must match.
- Primary room labels, door signs and interactive text must be immediately
  noticeable and legible. Passive decorations should not resemble selectable
  options. Do not use decorative signs on outboard walls as filler.
- Keep chassis surfaces, ladder returns and openings smoothly rounded and
  continuous. Fix sharp hull junctions, bulges, clipping, seams, jagged edges and
  flicker. This is not a ban on purposeful tool jaws or functional object edges.
- Preserve plain dark blue/black floors. Keep only the **two header-side vents
  per cabin**, mounted flush, aligned with the header and centered between header
  and wall. Do not reintroduce vent-like filler, orange floor rails or blocks.
- Center doors horizontally and vertically in the **visible wall**, accounting
  for curved returns; align signs to their door's horizontal center. Place
  overview leader endpoints at the room opening's top/bottom midpoint. Window
  edges should be flush and continuous, without protruding trim or cream slivers.
- Current exterior: full matching upper/lower access ladders. Current ladder
  room: paired stowed maintenance spanners and two grab bars at each end, with
  their intervening spaces empty. Keep this arrangement unless the new request
  changes it; do not restore the rejected lights or reels from old evidence.

## Camera, doors and navigation

- Move the **camera around a stationary spacecraft**, including portrait roll,
  hover and drag. The orbital background shares that physical viewpoint and moves
  naturally during travel; do not reset it around each selected room.
- Use the shared architectural reference for consistent room scale/perspective.
  Furniture edits must not independently alter a room's camera fit. Frame overview
  responsively while preserving readable labels and the intended silhouette.
- Direct room URLs begin at overview and use the ordinary room-entry transition.
  Preserve reading-view, reduced-motion, keyboard/focus and history behavior.
- Drag release springs smoothly back to hover control without snapping or
  discarding velocity. Preserve bounded drag, re-grab continuity and click
  suppression. Touch/outside release returns to neutral as appropriate.
- Visible neighboring rooms are navigation targets as well as doors. Hover
  previews the first connecting door while preserving the final chosen room,
  including nonadjacent routes. Solid chassis and sky remain inert.
- Solid walls around a current-room door retain ordinary current-room hover;
  they must not preview a room or ladder behind them. Keep invisible door/sign
  targets on their visible faces so oblique views cannot extend them onto walls.
- Hover/focus can open doors while travelling. A click queues **one** destination,
  including Home; a later choice replaces it. Start it immediately after the
  current flight completes. Preserve queue behavior through intermediate waypoints.
- Ladder entries participate. **Exits viewed from inside the ladder room are the
  exception**: preserve their preview restriction and automatic sequencing. The
  ladder is a connector, not a separately queued destination. Hovering its visible
  bay from a cabin previews the first door toward it; clicking crosses the ladder
  to the next cabin on the other deck. Bay selection stays inert from overview
  and while physically inside the ladder.
- Only **one physical ladder door** opens at a time. Seal the entrance before
  opening the exit. Request the exit when departing the center waypoint, approach
  its safe boundary while opening, and prevent crossing until clear. Ordinary
  cabin passages and ladder entry do not wait for door opening.
- Keep opening near **2× the original speed**. Start closing after camera passage,
  not after final arrival. Preserve one iris blade set between wall faces, dark
  frames and themed perimeter-light feedback instead of cream border recoloring.

## Earth and sky

- The owner selected **Europe at Night**: longitude **12°**, latitude **48°**,
  roll **−10°**, with apparent rotation **0.0045 rad/s**. The later consistent-scene
  request supersedes viewport-specific Earth placement/orientation: keep Earth
  fixed in the shared physical world and let camera projection/framing determine
  its crop. The owner's portrait composition exception selects an Earth anchor
  from viewport orientation, placing its horizon bottom-left in vertical overview.
  Keep that anchor fixed during room navigation: Earth and stars must respond to
  the same camera, even when Earth leaves the frame inside a room. Never use the
  animated navigation roll to cancel Earth's apparent motion. Only an actual
  viewport-orientation change may ease between composition anchors; preserve
  geographic phase and the canonical world registration.
- Production uses a **2560×1536 lossless regional WebP**, with an unchanged
  **1536×1536** European core at original 8K-source pixel density and an offline
  **AI-assisted fictional coastal continuation**. Its **112.5° / 436.332-second**
  loop scrolls texture coordinates on a fixed sphere with one texture sample.
  Keep the cinematic atmosphere, native detail and naturally connected lights;
  avoid broad unlit land blocks and oversized glowing cities. The fixed sphere's
  UV seam must stay outside the verified camera envelope; rerun coverage after
  camera changes. Crop height is bounded evidence with filtering margins, not a
  universal mathematical optimum. See [current evidence](docs/evidence/earth-consistent-loop/README.md).
- The former angle/preset helper, day-model toggle and portable settings remain
  retired. The owner subsequently authorized a **temporary Earth playback
  helper** for inspecting the regional loop: a globe icon beside diagnostics,
  a seekable timeline, Play/Pause/Restart and **1–60×** speed relative to the
  approved 0.0045 rad/s rate. This narrowly supersedes the no-controls rule;
  do not restore angle, preset or daytime controls. Seeking pauses, closing
  preserves the chosen phase and restores normal 1× playback, and reloading
  restores the original Europe opening. Keep this state temporary, with no
  storage/backend writes. Only Earth playback changes; preserve sky/camera
  timing, readiness and global reduced-motion/visibility behavior. Manual
  seeking remains available under reduced motion.
- The application fetches only `earth-europe-loop.webp`. Retain the original
  night JPEG and checked-in AI input for rebuilding, regression tests and
  source-identified comparisons. No runtime generation or extra image request.
  Generated geography is explicitly fictional in developer provenance; preserve
  input/prompt hashes and exact original-core checks. Older atlas/rendering
  revisions remain available through Git and their matching evidence records.
- Favor cinematic science-fiction art with plausible cues: a blue horizon
  gradient with a restrained peak, not gray haze or glaring electric blue. Keep
  a surrounding star field with no exposed edge during drag/roll, readable varied
  star sizes, noticeable independent twinkle, and slower, dimmer, less frequent meteors with
  occasional groups. Procedural-cloud trials are historical, not today's design.

## Performance and comparisons

- Diagnostics must stay device-agnostic, approachable for nontechnical users and
  useful for technical users. Preserve the pulse launcher beside the Content
  studio icon, opt-in instrumentation, semantic room/part breakdowns, advanced
  controls and
  named exports. A URL parameter is optional, not the only way to open it.
- The owner uses a passively cooled **MacBook Air M4**. Account for thermal drift,
  but do not infer throttling from timing alone or hardcode M4-only quality rules.
  Safari is an important target; report the engine actually tested.
- **Ledger candidates require explicit authorization before implementation.**
  The ledger records completed investigations and which proposals remain held.
  Design work does not authorize them. When optimization is requested, prioritize
  measured expensive passes/assemblies. Appearance/feel changes need a concrete
  proposal with benefit, tradeoffs, resulting experience and recommendation first.
- Preserve source/asset-identified baselines and candidates. Match browser,
  viewport/drawing buffer/DPR, camera, animation time, quality and power conditions.
  Use repeated balanced orders and baseline rechecks; follow the documented rested
  protocol. Stop builds/tests/other rendering during timed runs. Pauses and nominal
  OS pressure do not prove equal clocks or absence of throttling.
- Separate download size, decode/upload/first-frame preparation, steady CPU/GPU
  timing, frame pacing, draws/triangles, geometry arrays and nominal texture
  storage. Distinguish estimates from measured process/GPU memory. Do not add CPU
  and GPU time, infer speedup from counts, or claim unmeasured heat/battery gains.
  Missing/disjoint GPU values are unavailable, not zero.
- Distinguish shadow generation from cached sampling, and AO refresh from reuse.
  Group isolation changes occlusion/shading; its differences are not additive
  per-object costs. Compare relevant rooms and motion states, not only idle views.
- Record method, hashes, raw/excluded/rejected/inconclusive runs, visual evidence,
  outcomes and tradeoffs in a new evidence folder. Update the **running performance
  ledger** with reasonable detail for a future case study. Preserve old results;
  new art creates a new baseline, not an optimization gain. Do not generalize one
  browser's measurements into universal performance claims.

## Verification and independent critic

- Match verification to risk. Run relevant tests for actual failure modes.
  Shared model, renderer or navigation changes warrant the full suite,
  typecheck/build and affected lint. Avoid implementation-mirroring tests and
  needless repeated suites after checks pass. Documentation-only work needs
  accuracy, link/path, consistency and diff checks, not WebGL or full app tests.
- Visually inspect authored changes at useful camera states and responsive
  layouts. Geometry tests cannot judge aesthetics. Record actual versus scaled
  viewport sizes, finite fixtures versus live rendering, engine and omitted
  effects. Never claim unperformed checks.
- Use an **independent critic agent for every completed change task**, including
  documentation. The critic chooses a problem-appropriate rubric: fulfillment,
  visual quality where relevant, correctness, organization, performance implications
  and evidence. Visual work must give real weight to design, not just low cost.
- Address findings and iterate to **90/100 or higher**, with no unresolved
  blockers or failing required checks. A score never overrides user feedback.
  Do not coach score inflation or invent independent review if agent tools are
  unavailable; disclose unavailable review honestly.
- Give the critic the **final source and matching evidence**. If implementation
  changes after capture/measurement, disclose it and refresh affected evidence.
  Preserve the rubric, score, revisions and limitations. For docs, review coverage,
  current-versus-superseded accuracy, clarity and usability.

## Commits, maintenance and local boundaries

- **Always commit completed changes**, including documentation, in logical,
  reviewable groups. Avoid both giant accumulated commits and trivial fragments.
  Stage explicit paths, preserve unrelated work, verify final Git status and
  report any remaining uncommitted work. Use `codex/` if creating a new branch
  unless directed otherwise. Local implementation does not imply push or deployment.
- Remove established dead code and obsolete one-off reports, plans, screenshots
  and audit scripts after checking runtime, test, build and tooling references.
  Preserve reusable diagnostics, source-identified performance comparisons,
  licenses and current operating instructions; retain uncertain items and explain
  why. Git history holds superseded revisions. Do not create new reports for
  routine organizational cleanup. Keep durable rules here, current decisions in
  [project context](docs/PROJECT-CONTEXT.md), changing performance status in
  [the ledger](docs/performance-ledger.md), and necessary comparison evidence in
  `docs/evidence/`. Update these when decisions change rather than making the
  user repeat them.
- Use installed dependencies and `package.json`: `npm run dev`, `npm test`,
  `npm run typecheck`, `npm run lint -- <changed files>`, `npm run build`. On a
  genuinely fresh checkout use `npm ci` and `npm run setup`; do not reset an
  existing studio/database as routine setup.
- Preserve persisted identity, draft/published content, authentication, privacy,
  semantic readers and contact behavior. Preserve demo/sample metadata and studio
  controls, but omit visitor-facing
  sample badges and notices as requested. A nonfunctional action must still
  state that nothing was sent or booked; never claim delivery or booking. Never
  print or commit `.dev.vars`, `.env*`, credentials, private inquiries or emulator state.
  Keep development authentication/emulators on loopback. See
  [operations](docs/OPERATIONS.md) for deployment-specific work.
