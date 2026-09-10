# Portrait overview callout arrival

The return to portrait overview now keeps exterior room labels and connector lines hidden while the spacecraft reorients. They fade in together after the camera settles and their final routing is recomputed. Horizontal behavior, the portfolio identity, camera movement, model and separate readers are unchanged.

Baseline: `2271e8b`. Reviewed annotation SHA: `cb7698bd069a3a0f6e2e7d1e20c088587e85c4ee395214aba7489870b360d266`.

## Cause and correction

Navigation marks the destination as home before the return flight finishes. Existing annotation presence therefore rose immediately, while labels already occupied cached positions for the final portrait pose. The still-rotating room anchors produced the crossing leaders.

`components/overview-annotations.ts` now applies an additional portrait arrival multiplier to the complete labels/lines layer. It stays zero throughout `home && travelling`, then eases toward one. Hidden callouts remain inert and accessibility-hidden until opacity reaches 0.9. Initial overview and immediate reduced-motion arrivals remain immediate. Cancelling a return preserves the multiplier while ordinary presence fades, preventing a flash. Horizontal updates use a multiplier of one and retain the original output.

## Live visual inspection

Root and the independent critic inspected the actual GPU render at 430×932 during a Projects-to-overview return:

- [Turning](evidence/portrait-callout-arrival/02-turning.png): the spacecraft is visibly mid-rotation; labels and leaders are absent.
- [Revealing](evidence/portrait-callout-arrival/03-reveal.png): the ship has reached its vertical orientation; the complete callout layer begins fading in along its final routes.
- [Settled](evidence/portrait-callout-arrival/04-settled.png): all four labels reconnect cleanly in their approved arrangement.

The [browser trace](evidence/portrait-callout-arrival/portrait-browser-trace.json) contains 314 time-spaced DOM observations across 8.4 seconds. All 276 travelling observations have opacity zero and `aria-hidden=true`. The 38 settled observations show a monotonic reveal. Screenshot records include DOM observations immediately before and after capture. The same renderer stays active throughout. These are observations, not a claim to capture every rendered frame; the roll diagnostic is periodically published and is not frame-exact. Live opacity and accessibility attributes complement the screenshots.

A supplemental [1440×900 horizontal trace](evidence/portrait-callout-arrival/landscape-browser-trace.json) confirms that callouts still gain presence during travel. Exact preservation is established by the actual-module comparison below.

## Independent temporal comparison

The [portable audit](evidence/portrait-callout-arrival/temporal-audit.mjs) executes the real baseline and candidate annotation modules and spring math with deterministic DOM measurements. Its [results](evidence/portrait-callout-arrival/temporal-audit.json) show:

- Identical horizontal rendered annotation output across 900 simulated frames, including paths, label transforms, opacity, highlights, interaction state and identity.
- Zero premature portrait callout visibility across 120 travel frames; the baseline displayed callouts in all 120.
- A monotonic arrival fade, without early interaction or identity changes.
- Passing interrupted/restarted return, fresh overview, reduced-motion arrival and portrait-to-horizontal cases.

```sh
node docs/evidence/portrait-callout-arrival/temporal-audit.mjs . 2271e8b /tmp/portrait-callout-audit.json
```

Typecheck, lint and production build pass; existing build warnings are recorded in [checks.json](evidence/portrait-callout-arrival/checks.json). Browser error/warning logs were empty in the inspected preview. The [independent critic](CRITIC-REPORT.md) scores only this fix. Coverage is bounded source/module and desktop-browser viewport inspection; no physical-device, performance, reader/admin or deployment certification is claimed. The local preview remains running.
