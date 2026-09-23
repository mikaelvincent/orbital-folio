# Operation and deployment

## Runtime

The application uses React 19, Vinext (Next.js-compatible server rendering), Cloudflare Workers, D1 (SQLite), and R2-compatible object storage through Sites. There are no paid external email, CMS, analytics, font, or image-generation services required. A successful build emits `dist/server/index.js`, public assets in `dist/client`, and migration/hosting metadata.

D1 and R2 are durable managed resources. Do not replace them with the Worker’s ephemeral filesystem. Local equivalents live under `.wrangler/state`; deleting that directory deletes the local database and uploads. Keep it out of Git and preserve it across server restarts.

## Isolated verification

`npm test` includes API/workflow tests that create, update and delete records;
`npm run check` includes that suite too. Their default target is
`http://localhost:3000`, so running them against the owner's development server
can change persisted content. Restore hooks are not a preservation guarantee:
validation can discard legacy fields when restoring a snapshot.

Run full suites and any mutation-bearing tests in a disposable source checkout:

1. Copy source only, excluding `.dev.vars`, `.env*`, `.wrangler`, backups and
   private exports. Initialize fresh test-only secrets and isolated D1/R2 stores
   there. Never clone the main database or uploads for these tests.
2. Start a separate loopback server on an unused port using that checkout and its
   own emulator state. Installed dependencies may be shared; keep the temporary
   Vite cache in the test directory too. Leave the main server and store intact.
3. Run tests **from the disposable checkout**, since some read `.dev.vars` from
   the current directory, and explicitly select the test server; for example,
   `TEST_BASE_URL=http://localhost:3003 npm test`. Verify both the target URL and
   state paths before running. Focused pure unit tests may use the main checkout
   only after confirming that they do not call live endpoints or mutate storage.
4. Stop and remove only the temporary server and test state after verification.
   Do not print, commit or copy test secrets into the main workspace.

## Authentication boundary

The production studio uses **Sign in with ChatGPT** through the Sites gateway. Authentication identifies a visitor; the database `admins` allowlist separately authorizes owners. Every protected read, mutation, preview, export, and draft-image request checks that allowlist on the server.

The gateway supplies authenticated `oai-authenticated-*` headers. Those headers are trustworthy only behind that gateway. **Do not expose the raw Worker through workers.dev, a direct Worker URL, or a reverse proxy that permits user-supplied identity headers.** Sites deploys the Worker behind its dispatcher. If moving away from Sites, replace `app/chatgpt-auth.ts` with a maintained identity provider or a trusted gateway that strips incoming identity headers and verifies a session before setting them. This is an explicit hosting dependency, not a portable password-authentication implementation.

The local Sites Vite plugin supplies a simulated sign-in flow on loopback. It strips forged identity headers, accepts only its local development cookie, and is removed from production builds. No default password or owner secret is committed to source.

Production session lifetime, expiration, and logout are managed by the identity gateway. The application does not create a second password/session system. Owners can revoke other owners immediately in **Access & portability**; they cannot revoke their own access there.

## First owner and secrets

Configure these secrets before deploying:

- `ADMIN_SETUP_KEY`: a cryptographically random 32-byte hex value. Used once, alongside authenticated sign-in, to claim an unowned portfolio.
- `RATE_LIMIT_SALT`: a separate random value used to hash rate-limit keys.

`npm run setup` creates both in `.dev.vars` with restrictive permissions. `.env.example` documents the names. For Sites deployment, set them as secret environment entries through Sites, then deploy the saved version. Do not put secret values in `.openai/hosting.json`, URLs, Git, or public documentation.

An atomic database insert prevents two people claiming the first-owner slot. After the first claim, knowledge of the setup key alone grants no additional access. Remove or rotate that setup secret once the real owner has claimed the hosted portfolio. Additional owners are authorized by their ChatGPT email in the studio; they must still authenticate.

To recover from losing all owner identities, use the hosting provider’s authenticated database console to update the `admins` table after verifying ownership of the deployment. Do not add a public recovery endpoint.

## Publish with Sites

