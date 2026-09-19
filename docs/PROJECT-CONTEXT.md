# Orbital Folio — current project context

Decision snapshot: 19 September 2026. Complements the root [AGENTS.md](../AGENTS.md)
using the owner's conversation and current source. New explicit requests can
revise these decisions; update this guide when they do. Dated evidence describes
its own revision, not automatically today's app.

## Product and source map

An editable developer portfolio presented as a cutaway spacecraft in orbit.
Visitors explore four cabins, doorways and physical reader objects; semantic HTML
and reading views remain available. The authenticated studio manages persisted
identity/copy, media and separate draft/published content. Samples are not claims
about the owner's real career. Contact submissions enter the private inbox; the
application does not send email on their behalf.

TypeScript, React, Three.js, Vinext/Vite, Cloudflare D1/R2 and Drizzle form the
current stack. Extend the existing modular geometry builders; keep batching
metadata, passive/interactive distinctions, dimming and disposal intact. Use
[README](../README.md) and [operations](OPERATIONS.md) for setup/content workflows;
inspect source and `package.json` for exact current constants and versions.

| Concern | Starting points |
| --- | --- |
| Scene assembly, room metadata and animation | `features/spacecraft/spacecraft-model.ts` |
| Offline cylinder specialization and source check | `scripts/generate-indexed-cylinder.mjs`, `features/spacecraft/geometry/indexed-cylinder.generated.js`; exact triangle inputs with shared cap centers, checked before builds |
| Shared model materials, geometry cache and builders | `features/spacecraft/geometry/model-primitives.ts` |
| React host and renderer lifecycle | `features/spacecraft/spacecraft.tsx` delegates to `features/spacecraft/spacecraft-runtime.ts` for input, camera, lights, render loop, shadow/AO caching and cleanup |
| Camera, routes, queue and iris sequencing | `features/spacecraft/navigation/vessel-camera.ts`, `features/spacecraft/navigation/scene-controls.ts`, `features/spacecraft/navigation/flight.ts`, `features/spacecraft/navigation/door-navigation.ts`, `features/spacecraft/navigation/iris-navigation.ts`, `features/portfolio/immersive-portfolio.tsx` |
| Visible-room selection and door geometry | `features/spacecraft/navigation/room-navigation.ts`, `features/spacecraft/navigation/room-navigation-targets.ts`, `features/spacecraft/navigation/iris-hatch.ts`, `features/spacecraft/geometry/spacecraft-wall-layout.ts` |
| Hull/window returns | `features/spacecraft/geometry/continuous-exterior-skin.ts`, `features/spacecraft/geometry/rounded-cabin-interior.ts`, `features/spacecraft/geometry/flush-window-reveals.ts`, `features/spacecraft/geometry/ladder-opening-outline.ts` |
| Overview identity/callouts | `features/spacecraft/overview-annotations.ts` and model framing/label data |
| Room furniture | `features/spacecraft/rooms/about-personal-study.ts`, `features/spacecraft/rooms/projects-workshop.ts`, `features/spacecraft/rooms/case-study-archive.ts`, `features/spacecraft/rooms/contact-flight-console.ts` |
| Docking collar, service bus and solar/communications assembly | `features/spacecraft/equipment/docking-service-assemblies.ts` |
| Exterior/ladder fittings | `features/spacecraft/equipment/exterior-service-equipment.ts`, `features/spacecraft/equipment/docking-shoulder-equipment.ts`, `features/spacecraft/equipment/ladder-endcap-equipment.ts`, `features/spacecraft/equipment/ladder-service-spine.ts` |
| Earth/atmosphere/sky | `features/orbit/orbital-environment.ts`, `features/orbit/earth-satellite.ts`, `features/orbit/earth-view-transform.ts` |
| Temporary Earth composition helper | `features/orbit/earth-composer.tsx` and `earth-composer.css` for the interface; `earth-composition.ts` for presets, validation and portable settings; `features/spacecraft/spacecraft-runtime.ts` connects preview playback to the existing environment |
| Diagnostics/capture/attribution | `features/diagnostics/performance-panel.ts`, `features/diagnostics/performance-review.ts`, `features/diagnostics/scene-performance.ts`, `features/diagnostics/spacecraft-performance.ts` |
| Public/semantic readers | `features/portfolio/public-shell.tsx`, `features/portfolio/room-views.tsx`, `features/portfolio/world-reader.tsx` |
| Contact application and keyboard | `features/portfolio/contact-form.tsx`, `contact-flow.ts`, `contact-computer-window.tsx`; `features/spacecraft/navigation/contact-computer.ts`, `features/spacecraft/rooms/contact-keyboard.ts` |
| Studio coordination and workflows | `features/studio/admin-studio.tsx`, with setup, content-fields, inbox, access and model-tools modules beside it |
| Content and persistence | `lib/content/repository.ts`, `lib/content/types.ts`, `lib/content/validation.ts`, `db/schema.ts`, `drizzle/` |

