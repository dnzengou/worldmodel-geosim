// Immersive Three.js earth for GeoSim.
// Lazy-loaded on first /globe navigation. Exposes initGlobe(elId, worldState) -> dispose fn.

import * as THREE from './vendor/three/three.module.js';
import { OrbitControls } from './vendor/three/jsm/controls/OrbitControls.js';

const DEG = Math.PI / 180;
const TEX = '/textures/';

// Risk color scale — matches app.js riskColor() semantics.
function riskColorHex(r) {
  return r < 0.35 ? 0x00ff88 :
         r < 0.6  ? 0xffa500 :
         r < 0.8  ? 0xff6b35 : 0xff3855;
}

// Equirectangular texture on default Three.js SphereGeometry: lon=0 (Greenwich) sits at +X world axis.
// Standard sphere: point = (r·sin(phi)·cos(theta), r·cos(phi), r·sin(phi)·sin(theta)) with phi=(90−lat), theta=−lon.
function latLonToVec3(lat, lon, r = 1) {
  const phi = (90 - lat) * DEG;
  const theta = -lon * DEG;
  return new THREE.Vector3(
    r * Math.sin(phi) * Math.cos(theta),
    r * Math.cos(phi),
    r * Math.sin(phi) * Math.sin(theta),
  );
}

// Great-circle interpolation between two lon/lat pairs, with a bell-curve arc height.
function greatCircleArc(fromLL, toLL, radius = 1.005, segments = 48, lift = 0.09) {
  const a = latLonToVec3(fromLL[1], fromLL[0], 1).normalize();
  const b = latLonToVec3(toLL[1], toLL[0], 1).normalize();
  const omega = Math.acos(Math.min(1, Math.max(-1, a.dot(b))));
  const sinOmega = Math.sin(omega) || 1;
  const points = [];
  for (let i = 0; i <= segments; i++) {
    const t = i / segments;
    const w1 = Math.sin((1 - t) * omega) / sinOmega;
    const w2 = Math.sin(t * omega) / sinOmega;
    const p = new THREE.Vector3(
      a.x * w1 + b.x * w2,
      a.y * w1 + b.y * w2,
      a.z * w1 + b.z * w2,
    );
    const h = radius * (1 + lift * Math.sin(Math.PI * t));
    p.multiplyScalar(h);
    points.push(p);
  }
  return points;
}

