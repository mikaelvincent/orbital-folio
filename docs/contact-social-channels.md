# Contact console social channels

Edit these in **Content studio → Social links**. Each record supports:

- **Platform**: GitHub, LinkedIn, GitLab, YouTube, Instagram, Bluesky, X, Website, or Custom. Presets include a bundled icon; Custom uses a link icon.
- **Display name** and optional **caption**: the words printed on the monitor. Changing a platform preserves any custom display name and never changes the URL.
- **Destination URL**: the full HTTPS profile URL; email destinations can use `mailto:`. HTTPS links open in a new tab with opener/referrer protection.
- **Console placement**: Left, Right, Automatic, or Reading view only.
- **Display order**: controls automatic placement and the existing link list.

Save a draft, preview the Contact room privately, then publish. Draft changes do not affect the live monitor. Unpublishing removes the link from public rendering.

Explicit left/right assignments take priority. Remaining screens use the first automatic links in display order. If multiple links explicitly request the same screen, the first published record by order (then ID for ties) wins; the editor displays a conflict notice. Extra links remain in the reading view. An unassigned screen is inert and displays channel standby.

The initial GitHub and LinkedIn URLs are demo platform homepages, not the owner's profiles. Replace them with the desired personal URLs before publishing a real portfolio. Existing databases are not automatically overwritten or backfilled.

## Scene implementation

The side screens reuse the Contact console enclosures with modestly wider faces, matching captive fasteners, and inward angles. The microphone sits clear of the left screen. The existing headset is secured on its floor-level dock below the right side of the desk.

A canvas texture supplies the icon and text. Geometry-free anchors survive mesh batching and position transparent native HTML links over the physical monitor enclosures. These links are only active in the settled Contact room, and participate in the existing bounded-drag cancellation. Main display geometry, screen graphics, and camera paths are unchanged. All other scene-object actions, including the central reader target, are disabled; doors, room navigation, dragging, and the explicit reading-view control remain available.

Brand paths are bundled, with no runtime network requests or added packages. See [icon provenance](social-icons/README.md).

## Shared object feedback

`createObjectHighlight` isolates an assembly's materials before batching. Every registered object uses the same smooth transition from subdued to bright, plus an amber physical rim. The rim participates in scene depth, so foreground switches occlude it correctly. Pointer hover and keyboard focus use the same feedback; dragging, travel, and reading mode clear it.

Only configured social monitors register for object interaction. Furnishing pick proxies and scene-to-reader activation paths are removed. The portal-only navigation controls remain independent of object actions.

Hover and focus use the shared scene feedback controller described in [the asset guide](ASSETS.md#interaction-and-accessibility). Pointer input takes over from retained keyboard focus without blurring the control; leaving a monitor cannot revive its old focus highlight.
