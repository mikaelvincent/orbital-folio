# Orbital Folio

For ongoing work, follow [AGENTS.md](AGENTS.md) and the [current project context](docs/PROJECT-CONTEXT.md). The [performance ledger](docs/performance-ledger.md) records current decisions; older validation reports describe their dated revisions.

A reusable developer portfolio with a real, editable Three.js spacecraft, server-rendered case studies, and an authenticated content studio. The initial identity is Mikael Vincent; all career/project/personal copy is clearly marked sample content. Identity and domain references are database records, not rendering constants.

The interactive view makes the ship the main interface. Projects and Case studies sit above About and Contact, linked by side doors and a tall left ladder bay. Cabin dimensions and object placement remain consistent across viewports. The camera moves around the stationary spacecraft; portrait overview uses a camera roll to present its satellite end upward. Choose a visible room, a doorway, or the persistent navigation to approach it. Direct room URLs animate in from overview. The existing semantic readers, editable content and reduced-motion/reading fallbacks remain available.

Hover adds depth and previews doors, including during travel. Bounded dragging springs back to hover control on release. One next destination can be queued, with later choices replacing it; ladder passage retains its one-door-at-a-time interlock. The current orbital background uses the approved 8K Mediterranean night Earth, a softened cinematic blue horizon, varied star twinkle and occasional quieter meteor groups. Both exterior access ladders are mirrored; matching stowed maintenance spanners and clear grab-bar pairs complete the ladder bay. Interior brightness continues to respond to hover, selection and passage.

## Run locally

Requires Node 22.18+ (Node 24 LTS recommended) and npm. The first setup downloads dependencies; the local Cloudflare emulator persists data under `.wrangler/state`.

```sh
npm ci
npm run setup
npm run dev
```

Open `http://localhost:3000`. Visit `/admin`, choose **Sign in with ChatGPT**, and use the generated `ADMIN_SETUP_KEY` from the ignored `.dev.vars` file to claim a fresh studio. The Sites development plugin simulates a local identity; it is never included in production. This delivered checkout has already been claimed by that local test identity, so local sign-in opens the studio directly.

The delivered development server is left running on loopback with the seeded database. To restart it later, run `npm run dev`. A readable route can be opened directly with `?view=reading`. Inspect the production build with `npm run build` followed by `npm start -- --port 4173`; it uses the same local storage directory without the development sign-in simulator.

Never expose the development server or the raw Worker emulator to the internet. The local sign-in simulator is for local development only.

## Personalize without code

1. Open **Identity & copy**. Edit identity, branding, contact details, biography, and the sample notice. The other editor sections cover the domain, SEO, navigation, error page, and every public interface label.
2. **Save draft** preserves the current public snapshot. **Preview saved draft** opens the complete private portfolio with draft navigation. **Publish** replaces the public snapshot.
3. Add projects, experience chapters, journal pages, social links, and images. Change **Display order** and publish to reorder them. Every published entry appears in its collection; the ship’s rooms lead to those collections regardless of their size.
4. Upload PNG/JPEG/WebP images with alternative text, then publish the image and select it for a project, portrait, or social preview. External HTTPS image URLs are also supported. No media is fabricated as the owner’s real work.
5. Projects accept optional independent demo and repository URLs. A demo can be hosted on any HTTPS origin, including an owner-controlled subdomain.
6. Replace the sample material with accurate content before disabling **Show sample notice & keep search indexing off**. Individual records also have sample labels.
7. Contact messages appear in **Inbox**. This release stores inquiries; it does not send emails. Reply through your email application. Delete messages when no longer needed.

Public content is plain text, not arbitrary HTML. Paragraphs and line breaks are preserved. This keeps editing portable and avoids an HTML sanitization dependency. Accent colors are checked for readable text contrast.

## Validate

Choose checks appropriate to the change, as described in [AGENTS.md](AGENTS.md). The maintained application commands are:

```sh
npm run typecheck
npm run lint
npm test
npm run build
```

Individual historical geometry audits use specific designs and baseline commits;
read their dated validation reports before replaying them. For example, the
[Projects workshop record](docs/PROJECTS-WORKSHOP-VALIDATION.md) documents its
preservation audit. Do not run every old standalone script as a universal current
check. Documentation-only changes need source/link and consistency checks rather
than rebuilding or benchmarking the application.

The HTTP integration suite creates temporary records and restores existing content. It is restricted to localhost. It verifies authentication boundaries, snapshot isolation, publication, personalization, concurrency, media, contact storage and abuse controls, exports, and server-rendered routes. On a fresh database, the suite claims the local test identity using `.dev.vars`.

For a browser accessibility audit during development, append `?audit=1` to a route. The development-only harness uses axe-core and exposes a report near the top-right of the page. Expand it and use **Run accessibility audit** after navigating to another room. It also has a button to simulate a real WebGL context loss. **Toggle reduced-motion diagnostic** exercises the renderer pause path without opening a reader; **Run renderer frame control** then samples host display callbacks. This development-only override does not claim to emulate an operating-system preference. Use `?audit=loading` to hold development scene initialization for four seconds and inspect the real loader/reading escape. This delay is only a test gate; normal startup has no artificial delay. Camera traces are also development-only on `?audit=1`. The harness, delay and axe import are excluded from production. Automated audits supplement keyboard and visual inspection; they do not certify complete accessibility.

See [the current context and evidence map](docs/PROJECT-CONTEXT.md). The [Projects validation](docs/PROJECTS-WORKSHOP-VALIDATION.md) and [its critic report](docs/CRITIC-REPORT.md) describe that earlier revision.

