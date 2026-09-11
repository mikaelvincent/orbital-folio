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

A canvas texture supplies the icon and text. Geometry-free anchors survive mesh batching and position transparent native HTML links precisely on the glass. These links are only active in the settled Contact room, and participate in the existing bounded-drag cancellation. Main display geometry, screen graphics, camera paths, and central reader target are unchanged.

Brand paths are bundled, with no runtime network requests or added packages. See [icon provenance](social-icons/README.md).

## Verification

- Preset/custom selection and saved custom draft inspected in the studio and private room preview.
- Public preset and private custom records render independently.
- GitHub keyboard activation and LinkedIn activation open separate tabs; the portfolio remains in the room.
- Dragging from a screen cancels activation. Returning to overview removes screen links from the accessibility tree.
- Desktop and portrait room screenshots inspected, including keyboard focus alignment.
- Automated tests cover placement, legacy records, custom content, URL rejection, gesture cancellation, and draft/publish/unpublish persistence.

Independent visual review: **96/100** for this iteration's scope. No blocking overlap, clipping, or integration defects. Secondary captions are small at mobile room scale; existing camera framing was outside this change. Main console unchanged. Production build, typecheck and lint pass. The full test run passed all runnable cases; an existing extensionless metadata import prevented the flight test file from loading under Node 26. Adding the explicit `.ts` extension resolved that, and all four flight tests passed on rerun.
