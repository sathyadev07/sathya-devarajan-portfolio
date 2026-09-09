import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';

/* Scroll-driven hero: procedural HAAS VF4-style vertical machining centre.
   All geometry is built from primitives — no external model files. */

const HERO = document.getElementById('hero-stage');
const CANVAS = document.getElementById('hero-canvas');
const COPY = document.querySelector('.hero-copy');
const FALLBACK = document.getElementById('hero-fallback');

const REDUCED = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const COARSE = window.matchMedia('(max-width: 800px)').matches;

/* Site design tokens, mirrored so the scene sits in the same palette. */
const C = {
  bg: 0xf1efe6,
  paint: 0xdedaca,
  paintDark: 0xb9b4a3,
  metal: 0x4a4740,
  metalDark: 0x2e2c27,
  accent: 0xfa3600,
  floor: 0x1b1a16,
};

function supportsWebGL() {
  try {
    const c = document.createElement('canvas');
    return !!(window.WebGLRenderingContext && (c.getContext('webgl2') || c.getContext('webgl')));
  } catch (e) {
    return false;
  }
}

function showFallback() {
  if (FALLBACK) FALLBACK.hidden = false;
  if (CANVAS) CANVAS.style.display = 'none';
  document.documentElement.classList.add('hero-static');
}

/* ---------------------------------------------------------------- machine */

function boxMesh(w, h, d, mat, x = 0, y = 0, z = 0) {
  const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
  m.position.set(x, y, z);
  m.castShadow = true;
  m.receiveShadow = true;
  return m;
}

