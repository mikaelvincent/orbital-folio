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
Interactive opt-in must still work at the available dimensions. Resizing or
zooming an active Interactive view must never switch it to Reading view.

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
Center doors horizontally and vertically in the _visible_ wall after curved
returns; center signs on doors. Window edges are flush and continuous without
protruding trim or cream slivers. Floors are continuous matte dark surfaces,
including the coves and front throat, without inset patches or extra rails.

The current arrangements matter more than the old numbered design stages:

| Area               | Preserve                                                                                                                                                                                                                                                                                                                                               |
| ------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Projects workshop  | Four removable monitors on a bench-supported instrument bridge; thin inset carbon worktop, grounded supports, clear working plane and one sheltered diffuser. No floating rear-wall braces.                                                                                                                                                            |
| Case-study archive | Four cartridges above the fixed 16:9 raked terminal in a shared floor-mounted dock. Formed cheeks and shoes meet the flat deck ahead of the rear cove. No fifth Field notes cartridge or lower runners.                                                                                                                                                |
| Contact console    | Thin rounded carbon console, conventional 82-key keyboard, fitted main/social glass, independently mounted social screens, outboard microphone and headset on an underslung hanger. Keep knee space and keyboard/display clearance.                                                                                                                    |
| About study        | Rest-left/study-right layout, wood writing insert, real notebook/paper, bedding, photo and personal objects. Open book cradle with visible covers; square photograph and three equal clipped social prints.                                                                                                                                            |
| Ladder bay         | Dark seamless backing, legible alloy treads, small bronze rail clamps/end caps. Paired stowed maintenance spanners and two grab bars at each end, with intervening spaces empty. The existing paired guarded worklights illuminate the bay; do not add another lamp object. Keep the ends free of angled fixtures, reels and decorative landing slabs. |
| Exterior access    | Full matching upper/lower ladders, including the underside route. Match rail ends, rung spacing, mounting feet and supported tether eyes. Keep the rear shell quiet.                                                                                                                                                                                   |
| Docking assembly   | Ivory pressure barrel, dark seal, satin flange, connected wheel spokes and seated handles. The small service cover uses one continuous pull; paired circular ports and a separate latch were rejected as face-like.                                                                                                                                    |
| Service assembly   | Fixed blue solar wings with supported booms/bearings and enclosed raceways; connected dish cradle/feed supports. Keep dark central fittings behind the reflector and bronze limited to small functional joints.                                                                                                                                        |

Use the existing hardware-finish profiles rather than independently restyling
matching alloy/bronze assemblies. Emission, glass, lamps and natural materials
retain purposeful exceptions. Construction entry points are in
[the asset guide](ASSETS.md).

Lighting retains the current materials' realistic furniture shadows with a
warm tint. All four cabins share the same profile. Each visible
swivel fixture combines a narrower main beam with a feathered, wider beam.
The two sources occupy exactly the same position and share one target, so they
read as a single lamp with one shadow direction. Each has its own shadow projection;
never share a shadow object between different beam widths. Keep ambient fill low
enough to preserve the furniture shadows. Bright cool exterior sunlight from
above-left and in front shapes the hull at the calibrated 100% brightness. Interior
materials admit only 5% by default, keeping exterior brightness from washing
out the rooms.
Each cabin has one offset swivel fixture aimed down and across its furnishings.
Its ceiling shoe, stem, housing and luminous face must
stay connected; preserve the assembly's proportions when changing room width and
re-aim both beams with their fixture. Opposite lamp placement gives the rooms
different shadow directions. The feathered wide beam reaches side walls and
furniture while keeping floors and deep recesses darker.
Contact shading preserves depth. Fill follows room/ladder brightness; shared
hatch faces receive one contribution at the brighter adjoining level, not a sum.
The ladder bay uses its two existing guarded rear worklights, with sources just
ahead of their diffuser faces and broad beams across the bay. Preserve all existing
fixture geometry and dark end recesses. Both lights follow their fixtures in each
asset layout, link to ladder surfaces and shared hatch reveals, and use the same
shadow-map reuse.

