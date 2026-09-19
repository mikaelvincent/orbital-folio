'use client';

import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Globe2, Pause, Play, RotateCcw, X } from 'lucide-react';
import type {
  EarthPlaybackController,
  EarthPlaybackCommand,
} from './earth-playback';
import {
  MIN_EARTH_PLAYBACK_SPEED,
  MAX_EARTH_PLAYBACK_SPEED,
} from './earth-playback';
import './earth-playback-controls.css';

function timestamp(seconds: number) {
  const value = Math.max(0, Math.round(seconds));
  return `${Math.floor(value / 60)}:${String(value % 60).padStart(2, '0')}`;
}

/** Temporary, local-only inspection controls; no saved settings or global clock edits. */
export function EarthPlaybackControls({
  controller,
  motionPaused,
}: {
  controller: EarthPlaybackController | null;
  motionPaused: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [state, setState] = useState(() => controller?.getEarthPlayback());
  const launcher = useRef<HTMLButtonElement>(null);
  const heading = useRef<HTMLHeadingElement>(null);

  useEffect(() => {
    if (!open || !controller) return;
    const sync = () => setState(controller.getEarthPlayback());
    sync();
    // Only the visible helper subscribes. Rendering keeps its existing clock.
    const timer = window.setInterval(sync, 100);
    return () => {
      window.clearInterval(timer);
      controller.setEarthPlayback({ type: 'close' });
    };
  }, [open, controller]);

  useEffect(() => {
    if (!open) return;
    heading.current?.focus({ preventScroll: true });
    const escape = (event: KeyboardEvent) => {
      if (event.key !== 'Escape' || event.defaultPrevented) return;
      event.preventDefault();
      event.stopPropagation();
      setOpen(false);
      launcher.current?.focus({ preventScroll: true });
    };
    document.addEventListener('keydown', escape);
    return () => document.removeEventListener('keydown', escape);
  }, [open]);

  const command = (value: EarthPlaybackCommand) => {
    if (!controller) return;
    controller.setEarthPlayback(value);
    setState(controller.getEarthPlayback());
  };
  const close = () => {
    setOpen(false);
    launcher.current?.focus({ preventScroll: true });
  };
  const ready = !!state?.ready;

  return (
    <div data-earth-playback="controls" className="earth-playback-controls">
      <button
        ref={launcher}
        type="button"
        className="flight-diagnostics-toggle"
        aria-label={open ? 'Close Earth playback' : 'Open Earth playback'}
        aria-expanded={open}
        aria-controls="earth-playback-panel"
        title="Earth playback"
        disabled={!controller}
        onClick={() => {
          if (open) close();
          else {
            setState(controller?.getEarthPlayback());
            setOpen(true);
          }
        }}
      >
        <Globe2 size={17} aria-hidden="true" />
      </button>
      {open &&
        state &&
        createPortal(
          <section
            data-earth-playback="panel"
            id="earth-playback-panel"
            className="earth-playback-panel"
            role="dialog"
            aria-labelledby="earth-playback-title"
            aria-describedby="earth-playback-description"
          >
            <header>
              <div>
                <span className="earth-playback-eyebrow">EUROPE AT NIGHT</span>
                <h2 id="earth-playback-title" ref={heading} tabIndex={-1}>
                  Earth playback
                </h2>
              </div>
              <button
                type="button"
                className="earth-playback-close"
                aria-label="Close playback panel"
                onClick={close}
              >
                <X size={19} aria-hidden="true" />
              </button>
            </header>
            <p id="earth-playback-description">
              Explore one seamless loop. Drag the timeline to pause at any
              point.
            </p>
            <div className="earth-playback-label">
              <label htmlFor="earth-loop-position">Loop position</label>
              <output htmlFor="earth-loop-position" aria-live="off">
                {timestamp(state.time)}{' '}
                <span>/ {timestamp(state.duration)}</span>
              </output>
            </div>
            <input
              id="earth-loop-position"
              type="range"
              min={0}
              max={state.duration}
              step={0.1}
              value={state.time}
              disabled={!ready}
              aria-valuetext={`${timestamp(state.time)} of ${timestamp(state.duration)}`}
              onPointerDown={() => command({ type: 'playing', playing: false })}
              onChange={(event) =>
                command({
                  type: 'seek',
                  time: Number(event.currentTarget.value),
                })
              }
            />
            <div className="earth-playback-actions">
              <button
                type="button"
                disabled={!ready || motionPaused}
                onClick={() =>
                  command({ type: 'playing', playing: !state.playing })
                }
              >
                {state.playing && !motionPaused ? (
                  <Pause size={16} aria-hidden="true" />
                ) : (
                  <Play size={16} aria-hidden="true" />
                )}
                {state.playing && !motionPaused ? 'Pause' : 'Play'}
              </button>
              <button
                type="button"
                disabled={!ready}
                onClick={() => command({ type: 'reset' })}
                title="Restart at normal speed"
              >
                <RotateCcw size={15} aria-hidden="true" /> Restart
              </button>
            </div>
            <div className="earth-playback-label">
              <label htmlFor="earth-playback-speed">Playback speed</label>
              <output htmlFor="earth-playback-speed" aria-live="off">
                {state.speed}×
              </output>
            </div>
            <input
              id="earth-playback-speed"
              type="range"
              min={MIN_EARTH_PLAYBACK_SPEED}
              max={MAX_EARTH_PLAYBACK_SPEED}
              step={1}
              value={state.speed}
              disabled={!ready}
              onChange={(event) =>
                command({
                  type: 'speed',
                  speed: Number(event.currentTarget.value),
                })
              }
              aria-valuetext={`${state.speed} times the normal site speed`}
            />
            <p className="earth-playback-note">
              {!ready
                ? 'Loading Earth…'
                : motionPaused
                  ? 'Reduced motion is on. Use the timeline to preview still frames.'
                  : `Full loop in ${timestamp(state.duration / state.speed)} at ${state.speed}×.`}
            </p>
            <footer>
              1× is the current site speed. Closing restores 1× from this point.
              Nothing is saved.
            </footer>
          </section>,
          document.body,
        )}
    </div>
  );
}