function buildMachine(mats) {
  const g = new THREE.Group();
  const refs = {};

  /* plinth */
  g.add(boxMesh(3.3, 0.35, 2.8, mats.metal, 0, 0.175, 0));

  /* enclosure shell — open at the front, doors fill the aperture */
  g.add(boxMesh(3.3, 2.35, 0.08, mats.paint, 0, 1.525, -1.4));   // back
  g.add(boxMesh(0.08, 2.35, 2.8, mats.paint, -1.65, 1.525, 0));  // left
  g.add(boxMesh(0.08, 2.35, 2.8, mats.paint, 1.65, 1.525, 0));   // right
  g.add(boxMesh(3.3, 0.10, 2.8, mats.paint, 0, 2.65, 0));        // roof
  g.add(boxMesh(3.3, 0.45, 0.08, mats.paint, 0, 2.42, 1.4));     // front header
  g.add(boxMesh(3.3, 0.14, 0.08, mats.paint, 0, 0.42, 1.4));     // front sill

  /* accent stripe across the header, echoing the site accent */
  g.add(boxMesh(3.32, 0.05, 0.02, mats.accent, 0, 2.28, 1.45));

  /* rounded corner posts */
  const postGeo = new THREE.CylinderGeometry(0.07, 0.07, 2.35, 20);
  [[-1.62, -1.36], [1.62, -1.36], [-1.62, 1.36], [1.62, 1.36]].forEach(([x, z]) => {
    const p = new THREE.Mesh(postGeo, mats.paintDark);
    p.position.set(x, 1.525, z);
    p.castShadow = true;
    g.add(p);
  });

  /* sliding front doors, each with a large inset window */
  const doors = [];
  [-1, 1].forEach((side) => {
    const door = new THREE.Group();
    const panel = boxMesh(1.1, 1.8, 0.06, mats.paint, 0, 0, 0);
    door.add(panel);
    door.add(boxMesh(0.92, 1.36, 0.015, mats.metalDark, 0, 0.06, 0.035)); // window frame
    const glass = boxMesh(0.86, 1.3, 0.01, mats.glass, 0, 0.06, 0.05);
    glass.castShadow = false;
    door.add(glass);
    /* handle */
    const handle = new THREE.Mesh(new THREE.CylinderGeometry(0.022, 0.022, 0.5, 12), mats.metalDark);
    handle.rotation.z = Math.PI / 2;
    handle.position.set(side * 0.4, -0.25, 0.07);
    door.add(handle);

    door.position.set(side * 0.56, 1.37, 1.42);
    door.userData.closedX = side * 0.56;
    door.userData.openX = side * 1.62;
    g.add(door);
    doors.push(door);
  });
  refs.doors = doors;

  /* column at the rear of the work envelope */
  g.add(boxMesh(0.8, 1.75, 0.45, mats.metal, 0, 1.225, -1.02));

  /* spindle head — rides the column, animated in the hold stage */
  const head = new THREE.Group();
  head.add(boxMesh(0.55, 0.42, 0.6, mats.metal, 0, 0, 0));
  const quill = new THREE.Mesh(new THREE.CylinderGeometry(0.075, 0.075, 0.34, 20), mats.metalDark);
  quill.position.y = -0.34;
  quill.castShadow = true;
  head.add(quill);
  const tool = new THREE.Mesh(new THREE.ConeGeometry(0.05, 0.14, 16), mats.accent);
  tool.position.y = -0.56;
  tool.rotation.x = Math.PI;
  head.add(tool);
  head.position.set(0, 1.82, -0.5);
  g.add(head);
  refs.head = head;
  refs.headBaseY = 1.82;

  /* saddle + table */
  g.add(boxMesh(1.05, 0.18, 0.62, mats.metal, 0, 0.83, -0.15));
  const table = boxMesh(1.3, 0.12, 0.5, mats.metalDark, 0, 0.98, -0.15);
  g.add(table);
  refs.table = table;
  for (let i = -1; i <= 1; i++) {
    g.add(boxMesh(1.28, 0.02, 0.05, mats.metal, 0, 1.045, -0.15 + i * 0.16));
  }

  /* accordion way covers behind the table */
  for (let i = 0; i < 4; i++) {
    g.add(boxMesh(1.2 - i * 0.03, 0.11, 0.035, mats.metalDark, 0, 0.9, -0.45 - i * 0.09));
  }

  /* chip conveyor stub exiting lower left */
  const conv = new THREE.Group();
  conv.add(boxMesh(0.42, 0.26, 1.15, mats.metal, 0, 0, 0));
  conv.add(boxMesh(0.3, 0.05, 1.1, mats.metalDark, 0, 0.15, 0.02));
  conv.position.set(-1.62, 0.42, 1.0);
  conv.rotation.set(-0.22, 0.32, 0);
  g.add(conv);

  /* control pendant on a swing arm, right of the front aperture */
  const arm = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.045, 0.62, 12), mats.metalDark);
  arm.rotation.z = Math.PI / 2;
  arm.position.set(1.92, 1.62, 1.1);
  arm.castShadow = true;
  g.add(arm);

  const pendant = new THREE.Group();
  pendant.add(boxMesh(0.5, 0.7, 0.09, mats.paint, 0, 0, 0));
  pendant.add(boxMesh(0.38, 0.28, 0.02, mats.metalDark, 0, 0.15, 0.055)); // screen
  pendant.add(boxMesh(0.34, 0.2, 0.015, mats.metalDark, 0, -0.18, 0.055)); // keypad
  pendant.add(boxMesh(0.06, 0.06, 0.02, mats.accent, 0.17, -0.28, 0.06)); // cycle-start
  pendant.position.set(2.24, 1.6, 1.14);
  pendant.rotation.y = -0.42;
  g.add(pendant);

  return { group: g, refs };
}

/* ------------------------------------------------------------------ scene */