Each lamp casts furniture shadows. Material light linking admits a room's own
lamps, or the lamps from both neighbors on shared hatch faces. The cabin-facing
ladder partitions are interior receivers too; only exterior materials receive
unattenuated sun. Preserve authored caster/receiver exceptions, especially shader-masked
iris leaves. Reuse each light's shadow map while its relevant geometry is unchanged;
camera movement alone does not alter light-space depth. Dish-only movement
refreshes the sun and any lamp whose padded receiver-ray volume intersects the
dish's previous or current bounds. Iris motion, notebook turns/markers and key
presses are verified non-caster changes: keep their depth maps, but still refresh
AO and stationary pixels. Some of these surfaces receive shadows, including
rebatched notebook parts. Rebuild lamp receiver-ray bounds and check the dish's
accumulated motion since the last full refresh, so newly exposed receivers cannot
sample an old, previously irrelevant dish shadow. Unknown/caster geometry edits,
layout changes and explicit quality/filter invalidation still refresh every map.
Beam-width edits refresh only the four maps for that beam, rebuilding their
receiver bounds while retaining dish history for untouched maps.
Non-PCF filters retain the conservative policy. Immediate changes and final snaps
follow the same revision contract as animated motion.

The Shadows control must visibly change interiors. Default to **Low (512)**
detail and **4×** softness; both controls apply to the sun and all interior lamps.
Per-light shadow reuse works alongside the stationary pixel cache. Repair the
sun's dish region while all interior maps are allocated, clean and independently
cached. A dirty interior map requires a complete, unmasked shadow draw and
color-cache reconstruction before reuse resumes. Lighting-only edits retain
contact AO, including regional dish repairs during slider changes and inactive
brightness easing. Geometry and camera changes still refresh AO. Missing or
automatically updating interior maps retain the conservative full-render path.
This reuse also supports the AO-free phone path. Historical area-light timings do not
apply to this rig. Room hover/selection changes material brightness without a
second light dimmer. Inactive cabin materials default to 75% instead of half
brightness, reducing the overview-to-room jump. The inactive-room control can
raise this to 100% for steady brightness or lower it to 50% for stronger focus
feedback. Ladder feedback remains 50–100%. Overview entry and direct room-to-room
travel keep the chosen destination bright from departure through arrival. Routes through intermediate
cabins retain sequential lighting based on the camera's current room. Keep labels
and interactive objects readable, including on the phone's AO-free path.

Overview destination tabs must remain distinct from utility controls. Preserve
readable room labels at compact widths, accessible full names when ellipsized,
and leader endpoints at each opening's top/bottom midpoint. Portrait return
callouts stay hidden/inert until arrival. Identity uses published content.

## Camera, doors and navigation

The camera moves around a stationary ship, including portrait roll, hover and
drag. The orbital environment shares the same physical viewpoint throughout
travel. Sunlight and the reflection environment stay fixed in world space while
the camera rolls; cabin emitters remain attached to the vessel. Camera travel
must not rotate the illumination across cabin walls.

Portrait overview is nearly frontal with a gentle ceiling view, showing ceilings
rather than floors. The physical roof is screen-left and underside screen-right.
The approved asymmetric drag envelope favors the roof: yaw −0.40…+0.10 radians,
pitch ±0.32. Share the envelope across input, fitting, departure and coverage
checks. Overview→room travel moves directly inward while rolling; hull cropping
is intentional. Do not restore the rejected pullback/whole-hull clearance detour.
Fold displayed hover/drag/dolly into departure and preserve momentum when history
interrupts a flight.

Interactive zoom moves the physical camera toward the cursor or the midpoint
between the two touching fingers, with the existing lens and view orientation.
Each inward input aims the remaining forward movement from the displayed pose;
moving the cursor alone or continuing a gesture at the inward limit must not
re-aim completed zoom. Keyboard zoom uses the latest scene cursor position,
falling back to the center.
Wheel over the scene, trackpad/touch pinch, and Ctrl/Cmd +/− change camera distance;
Ctrl/Cmd 0 restores the normal framing. Zooming out stops at that view's authored
camera position, undoing both forward and sideways movement even after changing
aim. Bound inward movement before cabin furniture and content planes.
Navigation departs from the zoomed position and arrives at the new view's normal
framing; resizing preserves zoom. Ordinary wheel and one-finger content scrolling
remain native, as do browser shortcuts in editable fields, tools and Reading view.
Reduced motion applies requested zoom immediately.

