'use client';
/* oxlint-disable jsx-a11y/no-noninteractive-tabindex -- Native keyboard scrolling needs a focusable viewport. */
import { useEffect, useId, useRef, useState, type ReactNode } from 'react';

type Point = { x: number; y: number };

/** Recover a rail's local fraction from its projected endpoints and midpoint.
 * Unlike a bounding-box ratio, this also handles CSS3D perspective and roll. */
export function projectedScrollFraction(
  [start, middle, end]: readonly Point[],
  pointer: Point,
) {
  const dx = end.x - start.x,
    dy = end.y - start.y;
  const squared = dx * dx + dy * dy;
  if (squared < 1) return 0;
  const project = ({ x, y }: Point) =>
    ((x - start.x) * dx + (y - start.y) * dy) / squared;
  const midpoint = Math.max(0.001, Math.min(0.999, project(middle)));
  const perspective = (2 * midpoint - 1) / (1 - midpoint);
  const fraction = Math.max(0, Math.min(1, project(pointer)));
  return fraction / (1 + perspective * (1 - fraction));
}

/** Native scrolling with a persistent indicator, independent of OS scrollbar
 * auto-hide preferences. Only resize and input events do work; no frame loop. */
export function ContactScrollArea({ children }: { children: ReactNode }) {
  const id = useId();
  const viewport = useRef<HTMLDivElement>(null);
  const content = useRef<HTMLDivElement>(null);
  const anchors = useRef<(HTMLSpanElement | null)[]>([]);
  const drag = useRef<{ pointer: number; offset: number } | null>(null);
  const [metrics, setMetrics] = useState({ height: 0, total: 0, top: 0 });
  const maximum = Math.max(0, metrics.total - metrics.height);
  const trackHeight = Math.max(0, metrics.height - 16);
  const thumbHeight = Math.min(
    trackHeight,
    Math.max(28, (trackHeight * metrics.height) / (metrics.total || 1)),
  );
  const travel = trackHeight - thumbHeight;
  const thumbTop = maximum ? (metrics.top / maximum) * travel : 0;

  useEffect(() => {
    const pane = viewport.current;
    const body = content.current;
    if (!pane || !body) return;
    const measure = () => {
      const next = {
        height: pane.clientHeight,
        total: pane.scrollHeight,
        top: Math.max(
          0,
          Math.min(pane.scrollTop, pane.scrollHeight - pane.clientHeight),
        ),
      };
      setMetrics((previous) =>
        previous.height === next.height &&
        previous.total === next.total &&
        previous.top === next.top
          ? previous
          : next,
      );
    };
    const observer = new ResizeObserver(measure);
    observer.observe(pane);
    observer.observe(body);
    pane.addEventListener('scroll', measure, { passive: true });
    measure();
    return () => {
      observer.disconnect();
      pane.removeEventListener('scroll', measure);
    };
  }, []);

  const scrollTo = (top: number) => {
    if (viewport.current)
      viewport.current.scrollTop = Math.max(0, Math.min(maximum, top));
  };
  const localY = (x: number, y: number) => {
    // CSS3D makes client pixels differ from local pixels. Three collinear
    // anchors recover the perspective mapping along the rail, including roll.
    const points = anchors.current.map((anchor) =>
      anchor!.getBoundingClientRect(),
    );
    return projectedScrollFraction(points, { x, y }) * trackHeight;
  };

  return (
    <div className="contact-window-scroll">
      <div
        className="contact-window-body"
        id={id}
        ref={viewport}
        tabIndex={0}
        role="region"
        aria-label="Contact application content"
      >
        <div ref={content}>{children}</div>
      </div>
      {maximum > 1 && (
        <div
          className="contact-window-scrollbar"
          role="scrollbar"
          tabIndex={0}
          aria-label="Scroll Contact application"
          aria-controls={id}
          aria-orientation="vertical"
          aria-valuemin={0}
          aria-valuemax={maximum}
          aria-valuenow={Math.round(metrics.top)}
          onPointerDown={(event) => {
            if (event.button !== 0 || !event.isPrimary) return;
            event.preventDefault();
            const position = localY(event.clientX, event.clientY);
            const hitThumb = (event.target as Element).closest(
              '.contact-window-scroll-thumb',
            );
            drag.current = {
              pointer: event.pointerId,
              offset: hitThumb ? position - thumbTop : thumbHeight / 2,
            };
            event.currentTarget.setPointerCapture(event.pointerId);
            event.currentTarget.focus({ preventScroll: true });
            if (!hitThumb && travel > 0)
              scrollTo(((position - thumbHeight / 2) / travel) * maximum);
          }}
          onPointerMove={(event) => {
            const held = drag.current;
            if (!held || held.pointer !== event.pointerId) return;
            if (!(event.buttons & 1)) {
              drag.current = null;
              return;
            }
            event.preventDefault();
            if (travel > 0)
              scrollTo(
                ((localY(event.clientX, event.clientY) - held.offset) /
                  travel) *
                  maximum,
              );
          }}
          onPointerUp={(event) => {
            drag.current = null;
            if (event.currentTarget.hasPointerCapture(event.pointerId))
              event.currentTarget.releasePointerCapture(event.pointerId);
          }}
          onPointerCancel={() => {
            drag.current = null;
          }}
          onLostPointerCapture={() => {
            drag.current = null;
          }}
          onKeyDown={(event) => {
            const position = viewport.current?.scrollTop ?? 0;
            const targets: Record<string, number> = {
              ArrowUp: position - 40,
              ArrowDown: position + 40,
              PageUp: position - metrics.height,
              PageDown: position + metrics.height,
              Home: 0,
              End: maximum,
            };
            if (event.key in targets) {
              event.preventDefault();
              scrollTo(targets[event.key]);
            }
          }}
          onWheel={(event) => {
            // The rail sits beside the native viewport; wheel over it should
            // scroll that same pane, without swallowing browser zoom gestures.
            if (event.ctrlKey) return;
            const unit =
              event.deltaMode === 1
                ? 16
                : event.deltaMode === 2
                  ? metrics.height
                  : 1;
            scrollTo((viewport.current?.scrollTop ?? 0) + event.deltaY * unit);
          }}
        >
          {[0, 50, 100].map((percent, index) => (
            <span
              key={percent}
              ref={(element) => {
                anchors.current[index] = element;
              }}
              className="contact-scroll-anchor"
              style={{ top: `${percent}%` }}
              aria-hidden="true"
            />
          ))}
          <span
            className="contact-window-scroll-thumb"
            aria-hidden="true"
            style={{
              height: thumbHeight,
              transform: `translateY(${thumbTop}px)`,
            }}
          />
        </div>
      )}
    </div>
  );
}
