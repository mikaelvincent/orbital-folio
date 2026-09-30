# Operation and deployment

Use this guide for storage, testing against APIs, studio authoring, recovery or
hosting. Setup commands are in the [README](../README.md); intended visitor
behavior is in [project context](PROJECT-CONTEXT.md).

## Runtime and local state

Vinext builds a Cloudflare Worker in `dist/server` and public assets in
`dist/client`. D1 (`DB`) and R2 (`MEDIA`) are durable resources; the Worker
filesystem is not storage. Local database and uploads live in `.wrangler/state`.
Preserve that directory across restarts and never commit it.

Keep development authentication and emulators on loopback. Reuse the main
`http://localhost:3000` server. After rebuilding a **production preview**, restart
its `npm run start` process: Wrangler can retain an old SSR asset manifest and
request deleted chunks. Check referenced CSS/JS as well as HTML. Normal
`npm run dev` HMR does not need this restart.

## Portfolio reads and publication freshness

`getPortfolio()` uses Vinext's `cacheForRequest` to share one public snapshot
between metadata, layouts and pages within a request. Its normal D1 query reads
only published snapshots; missing site settings trigger the existing guarded
seed procedure. An existing site record, even unpublished after a trusted
restore, must never be replaced with sample identity.

Every new request rereads D1. There is no cross-request portfolio cache or
invalidation service. Successful publication, unpublication and deletion are
visible on the next origin request; an already-running request or an open scene
can retain the snapshot it loaded. Draft saves, whole-content imports, project
ZIP imports and uploads do not change public snapshots until publication.

Authorized preview loading has a separate request-scoped factory. Authorization,
media access checks and `getRecords()` remain uncached; mutation handlers need
fresh records both before and after writes. Media delivery still checks its own
record and owner access. Public media, icon, robots and sitemap responses retain
their existing `max-age=300` HTTP contract, so previously cached responses can
outlive withdrawal at the origin for that interval. Private previews/media and
admin responses remain private and uncached by HTTP clients.

