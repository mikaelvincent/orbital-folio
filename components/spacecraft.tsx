'use client';
import { pathFor } from '@/lib/paths';
import { useEffect, useRef, useState } from 'react';
import {
  ArrowUpRight,
  Pause,
  Play,
  RotateCcw,
  BookOpen,
  Orbit,
} from 'lucide-react';
export function Spacecraft({ site: s }: { site: Record<string, any> }) {
  const host = useRef<HTMLDivElement>(null);
  const api = useRef<{ pause: (p: boolean) => void; reset: () => void } | null>(
    null,
  );
  const [state, setState] = useState('loading');
  const [paused, setPaused] = useState(false);
  const [reading, setReading] = useState(false);
  useEffect(() => {
    if (reading) return;
    let destroyed = false;
    let cleanup = () => {};
    const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
    const saveData = (navigator as any).connection?.saveData;
    setPaused(reduced);
    if (saveData) {
      setState('fallback');
      return;
    }
    Promise.all([import('three'), import('./spacecraft-model')])
      .then(([THREE, { createSpacecraft }]) => {
        if (destroyed || !host.current) return;
        let renderer;
        try {
          renderer = new THREE.WebGLRenderer({
            antialias: true,
            alpha: true,
            powerPreference: 'low-power',
          });
        } catch {
          setState('fallback');
          return;
        }
        renderer.setPixelRatio(Math.min(devicePixelRatio, 1.5));
        renderer.outputColorSpace = THREE.SRGBColorSpace;
        renderer.toneMapping = THREE.ACESFilmicToneMapping;
        renderer.toneMappingExposure = 0.98;
        renderer.shadowMap.enabled = true;
        renderer.shadowMap.type = THREE.PCFShadowMap;
        const el = host.current;
        el.appendChild(renderer.domElement);
        renderer.domElement.setAttribute('aria-hidden', 'true');
        const scene = new THREE.Scene();
        const camera = new THREE.OrthographicCamera(
          -8.4,
          8.4,
          4.2,
          -4.2,
          0.1,
          100,
        );
        const target = new THREE.Vector3(0, 0, 0);
        const { group, targets, update } = createSpacecraft(THREE, {
          accent: s.accent,
          labels: {
            projects: s.projectsLabel,
            experience: s.experienceLabel,
            about: s.aboutLabel,
          },
        });
        scene.add(group);
        scene.add(new THREE.HemisphereLight(0xd9eaff, 0x525273, 1.15));
        const key = new THREE.DirectionalLight(0xffeddb, 2.8);
        key.position.set(-5, 9, 8);
        key.castShadow = true;
        key.shadow.mapSize.set(1024, 1024);
        key.shadow.camera.left = -10;
        key.shadow.camera.right = 10;
        key.shadow.camera.top = 7;
        key.shadow.camera.bottom = -7;
        key.shadow.normalBias = 0.035;
        scene.add(key);
        const rim = new THREE.DirectionalLight(0x6fa6ff, 1.8);
        rim.position.set(4, 4, -6);
        scene.add(rim);
        const fill = new THREE.DirectionalLight(0xffd9ab, 0.5);
        fill.position.set(-6, 0, 3);
        scene.add(fill);
        let angle = -0.24,
          elevation = 0.35,
          distance = 22,
          stop = reduced,
          visible = true,
          inViewport = true,
          frame = 0,
          last = 0,
          drag = false,
          moved = 0,
          px = 0,
          py = 0,
          hover = '';
        const ray = new THREE.Raycaster();
        const mouse = new THREE.Vector2();
        const draw = (t = 0) => {
          if (destroyed) return;
          const drift = stop ? 0 : Math.sin(t / 4000) * 0.018;
          camera.position.set(
            Math.sin(angle + drift) * distance,
            elevation * distance,
            Math.cos(angle + drift) * distance,
          );
          camera.lookAt(target);
          if (!stop) update?.(t / 1000, hover);
          renderer.render(scene, camera);
        };
        const loop = (t: number) => {
          frame = 0;
          if (!visible || stop) return;
          if (t - last > 32) {
            draw(t);
            last = t;
          }
          frame = requestAnimationFrame(loop);
        };
        const kick = () => {
          draw();
          if (!stop && visible && !frame) frame = requestAnimationFrame(loop);
        };
        const resize = () => {
          const w = el.clientWidth,
            h = el.clientHeight;
          renderer.setSize(w, h);
          const aspect = w / h;
          const half = w < 600 ? 7.8 : 8.4;
          camera.left = -half;
          camera.right = half;
          camera.top = half / aspect;
          camera.bottom = -half / aspect;
          camera.updateProjectionMatrix();
          distance = 22;
          if (w < 600) {
            angle = -0.4;
            group.rotation.z = 0.38;
          } else group.rotation.z = 0.04;
          kick();
        };
        const observer = new ResizeObserver(resize);
        observer.observe(el);
        resize();
        const intersection = new IntersectionObserver(([entry]) => {
          inViewport = entry.isIntersecting;
          visible = inViewport && !document.hidden;
          if (visible) kick();
          else {
            cancelAnimationFrame(frame);
            frame = 0;
          }
        });
        intersection.observe(el);
        const visibility = () => {
          visible = inViewport && !document.hidden;
          if (visible) kick();
          else {
            cancelAnimationFrame(frame);
            frame = 0;
          }
        };
        document.addEventListener('visibilitychange', visibility);
        const pick = (e: PointerEvent) => {
          const rect = el.getBoundingClientRect();
          mouse.set(
            ((e.clientX - rect.left) / rect.width) * 2 - 1,
            (-(e.clientY - rect.top) / rect.height) * 2 + 1,
          );
          ray.setFromCamera(mouse, camera);
          const hit = ray.intersectObjects(
            targets.map((t) => t.object),
            false,
          )[0];
          return (
            hit?.object.userData.section ||
            targets.find((t) => t.object === hit?.object)?.section ||
            ''
          );
        };
        const down = (e: PointerEvent) => {
          drag = true;
          moved = 0;
          px = e.clientX;
          py = e.clientY;
        };
        const move = (e: PointerEvent) => {
          if (drag) {
            const dx = e.clientX - px,
              dy = e.clientY - py;
            moved += Math.abs(dx) + Math.abs(dy);
            angle = Math.max(-0.8, Math.min(0.65, angle + dx * 0.004));
            elevation = Math.max(0.12, Math.min(0.65, elevation + dy * 0.002));
            px = e.clientX;
            py = e.clientY;
            kick();
          } else {
            hover = pick(e);
            el.style.cursor = hover ? 'pointer' : 'grab';
            if (stop) draw();
          }
        };
        const up = (e: PointerEvent) => {
          if (drag && moved < 7) {
            const section = pick(e);
            if (section) window.location.assign(pathFor('/' + section, s));
          }
          drag = false;
        };
        const end = () => {
          drag = false;
        };
        el.addEventListener('pointerdown', down);
        el.addEventListener('pointermove', move);
        el.addEventListener('pointerup', up);
        el.addEventListener('pointerleave', end);
        const motionChange = (e: MediaQueryListEvent) => {
          stop = e.matches;
          setPaused(stop);
          cancelAnimationFrame(frame);
          frame = 0;
          kick();
        };
        const mq = matchMedia('(prefers-reduced-motion: reduce)');
        mq.addEventListener('change', motionChange);
        const lost = (e: Event) => {
          e.preventDefault();
          setState('fallback');
          cancelAnimationFrame(frame);
        };
        renderer.domElement.addEventListener('webglcontextlost', lost);
        api.current = {
          pause(p) {
            stop = p;
            cancelAnimationFrame(frame);
            frame = 0;
            kick();
          },
          reset() {
            angle = el.clientWidth < 600 ? -0.54 : -0.24;
            elevation = 0.35;
            kick();
          },
        };
        setState('ready');
        kick();
        cleanup = () => {
          cancelAnimationFrame(frame);
          observer.disconnect();
          intersection.disconnect();
          document.removeEventListener('visibilitychange', visibility);
          mq.removeEventListener('change', motionChange);
          el.removeEventListener('pointerdown', down);
          el.removeEventListener('pointermove', move);
          el.removeEventListener('pointerup', up);
          el.removeEventListener('pointerleave', end);
          renderer.domElement.removeEventListener('webglcontextlost', lost);
          const materials = new Set<any>();
          const geometries = new Set<any>();
          scene.traverse((o: any) => {
            if (o.geometry) geometries.add(o.geometry);
            if (o.material)
              (Array.isArray(o.material) ? o.material : [o.material]).forEach(
                (m: any) => materials.add(m),
              );
          });
          materials.forEach((m) => {
            m.map?.dispose();
            m.dispose();
          });
          geometries.forEach((g) => g.dispose());
          renderer.dispose();
          renderer.domElement.remove();
          api.current = null;
        };
      })
      .catch(() => {
        if (!destroyed) setState('fallback');
      });
    return () => {
      destroyed = true;
      cleanup();
    };
  }, [reading, s]);
  return (
    <div
      id="ship"
      className={`ship-experience ${reading ? 'reading-active' : ''}`}
    >
      <div className="scene-toolbar">
        <span className="scene-caption">
          <Orbit size={16} />
          {s.shipCaption}
        </span>
        <div>
          <button
            type="button"
            onClick={() => setReading(!reading)}
            aria-pressed={reading}
          >
            <BookOpen size={15} />
            {reading ? s.sceneLabel : s.readLabel}
          </button>
          {!reading && state === 'ready' && (
            <>
              <button
                type="button"
                onClick={() => {
                  api.current?.pause(!paused);
                  setPaused(!paused);
                }}
                aria-label={paused ? s.resumeLabel : s.pauseLabel}
                title={paused ? s.resumeLabel : s.pauseLabel}
              >
                {paused ? <Play size={15} /> : <Pause size={15} />}
              </button>
              <button
                type="button"
                onClick={() => api.current?.reset()}
                aria-label={s.resetLabel}
                title={s.resetLabel}
              >
                <RotateCcw size={15} />
              </button>
            </>
          )}
        </div>
      </div>
      {!reading && (
        <div className="ship-stage" ref={host}>
          <noscript>
            <p className="nojs-scene">{s.sceneUnavailable}</p>
            <style>{`.scene-status{display:none}`}</style>
          </noscript>
          {state !== 'ready' && (
            <div className="scene-status" role="status">
              <Orbit size={36} />
              <p>
                {state === 'fallback' ? s.sceneUnavailable : s.sceneLoading}
              </p>
            </div>
          )}
        </div>
      )}
      <nav className="ship-stations" aria-label={s.sectionLabel}>
        {['projects', 'experience', 'about', 'contact'].map((id, i) => (
          <a key={id} href={pathFor('/' + id, s)}>
            <span className="station-index">0{i + 1}</span>
            <span>
              <small>{s[id + 'Room']}</small>
              <strong>{s[id + 'Label']}</strong>
            </span>
            <ArrowUpRight size={17} />
          </a>
        ))}
      </nav>
      {!reading && state === 'ready' && (
        <p className="scene-help">{s.sceneHelp}</p>
      )}
    </div>
  );
}
