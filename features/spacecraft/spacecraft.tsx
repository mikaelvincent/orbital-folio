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
  // Refresh collection availability before a changed selection is framed.
  // Content updates must not recreate the scene or reset its physical camera.
  useEffect(() => {
    api.current?.projects();
  }, [props.projects]);
  useEffect(() => {
    api.current?.caseStudies?.();
  }, [props.caseStudies]);
  useEffect(() => {
    api.current?.go();
  }, [
    props.section,
    props.readingSurface,
    props.projectPage,
    props.projectScreen,
  ]);
  useEffect(() => {
    api.current?.pause(props.paused);
  }, [props.paused]);
  useEffect(() => {
    api.current?.diagnostics(!!props.diagnosticsEnabled);
  }, [props.diagnosticsEnabled]);
  useEffect(() => {
    if (!props.enabled) return;
    return mountSpacecraftScene({
      host,
      latest,
      api,
      setState,
      site: s,
      audit: props.audit,
    });
  }, [props.enabled, s, props.links, props.audit]);
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
