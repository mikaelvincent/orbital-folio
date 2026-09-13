# Justified room spacing and centered wayfinding

This refines the earlier grid pass: functional screen and archive grids stay intact, while independent furnishings are positioned within their own available space.

The eight upper wall vents share the room headings' vertical center and visible face depth. Each vent is centered between the complete sign and its side wall in both layouts. Room headings retain their text and plaque dimensions but now have shallow, contoured rear housings instead of long standoffs. Their fasteners engage the rim, and the housing follows the actual curved pressure wall.

Each door and its caption form one justified composition. The floor-to-door, door-to-sign, and sign-to-ceiling gaps are equal. Horizontal placement now follows the **exposed interior wall**, excluding hidden rear wall thickness and the front collar. Cabin iris guides have equal 0.1255 rear/front margins; ladder guides have equal 0.063 margins measured from the cove return. Ordinary captions account for the rear curve at their own height. Structural holes, reveal lighting, iris guides, hit geometry, and metadata follow their corresponding placements. Room dimensions and the camera/navigation algorithms are unchanged.

Door captions now sit on shallow 0.032-deep carriers directly against their walls. The former long feet and 0.115–0.127 face offsets exaggerated their apparent rearward displacement in the room view. Text size, plate size, colors, and captive details are retained. Placement remains fixed in the architecture as the camera moves.

Projects' drawers and task lights are justified between the inner bench supports and vertically within the underbench area. Its two side fittings balance the gap between worktop and upper vents. Case studies distributes its two left fittings with equal gaps; the single right fitting is centered in its own available wall area. Complete Contact and Case wall racks are centered vertically within their walls. Contact's rear conduits split the remaining screen-to-wall gaps evenly.

About's complete reading station moves right by 0.085 m to clear the retained curtain. Library, prints, desk, journal, lamp, pen, mounts, restraints, and screws move together. The folded perch follows the desk; the locker remains centered in the remaining edge space.

Validation: type checking, production build, and 32 focused checks passed. Tests cover actual aperture/guide coincidence through the wall thickness, supported caption footprints, equal margins, vent-to-label alignment, physical wall containment, text visibility, camera framing, and existing hover/travel/interlock behavior. Independent geometry review confirmed header mounting and fastener contact in both layouts. Live desktop and 390×844 views were inspected; screenshots are in `docs/evidence/justified-spacing/`. Local preview only.

Visible-wall centering follow-up: type checking, production build, and the relevant wayfinding, iris, wall layout, room framing, and cabin utility checks pass. Regression checks raycast the actual exposed lining, verify balanced iris margins, supported caption footprints and seated backings, and retain full-depth aperture concentricity checks. All four room views were inspected at desktop and narrow widths, including normal and angled views and navigation through the ladder. Updated evidence is in `docs/evidence/visible-wall-centering/`.
