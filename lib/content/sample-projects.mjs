// Editable demonstration records for a new portfolio; never used as public rendering fallbacks.
export const gridSamples = [
  {
    slug: 'beacon',
    title: 'Beacon',
    subtitle: 'A useful signal in the noise.',
    category: 'BACKEND SERVICE',
    stack: 'TypeScript, PostgreSQL, OpenTelemetry',
    summary:
      'A sample observability service that connects an incident to the requests and releases around it.',
    problem:
      'Metrics, traces and release notes often live apart. During an incident, the team needs context before another dashboard.',
    approach:
      'Collect a small, consistent event envelope and join it with release metadata. Start with a few questions an operator actually asks.',
    system:
      'Service event → ingestion API → bounded buffer → indexed event store → incident timeline',
    decisions:
      'Bound retention and cardinality early. Sampling trades completeness for a predictable operating cost; critical errors remain unsampled.',
    next: 'Prototype the ingestion path, test overload protection and evaluate whether the timeline reduces investigation steps.',
  },
  {
    slug: 'parcel',
    title: 'Parcel',
    subtitle: 'Files with a dependable delivery path.',
    category: 'BACKEND SERVICE',
    stack: 'TypeScript, S3-compatible storage, SQLite',
    summary:
      'A concept for resumable file processing with clear state, checksums and recoverable failures.',
    problem:
      'An interrupted upload should not lose all progress, and processing a file should not require keeping a browser connected.',
    approach:
      'Separate upload, validation and processing. Persist each transition and expose a small status endpoint.',
    system:
      'Upload session → object chunks → checksum validation → processing worker → downloadable result',
    decisions:
      'Store bytes outside the relational database and keep lifecycle metadata inside it. Expiring incomplete uploads limits storage growth.',
    next: 'Exercise interrupted transfers, checksum mismatches and expired sessions before adding more processing formats.',
  },
  {
    slug: 'tempo',
    title: 'Tempo',
    subtitle: 'Scheduled work that can explain itself.',
    category: 'BACKEND SERVICE',
    stack: 'Go, PostgreSQL, Docker',
    summary:
      'A sample scheduling service for recurring jobs, missed runs and understandable execution history.',
    problem:
      'A scheduled job can be missed or duplicated when workers restart. Operators need to distinguish a planned run from an actual execution.',
    approach:
      'Represent schedule intent and execution attempts separately. Lease due work and make retry policy explicit.',
    system:
      'Schedule definition → due-run planner → lease → worker attempt → execution history',
    decisions:
      'A database-backed lease keeps coordination understandable. UTC storage with explicit display zones avoids ambiguous local times.',
    next: 'Test clock boundaries, daylight-saving transitions and worker restarts with an accelerated virtual clock.',
  },
  {
    slug: 'ledger',
    title: 'Ledger',
    subtitle: 'A clearer view of a shared budget.',
    category: 'FULL-STACK PRODUCT',
    stack: 'React, TypeScript, PostgreSQL',
    summary:
      'A fictional collaborative planning workspace for allocating budgets and explaining revisions.',
    problem:
      'A spreadsheet total does not show why a plan changed or which version was approved.',
    approach:
      'Make each revision reviewable, keep assumptions near the numbers and preserve an explicit approval snapshot.',
    system:
      'Planning interface → validated revision API → transaction ledger → published snapshot',
    decisions:
      'Use decimal amounts and explicit currencies. Optimistic concurrency keeps edits honest without locking the entire workspace.',
    next: 'Validate the revision flow with sample planners and test rounding, conflicting edits and export fidelity.',
  },
  {
    slug: 'harbor',
    title: 'Harbor',
    subtitle: 'Small releases, visible decisions.',
    category: 'FULL-STACK PRODUCT',
    stack: 'React, Node.js, PostgreSQL',
    summary:
      'A demonstration release console that brings checks, rollout stages and decisions into one readable record.',
    problem:
      'Release state can be scattered across build tools and chat. A green build alone does not explain what is safe to promote.',
    approach:
      'Track a release as a versioned record with required evidence, staged promotion and an audit trail.',
    system:
      'Build reference → check results → review snapshot → staged rollout → release record',
    decisions:
      'Keep deployment credentials out of the interface. Adapters report results through narrow, authenticated callbacks.',
    next: 'Build a simulated deployment adapter and verify retries, stale callbacks and rollback state.',
  },
  {
    slug: 'atlas',
    title: 'Atlas',
    subtitle: 'Finding the right thing, with context.',
    category: 'BACKEND SERVICE',
    stack: 'TypeScript, PostgreSQL, Redis',
    summary:
      'A sample search API that combines useful ranking with clear permissions and observable queries.',
    problem:
      'A search result is only useful when it is relevant, current and visible to the person asking.',
    approach:
      'Index compact document projections, apply access checks before returning results and measure unanswered queries.',
    system:
      'Content change → indexing queue → searchable projection → permission filter → ranked result',
    decisions:
      'Start with relational full-text search before adding a separate search cluster. Versioned projections make stale indexes detectable.',
    next: 'Create a labeled query set, test permission changes and compare ranking against a simple baseline.',
  },
].map((entry, index) => ({
  id: 'project-' + entry.slug,
  kind: 'project',
  data: {
    ...entry,
    order: index + 3,
    sample: true,
    role: 'Concept · design & prototype',
    outcomes:
      'Illustrative design only. No production deployment, customer use, measured improvement or employment history is claimed. The study is ready for the owner to replace with verified work.',
    demoUrl: '',
    sourceUrl: '',
    mediaId: '',
    seoTitle: entry.title + ' — Sample case study',
    seoDescription: entry.summary,
  },
}));

