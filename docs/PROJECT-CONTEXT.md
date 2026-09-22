# Orbital Folio — current project context

Decision snapshot: 22 September 2026. Complements the root [AGENTS.md](../AGENTS.md)
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
| About photos and social cards | `lib/content/about-photos.ts`, `about-photo-publication.ts`, `social-links.ts`; `features/spacecraft/rooms/about-photo-print.ts`; `features/studio/about-photo-fields.tsx`, `social-link-fields.tsx`, `social-icon-upload.ts`; `features/portfolio/about-personal-content.tsx` |
| Docking collar, service bus and solar/communications assembly | `features/spacecraft/equipment/docking-service-assemblies.ts` |
| Exterior/ladder fittings | `features/spacecraft/equipment/exterior-service-equipment.ts`, `features/spacecraft/equipment/docking-shoulder-equipment.ts`, `features/spacecraft/equipment/ladder-endcap-equipment.ts`, `features/spacecraft/equipment/ladder-service-spine.ts` |
| Earth/atmosphere/sky | `features/orbit/orbital-environment.ts`, `features/orbit/earth-satellite.ts`, `features/orbit/earth-view-transform.ts`; `scripts/build-regional-earth.mjs` authors the regional atlas offline |
| Temporary Earth playback inspection | `features/orbit/earth-playback.ts`, `earth-playback-controls.tsx`, `earth-playback-controls.css`; the orbital environment owns Earth-only playback state |
| Bottom scene tools menu | `features/portfolio/scene-tools-menu.tsx`, `scene-tools-menu.css`; Earth playback, Scene diagnostics and Content studio beside Reading view |
| Diagnostics/capture/attribution | `features/diagnostics/performance-panel.ts`, `features/diagnostics/performance-review.ts`, `features/diagnostics/scene-performance.ts`, `features/diagnostics/spacecraft-performance.ts` |
| Public/semantic readers | `features/portfolio/public-shell.tsx`, `features/portfolio/room-views.tsx`, `features/portfolio/about-notebook.tsx`; `features/spacecraft/navigation/about-notebook.ts` and `rooms/about-notebook-layout.ts` register the mounted paper and flags |
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
- Case studies has four recorder cartridges: Product engineering, Systems &
  reliability, Research & experiments, and Design & interfaces. The owner removed
  the bottom Field notes cartridge and its runners. The remaining rows retain
  their upper alignment, making room below for taller **16:9** terminal glass
  (**1.76 × 0.99** local units before the existing 0.85 rig scale). Its narrower
  casing, handles, paired floor supports and centered screen artwork fit the new
  proportions. The raked screen and shared room camera remain. This new request
  supersedes the earlier restoration of the wide 2.37 × 0.49 display; it does not
  restore the earlier rejected implementation. See the
  [four-option room evidence](evidence/case-study-four-options/README.md).

Current evidence: [symmetric access refinement](evidence/spacecraft-access-symmetry/README.md).
The earlier [access redesign](evidence/spacecraft-access-design/README.md) preserves
rejected iterations; it does not authorize restoring those older objects.

## Interaction contract

The real camera moves around a fixed spacecraft and shares its viewpoint with
the orbital background. Removing the background should leave the approved ship
view essentially unchanged. The annotation-only virtual frame preserves portrait
ordering. Light/reflection transforms compensate for the old vessel roll; a
stationary hull therefore does not imply all lighting is invariant or bakeable.

Portrait overview uses the owner's nearly frontal reference orientation:
`[+0.10, +0.08, 1]` in the virtual frame, with a slight ceiling view. The owner
clarified that “behind the top ceiling” means the **outer left hull** in this
orientation, and “behind the bottom floor” means the **outer right hull**.
Portrait drag therefore uses yaw −0.40…+0.10 radians and pitch ±0.32: more access
to the left-side roof, modest access to the right-side underside. The original
+0.03 right limit felt unresponsive because hover alone could exhaust it; the
owner requested slightly more travel. A smooth asymmetric response retains neutral and blends velocity through the center.
The same limits drive input, containment and departure; portrait fit samples are
denser to cover the larger envelope. Landscape direction, limits and fit density
remain unchanged. See [reference/drag evidence](evidence/portrait-roof-biased-overview/README.md)
and the [right-drag follow-up](evidence/portrait-right-drag/README.md).
The orientation boundary already changes overview roll.
Overview↔room travel interpolates physical world eye and focus directly, with one
shared ease and no whole-vessel clearance detour. Entry advances inward while
rolling; cropping the hull during travel is intentional. The displayed hover,
drag and dolly are folded into departure so returning them to neutral cannot
cause a small initial retreat. History interruptions preserve physical momentum.
Ordinary cabin springs, room fits, lens and door interlocks remain unchanged.
See [direct inward flight evidence](evidence/portrait-inward-flight/README.md).
The previous clearance curve in ledger entry 31 and its evidence remains historical; the owner
rejected its residual pullback despite its earlier positive critic score.

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

