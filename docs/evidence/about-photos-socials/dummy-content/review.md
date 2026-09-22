# Independent review of local demonstration content

22 September 2026. Reviewer: independent `proposal_critic` agent.

**94/100 — approved, with no blockers for this content setup.** Runtime source
remains at `5f2bb73`; this review does not rescore or claim new implementation
tests. The reviewer performed only read-only verification and wrote this record.

| Criterion | Score | Assessment |
| --- | ---: | --- |
| Requested result and visual quality | 27/30 | The main square portrait and all three social photographs are populated and visually coherent with the study. Desktop composition is clear; compact room views retain recognizable platform marks. Reading view presents the same three destinations with comfortable controls. |
| Preservation of existing content | 30/30 | Independent comparisons confirm 31 unrelated records are identical. The identity and two reused seed links changed only in permitted portrait/About fields. No unrelated private draft was published and Contact placements remain intact. |
| Provenance and reversibility | 19/20 | Fictional image provenance, prompts, original PNGs, delivery files and hashes are retained. Before/after snapshots are private and ignored by Git. Setup IDs and hashes support a targeted reversal without restoring unrelated content. |
| Verification and scope discipline | 18/20 | Live stored records and anonymous media bytes were independently verified. Actual desktop, phone and Reading view captures document the result. No runtime changes, database reset or mutating test suite was needed. Device and upload-limit limitations are explicit. |

## Independent verification

- Read the guarded setup script and checked its empty-slot/empty-portrait,
  exact-seed, identical draft/published, validation-equality and fresh-revision
  preconditions. It uses the ordinary authenticated loopback upload/content APIs.
- Compared private before and after snapshots without printing their contents.
  Counts are 34 before and 38 after. All 31 unrelated existing records match
  exactly. For the three modified records, both draft and published content match
  their originals after excluding only the explicitly allowed photo/slot fields.
- Read the current localhost:3000 records. Their complete contents match the
  private after snapshot. There are exactly three new media records and one new
  Website link.
- Confirmed both snapshots have owner-only read/write permissions and are ignored
  by Git. No snapshot contents or private environment files enter this evidence.
- Recomputed all three original PNG hashes and all three delivery WebP hashes and
  lengths against the asset manifest. Independently fetched the three managed
  media URLs without authentication: each returned HTTP 200 and the exact expected
  delivery bytes.
- Inspected the generated portrait, desktop room, 390 × 844 phone room and
  Reading view screenshots, plus the recorded browser observations. The room
  uses the configured photographs; all three reader links are present. The
  recorded phone targets are 26.31 pixels square and reader links are 44 pixels
  high. Browser logs contain no reported errors.

## Findings and limits

The portrait is explicitly fictional in its alternative text and developer
provenance. None of the images is represented as evidence of the owner's real
identity, workspace or travels. GitHub and LinkedIn retain their existing sample
homepage destinations; Website uses example.com. These remain replaceable demo
destinations, not verified owner profiles.

One documentation clarification was requested: removing demo media requires
clearing the Social photo selections as well as About positions on reused links,
then saving/publishing those links. Setting a position to Off alone retains its
image reference and therefore retains media-deletion protection.

Visual checks use hidden built-in Chromium, not native Safari or a physical
touch device. The Reading view capture is scrolled to the focused Website link,
so part of its portrait is above the viewport; the browser reports the portrait
loaded and the full mounted image is visible in the room capture.

The original PNG and lossless WebP upload attempts received HTTP 413. The precise
rejecting layer remains uninvestigated. The final three quality-90 WebP images,
at their original 1254-square dimensions, uploaded successfully and total 545,676
bytes. This limitation does not block displaying the requested dummy content;
it does not establish that larger owner uploads will work. No upload limit or
application code was changed, and no application suite was run against the main
store. No performance or Safari behavior claim is made.
