# Independent critic report — immersive local revision

Reviewed 9 September 2026 by an independent critic agent. The critic did not author or modify the application. This assessment covers the requested local revision: a render-first spacecraft, fixed camera orientation, subtle cursor movement, whole-room selection, in-place reading, preserved portfolio/admin behavior, and a running local website.

**Result: 90.4/100. All five areas exceed 8/10. No known requirement blocker remains for this scoped local deliverable.** The earlier Sites hosting incident is separate and is not claimed resolved.

## Five equally weighted areas

| Area | Score /10 | Evidence and practical limits |
|---|---:|---|
| Visual identity and integrated interaction | **9.0** | Current production desktop/mobile captures show a spacecraft-led composition with restrained navigation, a blue Earth horizon, visible atmospheric limb and varied stars. The ship has connected pressure-hull modules, rounded surfaces, readable nameplates, cabin props and consistent materials. Hover visibly changes the selected room as a whole. Zoomed mission/dossier readers retain the surrounding ship and do not feel like a full-page departure. |
| Functionality and database/admin workflows | **9.3** | Fifteen tests pass with no failures or skips, including the existing database/admin/contact regression suite and new destination, motion-bound and metadata checks. Actual browser evidence records raycast entry, in-place dossiers, browser Back/Forward, correct case-study metadata and retained renderer identity. ID-based private preview hydration and Back restoration were specifically rechecked. Separate drafts/publications, ordering, growth, owner personalization, media, contact storage and exports remain covered. |
| Responsive accessibility | **9.0** | Fourteen new-layout axe audits cover six desktop routes, six mobile routes, a tablet route and an actual WebGL-loss fallback; all report zero violations and no page overflow. Fresh mobile overview, dossier and contact captures are readable and intentional. Browser evidence shows room-reader focus after arrival, Escape restoration, paused keyboard entry, contact-input focus surviving a keyboard-sized viewport resize, and usable reading navigation after context loss. OS preference switching, physical devices and manual screen-reader sessions were not performed. |
| Performance and crawlability | **8.8** | The camera quaternion remains identical across drag, room entry, dossiers and history navigation. The renderer persists through those interactions; it is not recreated for each room. Scene evidence reports approximately 94 overview draw calls and 378,300 triangles after batching/static-shadow caching, with observed CPU submission samples around 1.5–3 ms. This is not GPU timing or a frame-rate guarantee. Built-worker warm complete responses are approximately 8–14 ms on loopback; HTML computes to roughly 9.9–11.1 KB gzip. Three.js is approximately 183 KB gzip, the model 11.2 KB and immersive UI 9.2 KB; Earth textures total approximately 281 KB. Complete semantic HTML, titles, canonical URLs and meaningful routes remain available before enhancement. |
| Security and maintainability | **9.1** | Authenticated admin/preview boundaries, same-origin checks, bounded requests, safe text/URL handling, prepared SQL and database uniqueness remain intact and regression-tested. Independent anonymous and forged-header probes reject protected reads on the development gateway. Production and development public-route probes return expected content and status codes. Build/typecheck/lint pass and dependency audit reports zero known advisories. Geometry, background, flight rules, readable views and content persistence are separated; Earth asset provenance is documented. The local server was independently confirmed listening on loopback only. |
| **Overall** | **90.4/100** | **(9.0 + 9.3 + 9.0 + 8.8 + 9.1) × 2.** |

## Concrete verification

The critic inspected the current scene, navigation, metadata, preview, reading and fallback source, not just screenshots. Read-only HTTP checks against both `localhost:3000` and the built Worker on port 4173 verified seven public routes with one h1, title and canonical URL; unknown project routes returned 404; anonymous admin requests returned 403; private preview redirected with private/no-store headers. Pre-enhancement scene and flight controls were hidden in the returned HTML while real content remained present.

The current production interaction record shows the same renderer UUID and camera quaternion before/after drag, raycast entry and paused keyboard navigation. Earlier development evidence additionally records same-renderer Back/Forward and ID-based private preview restoration. Drag changes only bounded camera translation and does not trigger navigation. The production paused-keyboard recheck records focus on `room-reader`, superseding an earlier failed-focus observation.

The WebGL test used actual context loss, then verified zero remaining canvases, the readable mission heading and working navigation to Contact. The mobile contact test retained `contact-name` focus across a reduced-height viewport, avoiding keyboard-resize focus theft.

`localhost:3000` returned HTTP 200 during final review. `lsof` showed its Node listener bound to `[::1]:3000`, satisfying the requested running local endpoint at that time. The application should remain running for the user's inspection.

## Evidence inspected

Under `docs/evidence/immersive/`:

- `workflows.tap`: 15 passed, 0 failed, 0 skipped; corresponding tests were inspected.
- `accessibility.json`: 14 route/viewport/fallback audits with no reported violations or overflow.
- `interactions.json`: drag/hover, room entry, dossiers, browser history, editable metadata, focus, context loss, reading fallback and private-preview behavior.
- `production-interactions.json`: actual built-application navigation, fixed orientation, persistent renderer, paused keyboard focus and mobile scene selection.
- Current desktop overview/hover/experience/dossier and mobile overview/dossier/contact screenshots; supporting room captures.
- `production-measurements.json`, `build.txt`, `typecheck.txt`, `lint.txt`, `dependency-audit.json`.

The critic's independent HTTP results are retained at `/tmp/immersive-final-http.json`. Existing persistence and restoration evidence from the prior implementation was also considered alongside the fresh database regression tests; it is not misrepresented as a new browser test.

## Issues found and resolved during this revision

- Replaced drag/orbit navigation and full-page scene clicks with fixed-orientation flights and same-document destinations.
- Preserved ID-based project previews through both hydration and browser history.
- Reused editable metadata for SSR and in-place page state.
- Kept Contact's private-preview links within the preview.
- Removed blank scene space and inert controls before JavaScript enhancement.
- Added reading-mode focus management and corrected paused/instant-arrival focus after the reader commits.
- Preserved contact-input focus during viewport resizing.
- Made stopped-mode room highlights immediate and retained contrasting status controls over pale hull geometry.
- Corrected readable-layout positioning so underlying footer links remain clickable.

## Limits and separate hosting incident

No physical low-end GPU, network/CPU-throttled Lighthouse, field Core Web Vitals, manual screen reader, full JavaScript-disabled browser session or OS reduced-motion preference switch is claimed as tested. Server HTML and initial visibility were independently verified; paused/motionless behavior was exercised in the browser, and the OS preference wiring was inspected in source. These distinctions are intentional.

The previous private Sites deployment failed with HTTP 409 while registering the identity callback. That hosted deployment, real gateway session behavior and custom-domain/DNS/TLS launch remain unverified. This local revision neither fixes nor bypasses that incident. Do not expose the raw Worker outside its trusted identity gateway. No hosted URL or production authentication success is claimed.

Sample career/project data remains explicitly labeled. Contact success means durable receipt in the private database inbox, not email delivery. The score approves the current scoped local revision and does not certify an unverified public launch.
