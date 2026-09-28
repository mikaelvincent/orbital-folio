'use client';

import { useEffect, useRef, useState } from 'react';
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
          Rendering
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
          aria-label="Close rendering controls"
          onClick={onClose}
        >
          <X size={18} aria-hidden="true" />
        </button>
      </header>
      <div id="rendering-controls-body" hidden={collapsed}>
        <p className="rendering-intro">
          Compare the appearance live. Changes stay when you close this panel.
        </p>
        <label className="rendering-toggle">
          <span>
            <strong>Shadows</strong>
            <small>Shadows cast by the spacecraft and its fittings.</small>
          </span>
          <input
            type="checkbox"
            role="switch"
            aria-label="Shadows"
            checked={settings.shadows}
            aria-checked={settings.shadows}
            onChange={(event) =>
              change({ shadows: event.currentTarget.checked })
            }
          />
        </label>
        <label className="rendering-field">
          <span>Shadow detail</span>
          <select
            aria-label="Shadow detail"
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
            <option value="auto">Automatic</option>
            <option value="512">Low · 512</option>
            <option value="1024">Medium · 1024</option>
            <option value="2048">High · 2048</option>
          </select>
          <small>
            {settings.shadows
              ? `${state.shadowSize} × ${state.shadowSize}. Lower detail gives coarser shadow edges.`
              : 'Turn shadows on to compare their detail.'}
          </small>
        </label>
        <label className="rendering-field">
          <span>Pixel density</span>
          <select
            aria-label="Pixel density"
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
            <option value="auto">Automatic</option>
            {[0.5, 0.75, 1, 1.25, 1.5, 1.75, 2].map((density) => (
              <option key={density} value={density}>
                {density}×
              </option>
            ))}
          </select>
          <small>
            Drawing at {Number(state.pixelDensity.toFixed(2))}× ·{' '}
            {state.drawingBuffer.join(' × ')} pixels. Interface text stays
            sharp.
          </small>
        </label>
        <label className="rendering-field">
          <span>Contact shading</span>
          <select
            aria-label="Contact shading"
            value={settings.contactShading}
            disabled={!state.contactShadingSupported}
            onChange={(event) =>
              change({
                contactShading: event.currentTarget
                  .value as RenderingSettings['contactShading'],
              })
            }
          >
            <option value="auto">Automatic</option>
            <option value="on">On</option>
            <option value="off">Off</option>
          </select>
          <small>
            {state.contactShadingSupported
              ? `${state.contactShading ? 'On' : 'Off'} · Soft darkness at corners and where surfaces meet.`
              : 'Unavailable in this browser’s graphics context.'}
          </small>
        </label>
        <label className="rendering-toggle">
          <span>
            <strong>Earth and sky</strong>
            <small>The animated background behind the spacecraft.</small>
          </span>
          <input
            type="checkbox"
            role="switch"
            aria-label="Earth and sky"
            checked={settings.background}
            aria-checked={settings.background}
            onChange={(event) =>
              change({ background: event.currentTarget.checked })
            }
          />
        </label>
        <label className="rendering-toggle">
          <span>
            <strong>Spacecraft caching</strong>
            <small>
              {state.cacheAvailable
                ? 'Reuse stationary pixels while moving parts stay live.'
                : 'Available on wider screens with shadows and contact shading on.'}
            </small>
          </span>
          <input
            type="checkbox"
            role="switch"
            aria-label="Spacecraft caching"
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
            <RotateCcw size={15} aria-hidden="true" /> Reset defaults
          </button>
          <small>Temporary for this visit. Reload restores defaults.</small>
        </footer>
      </div>
    </section>,
    document.body,
  );
}
