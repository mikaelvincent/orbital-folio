# Orbital Folio

A reusable developer portfolio with a real, editable Three.js spacecraft, server-rendered case studies, and an authenticated content studio. The initial identity is Mikael Vincent; all career/project/personal copy is clearly marked sample content. Identity and domain references are database records, not rendering constants.

Interactive view makes the ship the main interface. Four cabins retain Projects/Case studies above About/Contact in the vessel. Portrait overviews rotate the entire ship 90° with its satellite end upward; selected rooms return upright. Open side doorways and a tall left walkway connect Case studies → Projects → stairs → About → Contact; the original docking assembly remains. Nine stacked project compartments page through the database collection, with a different piece of secured equipment in every spare bay. Click a room or use the bottom-left navigation and persistent Home control to approach it with a fixed camera. Physical signs sit above the side doors; floating callouts identify the cabins, and the published domain/name rests above the ship in overview, then recedes during travel. Interiors use two brightness levels: medium by default and full brightness when hovered, selected or traversed.

Small cursor movements add depth. Mouse/touch dragging gives a larger, bounded view without free orbiting; camera springs preserve velocity across changing targets. Medium-bright interiors rise to full brightness on hover or selection while the hull and antennas remain lit. The tapered ladder bay uses the same medium baseline, brightens fully when previewed from inside a cabin, and stays at full brightness during passage. A procedural ocean planet has moving cloud fronts, sheets, cumulus and cirrus. Meteors arrive frequently, sometimes in small groups. Reading view remains available; reduced-motion preferences are respected. Physical lockers, mission console, journal and communications instrument retain their attached semantic HTML readers. Those separate reading interfaces were intentionally outside the latest render-only revision.

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
node scripts/chassis-preservation-audit.mjs . /tmp/preservation.json docs/evidence/orientation-labels/label-exclusions.json ebff2d0
node scripts/liner-sheet-audit.mjs
node scripts/spacecraft-label-audit.mjs
node scripts/spacecraft-metadata-audit.mjs
node scripts/orientation-labels-critic-state.mjs
node scripts/orbital-environment-audit.mjs
node scripts/render-input-audit.mjs
node scripts/case-studies-routing-migration-audit.mjs
npm run build
npm audit
```

The HTTP integration suite creates temporary records and restores existing content. It is restricted to localhost. It verifies authentication boundaries, snapshot isolation, publication, personalization, concurrency, media, contact storage and abuse controls, exports, and server-rendered routes. On a fresh database, the suite claims the local test identity using `.dev.vars`.

For a browser accessibility audit during development, append `?audit=1` to a route. The development-only harness uses axe-core and exposes a report near the top-right of the page. Expand it and use **Run accessibility audit** after navigating to another room. It also has a button to simulate a real WebGL context loss. **Toggle reduced-motion diagnostic** exercises the renderer pause path without opening a reader; **Run renderer frame control** then samples host display callbacks. This development-only override does not claim to emulate an operating-system preference. Use `?audit=loading` to hold development scene initialization for four seconds and inspect the real loader/reading escape. This delay is only a test gate; normal startup has no artificial delay. Camera traces are also development-only on `?audit=1`. The harness, delay and axe import are excluded from production. Automated audits supplement keyboard and visual inspection; they do not certify complete accessibility.

See [the current validation evidence](docs/LADDER-LIP-VALIDATION.md) and [the independent critic report](docs/CRITIC-REPORT.md).

## Source map

- `components/spacecraft-model.ts`: editable procedural geometry, materials, cabin props, clickable object targets, interior signs and framing/callout anchors.
- `components/spacecraft.tsx`: lazy renderer, fixed camera flights, pointer picking, cached shadows, reduced motion, offscreen handling and WebGL fallback.
- `components/overview-annotations.ts`: projected native callouts and the travelling portfolio identity.
- `components/orbital-environment.ts`: procedural ocean, moving clouds, atmosphere, twinkling stars and staggered meteors; memory and algorithm notes are in `docs/EARTH-ASSETS.md`.
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

The Case studies room uses `/case-studies` and the existing editable experience records for this design iteration. `/experience` remains compatible; the persisted key is unchanged. Migration `0004_case_studies_room.sql` updates only untouched default room labels. The separate reading interfaces are deferred during this render pass.

The latest correction removes the raised end-cap strips inside the ladder shoulders. Matching fresh-renderer close-ups and the independent review are in [LADDER-LIP-VALIDATION.md](docs/LADDER-LIP-VALIDATION.md) and the [critic report](docs/CRITIC-REPORT.md). Earlier interior standardization is retained in [PLAIN-INTERIORS-VALIDATION.md](docs/PLAIN-INTERIORS-VALIDATION.md).