For repeatable rendering measurements, click the pulse icon beside **SAMPLE / CONCEPT** in the top-right corner (`?perf=1` remains an optional shortcut). The opt-in **Scene diagnostics** panel records CPU/GPU phases, per-room/component draw workload and AO refreshes, offers temporary isolation controls, and exports named comparisons. Closing it restores normal rendering and removes instrumentation. It works in development and production builds. See the [performance testing guide and initial M4 measurements](docs/performance-diagnostics.md) before comparing results; normal visits do not start this instrumentation.

## Source map

- `components/spacecraft-model.ts`: editable procedural geometry, materials, cabin props, clickable object targets, interior signs and framing/callout anchors.
- `components/projects-workshop.ts`, `components/projects-payload-module.ts`: static four-module category bank, workbench, mounting rails and backlit category artwork.
- `components/contact-flight-console.ts`, `components/contact-flight-audio.ts`: static Contact console, displays, physical controls and docked audio hardware.
- `components/spacecraft.tsx`: lazy renderer, world-camera flights, pointer picking, cached shadows, reduced motion, offscreen handling and WebGL fallback.
- `components/overview-annotations.ts`: projected native callouts and the travelling portfolio identity.
- `components/orbital-environment.ts`, `components/earth-satellite.ts`, `components/earth-view-transform.ts`: the selected satellite Earth, atmosphere, stars and meteors; current choices and comparison records are linked from `docs/PROJECT-CONTEXT.md`.
- `components/immersive-portfolio.tsx`, `lib/flight.ts`: persistent scene navigation, browser history, keyboard focus and readable-view fallback.
- `components/world-reader.tsx`: native HTML pages attached to physical reader surfaces, including accessible paging and shared contact state.
- `components/home-view.tsx`, `components/views.tsx`, `components/portfolio.tsx`: shared public and private preview layouts.
- `components/admin-studio.tsx`: content forms, publication, media, inbox, access, and portability workflows.
- `lib/content.ts`, `lib/content-types.ts`: database access and separate draft/published views.
- `lib/seed.ts`: initial fixtures only; pages read persisted records, never these fixtures directly.
- `db/schema.ts`, `drizzle/`: schema and versioned migrations.
- `proxy.ts`, `lib/security.ts`, `lib/validation.ts`: pre-parser body bounds, security headers, identity authorization, rate limits, and validation.
- `app/api/`: protected mutations and public contact ingestion.

Only the five shared interface components used by the studio are retained; unused starter pages, icons, components and dependencies were removed.

## Deployment and operation

Read [OPERATIONS.md](docs/OPERATIONS.md) for hosting, authentication boundaries, secrets, backups, restoration, custom domains, independent demo subdomains, and maintenance tradeoffs. Read [ASSETS.md](docs/ASSETS.md) to edit the spacecraft.

Current delivery: the revised local experience and seeded studio are runnable. Each critic report evaluates its dated revision; the current context guide links the relevant recent evidence. Public hosting remains a separate unresolved provider sign-in callback incident, documented in [OPERATIONS.md](docs/OPERATIONS.md#current-hosting-incident); no live domain deployment is claimed. The original launch review is retained in [CRITIC-REPORT-INITIAL.md](docs/CRITIC-REPORT-INITIAL.md).

The Case studies room uses `/case-studies` and the existing editable experience records. `/experience` remains compatible; the persisted key is unchanged. Migration `0004_case_studies_room.sql` updates only untouched default room labels.

## Historical room-render revisions

The records below describe earlier render passes, not pending work. The separate reading interfaces were outside those passes; consult the current context guide and source before changing them.

An earlier change rebuilt Projects as the approved payload workshop: four category modules with fitted hardware, a supported cream workbench and static backlit artwork. The replaced locker pick targets are removed; category browsing remains deferred. Camera, doors, other rooms and reader implementations are preserved. See [PROJECTS-WORKSHOP-VALIDATION.md](docs/PROJECTS-WORKSHOP-VALIDATION.md) and the [critic report](docs/CRITIC-REPORT.md). The earlier [Contact console validation](docs/CONTACT-FLIGHT-CONSOLE-VALIDATION.md) remains available.

The preceding correction keeps portrait overview callouts hidden during the return flight, then fades labels and leaders in together after arrival. Horizontal timing and the travelling portfolio identity stay unchanged. Evidence is in [PORTRAIT-CALLOUT-ARRIVAL-VALIDATION.md](docs/PORTRAIT-CALLOUT-ARRIVAL-VALIDATION.md) and its [archived critic report](docs/CRITIC-REPORT-PORTRAIT-CALLOUT-ARRIVAL.md). The preceding fixed-dimension correction is retained in [STABLE-ROOM-PROPORTIONS-VALIDATION.md](docs/STABLE-ROOM-PROPORTIONS-VALIDATION.md). The earlier hull-bar correction is retained in [HULL-BARS-VALIDATION.md](docs/HULL-BARS-VALIDATION.md). The preceding ladder-panel removal is retained in [PANEL-REMOVAL-VALIDATION.md](docs/PANEL-REMOVAL-VALIDATION.md). The earlier shoulder-strip removal is retained in [LADDER-LIP-VALIDATION.md](docs/LADDER-LIP-VALIDATION.md). Earlier interior standardization is retained in [PLAIN-INTERIORS-VALIDATION.md](docs/PLAIN-INTERIORS-VALIDATION.md).
