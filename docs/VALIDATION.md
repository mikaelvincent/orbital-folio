# Validation evidence

The immersive revision has newer layout, browser and build evidence in [IMMERSIVE-VALIDATION.md](IMMERSIVE-VALIDATION.md). The record below describes the initial implementation and is retained for history.

Validation: 8 September UTC / 8–9 September 2026 Manila. Sample content only. The independent critic report records the review status and any remaining gaps.

## Reproducible checks

- `npm run typecheck`: passed; [output](evidence/typecheck.txt).
- `npm run lint`: passed; [output](evidence/lint.txt).
- `npm test`: 12 tests passed, no skips; [complete output](evidence/workflows.tap). Requires the local development server and a disposable sample database. Tests are restricted to loopback, restore original content, and delete their own records.
- `npm run build`: passed; [complete output](evidence/build.txt).
- `npm audit`: zero known dependency advisories at the validation time; [machine-readable result](evidence/dependency-audit.json).
- Fresh SQLite content restore: all 10 draft/published records matched; no private owner or inquiry records included; [result](evidence/restore.json).

The HTTP suite covers anonymous/forged identities, local sign-in/claim/logout, CSRF, streaming request limits, validation, stale revisions, publication isolation, private previews, unpublishing and 404s, growth beyond three projects, ordering, concurrent slug collisions, full owner replacement, image upload/privacy/publication, escaping, portability, semantic HTML, metadata, private inbox receipt and rate limits.

## Browser evidence

The in-app Chromium browser was used for actual UI interaction. Automated axe WCAG 2 A/AA and 2.1 A/AA checks on seven routes at 320, 768 and 1440 pixels found zero violations and zero horizontal overflow: [21-case matrix](evidence/responsive-audits.json). A further [seven cases at 390 pixels](evidence/responsive-390.json) also passed, for 28 route/viewport combinations. An earlier 320-pixel audit exposed contrast issues that were corrected; its older result is not a final pass.

Observed browser workflows include the clickable 3D mission console opening Experience, pause/resume, switching to the HTML reading view, owner-name draft editing, private preview navigation into a dossier, explicit publication, restoration of the sample identity, and a contact submission appearing in the authenticated inbox. WebMCP read and draft-save tools were exercised, including invalid-record rejection.

Stable viewport screenshots are retained in `docs/evidence`. Earlier full-page captures produced stitching artifacts and were replaced with viewport captures. No screenshot is treated as evidence of behavior it cannot show.

Additional recorded checks:

- [Keyboard](evidence/keyboard.json): Tab reaches the skip link first; Enter moves focus to `main`; ArrowRight selects and focuses the next native contact radio; Enter activates pause/resume.
- [WebGL failure](evidence/webgl-fallback.json): the development audit's fault-injection button invokes the real `WEBGL_lose_context` extension. The production scene's shared context-loss handler switched to fallback, retaining four section links and all three project links. This is an actual GPU-context event, not a mock error message.
- [Restart persistence](evidence/restart-persistence.json): every draft, published snapshot, revision and timestamp was identical after stopping and restarting the server.
- Admin unsaved edits blocked a collection change with a clear save/discard message; saving, private preview, publishing and restoring the original sample identity were observed through the browser.

## Production measurement scope

[Measured build output and response times](evidence/production-measurements.json) come from the actual production Worker on loopback, with five warm requests per route. Complete responses took approximately 7–22 ms. HTML was 5.8–9.0 KB when gzip-compressed locally. The optional Three.js chunk is about 183 KB gzip and the procedural model about 5.3 KB gzip. The browser receives complete HTML before the optional scene loads; reading routes do not render a scene.

These are controlled local measurements, **not field Core Web Vitals or a claim about slow-phone frame rates**. No network/CPU-throttled Lighthouse score is claimed. Code caps pixel ratio at 1.5 and animation at 30 fps, suspends offscreen/hidden rendering, honors reduced motion and Save-Data, disposes GPU resources, and handles WebGL loss with complete HTML alternatives.

## Intentional boundaries

- Automated axe is not a manual screen-reader certification. VoiceOver/NVDA, real touch devices, OS reduced-motion switching and physical low-end GPU behavior remain launch checks.
- Complete server HTML and native form semantics are verified. A full browser session with JavaScript disabled has not been run with the available browser controls.
- Contact receipt means storage in D1. Email forwarding is not configured.
- Hosted authentication depends on the Sites gateway. A raw Worker must never be exposed while trusting gateway identity headers. See [operations](OPERATIONS.md).
- The fictional history is labeled and noindexed. Domain DNS and independent project deployments are owner launch configuration.
- Lint intentionally permits heterogeneous validated JSON records, native anchors/images, and ARIA status containers; the React compiler is not enabled. Unused starter templates/hooks and their dependencies were removed; the remaining shared components are included in lint and type checking. Server validation, rather than TypeScript alone, enforces content input safety.


## Hosting outcome

Private deployment failed twice with the hosting provider's HTTP 409 conflict while registering the sign-in callback. No live URL was created. The source version is saved, and the runtime secrets are configured. This is a completion blocker; **hosted authentication and deployment are not passing checks**. [Operations](OPERATIONS.md#current-hosting-incident) retains the incident identifiers and next steps. The independent critic must account for this separately from local application evidence.