## Room composition and macro design

Projects / Case studies sit above About / Contact, with the tall left ladder
connector and original docking assembly. Case studies uses `/case-studies` while
retaining its internal/persisted experience identity and `/experience`
compatibility. Do not rename persisted keys as cosmetic cleanup.

Room dimensions and neutral framing are shared. Responsive composition fits the
architecture rather than resizing objects independently. Portrait overview
visually turns the vessel upright with its satellite end above, using the camera
transform; the spacecraft itself remains fixed. Rooms return visually upright
when selected. Very short screens default to Reading view; explicit Interactive
opt-in must still render at the available dimensions.

The owner prefers rounded cream ceramic structure, plain dark floors, graphite
equipment, alloy mounts and restrained amber. Useful fixtures should explain
their presence without a decorative label. The earlier grid request was refined
to **justified space and visual balance** between objects and curved boundaries.
Primary labels and interactive screens take priority over decorative density.

Avoid generic filler plates, random orange strips/blocks, repeated vents,
floating fixtures, curtain-like berth objects and decorative outboard-wall signs.
These are contextual judgments, not a ban on legitimate boxes, signs or mounted
equipment. The two header-side vents per room remain, flush and aligned. Doors
are visually centered in their usable curved wall, with signs centered on doors.
Window trim follows the aperture, sits flush and hides cream edge slivers.

Recent approved arrangement:

- Full upper/lower exterior access routes mirror rail endpoints, rung spacing,
  mounting feet and amber tether details. Exterior decoration generally belongs
  on surfaces exposed by default, hover or bounded drag. The complete underside
  route is explicitly approved, even though elevated overview hides much of it.
- Two matching open-jaw maintenance spanners sit in fitted wall clips, one per
  ladder deck. Both end pairs of grab bars remain with empty intervening spaces.
  The earlier angled lights, reels, hooks, leads and related mounts are removed.
- Hull, roof/keel and ladder returns read as continuous rounded pressure
  structure. Preserve curves while eliminating bulges, clipping, exposed seams,
  raised reveal trim and flicker. Functional tool edges are not chassis defects.

Current evidence: [symmetric access refinement](evidence/spacecraft-access-symmetry/README.md).
The earlier [access redesign](evidence/spacecraft-access-design/README.md) preserves
rejected iterations; it does not authorize restoring those older objects.

## Interaction contract

The real camera moves around a fixed spacecraft and shares its viewpoint with
the orbital background. Removing the background should leave the approved ship
view essentially unchanged. The annotation-only virtual frame preserves portrait
ordering. Light/reflection transforms compensate for the old vessel roll; a
stationary hull therefore does not imply all lighting is invariant or bakeable.

Direct room URLs begin at overview and animate inward using normal room entry.
Keep the shared architectural fit independent of furniture extents. Hover adds
restrained depth; dragging gives a bounded larger view and springs back to current
hover on release. Preserve velocity and re-grab continuity. Touch/outside release
returns to neutral. Navigation clears stale pointer/drag goals. Preserve
reduced-motion, reading-view, focus, history and accidental-click safeguards.

