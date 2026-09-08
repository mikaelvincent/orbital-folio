# Orbital Folio

A reusable developer portfolio with a real, editable Three.js spacecraft, server-rendered case studies, and an authenticated content studio. The initial identity is Mikael Vincent; all career/project/personal copy is clearly marked sample content. Identity and domain references are database records, not rendering constants.

The ship is the main interface. Click a room or use the navigation to approach it with a fixed camera; dossiers, the mission log, journal and communications station open within the same scene. Bounded cursor rotation adds depth without free orbiting. Physical lockers, a mission console, journal and communications instrument reveal their attached HTML readers. Reading view and Pause motion are always available.

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

With the local development server running:

```sh
npm run typecheck
npm run lint
npm test
node scripts/database-roundtrip.mjs
npm run build
npm audit
```

The HTTP integration suite creates temporary records and restores existing content. It is restricted to localhost. It verifies authentication boundaries, snapshot isolation, publication, personalization, concurrency, media, contact storage and abuse controls, exports, and server-rendered routes. On a fresh database, the suite claims the local test identity using `.dev.vars`.

For a browser accessibility audit during development, append `?audit=1` to a route. The development-only harness uses axe-core and exposes a report at the bottom of the page. Expand it and use **Run accessibility audit** after navigating to another room. It also has a button to simulate a real WebGL context loss. The harness and axe import are excluded from production. Automated audits supplement keyboard and visual inspection; they do not certify complete accessibility.

See [the current validation evidence](docs/MOCKUP-REVISION-VALIDATION.md) and [the independent critic report](docs/CRITIC-REPORT.md).

## Source map

- `components/spacecraft-model.ts`: editable procedural geometry, materials, cabin props, clickable object targets, and data-driven nameplates.
- `components/spacecraft.tsx`: lazy renderer, fixed camera flights, pointer picking, cached shadows, pause, offscreen handling and WebGL fallback.
- `components/orbital-environment.ts`, `public/textures/`: Earth, clouds, atmosphere and twinkling stars and occasional meteors; NASA credits are in `docs/EARTH-ASSETS.md`.
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


Current delivery: the revised local experience and seeded studio are runnable. The latest critic report evaluates this requested local revision. Public hosting remains a separate unresolved provider sign-in callback incident, documented in [OPERATIONS.md](docs/OPERATIONS.md#current-hosting-incident); no live domain deployment is claimed. The original launch review is retained in [CRITIC-REPORT-INITIAL.md](docs/CRITIC-REPORT-INITIAL.md).