Direct room URLs start at overview and use normal room entry. Drag release springs
back to hover without discarding velocity; preserve re-grab continuity and click
suppression. Touch/outside release returns to neutral. Navigation clears stale
pointer goals. Keep reading view, reduced motion, keyboard/focus and history
behavior.

Visitor navigation lists Projects before Case studies in Interactive and Reading
views. The Interactive navigation's leading button steps up one level: project or
case-study detail → its collection → its room → overview. Notebook content returns
to About; privacy returns to the Contact form. Use a left chevron for content and
room returns, and the home icon when the target is overview. Browser history and
Escape retain their existing behavior.

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
STANDBY and inert. Reading view also hides empty categories; an unavailable
category selection falls back to All. Availability follows published content or
authenticated drafts. The terminal footer shares the Studio `case` / `cases`
count labels with both collection views. Its number and noun form one centered
group, with uppercase applied only to this physical screen. Studio values and
the collection labels retain their authored casing. The populated terminal has
no tagline.

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
secondary. Preserve owner-authored labels exactly, including “View source”. Detail Back appears once; physical monitor art omits counts.

`/projects` and `/projects/<slug>` retain deep links/history. Case studies uses
`/case-studies` and `/case-studies/<slug>` while keeping `/experience` compatibility
and persisted `experience` identity. Do not rename storage keys for presentation.
Old unclassified records are not guessed into categories. Owner records are not
bulk migrated. See [operations](OPERATIONS.md) for Markdown, media dependencies,
legacy data and package contracts.

Text is not selectable anywhere in Interactive mode, including the notebook and
floating tools. Keep native selection inside editable fields and throughout
Reading view and the studio. Do not show a floating availability message or
status dot.

Interactive loading covers the entire viewport, including identity, navigation,
tools and preview banner, from the initial page render until the scene is ready.
Keep the Reading view escape inside the loader during both startup phases.
Reading view requests render directly without a spacecraft loader, including
before hydration on a refresh or direct entry. The loader escape and automatic
reading fallbacks persist `view=reading` so refresh retains that choice.

Semantic Reading view is predominantly dark: a deep carbon canvas, carbon panels,
ivory text and restrained bronze details from the spacecraft palette, including
dark article and notebook surfaces. Its four-room overview, collection side
indexes, bounded articles and profile/console layouts have their own composition;
reading styles stay scoped to `.is-readable` and never alter Interactive view.
The overview cards show the collection heading above the larger room/navigation
name. It shares collection, story and contact renderers with the interactive
applications and uses their existing editable headings and content. It adds no
exclusive introductions, invitations, stories or social links. About opens with
a full-width introduction grouping the Studio name, assigned social links and
portrait without a biography paragraph, followed by one numbered chapter grid
using authored titles and optional subtitles. The grid becomes a single column
on narrow screens; the overview has no separate sidebar or duplicate contents
list. Section bodies appear only after selecting a section, which adds the sticky
desktop index or, on narrow screens, a sticky collapsible picker above the
full-width article. Desktop navigation has bounded overflow for short screens.
Articles retain the opening
biography in the first section, a link back to About and adjacent-section links
using their authored titles. All text, portraits and social links come from
Content Studio; do not add reading-only copy or synthesized excerpts. Contact
places its two assigned links before the shared form.
Visitor-facing sample/demo badges and notices are intentionally absent, including private
preview. Sample flags control search metadata only; seeded content uses the same
presentation and visitor functionality as owner-authored content. Keep indexing
protection and studio controls. Nonfunctional actions must still say nothing was
sent/booked.

## Content studio

Use the interactive palette: ivory authoring surfaces, carbon navigation and
bronze accents. General contains shared identity, navigation/messages, metadata
and privacy. Room groups use their editable names and contain their entries and
page/interface text. About and Contact have separate social-link editors and
records; choosing the same platform never couples their destinations. Media is
managed inside each entry, portrait or icon editor, with no global media library.
Management contains the inbox, access and backups. Avoid numbered room names,
metaphorical editor labels and a separate Content dropdown.

