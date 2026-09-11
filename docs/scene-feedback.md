# Scene hover and keyboard focus

Room callouts, physical doors, navigation-menu destinations, and social monitors share one feedback controller. Pointer input highlights the current topmost target. Keyboard input highlights the currently focused, visible control. DOM focus remains intact when switching to the pointer, but no longer keeps a previous room or object lit.

The renderer consumes the latest pointer position once per frame. It checks native controls before the room/door pick volumes, so menus and unrelated toolbar controls block picking through them. The target is resolved again as the camera or controls move. There is no dropped trailing event from the previous 70 ms throttle, and no React hover-state round trip competing with native focus events.

Drag, navigation, pointer cancellation, window blur, and hidden-page transitions clear stale feedback. Touch does not create hover. Inert, hidden, detached, and unavailable targets cannot highlight. A room arrival focuses the main content landmark instead of selecting an arbitrary door. Explicit keyboard navigation, native social links, door activation, bounded dragging, and the reading-view control remain available.

## Regression checks

Automated tests cover pointer departure with retained DOM focus, rapid A → B → blank movement within one frame, moving or removed controls under a stationary pointer, keyboard/pointer ownership, drag/travel/cancellation reset, touch, and focus loss. Existing material-highlighting, camera, navigation, and social-link tests also pass (22 tests total).

Native browser checks cover keyboard door/console focus followed by pointer departure; alternating social monitors, doors and blank space; toolbar occlusion; menu hover and keyboard navigation followed by Escape; opening and returning from a social link; dragging from a console without activation; and neutral arrival after door navigation.

All four exterior labels were checked in portrait overview, with clean clearing on pointer departure. A sustained hover at the Projects/ladder doorway boundary remained stable and cleared on moving back into the room. The independent reviewer compared hover and neutral screenshots and scored the scoped fix **97/100**, with no blocking issues or unintended render changes. Typecheck, lint, and production build pass.
