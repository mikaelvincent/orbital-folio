'use client';
import { useEffect, useRef, useState } from 'react';
import { resolveSocialScreens } from '@/lib/social-links';
import { SceneLoader } from './scene-loader';
import {
  createSceneFeedback,
  EMPTY_SCENE_FEEDBACK,
  type SceneFeedbackTarget,
} from '@/lib/scene-feedback';
import { createOverviewAnnotations } from './overview-annotations';
import {
  moveCameraAxis,
  PROJECTS_PER_PAGE,
  type MotionAxis,
} from '@/lib/flight';
import type * as Three from 'three';
import { planCabinItinerary, type CabinRouteNode } from '@/lib/cabin-itinerary';
import { requiredPortalIds, interlockPortals } from '@/lib/iris-navigation';
import {
  beginBoundedDrag,
  updateBoundedDrag,
  endBoundedDrag,
  pointerResponse,
  fitPerspectiveDistance,
  fitPerspectiveFrame,
  solveApertureFraming,
  cursorViewSamples,
  boundedCameraAngles,
  CAMERA_RANGES,
  type BoundedDrag,
  type Vec3,
} from '@/lib/scene-controls';

type Props = {
  site: Record<string, any>;
  projects: Record<string, any>[];
  caseStudies: Record<string, any>[];
  links: Record<string, any>[];
  section: string;
  slug?: string;
  readingSurface: boolean;
  projectPage: number;
  paused: boolean;
  enabled: boolean;
  onNavigate: (section: string) => void;
  onSurfaceReady: (element: HTMLDivElement | null) => void;
  onSettled: () => void;
  onUnavailable: () => void;
};
type SceneAPI = {
  go: () => void;
  pause: (paused: boolean) => void;
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
    // Development-only delayed-chunk gate for verifying the real loading/escape UI.
    const loadGate =
      process.env.NODE_ENV === 'development' &&
      new URLSearchParams(location.search).get('audit') === 'loading'
        ? new Promise<void>((resolve) => setTimeout(resolve, 4000))
        : Promise.resolve();
    loadGate
      .then(() =>
        Promise.all([
          import('three'),
          import('./spacecraft-model'),
          import('./orbital-environment'),
          import('three/addons/environments/RoomEnvironment.js'),
          import('three/addons/renderers/CSS3DRenderer.js'),
          import('three/addons/postprocessing/GTAOPass.js'),
          import('three/addons/postprocessing/Pass.js'),
        ]),
      )
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
          let vesselName = String(s.name || '');
          try {
            vesselName = new URL(s.domain).hostname;
          } catch {
            // The editable owner name also works before a domain is configured.
          }
          const model = createSpacecraft(THREE, {
            vesselName,
            socials: resolveSocialScreens(latest.current.links),
            accent: s.accent,
            projectPageSize: PROJECTS_PER_PAGE,
            screenLabels: false,
            // Viewport changes frame the same vessel; they must not squeeze
            // cabin walls or rescale their contents before portrait rotation.
            layout: 'wide',
            sampleLabel: s.sampleLabel,
            projects: latest.current.projects.map((p) => ({
              title: String(p.title),
              slug: String(p.slug),
              category: p.category,
              sample: p.sample && (s.sampleMode || s._preview),
            })),
            caseStudies: latest.current.caseStudies.map((p) => ({
              title: String(p.title),
              slug: String(p.slug),
              sample: p.sample && (s.sampleMode || s._preview),
            })),
            labels: {
              projects: s.projectsLabel,
              experience: s.experienceLabel,
              about: s.aboutLabel,
              contact: s.contactLabel,
            },
          });
          scene.add(model.group);
          const annotations = createOverviewAnnotations(THREE, el, s, {
            navigate: (section) => latest.current.onNavigate(section),
          });
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
            home: [0, 0, 0],
            ...model.group.userData.roomAnchors,
          };
          let readerAnchors = model.group.userData.readerAnchors as Record<
            string,
            [number, number, number]
          >;
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
            const bounds = model.group.userData.roomBounds[section];
            const mesh = new THREE.Mesh(
              new THREE.BoxGeometry(1, 1, 1),
              proxyMaterial,
            );
            mesh.position.set(...(bounds.center as [number, number, number]));
            mesh.scale.set(...(bounds.size as [number, number, number]));
            mesh.visible = false;
            mesh.userData.section = section;
            model.group.add(mesh);
            proxies.push(mesh);
          }
          const walkwayProxy = new THREE.Mesh(
            new THREE.BoxGeometry(1, 1, 1),
            proxyMaterial,
          );
          walkwayProxy.visible = false;
          model.group.add(walkwayProxy);
          const hotspotObjects: {
            object: InstanceType<typeof CSS3DObject>;
            button: HTMLButtonElement;
            section: string;
            portalId: string;
          }[] = [];
          // Object actions are deliberately absent here: only doors navigate.
          for (const portal of model.group.userData.portals) {
            const button = document.createElement('button');
            button.type = 'button';
            button.className = 'world-hotspot portal-hotspot';
            button.dataset.targetKey = `portal:${portal.id}`;
            const object = new CSS3DObject(button);
            object.position.set(
              ...(portal.labelPosition as [number, number, number]),
            );
            object.scale.setScalar(0.004);
            cssGroup.add(object);
            hotspotObjects.push({
              object,
              button,
              section: portal.from,
              portalId: portal.id,
            });
            button.onclick = () => latest.current.onNavigate(portal.to);
            button.dataset.sceneRoom = portal.to;
          }
          // Genuine links aligned with the two physical screen faces. Their
          // geometry remains in WebGL; this transparent layer supplies native
          // keyboard, touch, new-tab and context-menu behavior.
          const socialControls = (model.group.userData.socialScreens || [])
            .filter((screen: any) => screen.link)
            .map((screen: any) => {
              const link = document.createElement('a');
              link.className = 'world-object-target world-social-screen';
              link.href = screen.link.url;
              link.target = screen.link.url.startsWith('mailto:')
                ? '_self'
                : '_blank';
              link.draggable = false;
              link.rel = 'noopener noreferrer';
              link.setAttribute(
                'aria-label',
                screen.link.url.startsWith('mailto:')
                  ? `Email ${screen.link.title}`
                  : `Open ${screen.link.title} (new tab)`,
              );
              link.dataset.targetKey = `social:${screen.side}:${screen.link.id}`;
              link.dataset.screen = screen.side;
              link.dataset.sceneObject = screen.interactableId;
              link.style.width = '500px';
              link.style.height = `${(500 * screen.height) / screen.width}px`;
              const object = new CSS3DObject(link);
              cssScene.add(object);
              return { screen, link, object };
            });
          const syncSceneTargets = () => {
            Object.assign(anchors, model.group.userData.roomAnchors);
            readerAnchors = model.group.userData.readerAnchors;
            for (const proxy of proxies) {
              const bounds =
                model.group.userData.roomBounds[proxy.userData.section];
              proxy.position.set(
                ...(bounds.center as [number, number, number]),
              );
              proxy.scale.set(...(bounds.size as [number, number, number]));
            }
            const walkwayBounds = model.group.userData.walkwayBounds;
            walkwayProxy.position.set(
              ...(walkwayBounds.center as [number, number, number]),
            );
            walkwayProxy.scale.set(
              ...(walkwayBounds.size as [number, number, number]),
            );
            for (const hotspot of hotspotObjects) {
              const source = model.group.userData.portals.find(
                (p: any) => p.id === hotspot.portalId,
              );
              if (source) {
                hotspot.object.position.set(
                  ...(source.labelPosition as [number, number, number]),
                );
                if (hotspot.portalId && source.labelRotation)
                  hotspot.object.rotation.set(
                    ...(source.labelRotation as [number, number, number]),
                  );
              }
            }
            el.dataset.layout = model.group.userData.layout;
          };
          const currentTarget = new THREE.Vector3(),
            nextTarget = new THREE.Vector3();
          const viewDirection = new THREE.Vector3(-0.28, 0.22, 1).normalize(),
            nextDirection = viewDirection.clone();
          const pointerCurrent = new THREE.Vector2(),
            pointerGoal = new THREE.Vector2(),
            dragGoal = new THREE.Vector2();
          const axis = (value = 0): MotionAxis => ({ value, velocity: 0 });
          const targetMotion = [axis(), axis(), axis()],
            directionMotion = viewDirection.toArray().map(axis);
          const distanceMotion = axis(23),
            rollMotion = axis(),
            pointerMotion = [axis(), axis()],
            dragMotion = [axis(), axis()],
            rangeMotion = [
              axis(CAMERA_RANGES.overview.pitch),
              axis(CAMERA_RANGES.overview.yaw),
            ],
            hoverMotion = [axis(), axis()],
            dollyMotion = axis();
          const resetAxis = (state: MotionAxis, value: number) => {
            state.value = value;
            state.velocity = 0;
          };
          let stop = latest.current.paused,
            visible = !document.hidden,
            inViewport = true,
            frame = 0,
            lastFrame = 0;
          let active = 'home',
            hovered = '',
            highlightedObject = '',
            reading = false,
            distance = 23,
            nextDistance = 23,
            roll = 0,
            nextRoll = 0;
          let flightImmediate = false,
            travelling = false,
            lastMetrics = 0,
            elapsed = 0,
            notifyArrival = true,
            renderCost = 0,
            firstFrame = true;
          let down: {
            gesture: BoundedDrag;
            control: HTMLElement | null;
            pointerType: string;
            section: string;
          } | null = null;
          const feedback = createSceneFeedback();
          const interactionScope = el.closest<HTMLElement>(
            '.orbital-experience',
          )!;
          let suppressClickUntil = 0;
          const frameIntervals: number[] = [];
          const auditMotion =
            process.env.NODE_ENV === 'development' &&
            new URLSearchParams(location.search).get('audit') === '1';
          const cameraTrace: {
            time: number;
            delta: number;
            position: number[];
            quaternion: number[];
            hover: string;
            active: string;
            travelling: boolean;
            transitRoom: string;
            transitWalkway: boolean;
            hoveredWalkway: boolean;
            roll: number;
            cameraFar: number;
            roomLevels: Record<string, number | undefined>;
            velocities: number[];
          }[] = [];
          const flightTrace: typeof cameraTrace = [];
          const background = createOrbitalEnvironment(
            THREE,
            () =>
              queueMicrotask(() => {
                if (!destroyed) kick();
              }),
            {
              mobile: mobile(),
            },
          );
          let bottomReservation = mobile() ? 132 : 80;
          const readerInsets = () => ({ top: 20, bottom: bottomReservation });
          const readerHeight = () =>
            el.clientHeight - readerInsets().top - readerInsets().bottom;
          const readerStretch = () =>
            mobile()
              ? Math.max(
                  1,
                  Math.min(1.5, readerHeight() / (el.clientWidth - 32) / 1.125),
                )
              : 1;
          const paperPixels = () =>
            Math.max(
              220,
              Math.min(
                mobile() ? 360 : 560,
                el.clientWidth - 32,
                readerHeight() / (1.125 * readerStretch()),
              ),
            );
          const portraitOverview = () => el.clientHeight > el.clientWidth;
          const zAxis = new THREE.Vector3(0, 0, 1);
          const pose = (
            section: string,
            isReading: boolean,
            overviewRoll?: number,
            sweep?: [number, number],
          ) => {
            const home = section === 'home';
            const desiredRoll = home
              ? (overviewRoll ?? (portraitOverview() ? Math.PI / 2 : 0))
              : 0;
            const target = new THREE.Vector3(
              ...(anchors[section] || anchors.home),
            );
            const direction = new THREE.Vector3(
              home ? -0.18 : 0,
              home ? 0.14 : 0,
              1,
            ).normalize();
            const headers = (
              home
                ? ['.flight-header', '.orbital-identity']
                : ['.flight-header']
            )
              .map((selector) =>
                document.querySelector(selector)?.getBoundingClientRect(),
              )
              .filter((box) => box && box.height > 0);
            const rect = el.getBoundingClientRect();
            // Measure the collapsed navigation, including CSS safe-area padding.
            // Cache this on camera/resize updates rather than reading layout per frame.
            const dock = document
              .querySelector('.flight-navigation')
              ?.getBoundingClientRect();
            bottomReservation = Math.max(
              mobile() && isReading ? 132 : 80,
              dock ? rect.bottom - dock.top + 14 : 0,
            );
            const topInset = Math.max(
              24,
              ...headers.map((box) => (box?.bottom || 0) - rect.top + 16),
            );
            const safe = {
              left:
                -1 +
                (2 * (home && portraitOverview() ? 36 : mobile() ? 12 : 18)) /
                  el.clientWidth,
              right:
                1 -
                (2 * (home && portraitOverview() ? 36 : mobile() ? 12 : 18)) /
                  el.clientWidth,
              top:
                1 -
                (2 * (topInset + (home ? (portraitOverview() ? 48 : 72) : 0))) /
                  el.clientHeight,
              bottom:
                -1 +
                (2 *
                  (bottomReservation +
                    (home ? (portraitOverview() ? 48 : 72) : 0))) /
                  el.clientHeight,
            };
            let desiredDistance: number;
            if (isReading) {
              if (readerAnchors[section]) target.set(...readerAnchors[section]);
              desiredDistance =
                (2.4 * el.clientHeight) /
                (2 *
                  Math.tan(THREE.MathUtils.degToRad(camera.fov) / 2) *
                  paperPixels());
              // Center the physical reader in the space above the bottom controls.
              const insets = readerInsets();
              target.y -=
                ((insets.bottom - insets.top) *
                  desiredDistance *
                  Math.tan(THREE.MathUtils.degToRad(camera.fov) / 2)) /
                el.clientHeight;
            } else if (home) {
              const bounds = model.group.userData.overviewBounds;
              const min = bounds?.min || [-6, -4, -1.5];
              const max = bounds?.max || [5.5, 5.3, 1.9];
              const points: Vec3[] = [];
              const support =
                model.group.userData.overviewSupportPoints ||
                [min[0], max[0]].flatMap((x) =>
                  [min[1], max[1]].flatMap((y) =>
                    [min[2], max[2]].map((z) => [x, y, z]),
                  ),
                );
              const rolls = sweep
                ? Array.from(
                    { length: 17 },
                    (_, i) => sweep[0] + ((sweep[1] - sweep[0]) * i) / 16,
                  )
                : [desiredRoll];
              for (const fitRoll of rolls)
                for (const point of support)
                  points.push(
                    new THREE.Vector3(...(point as [number, number, number]))
                      .applyAxisAngle(zAxis, fitRoll)
                      .toArray(),
                  );
              target
                .set(
                  (min[0] + max[0]) / 2,
                  (min[1] + max[1]) / 2,
                  (min[2] + max[2]) / 2,
                )
                .applyAxisAngle(zAxis, desiredRoll);
              const centered = fitPerspectiveFrame(
                points,
                {
                  target: target.toArray(),
                  direction: direction.toArray(),
                },
                camera.fov,
                camera.aspect,
                safe,
              );
              target.set(...centered.target);
              const hoverX =
                Math.max(
                  ...Object.entries(anchors)
                    .filter(([k]) => k !== 'home')
                    .map(([, a]) =>
                      Math.abs(
                        new THREE.Vector3(...a).applyAxisAngle(
                          zAxis,
                          desiredRoll,
                        ).x - target.x,
                      ),
                    ),
                ) * 0.022;
              const hoverY =
                Math.max(
                  ...Object.entries(anchors)
                    .filter(([k]) => k !== 'home')
                    .map(([, a]) =>
                      Math.abs(
                        new THREE.Vector3(...a).applyAxisAngle(
                          zAxis,
                          desiredRoll,
                        ).y - target.y,
                      ),
                    ),
                ) * 0.022;
              // Fit real subassembly supports over the actual drag range, including
              // the small hover translation and the 2.5% hover dolly.
              const views = cursorViewSamples(
                {
                  target: target.toArray(),
                  direction: direction.toArray(),
                },
                4,
                CAMERA_RANGES.overview,
              );
              desiredDistance =
                Math.max(
                  ...views.flatMap((view) =>
                    [-1, 1].flatMap((sx) =>
                      [-1, 1].map((sy) =>
                        fitPerspectiveDistance(
                          points,
                          {
                            ...view,
                            target: [
                              view.target[0] + sx * hoverX,
                              view.target[1] + sy * hoverY,
                              view.target[2],
                            ],
                          },
                          camera.fov,
                          camera.aspect,
                          safe,
                        ),
                      ),
                    ),
                  ),
                ) / 0.975;
              el.dataset.framing = JSON.stringify({
                mode: 'overview',
                distance: desiredDistance,
                safe,
                fullCraft: true,
                supportPoints: support.length,
                roll: desiredRoll,
              });
            } else {
              const aperture =
                model.group.userData.innerApertureBounds[section];
              target.y = aperture.center[1];
              const required: Vec3[] = (
                model.group.userData.requiredFramingPoints?.[section] || []
              ).map((p: { position: Vec3 }) => p.position);
              if (!required.length) {
                for (const x of [-1.13, 1.13])
                  for (const y of [-0.86, 1.08])
                    required.push([
                      target.x + x,
                      anchors[section][1] + y,
                      -0.4,
                    ]);
              }
              const views = cursorViewSamples(
                {
                  target: target.toArray(),
                  direction: direction.toArray(),
                },
                4,
                CAMERA_RANGES.room,
              );
              const solution = solveApertureFraming({
                aperture: {
                  center: aperture.center,
                  right: [1, 0, 0],
                  up: [0, 1, 0],
                  width: aperture.size[0],
                  height: aperture.size[1],
                },
                views,
                requiredPoints: required,
                fovDegrees: camera.fov,
                aspect: camera.aspect,
                overscan: 1.015,
                portalBounds: safe,
              });
              // Use the closest safe fit. Tall viewports preserve real controls even
              // when their aspect makes hiding every part of the front frame impossible.
              desiredDistance = solution.feasible
                ? solution.minimumDistance +
                  (solution.maximumDistance - solution.minimumDistance) * 0.16
                : Math.max(
                    ...views.map((view) =>
                      fitPerspectiveDistance(
                        required,
                        view,
                        camera.fov,
                        camera.aspect,
                        safe,
                      ),
                    ),
                  ) + 0.05;
              el.dataset.framing = JSON.stringify({
                mode: 'room',
                ...solution,
                chosenDistance: desiredDistance,
                safe,
              });
            }
            return {
              target,
              distance: desiredDistance,
              roll: desiredRoll,
              direction,
            };
          };
          type FlightPose = ReturnType<typeof pose>;
          let itinerary: FlightPose[] = [];
          let travelledRoute: string[] = [];
          let lastSettledSection = 'home';
          let itineraryPlan: unknown = null;
          let openPortalIds: string[] = [];
          let legPortalIds: string[] = [];
          let cabinFlight = false;
          const doorHoldTarget = new THREE.Vector3();
          const aim = (desired: FlightPose) => {
            doorHoldTarget.copy(currentTarget);
            legPortalIds = cabinFlight
              ? requiredPortalIds(model.group.userData.portals, [
                  currentTarget.toArray() as Vec3,
                  desired.target.toArray() as Vec3,
                ])
              : [];
            nextTarget.copy(desired.target);
            nextDirection.copy(desired.direction);
            nextDistance = desired.distance;
            nextRoll = desired.roll;
          };
          const go = (immediate = false, notify = true) => {
            cancelInput();
            dragGoal.set(0, 0);
            aoDirty = true;
            const previousRoom = active;
            const wasReading = reading;
            active = latest.current.section;
            reading = latest.current.readingSurface;
            notifyArrival = notify;
            if (model.group.userData.projectPage !== latest.current.projectPage)
              model.setProjectPage(latest.current.projectPage);
            const overview = pose('home', false);
            const support = model.group.userData.overviewSupportPoints || [];
            annotations.layout(
              overview,
              support.length
                ? support
                : [
                    model.group.userData.overviewBounds.min,
                    model.group.userData.overviewBounds.max,
                  ],
              model.group,
            );
            const desired =
              active === 'home' ? overview : pose(active, reading);
            const desiredFraming = el.dataset.framing;
            itinerary = [];
            flightTrace.length = 0;
            travelledRoute = [];
            itineraryPlan = null;
            openPortalIds = [];
            legPortalIds = [];
            cabinFlight = false;
            doorHoldTarget.copy(currentTarget);
            if (
              !immediate &&
              !stop &&
              !wasReading &&
              !reading &&
              lastSettledSection !== 'home' &&
              (previousRoom !== active || travelling)
            ) {
              const roomNode = (room: string): CabinRouteNode => ({
                room,
                position: [
                  anchors[room][0],
                  model.group.userData.innerApertureBounds[room].center[1],
                  anchors[room][2],
                ],
              });
              const circulation: string[] = model.group.userData
                .circulation || ['experience', 'projects', 'about', 'contact'];
              const nodes: CabinRouteNode[] = [];
              for (const [index, room] of circulation.entries()) {
                const next = roomNode(room);
                if (index) {
                  const previous = roomNode(circulation[index - 1]);
                  const via: Vec3[] =
                    model.group.userData.portals.find(
                      (p: any) => p.from === previous.room && p.to === room,
                    )?.waypoints || [];
                  nodes.push(
                    ...via.map((point, step) => ({
                      position: [
                        point[0],
                        step === 0
                          ? previous.position[1]
                          : step === via.length - 1
                            ? next.position[1]
                            : point[1],
                        point[2],
                      ] as Vec3,
                    })),
                  );
                }
                nodes.push(next);
              }
              const plan = planCabinItinerary(
                nodes,
                currentTarget.toArray(),
                active,
              );
              if (plan) {
                itineraryPlan = plan;
                cabinFlight = true;
                const between = nodes
                  .map((node, index) => ({ node, index }))
                  .filter(
                    ({ node, index }) =>
                      node.room &&
                      index >=
                        Math.min(plan.station, plan.destinationStation) -
                          0.001 &&
                      index <=
                        Math.max(plan.station, plan.destinationStation) + 0.001,
                  );
                if (plan.destinationStation < plan.station) between.reverse();
                travelledRoute = between.map(({ node }) => node.room!);
                for (const point of plan.points.slice(0, -1)) {
                  itinerary.push({
                    ...desired,
                    target: new THREE.Vector3(...point),
                  });
                }
              }
            }
            if (!immediate && !stop && Math.abs(roll - desired.roll) > 0.01) {
              const sweep: [number, number] = [roll, desired.roll];
              const startOverview = pose('home', false, roll, sweep);
              const endOverview = pose('home', false, desired.roll, sweep);
              // Both endpoint targets reserve every intermediate hull orientation.
              // Independent target/roll springs can therefore never steal clearance.
              const clearance =
                Math.max(startOverview.distance, endOverview.distance) * 1.02;
              // Pull back before rolling the hull. Keep the full diagonal envelope
              // clear throughout the rotation, then enter the upright cabin.
              itinerary = [
                { ...startOverview, distance: clearance },
                { ...endOverview, distance: clearance },
              ];
              travelledRoute = [];
              itineraryPlan = { kind: 'portrait-clearance', clearance };
              openPortalIds = [];
              cabinFlight = false;
            }
            itinerary.push(desired);
            const overviewBounds = model.group.userData.overviewBounds;
            const hullDiameter = new THREE.Vector3(
              ...overviewBounds.max,
            ).distanceTo(new THREE.Vector3(...overviewBounds.min));
            // Very tall portrait screens need a distant clearance pose. Keep the
            // entire hull inside the depth range as well as the visible frame.
            camera.far = Math.max(
              80,
              Math.max(distance, ...itinerary.map((p) => p.distance)) +
                hullDiameter +
                2,
            );
            camera.updateProjectionMatrix();
            if (desiredFraming) el.dataset.framing = desiredFraming;
            aim(itinerary.shift()!);
            flightImmediate = stop || immediate;
            if (flightImmediate) openPortalIds = [];
            if (stop) {
              [
                ...pointerMotion,
                ...dragMotion,
                ...hoverMotion,
                dollyMotion,
              ].forEach((s) => resetAxis(s, 0));
              pointerCurrent.set(0, 0);
            }
            feedback.reset();
            travelling = true;
            el.dataset.travelling = 'true';
            el.dataset.activeRoom = active;
            kick();
          };
          const draw = (now: number, delta: number, rawDelta: number) => {
            if (destroyed) return;
            const wasTravelling = travelling;
            const started = performance.now();
            if (!stop) {
              elapsed += delta;
              if (delta > 0) {
                frameIntervals.push(rawDelta * 1000);
                if (frameIntervals.length > 360) frameIntervals.shift();
              }
            }
            if (travelling) {
              const immediate = flightImmediate || stop;
              const interlock = interlockPortals(
                model.group.userData.portals,
                immediate ? [] : legPortalIds,
              );
              openPortalIds = interlock.openPortalIds;
              const waitingForDoors = interlock.waiting;
              el.dataset.waitingForDoors = String(waitingForDoors);
              const beforeRoll = roll;
              if (immediate) {
                if (itinerary.length) {
                  aim(itinerary[itinerary.length - 1]);
                  itinerary = [];
                }
                nextTarget
                  .toArray()
                  .forEach((v, i) => resetAxis(targetMotion[i], v));
                nextDirection
                  .toArray()
                  .forEach((v, i) => resetAxis(directionMotion[i], v));
                resetAxis(distanceMotion, nextDistance);
                resetAxis(rollMotion, nextRoll);
              } else {
                (waitingForDoors ? doorHoldTarget : nextTarget)
                  .toArray()
                  .forEach((v, i) => moveCameraAxis(targetMotion[i], v, delta));
                (waitingForDoors ? viewDirection : nextDirection)
                  .toArray()
                  .forEach((v, i) =>
                    moveCameraAxis(directionMotion[i], v, delta, {
                      frequency: 10,
                      speed: 1,
                      acceleration: 4,
                    }),
                  );
                moveCameraAxis(
                  distanceMotion,
                  waitingForDoors ? distance : nextDistance,
                  delta,
                  {
                    frequency: 9,
                    speed: 18,
                    acceleration: 45,
                  },
                );
                moveCameraAxis(
                  rollMotion,
                  waitingForDoors ? roll : nextRoll,
                  delta,
                  {
                    frequency: 10,
                    speed: 1.2,
                    acceleration: 4,
                  },
                );
              }
              currentTarget.set(
                ...(targetMotion.map((s) => s.value) as [
                  number,
                  number,
                  number,
                ]),
              );
              viewDirection
                .set(
                  ...(directionMotion.map((s) => s.value) as [
                    number,
                    number,
                    number,
                  ]),
                )
                .normalize();
              distance = distanceMotion.value;
              roll = rollMotion.value;
              if (Math.abs(beforeRoll - roll) > 0.00001)
                renderer.shadowMap.needsUpdate = true;
              const settled =
                currentTarget.distanceTo(nextTarget) < 0.003 &&
                Math.abs(distance - nextDistance) < 0.003 &&
                Math.abs(roll - nextRoll) < 0.0003 &&
                viewDirection.distanceTo(nextDirection) < 0.0003 &&
                Math.abs(distanceMotion.velocity) < 0.025 &&
                targetMotion.every((s) => Math.abs(s.velocity) < 0.02);
              // Pass intermediate waypoints without stopping or resetting velocity.
              const nearWaypoint =
                itinerary.length > 0 &&
                currentTarget.distanceTo(nextTarget) < 0.28 &&
                Math.abs(distance - nextDistance) < 0.3 &&
                Math.abs(roll - nextRoll) < 0.01;
              if (
                immediate ||
                (!waitingForDoors && (settled || nearWaypoint))
              ) {
                if (itinerary.length) {
                  aim(itinerary.shift()!);
                } else {
                  travelling = false;
                  openPortalIds = [];
                  legPortalIds = [];
                  cabinFlight = false;
                  el.dataset.travelling = 'false';
                  el.dataset.waitingForDoors = 'false';
                  lastSettledSection = active;
                  if (notifyArrival) latest.current.onSettled();
                }
              }
            }
            const motionDelta = stop ? 0 : delta;
            const pointerLimits = { frequency: 8, speed: 3, acceleration: 12 };
            const feedbackTarget = feedback.resolve(
              travelling ||
                reading ||
                !latest.current.enabled ||
                !!down?.gesture.dragging ||
                document.hidden,
              pointerFeedback,
              () => targetFeedback(document.activeElement),
            );
            const effectiveHover = feedbackTarget.room;
            const effectiveObject = feedbackTarget.object;
            if (
              hovered !== effectiveHover ||
              highlightedObject !== effectiveObject
            )
              aoDirty = true;
            hovered = effectiveHover;
            highlightedObject = effectiveObject;
            interactionScope.dataset.sceneInput = feedback.input;
            if (!down?.gesture.dragging)
              el.style.cursor =
                effectiveHover || effectiveObject ? 'pointer' : 'grab';
            const inspectingPassage =
              active !== 'home' &&
              !!effectiveHover &&
              effectiveHover !== active &&
              !down?.gesture.dragging;
            const highlightedRoute = model.group.userData.activeRoute || [];
            const passage = model.group.userData.portals.find(
              (p: any) =>
                p.from === active &&
                (p.to === effectiveHover ||
                  (highlightedRoute.at(-1) === effectiveHover &&
                    p.to === highlightedRoute[1])),
            );
            // Look slightly across the open threshold so its neighbor is visible.
            const passagePeek = passage?.edge === 'right' ? -1 : 1;
            pointerCurrent.set(
              moveCameraAxis(
                pointerMotion[0],
                reading ? 0 : inspectingPassage ? passagePeek : pointerGoal.x,
                motionDelta,
                pointerLimits,
              ),
              moveCameraAxis(
                pointerMotion[1],
                reading || inspectingPassage ? 0 : pointerGoal.y,
                motionDelta,
                pointerLimits,
              ),
            );
            const hoverTarget =
              active === 'home' && hovered
                ? new THREE.Vector3(...anchors[hovered]).applyAxisAngle(
                    new THREE.Vector3(0, 0, 1),
                    roll,
                  )
                : null;
            const hoverLimits = {
              frequency: 7,
              speed: 0.35,
              acceleration: 1.2,
            };
            moveCameraAxis(
              hoverMotion[0],
              hoverTarget ? (hoverTarget.x - currentTarget.x) * 0.022 : 0,
              motionDelta,
              hoverLimits,
            );
            moveCameraAxis(
              hoverMotion[1],
              hoverTarget ? (hoverTarget.y - currentTarget.y) * 0.022 : 0,
              motionDelta,
              hoverLimits,
            );
            moveCameraAxis(dollyMotion, hoverTarget ? 1 : 0, motionDelta, {
              frequency: 7,
              speed: 1.6,
              acceleration: 6,
            });
            for (const [index, goal] of dragGoal.toArray().entries()) {
              if (stop) resetAxis(dragMotion[index], reading ? 0 : goal);
              else
                moveCameraAxis(dragMotion[index], reading ? 0 : goal, delta, {
                  frequency: 10,
                  speed: 4,
                  acceleration: 18,
                });
            }
            const range =
              active === 'home' ? CAMERA_RANGES.overview : CAMERA_RANGES.room;
            [range.pitch, range.yaw].forEach((value, index) => {
              if (stop || flightImmediate) resetAxis(rangeMotion[index], value);
              else
                moveCameraAxis(rangeMotion[index], value, delta, {
                  frequency: 8,
                  speed: 0.4,
                  acceleration: 1.5,
                });
            });
            const angles = boundedCameraAngles(
              [pointerCurrent.x, pointerCurrent.y],
              [dragMotion[0].value, dragMotion[1].value],
              { pitch: rangeMotion[0].value, yaw: rangeMotion[1].value },
            );
            const direction = viewDirection
              .clone()
              .applyEuler(new THREE.Euler(angles[0], angles[1], 0));
            const cameraTarget = currentTarget.clone();
            cameraTarget.x += hoverMotion[0].value;
            cameraTarget.y += hoverMotion[1].value;
            camera.position
              .copy(cameraTarget)
              .addScaledVector(
                direction,
                distance * (1 - 0.025 * dollyMotion.value),
              );
            camera.lookAt(cameraTarget);
            model.group.rotation.z = roll;
            cssGroup.rotation.z = roll;
            // The camera's current focus selects the cabin being crossed, rather
            // than lighting the eventual destination for the whole journey.
            const localFocus = currentTarget
              .clone()
              .applyAxisAngle(zAxis, -roll);
            const transitRoom = travelling
              ? Object.entries(model.group.userData.innerApertureBounds).find(
                  ([, value]) => {
                    const bounds = value as {
                      center: number[];
                      size: number[];
                    };
                    return (
                      Math.abs(localFocus.x - bounds.center[0]) <=
                        bounds.size[0] * 0.5 &&
                      Math.abs(localFocus.y - bounds.center[1]) <=
                        bounds.size[1] * 0.5
                    );
                  },
                )?.[0] || ''
              : '';
            const walkwayBounds = model.group.userData.walkwayBounds;
            const transitWalkway =
              travelling &&
              (itineraryPlan as { kind?: string } | null)?.kind !==
                'portrait-clearance' &&
              Math.abs(localFocus.x - walkwayBounds.center[0]) <
                walkwayBounds.size[0] / 2 &&
              Math.abs(localFocus.y - walkwayBounds.center[1]) <
                walkwayBounds.size[1] / 2;
            const hoveredWalkway =
              active !== 'home' &&
              !reading &&
              !travelling &&
              (feedbackTarget.walkway || passage?.via === 'walkway');
            model.update(elapsed, effectiveHover, stop, {
              activeRoom: active,
              travelling,
              transitRoom,
              transitWalkway,
              hoveredWalkway,
              labelPortrait: active === 'home' && Math.abs(roll) > Math.PI / 4,
              hoveredPortal: effectiveHover,
              openPortalIds:
                travelling && !stop && !flightImmediate ? openPortalIds : [],
              immediateDoors: stop || flightImmediate,
              hoveredObject: effectiveObject,
              selectedProject: null,
              hoveredProject: null,
              hoveredCaseStudy: null,
              projectPage: latest.current.projectPage,
              reading,
              delta,
            });
            // Moving doors/readers do not cast into the cached static shadow map.
            for (const anchor of Object.values(model.readerSurfaces))
              anchor.parent.scale.y *= readerStretch();
            model.group.updateMatrixWorld(true);
            camera.updateMatrixWorld(true);
            annotations.update(camera, model.group, {
              home: active === 'home',
              travelling,
              reduced: stop,
              delta,
              hover: effectiveHover,
            });
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
              const portal = model.group.userData.portals.find(
                (p: any) => p.id === h.portalId,
              );
              h.object.visible =
                active === h.section && !reading && !travelling;
              h.button.inert = !h.object.visible;
              if (h.button.textContent !== s[portal.to + 'Label'])
                h.button.textContent = s[portal.to + 'Label'];
              h.button.setAttribute(
                'aria-label',
                `${s[portal.from + 'Label']} → ${s[portal.to + 'Label']}`,
              );
              h.button.style.width = `${portal.labelSize[0] / 0.004}px`;
              h.button.style.height = `${Math.max(0.3, portal.labelSize[1]) / 0.004}px`;
              h.button.dataset.destination = portal.to;
            }
            for (const { screen, link, object } of socialControls) {
              screen.anchor.matrixWorld.decompose(
                object.position,
                object.quaternion,
                object.scale,
              );
              object.scale.multiplyScalar(screen.width / 500);
              object.visible = active === 'contact' && !reading && !travelling;
              link.inert = !object.visible;
              link.classList.toggle(
                'is-object-active',
                object.visible &&
                  !down?.gesture.dragging &&
                  effectiveObject === screen.interactableId,
              );
            }
            background.update(
              elapsed,
              !stop,
              pointerCurrent.x * 0.12,
              pointerCurrent.y * 0.08,
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
                // The AO override shader cannot see the iris aperture mask.
                // Exclude its concealed storage geometry from that static pass.
                for (const hatch of model.group.userData.irisHatches)
                  hatch.visible = false;
                ao.render(
                  renderer,
                  ao.pdRenderTarget,
                  ao.pdRenderTarget,
                  delta,
                  false,
                );
                for (const hatch of model.group.userData.irisHatches)
                  hatch.visible = true;
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
            if (auditMotion) {
              const sample = {
                time: now,
                delta,
                position: camera.position.toArray(),
                quaternion: camera.quaternion.toArray(),
                hover: hovered,
                active,
                travelling,
                focus: currentTarget.toArray(),
                waitingForDoors: el.dataset.waitingForDoors === 'true',
                irisOpen: Object.fromEntries(
                  model.group.userData.portals.map((portal: any) => [
                    portal.id,
                    portal.openProgress,
                  ]),
                ),
                transitRoom,
                transitWalkway,
                hoveredWalkway,
                roll,
                cameraFar: camera.far,
                roomLevels: Object.fromEntries(
                  Object.entries(model.group.userData.lightingState || {}).map(
                    ([section, state]) => [
                      section,
                      (state as { level?: number }).level,
                    ],
                  ),
                ),
                velocities: [
                  ...targetMotion,
                  ...hoverMotion,
                  distanceMotion,
                  rollMotion,
                  ...pointerMotion,
                  ...dragMotion,
                ].map((s) => s.velocity),
              };
              cameraTrace.push(sample);
              if (wasTravelling) {
                flightTrace.push(sample);
                if (flightTrace.length > 1800) flightTrace.shift();
                if (!travelling)
                  el.dataset.lastFlightTrace = JSON.stringify(flightTrace);
              }
              if (cameraTrace.length > 1200) cameraTrace.shift();
            }
            if (firstFrame) {
              firstFrame = false;
              setState('ready');
            }
            renderCost = renderCost * 0.9 + (performance.now() - started) * 0.1;
            if (now - lastMetrics > 200 || stop) {
              Object.assign(el.dataset, {
                cameraFar: String(camera.far),
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
                pixelRatio: String(renderer.getPixelRatio()),
                drawingBuffer: `${renderer.domElement.width},${renderer.domElement.height}`,
                renderCalls: String(renderer.info.render.calls),
                triangles: String(renderer.info.render.triangles),
                renderCpuMs: renderCost.toFixed(2),
                hoverRoom: effectiveHover,
                hoverObject: effectiveObject,
                transitRoom,
                transitWalkway: String(transitWalkway),
                hoveredWalkway: String(hoveredWalkway),
                labelPortrait: String(
                  active === 'home' && Math.abs(roll) > Math.PI / 4,
                ),
                hoverOffset: hoverMotion
                  .map((s) => s.value.toFixed(5))
                  .join(','),
                hoverVelocity: hoverMotion
                  .map((s) => s.velocity.toFixed(5))
                  .join(','),
                flightVelocity: targetMotion
                  .map((s) => s.velocity.toFixed(5))
                  .join(','),
                travelling: String(travelling),
                motion: stop ? 'reduced' : 'active',
                activeTime: elapsed.toFixed(3),
                readerAttached: String(surface.visible),
                projectPage: String(latest.current.projectPage),
                overviewSupports: JSON.stringify(
                  model.group.userData.overviewSupportPoints.map(
                    (point: [number, number, number]) => {
                      const p = model.group
                        .localToWorld(new THREE.Vector3(...point))
                        .project(camera);
                      return [p.x, p.y, p.z];
                    },
                  ),
                ),
                overviewCorners: JSON.stringify(
                  (() => {
                    const { min, max } = model.group.userData.overviewBounds;
                    const points = [];
                    for (const x of [min[0], max[0]])
                      for (const y of [min[1], max[1]])
                        for (const z of [min[2], max[2]]) {
                          const p = model.group
                            .localToWorld(new THREE.Vector3(x, y, z))
                            .project(camera);
                          points.push([p.x, p.y, p.z]);
                        }
                    return points;
                  })(),
                ),
                physicalLabels: JSON.stringify(
                  model.group.userData.labelPlaques,
                ),
                exteriorLabelAssemblies: JSON.stringify(
                  model.group.userData.labelAssemblyBounds,
                ),
                pointerResponse: `${pointerCurrent.x.toFixed(5)},${pointerCurrent.y.toFixed(5)}`,
                dragResponse: dragMotion
                  .map((s) => s.value.toFixed(5))
                  .join(','),
                cameraAngles: angles.map((v) => v.toFixed(5)).join(','),
                cameraAngleLimits: rangeMotion
                  .map((s) => s.value.toFixed(5))
                  .join(','),
                vesselName,
                roomAnchors: JSON.stringify(model.group.userData.roomAnchors),
                portals: JSON.stringify(model.group.userData.portals),
                activeRoute: JSON.stringify(model.group.userData.activeRoute),
                travelledRoute: JSON.stringify(travelledRoute),
                itineraryRemaining: String(itinerary.length),
                itineraryPlan: JSON.stringify(itineraryPlan),
                lightingState: JSON.stringify(
                  model.group.userData.lightingState,
                ),
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
                ? 'procedural-mobile'
                : 'procedural-desktop';
              el.dataset.contactShading = String(contactShading && !mobile());
              el.dataset.frameSamples = String(sorted.length);
              if (auditMotion)
                el.dataset.cameraTrace = JSON.stringify(cameraTrace);
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
            // Skip hidden/transient panel sizes while the native short-screen
            // fallback or a browser resize settles; these cannot frame a cabin.
            if (el.clientWidth < 240 || el.clientHeight < 480) return;
            const w = Math.max(1, el.clientWidth),
              h = Math.max(1, el.clientHeight);
            // Bound retina fill cost without changing cloud detail or HTML sharpness.
            // This runs only on viewport resize, never while retargeting a flight.
            renderer.setPixelRatio(
              Math.min(
                devicePixelRatio,
                mobile() ? 1.75 : 2,
                Math.sqrt(4_000_000 / (w * h)),
              ),
            );
            renderer.setSize(w, h);
            cssRenderer.setSize(w, h);
            ao.setSize(Math.round(w * 0.65), Math.round(h * 0.65));
            aoDirty = true;
            camera.aspect = w / h;
            camera.updateProjectionMatrix();
            syncSceneTargets();
            background.resize(w, h, renderer.getPixelRatio());
            renderer.shadowMap.needsUpdate = true;
            go(true, travelling);
          };
          const observer = new ResizeObserver(resize);
          observer.observe(el);
          const identity = document.querySelector('.orbital-identity');
          if (identity) observer.observe(identity);
          resize();
          function targetFeedback(
            element: Element | null,
          ): SceneFeedbackTarget {
            const target = element?.closest<HTMLElement>(
              '[data-scene-room], [data-scene-object]',
            );
            if (
              !target ||
              !interactionScope.contains(target) ||
              target.closest('[inert], [hidden], [aria-hidden="true"]') ||
              !target.checkVisibility({ visibilityProperty: true })
            )
              return EMPTY_SCENE_FEEDBACK;
            const room = target.dataset.sceneRoom || '';
            return {
              room: room === 'home' ? '' : room,
              object: target.dataset.sceneObject || '',
              walkway: false,
            };
          }
          function pickAt(x: number, y: number) {
            const rect = el.getBoundingClientRect();
            pointer.set(
              ((x - rect.left) / rect.width) * 2 - 1,
              (-(y - rect.top) / rect.height) * 2 + 1,
            );
            ray.setFromCamera(pointer, camera);
            const walkway =
              active !== 'home' &&
              !reading &&
              ray.intersectObject(walkwayProxy, false).length > 0;
            if (active !== 'home' && !reading) {
              const portal = ray.intersectObjects(
                model.portalTargets
                  .filter((p) => p.from === active)
                  .map((p) => p.object),
                false,
              )[0];
              if (portal)
                return {
                  section: portal.object.userData.portalDestination as string,
                  walkway,
                };
            }
            const hit = ray.intersectObjects(proxies, false)[0];
            const section = hit?.object.userData.section || '';
            return { section: section === active ? '' : section, walkway };
          }
          function pick(event: PointerEvent) {
            const target = targetFeedback(event.target as Element);
            if (target.room || target.object) return { section: target.room };
            return pickAt(event.clientX, event.clientY);
          }
          function pointerFeedback(x: number, y: number): SceneFeedbackTarget {
            // Resolve the CURRENT topmost element, including after the camera
            // moves. Never raycast through the dropdown or unrelated toolbar UI.
            const element = document.elementFromPoint(x, y);
            const target = targetFeedback(element);
            if (target.room || target.object) return target;
            if (
              !element ||
              !el.contains(element) ||
              element.closest(
                'a, button, input, textarea, select, .world-surface, [inert]',
              )
            )
              return EMPTY_SCENE_FEEDBACK;
            const hit = pickAt(x, y);
            return { room: hit.section, object: '', walkway: hit.walkway };
          }
          const feedbackChanged = () => kick();
          const trackPointer = (event: PointerEvent) => {
            if (!event.isPrimary) return;
            feedback.move(event.clientX, event.clientY, event.pointerType);
            feedbackChanged();
          };
          const trackPress = (event: PointerEvent) => {
            if (!event.isPrimary) return;
            feedback.press(event.clientX, event.clientY, event.pointerType);
            feedbackChanged();
          };
          const trackKeyboard = (event: KeyboardEvent) => {
            if (
              ['Shift', 'Control', 'Alt', 'Meta'].includes(event.key) ||
              event.metaKey ||
              event.ctrlKey ||
              event.altKey
            )
              return;
            feedback.keyboard();
            feedbackChanged();
          };
          const move = (event: PointerEvent) => {
            if ((event.target as Element).closest('.world-surface')) return;
            if (down) {
              if (event.pointerId !== down.gesture.pointerId) return;
              down.gesture = updateBoundedDrag(
                down.gesture,
                event.pointerId,
                event.clientX,
                event.clientY,
              );
              if (down.gesture.dragging) {
                if (!el.hasPointerCapture(event.pointerId)) {
                  // A browser cancellation can race capture; the gesture must still end safely.
                  try {
                    el.setPointerCapture(event.pointerId);
                  } catch {
                    /* no active native pointer */
                  }
                }
                feedback.reset();
                dragGoal.set(...down.gesture.response);
                pointerGoal.set(0, 0);
                el.style.cursor = 'grabbing';
                el.dataset.dragging = 'true';
                kick();
              }
              return;
            }
            if ((event.target as Element).closest('button')) return;
            const rect = el.getBoundingClientRect();
            if (event.pointerType !== 'touch')
              pointerGoal.set(
                ...pointerResponse(event.clientX, event.clientY, rect),
              );
            if (stop) kick();
          };
          const pointerDown = (event: PointerEvent) => {
            if (
              down ||
              !event.isPrimary ||
              event.button !== 0 ||
              reading ||
              travelling ||
              (event.target as Element).closest('.world-surface')
            )
              return;
            const control = (event.target as Element).closest<HTMLElement>(
              '.world-hotspot, .overview-callout, .world-social-screen',
            );
            if ((event.target as Element).closest('button') && !control) return;
            suppressClickUntil = 0;
            const selection = pick(event);
            const targetKey = control
              ? control.dataset.targetKey || ''
              : pickKey(selection);
            down = {
              ...selection,
              control,
              pointerType: event.pointerType,
              gesture: beginBoundedDrag({
                pointerId: event.pointerId,
                x: event.clientX,
                y: event.clientY,
                response: [dragGoal.x, dragGoal.y],
                sensitivity: 4,
                width: el.clientWidth,
                height: el.clientHeight,
                targetKey,
              }),
            };
          };
          const pointerUp = (event: PointerEvent) => {
            if (!down || event.pointerId !== down.gesture.pointerId) return;
            const control = (event.target as Element).closest<HTMLElement>(
              '.world-hotspot, .overview-callout, .world-social-screen',
            );
            const completed = endBoundedDrag(
              down.gesture,
              event.pointerId,
              event.clientX,
              event.clientY,
              control ? control.dataset.targetKey || '' : pickKey(pick(event)),
            );
            const action = down;
            el.dataset.lastGesture = JSON.stringify({
              pointerType: action.pointerType,
              maxExcursion: completed.state.maximumExcursion,
              dragged: completed.state.dragging,
              activated: completed.activate,
              startedOnControl: !!action.control,
              response: completed.state.response,
            });
            if (
              completed.state.dragging ||
              (!!down.control && !completed.activate)
            )
              suppressClickUntil = performance.now() + 450;
            cancelInput();
            if (completed.state.dragging) feedback.reset();
            if (event.pointerType === 'touch') pointerGoal.set(0, 0);
            if (completed.activate && !action.control && action.section) {
              latest.current.onNavigate(action.section);
            }
          };
          function pickKey(value: { section: string }) {
            return value.section ? `${value.section}:room` : '';
          }
          function cancelInput() {
            const pointerId = down?.gesture.pointerId;
            if (down?.gesture.dragging)
              suppressClickUntil = performance.now() + 450;
            down = null;
            el.dataset.dragging = 'false';
            if (pointerId !== undefined && el.hasPointerCapture(pointerId))
              el.releasePointerCapture(pointerId);
            el.style.cursor = hovered ? 'pointer' : 'grab';
          }
          const suppressDraggedClick = (event: MouseEvent) => {
            if (event.detail > 0 && performance.now() < suppressClickUntil) {
              event.preventDefault();
              event.stopImmediatePropagation();
            }
          };
          const leave = () => {
            if (down?.gesture.dragging) return;
            cancelInput();
            pointerGoal.set(0, 0);
            kick();
          };
          const cancelPointer = (event: Event) => {
            if (
              down &&
              'pointerId' in event &&
              event.pointerId !== down.gesture.pointerId
            )
              return;
            cancelInput();
            feedback.reset();
            leave();
          };
          el.addEventListener('pointerdown', pointerDown, true);
          el.addEventListener('pointerup', pointerUp, true);
          el.addEventListener('pointermove', move, true);
          el.addEventListener('pointerleave', leave);
          el.addEventListener('pointercancel', cancelPointer);
          el.addEventListener('lostpointercapture', cancelPointer);
          el.addEventListener('click', suppressDraggedClick, true);
          window.addEventListener('blur', cancelPointer);
          document.addEventListener('pointermove', trackPointer, true);
          document.addEventListener('pointerdown', trackPress, true);
          document.addEventListener('keydown', trackKeyboard, true);
          document.addEventListener('focusin', feedbackChanged);
          document.addEventListener('focusout', feedbackChanged);
          document.documentElement.addEventListener(
            'pointerleave',
            cancelPointer,
          );
          const syncVisibility = () => {
            const nextVisible = inViewport && !document.hidden;
            visible = nextVisible;
            if (!visible) cancelPointer(new Event('visibilitychange'));
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
          const motionDiagnostic = () => api.current?.pause(!stop);
          if (process.env.NODE_ENV === 'development') {
            window.addEventListener(
              'orbital:shadow-diagnostic',
              shadowDiagnostic,
            );
            window.addEventListener(
              'orbital:motion-diagnostic',
              motionDiagnostic,
            );
          }
          api.current = {
            go: () => go(),
            pause(value) {
              stop = value;
              lastFrame = 0;
              if (value && travelling) flightImmediate = true;
              kick();
            },
          };
          go(latest.current.section === 'home');
          cleanup = () => {
            cancelAnimationFrame(frame);
            annotations.dispose();
            observer.disconnect();
            intersection.disconnect();
            document.removeEventListener('visibilitychange', syncVisibility);
            el.removeEventListener('pointerdown', pointerDown, true);
            el.removeEventListener('pointerup', pointerUp, true);
            el.removeEventListener('pointermove', move, true);
            el.removeEventListener('pointerleave', leave);
            el.removeEventListener('pointercancel', cancelPointer);
            el.removeEventListener('lostpointercapture', cancelPointer);
            el.removeEventListener('click', suppressDraggedClick, true);
            window.removeEventListener('blur', cancelPointer);
            document.removeEventListener('pointermove', trackPointer, true);
            document.removeEventListener('pointerdown', trackPress, true);
            document.removeEventListener('keydown', trackKeyboard, true);
            document.removeEventListener('focusin', feedbackChanged);
            document.removeEventListener('focusout', feedbackChanged);
            document.documentElement.removeEventListener(
              'pointerleave',
              cancelPointer,
            );
            delete interactionScope.dataset.sceneInput;
            renderer.domElement.removeEventListener('webglcontextlost', lost);
            window.removeEventListener(
              'orbital:shadow-diagnostic',
              shadowDiagnostic,
            );
            window.removeEventListener(
              'orbital:motion-diagnostic',
              motionDiagnostic,
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
      .catch((error) => {
        if (process.env.NODE_ENV === 'development' && host.current)
          host.current.dataset.sceneError = String(error);
        console.error('Interactive renderer initialization failed', error);
        unavailable();
      });
    return () => {
      destroyed = true;
      cleanup();
    };
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
