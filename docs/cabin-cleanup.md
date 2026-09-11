# Cabin cleanup and Contact fitting repair

Removed the decorative orange lifting tabs from cabin roofs. The tabs above
the lower deck also protruded into the upper cabin floors, explaining the loose
orange squares beside the workshop feet. Removed the back and side floor
stripes while preserving the existing navy floor material and structural trim.

The aft service housing extended 0.094 units past the inner pressure wall,
creating circular intrusions in Contact and Case Studies. Its inboard geometry
now terminates inside the wall in both layouts, preserving the exterior shape.

Contact's microphone base and cable connector now sit fully on the working
deck. The bent neck retains the capsule's position beside the social display.
The headset dock references the floor directly and clears the desk, right foot,
and cabin wall. Ten rear mounting necks meet the actual curved pressure-wall
profile, with fixed wide and compact variants that retain display positions.

## Verification

- Typecheck and main suite: 80 tests passed.
- Additional Contact fitting regression suite: 4 tests passed.
- Changed-file formatting and lint: passed.
- Sites portable production build: passed.
- Independent scoped critic: 98/100, no blocking findings. Its preservation
  audit confirmed unchanged room dimensions and all 252 protected meshes in the
  other three rooms across both layouts.
- Inspected all four room views at 1440×900, Contact at 900×900 and 390×844,
  desktop tilt, and the vertical overview. Navigation and social display
  transforms retain their previous behavior.

## Visual evidence

- [Contact](evidence/cabin-cleanup/contact-desktop.jpg)
- [Contact tilted](evidence/cabin-cleanup/contact-tilted-desktop.jpg)
- [Contact compact](evidence/cabin-cleanup/contact-compact.jpg)
- [Contact portrait](evidence/cabin-cleanup/contact-portrait.jpg)
- [Projects](evidence/cabin-cleanup/projects-desktop.jpg)
- [Case Studies](evidence/cabin-cleanup/case-studies-desktop.jpg)
- [About](evidence/cabin-cleanup/about-desktop.jpg)
- [Tilted overview](evidence/cabin-cleanup/overview-tilted-desktop.jpg)
- [Portrait overview](evidence/cabin-cleanup/overview-portrait.jpg)
