'use client';
import { useEffect, useState } from 'react';
// Development-only audit harness. The production compiler removes the import branch.
export function DevAudit() {
  const [report, setReport] = useState<any>(null);
  useEffect(() => {
    if (
      process.env.NODE_ENV !== 'development' ||
      new URLSearchParams(location.search).get('audit') !== '1'
    )
      return;
    let alive = true;
    const timer = setTimeout(async () => {
      try {
        const axe = (await import('axe-core')).default;
        const result = await axe.run(document, {
          runOnly: {
            type: 'tag',
            values: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'],
          },
        });
        if (alive)
          setReport({
            url: location.pathname,
            width: innerWidth,
            scrollWidth: document.documentElement.scrollWidth,
            violations: result.violations.map((v) => ({
              id: v.id,
              impact: v.impact,
              description: v.description,
              nodes: v.nodes.map((n) => ({
                target: n.target,
                summary: n.failureSummary,
              })),
            })),
            passes: result.passes.length,
          });
      } catch (e) {
        if (alive) setReport({ error: String(e) });
      }
    }, 600);
    return () => {
      alive = false;
      clearTimeout(timer);
    };
  }, []);
  return report ? (
    <details className="dev-audit">
      <summary>
        Development accessibility audit · {report.violations?.length ?? '?'}{' '}
        violations
      </summary>
      <pre id="qa-result">{JSON.stringify(report, null, 2)}</pre>
    </details>
  ) : null;
}