function init() {
  const renderer = new THREE.WebGLRenderer({
    canvas: CANVAS,
    antialias: !COARSE,
    alpha: false,
    powerPreference: 'high-performance',
  });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.05;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = COARSE ? THREE.PCFShadowMap : THREE.PCFSoftShadowMap;

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(C.bg);
  scene.fog = new THREE.Fog(C.bg, 11, 30);

  const camera = new THREE.PerspectiveCamera(38, 1, 0.1, 120);

  const pmrem = new THREE.PMREMGenerator(renderer);
  scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;

  const mats = {
    paint: new THREE.MeshStandardMaterial({ color: C.paint, roughness: 0.55, metalness: 0.25 }),
    paintDark: new THREE.MeshStandardMaterial({ color: C.paintDark, roughness: 0.6, metalness: 0.3 }),
    metal: new THREE.MeshStandardMaterial({ color: C.metal, roughness: 0.5, metalness: 0.75 }),
    metalDark: new THREE.MeshStandardMaterial({ color: C.metalDark, roughness: 0.45, metalness: 0.85 }),
    accent: new THREE.MeshStandardMaterial({ color: C.accent, roughness: 0.4, metalness: 0.2 }),
    glass: new THREE.MeshPhysicalMaterial({
      color: 0xbfcabd, roughness: 0.12, metalness: 0,
      transparent: true, opacity: 0.18, transmission: 0.55, thickness: 0.02,
    }),
  };

  const { group: machine, refs } = buildMachine(mats);
  scene.add(machine);

  /* floor — dark concrete, no walls; fog carries it to the background colour */
  const floor = new THREE.Mesh(
    new THREE.PlaneGeometry(60, 60),
    new THREE.MeshStandardMaterial({ color: C.floor, roughness: 0.95, metalness: 0.05 })
  );
  floor.rotation.x = -Math.PI / 2;
  floor.receiveShadow = true;
  scene.add(floor);

  /* one key light + soft ambient fill; environment does most of the work */
  const key = new THREE.DirectionalLight(0xfff3e0, 2.1);
  key.position.set(5.5, 8, 6);
  key.castShadow = true;
  const s = COARSE ? 1024 : 2048;
  key.shadow.mapSize.set(s, s);
  key.shadow.camera.near = 1;
  key.shadow.camera.far = 30;
  key.shadow.camera.left = -8;
  key.shadow.camera.right = 8;
  key.shadow.camera.top = 8;
  key.shadow.camera.bottom = -8;
  key.shadow.bias = -0.0012;
  key.shadow.normalBias = 0.02;
  scene.add(key);
  scene.add(new THREE.HemisphereLight(0xffffff, C.floor, 0.45));

  /* ------------------------------------------------------------ camera path
     Stage 1 hero (high, ~35deg down) -> stage 2 orbit (~120deg arc)
     -> stage 3 approach to 3/4 front with doors opening -> stage 4 locked hold. */
  const KEYS = [
    { p: 0.00, ang: 130, rad: 7.6, y: 6.55, look: 1.15 },
    { p: 0.18, ang: 122, rad: 7.4, y: 6.25, look: 1.15 },
    { p: 0.55, ang: 42, rad: 5.3, y: 2.75, look: 1.25 },
    { p: 0.82, ang: 12, rad: 4.25, y: 1.78, look: 1.30 },
    { p: 1.00, ang: 12, rad: 4.25, y: 1.78, look: 1.30 },
  ];

  const target = new THREE.Vector3();

  function sample(p) {
    let a = KEYS[0], b = KEYS[KEYS.length - 1];
    for (let i = 0; i < KEYS.length - 1; i++) {
      if (p >= KEYS[i].p && p <= KEYS[i + 1].p) { a = KEYS[i]; b = KEYS[i + 1]; break; }
    }
    const span = b.p - a.p;
    let t = span <= 0 ? 0 : (p - a.p) / span;
    t = t * t * (3 - 2 * t); // smoothstep
    return {
      ang: a.ang + (b.ang - a.ang) * t,
      rad: a.rad + (b.rad - a.rad) * t,
      y: a.y + (b.y - a.y) * t,
      look: a.look + (b.look - a.look) * t,
    };
  }

  function applyProgress(p) {
    const k = sample(p);
    const r = (k.ang * Math.PI) / 180;
    camera.position.set(Math.cos(r) * k.rad, k.y, Math.sin(r) * k.rad);
    target.set(0, k.look, 0);
    camera.lookAt(target);

    /* doors slide open across the approach stage */
    const d = THREE.MathUtils.clamp((p - 0.55) / 0.27, 0, 1);
    const ease = d * d * (3 - 2 * d);
    refs.doors.forEach((door) => {
      door.position.x = THREE.MathUtils.lerp(door.userData.closedX, door.userData.openX, ease);
    });

    /* hero copy clears the frame as the orbit begins */
    if (COPY) {
      const o = 1 - THREE.MathUtils.clamp((p - 0.10) / 0.12, 0, 1);
      COPY.style.opacity = String(o);
      COPY.style.transform = `translateY(${(1 - o) * -26}px)`;
      COPY.style.pointerEvents = o < 0.2 ? 'none' : '';
    }

    holdAmount = THREE.MathUtils.clamp((p - 0.82) / 0.12, 0, 1);
  }

  let holdAmount = 0;

  /* Size from the sticky viewport-sized box, never from #hero-stage: once
     ScrollTrigger pins, #hero-stage grows to the full pin distance and would
     yield a wildly wrong aspect ratio. */
  const VIEWBOX = document.querySelector('.hero-stage-sticky') || HERO;

  function resize() {
    const w = VIEWBOX.clientWidth;
    const h = VIEWBOX.clientHeight;
    if (!w || !h) return;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
  }

  const clock = new THREE.Clock();
  let visible = true;

  function frame() {
    const t = clock.getElapsedTime();
    /* spindle head loops slowly over the table once the camera locks */
    const amp = COARSE ? 0.10 : 0.16;
    refs.head.position.y = refs.headBaseY - holdAmount * (amp + Math.sin(t * 0.9) * amp);
    if (!COARSE) refs.head.position.x = Math.sin(t * 0.45) * 0.28 * holdAmount;
    if (visible) renderer.render(scene, camera);
  }

  resize();
  applyProgress(0);
  renderer.setAnimationLoop(frame);
  window.addEventListener('resize', resize);
  /* recover if the stage only gains a size later (hidden tab, late layout) */
  if ('ResizeObserver' in window) new ResizeObserver(resize).observe(VIEWBOX);

  /* pause the loop when the hero is off-screen */
  if ('IntersectionObserver' in window) {
    new IntersectionObserver((es) => { visible = es[0].isIntersecting; }, { threshold: 0 }).observe(HERO);
  }

  document.documentElement.classList.add('hero-live');
  return { applyProgress, resize };
}

