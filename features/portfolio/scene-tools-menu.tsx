'use client';
import { interfaceText as copy } from '@/lib/content/interface-text';

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
  SunMedium,
} from 'lucide-react';
import { RenderingControls } from './rendering-controls';
import {
  renderingSettingsAreDefault,
  type RenderingObserver,
  type RenderingSettings,
} from '../spacecraft/rendering-settings';
import { EarthPlaybackControls } from '../orbit/earth-playback-controls';
import type { EarthPlaybackController } from '../orbit/earth-playback';
import './scene-tools-menu.css';

/** A quiet launcher; opening this list does not start either inspection tool. */
export function SceneToolsMenu({
  site,
  launcherRef,
  earthPlayback,
  motionPaused,
  diagnosticsEnabled,
  onDiagnosticsChange,
  studioLabel,
  renderingSettings,
  renderingObserver,
  onRenderingChange,
}: {
  site: Record<string, any>;
  launcherRef: RefObject<HTMLButtonElement | null>;
  earthPlayback: EarthPlaybackController | null;
  motionPaused: boolean;
  diagnosticsEnabled: boolean;
  onDiagnosticsChange: (enabled: boolean) => void;
  studioLabel: string;
  renderingSettings: RenderingSettings;
  renderingObserver: RenderingObserver | null;
  onRenderingChange: (settings: RenderingSettings) => void;
}) {
  const id = useId();
  const panel = useRef<HTMLDivElement>(null);
  const pointerToggle = useRef<boolean | null>(null);
  const [open, setOpen] = useState(false);
  const [earthOpen, setEarthOpen] = useState(false);
  const [renderingOpen, setRenderingOpen] = useState(false);
  const closeRendering = useCallback(() => {
    setRenderingOpen(false);
    launcherRef.current?.focus({ preventScroll: true });
  }, [launcherRef]);
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
        aria-label={copy(site, 'Scene tools')}
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-controls={id}
        title={copy(site, 'Scene tools')}
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
        <span>{copy(site, 'Tools')}</span>
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
            aria-label={copy(site, 'Scene tools')}
          >
            <p className="scene-tools-heading">{copy(site, 'Scene tools')}</p>
            <button
              className="scene-tools-item"
              type="button"
              disabled={!renderingObserver}
              aria-label={
                renderingOpen
                  ? copy(site, 'Close rendering controls')
                  : copy(site, 'Open rendering controls')
              }
              aria-pressed={renderingOpen}
              onClick={() => {
                setOpen(false);
                if (renderingOpen) closeRendering();
                else {
                  setEarthOpen(false);
                  if (diagnosticsEnabled) onDiagnosticsChange(false);
                  setRenderingOpen(true);
                }
              }}
            >
              <SunMedium size={18} aria-hidden="true" />
              <span>{copy(site, 'Rendering')}</span>
              {renderingOpen ? (
                <small>{copy(site, 'Open')}</small>
              ) : (
                !renderingSettingsAreDefault(renderingSettings) && (
                  <small>{copy(site, 'Custom')}</small>
                )
              )}
            </button>
            <button
              className="scene-tools-item"
              type="button"
              disabled={!earthPlayback}
              aria-label={
                earthOpen
                  ? copy(site, 'Close Earth playback')
                  : copy(site, 'Open Earth playback')
              }
              aria-pressed={earthOpen}
              onClick={() => {
                setOpen(false);
                if (earthOpen) closeEarth();
                else {
                  setRenderingOpen(false);
                  setEarthOpen(true);
                }
              }}
            >
              <Globe2 size={18} aria-hidden="true" />
              <span>{copy(site, 'Earth playback')}</span>
              {earthOpen && <small>{copy(site, 'Open')}</small>}
            </button>
            <button
              className="scene-tools-item"
              type="button"
              data-scene-perf="toggle"
              aria-label={
                diagnosticsEnabled
                  ? copy(site, 'Close scene diagnostics')
                  : copy(site, 'Open scene diagnostics')
              }
              aria-pressed={diagnosticsEnabled}
              onClick={() => {
                setOpen(false);
                setRenderingOpen(false);
                onDiagnosticsChange(!diagnosticsEnabled);
                if (diagnosticsEnabled)
                  launcherRef.current?.focus({ preventScroll: true });
              }}
            >
              <Activity size={18} aria-hidden="true" />
              <span>{copy(site, 'Scene diagnostics')}</span>
              {diagnosticsEnabled && <small>{copy(site, 'On')}</small>}
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
          site={site}
          controller={earthPlayback}
          motionPaused={motionPaused}
          onClose={closeEarth}
        />
      )}
      {renderingOpen && renderingObserver && (
        <RenderingControls
          site={site}
          settings={renderingSettings}
          observer={renderingObserver}
          onChange={onRenderingChange}
          onClose={closeRendering}
        />
      )}
    </>
  );
}
