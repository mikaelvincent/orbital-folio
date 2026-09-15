# Raw run index

Reports are losslessly gzip-compressed JSON. Each includes its original source/bundle/asset manifest, settings, telemetry and raw samples. `summary.json` provides selected fields without replacing raw evidence. PNG names inside each report remain unchanged.

| Report (`.json.gz`) | Status and qualification |
| --- | --- |
| [contact-baseline-1280x720-1789471919471](contact-baseline-1280x720-1789471919471.json.gz) | descriptive-baseline-not-a-cross-device-ranking. Descriptive forward/reverse target survey, not a rested cross-room ranking. |
| [contact-survey-1280x720-1789476171774](contact-survey-1280x720-1789476171774.json.gz) | descriptive-only-no-timing-ranking. Unranked descriptive costs only; substantial reference drift. 24 windows,120frames each; no speedup/slowdown claim. |
| [contact-timing-1280x720-1789475069536](contact-timing-1280x720-1789475069536.json.gz) | inconclusive-readiness-state-or-webgl. Excluded, no ranked candidate blocks. Stale verifier WebGL1281. |
| [contact-timing-1280x720-1789476010957](contact-timing-1280x720-1789476010957.json.gz) | inconclusive-readiness-drift. Excluded, no ranked candidate blocks. Reference drift beyond limits; all GL checks zero. |
| [contact-verify-1280x720-1789472169398](contact-verify-1280x720-1789472169398.json.gz) | failed. Failed before candidate rendering; input budget exceeded. |
| [contact-verify-1280x720-1789472801900](contact-verify-1280x720-1789472801900.json.gz) | failed. Failed before candidate rendering; input budget exceeded. |
| [contact-verify-1280x720-1789473818867](contact-verify-1280x720-1789473818867.json.gz) | complete-visual-differences-require-review. Pilot: invalid reader route; no per-pair GL guards. Other images descriptive only. |
| [contact-verify-1280x720-1789474331553](contact-verify-1280x720-1789474331553.json.gz) | complete-visual-differences-require-review. Superseded verifier: no per-pair GL validation; retained pilot images. |
| [contact-verify-1280x720-1789475460475](contact-verify-1280x720-1789475460475.json.gz) | complete-visual-differences-require-review. Final visual replay; subdivision diagnostic separate from B/C. No appearance-equivalence claim. |
| [contact-verify-390x844-1789474877853](contact-verify-390x844-1789474877853.json.gz) | complete-baseline-fallback-at-this-width. Superseded verifier: no per-pair GL validation; retained pilot images. |
| [contact-verify-390x844-1789475875422](contact-verify-390x844-1789475875422.json.gz) | complete-baseline-fallback-at-this-width. Final visual replay; subdivision diagnostic separate from B/C. No appearance-equivalence claim. |
| [contact-verify-900x1200-1789474603186](contact-verify-900x1200-1789474603186.json.gz) | complete-visual-differences-require-review. Superseded verifier: no per-pair GL validation; retained pilot images. |
| [contact-verify-900x1200-1789475745140](contact-verify-900x1200-1789475745140.json.gz) | complete-visual-differences-require-review. Final visual replay; subdivision diagnostic separate from B/C. No appearance-equivalence claim. |

The two failed bake attempts retain their error reports. The first exact backend input was not saved; the second is `input-38748a99bf5010b6.json.gz`. The completed bake uses `input-3fa77f873c75245b.json.gz` and `contact-90260d9e7526b9cb.json.gz`, with descriptor `bake-2e4982ee8244a196.json`. `sizing.json` includes ray-free .10/.12/.14/.16/.20 alternatives.

Original pilot and final PNGs are retained, including known-invalid first-pilot reader captures. Use the final38a41135 reports for verified comparisons. Superseded images are not silently promoted to final evidence.
