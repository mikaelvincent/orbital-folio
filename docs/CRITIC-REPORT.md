# Independent critic report

Final review: 9 September 2026 (Asia/Manila). Review performed by an independent critic agent that did not write or modify the implementation. The critic inspected source, operating instructions, test outputs and rendered evidence, and independently probed the local development and production HTTP servers.

**Result: 89.4/100. Every area exceeds 8/10, but the requested 90/100 threshold and blocker-free completion condition have not been met.** The local application is substantially implemented and validated. Hosted deployment is blocked by an external identity-gateway registration error. Unverified hosted authentication and real-device performance are not counted as passing.

## Equally weighted scores

| Area | Score /10 | Concrete basis and remaining limits |
|---|---:|---|
| Visual identity and integrated interaction | **9.0** | Stable desktop and mobile screenshots show a distinctive procedural toybox spacecraft with plausible connected bays, warm materials, integrated editable nameplates and tactile props. Case studies use a readable clipboard treatment; experience, About and contact have related console/journal/communications surfaces. Actual scene picking, pause and reading-view interactions were observed by the implementing agent and recorded. The result is coherent across the supplied desktop/mobile views. |
| Functionality and database/admin workflows | **9.2** | The preserved HTTP suite passes 12/12 tests with no skips. It exercises authentication boundaries, private drafts versus published snapshots, optimistic revisions, concurrent slug rejection, ordering and growth beyond three projects, owner replacement, media upload/privacy/publication, contact persistence, escaping and import/export. Browser evidence shows owner editing, guarded unsaved changes, save/publish and a private dossier retaining the changed owner. Ten complete records survived a server restart unchanged, and all draft/published snapshots matched after restoration into a fresh SQLite database. Production identity-provider behavior remains outside this locally verified result. |
| Responsive accessibility | **9.1** | Twenty-eight route/viewport combinations at 320, 390, 768 and 1440 pixels report zero axe WCAG A/AA violations and no horizontal overflow. Fresh mobile home, dossier and admin views are readable and intentional. Keyboard evidence records skip-to-main focus, native radio arrow-key behavior and pause activation. Forced actual WebGL context loss retained the fallback, four section links and three project links. OS reduced-motion switching, a full JavaScript-disabled browser session, manual screen readers and physical touch devices remain unverified. |
| Performance and crawlability | **8.6** | Independently observed public responses contain complete semantic HTML, titles and canonical URLs; unknown routes return 404. Sitemap/robots and private preview noindex/no-store are present. The actual production build reports 5.8–9.0 KB computed-gzip HTML, an optional approximately 183 KB gzip Three.js chunk and a 5.3 KB model. Warm complete loopback responses measured approximately 7–22 ms. The renderer caps pixel ratio and animation rate, disposes resources and now combines viewport/document visibility correctly. No network/CPU-throttled browser, low-end GPU, Lighthouse or field Web Vitals results are available; loopback timings do not verify those outcomes. |
| Security and maintainability | **8.8** | Independent anonymous and forged-header probes reject admin/export; private preview redirects and is no-store/noindex. The built response includes HSTS, CSP without development unsafe-eval, nosniff, referrer and permissions policies. Server authorization, same-origin mutations, pre-parser streamed size limits, prepared SQL, database uniqueness, safe URL validation and passive image upload rules are implemented. Dependency audit reports zero known advisories, and build/typecheck/lint pass. Backup, restoration, migration, domain, subdomain, secret and auth-boundary instructions are explicit. The beta framework and gateway-specific identity adapter are documented maintenance tradeoffs. Actual hosted gateway authentication, session lifetime and bypass-origin protection cannot be verified until the provider incident is resolved. |
| **Overall** | **89.4/100** | **(9.0 + 9.2 + 9.1 + 8.6 + 8.8) × 2. Approval withheld.** |

## Completion blocker

Private Sites deployment failed twice before a live URL was assigned. Both attempts returned HTTP 409 Conflict while the provider registered the SIWC sign-in callback. The application built successfully; this is an external hosting/authentication-registration failure. The Site remained private and authentication was not bypassed or weakened. Incident and deployment identifiers are recorded in `OPERATIONS.md`.

Consequently, the hosted first-owner claim, real gateway sign-in/logout and session behavior, gateway-only public ingress, DNS/TLS and domain launch are unverified. The local simulator is not evidence of those production behaviors. The raw Worker must not be exposed as a workaround because the application relies on authenticated headers supplied by the Sites gateway.

Resolving the provider incident and verifying the real deployment is required before declaring hosted completion. A bounded production-browser performance run on a constrained device/profile would also resolve the main remaining performance evidence gap. Scores must be reviewed from the new evidence rather than automatically raised.

## Evidence inspected

- `evidence/workflows.tap`: 12 passed, 0 failed, 0 skipped; corresponding HTTP test source was inspected.
- `evidence/restore.json`: ten records; identical draft and published snapshots in a fresh SQLite database; private data excluded.
- `evidence/restart-persistence.json`: drafts, publications, revisions and timestamps identical after stop/start.
- `evidence/responsive-audits.json` and `evidence/responsive-390.json`: 28 route/viewport cases, no reported violations or overflow.
- `evidence/keyboard.json`: skip target focus, native radio selection/focus, keyboard pause and unsaved-edit guard.
- `evidence/webgl-fallback.json`: actual forced WebGL context loss and preserved content/navigation.
- Stable viewport images: desktop/mobile home, desktop/mobile dossier, desktop/mobile admin and private preview. The private preview shows the alternate sample owner retained inside a dossier.
- `evidence/production-measurements.json`: actual built-worker response and bundle measurements with their scope clearly stated.
- `evidence/build.txt`, `evidence/typecheck.txt`, `evidence/lint.txt`, `evidence/dependency-audit.json`.
- `README.md`, `OPERATIONS.md`, `ASSETS.md`, `VALIDATION.md`, application/API/database/scene source and migrations.

The critic independently verified seven public routes returning 200 with one h1, title and canonical URL, a genuine 404, anonymous admin/export denial, denial with forged identity headers, and an anonymous preview redirect with private/no-store and noindex/nofollow headers. The built server independently returned 200 with production security headers. Raw critic probe results were saved under `/tmp/orbital-critic-http.json` and `/tmp/orbital-critic-production-headers.txt` during review.

## Earlier findings resolved

- Draft previews now share public layouts and preserve private navigation.
- Request bodies are bounded before multipart parsing, including streamed bodies.
- Public error-page copy is database-editable; initials affect branding and the generated favicon.
- Missing slugs and empty/unsafe link/media URLs are rejected; database indexes reject concurrent duplicate slugs.
- The scene caption has a contrasting backing and offscreen rendering no longer restarts merely because the tab becomes visible.
- Unsaved admin edits are guarded, and skip navigation focuses the main landmark.
- Corrupted full-page screenshot captures were replaced by stable viewport evidence used for this final assessment. The older pre-fix 320-pixel audit is not counted as a pass.

## Honest delivery boundaries

No email delivery is claimed: contact success means durable storage in the private inbox. The portfolio is seeded with explicitly labeled fictional examples and remains noindexed. The real owner must replace those examples and configure the domain before a public launch. No production histories, project results, external demos, slow-device frame rates, manual assistive-technology certification or hosted authentication success have been invented or inferred as passing.
