# Orbital Folio

Editable Three.js spacecraft portfolio with React/TypeScript, Vinext/Vite,
Cloudflare D1/R2 and Drizzle. Use npm and the existing stack.

## Find the relevant guidance

Read only the sections that affect the task; source and `package.json` describe
implementation. Current owner decisions take precedence over historical evidence.

| Task | Guidance |
| --- | --- |
| Setup, commands, source entry points | [README](README.md) |
| Visual, camera/navigation or product behavior changes | Relevant section of [project context](docs/PROJECT-CONTEXT.md) |
| Model/assets or Earth rebuilding | [asset guide](docs/ASSETS.md), then the linked provenance if needed |
| Integration tests, data, auth, deployment or recovery | Relevant section of [operations](docs/OPERATIONS.md) |
| Performance investigation | [candidate/status index](docs/performance-ledger.md), then the relevant [diagnostics procedure](docs/performance-diagnostics.md) |

## Boundaries

- Preserve owner identity, draft/published content, authentication, privacy and
  semantic/reduced-motion fallbacks. Never print or commit secrets, private
  inquiries or emulator state. Do not reset an existing database as setup.
- **Full suites and mutation-bearing tests require a disposable source checkout**,
  fresh isolated D1/R2 state, test-only secrets and explicit `TEST_BASE_URL` on a
  separate loopback server. Run from that checkout; some tests read its `.dev.vars`.
  Never copy private env files or the main database/uploads. See
  [isolated verification](docs/OPERATIONS.md#isolated-verification).
- Use the **hidden built-in browser** for visual checks. Native Safari, other
  native apps and the user's screen require a new explicit request. Report the
  engine actually tested; old Safari evidence is not standing permission.
- Reuse the main development server and protect its store. When asked to run the
  site, leave `http://localhost:3000` accessible and verify its response without
  focusing the user's browser. Remove only temporary review servers/tabs.
- Design quality takes priority over optimization in authored visual work.
  Deferred performance proposals require explicit authorization; cleanup or art
  work does not authorize them. Describe appearance/motion tradeoffs before
  implementing a performance change.

## Verification and completion

Match checks to risk: docs need accuracy/link/diff checks; isolated logic needs
relevant tests; shared renderer/model/navigation or broad dependency changes need
full tests, typecheck/build and affected lint. Inspect useful camera/responsive
states for visual changes, including paired or analogous objects where relevant.
Use independent review when a substantial behavior, design or data-boundary
change benefits from it; routine edits do not require a critic, numeric score,
exhaustive screen sweep or permanent report. Report actual checks and limitations.

Preserve unrelated work and give parallel agents bounded file ownership. Commit
completed changes in logical groups, stage explicit paths and report remaining
uncommitted work. Use `codex/` for new branches; a local change does not authorize
push or deployment.

## Keep the repository lean

Document durable owner decisions and non-obvious failure modes once, in the
relevant guide. Add tests for meaningful regressions, scripts for reusable work
and dependencies for demonstrated needs. Keep at most ten coherent performance
case-study candidates with the evidence needed to substantiate them; routine art
and verification logs need no permanent dossier. Remove superseded material after
checking consumers and Git recoverability, retaining rebuild inputs, licenses and
useful procedures. Update current guidance rather than appending a chronology.