/* ------------------------------------------------------------- scroll wiring */

function wireScroll(api) {
  const gsap = window.gsap;
  const ScrollTrigger = window.ScrollTrigger;
  if (!gsap || !ScrollTrigger) return;
  gsap.registerPlugin(ScrollTrigger);

  const pinned = document.querySelector('.hero-stage-sticky');
  const state = { p: 0 };

  gsap.to(state, {
    p: 1,
    ease: 'none',
    onUpdate: () => api.applyProgress(state.p),
    scrollTrigger: {
      trigger: HERO,
      start: 'top top',
      end: () => '+=' + Math.round(window.innerHeight * 3.6),
      pin: pinned,
      pinSpacing: true,
      scrub: 1,
      invalidateOnRefresh: true,
      anticipatePin: 1,
    },
  });
}

function boot() {
  if (!HERO || !CANVAS) return;

  if (!supportsWebGL()) { showFallback(); return; }

  if (REDUCED) {
    /* no motion: render the approach composition once, statically */
    try {
      const api = init();
      api.applyProgress(0.85);
      if (COPY) { COPY.style.opacity = '1'; COPY.style.transform = 'none'; }
    } catch (e) {
      console.warn('[hero] static init failed', e);
      showFallback();
    }
    return;
  }

  try {
    const api = init();
    const ready = () => (window.gsap && window.ScrollTrigger) ? wireScroll(api) : setTimeout(ready, 60);
    ready();
  } catch (e) {
    console.warn('[hero] init failed', e);
    showFallback();
  }
}

/* lazy-init so the scene never blocks first paint */
if (document.readyState === 'complete') {
  (window.requestIdleCallback || ((f) => setTimeout(f, 1)))(boot);
} else {
  window.addEventListener('load', () => {
    (window.requestIdleCallback || ((f) => setTimeout(f, 1)))(boot);
  });
}
