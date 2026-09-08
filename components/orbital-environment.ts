import type * as Three from 'three';

/** NASA texture maps + lightweight, deterministic atmosphere and star geometry. */
export function createOrbitalEnvironment(THREE: typeof Three, invalidate: () => void) {
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(42, 1, 0.1, 1200);
  const sky = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), new THREE.ShaderMaterial({
    depthWrite: false, depthTest: false,
    vertexShader: 'varying vec2 vUv; void main(){vUv=uv;gl_Position=vec4(position.xy,0.999,1.0);}',
    fragmentShader: `varying vec2 vUv;
      float h(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
      float n(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(h(i),h(i+vec2(1,0)),f.x),mix(h(i+vec2(0,1)),h(i+1.),f.x),f.y);}
      void main(){vec2 p=vUv*vec2(7.,5.);float cloud=n(p)*.5+n(p*2.1)*.25+n(p*4.4)*.12;
        float band=exp(-pow((vUv.y-vUv.x*.42-.32)*3.1,2.));
        vec3 base=mix(vec3(.003,.008,.023),vec3(.018,.037,.074),vUv.y);
        base+=vec3(.022,.047,.089)*cloud*band;
        float vignette=1.-.35*length(vUv-.5);gl_FragColor=vec4(base*vignette,1.);}`,
  }));
  sky.frustumCulled = false;
  sky.renderOrder = -100;
  scene.add(sky);
  let seed = 41871;
  const random = () => { seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0; return seed / 4294967296; };
  const count = 3100, positions = new Float32Array(count * 3), colors = new Float32Array(count * 3), sizes = new Float32Array(count);
  for (let i = 0; i < count; i++) {
    positions.set([(random() - .5) * 590, (random() - .5) * 370, -280 - random() * 200], i * 3);
    const bright = Math.pow(random(), 3) * .8 + .2;
    colors.set([bright * (.78 + random() * .22), bright * (.85 + random() * .15), bright], i * 3);
    sizes[i] = random() > .988 ? 5.5 : 1 + random() * 1.4;
  }
  const starsGeometry = new THREE.BufferGeometry();
  starsGeometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  starsGeometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  starsGeometry.setAttribute('size', new THREE.BufferAttribute(sizes, 1));
  const stars = new THREE.Points(starsGeometry, new THREE.ShaderMaterial({
    vertexColors: true, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
    uniforms: { pixelRatio: { value: 1 } },
    vertexShader: 'attribute float size; varying vec3 vColor; uniform float pixelRatio; void main(){vColor=color;vec4 mv=modelViewMatrix*vec4(position,1.);gl_Position=projectionMatrix*mv;gl_PointSize=size*pixelRatio;}',
    fragmentShader: 'varying vec3 vColor;void main(){float d=length(gl_PointCoord-.5);float a=exp(-d*d*18.)*smoothstep(.5,.2,d);gl_FragColor=vec4(vColor,a);}',
  }));
  scene.add(stars);
  const earth = new THREE.Group();
  earth.position.set(-95, -162, -230);
  earth.rotation.set(-.6, 1.3, .18);
  const loader = new THREE.TextureLoader();
  let disposed = false;
  const finish = (texture: Three.Texture) => { if (disposed) texture.dispose(); else invalidate(); };
  const day = loader.load('/textures/earth-day.webp', finish);
  day.colorSpace = THREE.SRGBColorSpace;
  day.anisotropy = 4;
  const cloudMap = loader.load('/textures/earth-clouds.webp', finish);
  const surface = new THREE.Mesh(new THREE.SphereGeometry(120, 96, 64), new THREE.MeshStandardMaterial({
    map: day, color: 0xd7e6ff, roughness: 1, metalness: 0,
  }));
  earth.add(surface);
  const clouds = new THREE.Mesh(new THREE.SphereGeometry(120.5, 96, 64), new THREE.MeshStandardMaterial({
    color: 0xd4e8ff, alphaMap: cloudMap, transparent: true, opacity: .7, depthWrite: false, roughness: 1,
  }));
  earth.add(clouds);
  const atmosphere = new THREE.Mesh(new THREE.SphereGeometry(122, 96, 64), new THREE.ShaderMaterial({
    transparent: true, blending: THREE.AdditiveBlending, side: THREE.BackSide, depthWrite: false,
    vertexShader: 'varying vec3 vNormal;varying vec3 vView;void main(){vec4 p=modelViewMatrix*vec4(position,1.);vNormal=normalize(normalMatrix*normal);vView=normalize(-p.xyz);gl_Position=projectionMatrix*p;}',
    fragmentShader: 'varying vec3 vNormal;varying vec3 vView;void main(){float rim=pow(1.-abs(dot(normalize(vNormal),normalize(vView))),3.6);gl_FragColor=vec4(.13,.43,1.,rim*.8);}',
  }));
  earth.add(atmosphere);
  const haze = new THREE.Mesh(new THREE.SphereGeometry(120.8, 96, 64), new THREE.ShaderMaterial({
    transparent: true, blending: THREE.AdditiveBlending, depthWrite: false,
    vertexShader: 'varying vec3 vNormal;varying vec3 vView;void main(){vec4 p=modelViewMatrix*vec4(position,1.);vNormal=normalize(normalMatrix*normal);vView=normalize(-p.xyz);gl_Position=projectionMatrix*p;}',
    fragmentShader: 'varying vec3 vNormal;varying vec3 vView;void main(){float rim=pow(1.-max(0.,dot(normalize(vNormal),normalize(vView))),2.);gl_FragColor=vec4(.06,.28,.65,.1+rim*.55);}',
  }));
  earth.add(haze);
  scene.add(earth);
  scene.add(new THREE.AmbientLight(0x527dab, .65));
  const sunlight = new THREE.DirectionalLight(0xf0f7ff, 3.2);
  sunlight.position.set(-120, 100, 120);
  scene.add(sunlight);
  return {
    scene, camera,
    resize(width: number, height: number, pixelRatio: number) {
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
      stars.material.uniforms.pixelRatio.value = pixelRatio;
    },
    update(time: number, moving: boolean, x: number, y: number) {
      // Only subtle translation; Earth remains a stable distant reference during room flights.
      camera.position.set(x * .4, y * .4, 0);
      if (moving) clouds.rotation.y = time * .0006;
    },
    dispose() {
      disposed = true;
      day.dispose(); cloudMap.dispose();
      scene.traverse(object => {
        if (object instanceof THREE.Mesh || object instanceof THREE.Points) {
          object.geometry.dispose();
          (Array.isArray(object.material) ? object.material : [object.material]).forEach(m => m.dispose());
        }
      });
    },
  };
}