/** Uneven shelves and one empty shelf exercise the real library states. */
export const SAMPLE_PROJECT_CATEGORIES = {
  relay: 'systems',
  beacon: 'systems',
  parcel: 'systems',
  tempo: 'systems',
  atlas: 'systems',
  fieldnotes: 'interfaces',
  ledger: 'interfaces',
  harbor: 'interfaces',
  meter: 'systems',
};

// Three browsable stories show different list hierarchies; the remaining
// examples stay shorter so the library does not repeat one exhaustive template.
const nestedDesignPrinciples = {
  relay: `1. **Accept work safely.**
   - Validate the request before creating a job.
   - Keep the original request beside its idempotency key.
2. **Give each attempt a clear lifecycle.**
   1. Claim a bounded worker lease.
   2. Commit the result before acknowledging the job.
      - Record the final state in the history.
      - Keep failures distinct from successful completion.
3. **Make recovery reviewable.**
   - [x] Describe the duplicate-delivery scenario.
   - [x] Keep the original failure context.
   - [ ] Exercise the worker-crash path in a runnable prototype.`,
  fieldnotes: `- **Write without losing context.**
  - Keep notes connected to the work they explain.
    - Link a decision to its supporting research.
    - Preserve an earlier revision when the conclusion changes.
  - Use *short headings* and meaningful link text.
- **Publish deliberately.**
  1. Review the draft with a teammate.
  2. Check the reading order and keyboard navigation.
  3. Publish one complete revision with a stable link.
- **Keep maintenance visible.**
  - Give each note an owner and a review date.
  - Mark outdated guidance before replacing it.`,
  meter: `1. **Choose one baseline.**
   - Inputs: request count, data size and retention period.
   - Assumptions: units, prices and the time window.
2. **Compare a small set of scenarios.**
   - Change one variable at a time.
   - Keep the baseline visible beside every result.
3. **Explain uncertainty.**
   - Show the assumptions that matter most.
   - Prefer a plausible range to false precision.`,
};

const relayReferences = {
  sourceUrl: 'https://github.com/taskforcesh/bullmq',
  demoUrl: 'https://docs.bullmq.io/',
};

/** Fresh databases receive usable stories without dangling media references.
 * The explicit local population command adds managed uploaded media. */