The owner clarified on 22 September 2026 that the dim resting state is desired.
Selectable screens in Projects, Case studies and Contact, the four archive
cartridges, and configured About social cards stay at a **0.65** multiplier until hovered or keyboard-focused,
then ease toward **1.15** and return to **0.65** on departure. Do not restore regular
brightness merely because hover ended or idle time elapsed. The idle multiplier
also applies in overview, neighboring-room previews and throughout camera travel:
input becoming available at arrival must not suddenly dim the screens. Room
preview/transit lighting still applies independently. Object hover and its rim
are enabled only in the settled current room. Unavailable controls and an
already-open application's own monitor retain their normal brightness. This
supersedes the earlier removal of the dim resting state and its travel exception.
The owner explicitly deferred any redesign of
the cartridge highlight box: preserve its existing rim, color and dimensions.

## Projects library and authoring

The four workshop monitors now open one library application, initialized to
All projects, Systems, Interfaces or Experiments when that category has readable
projects. They retain their physical
enclosures and inset amber hover/focus rims. The camera approaches the selected
glass; landscape shows a two-column collection and portrait crops to a tall,
readable application region inside the same monitor. Choose the category at the
physical monitor; the application does not repeat the category switcher. Project
details and Back inside that window do not initiate camera travel. Selecting another
visible physical monitor changes the camera anchor. Bounded hover/drag and spring
return remain available outside the native app controls.

An X or the exposed Projects pressure wall returns to the room. Workshop
furnishings block through-wall dismissal. Back restores the collection category
and scroll position; each detail also retains its scroll position during that
visit. A persistent scrollbar supplements ordinary native scrolling. Public
`/projects`, `/projects?open=1` and `/projects/<slug>` URLs, browser history, private
previews and semantic reading views remain available. The superseded Projects
clipboard and old gallery-page transport UI are removed. About uses its mounted
notebook; Case studies uses its fixed archive terminal.

The HTML application stays within the glass and clear of its inset feedback rim,
including close portrait and bounded hover/drag views. Its plane is registered to
the real display surface; shrinking physical margins must not shrink readable
text. The standalone reading collection retains category controls because it
does not have the room's physical monitors, but omits empty categories.

Populated room-view category monitors use the subdued folded desktop wallpaper
behind their title and icon. An empty category retains its installed monitor
with the plain navy gradient and a small STANDBY label. It has no category
name/icon, interaction hotspot, tab stop, hover feedback or application activation.
This swaps the earlier wallpaper-on-standby assignment while retaining the
intentional passive label; do not restore the rejected black face.
Availability follows the current published or private-preview project collection;
adding readable content restores that category's display and controls. This
supersedes the earlier selectable empty-category application. The overall Projects
reading route can still explain that no projects are available when the whole
collection is empty.

The desktop uses a restrained blue folded wallpaper on the **entire physical
monitor glass**, behind the opaque application window. Contact shares this
wallpaper. It is not restricted to the HTML app rectangle, so portrait framing
and camera movement cannot reveal bare screen backing. Idle graphics and desktop
are mutually exclusive; closing restores the idle display.

The Projects desktop uses 2px padding, without an exterior window shadow or the
dark backing behind its scrollbar. Landscape rendering leaves a total 0.02-unit
inset within the physical glass (0.01 per edge); portrait retains its 0.06-unit
base inset and existing narrow crop. Camera fitting uses a separate `framing`
rectangle with the original 0.06-unit inset in both orientations, so enlarging
the window does not change the camera destination or physical monitor. The selected
monitor's amber rim is hidden while its application is open; other monitors retain
hover feedback.
Contact has its earlier 14px desktop padding again, replacing the later 6px
wide-screen override.

