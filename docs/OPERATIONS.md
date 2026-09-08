# Operation and deployment

## Runtime

The application uses React 19, Vinext (Next.js-compatible server rendering), Cloudflare Workers, D1 (SQLite), and R2-compatible object storage through Sites. There are no paid external email, CMS, analytics, font, or image-generation services required. A successful build emits `dist/server/index.js`, public assets in `dist/client`, and migration/hosting metadata.

D1 and R2 are durable managed resources. Do not replace them with the Worker’s ephemeral filesystem. Local equivalents live under `.wrangler/state`; deleting that directory deletes the local database and uploads. Keep it out of Git and preserve it across server restarts.

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

## Content and media backups

- **Content export** includes drafts, published snapshots, order, media metadata, and timestamps. It excludes owner access, secrets, audit logs, and private inquiries.
- **Import drafts** merges matching IDs and leaves live snapshots unchanged. It does not remove unrelated records. This is the safest owner-facing restore/edit workflow.
- Use provider-native D1 backups/time travel or a database export for a complete operational backup, including private inquiries and access records. Store those backups privately and encrypt them at rest.
- Back up R2 object bytes separately. Content JSON alone does not contain uploaded images. Preserve each object key, MIME type, and byte content. Uploaded keys match media record IDs.

For an exact content restore into a fresh migrated database before the first application visit:

```sh
node scripts/restore-sql.mjs portfolio-content.json > restore.sql
npx wrangler d1 execute DB --local --config wrangler.local.json --file restore.sql
```

The script produces insert-only SQL and refuses malformed export structure. Existing IDs cause a transaction failure rather than overwriting content. Use exports from a trusted owner. For arbitrary files, prefer the admin import, which applies full field/URL validation. Apply the equivalent SQL through the authenticated hosting database console for a fresh hosted database. Restore media bytes separately, then sign in and claim the fresh owner slot.

`node scripts/database-roundtrip.mjs` verifies every draft and published snapshot against a new standalone SQLite database without modifying the running database. It also verifies that private inquiries and admin identities were not copied.

## Inquiry handling and privacy

Contact forms store a name, reply address, intent, message, and timestamp in a private inbox. Success means durable receipt in D1. There is no email-delivery promise or third-party mail integration. Owners reply using their own email client and control retention by deleting messages. The inbox loads older entries on demand.

Contact and claim attempts use durable, expiring rate-limit counters. Request bodies are bounded before the framework parses multipart forms, including streamed requests with no `Content-Length`. Images are limited to 5 MB and checked for allowed type/signature; active SVG/HTML uploads are not accepted. Public delivery only serves published media records. Deleting an uploaded media record also removes its object bytes.

## Security and maintenance

- Prepared SQL and database unique indexes protect content and routes. Optimistic revisions reject stale-tab overwrites.
- React escapes content. Rich HTML and executable embeds are not accepted. URLs require HTTPS (or mailto for contact links).
- Mutations require a same-origin request. The gateway session plus explicit server authorization remain the primary security boundary.
- Security headers include CSP, nosniff, restrictive browser permissions, referrer policy, and HSTS in production. Inline script/style allowances are needed by the current React hydration/style implementation; no arbitrary HTML is rendered.
- There are no analytics trackers. Remote images entered by an owner can contact that image host.
- Review dependency advisories regularly and test compatible patches before upgrading. The lockfile is authoritative; avoid forced dependency upgrades.
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