1. Install the lockfile with `npm ci`, apply required checks, and run `npm run build`.
2. Reuse the `project_id` in `.openai/hosting.json`. Preserve logical D1 `DB` and R2 `MEDIA` bindings. Sites owns the actual resources.
3. Set runtime secrets through Sites. Keep the site private while sample content is present.
4. Commit and push the exact validated source to the Site’s source repository using a short-lived credential, without saving the credential in Git configuration or remote URLs.
5. Package the build with the Sites packaging helper, save a version using the pushed commit SHA, and deploy that version.
6. Verify a terminal successful deployment status, page rendering, owner authorization, and persisted content. Schema migrations run before the new Worker is installed.

Migration files and their metadata are immutable after application. Review generated SQL before deploying. The initial expression-index migration was corrected before application because the generator quoted an SQLite expression incorrectly; the checked-in SQL and metadata represent the valid indexes.

A failed Worker deployment may still have applied migrations. Establish the applied migration boundary before attempting a correction. Prefer additive migrations and backward-compatible changes.

## Domain and search launch

The canonical domain is an editable site record. It does not provision DNS. A private preview may intentionally use the eventual canonical domain while the owner prepares content.

For the initial requested domain, add `mikaelvincent.dev` to the Site through its custom-domain controls and apply the exact DNS records returned by the provider at the domain’s DNS host. Verify DNS, TLS, and the canonical hostname before making the Site public. Configure one canonical hostname; redirect aliases at the edge. No DNS changes are performed merely by editing the domain field.

Only turn off sample mode after replacing the fictional entries, sample mailbox, biography, and metadata. Sample mode applies `noindex` metadata and disallows crawling in `robots.txt`. Published content retains complete HTML and a sitemap regardless of 3D availability. Admin and preview responses always use `noindex` and `private, no-store`.

Individual project pages have their own canonical URL, title, description, and optional image. Live owner identity produces escaped Person JSON-LD. The site uses a database-driven initials favicon. Shared media images are reused; no social-preview artwork is generated automatically.

## Independent project subdomains

For a project such as `calculator.<owner-domain>`:

1. Deploy that application independently using a suitable host and its own secrets/database.
2. Add the subdomain to that host, configure its returned DNS record, and verify HTTPS.
3. Enter its full HTTPS URL in the project’s **Independent demo URL**, save, preview, and publish the case study.

The portfolio links to the application; it does not proxy or execute arbitrary external code. Keep admin/session cookies host-only at the gateway. Do not share an admin cookie across demo subdomains. Each demo owns its own availability, authentication, rate limits, and lifecycle.

## Authoring notebook sections

Use **Journal** in Content studio. Each entry is a section: its title labels the
paper marker, its subtitle introduces the first page, and Order places the section.
Write the entire section in one Markdown input. Text flows automatically onto as
many pages as needed. The bottom notebook arrows turn pages within that section;
section markers select sections. One-page sections hide pagination. Up to six
markers fit at once; Earlier/More sections reaches further groups.

**Preview** shows the same fixed paper space and typography as the live notebook.
There is no scrolling inside a paper page. Preview's arrows let you inspect the
automatically generated pages after fonts and images load. There are no manual
page breaks, per-page character limits or page-fit Save/Publish gates. The existing
100,000-character section-body limit remains. The opening section preview includes
the published biography and follows prospective published section ordering.

The editor retains Write/Preview, image/video insertion and explicit media publishing
from Projects and Case studies. Single line breaks remain visible. Save draft,
Preview saved draft and Publish are separate. A section requires its managed images,
videos, posters and captions to be published; its live dependencies remain protected
from deletion or unpublishing. Existing standalone `<!-- notebook-page -->`
separators are treated as ordinary paragraph breaks; fenced/indented examples remain
literal code. Reading view renders the complete section in continuous document flow.

Desktop and mobile share the full physical spread; dedicated mobile refinement is
deferred. The requested sample-content refresh preserves owner-edited records.

For local demonstration content, run `node scripts/populate-demo-notebook.mjs`
to inspect its plan, then add `--apply` to publish the eligible examples. This
loopback-only tool updates only exact known untouched notebook samples and creates
missing examples. Edited records, divergent drafts and identity remain intact;
repeating the command makes no changes once the examples are current. The five
sections contain continuous Markdown long enough to exercise automatic pagination.

## Authoring About photos and social cards

