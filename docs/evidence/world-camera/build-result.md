# Final build result

14 September 2026, local checkout. The required build entry point was executed:

```
node /Users/mikaelvincent/.codex/plugins/cache/openai-bundled/sites/0.1.66/scripts/build-site.mjs
```

Exit status: **0**. All five Vinext/Vite build stages completed, including client,
RSC and server output. This was a local build; nothing was published.

Non-fatal output: Node's `module.register()` deprecation warning; a client chunk
larger than 500 kB; Vinext's existing inability to statically classify the
`/case-studies` route. These were not treated as performance measurements or
reasons to implement unapproved optimization candidates.
