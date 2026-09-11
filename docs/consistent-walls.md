# Consistent pressure walls

The broad stacked walls and inter-room gaps have been replaced by shared pressure walls. The finished thickness is 0.17 model units: twice the original 0.085 docking-wall reference, following the user's refinement during this iteration. Side walls counteract the horizontal layout scale so their thickness remains 0.17 in both layouts. Roof, floor, rear, docking and shared-deck surfaces use the same nominal thickness. The rounded ladder-to-cabin shoulders are blended exterior junctions around the preserved interiors.

Room centers move closer together without scaling or rearranging their contents. The C route remains Case studies → Projects → ladder → About → Contact. Cabin usable width remains 2.86 × layout scale and usable height remains 2.775; floor, ceiling and public room-framing dimensions are fixed. The ladder bay retains its existing usable height and fittings. Total rendered width reduces from 15.14585 to 14.63085 in wide layout, and 12.14585 to 11.80085 in compact layout.

The front pressure face, side partitions and curved cabin skins meet at a shared throat datum. Old thick deck slabs, duplicate enclosure surfaces and separate shoulder caps are removed. Narrow exterior shoulder closures and a rear middeck bridge close the vacated joins without adding panels inside the rooms. Wall-mounted grabs, fasteners, docking hardware and the service-bus mount follow their new wall positions.

Each passage retains two opposing blade sets. Recessed guides and graphite sleeves fit inside the shared wall. The cabin-facing half of the ladder partition borrows the adjoining room's lighting, preventing ladder hover from dimming a selected room's wall. Moving-door timing and navigation are unchanged.

Closer spacing exposed an ambient-occlusion artifact: fittings behind closed shutters could ghost through the white leaves. A bounded silhouette now represents each door only during the AO pass, following its exact curved opening and excluding concealed blade wings. It is invisible in the normal color pass and does not change interactions or the visible door geometry.

## Verification

- All 61 automated tests, typecheck and production build pass.
- Independent preservation comparison: all 330 furniture mesh instances across both layouts retain exact geometry hashes, materials, room-relative transforms, bounds, and framing dimensions.
- Rendered-surface ray tests measure the actual 0.17 partitions, roofs, floors and shared deck, as well as unchanged usable cabin width and height. Paired guide bounds fit within the walls without overlap.
- Independent geometry inspection: 960 shoulder rays find no holes; shared floor and ceiling probes find no duplicate face owners; the interior-to-front-throat join has one owner at each depth; rear cove and middeck probes reach the continuous exterior closure.
- AO regression test compares the shading silhouette against actual blade coverage at closed, intermediate and fully open positions.
- Actual desktop, selected-room, ladder passage, portrait and dragged-angle views were inspected. Closed-door ghosting is resolved.

Screenshots: `docs/evidence/consistent-walls/`.

Independent scoped critic: **97/100**, above the requested 95+ threshold. No blocking findings. The remaining deduction is a minor exterior contour mismatch: at the strongest dragged angle, square sidewall corner tips peek a few pixels beyond the rounded front face. It is not a hole or interior-size regression; any future adjustment should trim only the exterior tips.
