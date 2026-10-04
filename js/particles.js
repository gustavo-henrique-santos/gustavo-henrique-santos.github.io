/*
  Campo de partículas que se transforma conforme o scroll.
  Cada "forma" é um conjunto de posições-alvo para as mesmas partículas:

    0  Galáxia          (hero)
    1  Nuvem caótica    (Extração — dados brutos)
    2  Malha ordenada   (Limpeza & tratamento)
    3  Modelo estrela   (Modelagem — fato + dimensões)
    4  Loop / nó        (Automação)
    5  Barras 3D        (Entrega — dashboards)
    6  Onda             (Contato)

  O shader interpola entre as formas a partir de um único valor `uMorph` (0 → 6).
*/
import * as THREE from 'three';

const TAU = Math.PI * 2;
const rand = (a = 0, b = 1) => a + Math.random() * (b - a);
const gauss = () => (Math.random() + Math.random() + Math.random() - 1.5) / 1.5;

function rotate(arr, rx, ry) {
  const cx = Math.cos(rx), sx = Math.sin(rx), cy = Math.cos(ry), sy = Math.sin(ry);
  for (let i = 0; i < arr.length; i += 3) {
    let x = arr[i], y = arr[i + 1], z = arr[i + 2];
    // X
    let y1 = y * cx - z * sx, z1 = y * sx + z * cx;
    // Y
    let x2 = x * cy + z1 * sy, z2 = -x * sy + z1 * cy;
    arr[i] = x2; arr[i + 1] = y1; arr[i + 2] = z2;
  }
  return arr;
}

function onSphere(r) {
  const u = Math.random() * 2 - 1, t = Math.random() * TAU, s = Math.sqrt(1 - u * u);
  return [Math.cos(t) * s * r, u * r, Math.sin(t) * s * r];
}

/* ---------- Formas ---------- */
function galaxy(n) {
  const a = new Float32Array(n * 3);
  const arms = 4;
  for (let i = 0; i < n; i++) {
    const r = Math.pow(Math.random(), 1.5) * 2.9 + 0.06;
    const ang = ((i % arms) / arms) * TAU + r * 1.35;
    const spread = 0.42 * r * 0.55;
    a[i * 3] = Math.cos(ang) * r + gauss() * spread;
    a[i * 3 + 1] = gauss() * 0.14 * (1.4 - r / 3);
    a[i * 3 + 2] = Math.sin(ang) * r + gauss() * spread;
  }
  return rotate(a, 1.08, 0.2);
}

function chaos(n) {
  const a = new Float32Array(n * 3);
  const centers = Array.from({ length: 9 }, () => [rand(-4, 4), rand(-2.4, 2.4), rand(-2.5, 1.5)]);
  for (let i = 0; i < n; i++) {
    if (Math.random() < 0.55) {
      a[i * 3] = rand(-5.5, 5.5); a[i * 3 + 1] = rand(-3.2, 3.2); a[i * 3 + 2] = rand(-4, 2);
    } else {
      const c = centers[i % centers.length], s = rand(0.15, 0.7);
      a[i * 3] = c[0] + gauss() * s; a[i * 3 + 1] = c[1] + gauss() * s; a[i * 3 + 2] = c[2] + gauss() * s;
    }
  }
  return a;
}

function lattice(n) {
  const a = new Float32Array(n * 3);
  const side = Math.ceil(Math.cbrt(n));
  const size = 2.9, step = size / (side - 1), h = size / 2;
  for (let i = 0; i < n; i++) {
    const x = i % side, y = Math.floor(i / side) % side, z = Math.floor(i / (side * side));
    a[i * 3] = x * step - h; a[i * 3 + 1] = y * step - h; a[i * 3 + 2] = z * step - h;
  }
  return rotate(a, 0.5, 0.75);
}