Selecting a visible room previews its first connecting door and retains the
final destination. A nonadjacent room must be reached through all required
connections, not replaced by its first neighbor. Rounded opening masks exclude
solid frame/corner/divider surfaces and sky. Two rooms sharing a first door retain
distinct press/release identities. Selecting the visible ladder bay from a cabin
previews the current cabin's first connecting door and navigates through the
ladder: Projects → About, About → Projects, Case studies → Projects → About,
and Contact → About → Projects. The ladder is not a fifth destination; queue the
exit cabin. Its opening stays inert from overview and while physically inside
the bay, preserving automatic exit sequencing. Rounded masks still gate picking.
Solid current-room walls around a door do not preview the ladder or neighboring
cabin behind them. Picking uses the visible opening and flat door/guide/sign
faces; the old broad ladder volume and thick doorway targets are retired because
they could select through the wall at oblique viewing angles.

Hover/focus opens selectable doors during travel. Exactly one pending destination,
including Home, is retained; later choices replace it. Consume it at final
arrival, immediately starting the next movement. Preserve it through intermediate
waypoints and resize. Selecting the arrival cancels it; history/reader changes
supersede it. Ladder entry participates, but hovering/clicking an exit while
already inside the ladder bay retains its automatic restrictions.

Only one physical ladder hatch opens at a time. Seal the entrance first, then
request the exit while departing the center toward its landing. Approach its
safe threshold during opening and cross only once clear. Ordinary cabin passage
and ladder entry do not wait. Close doors after the camera clears their passage,
not after final arrival. One six-leaf iris mechanism sits between wall faces;
graphite reveals and recessed amber feedback replace border recoloring. Opening
is roughly twice the original speed; preserve the refresh-rate-aware motion
implementation instead of introducing an arbitrary new duration.

The current implementation is mapped above. [World-camera evidence](evidence/world-camera/README.md)
and [visible-room navigation evidence](evidence/room-access-and-hardware/README.md)
remain with the measured design baselines. Superseded door reports are available
in Git history; the interaction contract here and current source govern.

## Contact computer and submission boundary

The idle center monitor keeps its small `COMMUNICATIONS` label and uses
`LET’S CONNECT` as its main heading, with `Start a conversation` underneath.
The room sign still uses the configured Contact room name.
Its footer reads `COM / 01` and `OPEN TO CONNECT`; the left and right social
screens are `COM / 02` and `COM / 03`, respectively. There is no fourth channel.

The main Contact monitor is selectable with the shared screen hover/focus feedback.
Its application replaces the idle display on the existing glass. Landscape frames
the monitor and conventional 82-key keyboard; portrait frames a tall application
window inside that glass, with single-column fields and internal scrolling. The
monitor itself is not stretched. A conventional, accessibly named X closes the
application. Clicking exposed Contact-room pressure walls also returns to the
room; those walls dim during screen use, brighten on hover and show a secondary
return cue. Main/social screens, keyboard and desk block that wall action using
their actual rendered silhouettes.
The old deployable Contact tablet is removed; other room readers remain unchanged.

Keep bounded hover and drag camera control active while this application is open.
The closer computer orbit uses 0.04-radian pitch / 0.12-radian yaw limits; drag
release springs back to hover, and native form interaction never starts a drag.
A static abstract navy/alloy-blue desktop surrounds the application window.
The neighboring social displays remain independently hoverable and selectable,
with their amber rims inset on the glass. The already-open main display does not
advertise another selection. Its complete monitor/support assembly is raised
slightly to leave real clearance above the keyboard's function row, since an
HTML application plane cannot use WebGL depth to hide behind individual keys.

Both views share `ContactForm` and the in-memory draft/submission state. **Schedule
a call** comes first. Initially neither option is selected and no fields appear;
the choice and entered draft persist across view changes within that visit.
Clicking the selected option again returns to the chooser without discarding
entered fields. The two choices use accessible toggle buttons; Enter and Space
also select/deselect them. An explicit cleared choice survives view remounts,
including visits carrying an earlier submission-success flag.
The computer window shows a persistent themed scrollbar whenever its content
overflows, independent of native scrollbar auto-hide settings. The thumb supports
dragging and keyboard scrolling; wheel/touch still scroll the native content pane.
Reading view uses its ordinary page flow rather than a nested Contact scroller.
Call requests show required date/time and the device time zone first, then name,
company, email, subject and message. Message mode uses those five shared fields
in the same order; only email/message are required. Duration is omitted because
this is a preferred-time inquiry, not a booking. No call backend, availability
calendar, reservation or automatic confirmation exists.
The call branch validates but returns before any transport or persistence.

