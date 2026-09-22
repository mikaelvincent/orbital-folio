/** Editable fictional studies for fresh portfolios. Never public fallbacks. */
const studies = [
  {
    id: 'experience-one',
    slug: 'building-products',
    title: 'Building the whole product',
    subtitle: 'One complete journey, from first action to useful result.',
    category: 'product',
    organization: 'Example Product Studio',
    period: 'Concept study · 2026',
    role: 'Product engineering · design exploration',
    summary:
      'A fictional release workspace connecting interface decisions, durable jobs and a reviewable result.',
    cover: 'harbor',
    assets: [
      'harbor',
      'fieldnotes',
      'relay',
      'relay-captions',
      'relay-video',
      'relay-motion',
    ],
  },
  {
    id: 'experience-two',
    slug: 'reliable-systems',
    title: 'Making systems dependable',
    subtitle: 'Give failure a visible, recoverable state.',
    category: 'systems',
    organization: 'Example Engineering Team',
    period: 'Concept study · 2026',
    role: 'Systems design',
    summary:
      'A fictional incident timeline that keeps the original failure, the attempted recovery and the final outcome together.',
    cover: 'beacon',
    assets: ['beacon'],
    body: `## The constraint

An operator sees a failed job, but the request, release and retry history live in different tools. This concept joins those facts before adding another dashboard.

## A recovery contract

| Situation | Visible state | Next action |
| --- | --- | --- |
| Worker restarts | Lease expired | Requeue the original request |
| Dependency is unavailable | Waiting to retry | Show the scheduled attempt |
| Input is invalid | Needs attention | Preserve the rejected input |

### Keep the evidence

- Store the first error separately from later attempts.
- Associate each attempt with a stable request identifier.
- Explain when an operator must make a decision.

> A retry is an action; recovery is an outcome that still needs evidence.

## Tradeoff

A bounded event history is easier to operate than an unlimited stream. The design must explain when older detail expires instead of implying that missing data proves success.

## What remains to test

Crash the worker between commit and acknowledgement, repeat a request, and expire a lease while another worker is waiting. This is an illustrative design; no measured reliability gain or production deployment is claimed.`,
  },
  {
    id: 'experience-three',
    slug: 'learning-by-building',
    title: 'From prototype to useful product',
    subtitle: 'Finish the smallest journey that teaches something.',
    category: 'product',
    organization: 'Independent design exploration',
    period: 'Concept study · 2026',
    role: 'Product developer',
    summary:
      'A short account of narrowing an imagined planning tool to one complete, testable workflow.',
    assets: [],
    body: `## Start with a decision

The fictional brief was broad: help a small team plan its week. The useful question was narrower: **can someone choose the next task without losing the reason for that choice?**

## A smaller first version

1. Capture a task and its constraint.
2. Compare it with the current priorities.
3. Save one deliberate choice.

The first sketch omitted notifications, dashboards and automatic ranking. A plain task list with an explicit decision note made the proposed behavior easier to inspect.

## The lesson

*Finish a complete path before widening the feature set.* In a real project, the next step would be observing people use it and replacing these assumptions with evidence. This concept does not report actual user research or measured outcomes.`,
  },
  {
    id: 'case-study-release-decisions',
    slug: 'reviewable-releases',
    title: 'A release you can explain',
    subtitle: 'Keep the decision beside the evidence.',
    category: 'product',
    organization: 'Example Delivery Team',
    period: 'Concept study · 2026',
    role: 'Full-stack product design',
    summary:
      'A release review concept that separates a passing build from a deliberate promotion decision.',
    assets: [],
    body: `## The gap

A green check can answer whether a build passed. It cannot explain whether a release is appropriate for the current audience. This fictional workflow keeps those two decisions separate.

## Three useful boundaries

- **Evidence:** immutable checks attached to a build identifier.
- **Review:** a versioned note describing risk and intended audience.
- **Promotion:** an explicit action linked to the reviewed snapshot.

### A stale review

If a new build arrives, the earlier review remains readable but cannot silently approve the new version. The interface says what changed and asks for a fresh decision.

## Verification checklist

- [x] Describe the stale-callback case.
- [x] Keep an earlier decision available in history.
- [ ] Validate the workflow with a real delivery team.

## Outcome

The output is a reviewable design and a list of failure cases to exercise. It is not a deployed release system and carries no measured delivery-speed claim.`,
  },
  {
    id: 'case-study-recovery-runbook',
    slug: 'resumable-transfers',
    title: 'Recovering an interrupted transfer',
    subtitle: 'Keep progress without trusting incomplete data.',
    category: 'systems',
    organization: 'Example Infrastructure Team',
    period: 'Concept study · 2026',
    role: 'Backend design',
    summary:
      'A file-processing design that separates upload, verification and delivery so interrupted work can resume safely.',
    cover: 'parcel',
    assets: ['parcel'],
    body: `## Failure is an ordinary state

A browser can disconnect after sending the last chunk but before receiving a response. The fictional service records progress by session and verifies the complete object before processing it.

## Lifecycle

\`uploading → verifying → processing → ready\`

\`\`\`typescript
const session = {
  state: 'verifying',
  expectedChecksum: 'authored-at-upload-start',
  receivedChunks: [0, 1, 2],
};
\`\`\`

### Recovery rules

1. Resume only missing chunks.
   - Reject a chunk whose checksum does not match.
   - Keep the upload identifier stable across reconnects.
2. Verify the complete object before starting a worker.
3. Expire abandoned sessions and explain the expiration.

## Tradeoff and next step

The extra metadata adds bookkeeping, but avoids confusing incomplete bytes with a deliverable file. A real implementation would test duplicate chunks, expired sessions and worker restarts. No production throughput or storage saving is claimed.`,
  },
  {
    id: 'case-study-readable-interfaces',
    slug: 'readable-review-workspace',
    title: 'Making review easier to read',
    subtitle: 'A calmer interface for a consequential choice.',
    category: 'interfaces',
    organization: 'Example Design Studio',
    period: 'Concept study · 2026',
    role: 'Interface design',
    summary:
      'A fictional document-review workspace using clear hierarchy, useful context and an explicit next action.',
    cover: 'fieldnotes',
    assets: ['fieldnotes'],
    body: `## The reading problem

When every panel asks for attention, the reviewer must reconstruct the task before doing it. This concept gives the document the largest usable space and moves supporting detail beside the relevant decision.

## Hierarchy

- **First:** the document title, current revision and review request.
  - Make the author’s question visible without scrolling.
  - Keep supporting links descriptive.
- **Next:** the story and its evidence.
- **Last:** one clear action and the consequences of taking it.

## Keyboard and narrow screens

The same reading order should work with a keyboard and in one column. Tables scroll inside their own region; the document keeps ordinary headings and links.

## What this demonstrates

The study illustrates layout decisions and proposed checks. It does not claim completed accessibility certification, usability research or a measured reduction in review time.`,
  },
];

