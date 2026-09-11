# Exterior hull visibility

The ladder bay's upper and lower curved outer walls had inward-facing triangles.
Back-face culling therefore hid the pressure skin when the ship tilted to expose
its exterior. Reversing those triangles makes both curves face outward and also
corrects their generated lighting normals. The material remains single-sided;
the fix does not conceal the defect with double-sided rendering.

Only triangle order changes. Wall positions, thickness, openings, ladder fittings,
room contents, screen layouts, and camera behavior remain unchanged.

## Verification

- New regression tests inspect the real, batched hull in wide and compact layouts.
  They check geometric and shading normals on both curves and raycast at normal
  incidence, ±40°, and ±75° to catch angle-dependent disappearance.
- Independent bow audit: 774 exterior probes failed before the fix; all 774 pass
  afterward. Opposite-side probes now correctly miss.
- Independent surrounding-shell audit: all 3,900 probes pass across roof, keel,
  rear panels, shoulder fairings, and the rear middeck bridge.
- Typecheck, all 66 tests, changed-file lint, and the production build pass.
- Actual desktop and portrait renders were inspected at opposing combined drag
  angles. Both curved ends remain solid; the browser reported no errors.
- Independent scoped visual critic: **99/100**, with no blocking findings.
  Its preservation audit found zero changes across 330 cabin meshes and all
  recorded room, walkway, and overview bounds.

Before/after renders and probe reports are in `docs/evidence/hull-visibility/`.