export function sampleProjectData(project, assets = {}) {
  const category = SAMPLE_PROJECT_CATEGORIES[project.slug];
  if (!category || !project.sample) return project;
  const cover = assets[project.slug];
  const isRelay = project.slug === 'relay';
  const references = isRelay
    ? '\n\n**Explore the reference implementation.** The source and live links above open BullMQ’s public repository and documentation. They are independent queue-design references, not a Relay deployment or code authored for this concept.'
    : '';
  const implementationNotes = isRelay
    ? `\n\n#### Delivery guarantees\n\nA retry can repeat the same request. Use an \`idempotencyKey\` to associate it with one durable result. The goal is ~~never retry~~ **retry without duplicating the intended effect**.\n\n##### Idempotent completion\n\nCommit the result and its receipt together. A later attempt reads that receipt before doing any work.\n\n###### Boundary condition\n\nIf a worker loses its lease before committing, leave the attempt recoverable. A timeout alone does not prove that an external effect failed.\n\n---\n\n### Operator hand-off\n\nFirst: inspect the failed attempt.  \nThen: preserve its context before requesting a retry.\n\n7. Read the last recorded state.\n8. Confirm the original request identifier.\n9. Choose whether to retry or investigate.\n\nFor a real queue implementation, explore the [BullMQ guide][queue-guide] or [inspect its public source](${relayReferences.sourceUrl}).\n\n[queue-guide]: ${relayReferences.demoUrl} "BullMQ documentation"`
    : '';
  const designPrinciples =
    nestedDesignPrinciples[project.slug] ||
    '- **Make state visible.** Give each transition a name that a person can understand.\n- **Keep recovery deliberate.** Explain what happened and what can be tried next.\n- **Prefer useful detail.** Reveal deeper context when it helps a decision.';
  const visuals = cover
    ? `\n\n![${project.title} interface overview](/media/${cover})`
    : '';
  const motion =
    project.slug === 'relay' && assets['relay-video'] && assets['relay-motion']
      ? `\n\n## Watch the lifecycle\n\nThe short, silent walkthrough follows one job from acceptance to completion. Use the player controls to pause or replay it.\n\n[Play the queue lifecycle walkthrough](/media/${assets['relay-video']})\n\n### Retry sequence\n\nA short animated diagram shows the same state machine. The GIF runs twice and then stops.\n\n![A job moves from accepted to queued, running and completed](/media/${assets['relay-motion']})`
      : '';
  const states =
    category === 'systems' && project.slug !== 'meter'
      ? '| Accepted | Durable intent is recorded | Retry the same request safely |\n| Running | One worker holds a lease | Recover after a worker restart |\n| Completed | The result has been committed | Read the same result again |'
      : category === 'interfaces'
        ? '| Draft | Changes belong to the author | Keep unsaved work recoverable |\n| Review | A complete revision can be inspected | Compare what changed |\n| Published | Readers see one deliberate version | Preserve stable links |'
        : '| Inputs | Assumptions remain editable | Change one variable at a time |\n| Model | Units and rates are explicit | Inspect the calculation |\n| Comparison | Scenarios share a baseline | Explain differences without false precision |';
  return {
    ...project,
    ...(isRelay ? relayReferences : {}),
    categories: [category],
    mediaId: cover || project.mediaId || '',
    body: `## Overview\n\n**${project.title}** — *${project.subtitle}*\n\n${project.summary}${references}${visuals}\n\n## The problem\n\n${project.problem}\n\n> A useful tool should explain its state as clearly as it performs its work.\n\n## My approach\n\n${project.approach}\n\n### Design principles\n\n${designPrinciples}\n\n## How it works\n\n${project.system}\n\n### A small configuration\n\n\`\`\`typescript\nconst ${project.slug} = {\n  mode: "preview",\n  history: "explicit-revisions",\n  failurePolicy: "preserve-context",\n};\n\nawait inspect(${project.slug});\n\`\`\`\n\n### States and guarantees\n\n| State | What it means | What to verify |\n| --- | --- | --- |\n${states}${implementationNotes}\n\n## Key decisions\n\n${project.decisions}\n\nThe first version favors **clarity and testable boundaries**. A more sophisticated mechanism is useful only when its additional behavior can be explained and verified.${motion}\n\n## Results and next steps\n\n${project.outcomes}\n\n1. ${project.next}\n2. Review the failure states and keyboard interaction.\n3. Replace synthetic examples with verified evidence before making performance claims.\n`,
  };
}
