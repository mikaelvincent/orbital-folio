# Wider right-drag coverage — historical 20 September 2026

Baseline `610f8bf`. Increasing portrait positive yaw from +0.03 to +0.10 prevents
hover's 0.036 range exhausting the drag allowance. The −0.40 left and ±0.32 pitch
bounds remain. Current requirements live in [project context](../../PROJECT-CONTEXT.md).

[Coverage summary](coverage-summary.json) indexes four source-hashed reports and
compressed poses: 390×844 and 768×1024, each with both sphere meshes. All
**22,040 exact and guarded poses** pass the 64-row allowance, including ordinary,
direct-flight and conservative resize combinations. This is a scoped follow-up,
not a new 17-viewport certificate. The
[earlier full audit](../portrait-roof-biased-overview/README.md) retains wider
fixture coverage and its resize-bound exceptions. No timing or memory conclusion
follows from these camera coverage checks.