Site copy has one authoritative field per setting. Optional `site.interfaceText`
overrides cover meaningful visitor content and interface messages. Developer
tools and decorative labels (equipment markings, keyboard legends, book artwork,
cartridge numbers) use fixed text. Keep the tools available; hiding them from
visitors is a separate change. The generated catalog defines active overrides;
remove unused field definitions and overrides rather than hiding their controls.
Explicit saves and imports discard unsupported fields and overrides; existing
stored snapshots are not rewritten. Legacy story headings remain supported for
structured stories; Markdown entries own their headings in the body.
Every page and entry has optional search/social title and description overrides,
with the same resolver used for public metadata and Studio's draft text preview.
Blank fields follow editable page content: collection introductions, About's
biography, Contact's monitor subtitle, the privacy policy or the shared description
and role. Entries prefer their own summary or subtitle before the room description.
Existing About/Contact introduction fields are the editable metadata overrides;
keep saved values and draft/published snapshots intact. New portfolios start with
blank site metadata overrides, and blank overview titles use the owner name and
role. Favicon initials are editable under Identity. Keep template placeholders
intact and regenerate
`lib/content/interface-text-catalog.ts` with `node scripts/sync-interface-text.mjs`
after changing editable render-site messages. Browser-owned media/date controls
retain native behavior and localization.

The signed-out entrance explains that the Studio is for authorized owners while
visitors can return to the public portfolio without signing in. Do not address
every visitor as the owner. Authentication and owner authorization remain separate.

Desktop uses a collection rail; narrow layouts use an Entry selector and collapsible
section navigation. Save, private Preview and Publish are separate actions;
Export, Unpublish and Delete stay secondary. Switching among site sections retains
unsaved edits; changing records and leaving the editor use the same unsaved/busy
guard. Distinguish unsaved edits, saved unpublished changes and published state.
Action bars must not obscure keyboard focus or validation. The notebook preview
keeps full-size paper metrics with a named keyboard-scrollable region and sideways
hint on narrow screens. Editor styles do not restyle visitor applications.

## About notebook, photos and social cards

The notebook stays in its cradle. Opening it moves the camera to the complete
spread; there is no detached dialog. Authored Markdown flows left to right across
both facing pages, without decorative filler. Notebook ink, headers, footers and
section markers use the bundled Edu NSW ACT Foundation handwriting face. Body
copy uses 18px with 1.55 line spacing, with 16px tables; title, heading, marker and
footer sizes stay distinct. Studio paper and cached room previews use the same
font, including an embedded copy in SVG captures so their line wrapping matches
the native ink.
A shallow continuous paper fold covers the binding through the full page height.
Room, overview and travel previews use one cached pair of mipmapped page textures
on the existing opaque paper. Capture the same measured Markdown layout when the
spread, content, loaded images or fonts change; camera motion does not regenerate
it. Keep only the current spread (512 × 596 per page, about 3.1 MiB including
mipmaps).
Close reading and moving leaves use native HTML for sharp text and
working links. Unsupported media, failed/empty captures or content exceeding the
capture budget keep native HTML. Passive previews are excluded from keyboard/
accessibility navigation; only the active reader owns focus IDs. The X at the
notebook's top right stays visible as passive ink in room/overview/travel previews
and is included in the same page-texture capture. In close reading it returns to
room view, with a subtle warm hover wash following the X strokes; existing
outside-click and Escape dismissal remain available. Closing preserves page/section
positions. Notebook feedback follows its rounded cloth cover without a second
rectangular HTML outline. The X and section markers have no hover tooltips;
retain their accessible labels and hover/focus feedback.

For native ink, reuse the notebook's stationary occluder polygons while the dish
moves; keep the dish's separate contribution live so it can still hide ink from any angle.
Camera, paper, doors and other geometry changes refresh the relevant masks.
Cached ink uses normal WebGL depth and skips HTML projection/occlusion work.
Native labels and reader controls reuse settled projections until their view,
layout, interaction, animation or content changes, including live collection edits.

