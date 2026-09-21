import { projectApplicationLayout } from './navigation/project-application';
import { createProjectedSurface } from './projected-surface';
import { resolveSocialScreens } from '@/lib/content/social-links';
import {
  canUseDoorDuringTravel,
  createDoorNavigationQueue,
} from '@/features/spacecraft/navigation/door-navigation';
import { createRoomNavigationTargets } from './navigation/room-navigation-targets';
import { createContactRoomDismissPicker } from './navigation/contact-room-dismiss';
import {
  roomNavigationIntent,
  sceneNavigationKey,
} from '@/features/spacecraft/navigation/room-navigation';
import { createScenePerformance } from '@/features/diagnostics/scene-performance';
import { updateRenderSceneMatrices } from '@/features/spacecraft/scene-matrices';
import { createVesselCameraFrame } from '@/features/spacecraft/navigation/vessel-camera';
import {
  createOverviewFlight,
  sampleOverviewFlight,
  type OverviewFlight,
  type OverviewFlightPose,
} from './navigation/overview-flight';
import {
  createSpacecraftPerformance,
  type SpacecraftPerformanceFilter,
} from '@/features/diagnostics/spacecraft-performance';
import { mountPerformancePanel } from '../diagnostics/performance-panel';
import {
  createSceneFeedback,
  EMPTY_SCENE_FEEDBACK,
  type SceneFeedbackTarget,
} from '@/features/spacecraft/navigation/scene-feedback';
import { createOverviewAnnotations } from './overview-annotations';
import {
  contactApplicationLayout,
  bindContactKeyboard,
} from './navigation/contact-computer';
import {
  moveCameraAxis,
  PROJECTS_PER_PAGE,
  type MotionAxis,
} from '@/features/spacecraft/navigation/flight';
import type * as Three from 'three';
import type { EarthPlaybackController } from '../orbit/earth-playback';
import { createOrbitalWorldReference } from '../orbit/earth-view-transform';
import type { SceneAudit } from '../diagnostics/scene-audit';
import { instrumentShadowUpdates } from '../diagnostics/shadow-diagnostics';
import {
  planCabinItinerary,
  type CabinRouteNode,
} from '@/features/spacecraft/navigation/cabin-itinerary';
import {
  requiredPortalIds,
  interlockLadderPortals,
  approachingLadderPortalIds,
  ladderExitHoldPoint,
} from '@/features/spacecraft/navigation/iris-navigation';
import {
  beginBoundedDrag,
  updateBoundedDrag,
  endBoundedDrag,
  pointerResponse,
  fitPerspectiveDistance,
  fitPerspectiveFrame,
  fitRoomCameraFrame,
  cursorViewSamples,
  boundedCameraAngles,
  overviewCameraDirection,
  overviewCameraRange,
  responsiveCameraFov,
  overviewCalloutGutter,
  CAMERA_RANGES,
  type BoundedDrag,
  type CameraAngleRange,
  type Vec3,
} from '@/features/spacecraft/navigation/scene-controls';

