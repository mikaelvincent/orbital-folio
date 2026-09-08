'use client';
import { useEffect, useRef, useState } from 'react';
import { Orbit } from 'lucide-react';
import { cursorRotation, damping, flightEase } from '@/lib/flight';
import type * as Three from 'three';

type Props = {
  site: Record<string, any>;
  projects: Record<string, any>[];
  section: string;
  slug?: string;
  readingSurface: boolean;
  projectPage: number;
  paused: boolean;
  enabled: boolean;
  hover: string;
  onHover: (section: string) => void;
  onNavigate: (section: string) => void;
  onOpen: (section: string, slug?: string) => void;
  onSurfaceReady: (element: HTMLDivElement | null) => void;
  onSettled: () => void;
  onUnavailable: () => void;
};
type SceneAPI = {
  go: () => void;
  pause: (paused: boolean) => void;
  hover: (section: string) => void;
};
export function Spacecraft(props: Props) {
  const host = useRef<HTMLDivElement>(null),
    api = useRef<SceneAPI | null>(null),
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
    api.current?.hover(props.hover);
  }, [props.hover]);
  useEffect(() => {
    if (!props.enabled) return;
    let destroyed = false,
      cleanup = () => {};
    const unavailable = () => {
      if (!destroyed) {
        setState('fallback');
        latest.current.onUnavailable();
      }
    };
    if (
      (navigator as Navigator & { connection?: { saveData?: boolean } })
        .connection?.saveData
    ) {
      unavailable();
      return;
    }
    setState('loading');
    Promise.all([
      import('three'),
      import('./spacecraft-model'),
      import('./orbital-environment'),
      import('three/addons/environments/RoomEnvironment.js'),
      import('three/addons/renderers/CSS3DRenderer.js'),
      import('three/addons/postprocessing/GTAOPass.js'),
      import('three/addons/postprocessing/Pass.js'),
    ])
      .then(
        ([
          THREE,
          { createSpacecraft },
          { createOrbitalEnvironment },
          { RoomEnvironment },
          { CSS3DRenderer, CSS3DObject },
          { GTAOPass },
          { FullScreenQuad },
        ]) => {
          if (destroyed || !host.current) return;
          let renderer: Three.WebGLRenderer;
          try {
            renderer = new THREE.WebGLRenderer({
              antialias: true,
              alpha: false,
              powerPreference: 'high-performance',
            });
          } catch {
            unavailable();
            return;
          }
          const el = host.current;
          const mobile = () => el.clientWidth < 700;
          const memory = (navigator as Navigator & { deviceMemory?: number })
            .deviceMemory;
          const capableShading =
            navigator.hardwareConcurrency >= 8 &&
            (memory === undefined || memory >= 8);
          const highQuality =
            capableShading && memory !== undefined && memory >= 8;
          const contactShading =
            capableShading && renderer.extensions.has('EXT_color_buffer_float');
          renderer.setPixelRatio(
            Math.min(devicePixelRatio, mobile() ? 1.75 : 2),
          );
          renderer.outputColorSpace = THREE.SRGBColorSpace;
          renderer.toneMapping = THREE.ACESFilmicToneMapping;
          renderer.toneMappingExposure = 0.95;
          renderer.shadowMap.enabled = true;
          renderer.shadowMap.type = THREE.PCFShadowMap;
          renderer.shadowMap.autoUpdate = false;
          renderer.shadowMap.needsUpdate = true;
          renderer.autoClear = false;
          renderer.info.autoReset = false;
          el.appendChild(renderer.domElement);
          renderer.domElement.setAttribute('aria-hidden', 'true');
          el.dataset.rendererId = crypto.randomUUID();
          const scene = new THREE.Scene(),
            cssScene = new THREE.Scene(),
            cssGroup = new THREE.Group();
          cssScene.add(cssGroup);
          const cssRenderer = new CSS3DRenderer();
          cssRenderer.domElement.className = 'world-css-renderer';
          el.appendChild(cssRenderer.domElement);
          const surfaceElement = document.createElement('div');
          surfaceElement.className = 'world-surface';
          const surface = new CSS3DObject(surfaceElement);
          cssScene.add(surface);
          latest.current.onSurfaceReady(surfaceElement);
          const camera = new THREE.PerspectiveCamera(38, 1, 0.5, 80);
          const pmrem = new THREE.PMREMGenerator(renderer),
            roomEnvironment = new RoomEnvironment();
          const environment = pmrem.fromScene(roomEnvironment, 0.035);
          scene.environment = environment.texture;
          scene.environmentIntensity = 0.24;
          roomEnvironment.dispose();
          pmrem.dispose();
          const model = createSpacecraft(THREE, {
            accent: s.accent,
            sampleLabel: s.sampleLabel,
            projects: latest.current.projects.map((p) => ({
              title: String(p.title),
              slug: String(p.slug),
              category: p.category,
              sample: p.sample,
            })),
            labels: {
              projects: s.projectsLabel,
              experience: s.experienceLabel,
              about: s.aboutLabel,
              contact: s.contactLabel,
            },
          });
          scene.add(model.group);
          scene.add(new THREE.HemisphereLight(0xe0eaff, 0x394553, 0.28));
          const key = new THREE.DirectionalLight(0xffe3c1, 2.2);
          key.position.set(-7, 10, 12);
          key.castShadow = true;
          key.shadow.mapSize.set(
            mobile() ? 1024 : 2048,
            mobile() ? 1024 : 2048,
          );
          Object.assign(key.shadow.camera, {
            left: -10,
            right: 10,
            top: 7,
            bottom: -7,
            near: 0.5,
            far: 36,
          });
          key.shadow.normalBias = 0.035;
          key.shadow.bias = -0.00008;
          scene.add(key);
          const rim = new THREE.DirectionalLight(0x91b8ff, 1.2);
          rim.position.set(4, 3, -7);
          scene.add(rim);
          const bounce = new THREE.DirectionalLight(0xffd7a4, 0.45);
          bounce.position.set(-2, -1, 6);
          scene.add(bounce);
          // Half-resolution, denoised contact shading gives the toy-like fittings weight.
          // It multiplies only the WebGL scene; HTML stays sharp and native.
          const ao = new GTAOPass(scene, camera, 512, 512);
          ao.updateGtaoMaterial({
            radius: 0.32,
            thickness: 0.18,
            distanceExponent: 1.2,
            scale: 1,
            samples: 32,
          });
          ao.updatePdMaterial({ radius: 9, samples: 32 });
          ao.output = GTAOPass.OUTPUT.Off;
          const aoMaterial = new THREE.ShaderMaterial({
            uniforms: { map: { value: ao.pdRenderTarget.texture } },
            vertexShader:
              'varying vec2 vUv; void main(){vUv=uv;gl_Position=vec4(position.xy,0.,1.);}',
            fragmentShader:
              'uniform sampler2D map; varying vec2 vUv; void main(){float ao=texture2D(map,vUv).r;gl_FragColor=vec4(vec3(mix(1.,ao,.40)),1.);}',
            transparent: true,
            blending: THREE.CustomBlending,
            blendSrc: THREE.DstColorFactor,
            blendDst: THREE.ZeroFactor,
            depthTest: false,
            depthWrite: false,
            toneMapped: false,
          });
          const aoQuad = new FullScreenQuad(aoMaterial);
          let aoDirty = true,
            previousGeometryMotion = false;
          const aoCameraPosition = new THREE.Vector3(),
            aoCameraQuaternion = new THREE.Quaternion();
          let aoRoll = 0;
          const anchors: Record<string, [number, number, number]> = {
            home: [0, 0.08, 0],
            projects: [-3, 0, 0.3],
            experience: [0, 0, 0.3],
            about: [3, 0, 0.3],
            contact: [-5.5, 0, 0.3],
            privacy: [-5.5, 0, 0.3],
          };
          const ray = new THREE.Raycaster(),
            pointer = new THREE.Vector2();
          // Simple invisible picking volumes avoid intersecting the entire detailed pressure hull on every pointer move.
          const proxies: Three.Mesh[] = [];
          const proxyMaterial = new THREE.MeshBasicMaterial({ visible: false });
          for (const section of [
            'projects',
            'experience',
            'about',
            'contact',
          ]) {
            const mesh = new THREE.Mesh(
              new THREE.BoxGeometry(
                section === 'contact' ? 1.1 : 2.84,
                2.95,
                2.5,
              ),
              proxyMaterial,
            );
            mesh.position.set(anchors[section][0], 0, 0);
            mesh.visible = false;
            mesh.userData.section = section;
            model.group.add(mesh);
            proxies.push(mesh);
          }
          const hotspotObjects: {
            object: InstanceType<typeof CSS3DObject>;
            button: HTMLButtonElement;
            section: string;
            slot?: number;
          }[] = [];
          const addHotspot = (
            section: string,
            position: [number, number, number],
            slot?: number,
          ) => {
            const button = document.createElement('button');
            button.type = 'button';
            button.className = 'world-hotspot';
            const object = new CSS3DObject(button);
            object.position.set(...position);
            object.scale.setScalar(0.004);
            cssGroup.add(object);
            hotspotObjects.push({ object, button, section, slot });
            button.onclick = () => {
              const p =
                slot === undefined
                  ? undefined
                  : latest.current.projects[
                      latest.current.projectPage * 3 + slot
                    ];
              latest.current.onOpen(section, p?.slug);
            };
            button.onfocus = () => latest.current.onHover(section);
            button.onblur = () => latest.current.onHover('');
          };
          for (let i = 0; i < 3; i++)
            addHotspot('projects', [-3.85 + i * 0.85, 0.1, 0.25], i);
          addHotspot('experience', [0, -0.2, 0.65]);
          addHotspot('about', [3.3, -0.45, 0.9]);
          addHotspot('contact', [-5.5, -0.2, 1.3]);
          const currentTarget = new THREE.Vector3(),
            fromTarget = new THREE.Vector3(),
            nextTarget = new THREE.Vector3();
          const viewDirection = new THREE.Vector3(-0.28, 0.22, 1).normalize(),
            fromDirection = viewDirection.clone(),
            nextDirection = viewDirection.clone();
          const pointerCurrent = new THREE.Vector2(),
            pointerGoal = new THREE.Vector2();
          let stop = latest.current.paused,
            visible = !document.hidden,
            inViewport = true,
            frame = 0,
            lastFrame = 0;
          let active = 'home',
            hovered = '',
            reading = false,
            distance = 23,
            fromDistance = 23,
            nextDistance = 23;
          let roll = 0,
            fromRoll = 0,
            nextRoll = 0,
            hoverLift = 0;
          let flightStart = 0,
            flightDuration = 0,
            travelling = false,
            lastPick = 0,
            lastMetrics = 0,
            elapsed = 0,
            notifyArrival = true,
            renderCost = 0;
          let hiddenAt = 0;
          let down: {
            x: number;
            y: number;
            section: string;
            slug?: string;
            open?: boolean;
          } | null = null;
          const frameIntervals: number[] = [];
          const background = createOrbitalEnvironment(THREE, () => kick(), {
            mobile: mobile(),
            maxTextureSize: Math.min(
              renderer.capabilities.maxTextureSize,
              highQuality ? 8192 : 4096,
            ),
            maxAnisotropy: renderer.capabilities.getMaxAnisotropy(),
          });
          const readerStretch = () =>
            mobile()
              ? Math.max(
                  1,
                  Math.min(
                    1.5,
                    (el.clientHeight - 200) / (el.clientWidth - 32) / 1.125,
                  ),
                )
              : 1;
          const paperPixels = () =>
            Math.max(
              220,
              Math.min(
                mobile() ? 360 : 560,
                el.clientWidth - 32,
                (el.clientHeight - 200) / (1.125 * readerStretch()),
              ),
            );
          const pose = (section: string, isReading: boolean) => {
            const home = section === 'home';
            const target = new THREE.Vector3(
              ...(anchors[section] || anchors.home),
            );
            const desiredRoll = home ? (mobile() ? 0.91 : 0.065) : 0;
            if (isReading) {
              target.y = 0;
              target.z = 1.72;
            }
            target.applyAxisAngle(new THREE.Vector3(0, 0, 1), desiredRoll);
            if (home && mobile())
              target.addScaledVector(
                new THREE.Vector3(1, 0, 0.28).normalize(),
                0.63,
              );
            let desiredDistance = isReading
              ? (2.4 * el.clientHeight) /
                (2 *
                  Math.tan(THREE.MathUtils.degToRad(camera.fov) / 2) *
                  paperPixels())
              : mobile()
                ? Math.max(
                    6.5,
                    (3.3 * el.clientHeight) /
                      (2 *
                        Math.tan(THREE.MathUtils.degToRad(camera.fov) / 2) *
                        (el.clientWidth - 24)),
                  )
                : 6.9;
            if (home) {
              // Fixed silhouette bounds keep framing stable while doors and reader trays move.
              const w = mobile() ? 12.2 : 16,
                h = mobile() ? 13.6 : 8.2;
              desiredDistance =
                (Math.max(h, w / camera.aspect) /
                  (2 * Math.tan(THREE.MathUtils.degToRad(camera.fov) / 2))) *
                1.02;
            }
            return {
              target,
              distance: desiredDistance,
              roll: desiredRoll,
              direction: new THREE.Vector3(
                home ? -0.28 : -0.025,
                home ? 0.22 : 0.018,
                1,
              ).normalize(),
            };
          };
          const go = (immediate = false, notify = true) => {
            aoDirty = true;
            active = latest.current.section;
            reading = latest.current.readingSurface;
            notifyArrival = notify;
            if (model.group.userData.projectPage !== latest.current.projectPage)
              model.setProjectPage(latest.current.projectPage);
            const desired = pose(active, reading);
            fromTarget.copy(currentTarget);
            nextTarget.copy(desired.target);
            fromDirection.copy(viewDirection);
            nextDirection.copy(desired.direction);
            fromDistance = distance;
            nextDistance = desired.distance;
            fromRoll = roll;
            nextRoll = desired.roll;
            flightStart = performance.now();
            flightDuration = stop || immediate ? 0 : reading ? 800 : 1150;
            travelling = true;
            el.dataset.activeRoom = active;
            kick();
          };
          const draw = (now: number, delta: number, rawDelta: number) => {
            if (destroyed) return;
            const started = performance.now();
            if (!stop) {
              elapsed += delta;
              if (delta > 0) {
                frameIntervals.push(rawDelta * 1000);
                if (frameIntervals.length > 360) frameIntervals.shift();
              }
            }
            if (travelling) {
              const progress = flightDuration
                  ? Math.min(1, (now - flightStart) / flightDuration)
                  : 1,
                ease = flightEase(progress);
              currentTarget.lerpVectors(fromTarget, nextTarget, ease);
              viewDirection
                .lerpVectors(fromDirection, nextDirection, ease)
                .normalize();
              distance = fromDistance + (nextDistance - fromDistance) * ease;
              const previousRoll = roll;
              roll = fromRoll + (nextRoll - fromRoll) * ease;
              if (Math.abs(previousRoll - roll) > 0.0001)
                renderer.shadowMap.needsUpdate = true;
              if (progress === 1) {
                travelling = false;
                if (notifyArrival) latest.current.onSettled();
              }
            }
            pointerCurrent.lerp(pointerGoal, stop ? 1 : damping(delta));
            hoverLift +=
              ((hovered && active === 'home' ? 1 : 0) - hoverLift) *
              (stop ? 1 : damping(delta, 5));
            const angles = cursorRotation(
              pointerCurrent.x,
              pointerCurrent.y,
              stop || reading,
            );
            const direction = viewDirection
              .clone()
              .applyEuler(new THREE.Euler(angles[0], angles[1], 0));
            const cameraTarget = currentTarget.clone();
            if (active === 'home' && hovered && !stop)
              cameraTarget.x +=
                (anchors[hovered]?.[0] || 0) * 0.018 * hoverLift;
            camera.position
              .copy(cameraTarget)
              .addScaledVector(
                direction,
                distance * (1 - (stop ? 0 : 0.025 * hoverLift)),
              );
            camera.lookAt(cameraTarget);
            model.group.rotation.z = roll;
            cssGroup.rotation.z = roll;
            model.update(elapsed, hovered, stop, {
              activeRoom: active,
              selectedProject: latest.current.slug,
              projectPage: latest.current.projectPage,
              reading,
              delta,
            });
            // Moving doors/readers do not cast into the cached static shadow map.
            for (const anchor of Object.values(model.readerSurfaces))
              anchor.parent.scale.y *= readerStretch();
            model.group.updateMatrixWorld(true);
            const logicalWidth = paperPixels();
            surfaceElement.style.width = `${logicalWidth}px`;
            surfaceElement.style.height = `${logicalWidth * 1.125 * readerStretch()}px`;
            surfaceElement.dataset.compact = String(mobile());
            const physicalSurface = model.readerSurfaces[active];
            if (physicalSurface) {
              physicalSurface.matrixWorld.decompose(
                surface.position,
                surface.quaternion,
                surface.scale,
              );
              surface.scale.multiplyScalar(
                physicalSurface.userData.width / logicalWidth,
              );
              surface.scale.y /= readerStretch();
            }
            surface.visible = reading && !travelling;
            surfaceElement.inert = !surface.visible;
            for (const h of hotspotObjects) {
              const project =
                h.slot === undefined
                  ? undefined
                  : latest.current.projects[
                      latest.current.projectPage * 3 + h.slot
                    ];
              h.object.visible =
                active === h.section &&
                !reading &&
                !travelling &&
                (h.slot === undefined || !!project);
              h.button.inert = !h.object.visible;
              const label = project
                ? `${s.projectCta}: ${project.title}`
                : h.section === 'about'
                  ? s.journalLabel
                  : h.section === 'experience'
                    ? s.readAllLabel
                    : s.inviteLabel;
              if (h.button.textContent !== label) h.button.textContent = label;
              h.button.setAttribute('aria-label', label);
              h.button.classList.toggle('locker-hotspot', h.slot !== undefined);
              h.button.dataset.projectSlug = project?.slug || '';
            }
            background.update(
              elapsed,
              !stop,
              stop ? 0 : pointerCurrent.x * 0.12,
              stop ? 0 : pointerCurrent.y * 0.08,
            );
            renderer.info.reset();
            renderer.clear();
            renderer.render(background.scene, background.camera);
            renderer.clearDepth();
            renderer.render(scene, camera);
            if (!mobile() && contactShading) {
              const geometryMotion = !!model.group.userData.motionActive;
              if (
                aoDirty ||
                geometryMotion ||
                previousGeometryMotion ||
                aoCameraPosition.distanceToSquared(camera.position) > 1e-8 ||
                aoCameraQuaternion.angleTo(camera.quaternion) > 1e-5 ||
                aoRoll !== roll
              ) {
                ao.render(
                  renderer,
                  ao.pdRenderTarget,
                  ao.pdRenderTarget,
                  delta,
                  false,
                );
                aoCameraPosition.copy(camera.position);
                aoCameraQuaternion.copy(camera.quaternion);
                aoRoll = roll;
                aoDirty = false;
              }
              previousGeometryMotion = geometryMotion;
              renderer.setRenderTarget(null);
              aoQuad.render(renderer);
            }
            cssRenderer.render(cssScene, camera);
            renderCost = renderCost * 0.9 + (performance.now() - started) * 0.1;
            if (now - lastMetrics > 200 || stop) {
              Object.assign(el.dataset, {
                cameraPosition: camera.position
                  .toArray()
                  .map((n) => n.toFixed(4))
                  .join(','),
                cameraQuaternion: camera.quaternion
                  .toArray()
                  .map((n) => n.toFixed(6))
                  .join(','),
                shipRotation: model.group.rotation
                  .toArray()
                  .slice(0, 3)
                  .join(','),
                renderCalls: String(renderer.info.render.calls),
                triangles: String(renderer.info.render.triangles),
                renderCpuMs: renderCost.toFixed(2),
                hoverRoom: hovered,
                travelling: String(travelling),
                motion: stop ? 'reduced' : 'active',
                activeTime: elapsed.toFixed(3),
                readerAttached: String(surface.visible),
                projectPage: String(latest.current.projectPage),
              });
              const sorted = [...frameIntervals].sort((a, b) => a - b);
              el.dataset.frameP50 = (
                sorted[Math.floor(sorted.length * 0.5)] || 0
              ).toFixed(2);
              el.dataset.frameP95 = (
                sorted[Math.floor(sorted.length * 0.95)] || 0
              ).toFixed(2);
              el.dataset.frameP99 = (
                sorted[Math.floor(sorted.length * 0.99)] || 0
              ).toFixed(2);
              el.dataset.frameOver50 = String(
                sorted.filter((n) => n > 50).length,
              );
              el.dataset.shadowsEnabled = String(renderer.shadowMap.enabled);
              el.dataset.quality = mobile()
                ? 'mobile-2k'
                : highQuality
                  ? 'desktop-high'
                  : 'desktop-4k';
              el.dataset.contactShading = String(contactShading && !mobile());
              el.dataset.frameSamples = String(sorted.length);
              el.dataset.environment = JSON.stringify(
                background.getDiagnostics(),
              );
              if (reading && model.readerSurfaces[active]) {
                const points = [
                  [-1.2, 1.35],
                  [1.2, 1.35],
                  [1.2, -1.35],
                  [-1.2, -1.35],
                ].map(([x, y]) => {
                  const p = model.readerSurfaces[active]
                    .localToWorld(new THREE.Vector3(x, y, 0))
                    .project(camera);
                  return [
                    ((p.x + 1) * el.clientWidth) / 2,
                    ((1 - p.y) * el.clientHeight) / 2,
                  ];
                });
                el.dataset.readerCorners = JSON.stringify(points);
              }
              lastMetrics = now;
            }
          };
          const loop = (now: number) => {
            frame = 0;
            if (!visible || destroyed) return;
            const rawDelta = lastFrame ? (now - lastFrame) / 1000 : 0;
            lastFrame = now;
            draw(now, Math.min(0.05, rawDelta), rawDelta);
            if (!stop || travelling) frame = requestAnimationFrame(loop);
          };
          function kick() {
            if (!destroyed && visible && !frame)
              frame = requestAnimationFrame(loop);
          }
          const resize = () => {
            const w = Math.max(1, el.clientWidth),
              h = Math.max(1, el.clientHeight);
            renderer.setSize(w, h);
            cssRenderer.setSize(w, h);
            ao.setSize(Math.round(w * 0.65), Math.round(h * 0.65));
            aoDirty = true;
            camera.aspect = w / h;
            camera.updateProjectionMatrix();
            background.resize(w, h, renderer.getPixelRatio());
            renderer.shadowMap.needsUpdate = true;
            go(true, travelling);
          };
          const observer = new ResizeObserver(resize);
          observer.observe(el);
          resize();
          const pick = (event: PointerEvent) => {
            const rect = el.getBoundingClientRect();
            pointer.set(
              ((event.clientX - rect.left) / rect.width) * 2 - 1,
              (-(event.clientY - rect.top) / rect.height) * 2 + 1,
            );
            ray.setFromCamera(pointer, camera);
            if (active !== 'home' && !reading) {
              const hit = ray
                .intersectObjects(
                  model.interactionTargets
                    .filter((t) => t.section === active)
                    .map((t) => t.object),
                  false,
                )
                .find((h) => {
                  let object: Three.Object3D | null = h.object;
                  while (object) {
                    if (
                      object.userData.projectSlug ||
                      object.userData.openReader
                    )
                      return true;
                    object = object.parent;
                  }
                  return false;
                });
              let object: Three.Object3D | null = hit?.object || null;
              while (object) {
                if (object.userData.projectSlug || object.userData.openReader)
                  return {
                    section: active,
                    slug: object.userData.projectSlug as string | undefined,
                    open: true,
                  };
                object = object.parent;
              }
            }
            const hit = ray.intersectObjects(proxies, false)[0];
            return { section: hit?.object.userData.section || '' };
          };
          const hoverSection = (section: string) => {
            hovered = section;
            el.style.cursor = section ? 'pointer' : 'default';
            kick();
          };
          const move = (event: PointerEvent) => {
            if ((event.target as Element).closest('button, .world-surface'))
              return;
            const rect = el.getBoundingClientRect();
            if (event.pointerType !== 'touch')
              pointerGoal.set(
                ((event.clientX - rect.left) / rect.width) * 2 - 1,
                -(((event.clientY - rect.top) / rect.height) * 2 - 1),
              );
            if (performance.now() - lastPick > 70 && !travelling) {
              const { section } = pick(event);
              if (hovered !== section) {
                hoverSection(section);
                latest.current.onHover(section);
              }
              lastPick = performance.now();
            }
            if (stop) kick();
          };
          const pointerDown = (event: PointerEvent) => {
            if (!(event.target as Element).closest('button, .world-surface'))
              down = { x: event.clientX, y: event.clientY, ...pick(event) };
          };
          const pointerUp = (event: PointerEvent) => {
            if (
              down &&
              Math.hypot(event.clientX - down.x, event.clientY - down.y) < 8 &&
              down.section
            ) {
              if (down.open) latest.current.onOpen(down.section, down.slug);
              else latest.current.onNavigate(down.section);
            }
            down = null;
          };
          const leave = () => {
            down = null;
            pointerGoal.set(0, 0);
            hoverSection('');
            latest.current.onHover('');
          };
          el.addEventListener('pointerdown', pointerDown);
          el.addEventListener('pointerup', pointerUp);
          el.addEventListener('pointermove', move);
          el.addEventListener('pointerleave', leave);
          el.addEventListener('pointercancel', leave);
          const syncVisibility = () => {
            const nextVisible = inViewport && !document.hidden;
            if (!nextVisible && visible) hiddenAt = performance.now();
            if (nextVisible && !visible && hiddenAt && travelling)
              flightStart += performance.now() - hiddenAt;
            visible = nextVisible;
            lastFrame = 0;
            if (visible) kick();
            else {
              cancelAnimationFrame(frame);
              frame = 0;
            }
          };
          const intersection = new IntersectionObserver(([entry]) => {
            inViewport = entry.isIntersecting;
            syncVisibility();
          });
          intersection.observe(el);
          document.addEventListener('visibilitychange', syncVisibility);
          const lost = (event: Event) => {
            event.preventDefault();
            cancelAnimationFrame(frame);
            frame = 0;
            unavailable();
          };
          renderer.domElement.addEventListener('webglcontextlost', lost);
          const shadowDiagnostic = () => {
            renderer.shadowMap.enabled = !renderer.shadowMap.enabled;
            renderer.shadowMap.needsUpdate = true;
            kick();
          };
          if (process.env.NODE_ENV === 'development')
            window.addEventListener(
              'orbital:shadow-diagnostic',
              shadowDiagnostic,
            );
          api.current = {
            go: () => go(),
            hover: hoverSection,
            pause(value) {
              stop = value;
              pointerGoal.set(0, 0);
              lastFrame = 0;
              if (value && travelling) flightDuration = 0;
              kick();
            },
          };
          setState('ready');
          go(latest.current.section === 'home');
          cleanup = () => {
            cancelAnimationFrame(frame);
            observer.disconnect();
            intersection.disconnect();
            document.removeEventListener('visibilitychange', syncVisibility);
            el.removeEventListener('pointerdown', pointerDown);
            el.removeEventListener('pointerup', pointerUp);
            el.removeEventListener('pointermove', move);
            el.removeEventListener('pointerleave', leave);
            el.removeEventListener('pointercancel', leave);
            renderer.domElement.removeEventListener('webglcontextlost', lost);
            window.removeEventListener(
              'orbital:shadow-diagnostic',
              shadowDiagnostic,
            );
            latest.current.onSurfaceReady(null);
            const materials = new Set<Three.Material>(),
              geometries = new Set<Three.BufferGeometry>(),
              textures = new Set<Three.Texture>();
            scene.traverse((object) => {
              if (
                object instanceof THREE.Mesh ||
                object instanceof THREE.InstancedMesh
              ) {
                geometries.add(object.geometry);
                (Array.isArray(object.material)
                  ? object.material
                  : [object.material]
                ).forEach((m) => {
                  materials.add(m);
                  for (const value of Object.values(m))
                    if (value instanceof THREE.Texture) textures.add(value);
                });
              }
            });
            materials.forEach((m) => m.dispose());
            geometries.forEach((g) => g.dispose());
            textures.forEach((t) => t.dispose());
            ao.dispose();
            aoQuad.dispose();
            aoMaterial.dispose();
            background.dispose();
            environment.dispose();
            key.shadow.dispose();
            renderer.dispose();
            renderer.domElement.remove();
            cssRenderer.domElement.remove();
            api.current = null;
          };
        },
      )
      .catch(unavailable);
    return () => {
      destroyed = true;
      cleanup();
    };
  }, [props.enabled, s]);
  return (
    <div id="ship" className="ship-stage immersive-ship" ref={host}>
      {state !== 'ready' && (
        <div className="scene-status" role="status">
          <Orbit size={28} />
          <p>{state === 'fallback' ? s.sceneUnavailable : s.sceneLoading}</p>
        </div>
      )}
      <noscript>
        <p>{s.sceneUnavailable}</p>
      </noscript>
    </div>
  );
}