**Send a message is working**: it reuses `/api/contact` and the private D1 inbox.
The unchanged backend requires a name and legacy intent: the frontend supplies
`Name not provided` when omitted and `project` as an internal storage category.
Company/subject are preserved in the message body and count toward its existing
5,000-character limit. The old interview/project categories are not visitor choices.
No new schema, mail delivery or backend integration is introduced. Failed sends
retain the draft. Controls fail closed before hydration; without JavaScript the
configured email alternative remains available. The owner requested removal of
visitor-facing sample/demo badges and sample notices, including private preview
presentation; sample metadata and studio controls remain intact. Call requests
still do not send or save anything: the action-adjacent notice and acknowledgment
state this plainly without sample badges or a booking/delivery claim.

The secondary email callout can be dismissed/reopened, copied or opened as a mail
draft. Plain-text copying tries the synchronous compatibility path, then starts
the modern API within the same click if needed, restoring focus and selection.
Keyboard key caps and legends follow physical `code` presses/releases,
including held combinations; blur, visibility loss and closing clear their state.
On macOS, Caps Lock reports toggle events rather than physical release. The owner
approved a status fallback: its modeled cap stays down while Caps Lock is enabled
and rises when disabled. Read the modifier state from in-app keyboard events,
including ordinary typing, so returning to the form restores the current status
on the next key event. Blur, visibility loss and closing still clear all caps.
Other platforms retain physical down/up tracking, including Caps Lock. The former
140 ms Mac pulse is superseded; do not approximate hold duration with a timer.
Native editing shortcuts remain
intact. Mobile visual-viewport changes resize the inner scroll area without
changing the camera; device Safari keyboard behavior
still needs a native-device check. Design costs and checked states are in
[Contact evidence](evidence/contact-computer/README.md) and ledger entry 24. The
[interaction refinements](evidence/contact-computer-refinement/README.md) and
entry 25 record the subsequent clearance, social-screen and wall-close work.
[Desktop and input polish](evidence/contact-desktop-polish/README.md) and entry 26
record the chooser, wallpaper, drag, copy and earlier Caps Lock pulse. The
[Caps Lock fallback review](evidence/contact-capslock-status/review.json) records
the subsequently approved status behavior and its verification limits.

## Earth and atmospheric art

Production uses the **8192×4096 NASA Black Marble night map** and cinematic blue
atmosphere. The default remains the coastal East Asian opening (120°E, 25°N,
+22.5° roll), superseding Mediterranean and the inland East Asian trial. The owner
has not accepted that opening as final: its initial ocean and sparse lights still
disappoint despite improved later city-light coverage. Terrain area and automated
light scores are useful comparison evidence, not substitutes for the owner's
visual choice. The default rotation remains 0.003 rad/s pending the owner's choice;
later dark regions
are an inherent tradeoff of the current full rotation. No texture modification or
resolution change is introduced. Only the selected 8K map loads, not all comparison
assets. The owner sees worthwhile improvement over 4K and accepts the added cost.

The owner has now authorized a **temporary Earth view helper** to select the final
composition directly. This expressly supersedes the earlier removal of public
globe controls for this selection process. Its launcher opens longitude, latitude
and tilt sliders with numeric inputs. The owner subsequently recalled liking a
previous Europe/Middle East view. Git history identifies the explicitly selected
**Mediterranean** opening as **18° / 38° / −12°**, in checkpoint `2e6937c`.
This is distinct from the later **Europe at night** helper preset at
**12° / 48° / −10°**. Start by revisiting Mediterranean classic, with Mediterranean
diagonal as a new artistic alternative; neither is a newly approved default.
The grouped catalogue retains the previous options for direct comparison at the
owner's intended **2× saved rotation** (0.006 rad/s), with **3×** (0.009 rad/s) optional:

