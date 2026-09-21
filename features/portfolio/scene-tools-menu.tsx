'use client';

import {
  useCallback,
  useEffect,
  useId,
  useRef,
  useState,
  type RefObject,
} from 'react';
import { createPortal } from 'react-dom';
import {
  Activity,
  ChevronUp,
  Globe2,
  Orbit,
  SlidersHorizontal,
} from 'lucide-react';
import { EarthPlaybackControls } from '../orbit/earth-playback-controls';
import type { EarthPlaybackController } from '../orbit/earth-playback';
import './scene-tools-menu.css';

/** A quiet launcher; opening this list does not start either inspection tool. */
export function SceneToolsMenu({
  launcherRef,
  earthPlayback,
  motionPaused,
  diagnosticsEnabled,
  onDiagnosticsChange,
  studioLabel,
}: {
  launcherRef: RefObject<HTMLButtonElement | null>;
  earthPlayback: EarthPlaybackController | null;
  motionPaused: boolean;
  diagnosticsEnabled: boolean;
  onDiagnosticsChange: (enabled: boolean) => void;
  studioLabel: string;
}) {
  const id = useId();
  const panel = useRef<HTMLDivElement>(null);
  const pointerToggle = useRef<boolean | null>(null);
  const [open, setOpen] = useState(false);
  const [earthOpen, setEarthOpen] = useState(false);
  const closeEarth = useCallback(() => {
    setEarthOpen(false);
    launcherRef.current?.focus({ preventScroll: true });
  }, [launcherRef]);

  useEffect(() => {
    if (!open) return;
    panel.current
      ?.querySelector<HTMLElement>('button:not(:disabled), a')
      ?.focus({ preventScroll: true });
    const outside = (event: Event) => {
      if (
        !panel.current?.contains(event.target as Node) &&
        !launcherRef.current?.contains(event.target as Node)
      )
        setOpen(false);
    };
    const escape = (event: KeyboardEvent) => {
      if (event.key !== 'Escape' || event.defaultPrevented) return;
      event.preventDefault();
      event.stopPropagation();
      setOpen(false);
      launcherRef.current?.focus({ preventScroll: true });
    };
    document.addEventListener('pointerdown', outside);
    document.addEventListener('focusin', outside);
    document.addEventListener('keydown', escape, true);
    return () => {
      document.removeEventListener('pointerdown', outside);
      document.removeEventListener('focusin', outside);
      document.removeEventListener('keydown', escape, true);
    };
  }, [open, launcherRef]);

  return (
    <>
      <button
        ref={launcherRef}
        className="scene-tools-toggle"
        type="button"
        aria-label="Scene tools"
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-controls={id}
        title="Scene tools"
        onPointerDown={(event) => {
          // Focus can leave the popover before click (notably when a browser
          // does not focus pointer-clicked buttons). Keep this press's intent
          // so the outside-focus dismissal cannot turn Close into Open.
          pointerToggle.current =
            event.isPrimary && event.button === 0 ? !open : null;
        }}
        onPointerCancel={() => {
          pointerToggle.current = null;
        }}
        onClick={(event) => {
          const intended = pointerToggle.current;
          pointerToggle.current = null;
          setOpen((value) =>
            event.detail > 0 && intended !== null ? intended : !value,
          );
        }}
      >
        <SlidersHorizontal size={16} aria-hidden="true" />
        <span>Tools</span>
        <ChevronUp
          className="scene-tools-chevron"
          size={13}
          aria-hidden="true"
        />
      </button>
      {open &&
        createPortal(
          <div
            id={id}
            ref={panel}
            className="scene-tools-popover"
            role="dialog"
            aria-label="Scene tools"
          >
            <p className="scene-tools-heading">Scene tools</p>
            <button
              className="scene-tools-item"
              type="button"
              disabled={!earthPlayback}
              aria-label={
                earthOpen ? 'Close Earth playback' : 'Open Earth playback'
              }
              aria-pressed={earthOpen}
              onClick={() => {
                setOpen(false);
                if (earthOpen) closeEarth();
                else setEarthOpen(true);
              }}
            >
              <Globe2 size={18} aria-hidden="true" />
              <span>Earth playback</span>
              {earthOpen && <small>Open</small>}
            </button>
            <button
              className="scene-tools-item"
              type="button"
              data-scene-perf="toggle"
              aria-label={
                diagnosticsEnabled
                  ? 'Close scene diagnostics'
                  : 'Open scene diagnostics'
              }
              aria-pressed={diagnosticsEnabled}
              onClick={() => {
                setOpen(false);
                onDiagnosticsChange(!diagnosticsEnabled);
                if (diagnosticsEnabled)
                  launcherRef.current?.focus({ preventScroll: true });
              }}
            >
              <Activity size={18} aria-hidden="true" />
              <span>Scene diagnostics</span>
              {diagnosticsEnabled && <small>On</small>}
            </button>
            <a
              className="scene-tools-item"
              href="/admin"
              aria-label={studioLabel}
            >
              <Orbit size={18} aria-hidden="true" />
              <span>{studioLabel}</span>
            </a>
          </div>,
          document.body,
        )}
      {earthOpen && (
        <EarthPlaybackControls
          controller={earthPlayback}
          motionPaused={motionPaused}
          onClose={closeEarth}
        />
      )}
    </>
  );
}
