# Portrait Earth placement — 20 September 2026

Baseline: `e716ab0`. The owner requested Earth at the bottom-left when the
spacecraft is vertical, matching the landscape composition. This explicitly
revises the preceding fully fixed-world treatment of layout roll.

## Change

The background retains its real physical camera. Earth and its existing
atmosphere alone compensate for the continuous layout-roll value, using the same
world Z pivot as the vessel camera. Conjugating that transform through the fixed
orbital registration preserves translation and scale. Each changed roll is
computed from the authored transform; there is no accumulated rotation. Zero roll
restores the original landscape transform. Actual hover, drag and room travel
remain visible, as does the surrounding sky's full physical camera motion.

Texture, opening geography, playback phase, rotation speed, geometry, materials,
atmosphere light direction and camera lens are unchanged. The regional map is not
re-aimed or reloaded during resize. The existing atmosphere remains softly lit in
the reviewed portrait views without modifying its shader.

## Visual review

Hidden built-in Chromium, actual CSS viewports (not resized screenshots):

- [Before phone](before-phone.jpg) and [after phone](after-phone.jpg), 390×844:
  the thin vertical horizon at the right is replaced by a lower-left horizon and
  illuminated terrain across the bottom. These are composition comparisons, not
  texture-phase-matched pixel-difference measurements.
- [Tablet portrait](after-tablet.jpg), 768×1024: the horizon stays below the
  spacecraft without competing with the title or room labels.
- [Landscape](after-landscape.jpg), 1280×720: the original composition remains.
- [Room-entry snapshot](portrait-transition.jpg) and [Contact arrival](after-phone-contact.jpg),
  390×844: the lower horizon remains coherent as the layout roll unwinds.

Browser actions also exercised portrait drag-and-release, phone/tablet/landscape
resizing, Contact entry and return to overview. Captures document individual
states, not an exhaustive transition video. The projection regression checks
intermediate roll values and returning to zero with physical camera movement.
Captured browser warnings/errors were empty. No native Safari or user-screen
recording was used.

## Cost and verification

This is an authored placement correction, not an optimization. It adds four
reusable CPU matrices and recomputes Earth's presentation only when layout roll
changes. It adds no texture request/upload, geometry, shader, material or draw
pass. Different visible Earth coverage can change fragment work; no new timing,
heat, battery or whole-application performance claim is made. Previous timing
results remain specific to their source revisions.

- **344 tests passed, 0 failed**: [full suite](tests.log).
- [Typecheck](typecheck.log), [affected lint](lint.log) and [production build](build.log)
  passed. Build output retains the existing chunk-size and Vinext route-analysis
  notices. Subsequent executable source is unchanged; only comments were clarified.
- The [renewed crop audit](coverage-method.md) passes **48,314 poses**. The minimum
  retained margins are **85.333 north / 137.927 south source rows**, exceeding the
  chosen 64-row allowance. No texture change is needed. The coverage audit still
  describes a bounded set of viewports and pose neighborhoods, not every camera.
- The [independent critic review](critic-review.md) scores **94/100**, with no
  unresolved blockers and a recommendation to keep the fix; it records the rubric
  and limitations.
