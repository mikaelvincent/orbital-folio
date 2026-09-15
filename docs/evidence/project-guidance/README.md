# Persistent project guidance setup

15 September 2026 · Baseline `ba2fbc7` · Documentation-only task.

The owner requested durable project instructions based on the conversation so
design decisions, commit/critic workflow and performance practices would carry
into future tasks without repeated reminders.

## Support verification

The repository already had a short root `AGENTS.md`. The installed local Codex
CLI reports `0.154.0-alpha.6.2`. Current official documentation confirms project
instruction discovery, and Astra guidance explicitly discusses `AGENTS.md`.
No special model/effort setting, global configuration change or plugin is needed.
[Codex guidance](https://learn.chatgpt.com/docs/agent-configuration/agents-md),
[Astra guidance](https://developers.openai.com/api/docs/guides/latest-model).

The final root file is 13,059 bytes, below the documented default 32 KiB combined
instruction limit. No root `AGENTS.override.md` is present; the local global
`AGENTS.md` is empty and no global override was found. This checks the current
file/discovery arrangement; it does not claim a separately launched model session
was tested or that every future setting will preserve that limit. A fresh project
run can discover the guidance normally. Linked context is read when relevant,
not claimed to be automatically injected with the root instructions.

## Changes and coverage

- [Root instructions](../../../AGENTS.md): durable workflow, project orientation,
  design priorities, camera/door/queue invariants, Earth quality, device-agnostic
  diagnostics, comparison discipline, held-candidate status, proportionate
  verification, independent 90+ critic review, logical commits and maintenance.
- [Current context](../../PROJECT-CONTEXT.md): source map, macro design and
  interaction decisions, current-versus-superseded choices, evidence/protocol
  pointers and the distinction between current night Earth and historical trials.
- [README](../../../README.md): corrected rotating-ship/fixed-camera and
  procedural-Earth/frequent-meteor descriptions, linked current instructions,
  separated historical render narratives and scoped historical validation scripts.
- [Historical Earth report](../../EARTH-ASSETS.md): an explicit status banner
  preserves the old measurements without presenting the procedural implementation
  as production.

Independent read-only audits covered navigation/camera/source, performance and
benchmark records, and the complete standing design/workflow preferences in the
available conversation. The drafting process resolved later corrections over
earlier requests: justified balance over compulsory grids; fixed-world camera
motion; one queued destination with ladder exceptions; single iris mechanisms;
8K Mediterranean night Earth; full mirrored access ladders; stowed spanners; and
empty grab-bar gaps. These remain revisable by new user instructions.

No application source, assets, model selection, global instructions, runtime
settings, ledger candidate status or historic performance values changed. The
performance ledger remains the authoritative experiment record; no artificial
performance iteration was added for editing instructions.

## Verification

[Validation record](validation.json) checks 54 relative Markdown file targets,
66 referenced source paths and hashes of the four delivered guidance documents.
All targets exist. The checks validate local file targets, not every external URL
or every Markdown fragment anchor. Official support pages were separately fetched.
`git diff --check` passed.

Application tests, builds, visual capture and benchmarks were not rerun because
this change is prose-only. The independent critic reviewed coverage, accuracy,
conflict handling, usability and evidence; its score and limitations are in
[the review](critic-review.md). The first review suggested the rounded-target
source-map entry and clearer historical README labeling; both were applied.
