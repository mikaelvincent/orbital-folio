'use client';
import { useEffect, useRef, useState } from 'react';
import { Orbit } from 'lucide-react';
import { cursorTranslation, flightEase } from '@/lib/flight';
import type * as Three from 'three';

type Props = {
  site: Record<string, any>; section: string; detail: boolean; paused: boolean; enabled: boolean; hover: string;
  onHover: (section: string) => void; onNavigate: (section: string) => void; onSettled: () => void; onUnavailable: () => void;
};
type SceneAPI = { go: (section: string, detail: boolean) => void; pause: (paused: boolean) => void; hover: (section: string) => void };
export function Spacecraft(props: Props) {
  const host = useRef<HTMLDivElement>(null);
  const api = useRef<SceneAPI | null>(null);
  const latest = useRef(props);
  latest.current = props;
  const [state, setState] = useState('loading');
  const s = props.site;
  useEffect(() => { api.current?.go(props.section, props.detail); }, [props.section, props.detail]);
  useEffect(() => { api.current?.pause(props.paused); }, [props.paused]);
  useEffect(() => { api.current?.hover(props.hover); }, [props.hover]);
  useEffect(() => {
    if (!props.enabled) return;
    let destroyed = false;
    let cleanup = () => {};
    const unavailable = () => { if (!destroyed) { setState('fallback'); latest.current.onUnavailable(); } };
    if ((navigator as Navigator & { connection?: { saveData?: boolean } }).connection?.saveData) { unavailable(); return; }
    setState('loading');
    Promise.all([import('three'), import('./spacecraft-model'), import('./orbital-environment'), import('three/addons/environments/RoomEnvironment.js')])
      .then(([THREE, { createSpacecraft }, { createOrbitalEnvironment }, { RoomEnvironment }]) => {
        if (destroyed || !host.current) return;
        let renderer: Three.WebGLRenderer;
        try { renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false, powerPreference: 'high-performance' }); }
        catch { unavailable(); return; }
        const el = host.current;
        renderer.setPixelRatio(Math.min(devicePixelRatio, innerWidth < 700 ? 1.5 : 1.75));
        renderer.outputColorSpace = THREE.SRGBColorSpace;
        renderer.toneMapping = THREE.ACESFilmicToneMapping;
        renderer.toneMappingExposure = .98;
        renderer.shadowMap.enabled = true;
        renderer.shadowMap.type = THREE.PCFShadowMap;
        // Hull geometry is static: cache its shadow pass until responsive framing changes.
        renderer.shadowMap.autoUpdate = false;
        renderer.shadowMap.needsUpdate = true;
        renderer.autoClear = false;
        renderer.info.autoReset = false;
        el.appendChild(renderer.domElement);
        renderer.domElement.setAttribute('aria-hidden', 'true');
        el.dataset.rendererId = crypto.randomUUID();
        const scene = new THREE.Scene();
        const camera = new THREE.PerspectiveCamera(38, 1, .1, 150);
        // Every destination uses the same orientation. Flights dolly toward fixed room anchors.
        const direction = new THREE.Vector3(-.23, .32, 1).normalize();
        camera.position.copy(direction);
        camera.lookAt(0, 0, 0);
        const pmrem = new THREE.PMREMGenerator(renderer);
        const roomEnvironment = new RoomEnvironment();
        const environment = pmrem.fromScene(roomEnvironment, .035);
        scene.environment = environment.texture;
        scene.environmentIntensity = .34;
        roomEnvironment.dispose();
        pmrem.dispose();
        const model = createSpacecraft(THREE, { accent: s.accent, labels: {
          projects: s.projectsLabel, experience: s.experienceLabel, about: s.aboutLabel, contact: s.contactLabel,
        } });
        scene.add(model.group);
        const ambient = new THREE.HemisphereLight(0xcedfff, 0x283449, .38);
        scene.add(ambient);
        const key = new THREE.DirectionalLight(0xffe3c4, 2.6);
        key.position.set(-7, 10, 10);
        key.castShadow = true;
        key.shadow.mapSize.set(innerWidth < 700 ? 1024 : 2048, innerWidth < 700 ? 1024 : 2048);
        Object.assign(key.shadow.camera, { left: -11, right: 11, top: 8, bottom: -8, near: .5, far: 36 });
        key.shadow.normalBias = .018;
        key.shadow.bias = -.00015;
        key.shadow.radius = 3;
        scene.add(key);
        const rim = new THREE.DirectionalLight(0x729eff, 1.5);
        rim.position.set(4, 3, -7);
        scene.add(rim);
        const bounce = new THREE.DirectionalLight(0xffd39a, .45);
        bounce.position.set(-2, -1, 6);
        scene.add(bounce);
        const ray = new THREE.Raycaster(), pointer = new THREE.Vector2();
        const currentTarget = new THREE.Vector3(), fromTarget = new THREE.Vector3(), nextTarget = new THREE.Vector3();
        const pointerCurrent = new THREE.Vector2(), pointerGoal = new THREE.Vector2();
        let stop = latest.current.paused, visible = !document.hidden, inViewport = true, frame = 0, lastFrame = 0;
        let active = 'home', hovered = '', detail = false, distance = 23, fromDistance = 23, nextDistance = 23;
        let flightStart = 0, flightDuration = 0, travelling = false, lastPointerPick = 0, lastMetrics = 0, animationTime = 0, notifyArrival = true, renderCost = 0;
        let down: { x: number; y: number; section: string } | null = null;
        const background = createOrbitalEnvironment(THREE, () => kick());
        const anchors: Record<string, [number, number, number]> = {
          home: [0, .1, 0], projects: [-3, .12, .05], experience: [0, .12, .05], about: [3, .12, .05], contact: [-5.5, .15, .05], privacy: [-5.5, .15, .05],
        };
        const pose = (section: string, isDetail: boolean) => {
          const mobile = el.clientWidth < 700;
          const target = new THREE.Vector3(...(anchors[section] || anchors.home));
          target.applyMatrix4(model.group.matrixWorld);
          if (section === 'home') {
            const box = new THREE.Box3().setFromObject(model.group);
            const size = box.getSize(new THREE.Vector3());
            const verticalFov = THREE.MathUtils.degToRad(camera.fov);
            const fitHeight = size.y / (2 * Math.tan(verticalFov / 2));
            const fitWidth = size.x / (2 * Math.tan(verticalFov / 2) * camera.aspect);
            return { target, distance: Math.max(fitHeight, fitWidth) * (mobile ? .97 : 1.09) + 2.7 };
          }
          // A predictable frontal approach; the room's shell remains around the reading surface.
          return { target, distance: mobile ? 10.6 : isDetail ? 7.1 : 8.5 };
        };
        const go = (section: string, isDetail: boolean, immediate = false, notify = true) => {
          active = section; detail = isDetail;
          notifyArrival = notify;
          const desired = pose(section, isDetail);
          fromTarget.copy(currentTarget); nextTarget.copy(desired.target);
          fromDistance = distance; nextDistance = desired.distance;
          flightStart = performance.now();
          flightDuration = stop || immediate ? 0 : section === 'home' ? 1100 : 1250;
          travelling = true;
          el.dataset.activeRoom = active;
          kick();
        };
        const draw = (now = performance.now()) => {
          if (destroyed) return;
          const started = performance.now();
          if (travelling) {
            const progress = flightDuration ? Math.min(1, (now - flightStart) / flightDuration) : 1;
            const ease = flightEase(progress);
            currentTarget.lerpVectors(fromTarget, nextTarget, ease);
            distance = fromDistance + (nextDistance - fromDistance) * ease;
            if (progress === 1) { travelling = false; if (notifyArrival) latest.current.onSettled(); }
          }
          pointerCurrent.lerp(pointerGoal, stop ? 1 : .07);
          const offset = cursorTranslation(pointerCurrent.x, pointerCurrent.y, stop || active !== 'home');
          camera.position.copy(currentTarget).addScaledVector(direction, distance);
          camera.position.x += offset[0]; camera.position.y += offset[1];
          // Deliberately no lookAt() here: cursor and drag can never rotate the camera.
          if (!stop) animationTime = now / 1000;
          model.update(animationTime, hovered, stop);
          background.update(now / 1000, !stop, offset[0], offset[1]);
          renderer.info.reset();
          renderer.clear();
          renderer.render(background.scene, background.camera);
          renderer.clearDepth();
          renderer.render(scene, camera);
          renderCost = renderCost * .9 + (performance.now() - started) * .1;
          if (now - lastMetrics > 200 || stop) {
            el.dataset.cameraPosition = camera.position.toArray().map(n => n.toFixed(4)).join(',');
            el.dataset.cameraQuaternion = camera.quaternion.toArray().map(n => n.toFixed(6)).join(',');
            el.dataset.shipRotation = model.group.rotation.toArray().slice(0, 3).join(',');
            el.dataset.renderCalls = String(renderer.info.render.calls);
            el.dataset.triangles = String(renderer.info.render.triangles);
            el.dataset.renderCpuMs = renderCost.toFixed(2);
            el.dataset.hoverRoom = hovered;
            el.dataset.travelling = String(travelling);
            el.dataset.motion = stop ? 'reduced' : 'active';
            lastMetrics = now;
          }
        };
        const loop = (now: number) => {
          frame = 0;
          if (!visible || (stop && !travelling)) return;
          if (now - lastFrame >= 1000 / 30) { draw(now); lastFrame = now; }
          frame = requestAnimationFrame(loop);
        };
        function kick() {
          if (destroyed || !visible) return;
          draw();
          if ((!stop || travelling) && !frame) frame = requestAnimationFrame(loop);
        }
        const resize = () => {
          const w = Math.max(1, el.clientWidth), h = Math.max(1, el.clientHeight);
          renderer.setSize(w, h);
          camera.aspect = w / h;
          camera.updateProjectionMatrix();
          model.group.rotation.z = w < 700 ? .86 : .045;
          model.group.updateMatrixWorld(true);
          renderer.shadowMap.needsUpdate = true;
          background.resize(w, h, renderer.getPixelRatio());
          go(active, detail, true, travelling);
        };
        const observer = new ResizeObserver(resize);
        observer.observe(el); resize();
        const pick = (event: PointerEvent) => {
          const rect = el.getBoundingClientRect();
          pointer.set((event.clientX - rect.left) / rect.width * 2 - 1, -(event.clientY - rect.top) / rect.height * 2 + 1);
          ray.setFromCamera(pointer, camera);
          const hit = ray.intersectObjects(model.targets.map(t => t.object), true)[0];
          let object: Three.Object3D | undefined = hit?.object;
          while (object) { if (object.userData.section) return String(object.userData.section); object = object.parent || undefined; }
          return model.targets.find(t => t.object === hit?.object)?.section || '';
        };
        const hoverSection = (section: string) => { hovered = section; el.style.cursor = section ? 'pointer' : 'default'; kick(); };
        const move = (event: PointerEvent) => {
          const rect = el.getBoundingClientRect();
          if (event.pointerType !== 'touch') pointerGoal.set((event.clientX - rect.left) / rect.width * 2 - 1, -((event.clientY - rect.top) / rect.height * 2 - 1));
          if (performance.now() - lastPointerPick > 45) {
            const section = pick(event);
            if (hovered !== section) { hoverSection(section); latest.current.onHover(section); }
            lastPointerPick = performance.now();
          }
          if (stop) kick();
        };
        const pointerDown = (event: PointerEvent) => { down = { x: event.clientX, y: event.clientY, section: pick(event) }; };
        const pointerUp = (event: PointerEvent) => {
          if (down && Math.hypot(event.clientX - down.x, event.clientY - down.y) < 8 && down.section) latest.current.onNavigate(down.section);
          down = null;
        };
        const leave = () => { down = null; pointerGoal.set(0, 0); hoverSection(''); latest.current.onHover(''); };
        el.addEventListener('pointerdown', pointerDown); el.addEventListener('pointerup', pointerUp);
        el.addEventListener('pointermove', move); el.addEventListener('pointerleave', leave); el.addEventListener('pointercancel', leave);
        const syncVisibility = () => {
          visible = inViewport && !document.hidden;
          if (visible) kick(); else { cancelAnimationFrame(frame); frame = 0; }
        };
        const intersection = new IntersectionObserver(([entry]) => { inViewport = entry.isIntersecting; syncVisibility(); });
        intersection.observe(el);
        document.addEventListener('visibilitychange', syncVisibility);
        const lost = (event: Event) => { event.preventDefault(); cancelAnimationFrame(frame); frame = 0; unavailable(); };
        renderer.domElement.addEventListener('webglcontextlost', lost);
        api.current = {
          go, hover: hoverSection,
          pause(value) { stop = value; if (value) pointerGoal.set(0, 0); cancelAnimationFrame(frame); frame = 0; if (travelling && value) flightDuration = 0; kick(); },
        };
        setState('ready');
        go(latest.current.section, latest.current.detail, latest.current.section === 'home');
        cleanup = () => {
          cancelAnimationFrame(frame); observer.disconnect(); intersection.disconnect();
          document.removeEventListener('visibilitychange', syncVisibility);
          el.removeEventListener('pointerdown', pointerDown); el.removeEventListener('pointerup', pointerUp);
          el.removeEventListener('pointermove', move); el.removeEventListener('pointerleave', leave); el.removeEventListener('pointercancel', leave);
          renderer.domElement.removeEventListener('webglcontextlost', lost);
          const materials = new Set<Three.Material>(), geometries = new Set<Three.BufferGeometry>(), textures = new Set<Three.Texture>();
          scene.traverse(object => {
            if (object instanceof THREE.Mesh || object instanceof THREE.InstancedMesh) {
              geometries.add(object.geometry);
              (Array.isArray(object.material) ? object.material : [object.material]).forEach(m => {
                materials.add(m);
                for (const value of Object.values(m)) if (value instanceof THREE.Texture) textures.add(value);
              });
            }
          });
          materials.forEach(m => m.dispose()); geometries.forEach(g => g.dispose()); textures.forEach(t => t.dispose());
          background.dispose(); environment.dispose(); key.shadow.dispose(); renderer.dispose(); renderer.domElement.remove(); api.current = null;
        };
      }).catch(unavailable);
    return () => { destroyed = true; cleanup(); };
  }, [props.enabled, s]);
  return <div id="ship" className="ship-stage immersive-ship" ref={host}>
    {state !== 'ready' && <div className="scene-status" role="status"><Orbit size={28} /><p>{state === 'fallback' ? s.sceneUnavailable : s.sceneLoading}</p></div>}
    <noscript><p>{s.sceneUnavailable}</p></noscript>
  </div>;
}