Project collection cards are text-only, with no repeated footer action; detail
covers and story media remain.
The collection title bar shows its category name and small category icon, with
an X at right and no bottom status bar. Detail has a left-aligned, borderless
**Back to projects** action and the X at right. Back uses the same hover/focus
treatment as X and restores the originating collection and scroll position.
There is no repeated Back action below the story. The detail status bar shows
only the original-case project title. Counts remain in the application collection,
but are removed from all four physical Projects room monitor graphics.

Optional resource links share one row below the summary in both views, before
role/stack metadata: **Open live project** first, then **View source code**. They
wrap in that order on narrow screens. Live keeps its dark amber-tinted outline;
hover and keyboard focus produce a stronger amber fill, and pressing darkens it
without movement. Source remains a secondary blue-gray outlined control. The
former title-side Live placement is superseded. Both use 44px minimum height,
6px corners and external-link cues. Source has a code icon and defaults to **View source code**;
the exact former **View source** label is expanded at presentation only, while
other configured copy is preserved. Absent links leave no placeholder or empty
row. The solid amber resting state and text-like source underline are superseded.

Native application/reader HTML uses one viewport-relative projective transform
in `features/spacecraft/projected-surface.ts`, derived from the same camera and
physical plane as WebGL. It has an explicit top-left origin and invertible depth
mapping for native input. Only scene hotspots retain the nested CSS3D renderer.
This removes the native window's dependence on its nested camera wrappers and
percentage centering. The reported Safari desktop offset was not reproduced in
Chromium, so Safari confirmation remains outstanding. See the
[projection and desktop follow-up](evidence/projects-screen-projection/README.md).