function starSchema(n) {
  const a = new Float32Array(n * 3);
  const dims = [[-2.05, 1.15, 0.3], [2.05, 1.15, -0.3], [-2.05, -1.15, -0.3], [2.05, -1.15, 0.3], [0, 2.0, -0.6], [0, -2.0, 0.6]];
  for (let i = 0; i < n; i++) {
    const k = Math.random();
    let p;
    if (k < 0.34) {
      // Tabela fato (centro)
      p = onSphere(0.78 + gauss() * 0.02);
    } else if (k < 0.74) {
      // Dimensões
      const d = dims[i % dims.length], s = onSphere(0.36 + gauss() * 0.015);
      p = [d[0] + s[0], d[1] + s[1], d[2] + s[2]];
    } else {
      // Relacionamentos (linhas fato → dimensão)
      const d = dims[i % dims.length], t = rand(0.2, 0.86);
      p = [d[0] * t + gauss() * 0.02, d[1] * t + gauss() * 0.02, d[2] * t + gauss() * 0.02];
    }
    a[i * 3] = p[0]; a[i * 3 + 1] = p[1]; a[i * 3 + 2] = p[2];
  }
  return rotate(a, 0.1, 0.25);
}

function knot(n) {
  const a = new Float32Array(n * 3);
  const P = 2, Q = 3, S = 0.68;
  for (let i = 0; i < n; i++) {
    const t = (i / n) * TAU;
    const r = Math.cos(Q * t) + 2.1;
    const s = onSphere(Math.pow(Math.random(), 0.6) * 0.2);
    a[i * 3] = (r * Math.cos(P * t)) * S + s[0];
    a[i * 3 + 1] = (r * Math.sin(P * t)) * S + s[1];
    a[i * 3 + 2] = (-Math.sin(Q * t)) * S * 1.3 + s[2];
  }
  return rotate(a, 0.35, 0);
}

function bars(n) {
  const a = new Float32Array(n * 3);
  const cols = 7, rows = 4, w = 0.3, gap = 0.52, base = -1.45;
  const list = [];
  let total = 0;
  for (let c = 0; c < cols; c++) {
    for (let r = 0; r < rows; r++) {
      const h = 0.45 + (c / (cols - 1)) * 1.9 + Math.sin(c * 1.7 + r * 2.3) * 0.35 + (rows - r) * 0.12;
      list.push({ x: (c - (cols - 1) / 2) * gap, z: (r - (rows - 1) / 2) * gap, h });
      total += h;
    }
  }
  for (let i = 0; i < n; i++) {
    let pick = Math.random() * total, b = list[0];
    for (const it of list) { pick -= it.h; if (pick <= 0) { b = it; break; } }
    // concentra pontos nas arestas para a barra "desenhar" melhor
    const edge = Math.random() < 0.55;
    let x = rand(-w / 2, w / 2), z = rand(-w / 2, w / 2);
    if (edge) { if (Math.random() < 0.5) x = Math.sign(x) * w / 2; else z = Math.sign(z) * w / 2; }
    const y = Math.random() < 0.12 ? b.h : rand(0, b.h);
    a[i * 3] = b.x + x; a[i * 3 + 1] = base + y; a[i * 3 + 2] = b.z + z;
  }
  return rotate(a, 0.38, -0.62);
}

function wave(n) {
  const a = new Float32Array(n * 3);
  const side = Math.ceil(Math.sqrt(n));
  for (let i = 0; i < n; i++) {
    const u = (i % side) / (side - 1), v = Math.floor(i / side) / (side - 1);
    const x = (u - 0.5) * 10, z = (v - 0.5) * 6;
    a[i * 3] = x;
    a[i * 3 + 1] = Math.sin(x * 0.9) * 0.35 + Math.cos(z * 1.3 + x * 0.4) * 0.3 - 0.9;
    a[i * 3 + 2] = z;
  }
  return rotate(a, 0.42, 0);
}