export type SpacecraftProps = {
  /** Only the explicit local performance lab supplies this adapter. */
  audit?: SceneAudit;
  site: Record<string, any>;
  projects: Record<string, any>[];
  caseStudies: Record<string, any>[];
  links: Record<string, any>[];
  section: string;
  slug?: string;
  readingSurface: boolean;
  projectPage: number;
  projectScreen?: string;
  onOpenProjects?: (
    category: 'all' | 'systems' | 'interfaces' | 'experiments',
  ) => void;
  onCloseProjects?: () => void;
  paused: boolean;
  enabled: boolean;
  diagnosticsEnabled?: boolean;
  onDiagnosticsClose?: () => void;
  onNavigate: (section: string) => void;
  onOpenContact?: () => void;
  onCloseContact?: () => void;
  onNavigationReady: (request: ((section: string) => boolean) | null) => void;
  onSurfaceReady: (element: HTMLDivElement | null) => void;
  onEarthPlaybackReady?: (controller: EarthPlaybackController | null) => void;
  onSettled: () => void;
  onUnavailable: () => void;
};
export type SpacecraftSceneAPI = {
  go: () => void;
  pause: (paused: boolean) => void;
  diagnostics: (enabled: boolean) => void;
};
/** Own the imperative renderer lifecycle; the React shell owns props and loading UI. */
export function mountSpacecraftScene({
  host,
  latest,
  api,
  setState,
  site: s,
  audit,
}: {
  host: { current: HTMLDivElement | null };
  latest: { current: SpacecraftProps };
  api: { current: SpacecraftSceneAPI | null };
  setState: (value: string) => void;
  site: SpacecraftProps['site'];
  audit?: SceneAudit;
}) {
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
        import('../orbit/orbital-environment'),
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
        // Instantiated on request without rebuilding the ship or its camera.
        const gl = renderer.getContext();
        const shadowReasons = new Set<string>(['initial']);
        const invalidateShadow = (reason: string) => {
          shadowReasons.add(reason);
          renderer.shadowMap.needsUpdate = true;
        };
        let restoreShadowDiagnostics = () => {};
        let frozenBackgroundTime: number | undefined;
        // The historical policy remains selectable only by the explicit local lab.
        let aoPolicy: 'legacy' | 'geometry' = 'geometry';
        let diagnostics: ReturnType<typeof createScenePerformance> | null =
          null;
        let spacecraftPerformance: ReturnType<
          typeof createSpacecraftPerformance
        > | null = null;
        let spacecraftFilter: SpacecraftPerformanceFilter = {
          mode: 'all',
          id: '',
        };
        function resetDiagnostics(reason: string) {
          diagnostics?.reset(reason);
          spacecraftPerformance?.reset();
        }
        type Experiment =
          | 'normal'
          | 'no-background'
          | 'no-ao'
          | 'half-resolution'
          | 'no-spacecraft'
          | 'render-once';
        let experiment: Experiment = 'normal';
        const mobile = () => el.clientWidth < 700;
        const memory = (navigator as Navigator & { deviceMemory?: number })
          .deviceMemory;
        const capableShading =
          navigator.hardwareConcurrency >= 8 &&
          (memory === undefined || memory >= 8);
        const contactShading =
          capableShading && renderer.extensions.has('EXT_color_buffer_float');
        renderer.setPixelRatio(Math.min(devicePixelRatio, mobile() ? 1.75 : 2));
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
        // Native application content uses one viewport-relative projection.
        // Keep its origin independent of CSS3D's nested camera wrappers and
        // percentage centering; scene hotspots continue to use CSS3DRenderer.
        const surfaceLayer = document.createElement('div');
        surfaceLayer.className = 'world-surface-layer';
        el.appendChild(surfaceLayer);
        const contactReturnHint = document.createElement('span');
        contactReturnHint.className = 'contact-room-return-hint';
        contactReturnHint.textContent = 'Click wall to return';
        contactReturnHint.setAttribute('aria-hidden', 'true');
        el.appendChild(contactReturnHint);
        const surfaceElement = document.createElement('div');
        surfaceElement.className = 'world-surface';
        const surface = new THREE.Object3D();
        cssScene.add(surface);
        surfaceLayer.appendChild(surfaceElement);
        const projectedSurface = createProjectedSurface(THREE, surfaceElement);
        const projectedViewport = new THREE.Vector2();
        latest.current.onSurfaceReady(surfaceElement);
        const camera = new THREE.PerspectiveCamera(38, 1, 0.5, 80);
        const cameraFrame = createVesselCameraFrame(THREE);
        const backgroundReference = createOrbitalWorldReference(THREE);
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
        const modelOptions = {
          vesselName,
          socials: resolveSocialScreens(latest.current.links),
          accent: s.accent,
          projectPageSize: PROJECTS_PER_PAGE,
          screenLabels: false,
          // Viewport changes frame the same vessel; they must not squeeze
          // cabin walls or rescale their contents before portrait rotation.
          layout: 'wide' as const,
          geometryCompaction: audit?.geometryCompaction,
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
        };
        const modelStart = audit ? performance.now() : 0;
        const model = createSpacecraft(THREE, modelOptions);
        audit?.modelReady?.(
          model,
          modelOptions,
          THREE,
          performance.now() - modelStart,
        );
        scene.add(model.group);
        cameraFrame.projectionModel.userData = model.group.userData;
        // This loop synchronizes the scene after animation/reader transforms.
        // Reuse those exact matrices for shadows, color, and AO instead of
        // traversing every spacecraft object again for each render pass.
        scene.matrixWorldAutoUpdate = false;
        const annotations = createOverviewAnnotations(THREE, el, s, {
          navigate: (section) => latest.current.onNavigate(section),
        });
        const lightRig = new THREE.Group();
        lightRig.name = 'vessel-lighting-frame';
        scene.add(lightRig);
        lightRig.add(new THREE.HemisphereLight(0xe0eaff, 0x394553, 0.28));
        const key = new THREE.DirectionalLight(0xffe3c1, 2.2);
        key.position.set(-7, 10, 12);
        key.castShadow = true;
        key.shadow.mapSize.set(mobile() ? 1024 : 2048, mobile() ? 1024 : 2048);
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
        lightRig.add(key);
        const rim = new THREE.DirectionalLight(0x91b8ff, 1.2);
        rim.position.set(4, 3, -7);
        lightRig.add(rim);
        const bounce = new THREE.DirectionalLight(0xffd7a4, 0.45);
        bounce.position.set(-2, -1, 6);
        lightRig.add(bounce);
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
        let aoGeometryRevision = -1,
          aoReaderStretch = NaN;
        const aoProjection = new THREE.Matrix4();
        const aoDirtyReasons = new Set<string>(['initial']);
        const invalidateAo = (reason: string) => {
          aoDirtyReasons.add(reason);
          aoDirty = true;
        };
        function refreshOcclusion(delta: number, profile = true) {
          if (profile) {
            diagnostics?.beginPass('ao-refresh', renderer.info.render);
            spacecraftPerformance?.beginPass(
              'ao-refresh',
              renderer.info.render,
            );
          }
          for (const hatch of model.group.userData.irisHatches)
            hatch.userData.setOcclusionPass(true);
          const restore = spacecraftPerformance?.applyFilter();
          try {
            ao.render(
              renderer,
              ao.pdRenderTarget,
              ao.pdRenderTarget,
              delta,
              false,
            );
          } finally {
            restore?.();
            for (const hatch of model.group.userData.irisHatches)
              hatch.userData.setOcclusionPass(false);
          }
          if (profile) {
            spacecraftPerformance?.endPass(renderer.info.render);
            diagnostics?.endPass('ao-refresh', renderer.info.render);
          }
        }
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
        const roomNavigation = createRoomNavigationTargets(THREE, model.group);
        roomNavigation.sync(model.group.userData.layoutScale);
        const hotspotObjects: {
          object: InstanceType<typeof CSS3DObject>;
          button: HTMLButtonElement;
          section: string;
          portalId: string;
        }[] = [];
        // Native doorway controls complement the visible room-opening targets.
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
          button.onclick = () => navigateDoor(portal.id);
          button.dataset.sceneRoom = portal.to;
          button.dataset.scenePortal = portal.id;
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
        const computer = model.group.userData.contactComputer;
        const computerButton = document.createElement('button');
        computerButton.type = 'button';
        computerButton.className = 'world-object-target world-computer-screen';
        computerButton.setAttribute('aria-label', 'Open Contact computer');
        computerButton.dataset.targetKey = 'contact-computer';
        computerButton.dataset.sceneObject = 'contact-computer';
        computerButton.style.width = '500px';
        computerButton.style.height = `${(500 * computer.height) / computer.width}px`;
        computerButton.onclick = () => {
          if (active === 'contact' && !reading && !travelling)
            latest.current.onOpenContact?.();
        };
        const computerTarget = new CSS3DObject(computerButton);
        cssScene.add(computerTarget);
        const projectControls = model.group.userData.projectScreens.map(
          (screen: any) => {
            const button = document.createElement('button');
            button.type = 'button';
            button.className = 'world-object-target world-computer-screen';
            button.setAttribute('aria-label', `Open ${screen.label}`);
            button.dataset.targetKey = screen.interactableId;
            button.dataset.sceneObject = screen.interactableId;
            button.style.width = '500px';
            button.style.height = `${(500 * screen.height) / screen.width}px`;
            button.onclick = () => {
              if (active === 'projects' && !travelling)
                latest.current.onOpenProjects?.(screen.category);
            };
            const object = new CSS3DObject(button);
            cssScene.add(object);
            return { screen, button, object };
          },
        );
        const selectedProjectScreen = () =>
          projectControls.find(
            ({ screen }: any) =>
              screen.category === latest.current.projectScreen,
          )?.screen || projectControls[0].screen;
        const applicationRoom = () =>
          active === 'contact' || active === 'projects';
        const screenProjection = new THREE.Vector3();
        function screenInViewport(screen: any) {
          let left = Infinity,
            right = -Infinity,
            bottom = Infinity,
            top = -Infinity;
          for (const x of [-0.5, 0.5])
            for (const y of [-0.5, 0.5]) {
              screenProjection
                .set(x * screen.width, y * screen.height, 0)
                .applyMatrix4(screen.anchor.matrixWorld)
                .project(camera);
              if (screenProjection.z < -1 || screenProjection.z > 1)
                return false;
              left = Math.min(left, screenProjection.x);
              right = Math.max(right, screenProjection.x);
              bottom = Math.min(bottom, screenProjection.y);
              top = Math.max(top, screenProjection.y);
            }
          return left < 1 && right > -1 && bottom < 1 && top > -1;
        }
        let contactRoomPicker: ReturnType<
          typeof createContactRoomDismissPicker
        >;
        let projectRoomPicker: ReturnType<
          typeof createContactRoomDismissPicker
        >;
        const lastContactPickRay = new THREE.Ray();
        let contactWallPicks = 0;
        let contactPickRevision = -1,
          contactPickWall = false;
        const syncSceneTargets = () => {
          Object.assign(anchors, model.group.userData.roomAnchors);
          readerAnchors = model.group.userData.readerAnchors;
          roomNavigation.sync(model.group.userData.layoutScale);
          const walls: Three.Mesh[] = [],
            blockers: Three.Mesh[] = [];
          model.group.traverse((object: any) => {
            if (object.isMesh && object.material?.userData.contactRoomWall)
              walls.push(object);
          });
          computer.consoleRoot.traverse((object: any) => {
            if (object.isMesh && !object.userData.isInteractionProxy)
              blockers.push(object);
          });
          contactRoomPicker = createContactRoomDismissPicker(walls, blockers);
          const projectWalls: Three.Mesh[] = [],
            projectBlockers: Three.Mesh[] = [];
          model.group.traverse((object: any) => {
            if (
              object.isMesh &&
              object.material?.userData.applicationRoomWall === 'projects'
            )
              projectWalls.push(object);
          });
          model.group.userData.projectWorkshop.traverse((object: any) => {
            if (object.isMesh && !object.userData.isInteractionProxy)
              projectBlockers.push(object);
          });
          projectRoomPicker = createContactRoomDismissPicker(
            projectWalls,
            projectBlockers,
          );
          contactPickRevision = -1;
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
            axis(-CAMERA_RANGES.overview.pitch),
            axis(-CAMERA_RANGES.overview.yaw),
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
          portalId?: string;
          roomTarget?: boolean;
          closeContact?: boolean;
          navigationOnly: boolean;
        } | null = null;
        const doorQueue = createDoorNavigationQueue();
        function navigateDoor(id: string) {
          if (reading || !latest.current.enabled) return;
          const portal = model.group.userData.portals.find(
            (p: any) => p.id === id,
          );
          if (!portal || portal.from !== active) return;
          const destination = doorQueue.request(
            portal,
            active,
            travelling,
            insideLadderRoom(),
            routeLadderPortalIds,
          );
          el.dataset.queuedRoom = doorQueue.destination;
          if (destination) latest.current.onNavigate(destination);
        }
        function roomIntent(destination: string) {
          const intent = roomNavigationIntent(
            model.group.userData.portals,
            active,
            destination,
            insideLadderRoom(),
          );
          if (!intent) return null;
          if (
            travelling &&
            !canPreviewDoor(
              model.group.userData.portals.find(
                (p: any) => p.id === intent.portalId,
              ),
            )
          )
            return null;
          return intent;
        }
        function navigateRoom(destination: string) {
          if (reading || !latest.current.enabled) return;
          const intent = roomIntent(destination);
          if (!intent) return;
          const next = doorQueue.requestDestination(
            intent.section,
            active,
            travelling,
          );
          el.dataset.queuedRoom = doorQueue.destination;
          if (next) latest.current.onNavigate(next);
        }
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
          vesselMatrix: number[];
          backgroundPosition: number[];
          backgroundQuaternion: number[];
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
            cameraFov: camera.fov,
          },
        );
        let backgroundSettled = false;
        void background.ready.then(() => {
          backgroundSettled = true;
          if (!destroyed) kick();
        });
        const collectSceneInventory = () => {
          const parts: {
            name: string;
            triangles: number;
            instances: number;
          }[] = [];
          const geometries = new Set<Three.BufferGeometry>();
          const materials = new Set<Three.Material>();
          let nodes = 0,
            lights = 0,
            shadowCasters = 0,
            geometryBytes = 0;
          for (const root of [scene, background.scene])
            root.traverse((object) => {
              nodes++;
              if (object instanceof THREE.Light) lights++;
              if (!(object instanceof THREE.Mesh)) return;
              if (object.castShadow) shadowCasters++;
              const geometry = object.geometry;
              const instances =
                object instanceof THREE.InstancedMesh ? object.count : 1;
              parts.push({
                name:
                  object.name || object.userData.parts?.[0] || 'unnamed mesh',
                triangles:
                  ((geometry.index?.count ??
                    geometry.attributes.position?.count ??
                    0) /
                    3) *
                  instances,
                instances,
              });
              for (const material of Array.isArray(object.material)
                ? object.material
                : [object.material])
                materials.add(material);
              if (geometries.has(geometry)) return;
              geometries.add(geometry);
              for (const attribute of Object.values(
                geometry.attributes,
              ) as Three.BufferAttribute[])
                geometryBytes += attribute.array.byteLength;
              geometryBytes += geometry.index?.array.byteLength ?? 0;
            });
          return {
            nodes,
            meshes: parts.length,
            lights,
            shadowCasters,
            geometries: geometries.size,
            materials: materials.size,
            geometryAttributeBytes: geometryBytes,
            largestMeshes: parts
              .sort((a, b) => b.triangles - a.triangles)
              .slice(0, 15),
            note: 'Inventory includes hidden variants. Triangle inventory is not rendered cost; use per-pass draw counters. Attribute bytes are CPU-side geometry storage, not total GPU memory.',
          };
        };
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
        const projectLayout = () =>
          projectApplicationLayout(
            el.clientWidth,
            el.clientHeight,
            selectedProjectScreen().width,
            selectedProjectScreen().height,
            Math.max(bottomReservation, mobile() ? 132 : 80),
          );
        const computerLayout = () =>
          active === 'projects'
            ? projectLayout()
            : contactApplicationLayout(
                el.clientWidth,
                el.clientHeight,
                computer.width,
                computer.height,
                // Overview poses also refresh the shared dock inset during resize.
                // Keep the Contact window's own compact reservation stable.
                Math.max(bottomReservation, mobile() ? 132 : 80),
              );
        const portraitOverview = () => el.clientHeight > el.clientWidth;
        const zAxis = new THREE.Vector3(0, 0, 1);
        const pose = (section: string, isReading: boolean) => {
          const home = section === 'home';
          const desiredRoll = home && portraitOverview() ? Math.PI / 2 : 0;
          const target = new THREE.Vector3(
            ...(anchors[section] || anchors.home),
          );
          const direction = new THREE.Vector3(
            ...(home
              ? overviewCameraDirection(camera.aspect)
              : ([0, 0, 1] as const)),
          ).normalize();
          const headers = (
            home ? ['.flight-header', '.orbital-identity'] : ['.flight-header']
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
          const calloutGutter = home
            ? overviewCalloutGutter(
                el.clientHeight,
                topInset,
                bottomReservation,
                portraitOverview(),
              )
            : 0;
          const safe = {
            left:
              -1 +
              (2 * (home && portraitOverview() ? 36 : mobile() ? 12 : 18)) /
                el.clientWidth,
            right:
              1 -
              (2 * (home && portraitOverview() ? 36 : mobile() ? 12 : 18)) /
                el.clientWidth,
            top: 1 - (2 * (topInset + calloutGutter)) / el.clientHeight,
            bottom:
              -1 + (2 * (bottomReservation + calloutGutter)) / el.clientHeight,
          };
          let desiredDistance: number;
          if (isReading && section === 'contact') {
            model.group.updateMatrixWorld(true);
            const layout = computerLayout();
            const origin = computer.anchor.getWorldPosition(
              new THREE.Vector3(),
            );
            const points: Vec3[] = [];
            if (layout.portrait) {
              for (const x of [-layout.width / 2, layout.width / 2])
                for (const y of [-layout.height / 2, layout.height / 2])
                  points.push(
                    computer.anchor
                      .localToWorld(new THREE.Vector3(x, y, 0))
                      .toArray(),
                  );
            } else {
              // Frame the fixed monitor and keyboard together, including key travel.
              for (const root of [computer.root, computer.keyboard.root]) {
                const bounds = new THREE.Box3().setFromObject(root);
                for (const x of [bounds.min.x, bounds.max.x])
                  for (const y of [bounds.min.y, bounds.max.y])
                    for (const z of [bounds.min.z, bounds.max.z])
                      points.push([x, y, z]);
              }
              direction.set(0, 0.12, 1).normalize();
            }
            const framed = fitPerspectiveFrame(
              points,
              {
                target: origin.toArray(),
                direction: direction.toArray(),
              },
              camera.fov,
              camera.aspect,
              {
                left: -1 + 32 / el.clientWidth,
                right: 1 - 32 / el.clientWidth,
                top: 1 - (2 * (layout.portrait ? 64 : 20)) / el.clientHeight,
                bottom:
                  1 -
                  (2 * (el.clientHeight - bottomReservation)) / el.clientHeight,
              },
            );
            target.set(...framed.target);
            desiredDistance = framed.distance * (layout.portrait ? 1 : 1.06);
            el.dataset.framing = JSON.stringify({
              mode: 'contact-computer',
              ...layout,
              distance: desiredDistance,
            });
          } else if (isReading && section === 'projects') {
            model.group.updateMatrixWorld(true);
            const screen = selectedProjectScreen();
            const layout = projectLayout();
            const points: Vec3[] = [];
            for (const x of [-layout.framing.width / 2, layout.framing.width / 2])
              for (const y of [-layout.framing.height / 2, layout.framing.height / 2])
                points.push(
                  screen.anchor
                    .localToWorld(new THREE.Vector3(x, y, 0))
                    .toArray(),
                );
            const framed = fitPerspectiveFrame(
              points,
              {
                target: screen.anchor
                  .getWorldPosition(new THREE.Vector3())
                  .toArray(),
                direction: direction.toArray(),
              },
              camera.fov,
              camera.aspect,
              {
                left: -1 + 32 / el.clientWidth,
                right: 1 - 32 / el.clientWidth,
                top: 1 - (2 * (layout.portrait ? 64 : 30)) / el.clientHeight,
                bottom: -1 + (2 * bottomReservation) / el.clientHeight,
              },
              0.1,
            );
            target.set(...framed.target);
            desiredDistance = framed.distance * (layout.portrait ? 1 : 1.06);
            el.dataset.framing = JSON.stringify({
              mode: 'projects-application',
              screen: screen.category,
              ...layout,
              distance: desiredDistance,
            });
          } else if (isReading) {
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
            for (const point of support)
              points.push(
                new THREE.Vector3(...(point as [number, number, number]))
                  .applyAxisAngle(zAxis, desiredRoll)
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
                      new THREE.Vector3(...a).applyAxisAngle(zAxis, desiredRoll)
                        .x - target.x,
                    ),
                  ),
              ) * 0.022;
            const hoverY =
              Math.max(
                ...Object.entries(anchors)
                  .filter(([k]) => k !== 'home')
                  .map(([, a]) =>
                    Math.abs(
                      new THREE.Vector3(...a).applyAxisAngle(zAxis, desiredRoll)
                        .y - target.y,
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
              camera.aspect < 1 ? 8 : 4,
              overviewCameraRange(camera.aspect),
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
            const aperture = model.group.userData.innerApertureBounds[section];
            target.y = aperture.center[1];
            const solution = fitRoomCameraFrame(
              model.group.userData.roomCameraFrame,
              camera.fov,
              camera.aspect,
              safe,
            );
            desiredDistance = solution.chosenDistance;
            el.dataset.framing = JSON.stringify({
              mode: 'room',
              reference: 'shared-cabin-architecture',
              ...solution,
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
        let overviewFlight: { path: OverviewFlight; elapsed: number } | null =
          null;
        const flightPoseData = (p: FlightPose): OverviewFlightPose => ({
          target: p.target.toArray() as Vec3,
          direction: p.direction.toArray() as Vec3,
          distance: p.distance,
          roll: p.roll,
        });
        let travelledRoute: string[] = [];
        let lastSettledSection = 'home';
        let itineraryPlan: unknown = null;
        let openPortalIds: string[] = [];
        let routeLadderPortalIds: string[] = [];
        function insideLadderRoom(
          focus = currentTarget.clone().applyAxisAngle(zAxis, -roll),
        ) {
          const bounds = model.group.userData.walkwayBounds;
          return (
            travelling &&
            (itineraryPlan as { kind?: string } | null)?.kind !==
              'overview-curve' &&
            Math.abs(focus.x - bounds.center[0]) < bounds.size[0] / 2 &&
            Math.abs(focus.y - bounds.center[1]) < bounds.size[1] / 2
          );
        }
        function canPreviewDoor(portal: any) {
          return canUseDoorDuringTravel(
            portal,
            active,
            insideLadderRoom(),
            routeLadderPortalIds,
          );
        }
        let legPortalIds: string[] = [];
        let ladderExitLeg = false;
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
          const exitHold = cabinFlight
            ? ladderExitHoldPoint(
                model.group.userData.portals,
                legPortalIds,
                currentTarget.toArray() as Vec3,
                desired.target.toArray() as Vec3,
              )
            : null;
          ladderExitLeg = !!exitHold;
          if (exitHold) doorHoldTarget.set(...exitHold);
          nextTarget.copy(desired.target);
          nextDirection.copy(desired.direction);
          nextDistance = desired.distance;
          nextRoll = desired.roll;
        };
        const go = (immediate = false, notify = true) => {
          cancelInput();
          dragGoal.set(0, 0);
          // A pointer position from the previous room must not tilt the arrival.
          // Preserve spring velocity so the view returns to center smoothly.
          pointerGoal.set(0, 0);
          invalidateAo('navigation');
          const previousRoom = active;
          const wasReading = reading;
          contactPickRevision = -1;
          active = latest.current.section;
          reading = latest.current.readingSurface;
          computer.keyboard.clear();
          notifyArrival = notify;
          if (model.group.userData.projectPage !== latest.current.projectPage)
            model.setProjectPage(latest.current.projectPage);
          const overview = pose('home', false);
          const support = model.group.userData.overviewSupportPoints || [];
          annotations.layout(
            { ...overview, fov: camera.fov },
            support.length
              ? support
              : [
                  model.group.userData.overviewBounds.min,
                  model.group.userData.overviewBounds.max,
                ],
            model.group,
          );
          const desired = active === 'home' ? overview : pose(active, reading);
          const desiredFraming = el.dataset.framing;
          itinerary = [];
          overviewFlight = null;
          flightTrace.length = 0;
          travelledRoute = [];
          itineraryPlan = null;
          openPortalIds = [];
          routeLadderPortalIds = [];
          legPortalIds = [];
          ladderExitLeg = false;
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
            const circulation: string[] = model.group.userData.circulation || [
              'experience',
              'projects',
              'about',
              'contact',
            ];
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
                      Math.min(plan.station, plan.destinationStation) - 0.001 &&
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
            // Depart from the displayed view, including hover dolly and drag.
            // Otherwise those offsets unwind before the slow start of the flight
            // and create an unwanted retreat even on a strictly inward path.
            const departure = (dt = 0): FlightPose => {
              const at = (axis: MotionAxis) => axis.value + axis.velocity * dt;
              const angles = boundedCameraAngles(
                [at(pointerMotion[0]), at(pointerMotion[1])],
                [at(dragMotion[0]), at(dragMotion[1])],
                {
                  pitch: at(rangeMotion[0]),
                  yaw: at(rangeMotion[1]),
                  minPitch: at(rangeMotion[2]),
                  minYaw: at(rangeMotion[3]),
                },
              );
              return {
                target: new THREE.Vector3(
                  at(targetMotion[0]) + at(hoverMotion[0]),
                  at(targetMotion[1]) + at(hoverMotion[1]),
                  at(targetMotion[2]),
                ),
                direction: new THREE.Vector3(...directionMotion.map(at))
                  .normalize()
                  .applyEuler(new THREE.Euler(angles[0], angles[1], 0)),
                distance: at(distanceMotion) * (1 - 0.025 * at(dollyMotion)),
                roll: at(rollMotion),
              };
            };
            const start = flightPoseData(departure());
            const previous = flightPoseData(departure(-0.0001));
            const path = createOverviewFlight(
              start,
              flightPoseData(desired),
              travelling
                ? {
                    target: start.target.map(
                      (v, i) => (v - previous.target[i]) / 0.0001,
                    ) as [number, number, number],
                    direction: start.direction.map(
                      (v, i) => (v - previous.direction[i]) / 0.0001,
                    ) as [number, number, number],
                    distance: (start.distance - previous.distance) / 0.0001,
                    roll: (start.roll - previous.roll) / 0.0001,
                  }
                : undefined,
            );
            // Seed the shared axes in the same baked frame. The first velocity
            // sample must measure actual travel, not the folded input offsets.
            start.target.forEach((v, i) => resetAxis(targetMotion[i], v));
            start.direction.forEach((v, i) => resetAxis(directionMotion[i], v));
            resetAxis(distanceMotion, start.distance);
            resetAxis(rollMotion, start.roll);
            [
              ...pointerMotion,
              ...dragMotion,
              ...hoverMotion,
              dollyMotion,
            ].forEach((s) => resetAxis(s, 0));
            pointerCurrent.set(0, 0);
            overviewFlight = { path, elapsed: 0 };
            itinerary = [];
            travelledRoute = [];
            itineraryPlan = { kind: 'overview-curve', ...path };
            openPortalIds = [];
            cabinFlight = false;
          }
          itinerary.push(desired);
          const overviewBounds = model.group.userData.overviewBounds;
          const hullDiameter = new THREE.Vector3(
            ...overviewBounds.max,
          ).distanceTo(new THREE.Vector3(...overviewBounds.min));
          // Preserve the depth range throughout travel; screen-space hull
          // cropping is intentional while a portrait view turns toward a room.
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
          diagnostics?.beginFrame(now, {
            room: active,
            activity: travelling
              ? 'travel'
              : down?.gesture.dragging
                ? 'drag'
                : hovered || highlightedObject
                  ? 'hover'
                  : stop
                    ? 'reduced-motion'
                    : pointerMotion.some(
                          (axis) => Math.abs(axis.velocity) > 0.001,
                        )
                      ? 'camera-settling'
                      : 'idle',
            experiment,
            spacecraftFilter,
            reading,
            visible,
            reducedMotion: stop,
            width: el.clientWidth,
            height: el.clientHeight,
            pixelRatio: renderer.getPixelRatio(),
            drawingWidth: renderer.domElement.width,
            drawingHeight: renderer.domElement.height,
          });
          if (!stop) {
            elapsed += delta;
            if (delta > 0) {
              frameIntervals.push(rawDelta * 1000);
              if (frameIntervals.length > 360) frameIntervals.shift();
            }
          }
          if (travelling) {
            const immediate = flightImmediate || stop;
            // Keep only doorways still ahead of the live focus or containing
            // it. Release both faces after clearing the threshold, while the
            // camera continues toward the room's final pose.
            legPortalIds =
              cabinFlight && !immediate
                ? requiredPortalIds(model.group.userData.portals, [
                    currentTarget.toArray() as Vec3,
                    nextTarget.toArray() as Vec3,
                  ])
                : [];
            const routeRequests =
              cabinFlight && !immediate
                ? [
                    ...legPortalIds,
                    ...approachingLadderPortalIds(
                      model.group.userData.portals,
                      currentTarget.toArray() as Vec3,
                      nextTarget.toArray() as Vec3,
                      itinerary[0]?.target.toArray() as Vec3 | undefined,
                    ),
                  ]
                : [];
            // Reserve both ladder hatches along the remaining journey for
            // automatic travel. Pre-opening the opposite hatch even one leg
            // early would delay the entry seal while its camera keeps moving.
            // This reservation never opens doors earlier than routeRequests.
            const remainingRouteDoors =
              cabinFlight && !immediate
                ? requiredPortalIds(model.group.userData.portals, [
                    currentTarget.toArray() as Vec3,
                    nextTarget.toArray() as Vec3,
                    ...itinerary.map((point) => point.target.toArray() as Vec3),
                  ])
                : [];
            routeLadderPortalIds = remainingRouteDoors.filter((id) =>
              model.group.userData.portals.some(
                (p: any) => p.id === id && p.via === 'walkway',
              ),
            );
            const interlock = interlockLadderPortals(
              model.group.userData.portals,
              routeRequests,
            );
            openPortalIds = interlock.openPortalIds;
            // Ordinary cabin movement and ladder entry follow their original
            // springs immediately. The exit opens during the approach from
            // the bay center; retain a readiness hold for interrupted routes
            // whose previous hatch has not yet sealed.
            const exitBlocked =
              !immediate && ladderExitLeg && interlock.waiting;
            const waitingForDoors =
              exitBlocked && currentTarget.distanceTo(doorHoldTarget) < 0.01;
            el.dataset.waitingForDoors = String(waitingForDoors);
            const beforeRoll = roll;
            if (immediate) {
              overviewFlight = null;
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
            } else if (overviewFlight) {
              overviewFlight.elapsed = Math.min(
                overviewFlight.path.duration,
                overviewFlight.elapsed + delta,
              );
              const progress =
                overviewFlight.elapsed / overviewFlight.path.duration;
              const p = sampleOverviewFlight(overviewFlight.path, progress);
              // Retain actual velocity in the shared axes, so cancellation and
              // subsequent camera springs never inherit old waypoint velocities.
              const apply = (axis: MotionAxis, value: number) => {
                axis.velocity =
                  progress === 1 || delta <= 0
                    ? 0
                    : (value - axis.value) / delta;
                axis.value = value;
              };
              p.target.forEach((v, i) => apply(targetMotion[i], v));
              p.direction.forEach((v, i) => apply(directionMotion[i], v));
              apply(distanceMotion, p.distance);
              apply(rollMotion, p.roll);
              if (progress === 1) overviewFlight = null;
            } else {
              (exitBlocked ? doorHoldTarget : nextTarget)
                .toArray()
                .forEach((v, i) => moveCameraAxis(targetMotion[i], v, delta));
              // A reversal can carry residual velocity toward a closed hatch.
              // Never let the spring overshoot its reserved threshold margin.
              if (exitBlocked && targetMotion[0].value > doorHoldTarget.x) {
                targetMotion[0].value = doorHoldTarget.x;
                targetMotion[0].velocity = 0;
              }
              nextDirection.toArray().forEach((v, i) =>
                moveCameraAxis(directionMotion[i], v, delta, {
                  frequency: 10,
                  speed: 1,
                  acceleration: 4,
                }),
              );
              moveCameraAxis(distanceMotion, nextDistance, delta, {
                frequency: 9,
                speed: 18,
                acceleration: 45,
              });
              moveCameraAxis(rollMotion, nextRoll, delta, {
                frequency: 10,
                speed: 1.2,
                acceleration: 4,
              });
            }
            currentTarget.set(
              ...(targetMotion.map((s) => s.value) as [number, number, number]),
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
            if (Math.abs(beforeRoll - roll) > 0.00001) invalidateShadow('roll');
            const settled =
              !overviewFlight &&
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
            if (immediate || (!exitBlocked && (settled || nearWaypoint))) {
              if (itinerary.length) {
                aim(itinerary.shift()!);
              } else {
                travelling = false;
                openPortalIds = [];
                routeLadderPortalIds = [];
                legPortalIds = [];
                ladderExitLeg = false;
                cabinFlight = false;
                el.dataset.travelling = 'false';
                el.dataset.waitingForDoors = 'false';
                lastSettledSection = active;
                const queuedRoom = doorQueue.arrive(active);
                el.dataset.queuedRoom = '';
                if (queuedRoom) latest.current.onNavigate(queuedRoom);
                else if (notifyArrival) latest.current.onSettled();
              }
            }
          }
          diagnostics?.mark('navigation');
          const motionDelta = stop ? 0 : delta;
          const pointerLimits = { frequency: 8, speed: 3, acceleration: 12 };
          const feedbackTarget = feedback.resolve(
            (reading && !applicationRoom()) ||
              !latest.current.enabled ||
              !!down?.gesture.dragging ||
              document.hidden,
            pointerFeedback,
            () => targetFeedback(document.activeElement),
          );
          // Doors and visible destination rooms preview the same first hatch
          // during travel, without steering the camera or enabling objects.
          const effectiveHover = travelling ? '' : feedbackTarget.room;
          const effectiveObject = travelling ? '' : feedbackTarget.object;
          el.dataset.hoverObject = effectiveObject;
          const effectivePortal = feedbackTarget.portalId || effectiveHover;
          el.dataset.hoverPortal = effectivePortal;
          if (
            aoPolicy === 'legacy' &&
            (hovered !== effectiveHover ||
              highlightedObject !== effectiveObject)
          )
            invalidateAo('feedback-identity');
          hovered = effectiveHover;
          highlightedObject = effectiveObject;
          interactionScope.dataset.sceneInput = feedback.input;
          if (!down?.gesture.dragging)
            el.style.cursor =
              effectivePortal || effectiveObject
                ? 'pointer'
                : reading && !applicationRoom()
                  ? 'auto'
                  : 'grab';
          const inspectingPassage =
            active !== 'home' &&
            !travelling &&
            !!effectiveHover &&
            effectiveHover !== active &&
            !down?.gesture.dragging;
          const highlightedRoute = model.group.userData.activeRoute || [];
          const passage = model.group.userData.portals.find(
            (p: any) =>
              p.from === active &&
              (p.id === feedbackTarget.portalId ||
                p.to === effectiveHover ||
                (highlightedRoute.at(-1) === effectiveHover &&
                  p.to === highlightedRoute[1])),
          );
          // Look slightly across the open threshold so its neighbor is visible.
          const passagePeek = passage?.edge === 'right' ? -1 : 1;
          diagnostics?.mark('pointer-feedback');
          pointerCurrent.set(
            moveCameraAxis(
              pointerMotion[0],
              reading && !applicationRoom()
                ? 0
                : inspectingPassage
                  ? passagePeek
                  : pointerGoal.x,
              motionDelta,
              pointerLimits,
            ),
            moveCameraAxis(
              pointerMotion[1],
              (reading && !applicationRoom()) || inspectingPassage
                ? 0
                : pointerGoal.y,
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
            if (stop)
              resetAxis(
                dragMotion[index],
                reading && !applicationRoom() ? 0 : goal,
              );
            else
              moveCameraAxis(
                dragMotion[index],
                reading && !applicationRoom() ? 0 : goal,
                delta,
                {
                  frequency: 10,
                  speed: 4,
                  acceleration: 18,
                },
              );
          }
          const range: CameraAngleRange =
            active === 'home'
              ? overviewCameraRange(camera.aspect)
              : reading && applicationRoom()
                ? CAMERA_RANGES.computer
                : CAMERA_RANGES.room;
          [
            range.pitch,
            range.yaw,
            range.minPitch ?? -range.pitch,
            range.minYaw ?? -range.yaw,
          ].forEach((value, index) => {
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
            {
              pitch: rangeMotion[0].value,
              yaw: rangeMotion[1].value,
              minPitch: rangeMotion[2].value,
              minYaw: rangeMotion[3].value,
            },
          );
          const direction = viewDirection
            .clone()
            .applyEuler(new THREE.Euler(angles[0], angles[1], 0));
          const cameraTarget = currentTarget.clone();
          cameraTarget.x += hoverMotion[0].value;
          cameraTarget.y += hoverMotion[1].value;
          cameraFrame.apply(
            camera,
            cameraTarget,
            direction,
            distance * (1 - 0.025 * dollyMotion.value),
            roll,
          );
          // Preserve the authored illumination while transferring the former
          // hull rotation to the viewpoint. The hull and CSS anchors stay fixed.
          lightRig.quaternion.copy(cameraFrame.inverseRoll);
          key.shadow.camera.up
            .set(0, 1, 0)
            .applyQuaternion(cameraFrame.inverseRoll);
          scene.environmentRotation.z = -roll;
          // The camera's current focus selects the cabin being crossed, rather
          // than lighting the eventual destination for the whole journey.
          const localFocus = currentTarget.clone().applyAxisAngle(zAxis, -roll);
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
          const transitWalkway = insideLadderRoom(localFocus);
          const hoveredWalkway =
            active !== 'home' &&
            !reading &&
            !travelling &&
            (feedbackTarget.walkway || passage?.via === 'walkway');
          diagnostics?.mark('camera');
          model.update(
            elapsed,
            effectiveHover,
            stop,
            {
              activeRoom: active,
              travelling,
              transitRoom,
              transitWalkway,
              routeLadderPortalIds,
              hoveredWalkway,
              labelPortrait: active === 'home' && Math.abs(roll) > Math.PI / 4,
              hoveredPortal: effectivePortal,
              openPortalIds:
                travelling && !stop && !flightImmediate ? openPortalIds : [],
              immediateDoors: stop || (wasTravelling && flightImmediate),
              hoveredObject: effectiveObject,
              selectedProject: null,
              hoveredProject: null,
              hoveredCaseStudy: null,
              projectPage: latest.current.projectPage,
              projectScreen: latest.current.projectScreen || 'all',
              reading,
              delta,
            },
            true,
          );
          diagnostics?.mark('model-update');
          // Moving doors/readers do not cast into the cached static shadow map.
          for (const anchor of Object.values(model.readerSurfaces))
            if (anchor.userData.kind !== 'computer')
              anchor.parent.scale.y *= readerStretch();
          updateRenderSceneMatrices(scene);
          // Small workshop displays require closer portrait framing than cabin views.
          // Retain their near plane through the closing flight to avoid a clipping pop.
          const near =
            (reading && active === 'projects') ||
            (travelling && camera.near < 0.5)
              ? 0.08
              : 0.5;
          if (camera.near !== near) {
            camera.near = near;
            camera.updateProjectionMatrix();
          }
          camera.updateMatrixWorld(true);
          (audit?.shadingFrame ?? audit?.contactFrame)?.();
          diagnostics?.mark('matrices');
          annotations.update(
            cameraFrame.virtualCamera,
            cameraFrame.projectionModel,
            {
              home: active === 'home',
              travelling,
              reduced: stop,
              delta,
              hover: effectiveHover,
            },
          );
          diagnostics?.mark('annotations');
          const application = computerLayout();
          const isComputer = applicationRoom();
          const logicalWidth = isComputer
            ? application.pixelsWidth
            : paperPixels();
          const logicalHeight = isComputer
            ? application.pixelsHeight
            : logicalWidth * 1.125 * readerStretch();
          surfaceElement.style.width = `${logicalWidth}px`;
          surfaceElement.style.height = `${logicalHeight}px`;
          surfaceElement.dataset.compact = String(mobile());
          surfaceElement.dataset.computer = String(isComputer);
          surfaceElement.dataset.computerPortrait = String(
            isComputer && computerLayout().portrait,
          );
          const physicalSurface = model.readerSurfaces[active];
          if (physicalSurface) {
            physicalSurface.matrixWorld.decompose(
              surface.position,
              surface.quaternion,
              surface.scale,
            );
            surface.scale.multiplyScalar(
              (isComputer
                ? application.width
                : physicalSurface.userData.width) / logicalWidth,
            );
            if (!isComputer) surface.scale.y /= readerStretch();
          }
          surface.visible = reading && (isComputer || !travelling);
          surfaceElement.inert = !surface.visible || travelling;
          for (const h of hotspotObjects) {
            const portal = model.group.userData.portals.find(
              (p: any) => p.id === h.portalId,
            );
            h.object.visible =
              active === h.section &&
              !reading &&
              (!travelling || canPreviewDoor(portal));
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
            // Portrait frames just the application; do not tab into a social
            // screen completely outside the actual camera viewport.
            object.visible =
              active === 'contact' &&
              !travelling &&
              (!reading || screenInViewport(screen));
            link.inert = !object.visible;
            link.classList.toggle(
              'is-object-active',
              object.visible &&
                !down?.gesture.dragging &&
                effectiveObject === screen.interactableId,
            );
          }
          computer.anchor.matrixWorld.decompose(
            computerTarget.position,
            computerTarget.quaternion,
            computerTarget.scale,
          );
          computerTarget.scale.multiplyScalar(computer.width / 500);
          computerTarget.visible =
            active === 'contact' && !reading && !travelling;
          computerButton.inert = !computerTarget.visible;
          computerButton.classList.toggle(
            'is-object-active',
            computerTarget.visible && effectiveObject === 'contact-computer',
          );
          for (const { screen, button, object } of projectControls) {
            screen.anchor.matrixWorld.decompose(
              object.position,
              object.quaternion,
              object.scale,
            );
            object.scale.multiplyScalar(screen.width / 500);
            object.visible =
              active === 'projects' &&
              !travelling &&
              (!reading ||
                (screen !== selectedProjectScreen() &&
                  screenInViewport(screen)));
            button.inert = !object.visible;
            button.classList.toggle(
              'is-object-active',
              object.visible &&
                !down?.gesture.dragging &&
                effectiveObject === screen.interactableId,
            );
          }
          contactReturnHint.classList.toggle(
            'is-visible',
            reading &&
              applicationRoom() &&
              effectiveObject === `${active}-room-dismiss`,
          );
          diagnostics?.mark('html-sync');
          if (experiment !== 'no-background') {
            background.update(frozenBackgroundTime ?? elapsed, !stop, 0, 0);
            background.followCamera(camera, backgroundReference);
          }
          diagnostics?.mark('background-update');
          renderer.info.reset();
          diagnostics?.beginPass('background', renderer.info.render);
          renderer.clear();
          if (experiment !== 'no-background')
            renderer.render(background.scene, background.camera);
          diagnostics?.endPass('background', renderer.info.render);
          renderer.clearDepth();
          if (experiment !== 'no-spacecraft') {
            diagnostics?.beginPass('spacecraft', renderer.info.render);
            spacecraftPerformance?.beginPass(
              'spacecraft',
              renderer.info.render,
            );
            const restoreMain = spacecraftPerformance?.applyFilter();
            try {
              renderer.render(scene, camera);
            } finally {
              restoreMain?.();
            }
            spacecraftPerformance?.endPass(renderer.info.render);
            diagnostics?.endPass('spacecraft', renderer.info.render);
          }
          if (
            !mobile() &&
            contactShading &&
            experiment !== 'no-ao' &&
            experiment !== 'no-spacecraft'
          ) {
            const geometryMotion = !!model.group.userData.motionActive;
            const geometryRevision = model.group.userData.geometryRevision;
            const changedGeometry = geometryRevision !== aoGeometryRevision;
            const changedPosition =
              aoCameraPosition.distanceToSquared(camera.position) > 1e-8;
            const changedAngle =
              aoCameraQuaternion.angleTo(camera.quaternion) > 1e-5;
            const changedProjection = !aoProjection.equals(
              camera.projectionMatrix,
            );
            const changedReaderStretch = aoReaderStretch !== readerStretch();
            const refresh =
              aoDirty ||
              changedPosition ||
              changedAngle ||
              aoRoll !== roll ||
              (aoPolicy === 'legacy'
                ? geometryMotion || previousGeometryMotion
                : changedGeometry || changedProjection || changedReaderStretch);
            diagnostics?.annotate({
              aoPolicy,
              geometryRevision,
              geometryChanged: changedGeometry,
              legacyModelMotion: geometryMotion,
              aoDirtyReasons: [...aoDirtyReasons],
              aoCameraChanged: changedPosition || changedAngle,
              aoProjectionChanged: changedProjection,
              aoReaderStretchChanged: changedReaderStretch,
            });
            if (geometryMotion && !changedGeometry)
              diagnostics?.count('material-only-model-motion');
            if (refresh) {
              diagnostics?.count('ao-refresh');
              if (aoDirty) diagnostics?.count('ao-dirty');
              if (geometryMotion) diagnostics?.count('ao-legacy-model-motion');
              if (changedGeometry) diagnostics?.count('ao-geometry-change');
              if (previousGeometryMotion && !geometryMotion)
                diagnostics?.count('ao-legacy-settling');
              if (changedPosition) diagnostics?.count('ao-camera-position');
              if (changedAngle) diagnostics?.count('ao-camera-angle');
              if (aoRoll !== roll) diagnostics?.count('ao-roll');
              if (changedProjection) diagnostics?.count('ao-projection');
              if (changedReaderStretch) diagnostics?.count('ao-reader-stretch');
              refreshOcclusion(delta);
              aoCameraPosition.copy(camera.position);
              aoCameraQuaternion.copy(camera.quaternion);
              aoProjection.copy(camera.projectionMatrix);
              aoGeometryRevision = geometryRevision;
              aoReaderStretch = readerStretch();
              aoRoll = roll;
              aoDirty = false;
              aoDirtyReasons.clear();
            } else diagnostics?.count('ao-cached');
            previousGeometryMotion = geometryMotion;
            diagnostics?.beginPass('ao-composite', renderer.info.render);
            renderer.setRenderTarget(null);
            aoQuad.render(renderer);
            diagnostics?.endPass('ao-composite', renderer.info.render);
          }
          diagnostics?.endGpuFrame();
          cssRenderer.render(cssScene, camera);
          projectedSurface.update(
            camera,
            surface.matrixWorld,
            logicalWidth,
            logicalHeight,
            projectedViewport.x,
            projectedViewport.y,
            surface.visible,
          );
          diagnostics?.mark('css-render');
          if (auditMotion) {
            const sample = {
              time: now,
              delta,
              position: camera.position.toArray(),
              quaternion: camera.quaternion.toArray(),
              vesselMatrix: model.group.matrixWorld.toArray(),
              backgroundPosition: background.camera.position.toArray(),
              backgroundQuaternion: background.camera.quaternion.toArray(),
              hover: hovered,
              hoverPortal: effectivePortal,
              queuedRoom: doorQueue.destination,
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
          if (firstFrame && backgroundSettled) {
            firstFrame = false;
            setState('ready');
          }
          diagnostics?.mark('audit-trace');
          renderCost = renderCost * 0.9 + (performance.now() - started) * 0.1;
          if (now - lastMetrics > 200 || stop) {
            Object.assign(el.dataset, {
              cameraFar: String(camera.far),
              cameraAspect: String(camera.aspect),
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
              hoverOffset: hoverMotion.map((s) => s.value.toFixed(5)).join(','),
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
              physicalLabels: JSON.stringify(model.group.userData.labelPlaques),
              exteriorLabelAssemblies: JSON.stringify(
                model.group.userData.labelAssemblyBounds,
              ),
              pointerResponse: `${pointerCurrent.x.toFixed(5)},${pointerCurrent.y.toFixed(5)}`,
              dragResponse: dragMotion.map((s) => s.value.toFixed(5)).join(','),
              cameraAngles: angles.map((v) => v.toFixed(5)).join(','),
              cameraAngleLimits: rangeMotion
                .slice(0, 2)
                .map((s) => s.value.toFixed(5))
                .join(','),
              cameraAngleMinimums: rangeMotion
                .slice(2)
                .map((s) => s.value.toFixed(5))
                .join(','),
              vesselName,
              roomAnchors: JSON.stringify(model.group.userData.roomAnchors),
              portals: JSON.stringify(model.group.userData.portals),
              activeRoute: JSON.stringify(model.group.userData.activeRoute),
              travelledRoute: JSON.stringify(travelledRoute),
              itineraryRemaining: String(itinerary.length),
              itineraryPlan: JSON.stringify(itineraryPlan),
              lightingState: JSON.stringify(model.group.userData.lightingState),
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
              const layout = applicationRoom()
                ? computerLayout()
                : { width: 2.4, height: 2.7 };
              const points = [
                [-layout.width / 2, layout.height / 2],
                [layout.width / 2, layout.height / 2],
                [layout.width / 2, -layout.height / 2],
                [-layout.width / 2, -layout.height / 2],
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
          diagnostics?.mark('legacy-metrics');
          diagnostics?.endFrame();
        };
        const loop = (now: number) => {
          frame = 0;
          if (!visible || destroyed || audit?.manual) return;
          const rawDelta = lastFrame ? (now - lastFrame) / 1000 : 0;
          lastFrame = now;
          draw(now, Math.min(0.05, rawDelta), rawDelta);
          if ((!stop || travelling) && experiment !== 'render-once')
            frame = requestAnimationFrame(loop);
        };
        function kick() {
          if (!destroyed && visible && !frame && !audit?.manual)
            frame = requestAnimationFrame(loop);
        }
        const setDrawingSize = () => {
          // Ignore hidden/transient panels, but honor short-screen Interactive
          // view opt-in. The React shell owns the automatic reading fallback;
          // a visible canvas must use its actual aspect and drawing size.
          if (el.clientWidth < 240 || el.clientHeight < 240) return;
          const w = Math.max(1, el.clientWidth),
            h = Math.max(1, el.clientHeight);
          // Bound retina fill cost without changing cloud detail or HTML sharpness.
          // This runs only on viewport resize, never while retargeting a flight.
          renderer.setPixelRatio(
            Math.min(
              devicePixelRatio,
              mobile() ? 1.75 : 2,
              Math.sqrt(4_000_000 / (w * h)),
            ) * (experiment === 'half-resolution' ? 0.5 : 1),
          );
          renderer.setSize(w, h);
          cssRenderer.setSize(w, h);
          projectedViewport.set(w, h);
          ao.setSize(Math.round(w * 0.65), Math.round(h * 0.65));
          invalidateAo('drawing-size');
          background.resize(w, h, renderer.getPixelRatio(), camera.fov);
        };
        const identity = document.querySelector('.orbital-identity');
        let initializedCamera = false;
        let previousViewport = '';
        const resize = () => {
          if (el.clientWidth < 240 || el.clientHeight < 240) return;
          const w = Math.max(1, el.clientWidth),
            h = Math.max(1, el.clientHeight);
          const identityBounds = identity?.getBoundingClientRect();
          const viewport = [
            w,
            h,
            devicePixelRatio,
            identityBounds?.top,
            identityBounds?.bottom,
          ].join(',');
          // ResizeObserver also delivers an initial notification after setup.
          // Reframing an unchanged viewport here would cancel the entrance.
          if (viewport === previousViewport) return;
          previousViewport = viewport;
          camera.fov = responsiveCameraFov(w / h);
          setDrawingSize();
          camera.aspect = w / h;
          camera.updateProjectionMatrix();
          syncSceneTargets();
          // Choose the Earth composition from viewport orientation only. It
          // stays fixed while the camera rolls between overview and rooms.
          background.setViewportComposition(
            h > w,
            backgroundReference,
            !initializedCamera || stop,
          );
          invalidateShadow('viewport');
          resetDiagnostics('viewport changed');
          if (!initializedCamera) {
            // Deep links start at precisely the responsive overview pose,
            // including portrait hull rotation. go() then uses the same
            // itinerary and springs as an overview room selection.
            const overview = pose('home', false);
            currentTarget.copy(overview.target);
            viewDirection.copy(overview.direction);
            distance = overview.distance;
            roll = overview.roll;
            overview.target
              .toArray()
              .forEach((v, i) => resetAxis(targetMotion[i], v));
            overview.direction
              .toArray()
              .forEach((v, i) => resetAxis(directionMotion[i], v));
            resetAxis(distanceMotion, distance);
            resetAxis(rollMotion, roll);
            model.update(
              0,
              '',
              true,
              {
                activeRoom: 'home',
                reading: false,
                travelling: false,
                delta: 0,
              },
              true,
            );
            initializedCamera = true;
          } else go(true, travelling);
        };
        const observer = new ResizeObserver(resize);
        observer.observe(el);
        if (identity) observer.observe(identity);
        resize();
        function targetFeedback(element: Element | null): SceneFeedbackTarget {
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
          const portalId = target.dataset.scenePortal;
          // The open computer retains its social links, while ordinary room
          // and doorway navigation stays behind the application boundary.
          if (
            reading &&
            !(
              (active === 'contact' &&
                target.dataset.sceneObject?.startsWith('contact-social-')) ||
              (active === 'projects' &&
                target.dataset.sceneObject?.startsWith('projects-screen-'))
            )
          )
            return EMPTY_SCENE_FEEDBACK;
          if (
            travelling &&
            !canPreviewDoor(
              model.group.userData.portals.find((p: any) => p.id === portalId),
            )
          )
            return EMPTY_SCENE_FEEDBACK;
          return {
            room: room === 'home' ? '' : room,
            object: target.dataset.sceneObject || '',
            walkway: false,
            ...(portalId ? { portalId } : {}),
          };
        }
        function pickAt(
          x: number,
          y: number,
        ): {
          section: string;
          walkway: boolean;
          portalId?: string;
          roomTarget?: boolean;
          closeContact?: boolean;
        } {
          const rect = el.getBoundingClientRect();
          pointer.set(
            ((x - rect.left) / rect.width) * 2 - 1,
            (-(y - rect.top) / rect.height) * 2 + 1,
          );
          ray.setFromCamera(pointer, camera);
          if (reading && applicationRoom() && !travelling) {
            // Detailed occlusion is needed only for a new ray or changed
            // geometry. DOM hit testing still runs first on every frame.
            const revision = model.group.userData.geometryRevision;
            if (
              contactPickRevision !== revision ||
              !lastContactPickRay.equals(ray.ray)
            ) {
              contactPickWall = !!(
                active === 'projects' ? projectRoomPicker : contactRoomPicker
              )?.pick(ray);
              el.dataset.contactWallPicks = String(++contactWallPicks);
              contactPickRevision = revision;
              lastContactPickRay.copy(ray.ray);
            }
            return {
              section: contactPickWall ? active : '',
              walkway: false,
              closeContact: contactPickWall,
            };
          }
          return roomNavigation.select(ray, {
            active,
            reading,
            portalTargets: model.portalTargets,
            roomIntent,
            canUsePortal: (id) =>
              !travelling ||
              canPreviewDoor(
                model.group.userData.portals.find((p: any) => p.id === id),
              ),
          });
        }
        function pick(event: PointerEvent) {
          const target = targetFeedback(event.target as Element);
          if (target.room || target.object)
            return { section: target.room, portalId: target.portalId };
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
          if ('closeContact' in hit && hit.closeContact)
            return {
              room: '',
              object: `${active}-room-dismiss`,
              walkway: false,
            };
          return {
            room: hit.section,
            object: '',
            walkway: hit.walkway,
            ...('portalId' in hit ? { portalId: hit.portalId } : {}),
          };
        }
        const feedbackChanged = () => kick();
        const earthPlaybackInput = (target: EventTarget | null) => {
          if (
            !(target instanceof Element) ||
            !target.closest('[data-earth-playback]')
          )
            return false;
          // Toolbar input must not retain a room preview or drag/hover pose.
          feedback.reset();
          pointerGoal.set(0, 0);
          kick();
          return true;
        };
        const trackPointer = (event: PointerEvent) => {
          if (!event.isPrimary) return;
          if (
            earthPlaybackInput(event.target) ||
            (event.target as Element).closest('[data-scene-perf]')
          )
            return;
          feedback.move(event.clientX, event.clientY, event.pointerType);
          feedbackChanged();
        };
        const trackPress = (event: PointerEvent) => {
          if (!event.isPrimary) return;
          if (
            earthPlaybackInput(event.target) ||
            (event.target as Element).closest('[data-scene-perf]')
          )
            return;
          feedback.press(event.clientX, event.clientY, event.pointerType);
          feedbackChanged();
        };
        const trackKeyboard = (event: KeyboardEvent) => {
          if (
            earthPlaybackInput(event.target) ||
            (event.target as Element).closest('[data-scene-perf]')
          )
            return;
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
          if (
            !down &&
            (event.target as Element).closest('.world-surface') &&
            (!(reading && applicationRoom()) || event.buttons !== 0)
          )
            return;
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
              if (!down.navigationOnly) dragGoal.set(...down.gesture.response);
              pointerGoal.set(0, 0);
              el.style.cursor = 'grabbing';
              el.dataset.dragging = 'true';
              kick();
            }
            return;
          }
          if (
            (event.target as Element).closest('button') &&
            !(reading && applicationRoom())
          )
            return;
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
            (reading && (!applicationRoom() || travelling)) ||
            (event.target as Element).closest('.world-surface')
          )
            return;
          const control = (event.target as Element).closest<HTMLElement>(
            '.world-hotspot, .overview-callout, .world-social-screen, .world-computer-screen',
          );
          if ((event.target as Element).closest('button') && !control) return;
          suppressClickUntil = 0;
          const selection = pick(event);
          if (
            travelling &&
            !canPreviewDoor(
              model.group.userData.portals.find(
                (p: any) => p.id === selection.portalId,
              ),
            )
          )
            return;
          const targetKey = control
            ? control.dataset.targetKey || ''
            : pickKey(selection);
          down = {
            ...selection,
            control,
            pointerType: event.pointerType,
            navigationOnly: travelling || (reading && !applicationRoom()),
            gesture: beginBoundedDrag({
              pointerId: event.pointerId,
              x: event.clientX,
              y: event.clientY,
              // Re-grabbing during the return spring starts at the visible pose.
              response: [dragMotion[0].value, dragMotion[1].value],
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
            '.world-hotspot, .overview-callout, .world-social-screen, .world-computer-screen',
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
          if (completed.state.dragging) {
            feedback.reset();
            const rect = el.getBoundingClientRect();
            const inside =
              event.clientX >= rect.left &&
              event.clientX <= rect.right &&
              event.clientY >= rect.top &&
              event.clientY <= rect.bottom;
            if (event.pointerType !== 'touch' && inside) {
              pointerGoal.set(
                ...pointerResponse(event.clientX, event.clientY, rect),
              );
              feedback.move(event.clientX, event.clientY, event.pointerType);
            } else pointerGoal.set(0, 0);
          }
          if (event.pointerType === 'touch') pointerGoal.set(0, 0);
          kick();
          if (completed.activate && !action.control && action.section) {
            if (
              action.closeContact &&
              applicationRoom() &&
              reading &&
              !travelling
            )
              (active === 'projects'
                ? latest.current.onCloseProjects
                : latest.current.onCloseContact)?.();
            else if (action.roomTarget) navigateRoom(action.section);
            else if (action.portalId) navigateDoor(action.portalId);
          }
        };
        const pickKey = sceneNavigationKey;
        function cancelInput() {
          const pointerId = down?.gesture.pointerId;
          if (down?.gesture.dragging)
            suppressClickUntil = performance.now() + 450;
          down = null;
          // Change only the goal: retaining spring position and velocity makes
          // release/cancellation blend smoothly back into ordinary hover.
          dragGoal.set(0, 0);
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
          // Normal pointer-up deliberately releases capture after ending the
          // gesture. Its follow-up event must not erase restored hover input.
          if (event.type === 'lostpointercapture' && !down) return;
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
        const unbindContactKeyboard = bindContactKeyboard({
          document,
          window,
          keyboard: computer.keyboard,
          active: () =>
            active === 'contact' &&
            reading &&
            !travelling &&
            latest.current.enabled,
          contains: (target) =>
            target instanceof Node && surfaceElement.contains(target),
          wake: kick,
        });
        // A phone keyboard may resize only visualViewport. Reduce the app's
        // scroll area, retaining the physical camera and outer screen plane.
        let contactViewportFrame = 0;
        const resizeContactViewport = () => {
          cancelAnimationFrame(contactViewportFrame);
          contactViewportFrame = requestAnimationFrame(() => {
            if (active !== 'contact' || !reading || !window.visualViewport) {
              surfaceElement.style.removeProperty('--contact-visible-height');
              return;
            }
            const viewport = window.visualViewport;
            const bounds = surfaceElement.getBoundingClientRect();
            const scale = bounds.width / computerLayout().pixelsWidth;
            const obscured = viewport.height < el.clientHeight - 120;
            if (obscured && scale > 0) {
              surfaceElement.style.setProperty(
                '--contact-visible-height',
                `${Math.max(100, (viewport.offsetTop + viewport.height - bounds.top - 12) / scale)}px`,
              );
              if (
                document.activeElement instanceof HTMLElement &&
                surfaceElement.contains(document.activeElement)
              )
                document.activeElement.scrollIntoView({
                  block: 'nearest',
                  inline: 'nearest',
                  behavior: 'instant',
                });
            } else
              surfaceElement.style.removeProperty('--contact-visible-height');
          });
        };
        window.visualViewport?.addEventListener(
          'resize',
          resizeContactViewport,
        );
        window.visualViewport?.addEventListener(
          'scroll',
          resizeContactViewport,
        );
        surfaceElement.addEventListener('focusin', resizeContactViewport);
        document.addEventListener('focusin', feedbackChanged);
        document.addEventListener('focusout', feedbackChanged);
        document.documentElement.addEventListener(
          'pointerleave',
          cancelPointer,
        );
        const syncVisibility = () => {
          const nextVisible = inViewport && !document.hidden;
          if (nextVisible !== visible)
            resetDiagnostics('scene visibility changed');
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
          diagnostics?.dispose();
          unavailable();
        };
        renderer.domElement.addEventListener('webglcontextlost', lost);
        const shadowDiagnostic = () => {
          renderer.shadowMap.enabled = !renderer.shadowMap.enabled;
          invalidateShadow('shadow-toggle');
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
          go: () => {
            // Browser history and reader changes supersede a queued hop.
            // Internal resize() calls go directly and preserves the queue.
            doorQueue.clear();
            el.dataset.queuedRoom = '';
            go();
          },
          diagnostics: setDiagnosticsEnabled,
          pause(value) {
            stop = value;
            lastFrame = 0;
            if (value && travelling) flightImmediate = true;
            kick();
          },
        };
        latest.current.onNavigationReady((section) => {
          if (
            !travelling ||
            reading ||
            !latest.current.enabled ||
            (section !== 'home' && !anchors[section])
          )
            return false;
          doorQueue.requestDestination(section, active, true);
          el.dataset.queuedRoom = doorQueue.destination;
          return true;
        });
        latest.current.onEarthPlaybackReady?.({
          getEarthPlayback: () => background.getEarthPlayback(),
          setEarthPlayback(command) {
            if (destroyed) return;
            background.setEarthPlayback(command);
            kick();
          },
        });
        let unmountPerformancePanel = () => {};
        function setDiagnosticsEnabled(enabled: boolean) {
          if (audit && !enabled && !destroyed) return;
          if (enabled === !!diagnostics) return;
          if (!enabled) {
            unmountPerformancePanel();
            unmountPerformancePanel = () => {};
            restoreShadowDiagnostics();
            diagnostics?.dispose();
            diagnostics = null;
            spacecraftPerformance?.dispose();
            spacecraftPerformance = null;
            spacecraftFilter = { mode: 'all', id: '' };
            const resized = experiment === 'half-resolution';
            experiment = 'normal';
            if (resized) setDrawingSize();
            invalidateAo('diagnostics-disabled');
            invalidateShadow('diagnostics-disabled');
            lastFrame = 0;
            kick();
            return;
          }
          diagnostics = createScenePerformance('beginQuery' in gl ? gl : null, {
            maxFrames: 1800,
          });
          spacecraftPerformance = createSpacecraftPerformance(model.group);
          restoreShadowDiagnostics = instrumentShadowUpdates(
            renderer,
            () => diagnostics,
            () => {
              const reasons = [...shadowReasons];
              shadowReasons.clear();
              return reasons;
            },
          );
          if (audit) return;
          const sceneInventory = collectSceneInventory();
          unmountPerformancePanel = mountPerformancePanel({
            collector: {
              snapshot: (includeFrames) => diagnostics!.snapshot(includeFrames),
              reset: (reason) => resetDiagnostics(reason || 'reset'),
              setWindowSize: (frames) => {
                diagnostics!.setWindowSize(frames);
                spacecraftPerformance!.setWindowSize(frames);
              },
            },
            getSpacecraftReport: () => spacecraftPerformance!.snapshot(),
            getSpacecraftGroups: () => spacecraftPerformance!.getGroups(),
            setSpacecraftFilter: (value) => {
              spacecraftPerformance!.setFilter(value);
              spacecraftFilter = value;
              resetDiagnostics('spacecraft filter changed');
              invalidateAo('spacecraft-filter');
              invalidateShadow('spacecraft-filter');
              lastFrame = 0;
              kick();
            },
            onClose: () => latest.current.onDiagnosticsClose?.(),
            getSettings: () => ({
              experiment,
              spacecraftFilter,
              build: process.env.NODE_ENV,
              threeRevision: THREE.REVISION,
              userAgent: navigator.userAgent,
              hardwareConcurrency: navigator.hardwareConcurrency,
              viewport: [el.clientWidth, el.clientHeight],
              drawingBuffer: [
                renderer.domElement.width,
                renderer.domElement.height,
              ],
              pixelRatio: renderer.getPixelRatio(),
              nativePixelRatio: devicePixelRatio,
              room: active,
              visible,
              reducedMotion: stop,
              travelling,
              cameraPosition: camera.position.toArray(),
              cameraQuaternion: camera.quaternion.toArray(),
              cameraMode: 'stationary-vessel',
              vesselMatrix: model.group.matrixWorld.toArray(),
              orbitalCamera: background.getDiagnostics(),
              cameraTrace: auditMotion ? cameraTrace : undefined,
              aoEnabled:
                contactShading &&
                !mobile() &&
                experiment !== 'no-ao' &&
                experiment !== 'no-spacecraft',
              aoBuffer: [ao.width, ao.height],
              aoSamples: 32,
              denoiseSamples: 32,
              shadowsEnabled: renderer.shadowMap.enabled,
              shadowMap: key.shadow.mapSize.toArray(),
              resources: {
                ...renderer.info.memory,
                programs: renderer.info.programs?.length ?? null,
              },
              inventory: sceneInventory,
              notes: [
                'CPU timings measure this render callback, not browser layout, compositing, total CPU utilization, temperature or power.',
                'Half resolution changes each main drawing-buffer dimension; AO keeps its CSS-based resolution. No spacecraft skips its draw and AO but retains scene updates and HTML.',
                'Render once stops automatic drawing; navigation and pointer input can still request frames. These controls are temporary and reset on reload.',
              ],
            }),
            setExperiment: (value: Experiment) => {
              const resizeBuffer =
                experiment === 'half-resolution' || value === 'half-resolution';
              experiment = value;
              if (resizeBuffer) setDrawingSize();
              invalidateAo('experiment');
              resetDiagnostics('experiment changed');
              lastFrame = 0;
              kick();
            },
          });
          lastFrame = 0;
          kick();
        }
        setDiagnosticsEnabled(!!audit || !!latest.current.diagnosticsEnabled);
        go(latest.current.section === 'home');
        const disposeShadowAudit = audit?.shadowReady?.({
          three: THREE,
          renderer,
          scene,
          camera,
          light: key,
        });
        const disposeShadingAudit = (
          audit?.shadingReady ?? audit?.contactReady
        )?.({
          three: THREE,
          renderer,
          scene,
          camera,
          model,
          ao,
          invalidate: () => invalidateAo('shading-lab-variant'),
          enabled: () =>
            !mobile() &&
            contactShading &&
            experiment !== 'no-ao' &&
            experiment !== 'no-spacecraft',
        });
        let auditBackup: Three.WebGLRenderTarget | undefined;
        if (audit) {
          let manualPrevious = 0;
          const state = () => ({
            room: active,
            travelling,
            reading,
            elapsed,
            reducedMotion: stop,
            backgroundReady: background.getDiagnostics().earthReady,
            motionActive: !!model.group.userData.motionActive,
            geometryRevision: model.group.userData.geometryRevision,
            waitingForDoors: el.dataset.waitingForDoors === 'true',
            queuedRoom: doorQueue.destination,
            cameraPosition: camera.position.toArray(),
            cameraQuaternion: camera.quaternion.toArray(),
            cameraMatrix: camera.matrixWorld.toArray(),
            projectionMatrix: camera.projectionMatrix.toArray(),
            lightRigQuaternion: lightRig.quaternion.toArray(),
            keyPosition: key.getWorldPosition(new THREE.Vector3()).toArray(),
            shadowMatrix: key.shadow.matrix.toArray(),
            shadowCameraUp: key.shadow.camera.up.toArray(),
            vesselMatrix: model.group.matrixWorld.toArray(),
            doors: model.group.userData.portals.map((p: any) => ({
              id: p.id,
              physicalHatch: p.physicalHatch,
              openProgress: p.openProgress,
              sealed: p.sealed,
            })),
            readers: Object.entries(model.readerSurfaces).map(
              ([id, anchor]: [string, any]) => ({
                id,
                matrix: anchor.matrixWorld.toArray(),
              }),
            ),
            pointer: pointerCurrent.toArray(),
            drag: dragMotion.map((axis) => axis.value),
            feedback: {
              room: hovered,
              object: highlightedObject,
              portal: el.dataset.hoverPortal,
            },
          });
          audit.ready({
            step(delta = 1 / 60) {
              const now = performance.now();
              draw(
                now,
                delta,
                manualPrevious ? (now - manualPrevious) / 1000 : 0,
              );
              manualPrevious = now;
            },
            navigate: (room) => latest.current.onNavigate(room),
            setPolicy(value) {
              aoPolicy = value;
              invalidateAo('audit-policy');
              resetDiagnostics('audit-policy');
            },
            setGpuScope(scope) {
              diagnostics?.setGpuScope(scope);
            },
            reset() {
              resetDiagnostics('audit-window');
              manualPrevious = 0;
            },
            state,
            freezeBackground(seconds) {
              frozenBackgroundTime = seconds;
            },
            snapshot: () => ({
              scene: diagnostics?.snapshot(true),
              spacecraft: spacecraftPerformance?.snapshot(),
              settings: {
                ...state(),
                experiment,
                filter: { ...spacecraftFilter },
                visible,
                contactShading,
                policy: aoPolicy,
                build: process.env.NODE_ENV,
                threeRevision: THREE.REVISION,
                userAgent: navigator.userAgent,
                hardwareConcurrency: navigator.hardwareConcurrency,
                renderer: gl.getParameter(gl.RENDERER),
                vendor: gl.getParameter(gl.VENDOR),
                unmaskedRenderer: (() => {
                  const ext = gl.getExtension('WEBGL_debug_renderer_info');
                  return ext
                    ? gl.getParameter(ext.UNMASKED_RENDERER_WEBGL)
                    : null;
                })(),
                viewport: [el.clientWidth, el.clientHeight],
                drawingBuffer: [
                  renderer.domElement.width,
                  renderer.domElement.height,
                ],
                pixelRatio: renderer.getPixelRatio(),
                nativePixelRatio: devicePixelRatio,
                aoEnabled: !mobile() && contactShading,
                aoBuffer: [ao.width, ao.height],
                aoSamples: 32,
                denoiseSamples: 32,
                shadowMap: key.shadow.mapSize.toArray(),
                shadowsEnabled: renderer.shadowMap.enabled,
                orbitalCamera: background.getDiagnostics(),
                resources: {
                  ...renderer.info.memory,
                  programs: renderer.info.programs?.length,
                },
              },
            }),
            compareGeometry(change, includeImages = false) {
              // Only the explicit lab calls this. Reuse the same camera, lights,
              // materials and GTAO noise, and regenerate shading on both sides.
              const width = renderer.domElement.width,
                height = renderer.domElement.height;
              const render = () => {
                if (!mobile() && contactShading) refreshOcclusion(0, false);
                renderer.shadowMap.needsUpdate = true;
                renderer.setRenderTarget(null);
                renderer.clear();
                renderer.render(background.scene, background.camera);
                renderer.clearDepth();
                renderer.render(scene, camera);
                if (!mobile() && contactShading) aoQuad.render(renderer);
                const pixels = new Uint8Array(width * height * 4);
                gl.readPixels(
                  0,
                  0,
                  width,
                  height,
                  gl.RGBA,
                  gl.UNSIGNED_BYTE,
                  pixels,
                );
                return {
                  pixels,
                  image: includeImages
                    ? renderer.domElement.toDataURL('image/png')
                    : undefined,
                };
              };
              const before = render();
              const restore = change();
              let after: ReturnType<typeof render>;
              try {
                after = render();
              } finally {
                restore();
                render();
                invalidateAo('audit-geometry-restore');
              }
              let changedPixels = 0,
                maxChannelDifference = 0;
              for (let i = 0; i < before.pixels.length; i += 4) {
                let changed = false;
                for (let c = 0; c < 4; c++) {
                  const difference = Math.abs(
                    before.pixels[i + c] - after.pixels[i + c],
                  );
                  changed ||= difference !== 0;
                  maxChannelDifference = Math.max(
                    maxChannelDifference,
                    difference,
                  );
                }
                if (changed) changedPixels++;
              }
              return {
                changedPixels,
                maxChannelDifference,
                before: before.image,
                after: after.image,
              };
            },
            verifyFrame(includeImages = false) {
              const width = renderer.domElement.width,
                height = renderer.domElement.height;
              const cached = new Uint8Array(width * height * 4),
                fresh = new Uint8Array(cached.length);
              renderer.setRenderTarget(null);
              gl.readPixels(
                0,
                0,
                width,
                height,
                gl.RGBA,
                gl.UNSIGNED_BYTE,
                cached,
              );
              const before = includeImages
                ? renderer.domElement.toDataURL('image/png')
                : undefined;
              const usesAo = !mobile() && contactShading;
              if (usesAo) {
                auditBackup ??= ao.pdRenderTarget.clone();
                // The developer comparison may resize without remounting.
                // Keep its saved AO target matched before texture copies.
                if (
                  auditBackup.width !== ao.width ||
                  auditBackup.height !== ao.height
                )
                  auditBackup.setSize(ao.width, ao.height);
                renderer.initRenderTarget(auditBackup);
                renderer.copyTextureToTexture(
                  ao.pdRenderTarget.texture,
                  auditBackup.texture,
                );
                refreshOcclusion(0, false);
              }
              renderer.setRenderTarget(null);
              renderer.clear();
              renderer.render(background.scene, background.camera);
              renderer.clearDepth();
              renderer.render(scene, camera);
              if (usesAo) aoQuad.render(renderer);
              gl.readPixels(
                0,
                0,
                width,
                height,
                gl.RGBA,
                gl.UNSIGNED_BYTE,
                fresh,
              );
              const after = includeImages
                ? renderer.domElement.toDataURL('image/png')
                : undefined;
              if (usesAo)
                renderer.copyTextureToTexture(
                  auditBackup!.texture,
                  ao.pdRenderTarget.texture,
                );
              let changedPixels = 0,
                maxChannelDifference = 0;
              for (let i = 0; i < cached.length; i += 4) {
                let changed = false;
                for (let c = 0; c < 4; c++) {
                  const d = Math.abs(cached[i + c] - fresh[i + c]);
                  changed ||= d !== 0;
                  maxChannelDifference = Math.max(maxChannelDifference, d);
                }
                if (changed) changedPixels++;
              }
              return { changedPixels, maxChannelDifference, before, after };
            },
          });
        }
        cleanup = () => {
          unmountPerformancePanel();
          restoreShadowDiagnostics();
          diagnostics?.dispose();
          spacecraftPerformance?.dispose();
          latest.current.onNavigationReady(null);
          latest.current.onEarthPlaybackReady?.(null);
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
          unbindContactKeyboard();
          cancelAnimationFrame(contactViewportFrame);
          window.visualViewport?.removeEventListener(
            'resize',
            resizeContactViewport,
          );
          window.visualViewport?.removeEventListener(
            'scroll',
            resizeContactViewport,
          );
          surfaceElement.removeEventListener('focusin', resizeContactViewport);
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
          disposeShadingAudit?.();
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
          disposeShadowAudit?.();
          auditBackup?.dispose();
          key.shadow.dispose();
          renderer.dispose();
          renderer.domElement.remove();
          cssRenderer.domElement.remove();
          surfaceLayer.remove();
          contactReturnHint.remove();
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
}
