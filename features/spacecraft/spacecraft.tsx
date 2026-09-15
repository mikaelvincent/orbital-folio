'use client';
import { useEffect, useRef, useState } from 'react';
import { SceneLoader } from './scene-loader';
import {
  mountSpacecraftScene,
  type SpacecraftProps,
  type SpacecraftSceneAPI,
} from './spacecraft-runtime';

export function Spacecraft(props: SpacecraftProps) {
  const host = useRef<HTMLDivElement>(null),
    api = useRef<SpacecraftSceneAPI | null>(null),
    latest = useRef(props);
  latest.current = props;
  const [state, setState] = useState('loading');
  const s = props.site;
  useEffect(() => {
    api.current?.go();
  }, [props.section, props.slug, props.readingSurface, props.projectPage]);
  useEffect(() => {
    api.current?.pause(props.paused);
  }, [props.paused]);
  useEffect(() => {
    api.current?.diagnostics(!!props.diagnosticsEnabled);
  }, [props.diagnosticsEnabled]);
  useEffect(() => {
    if (!props.enabled) return;
    return mountSpacecraftScene({ host, latest, api, setState, site: s });
  }, [props.enabled, s, props.links]);
  return (
    <div id="ship" className="ship-stage immersive-ship" ref={host}>
      {state !== 'ready' && (
        <SceneLoader site={s} unavailable={state === 'fallback'} />
      )}
      <noscript>
        <p>{s.sceneUnavailable}</p>
      </noscript>
    </div>
  );
}
