# Room fittings and navigation during travel

## Room replacements

- About: replaced the two auxiliary pouches beside the berth with a bedding roll, fabric binding, retaining bands, buckles, and rear keepers fixed to its mounting board.
- Projects: replaced the additional right vent with one continuous coiled diagnostic lead, captive plugs, and keeper straps.
- Case studies: replaced the additional left vent with three sealed spare recorder cores, held by retaining bands and locking catches.
- Contact: replaced the remaining right-wall plaque with capped bayonet connectors. Removed the old port bars that would have intersected the new sockets.

These passive fittings stay within the existing room envelopes. Main signs, door labels, furniture, screens, and existing interactions retain their positions.

## Navigation behavior

Ordinary doors belonging to the room being approached can open on hover or keyboard focus during camera travel. Their exact portal identity is carried through feedback and picking; this does not enable general room highlighting, object interaction, or camera steering during a flight. Moving away removes only the hover request; the camera continues to own any door needed for its current route.

Door clicks, room-menu choices, and Home/overview share one pending destination. The newest valid request replaces the previous one. Selecting the current arrival room clears that pending detour. Intermediate waypoints and resizing cannot consume the queue. Only final arrival consumes it, before dispatching the next move, without an intermediate arrival-focus jump. URL and content state change when the next move starts, rather than when it is queued.

Ladder-door hover, route anticipation, and the one-door interlock are unchanged. Browser history and reading-view transitions bypass or discard the queue rather than leaving a hidden pending flight.

## Verification

- `npm run check`: type checking and all 113 tests passed. Production build passed. Browser inspection reported no console errors.
- All four replacements inspected in actual desktop room views; compact layout checked separately. Independent geometry and visual review found no remaining mounting or clearance issues.
- Regression coverage in `tests/door-travel.test.mjs` verifies exact ordinary-door hover in both layouts, pointer departure, ladder exclusions, single consumption, Home/menu/door replacement, and cancellation by selecting the arrival room.
- Live approach to Projects: the ordinary Case studies door was opening while the camera was still traveling. A queued move began on the next rendered frame after Projects arrival (33.3 ms in the captured run), with no door-wait frames.
- Live replacement sequence: Case studies → Home → Case studies → Home while approaching Projects ended at Home with an empty queue. A separate menu sequence Projects → Home → current arrival cleared the queue and stopped at that arrival.
- Evidence is in `docs/evidence/fittings-and-travel/`: room screenshots, `queued-flight.json`, and `single-queue.json`.

Local preview only; no deployment.
