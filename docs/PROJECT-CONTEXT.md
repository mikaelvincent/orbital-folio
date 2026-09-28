# Current product decisions

This is the owner-intent reference for changes that affect behavior or appearance.
Read the relevant section, then inspect its source. Historical comparisons show
what was tested at a particular revision, not requirements for today's app.
Setup and source entry points are in [README](../README.md); content operations,
security and compatibility formats are in [operations](OPERATIONS.md).

## Spacecraft design

Projects / Case studies sit above About / Contact, joined by side doors and the
tall left ladder bay. Keep the ship stationary and fit cameras to the shared
architectural reference. Furniture changes must not independently change room
scale or camera fit. Very short screens default to Reading view; explicit
Interactive opt-in must still work at the available dimensions.

Aim for an artistic, futuristic, believable spacecraft. Fixtures need a purpose
and convincing attachment to the actual curved lining. Favor justified spacing
and visual balance; paired assemblies must match, but symmetry is not universal.
Avoid generic filler boxes, random orange blocks/rails, repeated vent patterns,
floating parts and decorative outboard signs. Purposeful storage and tool edges
are fine. Preserve continuous rounded hull/ladder returns and openings; eliminate
bulges, sharp junctions, clipping, visible seams, jagged edges and flicker.

The palette is ivory **#EEE9DE** architecture, carbon **#1F2730** equipment and
plain dark floors, satin alloy and restrained bronze **#AA8054** hardware. Base
bronze is an accent, not ordinary text; use ivory/carbon or accessible tonal
derivatives for text. Natural paper, wood, fabric, media/custom icons, solar blue,
Earth/sky and meaningful status colors are intentional exceptions. Legacy default
accent colors map to bronze without rewriting stored records; owner-selected
custom accents remain exceptions. See `lib/palette.ts` and `app/globals.css`.

Primary room labels, door signs and interactive text must be immediately legible.
Passive decoration must not look selectable. Keep exactly two header-side vents
per cabin, flush and aligned with the header, centered between it and the wall.
Center doors horizontally and vertically in the *visible* wall after curved
returns; center signs on doors. Window edges are flush and continuous without
protruding trim or cream slivers. Floors are continuous matte dark surfaces,
including the coves and front throat, without inset patches or extra rails.

The current arrangements matter more than the old numbered design stages:

| Area | Preserve |
| --- | --- |
| Projects workshop | Four removable monitors on a bench-supported instrument bridge; thin inset carbon worktop, grounded supports, clear working plane and one sheltered diffuser. No floating rear-wall braces. |
| Case-study archive | Four cartridges above the fixed 16:9 raked terminal in a shared floor-mounted dock. Formed cheeks and shoes meet the flat deck ahead of the rear cove. No fifth Field notes cartridge or lower runners. |
| Contact console | Thin rounded carbon console, conventional 82-key keyboard, fitted main/social glass, independently mounted social screens, outboard microphone and headset on an underslung hanger. Keep knee space and keyboard/display clearance. |
| About study | Rest-left/study-right layout, wood writing insert, real notebook/paper, bedding, photo and personal objects. Open book cradle with visible covers; square photograph and three equal clipped social prints. |
| Ladder bay | Dark seamless backing, legible alloy treads, small bronze rail clamps/end caps. Paired stowed maintenance spanners and two grab bars at each end, with intervening spaces empty. No restored angled lights, reels or decorative landing slabs. |
| Exterior access | Full matching upper/lower ladders, including the underside route. Match rail ends, rung spacing, mounting feet and supported tether eyes. Keep the rear shell quiet. |
| Docking assembly | Ivory pressure barrel, dark seal, satin flange, connected wheel spokes and seated handles. The small service cover uses one continuous pull; paired circular ports and a separate latch were rejected as face-like. |
| Service assembly | Fixed blue solar wings with supported booms/bearings and enclosed raceways; connected dish cradle/feed supports. Keep dark central fittings behind the reflector and bronze limited to small functional joints. |

Use the existing hardware-finish profiles rather than independently restyling
matching alloy/bronze assemblies. Emission, glass, lamps and natural materials
retain purposeful exceptions. Construction entry points are in
[the asset guide](ASSETS.md).

