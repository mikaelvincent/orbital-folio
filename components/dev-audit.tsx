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
  async function runFrameControl() {
    const scene = document.querySelector<HTMLElement>('#ship');
    if (scene?.dataset.motion !== 'reduced') return;
    const intervals: number[] = [];
    const started = performance.now();
    let last = 0;
    await new Promise<void>((resolve) => {
      let frame = 0;
      const end = () => {
        cancelAnimationFrame(frame);
        resolve();
      };
      const deadline = setTimeout(end, 7000);
      const tick = (time: number) => {
        if (last) intervals.push(time - last);
        last = time;
        if (intervals.length >= 180) {
          clearTimeout(deadline);
          end();
        } else frame = requestAnimationFrame(tick);
      };
      frame = requestAnimationFrame(tick);
    });
    const sorted = [...intervals].sort((a, b) => a - b);
    setReport((previous: any) => ({
      ...previous,
      frameControl: {
        scope:
          'Display callbacks while the spacecraft renderer is paused; host scheduling control, not GPU timing.',
        motionBefore: 'reduced',
        motionAfter: scene?.dataset.motion,
        hidden: document.hidden,
        width: innerWidth,
        height: innerHeight,
        elapsedMs: performance.now() - started,
        medianMs: sorted[Math.floor(sorted.length * 0.5)],
        p95Ms: sorted[Math.floor(sorted.length * 0.95)],
        intervals,
      },
    }));
  }
  function runTouchBranches() {
    const scene = document.querySelector<HTMLElement>('#ship');
    const canvas = scene?.querySelector('canvas');
    if (!scene || !canvas || scene.dataset.travelling !== 'false') return;
    const hotspot = [
      ...scene.querySelectorAll<HTMLButtonElement>('.world-hotspot'),
    ].find(
      (button) => !button.inert && button.getBoundingClientRect().width > 0,
    );
    const before = location.href;
    const results: Record<string, unknown>[] = [];
    for (const [index, target] of [canvas, hotspot].entries()) {
      if (!target) continue;
      const rect = target.getBoundingClientRect();
      const x = rect.left + rect.width / 2,
        y = rect.top + rect.height / 2;
      const pointerId = 810 + index;
      const send = (type: string, dx = 0, dy = 0) =>
        target.dispatchEvent(
          new PointerEvent(type, {
            bubbles: true,
            cancelable: true,
            pointerType: 'touch',
            isPrimary: true,
            pointerId,
            button: 0,
            buttons: type === 'pointerup' ? 0 : 1,
            clientX: x + dx,
            clientY: y + dy,
          }),
        );
      send('pointerdown');
      send('pointermove', 130, -110);
      send('pointermove', 0, 0);
      send('pointerup');
      const clickAllowed = target.dispatchEvent(
        new MouseEvent('click', { bubbles: true, cancelable: true, detail: 1 }),
      );
      results.push({
        target: index === 0 ? 'canvas' : 'instrument',
        clickAllowed,
        gesture: JSON.parse(scene.dataset.lastGesture || '{}'),
        dragging: scene.dataset.dragging,
        urlUnchanged: location.href === before,
      });
      send('pointerdown');
      send('pointermove', 0, 120);
      send('pointercancel');
      send('pointerup');
      results.push({
        target: 'cancel-' + index,
        dragging: scene.dataset.dragging,
        urlUnchanged: location.href === before,
      });
    }
    setReport((previous: any) => ({
      ...previous,
      touchBranches: {
        scope:
          'Synthetic touch PointerEvents through the mounted handlers; native mouse capture is tested separately. This does not emulate device touch scrolling or pinch gestures.',
        results,
      },
    }));
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
      <button type="button" className="button" onClick={runFrameControl}>
        Run paused frame control
      </button>
      <button type="button" className="button" onClick={runTouchBranches}>
        Check touch event branches
      </button>
      <pre id="qa-result">{JSON.stringify(report, null, 2)}</pre>
    </details>
  ) : null;
}