| Preset | Longitude / latitude / roll | Purpose and main tradeoff |
| --- | --- | --- |
| **Mediterranean classic** | 18° / 38° / −12° | Recovered earlier selection: recognizable Italian, Adriatic and Greek coastlines. Revisit this first; its opening does not prevent later Atlantic darkness. |
| **Mediterranean diagonal** | 18° / 38° / 45° | New artistic tilt of the same starting region, altering the coastline composition and subsequent visible route. |
| **Europe at night** | 12° / 48° / −10° | Restored earlier helper view: dense mainland lights, distinct from the classic Mediterranean coastlines. |
| **Nile & Mediterranean** | 32° / 30° / 20° | Distinctive Nile and coastal light patterns with dark sea and desert contrast. |
| **Middle East sweep** | 50° / 32° / −52.5° | A more dramatic regional sweep; sparsely lit terrain remains a tradeoff. |
| **Coastal Asia** | 124° / 31° / 7.5° | Prior route comparison's overall recommendation, retained for comparison; brief inland dimness occurs early. |
| **Tilted Asia** | 112° / 32.5° / 135° | Artistic diagonal alternative; shorter longest water-dominated stretch in the proxy comparison, with fewer lights on average than Coastal Asia. |
| **Asian light corridor** | 116° / 23.5° / 7.5° | Longer early sequence of light networks; darker stretches are worse over the complete rotation. |
| **American city lights** | −86° / 32.5° / 7.5° | Strong immediate city-light impact; Pacific darkness arrives relatively early. |
| **Current opening** | 120° / 25° / 22.5° | Unchanged production reference, not the recommended new composition. |

The first three choices appear under **Mediterranean & Europe**, the next two
under **Middle East**, and the prior five under **Earlier comparisons**. The
[Mediterranean follow-up review](evidence/earth-mediterranean-presets/review.json)
records history, regional comparisons and verification. Classic restores the
geographic angles, not a pixel-identical historical screenshot: world-camera
commit `c777fc2` changed the background lens from 42° to the shared 38° lens and
made it respond to spacecraft camera travel. The sphere radius, responsive
placement and geographic orientation math remain the same; later atmosphere,
star and spacecraft art also differ from the earliest captures.
The historical selection rotated at 1×, so its familiar coastline passes twice
as quickly at the owner's proposed 2×. Europe at night is retained as a historical
reference; its strong opening does not sustain good wide-view lighting through
the rest of the rotation.

Presets preserve the user's selected speed. These are recommendations for owner
comparison, not accepted production defaults. One revolution takes about **17:27
at 2×** or **11:38 at 3×**; the faster rate follows the same route in two-thirds
the time. No angle eliminates long dim regions throughout continuous rotation.
The [route-preset review](evidence/earth-route-presets/review.json) records rendered
comparisons, complete-cycle CPU proxies and their limitations. Color thresholds
are not authoritative land/water masks or a substitute for aesthetic judgment.

The Motion tab selects a saved rotation rate from 0× (stationary) to 5× the
current 0.003 rad/s rate. Rate edits pause at the chosen starting view; selecting
an angle preset retains the rate. Preview offers pause/play, separate
1×/10×/30×/60× fast-forward and a 35-minute timeline at the chosen rotation rate,
return to 0:00 and reset angle. Only Earth fast-forwards; the spacecraft, stars
and meteors retain their normal clocks. Explicit Play can run Earth under reduced
motion without restarting those other animations. Closing the helper pauses it
and retains the selected frame; a page reload returns to the production default.

"Use this frame as the start" folds the preview's rotation into its opening before
copying. Strict version-1 JSON contains longitude/latitude/roll and the selected
rotation rate from 0 to 0.015 rad/s, excluding preview time and fast-forward.
Previously copied settings with the default 0.003 rad/s rate remain supported.
A zero rate disables playback and seeking, while allowing the stationary view
to be copied. Reset speed restores 1× without changing the selected angle.
Copy and pasted-settings import
let the owner send an exact choice in chat; malformed settings are rejected with
feedback. Choices remain in temporary interface state without database or browser
storage writes. After the owner selects and shares settings, apply that opening
and rotation rate, then remove the helper. Preserve useful developer comparisons and historical
assets; do not preempt that choice by promoting a preset.