Overview destination tabs must remain distinct from utility controls. Preserve
readable room labels at compact widths, accessible full names when ellipsized,
and leader endpoints at each opening's top/bottom midpoint. Portrait return
callouts stay hidden/inert until arrival. Identity uses published content.

## Camera, doors and navigation

The camera moves around a stationary ship, including portrait roll, hover and
drag. The orbital environment shares the same physical viewpoint throughout
travel. Light/reflection transforms compensate for the former vessel roll: fixed
geometry does not imply all illumination is static or bakeable.

Portrait overview is nearly frontal with a gentle ceiling view, showing ceilings
rather than floors. The physical roof is screen-left and underside screen-right.
The approved asymmetric drag envelope favors the roof: yaw −0.40…+0.10 radians,
pitch ±0.32. Share the envelope across input, fitting, departure and coverage
checks. Overview→room travel moves directly inward while rolling; hull cropping
is intentional. Do not restore the rejected pullback/whole-hull clearance detour.
Fold displayed hover/drag/dolly into departure and preserve momentum when history
interrupts a flight.

Direct room URLs start at overview and use normal room entry. Drag release springs
back to hover without discarding velocity; preserve re-grab continuity and click
suppression. Touch/outside release returns to neutral. Navigation clears stale
pointer goals. Keep reading view, reduced motion, keyboard/focus and history
behavior.

Visible neighboring rooms are navigation targets. Preview the first connecting
door but retain the chosen final room, including nonadjacent routes. Solid chassis,
rounded corners and sky stay inert. Current-room walls around doors retain normal
room hover; invisible door/sign targets belong on visible faces, so oblique views
cannot select a room or ladder through the wall.

Hover/focus can open doors during travel. A click queues one destination, including
Home; later choices replace it. Start it immediately after final arrival, retain
it through intermediate waypoints/resize, and cancel it when selecting the arrival.
History and reading-view changes supersede the queue.

The ladder is a connector, not a queued destination. Clicking its visible bay from
a cabin crosses to the next cabin on the other deck (Case studies goes through
Projects to About; Contact through About to Projects). Preview the first door.
Bay selection is inert from overview and while physically inside the ladder;
inside exits retain their automatic sequencing and preview restriction.

Only one physical ladder door opens at a time. Seal the entrance, request the
exit while departing the center waypoint, approach its safe boundary while
opening, and cross only when clear. Ordinary cabin passages and ladder entry do
not wait. Close after camera passage, not final arrival. Keep opening near twice
the original speed, one six-blade iris between wall faces, dark frames and themed
perimeter-light feedback instead of cream border recoloring.

Each side of a shared partition follows its facing cabin's feedback independently.
Selectable screens/social cards ease from dim rest (0.65) to hover/focus (1.15),
including dim states in overview, neighboring views and travel. Object hover/rims
activate only in the settled current room. Unavailable objects and the monitor
of an already-open app keep their normal brightness. Archive cartridges are the
exception: whole-face 0.48→1.15 feedback, with no 3D box rim.

Source: `features/spacecraft/navigation/`, `spacecraft-runtime.ts`,
`features/portfolio/immersive-portfolio.tsx`.

## Displays and visitor applications

The owner chose **Soft graphite** folded artwork for populated Projects, Case
studies and Contact screens, with ivory ink and readable carbon fields beneath
small text. Empty displays retain plain dark standby art. The desktop fills the
physical glass behind the native app, so portrait crops and camera movement do
not expose bare backing. Preserve hover/focus timing and physical registration.

Projects' four monitors select All projects, Systems, Interfaces or Experiments.
Only categories with readable content are interactive. Empty monitors keep a
plain-carbon STANDBY face without category labels/icons, hotspots, tab stops or
feedback. The app does not repeat the physical category switcher; the standalone
reading collection has one and omits empty categories.

Case-study cartridges select Product engineering, Systems & reliability,
Research & experiments or Design & interfaces; the terminal selects All. Populated
categories pack above blank disabled cartridges in canonical order; their targets
move with them. Labels appear only on populated cartridges. An empty terminal is
STANDBY and inert. Reading view retains all five category controls, including
empty categories. Availability follows published content or authenticated drafts.