Studio is the primary authoring surface: title, summary and explicit multi-select
categories, optional cover/role/stack/links, followed by a flexible Markdown
story. The optional section starter is guidance, not a required essay structure.
Older section-based projects remain readable/editable; their custom category text
is retained but is not guessed into the new filters. Until an owner assigns new
categories they appear in All projects. Owner records are not bulk-migrated.
Project periods are no longer authored or displayed; new saves and exports omit
them. Older v1 ZIP packages may still contain `period`, which imports accept and
discard. Experience/Case studies periods remain supported.
Managed images, videos, posters and captions are reusable; uploads insert local
references into the story. Preview offers portrait/landscape content widths and
the existing complete private scene preview. ZIP import produces a new private
draft and media records; export uses the saved draft. Explicit media publication
precedes project publication. JSON whole-content portability remains separate.
See [operations](OPERATIONS.md#authoring-projects) for limits and package syntax,
and [implementation evidence](evidence/projects-library/README.md) for checks.

The explicit local demo population supplies nine stories: All projects (9),
Systems (6), Interfaces (3) and Experiments (0). The Experiments monitor remains
installed in plain navy standby and unavailable, demonstrating the dormant category state.
The stories include varied Markdown, still covers, a native MP4/captions and a
finite animated GIF. The tool only updates exact known untouched
sample fingerprints; `sample: true` alone is not permission to overwrite an
owner's edits. It preserves divergent drafts, publication boundaries and other
content. Fresh seeds contain the story/category text; managed media is populated
explicitly through the loopback-only tool. GIF is accepted by the normal image
upload/package paths; executable embeds remain unsupported. Covers are now used
in detail only. Shared Markdown restores ordered, unordered and nested markers
after the global reset; task lists use one aligned checkbox per item, including
tight nested task lists. Relay, Fieldnotes and Meter have browsable mixed nested
examples under Design principles; exact-known prior sample fingerprints can be
updated by the guarded local tool, without overwriting edited samples.

Relay is the ongoing presentation reference: it exercises supported heading
levels, emphasis, strikethrough, quotations, inline and fenced code, tables,
ordered/unordered/mixed nested task lists, non-default numbering, separators,
line breaks, links, still images, native video with poster/captions, and a finite
GIF. Its optional repository and live links point to BullMQ's public source and
documentation as explicitly attributed queue-design references, not a Relay
deployment or owner-authored code. Extend this known sample as supported features
change without overwriting owner edits. Fresh seeds omit managed media references
until the explicit population step supplies those assets. See the
[demo/fit follow-up](evidence/projects-demo-fit/README.md) and current
[monitor/list finishing evidence](evidence/monitor-finishing/README.md). The earlier
[screen refinement evidence](evidence/project-screen-refinement/README.md) records
the reduced wallpaper margin, resource examples and the now-superseded selectable
empty-category trial. The current [category/action evidence](evidence/project-category-actions/README.md)
records the first dormant-monitor treatment and narrow reading fit. The earlier
[standby/resource refinement](evidence/project-standby-resources/README.md) replaces
its black face and solid resting button with intentional passive art and clearer
resource action states. The subsequent [screen/resource hierarchy correction](evidence/project-screen-hierarchy/README.md)
assigns wallpaper to populated monitors and groups the resource actions below the introduction.

## Case studies archive and authoring

Approved on 22 September 2026: the four recorder cartridges select Product
engineering, Systems & reliability, Research & experiments, or Design &
interfaces; the terminal selects All case studies. Every option approaches the
same existing 16:9 raked monitor. The owner's latest correction restores
content-based availability: only categories with published stories are selectable;
All is selectable only when the archive has stories. Empty or unrecognized
categories keep their installed cartridges with dark graphite faces and pale
printed labels, without interaction targets or hover feedback. Populated
cartridges retain cream faces and the existing inset amber rim. An empty terminal
uses plain navy with STANDBY and is inert. This supersedes the briefly approved
always-interactive empty-category behavior. Availability updates when content
changes. The shelf crossmember and backplane end directly beneath cartridge four;
its floor uprights remain, with cable attachments raised to the shorter backplane.
Published content drives the visitor collection;
private preview uses drafts. No category is guessed from a title or older record.

The monitor displays a numbered archive list with summaries and optional
organization/period metadata. A story opens in the same window without camera
travel. Back to case studies restores its category and scroll position, with
separate retained scroll for each story during the visit. X, Escape or an
exposed pressure-wall click returns to the room; hardware blocks through-wall
dismissal. Responsive framing approaches the fixed glass and crops its width in
portrait, keeping text readable. The former Case studies deployable reader and
legacy chapter pager are removed. About subsequently moved to its mounted notebook.

Public `/case-studies/<slug>` URLs, category query state, browser history,
`/experience` compatibility and authenticated preview by ID/slug share the
existing `experience` storage identity. Reading view offers all five category
controls, including empty categories, and the same story renderer. Details use record titles/summaries for
metadata and appear in the sitemap only when published.

Content studio labels this collection Case studies and shares Projects' Markdown
editor, safe preview and managed image/video insertion. Categories are explicit
and may overlap. Cover, subtitle, role, organization, period and SEO fields are
optional. Old context/decisions/impact sections provide a fallback story until an
owner authors Markdown; existing records are not rewritten or recategorized.
Save, private preview and Publish remain separate. Publishing checks all media
and poster/caption dependencies, and live case-study references prevent deleting
or unpublishing their assets. Project ZIP packaging remains project-specific;
whole-content JSON backups include case studies as before. See
[authoring instructions](OPERATIONS.md#authoring-case-studies) and
[verification evidence](evidence/case-study-flow/README.md).

The guarded local case-study demo tool supplies **All 6, Product engineering 3,
Systems & reliability 2, Design & interfaces 1, Research & experiments 0**.
Research demonstrates the disabled cartridge. **Building the whole product** is
the complete Markdown/media reference, with mixed nested lists and tasks,
headings, code, tables, quotations, links, still images, video/poster/captions and
a finite GIF. The other studies vary in length. These are editable fictional
concepts; the tool preserves owner edits and divergent drafts, reuses only
verified public media, and does not change Relay or other collections. Fresh
seeds include the text; explicit population supplies managed media. See
[current standby/demo evidence](evidence/archive-standby-demo/README.md).

## About mounted notebook

The September 22 implementation approval replaces the old deployable About
reader with native content on the existing notebook in its desk cradle. Opening
**Read notebook** moves the camera to the stationary complete spread, like the
other rooms' screen applications. The original left-page mountain artwork stays,
with the current editable owner name; the right physical paper holds the reader.
There is no detached dialog, backdrop or replacement notebook.
The notebook and its cradle are centered on the table, and the close camera centers
the spread. Like the other room controls, the notebook dims at rest in the room
and brightens on hover or keyboard focus; the open reader keeps normal brightness.
Its physical hover/focus rim follows the rounded cloth cover, behind its retaining
clips, without a second rectangular HTML outline.

Published Journal entries are **sections**, each with its own colored paper marker.
The marker count follows the collection, up to six visible at once; separate
Earlier/More sections controls expose additional groups without discarding records.
Markers start near the top with a fixed, even gap regardless of section count;
they do not stretch to justify the full height of the paper.
Earlier section markers travel with their crossed leaves to the left, where their
reverse labels remain readable. Both paper stacks align with the reading leaves,
which overlap each flag's adhesive region by 30 logical pixels. The fixed left
artwork remains visible above the resting stack.
Room-view flags and native reader labels share numbered titles, typography and
placement. Only each flag's exposed 125px region is interactive or highlighted;
its 30px adhesive overlap remains covered by the page.

The bottom arrows turn **pages within the current section** and stop at its ends.
Pages never scroll. Each section is one continuous Markdown body that flows
automatically into fixed pages. Pagination is hidden for a one-page section.
Each crossed physical leaf turns, including multi-section jumps; long routes use a
2.4-second animation budget. Reduced motion settles immediately. The 14px body is
smaller than the 16px subtitle and 17–32px headings. During turns, native Markdown
ink follows the physical front of each crossed leaf and reveals the adjacent
page beneath it. The reverse face carries the retained left artwork and links.
Projection masks keep stationary text from showing through the moving paper;
inert display copies preserve the original semantic reader and keyboard focus.
Selection and per-section page positions survive closing during a visit. Escape or exposed pressure wall returns
to the room; there is no Back to About button on the paper. Furniture blocks wall
dismissal and focus returns to the
notebook. The first section includes the editable biography; configured social links
and the Contact invitation sit on the left paper. An empty journal retains the
introduction. This supersedes the earlier three-marker/chapter-pager/scroll design.

Journal authoring reuses the Markdown Write/Preview editor and managed media
workflow from Projects and Case studies. The notebook and semantic Reading view
share safe Markdown rendering, preserve legacy single line breaks, and support
headings, lists, links, images, video/captions, code and tables. Raw HTML is escaped;
private media must publish before the section, and published section dependencies
prevent deleting or unpublishing referenced media. Journal Write has one Markdown
input per section. Preview uses the same 438×428px ink area as the physical reader
and offers automatic page navigation. The later automatic-pagination request
supersedes manual Add/Remove page controls, per-page character limits and overflow
Save/Publish gates. The existing whole-body size guard remains. Old page-break
comments become ordinary paragraph breaks, preserving fenced/indented code examples.
Preview uses prospective published section ordering and published biography/media,
not unrelated drafts. Later biography edits can change the automatic page count.
The requested sample population refreshes only exact untouched notebook samples,
adds absent sample sections, and preserves owner-edited records and identity.

The owner's latest instruction explicitly defers a dedicated mobile design:
**portrait uses exactly the same full spread, page dimensions, typography and
attached flag layout as desktop, scaled down to fit**. Earlier proposals to crop
to the right page or relocate markers are superseded. No paper stretch or mobile
reflow is implemented. Semantic Reading view remains the readable alternative.
Room, overview, doorway and orbital world framing keep their existing rules;
only the close notebook camera is new. See [initial implementation](evidence/about-notebook/README.md),
the [page/section refinements](evidence/about-notebook-refinements/README.md), and the
current [automatic pages and room interaction](evidence/about-notebook-automatic-pages/README.md),
and [printed page turns and fitted feedback](evidence/about-notebook-turn-realism/README.md).

## About photos and social cards

The mounted photo can display the owner's selected portrait. The owner's later
request makes the physical frame and corner retainers square, slightly larger
than the social prints. Its lower edge preserves clearance above that row; it
remains passive beside the library. Identity & copy uses one
library image with independent, nondestructive crops for the square room
frame and square Reading view portrait. Without an image, the room retains its
landscape artwork and Reading view its existing book symbol.

Three equal square paper cards remain clipped above the notebook. Each can be
assigned an existing social link to Left, Center or Right, independently of the
two Contact monitor placements. Existing links default to Off; no owner content
is reassigned automatically. The owner's later icon-only request supersedes the
photo/badge/caption composition: each configured card shows one centered icon
printed directly onto its cream paper. The owner's size refinement uses half
of each card's width for the icon (0.19 local units), closely matching Contact's
0.186-unit mark. This supersedes the initial 72% icon extent; the full card stays
clickable and the studio preview uses the same 50% extent. The visual picker
offers recognizable platform marks from Simple Icons, plus Website and Custom
link symbols. An
optional standard SVG or PNG upload replaces the preset in About and its readers;
choosing a preset clears that override. Uploaded icons preserve their colors,
transparency and full proportions. Contact continues using the shared preset.
The full owner-authored name remains in the native link and focus label.

Configured cards share the existing dim-at-rest, bright-on-hover/focus and inset
amber rim behavior. A viewport-size label supplies the full destination name.
Native links open HTTPS destinations in a new tab and mailto destinations in the
mail handler; normal context menus, keyboard activation and drag-click
suppression remain. Targets are available only in settled About, outside reader
mode. Empty slots keep passive paper artwork with no target or platform mark.
Reading view and the notebook reader expose the same selected links as wrapping,
44-pixel-high logical controls. The notebook reader now uses the mounted spread
described above; other furniture and the room camera fit remain unchanged.
The three prints are 0.38 × 0.38 local units; live neutral-room checks
measured 24.19-pixel targets at 360 × 800 and 26.31 at 390 × 844.

Save draft, private preview and Publish remain separate. Images require explicit
publication before their parent can publish; live portrait and active custom-icon
dependencies prevent unpublishing/deleting those assets or changing them to an
incompatible media type. SVG uploads are converted locally to a bounded PNG in
an isolated image context; raw SVG is never served as an uploaded asset. Retired
social-photo fields remain round-trippable but are neither rendered nor treated
as active dependencies. Duplicate live
About slots are rejected atomically. Crop/placement fields travel through content
backups without modifying uploaded originals. Slow or failed image loads keep
fallback artwork visible without blocking scene entry. See
[authoring instructions](OPERATIONS.md#authoring-about-photos-and-social-cards) and
[current icon-only evidence](evidence/about-social-icons/README.md). Earlier
[photo-card evidence](evidence/about-photos-socials/README.md) is historical.

## Contact computer and submission boundary

The idle center monitor keeps its small `COMMUNICATIONS` label and uses
`LET’S CONNECT` as its main heading, with `Start a conversation` underneath.
The room sign still uses the configured Contact room name.
Its footer reads `COM / 01` and `OPEN TO CONNECT`; the left and right social
screens are `COM / 02` and `COM / 03`, respectively. There is no fourth channel.

The main Contact screen and configured social screens use the shared folded
desktop wallpaper behind their graphics, consistent with Projects. A missing or
invalid social destination leaves a plain dark STANDBY display, without social
graphics, native link target or hover feedback. It remains installed as passive
hardware. This rule applies to both social slots.

The main Contact monitor is selectable with the shared screen hover/focus feedback.
Its application replaces the idle display on the existing glass. Landscape frames
the monitor and conventional 82-key keyboard; portrait frames a tall application
window inside that glass, with single-column fields and internal scrolling. The
monitor itself is not stretched. A conventional, accessibly named X closes the
application. Clicking exposed Contact-room pressure walls also returns to the
room; those walls dim during screen use, brighten on hover and show a secondary
return cue. Main/social screens, keyboard and desk block that wall action using
their actual rendered silhouettes.
The old deployable Contact tablet is removed; Projects now uses its monitors as described above.

Keep bounded hover and drag camera control active while this application is open.
The closer computer orbit uses 0.04-radian pitch / 0.12-radian yaw limits; drag
release springs back to hover, and native form interaction never starts a drag.
A static abstract navy/alloy-blue desktop fills the full monitor glass behind
the application window, including the space around the compact chooser. Main and
both social displays use a single seated rounded frame, with concentric corner
radii for a consistent narrow dark border. The glass is recessed behind that
frame; app and interaction anchors remain aligned to the visible face. This
replaces the protruding stacked trim and mismatched corner gaps.
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

The owner selected **Europe at Night**, then approved a shorter seamless regional
loop with believable fictional geography, native source detail and a fixed
physical Earth across screen sizes. Production uses **`earth-europe-loop.webp`
(2560×1536)**. The original **8192×4096 NASA Black Marble night map** supplies the
protected European core; an offline AI-assisted coastal continuation joins it
back to itself. The cinematic blue atmosphere and opening **12° longitude /
48° latitude / −10° roll** remain. Normal rotation is **0.0045 rad/s** (1.5× the
original 0.003 rate), after readiness and subject to visibility/reduced motion.

Earth's authored position, radius, geography and spacecraft-world registration
are fixed. A later owner correction keeps the horizon **bottom-left in vertical
overview** using a viewport-selected anchor. That anchor stays fixed during room
entry and return: Earth, stars and spacecraft respond to the same physical camera.
Earth may naturally move out of the frame in a room. Only a viewport-orientation
change eases between the portrait and original landscape anchors; initial setup
and reduced motion apply the chosen anchor immediately. Same-orientation resize,
hover, drag and room selection do not retarget Earth or reset its texture phase.
This supersedes the rejected live-roll compensation in `e238e60`, which kept
Earth steady while the rest of the world appeared to turn. Its regression test
encoded the wrong motion rule; the corrected tests assert fixed Earth/atmosphere
world matrices and moving projections throughout both navigation directions.
See [stable navigation evidence](evidence/earth-stable-navigation/README.md);
the [previous review](evidence/earth-portrait-placement/README.md) remains historical.
Landscape uses 38° vertical FOV; portrait preserves 38° horizontal FOV,
with a 78° vertical cap for very tall windows. Different responsive camera poses can still reveal
different Earth pixels; only a same-eye lens/crop comparison shares the identical
physical viewpoint. This is not a screen-space photograph or Earth attached to
each room's camera.

A fixed sphere with scrolling longitude UVs repeats every **112.5° / 436.33 seconds
(7 minutes 16 seconds)**. One map and the existing sampling shader remain. The
sphere's geometric U boundary stays outside the audited camera envelope; changing
camera limits requires rerunning the reusable triangle/frustum UV audit. It bounds
all fragments at each audited pose plus explicitly described pose neighborhoods,
not every conceivable browser dimension or future camera change.

The **1536×1536 protected core** retains decoded NASA pixels exactly. The authored
bridge is generated offline at native resolution, stitched with minimum-error
cuts, then losslessly encoded. The rest is a fictional satellite-style map, not a
factual view of Earth. No runtime image generation, crossfade or second texture
sample is introduced. Texture width describes a regional crop, not downsampling
the original full 8K world. Smaller storage does not by itself prove faster frames.
See the [current evidence](evidence/earth-consistent-loop/README.md) for the asset
identity, generated/source proportions, bounded crop proof, measured comparison,
rejected portrait framing and recommendation. The [original regional-loop
record](evidence/europe-regional-loop/README.md) remains historical evidence.

The opening is the former **Europe at night** preset, distinct from Mediterranean
classic (18° / 38° / −12°). It supersedes the provisional East Asian default and
earlier route recommendations. The regional-loop request also supersedes the
decision to accept darker regions later in a full-world rotation. CPU light
scores remain comparison aids, not substitutes for rendered visual review.

The former angle/preset/model controls, copy/paste settings, daytime rendering
and their dedicated tests remain removed. The owner subsequently requested a
**temporary playback helper** to inspect the regional loop. This supersedes the
earlier no-controls rule only for playback, not angles, presets or Earth models.
**Tools → Earth playback** at the bottom-right opens a video-style timeline
covering the full **7m16s** loop, Play/Pause/Restart controls and a **1–60× speed slider**. Here
**1× means the approved 0.0045 rad/s site speed**, already 1.5× the original rate;
60× traverses the loop in approximately **7.27 seconds**.

Seeking works backward or forward and pauses at the selected phase. Restart
returns to the original opening at normal speed. Closing keeps the chosen Earth
phase and restores normal 1× playback; reloading returns to the original Europe
opening. State lives only in the current React/environment instance, without
browser storage, backend writes or portable settings. The helper changes only
Earth time, leaving stars, meteors and camera timing alone. Readiness and global
reduced-motion/visibility rules still gate automatic playback; the timeline can
preview still frames under reduced motion. Only an open panel polls its displayed
state, at 10 Hz. The helper does not change texture or geometry quality. See
[playback-control evidence](evidence/earth-playback-controls/README.md).

Only the regional night WebP is fetched by normal application visits. The full
8K night JPEG remains in `public/textures/` for rebuilding, regression tests and
historical comparisons; it is not an additional runtime request. Daytime and
lower-resolution maps remain removed. Their small provenance manifests and raw
performance results remain in historical evidence. Reproducing those old implementations requires
checkpoint `56c67bb`, as described by the [historical resolution guide](../scripts/benchmarks/earth-resolution-lab.md).
Independently used cloud benchmark fixtures remain for their retained tests and
case-study evidence; the production renderer does not load them.

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

Historical comparison evidence: [2K/4K/8K night Earth](evidence/performance/night-earth-resolution/README.md).
The [sky review](evidence/sky-land-composition/review.json) records star composition
and resource costs. Its land-based Earth acceptance was superseded by the
[city-light composition review](evidence/earth-light-composition/review.json),
which records early light coverage, distribution and the remaining dark intervals.
Both CPU audits use image-color proxies requiring rendered review, not authoritative
land or settlement masks.
The [retired helper review](evidence/earth-composer/review.json) records its
historical source, checked interaction states and verification limitations.
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

The bottom-right **Tools** launcher sits beside Reading view and opens an upward
popover containing **Earth playback**, **Scene diagnostics** and **Content studio**.
Opening the menu alone starts neither playback polling nor instrumentation.
Escape, outside interaction or focus leaving the menu closes it; closing an
inspection panel returns focus to Tools. On narrow screens, Reading view keeps
its accessible label while displaying only its icon to leave room for navigation.
The launcher records its intended Open/Close action on primary pointerdown, so a
focus dismissal between press and click cannot reopen a menu the visitor meant
to close. Keyboard activation still uses current state. A pure event-ordering
regression covers that race; it does not establish a native Safari reproduction.

**Tools → Scene diagnostics** opens guided diagnostics with advanced
room/assembly/pass inspection and named exports. Instrumentation is opt-in and
normal rendering is restored on close. The owner has an Air M4 with passive
cooling; diagnostics must remain useful across devices/browsers. Unsupported GPU
queries are unavailable, never inferred zero cost. Use the authorized built-in
engine and report that scope; do not automate native Safari without permission.

Resolution comparisons include actual transfer bytes, decoded/nominal texture
storage with mipmaps, decode/upload/first-frame preparation and steady CPU/GPU/
frame pacing. Verify decoded dimensions and loading success. Preparation records
are not cold-network benchmarks; multi-version lab residency is not single-map
production memory. Historical full-globe night data do not reliably rank steady rendering at
2K/4K/8K; delivery/storage differences are clear. Keep day/procedural comparisons
separate and identify preserved historical source explicitly.

Geometry/render experiments should first rank current costly passes/groups,
then compare the affected rooms and activities. Keep the approved regional Earth
with its original 8K texel density in unrelated baselines; source-identify older
full-globe comparisons separately. Match production build, viewport, drawing buffer, camera,
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
organizational cleanup. The temporary playback helper above does not authorize
permanent Earth controls or restoring 2K/4K defaults, old procedural
clouds, ordinary-door waits, duplicate iris blades, generic exterior filler,
angled rescue lights, end-gap reels or the short lower ladder stub.

Official support checked on 15 September 2026: Codex still loads project
`AGENTS.md` guidance, and Astra documentation explicitly discusses those files.
No model/effort override or global configuration change is needed.
[Codex project instructions](https://learn.chatgpt.com/docs/agent-configuration/agents-md),
[Astra guidance](https://developers.openai.com/api/docs/guides/latest-model).