export function initGlobe(elId, worldState) {
  const container = document.getElementById(elId);
  if (!container) return () => {};
  container.textContent = '';
  container.style.position = 'relative';

  const width = container.clientWidth || 600;
  const height = container.clientHeight || 520;

  const renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
  renderer.setSize(width, height);
  renderer.setClearColor(0x0a0e1a, 1);
  renderer.domElement.style.display = 'block';
  container.appendChild(renderer.domElement);

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 200);
  camera.position.set(0, 0.7, 3.2);

  const controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;
  controls.dampingFactor = 0.06;
  controls.minDistance = 1.4;
  controls.maxDistance = 8;
  controls.autoRotate = true;
  controls.autoRotateSpeed = 0.28;
  controls.enablePan = false;

  // Sun placed on the +Z side so the camera-facing hemisphere reads as day.
  const sun = new THREE.DirectionalLight(0xfff4e0, 1.85);
  sun.position.set(3, 1.5, 5);
  scene.add(sun);
  scene.add(new THREE.AmbientLight(0x445566, 0.75));
  scene.add(new THREE.HemisphereLight(0x8fb4dd, 0x1a2233, 0.28));

  const earthGroup = new THREE.Group();
  // Rotate so the Eastern hemisphere (Middle East + SE Asia — where GeoSim's chokepoints live) faces the camera by default.
  earthGroup.rotation.y = Math.PI;
  scene.add(earthGroup);
  const tex = new THREE.TextureLoader();
  const sRGB = (t) => { t.colorSpace = THREE.SRGBColorSpace; return t; };
  // Force a render on each texture load — bulletproofs against RAF-throttled tabs (background/hidden windows).
  const onTexLoaded = () => renderer.render(scene, camera);

  const earthMat = new THREE.MeshPhongMaterial({
    map:         sRGB(tex.load(TEX + 'earth_atmos_2048.jpg', onTexLoaded)),
    specularMap: tex.load(TEX + 'earth_specular_2048.jpg', onTexLoaded),
    specular:    new THREE.Color(0x4a6a8a),
    shininess:   14,
  });
  earthGroup.add(new THREE.Mesh(new THREE.SphereGeometry(1, 72, 72), earthMat));

  const clouds = new THREE.Mesh(
    new THREE.SphereGeometry(1.004, 48, 48),
    new THREE.MeshLambertMaterial({
      map:         sRGB(tex.load(TEX + 'earth_clouds_1024.png', onTexLoaded)),
      transparent: true, opacity: 0.42, depthWrite: false,
    })
  );
  earthGroup.add(clouds);

  // Rim glow — inverse-normal Fresnel on outer BackSide sphere.
  const atmo = new THREE.Mesh(
    new THREE.SphereGeometry(1.06, 64, 64),
    new THREE.ShaderMaterial({
      vertexShader: 'varying vec3 vN; void main(){ vN = normalize(normalMatrix * normal); gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.); }',
      fragmentShader: 'varying vec3 vN; void main(){ float i = pow(0.72 - dot(vN, vec3(0., 0., 1.)), 3.5); gl_FragColor = vec4(0.35, 0.65, 1.0, 1.0) * i; }',
      blending: THREE.AdditiveBlending, side: THREE.BackSide,
      transparent: true, depthWrite: false,
    })
  );
  scene.add(atmo);

  // Starfield backdrop (2500 procedural points).
  {
    const n = 2500;
    const pos = new Float32Array(n * 3);
    for (let i = 0; i < n; i++) {
      const r = 60 + Math.random() * 100;
      const t = Math.random() * Math.PI * 2;
      const ph = Math.acos(2 * Math.random() - 1);
      pos[i * 3]     = r * Math.sin(ph) * Math.cos(t);
      pos[i * 3 + 1] = r * Math.cos(ph);
      pos[i * 3 + 2] = r * Math.sin(ph) * Math.sin(t);
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    scene.add(new THREE.Points(g, new THREE.PointsMaterial({
      color: 0xaFC4e8, size: 0.5, sizeAttenuation: false,
      transparent: true, opacity: 0.7, fog: false,
    })));
  }

  // Chokepoint markers — dot + pulsing halo, colored by risk.
  const chokepoints = worldState.chokepoints || {};
  const markerGroup = new THREE.Group();
  earthGroup.add(markerGroup);
  for (const [name, cp] of Object.entries(chokepoints)) {
    const color = riskColorHex(cp.risk);
    const dot = new THREE.Mesh(
      new THREE.SphereGeometry(0.018, 16, 16),
      new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.95 })
    );
    dot.position.copy(latLonToVec3(cp.lat, cp.lon, 1.012));
    dot.userData = { name, risk: cp.risk };
    markerGroup.add(dot);
    const halo = new THREE.Mesh(
      new THREE.RingGeometry(0.024, 0.042, 24),
      new THREE.MeshBasicMaterial({
        color, transparent: true, opacity: 0.35, side: THREE.DoubleSide, depthWrite: false,
      })
    );
    halo.position.copy(dot.position);
    halo.lookAt(0, 0, 0);
    halo.userData.isHalo = true;
    markerGroup.add(halo);
  }

  // Energy routes as great-circle arcs.
  const routes = worldState.energy_routes || [];
  const routeGroup = new THREE.Group();
  earthGroup.add(routeGroup);
  for (const rt of routes) {
    const pts = greatCircleArc(rt.from, rt.to);
    const geo = new THREE.BufferGeometry().setFromPoints(pts);
    routeGroup.add(new THREE.Line(geo, new THREE.LineBasicMaterial({
      color: 0x00d4ff, transparent: true, opacity: 0.55,
      blending: THREE.AdditiveBlending, depthWrite: false,
    })));
  }

  // Direct render — Three.js r160 handles sRGB output natively on the canvas. Bloom postprocessing
  // via EffectComposer needs an OutputPass module we don't vendor; skip it in favor of correct colors.

  // Raycasted hover tooltip over chokepoint markers.
  const raycaster = new THREE.Raycaster();
  const pointer = new THREE.Vector2();
  const tooltip = document.createElement('div');
  tooltip.style.cssText = 'position:absolute;pointer-events:none;background:rgba(10,16,28,0.9);border:1px solid #1e2a3a;color:#e2e8f0;font-family:JetBrains Mono,monospace;font-size:0.7rem;padding:0.3rem 0.5rem;border-radius:4px;display:none;z-index:20';
  container.appendChild(tooltip);

  const onPointerMove = (event) => {
    const rect = renderer.domElement.getBoundingClientRect();
    pointer.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    pointer.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
    raycaster.setFromCamera(pointer, camera);
    const targets = markerGroup.children.filter(o => !o.userData.isHalo);
    const hits = raycaster.intersectObjects(targets, false);
    if (hits.length) {
      const { name, risk } = hits[0].object.userData;
      tooltip.textContent = name + ' — risk ' + risk.toFixed(2);
      tooltip.style.left = (event.clientX - rect.left + 12) + 'px';
      tooltip.style.top = (event.clientY - rect.top + 12) + 'px';
      tooltip.style.display = 'block';
      controls.autoRotate = false;
    } else {
      tooltip.style.display = 'none';
      controls.autoRotate = true;
    }
  };
  renderer.domElement.addEventListener('pointermove', onPointerMove);

  const onResize = () => {
    const w = container.clientWidth || width;
    const h = container.clientHeight || height;
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    renderer.setSize(w, h);
  };
  window.addEventListener('resize', onResize);

  let raf = 0;
  let disposed = false;
  const clock = new THREE.Clock();
  const animate = () => {
    if (disposed) return;
    raf = requestAnimationFrame(animate);
    const dt = clock.getDelta();
    clouds.rotation.y += 0.008 * dt;
    const pulse = 1 + 0.15 * Math.sin(clock.elapsedTime * 2);
    for (const o of markerGroup.children) {
      if (o.userData.isHalo) o.scale.setScalar(pulse);
    }
    controls.update();
    renderer.render(scene, camera);
  };
  animate();

  return function dispose() {
    if (disposed) return;
    disposed = true;
    cancelAnimationFrame(raf);
    window.removeEventListener('resize', onResize);
    renderer.domElement.removeEventListener('pointermove', onPointerMove);
    controls.dispose();
    scene.traverse(obj => {
      if (obj.geometry) obj.geometry.dispose();
      if (obj.material) {
        const mats = Array.isArray(obj.material) ? obj.material : [obj.material];
        for (const m of mats) {
          if (m.map) m.map.dispose();
          if (m.specularMap) m.specularMap.dispose();
          m.dispose();
        }
      }
    });
    renderer.dispose();
    if (renderer.domElement.parentNode) renderer.domElement.parentNode.removeChild(renderer.domElement);
    if (tooltip.parentNode) tooltip.parentNode.removeChild(tooltip);
  };
}