/* ---------- Shaders ---------- */
const vertex = /* glsl */ `
  attribute vec3 aT1; attribute vec3 aT2; attribute vec3 aT3;
  attribute vec3 aT4; attribute vec3 aT5; attribute vec3 aT6;
  attribute float aRand;

  uniform float uTime, uMorph, uSize, uPixelRatio, uIntro;
  uniform vec3 uMouse;
  uniform vec3 uColorA, uColorB;

  varying vec3 vColor;
  varying float vAlpha;

  float step01(float m, float k) {
    // cada partícula começa a transição num momento ligeiramente diferente
    float t = clamp((m - k) * 1.35 - aRand * 0.35, 0.0, 1.0);
    return t * t * (3.0 - 2.0 * t);
  }

  void main() {
    vec3 p = position;
    p = mix(p, aT1, step01(uMorph, 0.0));
    p = mix(p, aT2, step01(uMorph, 1.0));
    p = mix(p, aT3, step01(uMorph, 2.0));
    p = mix(p, aT4, step01(uMorph, 3.0));
    p = mix(p, aT5, step01(uMorph, 4.0));
    p = mix(p, aT6, step01(uMorph, 5.0));

    // turbulência — mais forte na nuvem "dados brutos"
    float chaos = 1.0 - abs(clamp(uMorph, 0.0, 2.0) - 1.0);
    float amp = 0.035 + chaos * 0.14;
    float t = uTime * 0.6 + aRand * 6.2831;
    p += vec3(sin(t + p.y * 1.7), cos(t * 0.9 + p.x * 1.3), sin(t * 0.7 + p.z * 1.1)) * amp;

    // onda viva no contato
    float w = clamp(uMorph - 5.0, 0.0, 1.0);
    p.y += sin(p.x * 1.2 + uTime * 0.9) * 0.12 * w + cos(p.z * 1.6 + uTime * 0.7) * 0.08 * w;

    // entrada: expande do centro
    float intro = clamp(uIntro * 1.6 - aRand * 0.6, 0.0, 1.0);
    intro = 1.0 - pow(1.0 - intro, 3.0);
    p *= intro;

    vec4 world = modelMatrix * vec4(p, 1.0);

    // repulsão do mouse
    vec2 d = world.xy - uMouse.xy;
    float dist = length(d);
    float force = smoothstep(1.4, 0.0, dist) * uMouse.z;
    world.xy += (dist > 0.0001 ? d / dist : vec2(0.0)) * force * 0.55;
    world.z += force * 0.4;

    vec4 mv = viewMatrix * world;
    gl_Position = projectionMatrix * mv;

    float sparkle = step(0.94, aRand);
    gl_PointSize = uSize * (0.55 + aRand * 0.9 + sparkle * 0.9) * uPixelRatio / -mv.z;

    vColor = mix(uColorA, uColorB, smoothstep(0.15, 0.95, aRand));
    vColor = mix(vColor, vec3(1.0), sparkle * 0.85 + force * 0.5);
    vAlpha = (0.55 + 0.45 * sin(uTime * 1.5 + aRand * 40.0) * sparkle) * intro;
  }
`;

const fragment = /* glsl */ `
  uniform float uOpacity;
  varying vec3 vColor;
  varying float vAlpha;
  void main() {
    float d = length(gl_PointCoord - 0.5);
    float a = smoothstep(0.5, 0.0, d);
    a *= a;
    gl_FragColor = vec4(vColor, a * vAlpha * uOpacity);
  }
`;

