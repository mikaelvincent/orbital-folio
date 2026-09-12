# Furnished outboard walls

Contact and Case studies now have passive equipment on their previously empty right walls. Both use the existing ivory enamel, graphite, satin metal and restrained amber palette, with a shared mounting-rail and service-lamp design.

- Contact: two replaceable uplink/voice radio trays, instrument meters, guarded selectors, captive pulls, strain reliefs, clamped cable looms on crossmembers, and a ventilated distribution enclosure.
- Case studies: two numbered recorder media sleds secured by retaining bridges, buckles and end stops, above a stowed inspection leaf with a ribbed pad, hinges and mechanical lock.

The independent equipment roots follow the actual outboard wall datum when the cabin layout changes. Uniform compact scaling occurs about their wall-mount plane, preserving contact with the wall. The existing cabin dimensions, furnishings, framing, navigation, door behavior and social links are preserved. All added meshes, including instanced fasteners, are excluded from picking.

## Validation

- Typecheck, all **101 tests**, and production build pass.
- New geometry checks ray-cast the real rendered wall behind each equipment footprint through wide → compact → wide changes, checking wall contact, containment, front/floor/ceiling clearance, and passive pick behavior.
- The existing service-housing test now ignores intentional fixtures only for its interior wall probes; the original housing containment and all exterior probes remain intact.
- Independent fit review checked 18,690 Contact fixture/furniture part bounding-box pairs in each layout with zero collisions; all four mounting feet met the pressure wall.
- Inspected desktop, 800 × 900 tablet and 390 × 844 portrait previews. Independent scoped visual critic: **97/100**, no blockers. Final browser log contained no errors.
- Local preview returned HTTP 200 at `http://localhost:3000/` and remains running for review.

Actual preview images are in [evidence/outboard-equipment](evidence/outboard-equipment/).
