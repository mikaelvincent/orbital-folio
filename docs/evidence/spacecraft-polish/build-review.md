# Final production build

15 September 2026, local checkout after the hidden rear-backing clip.

The installed Sites build wrapper ran the project's `vinext build` and exited
successfully (exit 0). All five phases completed: client/server reference
analysis, RSC, client and SSR output. TypeScript checking also passed; see
`typecheck.log`. No deployment or publishing was performed.

Non-blocking build notices retained in this summary:

- Node reports deprecation of `module.register()` in the build toolchain.
- Some client chunks exceed 500 kB after minification.
- Vinext's static analysis cannot classify the `/case-studies` route.
- Vite printed plugin-hook duration information during the build; overlapping
  hook totals are not application runtime measurements.

These are build-tool notices, not new browser exceptions or a rendering
benchmark. The hidden built-in browser returned no warning/error entries in
the saved live-page and finite-fixture review (`browser-review.json`).
