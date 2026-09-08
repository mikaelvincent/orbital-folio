# Independent critic review — provisional

Reviewed on 2026-09-08 by the independent critic agent. The critic did not author or modify the implementation. Source review, supplied artifacts, and independent read-only HTTP probes were used. This is an interim report, not approval.

## Scores

Each area is scored out of 10 and has equal weight. Overall = sum × 2.

| Area | Provisional score | Evidence and limits |
|---|---:|---|
| Visual identity and integrated interaction | 8.5 | Fresh production desktop viewport shows a distinctive, coherent procedural toybox spacecraft with readable room nameplates, tactile materials, and ordinary section destinations. The scene caption overlaps the pale ship roof. Original full-page dossier/mobile screenshots are corrupted and cannot substantiate their complete visual layouts. |
| Functionality and database/admin workflows | 8.8 | Separate draft/published snapshots, revisions, DB uniqueness indexes, media storage, allowlisted admin, inbox, export/import and shared preview routing are present. The 12-test HTTP suite exercises publication, privacy, capacity, personalization, media and contact. Root reports it passing, but a preserved execution log and browser form personalization evidence are still pending. Exact fresh-SQLite restoration is reported passing. |
| Responsive accessibility | 8.5 | Saved axe reports cover seven routes at 320, 768 and 1440 pixels with no violations or horizontal overflow. Semantic HTML, links, labels, focus styling and reduced-motion code are present. Corrupted original mobile screenshots and missing recorded keyboard/no-WebGL/reduced-motion browser checks limit verification. |
| Performance and crawlability | 8.0 | Independent HTTP probes confirm complete h1/title/canonical HTML on seven public routes, true 404s, sitemap, robots, and private no-store preview. Three.js is lazy-loaded, DPR and animation rate are capped. Production build serves successfully. Offscreen rendering incorrectly restarts on returning to a visible tab; production transfer metrics remain pending. No Core Web Vitals claim is made. |
| Security and maintainability | 8.7 | Independent anonymous and forged-header probes reject admin/export. Private preview redirects with no-store/noindex. Production response has HSTS, CSP, nosniff and restricted browser permissions; dev unsafe-eval is absent. Bounded bodies, prepared SQL, safe URL validation, sample labels and documented backup/auth boundaries are present. Dependency audit reports zero advisories. Hosted gateway/owner lifecycle remains unverified. |
| **Overall** | **85.0/100** | **Threshold not yet met.** |

## Open findings and evidence obligations

1. Replace corrupted dossier/mobile/admin full-page captures with stable viewport evidence. The old captures show content in the left half with duplicated strips; their cause cannot be assumed by the critic.
2. Put the scene caption on a reliably contrasting surface or move it clear of the ship roof.
3. Keep viewport intersection state separate from document visibility. Currently returning to a tab restarts rendering even when the ship remains offscreen.
4. Preserve passing HTTP test/build/restore logs; include production bundle/transfer measurements with clear limits.
5. Record keyboard navigation, a complete admin form save/preview/publish flow, private preview traversal, reduced-motion and unavailable-WebGL behavior. The API suite is valuable but does not alone prove every rendered admin control works.
6. For a hosted claim of completion, verify authentication through the actual Sites gateway and document any remaining owner-only setup. The raw Worker is not independently authenticated and must not be publicly reachable outside that gateway.

## Resolved findings from earlier source review

- Draft/public links now use shared preview-aware routing and the home composition is shared.
- Request size limits run before multipart parsing and count streamed bytes.
- Public 404 copy is database-editable; brand initials now render and generate the favicon.
- Missing/invalid slugs and empty media/link URLs fail validation.
- Database expression indexes protect concurrent duplicate slugs.

## Independently observed HTTP results

On the local development server, /, /projects, /projects/relay, /experience, /about, /contact and /privacy returned 200 with one h1, a title and canonical URL. An unknown URL returned 404. Anonymous /api/admin and /api/admin/export returned 403. Supplying forged oai-authenticated identity headers still returned 403. Anonymous private preview returned 307 with private/no-store and noindex/nofollow headers.

The built production server at 127.0.0.1:4173 returned 200 with production security headers. These loopback checks do not establish real-network latency, field Web Vitals, gateway session expiry, or deployed custom-domain behavior.

Raw critic HTTP evidence is saved at /tmp/orbital-critic-http.json and /tmp/orbital-critic-production-headers.txt.
