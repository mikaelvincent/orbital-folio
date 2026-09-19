'use client';

import { useEffect, useRef, useState } from 'react';
import { Globe2, Pause, Play, RotateCcw, Copy, X } from 'lucide-react';
import { copyText } from '@/lib/clipboard';
import { NIGHT_EARTH_OPENING, type EarthOpening } from './earth-view-transform';
import {
  EARTH_COMPOSITION_PRESETS,
  EARTH_PREVIEW_SPEEDS,
  EARTH_ROTATION_RADIANS_PER_SECOND,
  MAX_EARTH_ROTATION_RADIANS_PER_SECOND,
  earthOpeningAtElapsed,
  parseEarthCompositionSettings,
  serializeEarthCompositionSettings,
  type EarthCompositionControls,
  type EarthPreviewState,
  type EarthPreviewOptions,
} from './earth-composition';
import './earth-composer.css';

const angles = [
  {
    key: 'longitude',
    label: 'Longitude',
    hint: 'Move east / west',
    min: -180,
    max: 180,
  },
  {
    key: 'latitude',
    label: 'Latitude',
    hint: 'Move north / south',
    min: -85,
    max: 85,
  },
  {
    key: 'roll',
    label: 'Tilt',
    hint: 'Turn the light patterns',
    min: -180,
    max: 180,
  },
] as const;
const orbitDuration = 2100;
const formatTime = (seconds: number) =>
  `${Math.floor(seconds / 60)}:${String(Math.floor(seconds % 60)).padStart(2, '0')}`;

function ControlNumber({
  value,
  min,
  max,
  label,
  step = 0.5,
  exact = false,
  onChange,
}: {
  value: number;
  min: number;
  max: number;
  label: string;
  step?: number | 'any';
  exact?: boolean;
  onChange: (value: number) => void;
}) {
  const displayedValue = exact
    ? String(value)
    : String(Math.round(value * 100) / 100);
  const [draft, setDraft] = useState(displayedValue);
  useEffect(() => setDraft(displayedValue), [displayedValue]);
  return (
    <input
      aria-label={label}
      type="number"
      min={min}
      max={max}
      step={step}
      value={draft}
      onChange={(event) => {
        setDraft(event.currentTarget.value);
        const number = event.currentTarget.valueAsNumber;
        if (Number.isFinite(number) && number >= min && number <= max)
          onChange(number);
      }}
      onBlur={() => setDraft(displayedValue)}
      onKeyDown={(event) => {
        if (event.key === 'Enter') event.currentTarget.blur();
      }}
    />
  );
}

