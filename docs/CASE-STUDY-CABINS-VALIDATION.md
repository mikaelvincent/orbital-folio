# Case study cabin render validation

This iteration covers only the spacecraft render, lighting, room navigation and related input. The temporary independent-review target is 75/100, with a 6/10 floor per area; deferred readers, forms, admin interfaces and future content work are excluded.

The previous [natural-orbit review](CRITIC-REPORT-NATURAL-ORBIT.md) remains historical. The fresh result is in [CRITIC-REPORT.md](CRITIC-REPORT.md).

## Implementation

- Three distinct brightness states, driven by hover, actual passage and settled arrival.
- Case studies at upper right, Projects at upper left, stairs at left, About below left and Contact below right.
- Two cabinet racks with separate data and hover state; Case studies uses existing editable experience entries.
- Side-door plaques centered over their openings without independent lighting.
- One enlarged, centered database-derived hull nameplate.
- Native navigation ordered Case studies, Projects, About, Contact; `/case-studies` maps to the existing persisted section key.

A data-only migration renames untouched default labels while retaining custom owner copy and draft/public separation. Earth and the space background are unchanged. The model remains an editable procedural asset; keeping the existing content key reduces migration effort until the separate Case studies reader is designed.

## Verified evidence

The [browser record](evidence/case-study-cabins/browser-qa.json) and actual screenshots show the revised [desktop overview](evidence/case-study-cabins/desktop-overview-idle.jpg), [selected Case studies cabin](evidence/case-study-cabins/production-case-studies.jpg), [three simultaneous room levels](evidence/case-study-cabins/door-hover-three-levels.jpg), and [320-pixel overview](evidence/case-study-cabins/phone320-overview.jpg). Brightness targets are material multipliers, not measured luminance: 0.10 idle, 0.50 hover/transit and 1.00 selected. Filmic rendering affects their perceived relationship.

The final [159-frame flight trace](evidence/case-study-cabins/transit-lighting-trace.json) crosses Case studies, Projects, the left passage, About and Contact, with minimum camera X −5.599501. Intermediate rooms receive the medium target. Contact stays at or below 0.50 until arrival and then reaches 1.00; the departing room fades from its prior selected state. Development diagnostics retain the completed flight separately from the rolling trace so later captures cannot overwrite it.

The [focused model audit](evidence/case-study-cabins/model-audit.json) passes 216 independent cabinet mappings, 50 lighting states, 16 route pairs, 108 portal views, 12 door-plate mounts and 108 passage rays. It checks finite geometry, matte signs, one branding record, stable exterior materials and zero emissive pathway output. The [independent lighting audit](evidence/case-study-cabins/critic-lighting-audit.json) checks conflicting hover during transit and delayed full selection. These CPU checks support the rendered images; they are not GPU visual tests.

The [routing/migration audit](evidence/case-study-cabins/routing-migration-audit.json) passes 29 scoped checks, including independent draft/published updates, owner-customized text, unpublished content, idempotence and both public/preview route aliases. It records an existing embedded-query preview-helper limitation separately; the current caller appends its query after path conversion. The [local migration log](evidence/case-study-cabins/migration.txt) confirms application; the local database retains nine published projects and three editable Case studies entries.

[Phone menu](evidence/case-study-cabins/phone320-menu.jpg) evidence verifies the requested order, Tab entry, Escape focus restoration and persistent Home return, with zero horizontal overflow. A fresh [axe check](evidence/case-study-cabins/phone320-axe.json) reports zero violations and 17 passes. An [atomic native mouse check](evidence/case-study-cabins/native-drag-final.json) records a 247-pixel bounded drag in overview, no activation and unchanged URL. It does not claim a new physical-touch or screen-reader pass. The mislabeled `production-case-studies-drag` exploratory record is excluded.

## Build and practical limits

Typecheck, lint, the scoped audits and production build complete successfully. The [production route check](evidence/case-study-cabins/production-http.json) verifies `/case-studies` and its 11 referenced assets. A single live production scene at 1440×1000, effective DPR 1, records 360 frame intervals at 16.7 ms median / 33.6 ms p95. This is one host measurement, not a frame-rate guarantee or comparison with the previous iteration. No cloud algorithm change or performance gain is claimed.

The [browser log](evidence/case-study-cabins/browser-logs.json) retains an earlier development-only invalid-framing error during viewport resizing. The resize handler now skips transient dimensions below 240×480 until the existing fallback or normal layout settles. No production-source error appears in the retained log window; this is a defensive fix, not an exhaustive resize certification.

Physical side-wall labels remain perspective-dependent. On narrow phones, the compact menu supplies the fully readable destination labels. Long sample cabinet titles can truncate, and the collapsed 320-pixel navigation trigger abbreviates Case studies while its open menu shows the full label. These are current presentation limits; deferred readers and future content work were not scored as missing features.

The dev server remains at `http://localhost:3000/`. After a production rebuild, restart the temporary preview to load matching SSR asset references. Editable scene details are documented in [ASSETS.md](ASSETS.md).