Journal entries are sections with automatic fixed-page pagination and optional
authored page breaks that move the following content to the next page. Repeated
or trailing breaks never add empty pages; a leading break only advances when the
section introduction already occupies the first page. Keep the header rule on
every page. Show the current section title only on left pages after the section's
first page, aligned left; the opening page retains its main title in the body.
Bottom arrows turn within the current section and stop at its ends; hide them for
a single spread. Keep an odd final right page blank instead of repeating text,
exclude it from the section total and hide its entire pagination footer. Center
footer numbers within each page, keeping the arrows at the outer edges. Show the
page number and section total on populated pages without the word “Page” (left
`1 of 12`, right `2 of 12`). Settled and turning pages share the same footer format.
Retain the full screen-reader announcement. Each crossed leaf turns,
including section jumps within a bounded animation budget; reduced motion settles
immediately.
Native ink follows both faces: the earlier spread’s right page on the front and
the next spread’s left page on the reverse. Keep the stationary outer pages visible
beneath the turn, suppress input on hidden ink, and restore keyboard focus after
the leaf settles. Selection survives closing. Empty journals retain the biography
introduction.

Each published notebook section has an `/about/<slug>` URL. Opening the notebook
or choosing a marker updates browser history; reload and direct entry restore
that section in the mounted notebook. On initial load, the requested section and
spread are already open; startup and pagination measurements never flip through
earlier pages. Subsequent visitor navigation keeps the normal page turns.
Page turns retain the spread with `?page=N`,
using its first printed page number (1, 3, 5…). Back/Forward restores both section
and spread. Reading view uses the same section URLs with `?view=reading`; private
studio previews resolve draft sections by ID or slug without exposing them on
public routes. `/about` remains the room/Reading contents view, and legacy
`/about?open=1` links still open the notebook.

Colored section markers sit behind their section's first page: current/earlier
markers rest left, future markers right. Crossing a section carries its marker;
within-section turns do not. Use fixed top spacing and show at most six markers
with Earlier/More controls for additional groups. Only the exposed tab interacts;
its adhesive region stays hidden. Lettering remains plain dark, including selected
states. Two-line labels reserve enough line height for handwritten descenders
without shrinking or clipping the last line. Muted paper and a restrained ivory
hover wash replace the rejected strong white highlight/underline; retain keyboard
focus outlines. Moving tabs also mask ink behind them.

