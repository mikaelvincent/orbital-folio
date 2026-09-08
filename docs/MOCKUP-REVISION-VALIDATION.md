# Mockup revision validation

Validated 9 September2026. The requested render and navigation revision runs at **http://localhost:3000** with the existing seeded persistent database and local content studio. Hosted deployment remains the separate provider callback incident documented in OPERATIONS.md. No public deployment or physical-device certification is claimed.

## Final implementation

- Higher-detail cream/orange spacecraft with physical bulkheads, joined pressure frames, larger data-driven locker titles, hinged doors, journal, mission console and communications instrument. The About aft wall is real geometry; the intersecting docking ring was replaced with a raised band.
- Room selection first approaches the room. Its physical object opens an attached native HTML reader. Browser history, Escape and return controls preserve the scene and restore the originating locker’s focus.
- Bounded mouse rotation, visible hover rails, slight overview approach, slowly rotating Earth/cloud layers, restrained twinkle and occasional shooting stars. Pause, reduced motion, hidden/offscreen handling and reading mode share a stable active clock.
- NASA maps with mobile2K, default4K and explicitly capable high5400/8K tiers. A two-map readiness gate prevents partial Earth rendering. High-tier texture payload is about244.8MiB; capability gating and reading mode are meaningful safeguards, not a guarantee of available GPU memory.
- Portrait reader housings retain18px native body text on mobile and20px on desktop/tablet. Contact draft, pending, success and error state are shared across reader modes. Three editable navigation labels are added through an additive database migration.

## Evidence

All files below are in `docs/evidence/mockup-revision/`.

| Check | Result | Evidence |
| --- | --- | --- |
| TypeScript and lint | Pass | `typecheck.txt`, `lint.txt` |
| Persistent workflows/security |16 tests passed,0 failed | `workflows.tap` |
| Final route/flight regression |4 passed after final framing/query fixes | `flight-final.tap` |
| Export/restore |10 records; draft/published snapshots identical; no credentials/inquiries exported | `restore.json` |
| Production build |Pass | `build.txt` |
| Dependency audit |0 known vulnerabilities at run time | `dependency-audit.json` |
| Built Worker routes |Semantic200 routes; missing dossier404; forged local dev cookie rejected403; sample noindex | `production-http.json`, `critic-final-http.json` |
| Native mobile/tablet readers |0 axe violations at390px contact,390/320px dossier,1024px dossier; no horizontal overflow | `browser-final.json` |
| Physical/HTML alignment |27 independent matrix cases; maximum world-corner error about1.05e−15; tablet DOM projection discrepancy<0.006px | `reader-transform-audit.json`, `browser-final.json` |
| Model structure/content capacity |0/1/3/8-project mapping and six About wall rays pass | `model-audit.json` |
| Actual WebGL loss |Falls back to complete About HTML;0 ship canvases remain | `browser-final.json`, `webgl-fallback.png` |
| Contact browser workflow |Sample local inquiry accepted; confirmation survives mode switch; draft survives focused viewport resize | `browser-final.json`, `mobile-contact-form.png` |
| Motion |Paused active time remains140.467 across observations and navigation; natural meteor captured at phase0.628; Earth/cloud rotations advance | `browser-final.json`, `mobile-shooting-star.png` |
| Full mobile silhouette |Corrected fixed framing fits both wings at390×844 and320×568 | `mobile-overview.png`, `small-mobile-overview.png` |

The development audit overlay appears only in some diagnostic captures; final public screenshots were replaced with clean views. The full working browser log retains earlier observations and superseded states for transparency. Use `browser-final.json` and named final captures for conclusions.

## Performance scope

Fresh desktop overview samples reported frame interval median16.7ms,95th17.6ms. Interaction/hover windows reported95th about33.4–33.5ms and no interval over50ms within their last360 samples. Mobile observed intervals were typically16.7/17.6ms at median/95th. These are browser animation-frame intervals on this computer, with viewport overrides, not GPU timer measurements or low-end phone results. Occasional initialization or development recompilation is outside the steady samples; the raw working evidence is retained.

The six-page built-Worker measurement records five warm full-response samples per page and compressed HTML size. These loopback responses are **not** network performance or Core Web Vitals. Optional lazy scene code includes roughly182.5KB gzip for Three.js,12.2KB for the model,7.8KB for GTAO,3.9KB for the environment and1.5KB for CSS3D. Actual map transfer and decoded estimates are in EARTH-ASSETS.md. Static shadow and AO caching reduce work when only the background animates.

## Limits

Automated accessibility checks do not replace a manual screen-reader pass. Physical phones, slow-network Core Web Vitals, OS-level reduced-motion preference changes, pinch/browser zoom and sustained GPU-memory stress were not directly measured in this revision. Pause and short-viewport/WebGL fallbacks were directly exercised, and reduced-motion/Save-Data handling was inspected in source. Material richness remains simpler than the supplied offline-rendered reference images. Content still consists of explicitly labeled, editable samples.

The independent final assessment is in `docs/CRITIC-REPORT.md`; earlier critic passes and the source audit are retained with this evidence.