Collection→detail and Back stay within the same window, preserving category and
collection/detail scroll positions for that visit. X, Escape or exposed pressure
walls return to the room; furnishings block through-wall dismissal. Physical
monitor selection can change the camera anchor. Keep bounded hover/drag outside
native controls. Native application planes must remain registered inside the
actual glass with readable text and clearance from feedback rims. The projected
HTML surface deliberately has an invertible input transform; its former nested
CSS3D positioning caused a reported Safari offset that Chromium did not reproduce.

Projects use text-only collection cards; covers/media belong in details. Optional
resource actions share one row after the summary, before role/stack: **Open live
project**, then **View source code**, wrapping in that order. No absent-link
placeholders. Live has carbon fill/bronze outline and ivory hover/focus; Source is
secondary. Preserve owner-authored labels except the exact legacy “View source”
presentation alias. Detail Back appears once; physical monitor art omits counts.

`/projects` and `/projects/<slug>` retain deep links/history. Case studies uses
`/case-studies` and `/case-studies/<slug>` while keeping `/experience` compatibility
and persisted `experience` identity. Do not rename storage keys for presentation.
Old unclassified records are not guessed into categories. Owner records are not
bulk migrated. See [operations](OPERATIONS.md) for Markdown, media dependencies,
legacy data and package contracts.

Semantic Reading view is the readable alternative to projected displays: carbon
collection cards, ivory articles, bounded prose and heading-based contents (omit
when there are no headings). About keeps its paper character; Contact uses one
form surface. Visitor-facing sample/demo badges and notices are intentionally
absent, including private preview. Keep sample metadata, indexing protection and
studio controls. Nonfunctional actions must still say nothing was sent/booked.

## Content studio

Keep an ivory authoring surface with carbon framing, restrained bronze selection
and visible section boundaries. Identity/copy leads before portrait tooling.
Desktop uses a bounded collection rail; mobile uses the native Entry selector
with the same unsaved/busy guard. Save, private Preview and Publish are primary;
Export, Unpublish and Delete stay separate. Distinguish unsaved edits, saved
unpublished changes and published state truthfully. Action bars must not obscure
keyboard focus or validation. The notebook authoring proof keeps full-size paper
metrics with a named keyboard-scrollable region and sideways hint on narrow
screens. These editor styles do not restyle visitor applications.

## About notebook, photos and social cards

The notebook stays in its cradle. Opening it moves the camera to the complete
spread; there is no detached dialog. The left keeps mountain art and editable
identity, social links and Contact invitation. Real Markdown ink stays mounted
on the right in overview, rooms, travel and close reading, masked by opaque
scenery and moving leaves. Passive previews are excluded from keyboard/accessibility
navigation; only the active reader owns focus IDs. Closing preserves page/section
positions. Notebook feedback follows its rounded cloth cover without a second
rectangular HTML outline.

Journal entries are sections with automatic fixed-page pagination, not manually
authored pages or scrolling paper. Bottom arrows turn within the current section
and stop at its ends; hide them for one page. Each crossed leaf turns, including
section jumps within a bounded animation budget; reduced motion settles immediately.
Native ink follows the turning front; the reverse retains the left artwork.
Selection survives closing. Empty journals retain the biography introduction.

Colored section markers sit behind their section's first page: current/earlier
markers rest left, future markers right. Crossing a section carries its marker;
within-section turns do not. Use fixed top spacing and show at most six markers
with Earlier/More controls for additional groups. Only the exposed tab interacts;
its adhesive region stays hidden. Lettering remains plain dark, including selected
states. Muted paper and a restrained ivory hover wash replace the rejected strong
white highlight/underline; retain keyboard focus outlines. Moving tabs also mask
ink behind them.

**Dedicated mobile notebook design is deferred.** Portrait uses the same full
spread, page dimensions, typography and attached flags, scaled to fit. Do not
crop to one page, stretch paper or reflow mobile text. Reading view is the narrow
screen alternative. Studio preview uses the same measured ink area and pagination;
old page-break comments become paragraph breaks without corrupting code examples.

