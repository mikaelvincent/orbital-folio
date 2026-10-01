'use client';
import { formatText } from '@/lib/content/interface-text';
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
  settings,
  observer,
  onChange,
  onClose,
}: {
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
          {'Rendering'}
        </h2>
        <button
          type="button"
          className="rendering-icon-button"
          aria-label={
            collapsed
              ? 'Expand rendering controls'
              : 'Collapse rendering controls'
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
          aria-label={'Close rendering controls'}
          onClick={onClose}
        >
          <X size={18} aria-hidden="true" />
        </button>
      </header>
      <div id="rendering-controls-body" hidden={collapsed}>
        <p className="rendering-intro">
          {
            'Fine-tune the lighting live. Brightness and beam strength use 100% for the authored balance. Room settings apply equally to all four rooms and stay when you close this panel.'
          }
        </p>
        {(
          [
            [
              'exteriorLight',
              'Exterior light',
              'Sunlight on the outside of the spacecraft.',
            ],
            [
              'exteriorSpill',
              'Exterior spill indoors',
              'How much exterior sunlight reaches the interiors. Keep low for warm rooms and a bright hull.',
            ],
            [
              'roomLight',
              'Room lights',
              'Overall brightness of both beams in all four rooms.',
            ],
            [
              'roomWarmth',
              'Room warmth',
              'Move from neutral white toward warm amber.',
            ],
            [
              'roomKeyLight',
              'Main beam strength',
              'The focused beam that defines furniture shadows.',
            ],
            [
              'roomSpread',
              'Main beam width',
              'Focus or widen the main pool of light.',
            ],
            [
              'roomFillLight',
              'Wide beam strength',
              'Feathered light around the main beam. Lower values reveal stronger shadows.',
            ],
            [
              'roomFillSpread',
              'Wide beam width',
              'Extend the same fixture’s light across walls and furniture.',
            ],
            [
              'roomFill',
              'Ambient fill',
              'Lift the darkest corners. Keep low for stronger shadows; follows room and ladder brightness.',
            ],
            [
              'roomIdleLevel',
              'Inactive room brightness',
              'Higher values soften the change on entry. At 100%, room brightness stays steady.',
            ],
            [
              'ladderLight',
              'Ladder lights',
              'The existing worklights in the ladder bay.',
            ],
          ] as const
        ).map(([key, label, hint]) => {
          const id = `${lightingId}-${key}`;
          const angle = key === 'roomSpread' || key === 'roomFillSpread';
          const brightness =
            key === 'exteriorLight' ||
            key === 'roomLight' ||
            key === 'roomKeyLight' ||
            key === 'roomFillLight' ||
            key === 'ladderLight';
          const value = Math.round(state[key] * (angle ? 2 : 100));
          const defaultValue = Math.round(
            DEFAULT_RENDERING_SETTINGS[key] * (angle ? 2 : 100),
          );
          const unit = angle ? '°' : '%';
          return (
            <label className="rendering-field" htmlFor={id} key={key}>
              <span>{label}</span>
              <span className="rendering-range">
                <input
                  id={id}
                  type="range"
                  aria-label={label}
                  aria-describedby={`${id}-hint`}
                  aria-valuetext={
                    angle ? `${value} degrees` : `${value} percent`
                  }
                  min={
                    key === 'roomSpread'
                      ? 15
                      : key === 'roomFillSpread'
                        ? 35
                        : key === 'roomIdleLevel'
                          ? 0.5
                          : 0
                  }
                  max={angle ? 85 : brightness ? 5 : 1}
                  step={angle ? 1 : key === 'exteriorSpill' ? 0.01 : 0.05}
                  value={settings[key]}
                  onChange={(event) =>
                    change({ [key]: Number(event.currentTarget.value) })
                  }
                />
                <output htmlFor={id} aria-hidden="true">
                  {value}
                  {unit}
                </output>
              </span>
              <small id={`${id}-hint`}>
                {hint}
                {` ${defaultValue}${unit} is the default.`}
              </small>
            </label>
          );
        })}
        <label className="rendering-toggle">
          <span>
            <strong>{'Shadows'}</strong>
            <small>
              {'Cast shadows inside the cabins and across the hull.'}
            </small>
          </span>
          <input
            type="checkbox"
            role="switch"
            aria-label={'Shadows'}
            checked={settings.shadows}
            aria-checked={settings.shadows}
            onChange={(event) =>
              change({ shadows: event.currentTarget.checked })
            }
          />
        </label>
        <label className="rendering-field">
          <span>{'Shadow detail'}</span>
          <select
            aria-label={'Shadow detail'}
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
            <option value="auto">{'Automatic'}</option>
            <option value="512">{'Low · 512'}</option>
            <option value="1024">{'Medium · 1024'}</option>
            <option value="2048">{'High · 2048'}</option>
          </select>
          <small>
            {settings.shadows
              ? formatText(
                  '{size} × {size}. Lower detail gives coarser shadow edges.',
                  { size: state.shadowSize },
                )
              : 'Turn shadows on to compare their detail.'}
          </small>
        </label>
        <label className="rendering-field" htmlFor={softnessId}>
          <span>{'Shadow softness'}</span>
          <span className="rendering-range">
            <input
              id={softnessId}
              type="range"
              aria-label={'Shadow softness'}
              aria-describedby={`${softnessId}-hint`}
              aria-valuetext={formatText('{value} times', {
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
              ? formatText(
                  'Higher values soften shadow edges. {value}× is the default.',
                  { value: DEFAULT_RENDERING_SETTINGS.shadowSoftness },
                )
              : 'Turn shadows on to adjust their softness.'}
          </small>
        </label>
        <label className="rendering-field">
          <span>{'Pixel density'}</span>
          <select
            aria-label={'Pixel density'}
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
            <option value="auto">{'Automatic'}</option>
            {[0.5, 0.75, 1, 1.25, 1.5, 1.75, 2].map((density) => (
              <option key={density} value={density}>
                {density}×
              </option>
            ))}
          </select>
          <small>
            {formatText(
              'Drawing at {density}× · {size} pixels. Interface text stays sharp.',
              {
                density: Number(state.pixelDensity.toFixed(2)),
                size: state.drawingBuffer.join(' × '),
              },
            )}
          </small>
        </label>
        <label className="rendering-field">
          <span>{'Contact shading'}</span>
          <select
            aria-label={'Contact shading'}
            value={settings.contactShading}
            disabled={!state.contactShadingSupported}
            onChange={(event) =>
              change({
                contactShading: event.currentTarget
                  .value as RenderingSettings['contactShading'],
              })
            }
          >
            <option value="auto">{'Automatic'}</option>
            <option value="on">{'On'}</option>
            <option value="off">{'Off'}</option>
          </select>
          <small>
            {state.contactShadingSupported
              ? formatText(
                  '{state} · Soft darkness at corners and where surfaces meet.',
                  {
                    state: state.contactShading ? 'On' : 'Off',
                  },
                )
              : 'Unavailable in this browser’s graphics context.'}
          </small>
        </label>
        <label className="rendering-toggle">
          <span>
            <strong>{'Earth and sky'}</strong>
            <small>{'The animated background behind the spacecraft.'}</small>
          </span>
          <input
            type="checkbox"
            role="switch"
            aria-label={'Earth and sky'}
            checked={settings.background}
            aria-checked={settings.background}
            onChange={(event) =>
              change({ background: event.currentTarget.checked })
            }
          />
        </label>
        <label className="rendering-toggle">
          <span>
            <strong>{'Spacecraft caching'}</strong>
            <small>
              {state.cacheAvailable
                ? 'Reuse stationary pixels while moving parts stay live.'
                : !state.cacheLightingSupported
                  ? 'Unavailable with cabin shadow lights.'
                  : 'Available on wider screens with shadows and contact shading on.'}
            </small>
          </span>
          <input
            type="checkbox"
            role="switch"
            aria-label={'Spacecraft caching'}
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
            {'Reset defaults'}
          </button>
          <small>{'Temporary for this visit. Reload restores defaults.'}</small>
        </footer>
      </div>
    </section>,
    document.body,
  );
}