Atmosphere art takes priority over strict realism: preserve the gradual blue
horizon with a restrained peak, without gray pollution-like haze or glaring
electric blue. Stars surround the world on a uniform sphere, eliminating the old
rectangular patch's exposed drag edges. A hierarchy of small, medium and a few
larger luminous stars replaces the dust-like field. Independent brightness and
halo-size modulation make twinkle noticeable without pulsing the entire sky.
Meteors are quieter,
slower and less frequent than the early implementation, occasionally grouped.

Earlier cloud requests favored scattered formations with varied volume and
visible ocean rather than repetitive rough bits or a continuous thick blanket.
Those experiments were superseded by the satellite Earth. Do not resurrect them
because an old asset document calls procedural clouds current. These preferences
matter if the owner later reopens cloud design.

Current comparison evidence: [2K/4K/8K night Earth](evidence/performance/night-earth-resolution/README.md).
The [sky review](evidence/sky-land-composition/review.json) records star composition
and resource costs. Its land-based Earth acceptance was superseded by the
[city-light composition review](evidence/earth-light-composition/review.json),
which records early light coverage, distribution and the remaining dark intervals.
Both CPU audits use image-color proxies requiring rendered review, not authoritative
land or settlement masks.
The [temporary helper review](evidence/earth-composer/review.json) records its
final source, checked interaction states and verification limitations.
Earlier day-map/procedural comparison: [four-way audit](evidence/performance/earth-fourway/audit-summary.md).
Atmosphere: [horizon softening](evidence/horizon-softening/README.md).
Asset provenance: [texture records](../public/textures/README.md).
Historical native Safari captures do not authorize native screen capture today.

## Performance ledger and comparison discipline

[performance-ledger.md](performance-ledger.md) is the running record of implemented,
rejected, inconclusive and held work. The owner may use it for a case study.
Retain hypotheses, baselines, source/asset hashes, setup, raw runs, exclusions,
visual changes, decisions and limitations. New art costs must remain distinct
from optimization savings. No benchmark is needed just to edit these instructions.

The pulse icon beside the Content studio icon opens guided diagnostics with advanced
room/assembly/pass inspection and named exports. Instrumentation is opt-in and
normal rendering is restored on close. The owner has an Air M4 with passive
cooling; diagnostics must remain useful across devices/browsers. Unsupported GPU
queries are unavailable, never inferred zero cost. Use the authorized built-in
engine and report that scope; do not automate native Safari without permission.

Resolution comparisons include actual transfer bytes, decoded/nominal texture
storage with mipmaps, decode/upload/first-frame preparation and steady CPU/GPU/
frame pacing. Verify decoded dimensions and loading success. Preparation records
are not cold-network benchmarks; multi-version lab residency is not single-map
production memory. Current night data do not reliably rank steady rendering at
2K/4K/8K; delivery/storage differences are clear. Keep day/procedural comparisons
separate and identify preserved historical source explicitly.

Geometry/render experiments should first rank current costly passes/groups,
then compare the affected rooms and activities. Keep approved 8K Earth in
unrelated baselines. Match production build, viewport, drawing buffer, camera,
time, quality, power and motion state. Repeat balanced orders and reference
controls. Stop builds/tests/other rendering during timed work. CPU microbenchmarks
and sustained browser captures answer different questions.

Use the documented rested protocol and record thermal/power observations when
available. A pause or nominal OS pressure does not prove stable clocks or absence
of throttling. Keep drifting/small signals inconclusive and preserve interrupted
or rejected runs. Compare mean/p95 and block variation, refresh frequency,
startup/preparation and disposal where relevant. Neither geometry counts nor
CPU submission establishes GPU time; group hiding also changes occlusion/shading.