The square portrait is passive and has independent nondestructive room/Reading
view crops. Failed/absent images leave fallback art and never block scene entry.
Three equal clipped social cards independently select Left/Center/Right links;
empty slots are passive paper. Configured cards show an icon, owner name and a
strong small outward arrow for web destinations (none for email). No floating
tooltip or bronze hover rim; retain native focus and dim/bright feedback. Targets
work only in settled About outside reader mode, with normal native context menus,
HTTPS new tabs, mail handlers and drag-click suppression.

Custom SVG/PNG icons replace About presets with full proportions/colors; Contact
continues to use presets. SVG is converted locally in an isolated image context;
raw uploaded SVG is never served. Retired social-photo fields remain round-trippable
without becoming active dependencies. Publication and duplicate-slot guards are
specified in [operations](OPERATIONS.md#authoring-about-photos-and-social-cards).

## Contact behavior

The center monitor leads with **LET’S CONNECT** / **Start a conversation** beneath
COMMUNICATIONS. Keep its two independently selectable social displays; unavailable
links leave inert plain-dark STANDBY hardware. Landscape frames glass and keyboard;
portrait crops to a tall app inside the same glass. Native inputs never start a
drag. Keyboard clearance matters because HTML cannot be depth-clipped by WebGL keys.

Both views share an in-memory draft. **Schedule a call** comes first; initially
neither choice is selected. Clicking the selected choice returns to the chooser
without losing fields, including across view remounts after a prior success. Call
mode asks date/time/device zone, then name/company/email/subject/message. Message
mode uses the shared fields; only email/message are required. Failed sends retain
the draft. Contact's app has a persistent draggable/keyboard scrollbar on overflow;
Reading view uses page flow. Mobile viewport changes resize the inner scroll area
without altering the camera.

**Send a message** stores through `/api/contact` in the private inbox. Optional
name is adapted to the legacy backend and company/subject count toward the total
message limit. **Schedule a call** validates locally but sends and saves nothing;
no booking, availability or confirmation service exists. Keep explicit disclosure
and truthful acknowledgment. Without hydration, controls fail closed and the
configured email alternative remains available.

The email callout supports dismissal, copy and a mail draft. Clipboard fallbacks
must remain within the original user gesture and restore focus/selection. Physical
keyboard animation uses `code`, including held combinations; blur, visibility loss
and close clear it. On macOS Caps Lock reflects toggle status from keyboard events
rather than a timed pulse; other platforms retain physical down/up tracking.
Native shortcuts remain intact. Safari virtual-keyboard behavior and the reported
projected-app offset still require native-device confirmation; built-in Chromium
checks cannot resolve those historical limitations.

## Motion, Earth and sky

Ambient motion should be noticeable, deliberate and smooth, rather than barely
perceptible or jarring. The dish scans on two axes around its actual axle, moving
reflector/feed/stays together; solar wings and hull stay fixed. Overview fit covers
the full sweep. Contact meters and idle signal arcs vary visibly without claiming
a real transmission. Reduced motion holds resting appearances; hidden-page timing
uses the shared scene loop. Moving dish shadows/contact shading refresh when
necessary; material-only meters do not. These are authored visual costs.

Visible scenes animate continuously, including while the user interacts with
another app or window. Do not stop after inactivity or use loss of keyboard focus
as a visibility signal. Suspend rendering when the document is hidden or the scene
is outside the viewport; this includes minimized windows and background tabs as
reported by the browser. Browsers may also throttle rendering independently.
Resume from the held animation time without catch-up, including after a RAF gap
longer than one second with no visibility event. Preserve reduced-motion demand
rendering and the semantic reading view. Continuous visible motion is the accepted
appearance/work tradeoff; the historical inactivity comparison remains candidate 9.

During eligible active holds, cache the stationary spacecraft's color/depth while
keeping Earth, sky, the scanning dish, its affected receiving surfaces and Contact
effects live. Preserve moving shadows and contact shading. Camera, viewport,
lighting, material, geometry, hover and room changes reconstruct affected caches;
hiding releases the extra attachments. The phone/AO-disabled quality paths
use normal rendering, as do unsupported dish transforms. Small edge-coverage
differences are accepted; [candidate 10](performance-ledger.md) records the
measured scope, memory cost and appearance comparisons.

The approved Earth is **Europe at Night: 12° longitude, 48° latitude, −10° roll,
0.0045 rad/s**. Keep Earth in the physical world with the shared camera. The
portrait composition exception selects an anchor from viewport orientation, putting
the horizon bottom-left in vertical overview. That anchor stays fixed during room
navigation; Earth can leave the frame. Only an actual orientation change may ease
between anchors, preserving geographic phase and canonical registration. Never
cancel Earth's motion with animated navigation roll.

Production fetches only **earth-europe-loop.webp**, a **2560×1536 lossless regional
WebP** with the unchanged **1536×1536** European core at original 8K-source density
and an offline AI-assisted fictional coastal continuation. Its **112.5° / 436.332s**
loop scrolls UVs on a fixed sphere using one texture sample. Keep native detail,
naturally connected lights and cinematic atmosphere; avoid broad unlit blocks or
oversized glowing cities. The sphere's UV seam must stay outside the verified
camera envelope: rerun coverage after camera changes. Crop bounds include filtering
margins and are bounded evidence, not a universal optimum. Rebuild sources, exact
core checks and prompt/input hashes are documented in
[texture provenance](../public/textures/README.md) and
[current comparison evidence](evidence/earth-consistent-loop/README.md).

The angle/preset/day-model helper is retired. The authorized temporary **Tools →
Earth playback** offers a seekable timeline, Play/Pause/Restart and 1–60× speed
relative to 0.0045 rad/s. Seeking pauses; closing preserves phase and resumes 1×;
reload restores Europe. State is temporary, with no storage/backend writes. Only
Earth time changes; preserve readiness, sky/camera timing, reduced motion and
visibility rules. Manual seeking remains available under reduced motion.
Pausing Earth playback holds Earth while other ambient motion continues. Closing
the panel returns Earth to normal playback; visibility and reduced motion still apply.

Favor a gradual blue horizon with a restrained peak, not gray haze or glaring
electric blue. Stars surround the world without exposed edges during drag/roll,
with varied readable sizes and independent visible twinkle. Meteors are slower,
dimmer and less frequent, with occasional groups and quiet intervals. Procedural
cloud/day-map experiments are historical, not authorization to restore them.

## Tools and performance

Bottom-right **Tools** contains Rendering, Earth playback, Scene diagnostics and
Content studio beside Reading view. Opening the menu alone starts neither
instrumentation nor playback polling. Escape/outside/focus dismissal and return focus to Tools
must work; preserve the pointerdown/click intent guard against accidental reopen.

**Rendering** is a live appearance comparison panel, independent of diagnostics.
Expose shadows, shadow detail, pixel density, contact shading, Earth/sky and
stationary spacecraft caching. Changes apply without recording or a baseline,
keep the current camera, and persist across panel dismissal, room navigation and
Reading view within the visit. Reset defaults or reload restores the automatic
profile; do not save to storage or publish these preferences. Manual contact
shading may bypass the small-screen/device heuristic when WebGL supports it;
retain the drawing-buffer bound and cache eligibility restrictions. Show effective
settings and unavailable options. Rebuild affected color/depth, shadows and AO
after changes. Opening Rendering closes diagnostics and its temporary experiment;
opening another tool closes Rendering without reverting its choices. Reduced
motion and visibility scheduling still apply.

Diagnostics remain opt-in, device-agnostic and useful to nontechnical visitors
and technical investigators, with guided room/part breakdowns, advanced controls
and named exports. A URL parameter is an optional shortcut. The owner uses a
passively cooled MacBook Air M4; that does not authorize M4-only quality rules or
timing-based claims of thermal throttling.
Scene diagnostics observes the same continuous visible scheduling. Its explicit
one-frame pause and reduced motion still apply. Closing diagnostics restores the
current Rendering choices. Capture exports include those choices and their
effective settings, so later comparisons can identify quality changes.

[The performance index](performance-ledger.md) owns retained case-study candidates
and proposal status. [Diagnostics](performance-diagnostics.md) owns comparison
methods and interpretation; do not read historical evidence for routine edits.