In **Identity & copy → Portrait image**, choose an image from the library or
expand the upload controls to upload your own with alternative text. Adjust
**About room frame** and **Reading view portrait** independently using Horizontal
position, Vertical position and Zoom. Reset this crop affects only that frame;
the uploaded original is preserved. Clearing the selection restores the room's
landscape artwork and Reading view's book symbol.

In **Social links**, edit or create a link, set its platform, display name and
destination, then choose **About position → Left, Center or Right**. Off leaves
it out of About. This does not change **Contact console placement**. The position
overview shows draft and live assignments. If a live position is occupied,
change and publish its existing link's position before publishing the replacement.

Choose a recognizable icon from the visual platform picker, or upload a standard
**SVG or PNG** in the custom icon controls. SVG is convenient for a crisp scalable
mark; transparent PNG also works. These are ordinary downloadable icon formats,
not an application-specific format. Icons sit directly on the ivory card without
a photo, badge or caption; the preview shows the same surface. Use an icon that
contrasts with ivory. Full proportions and transparency are preserved, with no
crop controls. Choosing a preset clears the custom override without deleting its
library asset. Custom icons affect About and its readers; Contact uses the preset.

SVG files may be up to 1 MiB and PNGs up to 5 MiB (8192 pixels per side and
16 megapixels). Static, self-contained SVG paths, groups, styles, local gradients
and references work; externally linked files, scripts and animation do not.
Both formats are decoded locally and saved as a PNG bounded to 512 pixels before
upload. A downloaded [Simple Icons SVG](https://simpleicons.org/) works directly;
no manual conversion is needed.

Without an assigned link, the slot is decorative. The same three selected links
appear in About's Reading view and notebook reader.

Use **Save draft**, then **Preview About** from either Social links or
Identity & copy. Uploading and saving do not publish images.
Use the explicit image-publishing action before publishing Identity & copy or the
social link. That image becomes publicly addressable when published, even while
the parent remains a draft. Referenced live images cannot be unpublished or
deleted; first clear/change and publish their parent references. Private previews
remain authenticated. Whole-content JSON backups preserve image references/metadata, crops and
positions; they do not contain the uploaded R2 image files.

The owner's local About demonstration shows a fictional square portrait and
GitHub, LinkedIn and an example.com Website icon. Earlier workspace/mountain
photographs remain in the library; retired social-photo assignments are ignored.
These remain ordinary editable records. See [sample assets and provenance](../scripts/assets/about-demos/PROMPTS.md)
and [the local setup record](evidence/about-photos-socials/dummy-content/README.md).
They are not automatically inserted into other databases or fresh installations.

## Authoring projects

Use **Projects → Add project** in Content studio. Supply a title and short description,
choose Systems, Interfaces and/or Experiments, then write or paste Markdown.
All projects is automatic. The URL slug is generated on first save and remains
stable when the title changes. Cover image, role, technology and links
are optional. The story may use any headings; the section starter is optional.
Existing projects retain their old section content until a Markdown body is
explicitly authored. Save, private preview and Publish remain separate actions.
Project dates are no longer authored or shown; experience dates are unchanged.
Older v1 ZIP packages may include `period`; imports ignore that retired project
field, and new exports omit it. Existing database records are not bulk rewritten.
The legacy site-level `periodLabel` remains optional round-trip metadata so
identity backups preserve owner-authored copy; it has no editor or public output.
Optional project links share a wrapping row below the summary in both views,
with Open live project first and View source code second. Live keeps its carbon fill, bronze outline and light-bronze text, then fills
ivory with carbon text on hover or keyboard focus; Source is a secondary
carbon/alloy outlined control. The former exact View source wording is
expanded for display only; other custom labels are retained and stored copy is
not migrated. The live destination retains the established `demoUrl` field;
the repository uses `sourceUrl`.

Categories without readable projects keep their physical monitor installed,
showing a plain navy background and STANDBY, without a category name, hotspot,
tab stop, hover effect or app activation. Populated monitors use the folded
desktop wallpaper behind their title and icon. Reading view omits empty category
controls. Availability follows published content for visitors and draft content
in private preview; publishing or assigning projects enables the corresponding
screen without separate configuration.

The editor inserts uploaded or existing managed media at the text selection.
Images use `![Alternative text](/media/<id>)`; video links such as
`[Demo walkthrough](/media/<id>)` render a player with controls and no autoplay.
Use Media library to attach an image poster and a WebVTT caption record to a
video. The preview uses the same renderer as the application and reading view.
Raw HTML, JSX, executable embeds and unsafe URL schemes are not rendered as HTML.
The story is limited to **100,000 characters**, including after media-reference
rewriting during import/export. Its authored indentation and newlines are retained.

Upload limits: PNG/JPEG/WebP/GIF images **5 MiB**, MP4/WebM videos **12 MiB**, WebVTT
captions **256 KiB**. Types/signatures and request sizes are checked on the server.
Video byte ranges and HEAD are supported. A private draft asset returns 404 to
visitors. **Publish referenced media** explicitly makes only that story's media
and its poster/caption dependencies public; it can also publish pending metadata
changes to those assets. Project Publish refuses missing or unpublished media.
Media referenced by a published project cannot be deleted or unpublished until
its live references are removed. Uploading or importing does not publish anything.

## Authoring case studies

Use **Case studies → Add case study** in Content studio. Supply a title and short
description, assign one or more of Product engineering, Systems & reliability,
Research & experiments, or Design & interfaces, then write or paste Markdown.
All case studies is automatic. Existing unassigned records remain readable under
All until an owner assigns categories; adding this flow does not rewrite them.
The URL slug is generated on first save and stays stable when the title changes.
Optional fields include cover, subtitle, role, organization, period and search
metadata. The context/decisions/impact of older entries remains the fallback story
until a Markdown body is authored.

The writing/preview controls and managed image/video syntax are the same as
Projects, including the 100,000-character story limit, media limits, escaped raw
HTML and explicit referenced-media publication. Case-study publication refuses
missing or private media; live references also protect poster/caption dependencies
against deletion or unpublishing. Saving a draft leaves its published snapshot
unchanged. Private preview opens the chosen story by ID; public stories have
`/case-studies/<slug>` URLs and a semantic Reading view.

The four physical category cartridges open their collection on the same terminal;
All case studies opens the full archive. Only populated categories are selectable
in the room; empty cartridges are dark and inert. An entirely empty archive leaves
the terminal in passive STANDBY. Reading view retains all five filters and can
explain an empty collection; direct category URLs remain readable.
Back restores the collection and its scroll position; X or an exposed room wall
returns to the room. Case studies uses the existing JSON content backup workflow.
The standalone project ZIP format remains specific to Projects.

## Local demonstration library

With the existing local server running, use:

```sh
node scripts/populate-demo-projects.mjs          # inspect proposed changes
node scripts/populate-demo-projects.mjs --apply  # populate eligible local demos
```

This loopback-only tool adds media and rich Markdown to the nine known, untouched
sample projects: **All projects 9, Systems 6, Interfaces 3, Experiments 0**. The
Experiments room screen remains installed but dormant and cannot open an empty
category application.
The tool skips owner-authored content, private-only entries, edited samples and
divergent draft/published versions. It checks revisions again before mutation,
reuses matching media by content hash, and a completed rerun makes no updates.
It does not reset identity,
other content or the database. Fresh setup seeds already contain the categories
and text; run this explicit step to populate their managed media. Do not rerun
`npm run setup` merely to refresh demos in an existing studio.

Examples include headings, emphasis, quotations, lists, fenced code,
tables, still illustrations, a controlled MP4 with captions, and a finite GIF.
Relay is the full presentation reference, including optional source/live links,
heading levels, nested lists/tasks, strikethrough, separators and reference links.
Its public BullMQ repository/documentation links are explicitly attributed
references, not a Relay deployment or the owner's work. Keep this known sample
current when supported presentation features change, without replacing owner edits.
GIF uploads use ordinary image Markdown; videos use the managed video link syntax
above. There is no new third-party iframe or executable-embed support.

The checked-in assets and provenance/hashes live in
`scripts/assets/project-demos/manifest.json`. They are synthetic, code-authored
illustrations, not recordings or evidence of real project outcomes. The optional
`node scripts/generate-project-demos.mjs` rebuild uses installed Sharp and macOS
Swift/AVFoundation for H.264 encoding; population and the site do not require that
encoder. The GIF runs twice (3.84 seconds total) and stops.

For the Case studies archive, use its separate guarded tool:

```sh
node scripts/populate-demo-case-studies.mjs          # inspect proposed changes
node scripts/populate-demo-case-studies.mjs --apply  # populate eligible local cases
```

It refreshes the three exact untouched legacy case-study samples and adds three
missing examples, for **All 6, Product 3, Systems 2, Interfaces 1, Research 0**.
The empty Research category leaves a blank dark cartridge at the bottom of the
room rack. **Building the whole product** is the full Markdown/media showcase; the remaining stories vary in length. The
tool reuses the same verified synthetic assets without changing the Relay project.
Only public media with identical drafts and matching bytes/metadata is reused;
otherwise it uploads a separate copy. Existing edited cases, private drafts and
ID/slug collisions are skipped. New local records receive normal API-generated
IDs; fresh database seeds use stable sample IDs. A completed rerun is a no-op.
Actual totals can differ if owner content exists or an edited sample is skipped.
The main server must already be running; no database reset is required.

## Portable project packages

**Import project ZIP** creates a new draft, including media bytes. Existing slugs
are rejected rather than overwritten. **Export project ZIP** exports the selected
saved draft; save outstanding edits first. It does not export owner access,
inquiries, secrets, or unrelated content. Unlike whole-content JSON backups, a
project package includes its referenced managed media bytes. External images
must be uploaded first; export never fetches arbitrary external URLs.

A package contains `project.md` and its declared `assets/` files. Example:

```yaml
---
format: orbital-project/v1
title: A useful tool
slug: a-useful-tool
summary: What this project does and why it matters.
categories: [systems, interfaces]
cover: assets/cover.webp
role: Design and development
stack: TypeScript
media:
  - path: assets/cover.webp
    alt: The tool's overview screen
    title: The finished overview
  - path: assets/walkthrough.mp4
    alt: A narrated walkthrough
    poster: assets/cover.webp
    captions: assets/walkthrough.vtt
  - path: assets/walkthrough.vtt
    alt: English captions
---
## Overview
Write the story here.

![Overview](assets/cover.webp)

[Watch the walkthrough](assets/walkthrough.mp4)
```

Package limits are **16 MiB compressed/exported**, **24 MiB expanded**, and
**100 entries** including the Markdown file. Each media file also has its upload
limit. `project.md`, including YAML and story, must fit **256 KiB UTF-8**.
Optional media `title` values preserve display captions separately from alt text.
Only declared and referenced assets are accepted. Absolute/traversing paths,
symlinks, encrypted/duplicate entries, malformed archives, checksum mismatches and
inflated-size violations are rejected. Imports rewrite local references to managed
IDs; exports reverse them. Imported projects must be reviewed and published in
Studio. Legacy section fields and custom display-category metadata also round-trip.

## Content and media backups

- **Content export** includes drafts, published snapshots, order, media metadata, and timestamps. It excludes owner access, secrets, audit logs, and private inquiries.
- **Import drafts** merges matching IDs and leaves live snapshots unchanged. It does not remove unrelated records. This is the safest owner-facing restore/edit workflow.
- Use provider-native D1 backups/time travel or a database export for a complete operational backup, including private inquiries and access records. Store those backups privately and encrypt them at rest.
- Back up R2 object bytes separately. Content JSON alone does not contain uploaded images, videos or captions. Preserve each object key, MIME type, and byte content. Uploaded keys match media record IDs.

For an exact content restore into a fresh migrated database before the first application visit:

```sh
node scripts/restore-sql.mjs portfolio-content.json > restore.sql
npx wrangler d1 execute DB --local --config wrangler.local.json --file restore.sql
```

The script produces insert-only SQL and refuses malformed export structure. Existing IDs cause a transaction failure rather than overwriting content. Use exports from a trusted owner. For arbitrary files, prefer the admin import, which applies full field/URL validation. Apply the equivalent SQL through the authenticated hosting database console for a fresh hosted database. Restore media bytes separately, then sign in and claim the fresh owner slot.

`node scripts/database-roundtrip.mjs` verifies every draft and published snapshot against a new standalone SQLite database without modifying the running database. It also verifies that private inquiries and admin identities were not copied.

## Inquiry handling and privacy

Contact forms store a name, reply address, intent, message, and timestamp in a private inbox. Success means durable receipt in D1. There is no email-delivery promise or third-party mail integration. Owners reply using their own email client and control retention by deleting messages. The inbox loads older entries on demand.

Contact and claim attempts use durable, expiring rate-limit counters. Request bodies are bounded before the framework parses multipart forms, including streamed requests with no `Content-Length`. Media upload limits and signature checks are described above; active SVG/HTML uploads are not accepted. Public delivery only serves published media records. Deleting an uploaded media record also removes its object bytes.

## Security and maintenance

- Prepared SQL and database unique indexes protect content and routes. Optimistic revisions reject stale-tab overwrites.
- React escapes content, including the safe project Markdown token renderer. Rich HTML and executable embeds are not accepted. URLs require HTTPS (or mailto for contact links).
- Mutations require a same-origin request. The gateway session plus explicit server authorization remain the primary security boundary.
- Security headers include CSP, nosniff, restrictive browser permissions, referrer policy, and HSTS in production. Inline script/style allowances are needed by the current React hydration/style implementation; no arbitrary HTML is rendered.
- There are no analytics trackers. Remote images entered by an owner can contact that image host.
- Review dependency advisories regularly and test compatible patches before upgrading. The lockfile is authoritative; avoid forced dependency upgrades.
- The scoped `miniflare` → `sharp` 0.35.4 override patches the local emulator's image dependency for [GHSA-rgj7-g3m4-5g8c](https://github.com/advisories/GHSA-rgj7-g3m4-5g8c). Recheck the override when upgrading Cloudflare tooling; remove it once the upstream resolution includes a patched version and audit/build/workflow checks pass. This does not replace the trusted hosting gateway requirement.
- Vinext is currently a beta framework. Its Next-compatible structure reduces migration effort, but upgrades deserve a production-build and route/auth regression pass. A move to another host requires an authentication adapter as well as storage bindings.

The initial work is heavier than a flat template: a procedural 3D asset, accessibility fallback, and a complete content lifecycle. Ongoing content maintenance is lighter because the scene uses section labels from the same database and never needs manual layout changes when records are added. D1/R2 and gateway-managed sign-in avoid maintaining a separate CMS, password database, and session service.

## Current hosting incident

The validated source was saved as Sites version 1, but private publication failed twice on 8 September 2026 before a live URL was assigned. Both attempts returned HTTP 409 Conflict while Sites registered the SIWC sign-in callback. No application build error was reported. The site remains private with one owner and no groups; access was not widened.

Support identifiers (not credentials):

- Site: `appgprj_6aa01305084c8191b0b0c05242e29725`
- Saved version: `appgprj_6aa01305084c8191b0b0c05242e29725~appgver_b645886749d8819188734545aa59186c`
- Failed attempts: `appgdep_6aa02e28167081919756dee2259b179c` and `appgdep_6aa02ecf03dc8191a8b723c09fba901c`
- Provider error: `409 Conflict` at the SIWC client callback-registration operation.

The hosting provider must resolve that callback conflict before deployment can be verified. Reuse the existing Site; do not create another Site, weaken sign-in, expose a raw Worker, or change audience as a workaround. Check applied D1 migrations before retrying. Runtime setup and rate-limit secrets were configured as protected Sites environment entries. Hosted first-owner claim, gateway authentication, DNS and TLS have not been verified.

## Mockup revision migration

Run `npm run db:migrate` before using this revision with an existing local database. Migration `0002_instrument_navigation.sql` adds editable Previous page, Next page and Return to room labels to draft and published site snapshots only where missing. It preserves unpublished content and bumps the site revision for optimistic concurrency. The delivered local database already has this migration. Hosted migrations remain subject to the existing provider incident above.

When inspecting a new local production build, restart the temporary Wrangler process after `npm run build`; a running emulator can retain an old module manifest while hashed assets have changed. Verify the referenced CSS/JS assets as well as the HTML response.

### Rebuilding the local production preview

After `npm run build`, stop and restart an existing `npm run start` process. Wrangler's watch update can retain an older SSR asset manifest, leaving the loader waiting for chunk URLs that no longer exist. A fresh process loads the matching HTML and assets. This does not affect the normal `npm run dev` hot-reload workflow.