**Candidate 1 was authorized on 15 September 2026.** The delivered-camera audit
separates actual geometry revisions from material feedback so color-only changes
can reuse GTAO. Camera/door/reader motion, projection and explicit invalidation
remain covered. Shadow diagnostics count actual generation, and the full-scene
lab supports balanced comparisons with mutually exclusive frame/pass GPU timers.
Entry 19 records the narrow measured benefit, exclusions and image checks.
Candidate 2 was subsequently authorized: entry 20 records offline-specialized
indexed cylinder generation and its exactness/storage/timing evidence. No runtime
vertex-welding pass or downloaded baked model is introduced. Candidate 3 was then
authorized: entry 21 retains the existing cached shadows after testing an offline
native-depth bake. The bake adds delivery/restore work, does not reduce steady
sampling and cannot preserve portrait-roll shadows as one fixed map. The reusable
experiment remains developer-only. Candidate 4 was then authorized: entry 22
audits baked contact shading on 31 static Projects receivers and a hybrid with
live hatch/reader contact zones. The owner approved retaining production GTAO: the bake
and its subdivision visibly introduce coarse/patchy shading, add geometry and
asset costs, and do not preserve all moving-object contacts. The hybrid improves
local contacts but remains an approximation requiring art review. No contact bake
or asset is imported by production. Entry 22 owns source-matched verification and
timing status; stale-error runs are rejected, not evidence of thermal throttling.

**Candidate 5, baked diffuse illumination, was audited in entry 23. The
recommendation is to retain the delivered lighting; both visible alternatives
remain developer-only and unapproved for production.** It fits
nine RGB coefficients to the existing `RoomEnvironment` PMREM's roughness-1
directional field, rather than calculating new scene bounces or local contacts.
One variant replaces the shared irradiance lookup, affecting diffuse and
specular multiscattering energy; the other changes only its diffuse contribution
while retaining the original lookup and specular energy. Current fragment normals
and environment rotation drive evaluation, including portrait roll. Direct
lights, shadows, GTAO, dynamic readers, emission, room dimming and paint treatment
remain live. No candidate geometry or texture is added; 108 bytes describes only
the Float32 coefficients, not total memory. Final held-out GPU error is about
5.3%, and wide, portrait and compact comparisons show brightness changes. The
rested timing attempt fails its unchanged-baseline GPU stability gate, so it
establishes no speedup. Production illumination remains unchanged. Entry 23
preserves before/after images, qualified measurements and the reusable lab.

The ledger owns order and status. Key-light shadows, settled GTAO, the reflection
environment and the DFG reflectance approximation already have reuse or
precomputation paths. "Precompute everything" is a hypothesis to investigate in
parts, not permission to replace the renderer.
LOD, optional lower-power idle, adaptive resolution, aggressive room hiding and
broad hull simplification also remain deferred. The previously approved tiny
hardware reduction is not blanket approval for further visual simplification.

Practical entry points:

- [Diagnostics and rested workflow](performance-diagnostics.md).
- [Thermal research/limits](evidence/performance/rested-retests/research.md) and
  [power/exclusion audit](evidence/performance/rested-retests/final-audit.md).
- `scripts/benchmarks/spacecraft-geometry-inventory.mjs <baseline-commit>`:
  source-hashed static counts, not GPU timing or process memory.
- `scripts/benchmark-controlled-performance.mjs`: isolated CPU candidates;
  read the protocol before comparing results with browser rendering.
- [Earth resolution lab](../scripts/benchmarks/earth-resolution-lab.md).
- [Historical optimization investigation](performance-optimization-review.md):
  later ledger decisions supersede its next-step suggestions.

## Maintaining the record

Durable workflow rules belong in `AGENTS.md`, current decisions here, changing
cost/candidate status in the ledger. Keep reproducible performance evidence with
its comparison; retain necessary current maintenance documentation. Remove stale
one-off reports, plans and screenshots once their useful decisions are captured.
Git history preserves removed revisions. Do not create a report for routine
organizational cleanup. Today's work
does not include restoring 2K/4K defaults, permanent public Earth manipulators, old procedural
clouds, ordinary-door waits, duplicate iris blades, generic exterior filler,
angled rescue lights, end-gap reels or the short lower ladder stub.

Official support checked on 15 September 2026: Codex still loads project
`AGENTS.md` guidance, and Astra documentation explicitly discusses those files.
No model/effort override or global configuration change is needed.
[Codex project instructions](https://learn.chatgpt.com/docs/agent-configuration/agents-md),
[Astra guidance](https://developers.openai.com/api/docs/guides/latest-model).
