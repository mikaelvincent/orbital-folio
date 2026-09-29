'use client';
import { interfaceText as copy } from '@/lib/content/interface-text';

import { useEffect, useId, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { RotateCcw, X } from 'lucide-react';
import {
  DEFAULT_RENDERING_SETTINGS,
  renderingSettingsAreDefault,
  type RenderingObserver,
  type RenderingSettings,
} from '../spacecraft/rendering-settings';
import './rendering-controls.css';

export function RenderingControls({
  site,
  settings,
  observer,
  onChange,
  onClose,
}: {
  site: Record<string, any>;
  settings: RenderingSettings;
  observer: RenderingObserver;
  onChange: (settings: RenderingSettings) => void;
  onClose: () => void;
}) {
  const [state, setState] = useState(() => observer.getState());
  const heading = useRef<HTMLHeadingElement>(null);
  const [collapsed, setCollapsed] = useState(false);
  const softnessId = useId();
  const lightingId = useId();
  useEffect(() => {
    const sync = () => setState(observer.getState());
    sync();
    return observer.subscribe(sync);
  }, [observer]);
  useEffect(() => {
    heading.current?.focus({ preventScroll: true });
    const escape = (event: KeyboardEvent) => {
      if (event.key !== 'Escape' || event.defaultPrevented) return;
      event.preventDefault();
      event.stopPropagation();
      onClose();
    };
    document.addEventListener('keydown', escape);
    return () => document.removeEventListener('keydown', escape);
  }, [onClose]);
  const change = (patch: Partial<RenderingSettings>) =>
    onChange({ ...settings, ...patch });
  return createPortal(
    <section
      className="rendering-controls"
      data-rendering-controls="panel"
      role="dialog"
      aria-labelledby="rendering-controls-title"
    >
      <header>
        <h2 id="rendering-controls-title" ref={heading} tabIndex={-1}>
          {copy(site, 'Rendering')}
        </h2>
        <button
          type="button"
          className="rendering-icon-button"
          aria-label={
            collapsed
              ? copy(site, 'Expand rendering controls')
              : copy(site, 'Collapse rendering controls')
          }
          aria-expanded={!collapsed}
          aria-controls="rendering-controls-body"
          onClick={() => setCollapsed(!collapsed)}
        >
          {collapsed ? '+' : '−'}
        </button>
        <button
          type="button"
          className="rendering-icon-button"
          aria-label={copy(site, 'Close rendering controls')}
          onClick={onClose}
        >
          <X size={18} aria-hidden="true" />
        </button>
      </header>
      <div id="rendering-controls-body" hidden={collapsed}>
        <p className="rendering-intro">
          {copy(
            site,
            'Compare the appearance live. Changes stay when you close this panel.',
          )}
        </p>
        {(
          [
            [
              'exteriorLight',
              copy(site, 'Exterior light'),
              copy(site, 'Sunlight on the hull and through the openings.'),
            ],
            [
              'roomLight',
              copy(site, 'Room lights'),
              copy(site, 'The warm fixtures in all four rooms.'),
            ],
            [
              'ladderLight',
              copy(site, 'Ladder lights'),
              copy(site, 'The existing worklights in the ladder bay.'),
            ],
          ] as const
        ).map(([key, label, hint]) => {
          const id = `${lightingId}-${key}`;
          const percent = Math.round(state[key] * 100);
          return (
            <label className="rendering-field" htmlFor={id} key={key}>
              <span>{label}</span>
              <span className="rendering-range">
                <input
                  id={id}
                  type="range"
                  aria-label={label}
                  aria-describedby={`${id}-hint`}
                  aria-valuetext={copy(site, '{percent} percent', { percent })}
                  min={0}
                  max={5}
                  step={0.05}
                  value={settings[key]}
                  onChange={(event) =>
                    change({ [key]: Number(event.currentTarget.value) })
                  }
                />
                <output htmlFor={id} aria-hidden="true">
                  {percent}%
                </output>
              </span>
              <small id={`${id}-hint`}>
                {hint}
                {copy(site, '100% is the default.')}
              </small>
            </label>
          );
        })}
        <label className="rendering-toggle">
          <span>
            <strong>{copy(site, 'Shadows')}</strong>
            <small>
              {copy(
                site,
                'Cast shadows inside the cabins and across the hull.',
              )}
            </small>
          </span>
          <input
            type="checkbox"
            role="switch"
            aria-label={copy(site, 'Shadows')}
            checked={settings.shadows}
            aria-checked={settings.shadows}
            onChange={(event) =>
              change({ shadows: event.currentTarget.checked })
            }
          />
        </label>
        <label className="rendering-field">
          <span>{copy(site, 'Shadow detail')}</span>
          <select
            aria-label={copy(site, 'Shadow detail')}
            value={settings.shadowSize}
            disabled={!settings.shadows}
            onChange={(event) =>
              change({
                shadowSize:
                  event.currentTarget.value === 'auto'
                    ? 'auto'
                    : (Number(event.currentTarget.value) as 512 | 1024 | 2048),
              })
            }
          >
            <option value="auto">{copy(site, 'Automatic')}</option>
            <option value="512">{copy(site, 'Low · 512')}</option>
            <option value="1024">{copy(site, 'Medium · 1024')}</option>
            <option value="2048">{copy(site, 'High · 2048')}</option>
          </select>
          <small>
            {settings.shadows
              ? copy(
                  site,
                  '{size} × {size}. Lower detail gives coarser shadow edges.',
                  { size: state.shadowSize },
                )
              : copy(site, 'Turn shadows on to compare their detail.')}
          </small>
        </label>
        <label className="rendering-field" htmlFor={softnessId}>
          <span>{copy(site, 'Shadow softness')}</span>
          <span className="rendering-range">
            <input
              id={softnessId}
              type="range"
              aria-label={copy(site, 'Shadow softness')}
              aria-describedby={`${softnessId}-hint`}
              aria-valuetext={copy(site, '{value} times', {
                value: state.shadowSoftness,
              })}
              min={0}
              max={4}
              step={0.25}
              value={settings.shadowSoftness}
              disabled={!settings.shadows}
              onChange={(event) =>
                change({ shadowSoftness: Number(event.currentTarget.value) })
              }
            />
            <output htmlFor={softnessId} aria-hidden="true">
              {state.shadowSoftness}×
            </output>
          </span>
          <small id={`${softnessId}-hint`}>
            {settings.shadows
              ? copy(
                  site,
                  'Higher values soften shadow edges. {value}× is the default.',
                  { value: DEFAULT_RENDERING_SETTINGS.shadowSoftness },
                )
              : copy(site, 'Turn shadows on to adjust their softness.')}
          </small>
        </label>
        <label className="rendering-field">
          <span>{copy(site, 'Pixel density')}</span>
          <select
            aria-label={copy(site, 'Pixel density')}
            value={settings.pixelDensity}
            onChange={(event) =>
              change({
                pixelDensity:
                  event.currentTarget.value === 'auto'
                    ? 'auto'
                    : Number(event.currentTarget.value),
              })
            }
          >
            <option value="auto">{copy(site, 'Automatic')}</option>
            {[0.5, 0.75, 1, 1.25, 1.5, 1.75, 2].map((density) => (
              <option key={density} value={density}>
                {density}×
              </option>
            ))}
          </select>
          <small>
            {copy(
              site,
              'Drawing at {density}× · {size} pixels. Interface text stays sharp.',
              {
                density: Number(state.pixelDensity.toFixed(2)),
                size: state.drawingBuffer.join(' × '),
              },
            )}
          </small>
        </label>
        <label className="rendering-field">
          <span>{copy(site, 'Contact shading')}</span>
          <select
            aria-label={copy(site, 'Contact shading')}
            value={settings.contactShading}
            disabled={!state.contactShadingSupported}
            onChange={(event) =>
              change({
                contactShading: event.currentTarget
                  .value as RenderingSettings['contactShading'],
              })
            }
          >
            <option value="auto">{copy(site, 'Automatic')}</option>
            <option value="on">{copy(site, 'On')}</option>
            <option value="off">{copy(site, 'Off')}</option>
          </select>
          <small>
            {state.contactShadingSupported
              ? copy(
                  site,
                  '{state} · Soft darkness at corners and where surfaces meet.',
                  {
                    state: state.contactShading
                      ? copy(site, 'On')
                      : copy(site, 'Off'),
                  },
                )
              : copy(site, 'Unavailable in this browser’s graphics context.')}
          </small>
        </label>
        <label className="rendering-toggle">
          <span>
            <strong>{copy(site, 'Earth and sky')}</strong>
            <small>
              {copy(site, 'The animated background behind the spacecraft.')}
            </small>
          </span>
          <input
            type="checkbox"
            role="switch"
            aria-label={copy(site, 'Earth and sky')}
            checked={settings.background}
            aria-checked={settings.background}
            onChange={(event) =>
              change({ background: event.currentTarget.checked })
            }
          />
        </label>
        <label className="rendering-toggle">
          <span>
            <strong>{copy(site, 'Spacecraft caching')}</strong>
            <small>
              {state.cacheAvailable
                ? copy(
                    site,
                    'Reuse stationary pixels while moving parts stay live.',
                  )
                : !state.cacheLightingSupported
                  ? copy(site, 'Unavailable with cabin shadow lights.')
                  : copy(
                      site,
                      'Available on wider screens with shadows and contact shading on.',
                    )}
            </small>
          </span>
          <input
            type="checkbox"
            role="switch"
            aria-label={copy(site, 'Spacecraft caching')}
            checked={settings.spacecraftCache && state.cacheAvailable}
            aria-checked={settings.spacecraftCache && state.cacheAvailable}
            disabled={!state.cacheAvailable}
            onChange={(event) =>
              change({ spacecraftCache: event.currentTarget.checked })
            }
          />
        </label>
        <footer>
          <button
            type="button"
            disabled={renderingSettingsAreDefault(settings)}
            onClick={() => onChange({ ...DEFAULT_RENDERING_SETTINGS })}
          >
            <RotateCcw size={15} aria-hidden="true" />
            {copy(site, 'Reset defaults')}
          </button>
          <small>
            {copy(site, 'Temporary for this visit. Reload restores defaults.')}
          </small>
        </footer>
      </div>
    </section>,
    document.body,
  );
}