function productStory(assets) {
  const illustration = assets.fieldnotes
    ? `\n\n![A synthetic workspace showing drafts, review and published revisions](/media/${assets.fieldnotes})`
    : '';
  const motion =
    assets['relay-video'] && assets['relay-motion']
      ? `\n\n## A traceable service lifecycle\n\nThese **code-authored Relay demo diagrams** illustrate the queue behind the concept. They are synthetic illustrations, not a recording of a deployed product. The silent video has a poster and an English caption track; use its native controls to pause or replay.\n\n[Watch the illustrative job lifecycle](/media/${assets['relay-video']})\n\n### A finite animation\n\nThe GIF runs twice and stops.\n\n![A request moves through accepted, queued, running and completed states](/media/${assets['relay-motion']})`
      : '';
  return `## The product question

How could a small team review a release without reconstructing the story from several tools? **This fictional design** connects the visible workflow to the less visible system beneath it. Its purpose is to make the proposed behavior inspectable, not to claim a shipped product or measured outcome.

## My contribution

The imagined scope combines *interface design*, an explicit data contract and a recoverable background job. A useful boundary is a complete journey: capture a request, preserve it, process it and explain the result.${illustration}

> A person should be able to tell what happened, what is happening now, and what they can do next.

### Follow one request

1. **Accept a valid request.**
   - Validate the required input.
   - Preserve the original intent beside its identifier.
2. **Process it deliberately.**
   1. Claim a bounded worker lease.
   2. Save a durable result before acknowledgement.
      - Keep the result separate from attempt history.
      - Keep the first failure available for investigation.
3. **Make recovery reviewable.**
   - [x] Describe duplicate delivery.
   - [x] Preserve the original failure context.
   - [ ] Exercise worker crashes in a runnable prototype.

## The implementation sketch

\`\`\`typescript
const releaseRequest = {
  idempotencyKey: 'release-preview-42',
  revision: 3,
  state: 'queued',
};

await inspect(releaseRequest);
\`\`\`

### States and guarantees

| State | What the person sees | What the system preserves |
| --- | --- | --- |
| Draft | A change can still be edited | The author’s private revision |
| Queued | Work has been accepted | The original request identifier |
| Complete | One result can be inspected | A durable receipt |
| Needs attention | A clear recovery choice | Failure and attempt history |

#### Delivery guarantees

An \`idempotencyKey\` connects a repeated request to one durable result. The goal is ~~never retry~~ **retry without duplicating the intended effect**.

##### Commit before acknowledgement

Store the result and its receipt together. A later attempt can read that receipt before doing more work.

###### Boundary condition

A timeout is evidence that a response was not received. It does not prove that an external effect failed.

---

### Operator hand-off

First: inspect the recorded failure.\x20\x20
Then: preserve its context before requesting another attempt.

7. Read the latest durable state.
8. Confirm the original request identifier.
9. Choose whether to retry or investigate.

The [BullMQ guide][queue-guide] and [public BullMQ source](https://github.com/taskforcesh/bullmq) are independent queue-design references. They are not a deployment or implementation of this fictional workspace.

[queue-guide]: https://docs.bullmq.io/ "BullMQ documentation"
${motion}

## What this case study establishes

The output is a proposed interaction, a system boundary and a concrete verification list. It does **not** establish production reliability, customer use, performance improvement or employment history. Replace the concept with verified work when that evidence exists.

### Next steps

- Build the narrow workflow.
- Test recovery with synthetic failures.
- Observe real use before reporting outcomes.`;
}

/** Fresh seeds omit managed-media references; explicit population supplies IDs. */
export function sampleCaseStudyData(study, assets = {}) {
  const source = studies.find((entry) => entry.slug === study.slug);
  if (!source || !study.sample) return study;
  return {
    ...study,
    categories: [source.category],
    mediaId: (source.cover && assets[source.cover]) || '',
    body:
      source.slug === 'building-products' ? productStory(assets) : source.body,
  };
}

export const CASE_STUDY_SAMPLE_ASSETS = Object.fromEntries(
  studies.map(({ slug, assets }) => [slug, assets]),
);

export const caseStudySamples = studies.map((source, order) => {
  const {
    id,
    category: _category,
    assets: _assets,
    cover: _cover,
    ...details
  } = source;
  const data = {
    ...details,
    order,
    sample: true,
    seoTitle: source.title + ' — Concept case study',
    seoDescription: source.summary,
  };
  return { id, kind: 'experience', data: sampleCaseStudyData(data) };
});