/** Temporary helper, independent of the chosen production opening constants. */
export function EarthComposer({
  controller,
  enabled,
}: {
  controller: EarthCompositionControls | null;
  enabled: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState<
    'presets' | 'angles' | 'motion' | 'settings'
  >('presets');
  const [view, setView] = useState<EarthPreviewState>({
    opening: { ...NIGHT_EARTH_OPENING },
    elapsed: 0,
    paused: true,
    speed: 1,
    active: false,
    rotationRadiansPerSecond: EARTH_ROTATION_RADIANS_PER_SECOND,
  });
  const [settingsText, setSettingsText] = useState('');
  const [message, setMessage] = useState('');
  const [copyResult, setCopyResult] = useState<'idle' | 'copied' | 'blocked'>(
    'idle',
  );
  const [importError, setImportError] = useState('');
  const toggle = useRef<HTMLButtonElement>(null);
  const heading = useRef<HTMLHeadingElement>(null);
  const body = useRef<HTMLDivElement>(null);
  const latestView = useRef(view);
  latestView.current = view;
  const used = useRef(false);
  useEffect(() => {
    body.current?.scrollTo({ top: 0 });
  }, [mode, open]);
  const sync = () => {
    if (controller) setView(controller.getEarthPreview());
  };
  const close = () => {
    controller?.setEarthPreview({
      paused: true,
      speed: latestView.current.speed,
    });
    sync();
    setOpen(false);
    toggle.current?.focus({ preventScroll: true });
  };
  useEffect(() => {
    if (!controller || !used.current) return;
    // Reading view disposes the scene; retain this visit's chosen composition.
    const previous = latestView.current;
    controller.setEarthComposition(
      previous.opening,
      previous.rotationRadiansPerSecond,
    );
    controller.setEarthPreview({
      paused: true,
      speed: previous.speed,
      elapsed: previous.elapsed,
    });
    setView(controller.getEarthPreview());
  }, [controller]);
  useEffect(() => {
    if (!enabled) {
      setOpen(false);
      setView((previous) => ({ ...previous, paused: true }));
    }
  }, [enabled]);
  useEffect(() => {
    if (!open || !controller || !enabled) return;
    heading.current?.focus({ preventScroll: true });
    const poll = window.setInterval(() => {
      const next = controller.getEarthPreview();
      if (!next.paused && next.elapsed >= orbitDuration)
        controller.setEarthPreview({
          paused: true,
          speed: next.speed,
          elapsed: orbitDuration,
        });
      setView(controller.getEarthPreview());
    }, 200);
    // No outside-focus dismissal: Safari can focus the main ancestor before click.
    const escape = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return;
      event.preventDefault();
      event.stopPropagation();
      controller.setEarthPreview({
        paused: true,
        speed: latestView.current.speed,
      });
      setView(controller.getEarthPreview());
      setOpen(false);
      toggle.current?.focus({ preventScroll: true });
    };
    document.addEventListener('keydown', escape, true);
    return () => {
      clearInterval(poll);
      document.removeEventListener('keydown', escape, true);
    };
  }, [open, controller, enabled]);

  function applyOpening(
    opening: EarthOpening,
    rotationRadiansPerSecond = latestView.current.rotationRadiansPerSecond,
  ) {
    if (!controller) return;
    used.current = true;
    controller.setEarthComposition(opening, rotationRadiansPerSecond);
    controller.setEarthPreview({
      paused: true,
      speed: latestView.current.speed,
      elapsed: 0,
    });
    sync();
    setCopyResult('idle');
    setMessage(
      rotationRadiansPerSecond === 0
        ? 'Earth will stay still. Copy this view or increase rotation speed.'
        : 'Starting view updated. Press Play to check its rotation.',
    );
    setImportError('');
  }
  function preview(options: Partial<EarthPreviewOptions>) {
    if (!controller) return;
    const current = controller.getEarthPreview();
    controller.setEarthPreview({
      paused: current.paused,
      speed: current.speed,
      ...options,
    });
    sync();
  }
  function openPanel() {
    if (open) {
      close();
      return;
    }
    if (!controller) return;
    if (!used.current) applyOpening({ ...NIGHT_EARTH_OPENING });
    setOpen(true);
  }
  async function copySettings() {
    const text = serializeEarthCompositionSettings(
      latestView.current.opening,
      latestView.current.rotationRadiansPerSecond,
    );
    setSettingsText(text);
    const copied = await copyText(text);
    if (!copied) setMode('settings');
    setCopyResult(copied ? 'copied' : 'blocked');
  }
  function importSettings() {
    try {
      const settings = parseEarthCompositionSettings(settingsText);
      applyOpening(settings.earthOpening, settings.rotationRadiansPerSecond);
      setMessage('Settings applied as the new starting view.');
    } catch (error) {
      setImportError(
        error instanceof Error
          ? error.message
          : 'These settings could not be read.',
      );
    }
  }

  return (
    <div className="earth-composer" data-earth-composer="" hidden={!enabled}>
      <button
        ref={toggle}
        className="earth-composer-launch"
        type="button"
        onClick={openPanel}
        disabled={!controller}
        aria-expanded={open}
        aria-controls="earth-composer-panel"
        title="Choose the Earth view"
      >
        <Globe2 size={16} aria-hidden="true" />
        <span>Earth view</span>
      </button>
      {open && (
        <section
          id="earth-composer-panel"
          className="earth-composer-panel"
          role="dialog"
          aria-labelledby="earth-composer-title"
        >
          <header>
            <div>
              <span className="earth-composer-kicker">COMPOSITION STUDIO</span>
              <h2 ref={heading} tabIndex={-1} id="earth-composer-title">
                Find your Earth view
              </h2>
            </div>
            <button
              type="button"
              className="earth-composer-icon"
              aria-label="Hide Earth controls"
              onClick={close}
            >
              <X size={19} />
            </button>
          </header>
          <nav
            className="earth-composer-modes"
            aria-label="Earth editing controls"
          >
            {(['presets', 'angles', 'motion', 'settings'] as const).map(
              (option) => (
                <button
                  key={option}
                  type="button"
                  aria-pressed={mode === option}
                  onClick={() => setMode(option)}
                >
                  {
                    {
                      presets: 'Presets',
                      angles: 'Angles',
                      motion: 'Motion',
                      settings: 'Settings',
                    }[option]
                  }
                </button>
              ),
            )}
          </nav>
          <div className="earth-composer-body" ref={body}>
            <p className="earth-composer-intro">
              Choose a starting angle, then preview where the lights go. Closing
              keeps this frame visible.
            </p>
            <fieldset
              className="earth-composer-presets"
              hidden={mode !== 'presets'}
            >
              <legend>Places to try</legend>
              {EARTH_COMPOSITION_PRESETS.map((preset, index) => (
                <button
                  key={preset.id}
                  type="button"
                  onClick={() => applyOpening(preset.opening)}
                  aria-pressed={angles.every(
                    ({ key }) => view.opening[key] === preset.opening[key],
                  )}
                >
                  <strong>
                    {preset.label}
                    {index === 0 && <em>Start here</em>}
                  </strong>
                  <span>{preset.description}</span>
                </button>
              ))}
            </fieldset>
            <fieldset
              className="earth-composer-angles"
              hidden={mode !== 'angles'}
            >
              <legend>
                Starting angle <small>Changes pause at 0:00</small>
              </legend>
              {angles.map(({ key, label, hint, min, max }) => (
                <div className="earth-composer-angle" key={key}>
                  <label htmlFor={`earth-${key}`}>
                    <strong>{label}</strong>
                    <span>{hint}</span>
                  </label>
                  <ControlNumber
                    value={view.opening[key]}
                    label={`${label} degrees`}
                    min={min}
                    max={max}
                    onChange={(value) =>
                      applyOpening({ ...view.opening, [key]: value })
                    }
                  />
                  <input
                    id={`earth-${key}`}
                    aria-label={label}
                    type="range"
                    min={min}
                    max={max}
                    step="0.5"
                    value={view.opening[key]}
                    onChange={(event) =>
                      applyOpening({
                        ...view.opening,
                        [key]: event.currentTarget.valueAsNumber,
                      })
                    }
                  />
                </div>
              ))}
            </fieldset>
            <fieldset hidden={mode !== 'motion'}>
              <legend>
                Rotation speed <small>Included in copied settings</small>
              </legend>
              <div className="earth-composer-angle">
                <label htmlFor="earth-rotation-speed">
                  <strong>Speed ×</strong>
                  <span>1× = current · 0× = still</span>
                </label>
                <ControlNumber
                  label="Rotation speed multiplier"
                  exact
                  value={
                    view.rotationRadiansPerSecond /
                    EARTH_ROTATION_RADIANS_PER_SECOND
                  }
                  min={0}
                  max={
                    MAX_EARTH_ROTATION_RADIANS_PER_SECOND /
                    EARTH_ROTATION_RADIANS_PER_SECOND
                  }
                  step="any"
                  onChange={(multiplier) =>
                    applyOpening(
                      view.opening,
                      multiplier * EARTH_ROTATION_RADIANS_PER_SECOND,
                    )
                  }
                />
                <input
                  id="earth-rotation-speed"
                  aria-label="Rotation speed"
                  type="range"
                  min="0"
                  max={
                    MAX_EARTH_ROTATION_RADIANS_PER_SECOND /
                    EARTH_ROTATION_RADIANS_PER_SECOND
                  }
                  step="any"
                  value={
                    view.rotationRadiansPerSecond /
                    EARTH_ROTATION_RADIANS_PER_SECOND
                  }
                  onChange={(event) =>
                    applyOpening(
                      view.opening,
                      event.currentTarget.valueAsNumber *
                        EARTH_ROTATION_RADIANS_PER_SECOND,
                    )
                  }
                />
              </div>
              <p>
                Changing speed pauses at the starting view. Try 0.25× or 0.5× to
                linger over the lights.
              </p>
              <button
                type="button"
                onClick={() =>
                  applyOpening(view.opening, EARTH_ROTATION_RADIANS_PER_SECOND)
                }
              >
                Reset speed to 1×
              </button>
            </fieldset>
            <fieldset
              className="earth-composer-preview"
              hidden={mode !== 'motion'}
            >
              <legend>Inspect the route</legend>

              <input
                aria-label="Preview timeline in seconds"
                type="range"
                min="0"
                max={orbitDuration}
                step="1"
                value={view.elapsed}
                disabled={view.rotationRadiansPerSecond === 0}
                onChange={(event) =>
                  preview({
                    elapsed: event.currentTarget.valueAsNumber,
                    paused: true,
                  })
                }
              />
              <div className="earth-composer-timeline-labels">
                <span>Start</span>
                <span>35 min at your chosen speed</span>
              </div>
              <button
                type="button"
                className="earth-composer-frame"
                disabled={view.elapsed === 0}
                onClick={() => {
                  const current = controller?.getEarthPreview() ?? view;
                  applyOpening(
                    earthOpeningAtElapsed(
                      current.opening,
                      current.elapsed,
                      current.rotationRadiansPerSecond,
                    ),
                    current.rotationRadiansPerSecond,
                  );
                }}
              >
                Use this frame as the start
              </button>
              <p>
                {view.rotationRadiansPerSecond === 0
                  ? 'Earth stays still at 0×. Increase rotation speed to preview movement.'
                  : 'Fast-forward previews your chosen speed sooner. It affects Earth only and is not saved.'}
              </p>
            </fieldset>

            <p className="earth-composer-message" role="status">
              {message ||
                'Copy the starting view and paste it into our chat to lock it in.'}
            </p>
            <section
              className="earth-composer-settings"
              hidden={mode !== 'settings'}
              aria-label="Copy or paste settings"
            >
              <p>
                Your rotation speed is copied. Preview time and fast-forward are
                not. Use “Use this frame as the start” first to keep a later
                frame.
              </p>
              <label htmlFor="earth-settings">Earth settings</label>
              <textarea
                id="earth-settings"
                rows={7}
                spellCheck={false}
                value={settingsText}
                placeholder="Paste previously copied settings here"
                onChange={(event) => {
                  setSettingsText(event.currentTarget.value);
                  setImportError('');
                }}
                aria-invalid={!!importError}
                aria-describedby={
                  importError ? 'earth-settings-error' : undefined
                }
              />
              {importError && (
                <p id="earth-settings-error" role="alert">
                  {importError}
                </p>
              )}
              <button
                type="button"
                onClick={importSettings}
                disabled={!settingsText.trim()}
              >
                Apply pasted settings
              </button>
            </section>
          </div>
          <footer className="earth-composer-footer">
            <div className="earth-composer-time">
              Rotation{' '}
              {Number(
                (
                  view.rotationRadiansPerSecond /
                  EARTH_ROTATION_RADIANS_PER_SECOND
                  ).toPrecision(6),
              )}
              ×{' · '}
              <output aria-label="Preview time">
                {formatTime(view.elapsed)}
              </output>
            </div>
            <div className="earth-composer-playback">
              <button
                type="button"
                disabled={view.rotationRadiansPerSecond === 0}
                onClick={() =>
                  preview({
                    paused: !view.paused,
                    ...(view.elapsed >= orbitDuration ? { elapsed: 0 } : {}),
                  })
                }
              >
                {view.paused ? <Play size={15} /> : <Pause size={15} />}
                {view.paused ? 'Play' : 'Pause'}
              </button>
              <button
                type="button"
                aria-label="Return preview to start"
                onClick={() => preview({ elapsed: 0, paused: true })}
              >
                <RotateCcw size={15} />
                0:00
              </button>
              <label>
                Preview
                <select
                  aria-label="Preview speed"
                  value={view.speed}
                  onChange={(event) =>
                    preview({
                      speed:
                        EARTH_PREVIEW_SPEEDS.find(
                          (speed) =>
                            speed === Number(event.currentTarget.value),
                        ) ?? 1,
                    })
                  }
                >
                  {EARTH_PREVIEW_SPEEDS.map((speed) => (
                    <option value={speed} key={speed}>
                      {speed}×{speed === 1 ? ' · Real time' : ''}
                    </option>
                  ))}
                </select>
              </label>
            </div>
            <div className="earth-composer-share">
              <button
                type="button"
                className="earth-composer-copy"
                onClick={copySettings}
                aria-label="Copy starting view"
              >
                <Copy size={15} />
                {copyResult === 'copied' ? 'Copied' : 'Copy starting view'}
              </button>
              <button
                type="button"
                onClick={() => applyOpening({ ...NIGHT_EARTH_OPENING })}
              >
                Reset angle
              </button>
            </div>
            <p className="earth-composer-session" role="status">
              {copyResult === 'copied'
                ? 'Copied. Paste into our chat when you are ready.'
                : copyResult === 'blocked'
                  ? 'Copy blocked. Select the text in Settings to copy manually.'
                  : 'Copy before refreshing to keep your choice.'}
            </p>
          </footer>
        </section>
      )}
    </div>
  );
}
