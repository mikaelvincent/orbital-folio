'use client';
import { useEffect, useState } from 'react';
// Development-only audit harness. The production compiler removes the import branch.
export function DevAudit() {
  return process.env.NODE_ENV === 'development' ? <AuditPanel /> : null;
}
function AuditPanel() {
  const [report, setReport] = useState<any>(null);
  async function runAudit() {
    try {
      const axe = (await import('axe-core')).default;
      const result = await axe.run(document, {
        runOnly: {
          type: 'tag',
          values: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'],
        },
      });
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
      setReport({ error: String(e) });
    }
  }
  useEffect(() => {
    if (new URLSearchParams(location.search).get('audit') !== '1') return;
    const timer = setTimeout(runAudit, 800);
    return () => clearTimeout(timer);
  }, []);

  return report ? (
    <details className="dev-audit">
      <summary>
        Development accessibility audit · {report.violations?.length ?? '?'}{' '}
        violations
      </summary>
      <button type="button" className="button" onClick={runAudit}>
        Run accessibility audit
      </button>
      <button
        type="button"
        className="button"
        onClick={() => {
          const canvas =
            document.querySelector<HTMLCanvasElement>('#ship canvas');
          const gl = canvas?.getContext('webgl2');
          gl?.getExtension('WEBGL_lose_context')?.loseContext();
        }}
      >
        Simulate WebGL context loss
      </button>
      <button
        type="button"
        className="button"
        onClick={() =>
          window.dispatchEvent(new Event('orbital:shadow-diagnostic'))
        }
      >
        Toggle shadow diagnostic
      </button>
      <pre id="qa-result">{JSON.stringify(report, null, 2)}</pre>
    </details>
  ) : null;
}