**Dedicated mobile notebook design is deferred.** Choose type sizes for desktop
reading rather than enlarging the spread's text to compensate for small screens.
Portrait uses the same full
spread, page dimensions, typography and attached flags, scaled to fit. Do not
crop to one page, stretch paper or reflow mobile text. Reading view is the narrow
screen alternative. Studio preview uses the same measured ink area, pagination
and authored breaks; see [notebook authoring](OPERATIONS.md#authoring-notebook-sections).

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

Both views use the compact “OPEN A CONVERSATION” / “Let’s connect.” form header
and share an in-memory draft. The message form opens immediately with no contact
method chooser or call scheduling. It asks name/company/email/subject/message;
name, email and message are required. Name/company/subject are capped at 50/50/100
characters; message has its own 5,000-character limit. Counters appear only at 80%
of each field's limit, including in the expanded message editor. Email syntax is
checked before submission and again at the API, without sending a verification
email or checking delivery.
Failed sends retain the draft. Contact's app has a persistent draggable/keyboard
scrollbar on overflow; Reading view uses page flow. Mobile viewport changes resize
the inner scroll area without altering the camera.

Privacy opens inside the Contact monitor in Interactive mode and in page flow in
Reading view. Both provide Back to the contact form and preserve its draft;
browser history and switching views retain the selected page.

The message field uses a lower-right expand icon in place of the native resize
grip. Hover and keyboard focus highlight the icon strokes without a filled box.
It opens a modal editor with the form dimly visible behind it.
Reading view uses the viewport; Interactive mode confines the editor and its
backdrop to the virtual monitor. Expansion shares the same draft and character
limit. Done, Collapse, backdrop dismissal or Escape retains edits; Escape closes
the editor before room navigation, and focus returns to the compact message field.

**Send message** stores through `/api/contact` in the private inbox. The API
validates name, company, subject and message against their independent limits,
then combines company/subject and message in the existing inbox format. Success
acknowledges that the message was saved. Without hydration, controls fail closed
and the configured email alternative remains available.

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
brightness/color-only changes recapture color without discarding valid shadow
maps, contact shading or the dish's influence bounds. Regional shadow repair
must retain overlapping static casters as well as the dish; color-pass exclusions
must be restored before any shadow generation.
Hiding releases the extra attachments. Supported phone and AO-disabled paths can
reuse pixels with shadows on; Automatic contact shading remains off on phones.
Unsupported dish transforms retain normal rendering. Small edge-coverage
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
Expose independent exterior, room and ladder brightness sliders, shared room
warmth, main/wide beam strengths and widths, ambient fill, inactive room brightness
and exterior spill indoors, plus shadows, shadow detail, shadow softness, pixel
density, contact shading, Earth/sky
and stationary spacecraft caching. Exterior, room, ladder and both beam-strength
controls span 0–500% in 5% steps and default to **100% of their calibrated baseline**.
The owner's chosen appearance defines that baseline; changing a default must
preserve the actual light, ambient fill and diffuser emission at the chosen values.
`LIGHTING_BASELINE` stores exterior 0.25, rooms 1.25, ladder 1.5, main 0.5 and
wide 0.8 against the fixed `VESSEL_LIGHTING` references. At default controls, sun
intensity is 0.8, each main beam is 8.59375, each wide beam is 13.75, and each
ladder worklight is 6.5625. Room brightness multiplies both cabin beams.
Diagnostic captures include a calibration signature so comparisons flag a changed
baseline even when the normalized control values match.

Cabin and ladder diffuser base emissions remain 1.375 and 2.125. Their calibrated
multipliers are 1.3 and 1.5 respectively, before room feedback dimming. Cabin
emission follows the weighted sum of the main/wide controls, using the fixed 1.25
beam reference; both beams off extinguishes the diffuser. Ambient fill follows
calibrated room/ladder levels, and shared hatch faces use the brighter adjoining
level. A 100% reset must reproduce the chosen appearance in all these terms,
without changing screens or status indicators. These settings apply on first
load and reset. Exterior controls sunlight; room and ladder controls also dim
fixture faces. Warmth spans neutral white to amber, with a 60% default shared by
the interior lamps, their diffusers and fill. Main beam width spans 30–170° in
2° steps, defaulting to 90°; the wide beam spans 70–170°, defaulting to 148°.
Ambient fill spans 0–100% in 5% steps, defaulting to 5%; inactive room brightness
spans 50–100% in 5% steps, defaulting to 75%; sunlight spill spans 0–100%
in 1% steps, defaulting to 5%. Brightness, beam strengths, warmth, fill, spill and
inactive brightness recapture color while reusing valid shadows and contact AO.
Beam-width changes rebuild the affected beam's shadow projections and receiver
bounds before the next draw, retaining other maps and geometry-dependent AO.
Full stationary-pixel reuse supports all viewport widths with shadows enabled;
contact shading is optional. Per-light shadow reuse also works on phones.
Camera/geometry changes and animated Earth/sky still need fresh rendering.

Shadow softness adjusts the existing shadow filter independently of map resolution,
from 0–4× in 0.25 steps. The authored
default is Low (512) with 4× softness. Automatic remains selectable and uses
1024-square maps at all widths (bounded by device support); Low/Medium/High are
512/1024/2048 for every shadow light.
Changes apply without recording or a baseline,
keep the current camera, and persist across panel dismissal, room navigation and
Reading view within the visit. Reset defaults or reload restores the authored
profile; do not save to storage or publish these preferences. Manual contact
shading may bypass the small-screen/device heuristic when WebGL supports it;
retain the drawing-buffer bound and cache eligibility restrictions. Show effective
settings and unavailable options. Rebuild affected color/depth, shadows and AO
after quality changes; brightness changes only refresh color. Opening Rendering
closes diagnostics and its temporary experiment; opening another tool closes
Rendering without reverting its choices. Reduced
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
