# Project working agreements

- Commit completed changes on every implementation task, in logical, reviewable
  groups rather than very small fragments. Preserve unrelated work;
  do not squash accumulated changes into one commit unless the user asks.
- Use an independent critic agent for completed implementation groups. Let the
  critic choose a task-appropriate rubric covering request fulfillment, visual
  quality, correctness, code organization, performance and regression evidence.
- Address the critic's findings and request another review until the score is at
  least 90/100. A score does not override failing checks or unresolved defects.
  Preserve the final score, rubric and material limitations in the task evidence.
- Keep unapproved performance candidates as plans in `docs/performance-ledger.md`.
  Do not implement an optimization simply because it is listed as a next step.
- The approved production Earth map is 8K. Keep historical measurements intact
  and distinguish estimated memory, measured timing and visual judgments.
- Prefer the hidden built-in browser for visual checks. Do not capture or
  control native apps while the user is using their screen for other work.
