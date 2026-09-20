import fs from 'node:fs';
import { gunzipSync } from 'node:zlib';
import { createHash } from 'node:crypto';
const directory = new URL('.', import.meta.url);
const summarize = (samples) => {
  const exact = samples.filter((s) => s.sourcePixelRows);
  const guarded = samples.filter((s) => s.guarded?.sourcePixelRows);
  const rows = (list, get) => [
    Math.min(...list.map((s) => get(s)[0])),
    Math.max(...list.map((s) => get(s)[1])),
  ];
  const outside = (range, margin) =>
    range[0] < 384 + margin || range[1] > 1920 - margin;
  const exactRows = rows(exact, (s) => s.sourcePixelRows);
  const guardedRows = rows(guarded, (s) => s.guarded.sourcePixelRows);
  return {
    scenarios: samples.length,
    visibleScenarios: exact.length,
    exactSourceRows: exactRows,
    guardedSourceRows: guardedRows,
    guardedMargins: {
      north: guardedRows[0] - 384,
      south: 1920 - guardedRows[1],
    },
    exactCropFailures: exact.filter((s) => outside(s.sourcePixelRows, 0))
      .length,
    exact64RowMarginFailures: exact.filter((s) =>
      outside(s.sourcePixelRows, 64),
    ).length,
    guardedCropFailures: guarded.filter((s) =>
      outside(s.guarded.sourcePixelRows, 0),
    ).length,
    guarded64RowMarginFailures: guarded.filter((s) =>
      outside(s.guarded.sourcePixelRows, 64),
    ).length,
    guardedMinimumSeamClearance: Math.min(
      ...guarded.map((s) => s.guarded.fixedSeamClearanceDegrees),
    ),
    guardedExceptions: guarded
      .filter((s) => outside(s.guarded.sourcePixelRows, 64))
      .map((s) => ({
        viewport: s.viewport,
        state: s.state,
        angles: s.angles,
        layoutRollRadians: s.layoutRollRadians,
        viewportCompositionRadians: s.viewportCompositionRadians,
        sourcePixelRows: s.sourcePixelRows,
        guardedSourceRows: s.guarded.sourcePixelRows,
      })),
  };
};
const result = {};
const verification = {};
for (const mesh of ['desktop', 'mobile']) {
  const report = JSON.parse(
    fs.readFileSync(new URL(`coverage-${mesh}.json`, directory)),
  );
  const { samples } = JSON.parse(
    gunzipSync(fs.readFileSync(new URL(report.rawSamples, directory))),
  );
  result[mesh] = {
    sourceSha256: report.sourceSha256,
    ordinary: summarize(
      samples.filter((s) => !s.state.startsWith('orientation-resize-')),
    ),
    portraitCubicTravel: summarize(
      samples.filter(
        (s) =>
          s.state.startsWith('travel-') &&
          !s.state.includes('landscape-envelope'),
      ),
    ),
    orientationResizeCrossProduct: summarize(
      samples.filter((s) => s.state.startsWith('orientation-resize-')),
    ),
  };
  verification[mesh] = Object.fromEntries(
    Object.entries(report.sourceSha256).map(([path, expected]) => {
      const actual = createHash('sha256')
        .update(fs.readFileSync(path))
        .digest('hex');
      return [path, { expected, actual, matches: actual === expected }];
    }),
  );
}
fs.writeFileSync(
  new URL('coverage-domain-summary.json', directory),
  JSON.stringify(result, null, 2) + '\n',
);
fs.writeFileSync(
  new URL('coverage-source-verification.json', directory),
  JSON.stringify(
    {
      checkedAt: new Date().toISOString(),
      sources: verification,
      disclosedLaterChanges: {
        'features/spacecraft/navigation/overview-flight.ts':
          'After these audits began, an optional incoming-velocity tangent was added for interrupted flights. The audit omits that optional argument. The final helper matches the prior settled cubic exactly across 32,032 independent numeric comparison samples; see coverage-settled-equivalence.json. Original audit hashes are retained, not replaced.',
        'features/spacecraft/spacecraft-runtime.ts':
          'Runtime was updated to pass incoming camera velocity when navigation is interrupted. Runtime is source-context evidence, not imported or executed by this CPU fixture. Its interruption states are outside this settled-departure crop audit and are covered by parent-task verification.',
      },
      settledTrajectoryComparison: 'coverage-settled-equivalence.json',
    },
    null,
    2,
  ) + '\n',
);
console.log(
  JSON.stringify(
    Object.fromEntries(
      Object.entries(result).map(([mesh, domains]) => [
        mesh,
        Object.fromEntries(
          Object.entries(domains)
            .filter(([key]) => key !== 'sourceSha256')
            .map(([key, value]) => [
              key,
              { ...value, guardedExceptions: value.guardedExceptions.length },
            ]),
        ),
      ]),
    ),
    null,
    2,
  ),
);
