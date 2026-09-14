# Rested candidate retests

This folder preserves the investigation, including failed controls. See the [running performance ledger](../../../performance-ledger.md) for decisions and the [research](research.md) for primary sources and limitations.

- `run-20260914.json` and matching `.events.jsonl`: interrupted version-1 pilot. No A/B comparison blocks were accepted; unstable reference gates motivated a separately declared warmed-work protocol. This is not a completed negative benchmark of all candidates.
- `protocol-v1/`: exact runner, fixtures, and gate source for the preserved pilot. These copies are evidence snapshots; run the maintained script from the repository’s `scripts` folder.
- `warmed-run-20260914.json` and matching `.events.jsonl`: separate version-2 follow-up, with a 100 ms untimed prelude for steady operations and unchanged acceptance limits. Model construction is still fully timed and is not preconditioned per sample.
- `sampler-validation.json`: a native API check captured before the experiment; fair thermal pressure was visible even while the legacy command reported no warning.

A nominal OS thermal reading is not a temperature measurement or proof of maximum clock speed. These CPU-only Node experiments cannot establish lower GPU time, better battery life, an FPS gain, or a Safari speedup. All candidate implementations remain outside production code.