See the [request-work comparison](performance-diagnostics.md#portfolio-request-work)
before adding shared caching or changing this freshness contract.

## Isolated verification

`npm test` and `npm run check` include API/workflow tests that mutate records and
default to `http://localhost:3000`. Restore hooks are not a safety guarantee:
validation can discard legacy fields when restoring a snapshot.

Run full suites and mutation-bearing tests in a disposable source checkout:

1. Copy source only, excluding `.dev.vars`, `.env*`, `.wrangler`, backups and
   private exports. Run `npm run setup` there to create fresh test-only secrets
   and D1 state; let that checkout create its own R2 store. Never copy the main
   database or uploads. For dependency changes, verify `npm ci` there; otherwise
   installed dependencies may be shared, with Vite's cache kept in the fixture.
2. Start a separate loopback server on an unused port with that checkout's state.
   Preserve the main server and store. Claim the fixture's local owner before
   the full suite: the About-photo and Case-study API tests assume it exists
   before alphabetically later tests perform setup. This existing workflow test
   checks sign-in/claim using only the fixture's generated key:

   ```sh
   TEST_BASE_URL=http://localhost:3003 node --test tests/content/workflows.test.mjs
   ```

3. Run tests **from the disposable checkout**: some read `.dev.vars` in the
   working directory. Explicitly set the target, for example
   `TEST_BASE_URL=http://localhost:3003 npm test`, after checking URL and state
   paths. Pure tests may run in the main checkout only when they do not call live
   endpoints or mutate storage.
4. Stop and remove only the temporary server and state. Never print or commit
   secrets, private exports or emulator contents.

## Authentication boundary

Production uses **Sign in with ChatGPT** through the Sites gateway. Authentication
identifies visitors; the database `admins` allowlist separately authorizes owners.
Protected reads, writes, previews, exports and draft media require server-side
allowlist checks. Mutations also require same-origin requests.

`app/chatgpt-auth.ts` trusts gateway-supplied `oai-authenticated-*` headers.
**Never expose the raw Worker through workers.dev, a direct URL or a proxy that
allows callers to supply these headers.** Moving hosts requires an identity
adapter or trusted gateway that strips incoming identity headers and verifies a
session. The local Sites Vite plugin simulates sign-in on loopback; it strips
forged headers, uses a local development cookie and is absent from production.

Session expiry and logout belong to the gateway. Owners can revoke other owners
in **Access & backups**, but cannot revoke themselves there. If all owner
identities are lost, recover through the provider's authenticated database
console after verifying deployment ownership; do not add public recovery routes.

## First owner and secrets

`npm run setup` creates `.dev.vars` with restrictive permissions if absent:

- `ADMIN_SETUP_KEY`: random 32-byte hex value, used with authenticated sign-in to
  claim an unowned portfolio.
- `RATE_LIMIT_SALT`: a separate random value for hashed rate-limit keys.

Set production secrets through Sites protected environment entries before
saving/deploying a version. Never put them in hosting config, URLs or Git.
The first claim uses an atomic insert; the key cannot grant further access after
an owner exists. Remove or rotate it after claim. Additional owners are allowed
by ChatGPT email and still must authenticate.

## Publish with Sites

Deployment requires separate authorization. Reuse `.openai/hosting.json`'s
`project_id` and logical `DB`/`MEDIA` bindings; Sites owns the actual resources.
Build validated source with locked dependencies, push that exact commit using a
short-lived credential, package it with the Sites helper, then save/deploy the
version using its commit SHA. Keep credentials out of Git configuration and
remote URLs. Keep the Site private while fictional sample content remains.

Migrations run before Worker installation. Applied migrations and metadata are
immutable; a failed deployment may already have applied them. Check the applied
boundary before retrying and prefer backward-compatible migrations. Verify a
terminal successful deployment, page/assets, owner authorization and persistence.

## Domain and search launch

The editable canonical-domain record does not provision DNS. The owner's intended
domain is `mikaelvincent.dev`. Add it through Sites custom-domain controls and use
the provider's exact DNS records; verify TLS and the canonical host before public
launch. Redirect aliases at the edge. A private preview may use the eventual
canonical domain without claiming it is live.

Replace fictional entries, mailbox, biography and metadata before disabling
sample mode, which controls `noindex` and crawler exclusion. Admin/preview
responses remain private and unindexed. Independent demo applications must be
hosted separately, with their own secrets and storage; put their HTTPS URL in a
project's **Independent demo URL**. The portfolio does not proxy or execute them.
Keep admin cookies host-only rather than sharing them across demo subdomains.

## Finding editable text

Use **General** for shared identity, navigation, loading/error messages, privacy
and metadata. Open a room by its current name for entries and page text. About
also contains portrait crops and its own social links; Contact contains its form,
screen headings and separate social links. Developer-tool text and decorative
labels such as UPLINK, VOICE and keyboard legends are fixed, not content settings.

Interface messages share the site record's Save draft, Preview draft and Publish
workflow. Keep placeholders such as `{title}` and `{number}` when editing.
**Reset text** removes an override. Both views share the same content; empty
categories are hidden. Explicit saves and imports discard unsupported settings
and obsolete overrides. Supported legacy story headings remain editable;
availability is shown in Interactive view when sample mode is off.

Migration `0005_studio_rooms_and_inbox.sql` separates legacy social links used in
both rooms without publishing their drafts. Each snapshot is copied independently;
original IDs remain Contact records and About copies retain `legacyLinkId` for
repeatable old-backup imports. It also adds nullable inbox status timestamps.
Apply it through the normal migration command; never reset an existing store.

## Authoring projects and case studies

Save draft, private preview and Publish are separate operations. Projects and
Case studies accept safe Markdown, including managed images
(`![Alternative text](/media/<id>)`) and videos (`[Walkthrough](/media/<id>)`).
Raw HTML, JSX and executable embeds are not rendered as HTML. Stories are limited
to 100,000 characters, including media-reference rewriting during ZIP transfer.
Legacy structured stories remain fallbacks until a Markdown body is authored.
Slugs remain stable after first save.

Save a new entry before uploading. Uploads retain their parent `ownerId` (and a
site `ownerField` for portrait/sharing images), so unused private attachments
survive a reload. The local list includes owned files and references from both
draft and published snapshots. **Attachment details** edits descriptions, video
posters and captions. Upload poster images/VTT files in the same entry, then select
them on the video. Save attachment details before navigating or publishing.
Publication follows actual dependencies, never all owned uploads. ZIP imports
assign their media to the new project; deleting a parent does not delete shared
files. Legacy files with no owner and no remaining references stay in backups,
not in a global editor.

Media limits are 5 MiB for PNG/JPEG/WebP/GIF, 12 MiB for MP4/WebM and 256 KiB for
WebVTT. Attach posters/captions through each entry’s Attachment details. Upload/import does not
publish: **Publish referenced media** explicitly publishes the story's media and
poster/caption dependencies, including pending metadata edits. Those bytes become
public even while the parent remains a draft. Publishing a parent refuses missing
or private media. Live references protect dependencies from deletion/unpublishing;
clear/change and publish the parent references first. Draft assets return 404 to
visitors. Private previews remain authenticated.

Project dates are retired; old v1 packages may contain `period`, which imports
ignore, as they do the obsolete site-level `periodLabel`. Case studies retain
their period and use whole-content JSON backup; standalone ZIP packages apply
only to Projects.

## Authoring notebook sections

In **About → Notebook sections** (using your current room name), each entry is one continuous Markdown section. Its Order controls
section placement; Preview uses the physical notebook's fixed paper area and
automatic pagination after fonts/images load. Use **Insert page break** at the
desired cursor position to move the following content to the next page. The
button inserts a standalone `<!-- page-break -->` between Markdown blocks; it
can also be typed directly. Repeated and trailing breaks add no empty pages. A
break at the start of the body keeps the section title, subtitle and any biography
on the preceding page. Breaks in code or quoted examples remain literal.
There are no page-fit save gates. Legacy standalone `<!-- notebook-page -->`
separators still become paragraph breaks; code examples remain literal. The
opening section includes the published biography. Sections share the story/media
publication rules above; Reading view hides page-break directives and keeps
continuous document flow.

## Authoring About photos and social cards

In **About → Portrait**, the About frame and Reading view crop are
independent; resetting a crop leaves the original intact. Clearing the image
restores the decorative defaults. In **About → Social links**, each record chooses Left, Center, Right or Off.
**Contact → Social links** owns separate records and destinations. To replace an
occupied live About position, change and publish its existing link first.

About custom icons accept static self-contained SVG (1 MiB) or PNG (5 MiB, at
most 8192 pixels per side and 16 megapixels), converted locally to PNG bounded to
512 pixels. Scripts, linked resources and animation are rejected. Proportions and
transparency are retained; choose contrast against ivory. A preset clears the
custom override without deleting its asset. Custom icons affect About/readers;
Contact uses presets. [Bundled icon provenance](social-icons/README.md).

Use **Preview draft** from the About room after saving and explicitly publish selected media before
publishing its parent. JSON backups preserve references, crops and positions;
they do not contain image bytes. The local fictional portrait/workspace/mountain
assets have [generation provenance](../scripts/assets/about-demos/PROMPTS.md);
they are editable demonstration content, not seeded into every installation.

### Contact social placement

Explicit Left/Right placements take priority; remaining screens take Automatic
links in display order. Conflicts choose the first record by order, then ID;
both views show only these two resolved links. **Hidden from Contact** excludes a
link from both Contact views. About links are separate records.
Platform changes preserve custom display names and URLs. An unassigned monitor
is inert. Sample GitHub/LinkedIn URLs are platform homepages, not owner profiles;
replace them before launch. Existing databases are not automatically backfilled.

## Local demonstration library

With the local server running, inspect a guarded plan, then add `--apply` to
populate eligible examples:

```sh
node scripts/populate-demo-projects.mjs
node scripts/populate-demo-case-studies.mjs
node scripts/populate-demo-notebook.mjs
```

These loopback-only tools refresh **exact known untouched samples** and create
missing examples. They skip owner edits, divergent drafts, private-only records
and collisions; revisions are checked again before mutation. Project/case-study
media is reused only when its public bytes and metadata match. Completed reruns
are no-ops. Do not reset the database or rerun setup to refresh an existing studio.

Keep **Relay** as the full browsable project presentation/media reference,
including optional resource links; extend its known sample when supported
features change without overwriting owner edits. Its BullMQ links are attributed
external references, not a Relay deployment or the owner's work. **Building the
whole product** is the case-study Markdown/media showcase. Samples intentionally
leave categories empty to exercise dormant displays; totals vary with owner edits.

Synthetic assets and hashes live in
[`scripts/assets/project-demos/manifest.json`](../scripts/assets/project-demos/manifest.json).
`node scripts/generate-project-demos.mjs` rebuilds them using Sharp and macOS
Swift/AVFoundation for H.264; ordinary population/runtime needs no encoder.

## Portable project packages

**Import project ZIP** creates a new draft and rejects existing slugs. **Export
project ZIP** uses the selected saved draft; save outstanding edits first. ZIPs
include referenced media bytes, unlike whole-content JSON, but exclude unrelated
content, owners, inquiries and secrets. External media must be uploaded first;
export never fetches arbitrary URLs.

Packages contain `project.md` and declared `assets/` files. Minimal example:

```markdown
---
format: orbital-project/v1
title: A useful tool
slug: a-useful-tool
summary: What it does and why it matters.
categories: [systems, interfaces]
media:
  - path: assets/overview.webp
    alt: The tool's overview
    title: Optional display caption
---

![Overview](assets/overview.webp)
```

A video's media entry may declare `poster` and `captions` asset paths; declare
those assets too. Limits: 16 MiB compressed/exported, 24 MiB expanded, 100 entries,
256 KiB UTF-8 for `project.md` including YAML, plus individual upload limits.
Only declared, referenced assets are accepted; unsafe paths, symlinks, duplicate
or encrypted entries, checksum failures and inflated sizes are rejected. Imports
rewrite references to managed IDs and require review/publication in Studio.
Legacy section fields and custom display-category metadata round-trip.

## Content and media backups

**Content export** contains drafts, published snapshots, ordering, media metadata
and timestamps; it excludes access records, secrets, audit logs and inquiries.
**Import drafts** merges matching IDs without changing live snapshots or removing
unrelated records. Use provider-native D1 backups/export for operational recovery,
including private records; keep these backups private and encrypted. Back up R2
bytes separately, preserving object key (media ID), MIME type and content.

For exact content restoration into a **fresh migrated database before first
application visit**:

```sh
node scripts/restore-sql.mjs portfolio-content.json > restore.sql
npx wrangler d1 execute DB --local --config wrangler.local.json --file restore.sql
```

This insert-only SQL rejects malformed structure and fails on existing IDs. It is
for trusted owner exports; use admin import for full field/URL validation of
arbitrary files. Apply equivalent SQL via the authenticated provider console for
a fresh hosted database. Restore R2 bytes separately, then claim the owner slot.
`node scripts/database-roundtrip.mjs` compares the local authenticated content
export with a new SQLite database without changing the running store; its
private temporary files must be removed after inspection.

## Inquiry handling and maintenance

Contact success means durable receipt in D1. **Reply by email** opens the owner's
email app with the original message quoted line by line (`> `). It does not send
or mark the inquiry replied; use **Mark replied** after sending. Read/unread,
replied and archived statuses are explicit, reversible actions. Archive retains
the message; Delete removes it. Status changes require owner authorization and
same-origin requests. Inbox paging uses received-time/ID cursors so status changes
do not skip older messages. Contact submissions are limited to five attempts per
IP per hourly bucket; status mutations have a separate 120-per-minute limit. There
is no mail provider or analytics tracker; owner-entered remote images can contact
their hosts. Preserve bounded request bodies, expiring rate limits and media
signature checks; public delivery requires published media. Deleting a media
record also removes its bytes.

The scoped `miniflare` → `sharp` override addresses
[GHSA-rgj7-g3m4-5g8c](https://github.com/advisories/GHSA-rgj7-g3m4-5g8c).
Recheck it when upgrading Cloudflare tooling; remove it only when the upstream
resolution is patched and relevant checks pass. Vinext upgrades need production
route/auth verification, and hosting changes also require the gateway boundary
above. Inline script/style CSP allowances currently support hydration/styles;
removing them requires validation of those paths.

## Current hosting incident

Last recorded deployment status (8 September 2026): Sites saved version 1, but
private publication failed twice with HTTP 409 during SIWC callback registration;
no live URL was assigned. Owner claim, hosted auth, DNS and TLS remain unverified.
Support identifiers (not credentials):

- Site: `appgprj_6aa01305084c8191b0b0c05242e29725`
- Version: `appgprj_6aa01305084c8191b0b0c05242e29725~appgver_b645886749d8819188734545aa59186c`
- Attempts: `appgdep_6aa02e28167081919756dee2259b179c`, `appgdep_6aa02ecf03dc8191a8b723c09fba901c`

Resolve the provider conflict using the existing private Site. Do not create a
replacement Site, widen its audience, weaken sign-in or expose a raw Worker as a
workaround. Secrets were configured as protected environment entries; check the
applied migration boundary before retrying.
