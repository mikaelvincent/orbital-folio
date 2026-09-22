/** Loopback-only. Inspect by default; --apply publishes only exact known,
 * untouched notebook samples and adds missing examples. No reset or media writes. */
import { localBase } from './demo-projects/population-plan.mjs';
import { notebookPopulationPlan } from './demo-notebook/population-plan.mjs';

const base = localBase(process.env.TEST_BASE_URL || 'http://localhost:3000');
const apply = process.argv.includes('--apply');
const request = async (path, init = {}) => {
  const response = await fetch(base + path, {
    ...init,
    redirect: 'error',
    signal: AbortSignal.timeout(20000),
    headers: { Cookie: '__sites_local_auth=1', ...init.headers },
  });
  if (!response.ok)
    throw new Error(
      `${path}: ${response.status}; no subsequent records were changed.`,
    );
  return response;
};
const refresh = async () =>
  (await (await request('/api/admin')).json()).records;
const action = async (body) =>
  (
    await request('/api/admin', {
      method: 'POST',
      headers: { Origin: base, 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })
  ).json();
let records = await refresh();
let plan = notebookPopulationPlan(records);
const eligible = [...plan.update, ...plan.create].map(({ slug }) => slug);
console.log(
  JSON.stringify(
    {
      mode: apply ? 'applying' : 'dry-run',
      base,
      create: plan.create.map(({ seedId, slug }) => ({ seedId, slug })),
      update: plan.update.map(({ id, slug, unchanged }) => ({
        id,
        slug,
        unchanged,
      })),
      skipped: plan.skipped,
      intendedSampleSections: 5,
      note: 'Plain Markdown is paginated automatically. Owner records and identity stay intact; new local records receive API-generated IDs.',
    },
    null,
    2,
  ),
);
if (!apply) process.exit(0);

let updated = 0,
  created = 0;
for (const slug of eligible) {
  // Recheck exact authored content and revisions before every write. An owner
  // edit after the displayed plan makes that record ineligible.
  records = await refresh();
  plan = notebookPopulationPlan(records);
  const update = plan.update.find((item) => item.slug === slug);
  const create = plan.create.find((item) => item.slug === slug);
  if (update?.unchanged || (!update && !create)) continue;
  const item = update || create;
  const saved = await action({
    action: 'save',
    kind: 'journal',
    ...(update ? { id: update.id, revision: update.revision } : {}),
    data: item.data,
  });
  const current = saved.records.find((record) => record.id === saved.id);
  // Revision checks across save/publish prevent publishing concurrent edits.
  await action({
    action: 'publish',
    id: current.id,
    revision: current.revision,
  });
  if (update) updated++;
  else created++;
}
records = await refresh();
plan = notebookPopulationPlan(records);
console.log(
  JSON.stringify(
    {
      mode: 'applied',
      updated,
      created,
      publishedSections: records.filter(
        (record) => record.kind === 'journal' && record.published,
      ).length,
      skipped: plan.skipped,
    },
    null,
    2,
  ),
);
