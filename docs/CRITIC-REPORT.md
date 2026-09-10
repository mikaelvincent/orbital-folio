# Independent critic: portrait callout arrival

**96.8/100 — passes the scoped 95-point target. No remaining scoped blocker identified.** This review covers premature portrait overview labels/leaders and preservation of horizontal behavior, against baseline `2271e8b`. Final annotation SHA-256: `cb7698bd069a3a0f6e2e7d1e20c088587e85c4ee395214aba7489870b360d266`.

| Equally weighted area | Score / 10 | Finding |
|---|---:|---|
| Suppression during portrait return | 9.9 | Labels and SVG leaders remain completely hidden throughout observed travel and reorientation. |
| Reveal after arrival | 9.7 | The complete group fades in together only after the vessel reaches its final portrait orientation. |
| Horizontal behavior preservation | 9.9 | 900 actual-module comparison frames match the baseline annotation output exactly. |
| Interaction and lifecycle handling | 9.6 | Hidden/faint callouts remain inert; interruption, restart, fresh overview and immediate settlement are covered. |
| Source-bound verification | 9.3 | Temporal GPU evidence, independently recomputed observations, module comparisons and passing checks agree. |

I inspected the current source and refreshed [turning](evidence/portrait-callout-arrival/02-turning.png), [arrival reveal](evidence/portrait-callout-arrival/03-reveal.png) and [settled](evidence/portrait-callout-arrival/04-settled.png) captures. The turning image shows the vessel at an intermediate angle without crossing lines. The reveal image already has the final upright portrait overview, with labels and leaders appearing together.

My recomputation of the [browser trace](evidence/portrait-callout-arrival/portrait-browser-trace.json) found 314 observations over 8.404 seconds, using one renderer. All 276 travelling observations have opacity zero and `aria-hidden=true`. The following 38 settled observations increase monotonically, beginning at opacity 0.00546 with roll already approximately π/2; none exposes the callouts before opacity reaches 0.9. These are DOM observations, not a frame-rate measurement. The [independent summary](evidence/portrait-callout-arrival/critic-trace-check.json) records the calculation.

I also inspected the [temporal audit and implementation](evidence/portrait-callout-arrival/temporal-audit.mjs). Its [results](evidence/portrait-callout-arrival/temporal-audit.json) compare the real baseline and candidate modules: horizontal opacity, SVG paths/dots, button transforms/highlights, identity, and accessibility state match across 900 normal/reduced-motion frames. Portrait cancellation/restart, fresh overview, reduced settlement and switching back to landscape pass. The new factor affects only the callout group; identity retains its original behavior.

[Typecheck, lint and build pass](evidence/portrait-callout-arrival/checks.json). Existing build warnings remain documented. The live visual sequence uses a desktop browser at 430×932; edge cases use deterministic DOM measurements and actual module/spring code, not physical-device or cross-browser certification. No unrelated room geometry, reading interface, administration, deployment or performance claim is included in this score.