/* ---------- Setup ---------- */
export function createParticles(canvas, { count = 12000, mobile = false } = {}) {
  const renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: false, powerPreference: 'high-performance' });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.setSize(window.innerWidth, window.innerHeight, false);
  renderer.setClearColor(0x000000, 0);

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 0.1, 100);
  camera.position.set(0, 0, 6.5);

  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(galaxy(count), 3));
  geo.setAttribute('aT1', new THREE.BufferAttribute(chaos(count), 3));
  geo.setAttribute('aT2', new THREE.BufferAttribute(lattice(count), 3));
  geo.setAttribute('aT3', new THREE.BufferAttribute(starSchema(count), 3));
  geo.setAttribute('aT4', new THREE.BufferAttribute(knot(count), 3));
  geo.setAttribute('aT5', new THREE.BufferAttribute(bars(count), 3));
  geo.setAttribute('aT6', new THREE.BufferAttribute(wave(count), 3));
  const r = new Float32Array(count);
  for (let i = 0; i < count; i++) r[i] = Math.random();
  geo.setAttribute('aRand', new THREE.BufferAttribute(r, 1));

  const uniforms = {
    uTime: { value: 0 },
    uMorph: { value: 0 },
    uIntro: { value: 0 },
    uSize: { value: mobile ? 34 : 30 },
    uPixelRatio: { value: renderer.getPixelRatio() },
    uOpacity: { value: 1 },
    uMouse: { value: new THREE.Vector3(99, 99, 0) },
    uColorA: { value: new THREE.Color('#2f6bff') },
    uColorB: { value: new THREE.Color('#41f0ff') },
  };

  const mat = new THREE.ShaderMaterial({
    vertexShader: vertex, fragmentShader: fragment, uniforms,
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
  });

  const points = new THREE.Points(geo, mat);
  const group = new THREE.Group();
  group.add(points);
  scene.add(group);

  // Estado alvo (definido pelo scroll) e estado atual (suavizado)
  const target = { morph: 0, opacity: 1, x: 0, y: 0, scale: 1 };
  const current = { ...target };
  const mouse = { x: 0, y: 0, nx: 0, ny: 0, active: 0 };

  const halfH = () => Math.tan(THREE.MathUtils.degToRad(camera.fov / 2)) * camera.position.z;

  window.addEventListener('pointermove', (e) => {
    mouse.nx = (e.clientX / window.innerWidth) * 2 - 1;
    mouse.ny = -(e.clientY / window.innerHeight) * 2 + 1;
    const h = halfH();
    mouse.x = mouse.nx * h * camera.aspect;
    mouse.y = mouse.ny * h;
    mouse.active = e.pointerType === 'mouse' ? 1 : 0;
  });
  document.addEventListener('pointerleave', () => { mouse.active = 0; });

  function resize() {
    const w = window.innerWidth, h = window.innerHeight;
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    renderer.setSize(w, h, false);
    uniforms.uPixelRatio.value = renderer.getPixelRatio();
  }
  window.addEventListener('resize', resize);

  const clock = new THREE.Clock();
  let rotY = 0;
  let running = true;

  function tick() {
    if (!running) return;
    const dt = Math.min(clock.getDelta(), 0.05);
    uniforms.uTime.value += dt;

    const k = 1 - Math.pow(0.0025, dt); // suavização independente de FPS
    for (const key in target) current[key] += (target[key] - current[key]) * k;

    uniforms.uMorph.value = current.morph;
    uniforms.uOpacity.value = current.opacity;

    const m = uniforms.uMouse.value;
    m.x += (mouse.x - m.x) * k * 1.4;
    m.y += (mouse.y - m.y) * k * 1.4;
    m.z += (mouse.active - m.z) * k;

    rotY += dt * 0.06;
    group.position.set(current.x, current.y, 0);
    group.scale.setScalar(current.scale);
    group.rotation.y = rotY + mouse.nx * 0.25;
    group.rotation.x = -mouse.ny * 0.15;

    renderer.render(scene, camera);
    requestAnimationFrame(tick);
  }
  requestAnimationFrame(tick);

  document.addEventListener('visibilitychange', () => {
    if (document.hidden) running = false;
    else if (!running) { running = true; clock.getDelta(); requestAnimationFrame(tick); }
  });

  return { target, uniforms };
}
