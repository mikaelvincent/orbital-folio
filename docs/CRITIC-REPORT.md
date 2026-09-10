# Independent critic — stable room proportions

**96.4/100. The scoped fix passes; no remaining blocker was found.** This fresh score covers room proportions and relative contents placement during viewport changes, with the existing camera fit and orientation behavior. It does not score unrelated portfolio features.

Reviewed renderer SHA: `55bcd774fa88f95cf5d5402eb410b4dcfb198eb3a2321b02ce6b9380030e2f23`. The physical model remains unchanged at `d49e9153b13d6f221176e16ae522e487f3312ab5686f5608753f168b364a2c67`.

| Equally weighted area | Score /10 | Finding |
| --- | ---: | --- |
| Constant cabin proportions | 9.9 | Construction stays wide at every viewport. Resize no longer changes hull width or requests the compact model. |
| Preserved contents and relative placement | 9.8 | Vessel-space geometry, transforms and relevant anchors remain invariant; the approved model source is unchanged. |
| Thresholds, fresh load and return path | 9.8 | The live sequence crosses both old morph thresholds, the portrait boundary, and returns to desktop. Fresh portrait initialization also uses the same construction. |
| Camera fit and orientation | 9.4 | Overview rotates as one rigid vessel; selected Projects remains upright. The complete overview fits in all recorded overview states. |
| Current source/runtime/visual proof | 9.3 | Actual-source checks, geometry fingerprints, 14 browser records and fresh screenshots corroborate the correction, with finite coverage limits. |

The original defect came from two different breakpoints: compact construction began at width < 900 or aspect < 1.05, while portrait rotation began below aspect 1. The source now constructs the wide vessel once and resizes its camera/canvas without calling the model’s layout-changing API. I inspected that implementation and the [source/geometry audit](evidence/stable-room-proportions/geometry-audit.json). Its 763-object vessel-space fingerprint and geometry/portal/framing metadata stay invariant through 11 orientation/update cases; aperture dimensions remain 3.416×2.775 model units. These are CPU/source checks, not browser resize claims.

I independently compared the [14 live browser records](evidence/stable-room-proportions/resize-samples.json). Every record retains the same room anchors and portal metadata. The first 13 share one renderer, including the resize sequence and return to desktop; the final fresh portrait load correctly has a new renderer. The 1050→1049 pair crosses the old aspect threshold without a shape change, 900→899 at height 700 crosses the old width threshold, and 1000→999 at height 1000 changes only the overview orientation. All 11 recorded overview support sets remain inside the camera frustum.

The [1050-pixel](evidence/stable-room-proportions/overview-1050.jpg) and [1049-pixel](evidence/stable-room-proportions/overview-1049.jpg) views show no cabin squeeze. The [fresh portrait overview](evidence/stable-room-proportions/overview-fresh-portrait.jpg) preserves the same construction after rotation. The [portrait Projects view](evidence/stable-room-proportions/projects-430.jpg) retains its locker arrangement and proportions. Fitting an unchanged wide chamber into a tall screen exposes more surrounding hull; this is a camera-fit tradeoff, not a model deformation.

Limits: screen-projected proportions can still vary with perspective and the intentional rigid rotation. The evidence consists of discrete browser samples, resized desktop viewports and bounded CPU checks, not every animation frame or physical-device testing. No new reader/admin, performance or production-runtime claim is included.
