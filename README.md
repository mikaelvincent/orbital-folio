# Orbital Folio

For ongoing work, follow [AGENTS.md](AGENTS.md) and the [current project context](docs/PROJECT-CONTEXT.md). The [performance ledger](docs/performance-ledger.md) records measured results and held candidates.

A reusable developer portfolio with a real, editable Three.js spacecraft, server-rendered case studies, and an authenticated content studio. The initial identity is Mikael Vincent; all career/project/personal copy is clearly marked sample content. Identity and domain references are database records, not rendering constants.

The interactive view makes the ship the main interface. Projects and Case studies sit above About and Contact, linked by side doors and a tall left ladder bay. Cabin dimensions and object placement remain consistent across viewports. The camera moves around the stationary spacecraft; portrait overview uses a camera roll to present its satellite end upward. Choose a visible room, a doorway, or the persistent navigation to approach it. Direct room URLs animate in from overview. The existing semantic readers, editable content and reduced-motion/reading fallbacks remain available.

Hover adds depth and previews doors, including during travel. Bounded dragging springs back to hover control on release. One next destination can be queued, with later choices replacing it; ladder passage retains its one-door-at-a-time interlock. The current orbital background opens over Europe at night and repeats an authored regional landscape at the original 8K map's detail density, with a softened cinematic blue horizon, surrounding stars with varied sizes and visible twinkle, and occasional quieter meteor groups. Both exterior access ladders are mirrored; matching stowed maintenance spanners and clear grab-bar pairs complete the ladder bay. Interior brightness continues to respond to hover, selection and passage.

The approved Earth composition is **Europe at Night**: 12° longitude, 48° latitude,
−10° tilt, with apparent motion at **0.0045 rad/s**. Its authored geography stays
consistent across screen sizes; a viewport-selected portrait anchor puts the
horizon bottom-left in overview and stays fixed during camera navigation. A **2560×1536 lossless
regional texture** keeps native 8K-source detail in Europe and adds an offline
AI-authored coastal continuation, repeating every **7 minutes 16 seconds**.
The temporary **globe button beside diagnostics** opens a seekable timeline,
Play/Pause/Restart and **1–60×** playback. Seeking pauses; closing resumes normal
speed from that position. Reload restores the opening; nothing is saved.
See [current Earth decisions](docs/PROJECT-CONTEXT.md#earth-and-atmospheric-art),
[texture provenance](public/textures/README.md) and
[comparison evidence](docs/evidence/earth-consistent-loop/README.md).

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

Use the focused geometry and benchmark commands documented in the [asset guide](docs/ASSETS.md) and [performance guide](docs/performance-diagnostics.md) for their specific responsibilities. Documentation-only changes need source/link and consistency checks rather than rebuilding or benchmarking the application.

The HTTP integration suite creates temporary records and restores existing content. It is restricted to localhost. It verifies authentication boundaries, snapshot isolation, publication, personalization, concurrency, media, contact storage and abuse controls, exports, and server-rendered routes. On a fresh database, the suite claims the local test identity using `.dev.vars`.

For a browser accessibility audit during development, append `?audit=1` to a route. The development-only harness uses axe-core and exposes a report near the top-right of the page. Expand it and use **Run accessibility audit** after navigating to another room. It also has a button to simulate a real WebGL context loss. **Toggle reduced-motion diagnostic** exercises the renderer pause path without opening a reader; **Run renderer frame control** then samples host display callbacks. This development-only override does not claim to emulate an operating-system preference. Use `?audit=loading` to hold development scene initialization for four seconds and inspect the real loader/reading escape. This delay is only a test gate; normal startup has no artificial delay. Camera traces are also development-only on `?audit=1`. The harness, delay and axe import are excluded from production. Automated audits supplement keyboard and visual inspection; they do not certify complete accessibility.

For repeatable rendering measurements, click the pulse icon beside **SAMPLE / CONCEPT** in the top-right corner (`?perf=1` remains an optional shortcut). The opt-in **Scene diagnostics** panel records CPU/GPU phases, per-room/component draw workload and AO refreshes, offers temporary isolation controls, and exports named comparisons. Closing it restores normal rendering and removes instrumentation. It works in development and production builds. See the [performance testing guide and initial M4 measurements](docs/performance-diagnostics.md) before comparing results; normal visits do not start this instrumentation.

## Source map

| Directory | Responsibility |
| --- | --- |
| `app/` | Public/studio routes, server-rendered entry points and API handlers. Route filenames retain their framework meaning. |
| `features/portfolio/` | Public layout, room views, readable content, contact form and navigation/history integration. |
| `features/studio/` | Studio coordinator plus content fields, first-owner setup, inbox, access/portability and browser model tools. |
| `features/spacecraft/` | React scene host, imperative runtime, model assembly and annotations. `geometry/`, `rooms/`, `equipment/` and `navigation/` own the related construction and behavior. |
| `features/orbit/` | Production satellite Earth, atmosphere, stars and meteors. |
| `features/diagnostics/` | Opt-in performance collection, attribution, comparison panel and development accessibility checks. |
| `lib/content/` | Content types, validation, database repository, social-link policy and initial fixtures. Shared request/security utilities remain directly in `lib/`. |
| `components/ui/` | Shared interface primitives used across the application. |
| `db/`, `drizzle/` | Database schema and immutable versioned migrations. |
| `tests/` | Responsibility-matched suites under `spacecraft/`, `orbit/`, `content/`, `diagnostics/` and `benchmarks/`; `npm test` discovers them. |
| `scripts/` | Setup/operations, texture preparation and focused verifiers; `assets/` holds source masks/provenance and `benchmarks/` contains reusable comparison labs, including historical clouds. |
| `public/`, `docs/` | Served assets with provenance, current maintenance guides, the performance ledger and its necessary evidence. |

Start a scene change at `features/spacecraft/spacecraft-model.ts` for assembly or
`features/spacecraft/spacecraft-runtime.ts` for the render/input lifecycle.
`spacecraft.tsx` is the React host. Material/cache/building helpers live in
`geometry/model-primitives.ts`; docking and the opposite service bus/solar assembly
live in `equipment/docking-service-assemblies.ts`. Room builders can be read
independently of those exterior systems.

Start content work at `lib/content/repository.ts` and `lib/content/types.ts`.
Pages read persisted draft/published records; `seed.ts` supplies initial fixtures
only. Studio forms and server authorization remain separate responsibilities.
The [current context](docs/PROJECT-CONTEXT.md) and [asset guide](docs/ASSETS.md)
provide the more detailed entry points and contracts.

## Deployment and operation

Read [OPERATIONS.md](docs/OPERATIONS.md) for hosting, authentication boundaries, secrets, backups, restoration, custom domains, independent demo subdomains, and maintenance tradeoffs. Read [ASSETS.md](docs/ASSETS.md) to edit the spacecraft.

Public hosting remains a separate unresolved provider sign-in callback incident, documented in [OPERATIONS.md](docs/OPERATIONS.md#current-hosting-incident); no live domain deployment is claimed.

The Case studies room uses `/case-studies` and the existing editable experience records. `/experience` remains compatible; the persisted key is unchanged. Migration `0004_case_studies_room.sql` updates only untouched default room labels.
