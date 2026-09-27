# Orbital Folio

An editable developer portfolio presented as a Three.js spacecraft, with semantic
reading views and an authenticated content studio. Identity, copy and content are
persisted records; the included projects are fictional examples. Contact messages
are stored in a private inbox; the application does not send email or book calls.

## Run locally

Requires Node 22.18+ and npm. On a fresh checkout:

```sh
npm ci
npm run setup
npm run dev
```

Open `http://localhost:3000`. In `/admin`, choose **Sign in with ChatGPT** and use
`ADMIN_SETUP_KEY` from the ignored `.dev.vars` to claim a fresh studio. The local
Sites plugin simulates sign-in on loopback and is excluded from production.
Existing checkouts should reuse their server and data; do not rerun setup to reset
content. Local D1 and uploads live under `.wrangler/state`.

Development authentication and emulators must stay on loopback. For a local
production preview, run `npm run build`, then `npm start -- --port 4173`. This uses
the same local store without the sign-in simulator. Restart that preview process
after rebuilding so HTML and hashed assets match.

## Edit content

The studio separates **Save draft**, private **Preview**, and **Publish**. Publish
referenced media before its parent record. Projects, Case studies and notebook
sections support safe Markdown; raw HTML and executable embeds are unavailable.
Optional project resource links open independent HTTPS sites. Project ZIP packages
and whole-content JSON backups serve different portability needs.

Sample metadata keeps indexing off until the owner replaces the examples; public
sample badges/notices are intentionally omitted. Guarded local demo tools populate
only exact known untouched samples. Relay remains the browsable reference for
supported project presentation/media features. See the relevant
[authoring and operations sections](docs/OPERATIONS.md).

Visitors can enter through rooms, doorways or navigation, or use `?view=reading`.
The bottom-right **Tools** menu opens **Scene diagnostics**, **Earth playback** and
**Content studio**. Opening the menu alone starts no instrumentation or polling.

## Validate

```sh
npm run typecheck
npm run lint -- <changed-files>
npm run build
```

`npm test` and `npm run check` include tests that mutate stored data and default
to port 3000. Use the [isolated test procedure](docs/OPERATIONS.md#isolated-verification)
before running either; never target the owner's main store. Historical comparison
labs have a separate `npm run test:benchmarks` suite; run it when changing lab
code or procedures. Focused pure unit
tests may run in the working checkout after checking their imports and I/O.

Development-only `?audit=1` provides accessibility auditing, WebGL context-loss
and reduced-motion/frame diagnostics. `?audit=loading` holds scene initialization
for four seconds to inspect the loader and reading escape. These helpers are
excluded from production. Performance measurement has a separate
[diagnostics guide](docs/performance-diagnostics.md).

## Source map

| Concern | Entry points |
| --- | --- |
| Routes, API and storage | `app/`, `lib/content/repository.ts`, `lib/content/types.ts`, `db/`, immutable `drizzle/` migrations |
| Visitor UI and studio | `features/portfolio/`, `features/studio/`, `components/ui/` |
| Model assembly and render/input lifecycle | `features/spacecraft/spacecraft-model.ts`, `spacecraft-runtime.ts`; `spacecraft.tsx` is the React host |
| Model construction | `features/spacecraft/geometry/`, `rooms/`, `equipment/`, `materials/` |
| Camera, flight, doors and picking | `features/spacecraft/navigation/` |
| Earth and sky | `features/orbit/` |
| Opt-in measurement | `features/diagnostics/` |
| Tests and tools | `tests/` (Node test runner), `scripts/` (setup, assets, diagnostics) |

Agent entry point: [AGENTS.md](AGENTS.md). Product decisions:
[project context](docs/PROJECT-CONTEXT.md). Model/rebuild work:
[assets](docs/ASSETS.md). Hosting, auth, backups and authoring:
[operations](docs/OPERATIONS.md). Potential case studies:
[performance index](docs/performance-ledger.md).

Public hosting was blocked by a provider sign-in callback incident; see its
[support record](docs/OPERATIONS.md#current-hosting-incident) before a deployment
attempt. A successful local build does not establish a working live deployment.
