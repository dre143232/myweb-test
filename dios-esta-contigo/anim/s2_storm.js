// ESCENAS 2 y 3 — La tormenta y la promesa: mismo lugar, para que la luz irrumpa
// sobre el río sin cortar la continuidad.
import * as THREE from 'three';
import { clamp, lerp, sstep, ease, pulse, wob, rng, fbm2, GLSL_NOISE } from './util.js';

const RIVER_Y = -0.08;
const groundH = (x, z) => 0.22 * (fbm2(x * 0.22 + 3, z * 0.22) - 0.45) - 1.75 * sstep(-0.9, 1.3, x) * (1 - sstep(7.7, 9.9, x));
const OPEN = new THREE.Vector3(0.55, 0.75, -0.42).normalize();
const FLASHES = [10.02, 14.0, 17.6];
const flashAt = (t) => { let f = 0; for (const t0 of FLASHES) f = Math.max(f, pulse(t0 - 0.03, t0 + 0.02, t0 + 0.08, t0 + 0.55, t) * (0.65 + 0.35 * Math.sin(t * 95))); return f; };

export function buildStorm() {
  const scene = new THREE.Scene();
  scene.fog = new THREE.FogExp2(0x0a0f18, 0.05);
  const camera = new THREE.PerspectiveCamera(40, 9 / 16, 0.1, 400);
  const r = rng(7);

  // Terreno
  const gg = new THREE.PlaneGeometry(150, 110, 220, 160); gg.rotateX(-Math.PI / 2);
  const gp = gg.attributes.position, gc = new Float32Array(gp.count * 3);
  for (let i = 0; i < gp.count; i++) {
    const x = gp.getX(i), z = gp.getZ(i), h = groundH(x, z); gp.setY(i, h);
    const n = fbm2(x * 0.5, z * 0.5), mud = sstep(-0.1, -0.7, h);
    gc[i * 3] = lerp(0.085 + 0.05 * n, 0.12, mud); gc[i * 3 + 1] = lerp(0.15 + 0.08 * n, 0.1, mud); gc[i * 3 + 2] = lerp(0.07 + 0.03 * n, 0.07, mud);
  }
  gg.setAttribute('color', new THREE.BufferAttribute(gc, 3)); gg.computeVertexNormals();
  const ground = new THREE.Mesh(gg, new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.62 })); ground.receiveShadow = true; scene.add(ground);

  // Hierba (matas) y rocas
  const tuftG = new THREE.ConeGeometry(0.035, 0.26, 4); tuftG.translate(0, 0.13, 0);
  const tufts = new THREE.InstancedMesh(tuftG, new THREE.MeshStandardMaterial({ color: 0x2f5a33, roughness: 0.9 }), 2600);
  const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler(), v = new THREE.Vector3(), sc = new THREE.Vector3();
  for (let i = 0; i < 2600; i++) {
    let x, z; do { x = -22 + r() * 46; z = -14 + r() * 24; } while (x > -1.0 && x < 9.8);
    e.set(0.1 * (r() - 0.5), 0, 0.3 + 0.25 * r()); q.setFromEuler(e); const s = 0.6 + r() * 1.1;
    m4.compose(v.set(x, groundH(x, z) - 0.02, z), q, sc.set(s, s, s)); tufts.setMatrixAt(i, m4);
  }
  scene.add(tufts);
  const rockM = new THREE.MeshStandardMaterial({ color: 0x39414a, roughness: 0.8, flatShading: true });
  for (let i = 0; i < 26; i++) {
    const side = r() < 0.5, x = side ? -1.6 + r() * 1.4 : 9.2 + r() * 1.6, z = -16 + r() * 28; if (Math.abs(z) < 1.3 && side) continue;
    const m = new THREE.Mesh(new THREE.DodecahedronGeometry(0.25 + r() * 0.5, 0), rockM); m.position.set(x, groundH(x, z) + 0.05, z); m.rotation.set(r() * 3, r() * 3, r() * 3); m.scale.y = 0.6; m.castShadow = true; scene.add(m);
  }
  // Pinos que se doblan con el viento
  const trees = [], trunkM = new THREE.MeshStandardMaterial({ color: 0x241a14, roughness: 0.9 }), leafM = new THREE.MeshStandardMaterial({ color: 0x143325, roughness: 0.85, flatShading: true });
  for (let i = 0; i < 64; i++) {
    let x, z; do { x = -34 + r() * 72; z = -30 + r() * 38; } while ((x > -2.5 && x < 11) || (Math.abs(z) < 2.6 && x < 0) || (z > 3.5 && x > -12 && x < 14));
    const g = new THREE.Group(), s = 0.9 + r() * 1.3;
    const tr = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.2, 1.8, 7), trunkM); tr.position.y = 0.9; g.add(tr);
    for (let k = 0; k < 4; k++) { const c = new THREE.Mesh(new THREE.ConeGeometry(1.15 - k * 0.24, 1.5, 8), leafM); c.position.y = 1.7 + k * 0.85; c.castShadow = true; g.add(c); }
    g.position.set(x, groundH(x, z) - 0.1, z); g.scale.setScalar(s); g.userData.seed = r() * 10; scene.add(g); trees.push(g);
  }

  // Cielo de tormenta con claro dorado
  const skyU = { time: { value: 0 }, flash: { value: 0 }, hope: { value: 0 }, openDir: { value: OPEN } };
  const sky = new THREE.Mesh(new THREE.SphereGeometry(300, 48, 24), new THREE.ShaderMaterial({ uniforms: skyU, side: THREE.BackSide, depthWrite: false, fog: false,
    vertexShader: `varying vec3 vDir; void main(){ vDir = position; gl_Position = projectionMatrix*modelViewMatrix*vec4(position,1.); }`,
    fragmentShader: GLSL_NOISE + /* glsl */`
      uniform float time, flash, hope; uniform vec3 openDir; varying vec3 vDir;
      void main(){
        vec3 d = normalize(vDir); float y = max(d.y, 0.0);
        vec2 cuv = d.xz/(y+0.28)*1.1 + vec2(time*0.035, time*0.014);
        float c = fbm(cuv*1.3), c2 = fbm(cuv*2.9+5.0);
        vec3 col = mix(vec3(0.06,0.085,0.13), vec3(0.012,0.018,0.035), smoothstep(0.0,0.85,y));
        col += vec3(0.10,0.125,0.17)*smoothstep(0.35,0.8,c); col *= 0.55+0.75*c2;
        col += flash*vec3(0.6,0.7,1.0)*(0.3+smoothstep(0.3,0.8,c)*1.4);
        float ang = acos(clamp(dot(d, openDir), -1.0, 1.0));
        float rad = hope*0.36*(0.7+0.6*c);
        float glow = smoothstep(rad, rad*0.3, ang);
        col = mix(col, vec3(1.0,0.76,0.4)*1.9, glow*hope);
        col += vec3(1.0,0.62,0.26)*hope*(0.5*exp(-ang*3.2) + 0.12*smoothstep(0.3,0.8,c)*exp(-ang*1.5));
        col = mix(col, col + vec3(0.03,0.03,0.035), hope);
        gl_FragColor = vec4(col, 1.0);
      }` }));
  sky.frustumCulled = false; scene.add(sky);

  // Río caudaloso
  const waterU = { time: { value: 0 }, heroXZ: { value: new THREE.Vector2() }, calm: { value: 0 }, flash: { value: 0 }, fogColor: { value: new THREE.Color() }, fogDensity: { value: 0.05 },
    lightDir: { value: OPEN }, hope: { value: 0 } };
  const wg = new THREE.PlaneGeometry(12, 100, 130, 420); wg.rotateX(-Math.PI / 2);
  const water = new THREE.Mesh(wg, new THREE.ShaderMaterial({ uniforms: waterU,
    vertexShader: GLSL_NOISE + /* glsl */`
      uniform float time, calm; uniform vec2 heroXZ; varying vec3 vW; varying vec3 vN; varying float vH; varying float vC;
      float amp(vec2 p){ float e = smoothstep(-1.2,0.7,p.x)*(1.0-smoothstep(8.3,10.2,p.x)); float c = smoothstep(0.9,3.0,length(p-heroXZ)); return e*mix(1.0, 0.08+0.92*c, calm); }
      float H(vec2 p){ float t=time; float h=0.0;
        h += 0.17*sin(p.y*0.85 - t*3.3 + 1.4*sin(p.x*0.7+t*0.4));
        h += 0.11*sin(p.y*1.9 - t*4.7 + p.x*1.3);
        h += 0.07*sin(p.y*3.4 - t*6.2 - p.x*2.2 + 1.0);
        h += 0.24*(fbm(vec2(p.x*0.9, p.y*0.55 - t*2.3))-0.5);
        return h*amp(p); }
      void main(){
        vec4 w = modelMatrix*vec4(position,1.0); vec2 p = w.xz;
        float h = H(p); float e = 0.12;
        vN = normalize(vec3(H(p-vec2(e,0.))-H(p+vec2(e,0.)), 2.0*e, H(p-vec2(0.,e))-H(p+vec2(0.,e))));
        w.y += h; vW = w.xyz; vH = h; vC = smoothstep(0.9,3.0,length(p-heroXZ));
        gl_Position = projectionMatrix*viewMatrix*w; }`,
    fragmentShader: GLSL_NOISE + /* glsl */`
      uniform float time, calm, flash, fogDensity, hope; uniform vec3 fogColor, lightDir; varying vec3 vW; varying vec3 vN; varying float vH; varying float vC;
      void main(){
        vec3 n = normalize(vN), V = normalize(cameraPosition - vW);
        vec3 col = mix(vec3(0.02,0.06,0.09), vec3(0.07,0.2,0.25), smoothstep(-0.22,0.3,vH));
        float fn = fbm(vec2(vW.x*2.6, vW.z*1.6 - time*3.2));
        float foam = smoothstep(0.13,0.33, vH + 0.3*(fn-0.5));
        foam += calm*0.8*smoothstep(0.0,0.45,vC)*(1.0-smoothstep(0.45,1.0,vC))*smoothstep(0.35,0.75,fn);   // la ola rompe alrededor de él
        float amb = 0.5 + 0.12*hope + flash*2.2;
        float diff = max(dot(n, normalize(vec3(-0.3,1.0,0.4))), 0.0);
        col = mix(col, vec3(0.72,0.8,0.86), clamp(foam,0.0,1.0)*0.8) * (0.35 + 0.65*diff) * amb;
        float fres = pow(1.0 - max(dot(n,V),0.0), 3.0);
        col += fres * mix(vec3(0.05,0.07,0.1), vec3(0.13,0.13,0.11), hope) * (1.0+flash*4.0);
        float gold = calm*(1.0-vC);
        vec3 R = reflect(-lightDir, n); float spec = pow(max(dot(R,V),0.0), 48.0);
        col = mix(col, vec3(0.9,0.62,0.24)*(0.7+0.4*smoothstep(0.5,0.8,fn)), gold*0.26);
        col += vec3(1.0,0.82,0.5)*spec*hope*(0.3+0.9*gold);
        float d = length(cameraPosition - vW); float f = 1.0 - exp(-fogDensity*fogDensity*d*d);
        gl_FragColor = vec4(mix(col, fogColor, f), 1.0);
      }` }));
  water.position.set(4.5, RIVER_Y, 0); scene.add(water);

  // Lluvia: trazos orientados hacia la cámara
  const NR = 4200, rp = new Float32Array(NR * 12), rIdx = [], rBase = new Float32Array(NR * 4);
  for (let i = 0; i < NR; i++) { rBase[i * 4] = r() * 30; rBase[i * 4 + 1] = r() * 15; rBase[i * 4 + 2] = r() * 26; rBase[i * 4 + 3] = 0.75 + r() * 0.5; rIdx.push(i * 4, i * 4 + 1, i * 4 + 2, i * 4 + 2, i * 4 + 1, i * 4 + 3); }
  const rg = new THREE.BufferGeometry(); rg.setAttribute('position', new THREE.BufferAttribute(rp, 3)); rg.setIndex(rIdx);
  const rainM = new THREE.MeshBasicMaterial({ color: 0xb4c8e0, transparent: true, opacity: 0.4, depthWrite: false, side: THREE.DoubleSide });
  const rain = new THREE.Mesh(rg, rainM); rain.frustumCulled = false; scene.add(rain);
  const VEL = new THREE.Vector3(-6.5, -17, 0.8), DIR = VEL.clone().normalize(), side = new THREE.Vector3(), fwd = new THREE.Vector3();
  const wrap = (x, L) => ((x % L) + L) % L;
  function updateRain(t, amount) {
    camera.getWorldDirection(fwd); side.crossVectors(DIR, fwd).normalize().multiplyScalar(0.0105);
    const cx = camera.position.x + fwd.x * 9, cz = camera.position.z + fwd.z * 9;
    for (let i = 0; i < NR; i++) {
      const k = rBase[i * 4 + 3];
      const x = cx + wrap(rBase[i * 4] + VEL.x * k * t - cx, 30) - 15, y = wrap(rBase[i * 4 + 1] + VEL.y * k * t, 15) - 1.5, z = cz + wrap(rBase[i * 4 + 2] + VEL.z * t - cz, 26) - 13;
      const L = (Math.hypot(x - camera.position.x, z - camera.position.z) < 2.2 ? 0 : 0.5) * k, o = i * 12;
      rp[o] = x - side.x; rp[o + 1] = y - side.y; rp[o + 2] = z - side.z; rp[o + 3] = x + side.x; rp[o + 4] = y + side.y; rp[o + 5] = z + side.z;
      rp[o + 6] = x - DIR.x * L - side.x; rp[o + 7] = y - DIR.y * L - side.y; rp[o + 8] = z - DIR.z * L - side.z; rp[o + 9] = x - DIR.x * L + side.x; rp[o + 10] = y - DIR.y * L + side.y; rp[o + 11] = z - DIR.z * L + side.z;
    }
    rg.attributes.position.needsUpdate = true; rg.setDrawRange(0, Math.floor(NR * amount) * 6); rainM.opacity = 0.2 + 0.22 * amount;
  }

  // Relámpago
  const br = rng(99), bpts = []; let bx = 0;
  for (let i = 0; i <= 16; i++) { const y = 46 - i * 2.9; bx += (br() - 0.5) * 4.2; bpts.push(bx - 0.22, y, 0, bx + 0.22, y, 0); }
  const bgI = []; for (let i = 0; i < 16; i++) bgI.push(i * 2, i * 2 + 1, i * 2 + 2, i * 2 + 2, i * 2 + 1, i * 2 + 3);
  const bg = new THREE.BufferGeometry(); bg.setAttribute('position', new THREE.Float32BufferAttribute(bpts, 3)); bg.setIndex(bgI);
  const bolt = new THREE.Mesh(bg, new THREE.MeshBasicMaterial({ color: new THREE.Color(3.2, 3.5, 4.6), fog: false, side: THREE.DoubleSide, transparent: true })); bolt.frustumCulled = false; scene.add(bolt);

  // Haz de luz dorada desde el cielo
  const beamU = { k: { value: 0 }, time: { value: 0 } };
  const beamG = new THREE.CylinderGeometry(1.5, 2.5, 60, 48, 1, true); beamG.translate(0, 30, 0);
  const beam = new THREE.Mesh(beamG, new THREE.ShaderMaterial({ uniforms: beamU, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide, fog: false,
    vertexShader: `varying vec3 vN; varying vec3 vV; varying vec2 vUv; void main(){ vUv=uv; vec4 mv = modelViewMatrix*vec4(position,1.); vN = normalize(normalMatrix*normal); vV = normalize(-mv.xyz); gl_Position = projectionMatrix*mv; }`,
    fragmentShader: GLSL_NOISE + /* glsl */`uniform float k, time; varying vec3 vN; varying vec3 vV; varying vec2 vUv;
      void main(){ float f = pow(abs(dot(normalize(vN), normalize(vV))), 1.8);
        float streak = 0.72 + 0.28*vnoise(vec2(vUv.x*26.0 + time*0.15, 1.0)) + 0.18*vnoise(vec2(vUv.x*70.0 - time*0.1, 4.0));
        float a = f * streak * smoothstep(0.0,0.035,vUv.y) * (1.0 - 0.55*smoothstep(0.0,1.0,vUv.y)) * k * smoothstep(0.0, 1.0, (1.0-vUv.y) - (1.0-k)*0.9 + 0.08);
        gl_FragColor = vec4(vec3(1.0,0.78,0.42)*a*0.09, a); }` }));
  beam.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), OPEN); beam.frustumCulled = false; scene.add(beam);
  const NM = 260, mp = new Float32Array(NM * 3), mBase = []; for (let i = 0; i < NM; i++) mBase.push([r() * 6.28, Math.sqrt(r()) * 2.0, r() * 9, 0.2 + r() * 0.5]);
  const mg = new THREE.BufferGeometry(); mg.setAttribute('position', new THREE.BufferAttribute(mp, 3));
  const motesM = new THREE.PointsMaterial({ color: new THREE.Color(1.5, 1.15, 0.6), size: 0.04, transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending, fog: false });
  const motes = new THREE.Points(mg, motesM); motes.frustumCulled = false; scene.add(motes);

  // Luces
  const hemi = new THREE.HemisphereLight(0x55688c, 0x16201a, 1.05); scene.add(hemi);
  const storm = new THREE.DirectionalLight(0x90a6d8, 1.3); storm.castShadow = true; storm.shadow.mapSize.set(2048, 2048); storm.shadow.bias = -0.0006; storm.shadow.radius = 4;
  Object.assign(storm.shadow.camera, { left: -7, right: 7, top: 7, bottom: -7, near: 1, far: 40 }); scene.add(storm, storm.target);
  const rim = new THREE.DirectionalLight(0xa9c0ff, 0.8); scene.add(rim, rim.target);
  const gold = new THREE.SpotLight(0xffc670, 0, 40, 0.3, 0.7, 1.2); gold.castShadow = true; gold.shadow.mapSize.set(1024, 1024); gold.shadow.bias = -0.0008; gold.shadow.radius = 5; scene.add(gold, gold.target);
  const warm = new THREE.PointLight(0xffb45c, 0, 9, 1.6); scene.add(warm);
  const face = new THREE.PointLight(0xb8c8f0, 0, 7, 1.4); scene.add(face);

  const X_BANK = -0.95, head = new THREE.Vector3(), tmp = new THREE.Vector3(), fogA = new THREE.Color(0x0a0f18), fogB = new THREE.Color(0x1e2830);
  function update(t, hero) {
    scene.add(hero.root);
    const hope = sstep(19.7, 23.5, t), beamK = sstep(19.9, 21.6, t), flash = flashAt(t), cross = sstep(24.6, 25.6, t);
    // ---- Recorrido del protagonista (eje +x) ----
    let x, amp, phase;
    if (t < 24.6) { const s = 17.3 - t, d = s > 0.8 ? s - 0.4 : s > 0 ? s * s / 1.6 : 0; x = X_BANK - 0.95 * d; amp = clamp(s / 0.8); phase = ((x + 9) / hero.stride) * 6.2832; }
    else { const s = t - 24.6, d = s < 1 ? s * s / 2 : s - 0.5; x = X_BANK + 0.86 * d; amp = 0.72 * clamp(s / 1.0); phase = (d * 0.86 / (hero.stride * 0.73)) * 6.2832; }
    const y = Math.max(groundH(x, 0), -0.8);
    hero.rest(); hero.root.position.set(x, y, 0); hero.root.rotation.set(0, Math.PI / 2, 0);
    const gust = wob(t, 0.9, 5), f = hero.face;
    if (t < 20) {
      const arrive = sstep(17.0, 18.4, t), despair = sstep(18.2, 19.6, t);
      hero.walk(phase, amp, lerp(0.34 + 0.06 * gust, 0.2, arrive) + 0.12 * despair);
      const a = hero.arms[0], sh = 1 - arrive;                       // brazo en alto para cubrirse de la lluvia
      a.sh.rotation.x = lerp(a.sh.rotation.x, -2.15 + 0.08 * gust, sh); a.sh.rotation.z = lerp(a.sh.rotation.z, 0.75, sh); a.el.rotation.x = lerp(a.el.rotation.x, -1.75, sh);
      hero.head.rotation.x += 0.24 * (1 - arrive) + 0.42 * despair; hero.head.rotation.y += 0.45 * pulse(17.6, 18.1, 18.5, 19.2, t) - 0.25 * pulse(18.5, 19.0, 19.2, 19.8, t);
      for (const ar of hero.arms) ar.sh.rotation.z += -ar.s * 0.0 + ar.s * 0.02;
      hero.spine.rotation.z += 0.04 * gust;
      f.smile = -0.75; f.open = 0.25 * (1 - arrive); f.browTilt = 0.85; f.browRaise = -0.2 + 0.4 * despair; f.squint = 0.85 - 0.5 * arrive; f.lid = 0.38 - 0.1 * arrive + 0.2 * despair; f.gazeY = -0.3 - 0.4 * despair; f.gazeX = 0; f.blush = 0.5; f.tear = f.tear2 = -1;
    } else if (t < 24.6) {
      const look = sstep(20.0, 21.4, t), breathe = Math.sin(t * 1.6), resolve = sstep(23.6, 24.6, t);
      hero.walk(0, 0, 0.3 - 0.36 * look + 0.1 * resolve);
      hero.head.rotation.x = 0.4 - 0.72 * look + 0.3 * resolve; hero.head.rotation.y = -0.38 * look * (1 - resolve);
      hero.spine.scale.set(1 + 0.012 * breathe, 1, 1 + 0.03 * breathe);
      for (const ar of hero.arms) { ar.sh.rotation.z = ar.s * (0.1 + 0.12 * look); ar.el.rotation.x = -0.15 - 0.2 * look; }
      f.smile = lerp(-0.7, 0.42, sstep(21.2, 24.2, t)); f.open = 0.5 * pulse(20.4, 21.2, 22.4, 23.6, t); f.browTilt = lerp(0.8, 0.12, look); f.browRaise = 0.9 * look - 0.3 * resolve; f.squint = 0.2 + 0.3 * sstep(22.5, 24, t);
      f.lid = lerp(0.5, 0.0, look); f.gazeY = lerp(-0.6, 0.75, look) - 0.6 * resolve; f.gazeX = -0.3 * look * (1 - resolve); f.blush = 0.5 + 0.4 * look;
    } else {
      hero.walk(phase, amp, 0.14 + 0.03 * gust);
      for (const ar of hero.arms) { ar.sh.rotation.x *= 0.55; ar.sh.rotation.z = ar.s * (0.5 + 0.08 * Math.sin(phase * 2 + ar.s)) * cross + ar.s * 0.1; ar.el.rotation.x = -0.55; }
      hero.head.rotation.x += -0.16 - 0.1 * sstep(31, 34, t); hero.hips.position.y += 0.02 * Math.sin(t * 2.3);
      f.smile = 0.5 + 0.2 * sstep(30, 34, t); f.open = 0; f.browTilt = 0.05; f.browRaise = 0.35; f.squint = 0.45; f.lid = 0.04; f.gazeY = 0.35; f.gazeX = 0; f.blush = 0.8;
    }
    hero.applyFace(t);
    hero.headWorld(head);

    // ---- Cámara ----
    const shk = t < 20 ? 1 : 1 - 0.7 * hope;
    if (t < 15.3) {                                    // A: travelling frontal bajo la tormenta
      const k = (t - 10) / 5.3;
      camera.position.set(x + 3.5 - 0.5 * k, 1.2 + 0.12 * k, lerp(2.3, 1.2, k)); camera.fov = 37; tmp.set(x + 0.15, 1.02, 0);
    } else if (t < 21.6) {                             // B: llega a la orilla; grúa que revela el río y luego el cielo
      const k = ease((t - 15.3) / 4.4), up = ease((t - 19.7) / 1.9);
      camera.position.set(lerp(x - 2.9, -5.3, k), lerp(1.55, 2.7, k) - 0.5 * up, lerp(2.2, 3.1, k)); camera.fov = lerp(44, 50, k);
      tmp.set(lerp(x + 2.2, 3.2, k) + 4.5 * up, lerp(1.0, 0.7, k) + 9.5 * up, -0.7 - 4.6 * up);
    } else if (t < 24.8) {                             // C: primer plano — la luz le cambia el rostro
      const k = (t - 21.6) / 3.2;
      camera.position.set(head.x + 1.55 - 0.22 * k, head.y + 0.22, 1.25 - 0.15 * k); camera.fov = 30; tmp.set(head.x + 0.05, head.y - 0.02, head.z);
    } else {                                           // D: cruza el río, la cámara lo acompaña y asciende hacia la luz
      const k = (t - 24.8) / 10.2, up = ease((t - 31.8) / 3.2);
      camera.position.set(x + 1.3 - 1.4 * k, 1.0 + 0.45 * k + 1.2 * up, 4.3 - 0.6 * k); camera.fov = 37; tmp.set(x + 0.3, 0.72 + 0.2 * k + 2.4 * up, -0.2 - 2.2 * up);
    }
    camera.position.x += 0.035 * shk * wob(t, 1.7, 11); camera.position.y += 0.03 * shk * wob(t, 2.1, 12);
    camera.lookAt(tmp); camera.rotation.z += 0.006 * shk * wob(t, 1.3, 13); camera.updateProjectionMatrix();

    // ---- Ambiente ----
    skyU.time.value = t; skyU.flash.value = flash; skyU.hope.value = hope;
    scene.fog.color.copy(fogA).lerp(fogB, hope * 0.8).addScalar(flash * 0.12); scene.fog.density = lerp(0.05, 0.03, hope);
    waterU.time.value = t; waterU.calm.value = sstep(20.2, 22.5, t); waterU.flash.value = flash; waterU.hope.value = hope;
    waterU.heroXZ.value.set(x + 0.25, 0); waterU.fogColor.value.copy(scene.fog.color); waterU.fogDensity.value = scene.fog.density;
    for (const g of trees) g.rotation.z = (0.07 + 0.05 * Math.sin(t * 1.9 + g.userData.seed) + 0.03 * Math.sin(t * 4.3 + g.userData.seed * 2)) * (1 - 0.6 * hope);
    updateRain(t, lerp(1, 0.22, sstep(20, 33, t)));
    // relámpago delante de la cámara
    let bv = 0; for (const t0 of FLASHES) bv = Math.max(bv, pulse(t0 - 0.02, t0, t0 + 0.07, t0 + 0.16, t));
    bolt.visible = bv > 0.01 && t > 10.5; bolt.material.opacity = bv;
    if (bolt.visible) { camera.getWorldDirection(fwd); fwd.y = 0; fwd.normalize(); bolt.position.copy(camera.position).addScaledVector(fwd, 95); bolt.position.x += -fwd.z * (t < 16 ? -12 : 10); bolt.position.z += fwd.x * (t < 16 ? -12 : 10); bolt.position.y = -2; bolt.lookAt(camera.position.x, bolt.position.y, camera.position.z); }
    hemi.intensity = 1.05 + 2.4 * flash + 0.25 * hope; hemi.color.setHex(0x55688c).lerp(tmp.set(0, 0, 0) && new THREE.Color(0xc9b48a), hope * 0.7);
    storm.position.set(x - 5, 12, 7); storm.target.position.set(x, 0, 0); storm.intensity = 1.3 * (1 - 0.6 * hope) + 6 * flash;
    rim.position.set(x - 2, 4, -8); rim.target.position.set(x, 1, 0); rim.intensity = 0.9 + 3 * flash;
    face.position.copy(camera.position).lerp(head, 0.45); face.position.y = head.y + 0.25; face.intensity = 3.2 * (1 - 0.6 * hope);
    const tx = x + 0.25;
    beam.position.set(tx, y - 0.2, 0); beamU.k.value = beamK; beamU.time.value = t;
    gold.position.set(tx, y, 0).addScaledVector(OPEN, 22); gold.target.position.set(tx, y + 0.8, 0); gold.intensity = 240 * beamK;
    warm.position.set(x + 0.9, y + 1.5, 1.2); warm.intensity = 1.6 * beamK;
    motesM.opacity = 0.6 * beamK;
    for (let i = 0; i < NM; i++) { const [a, rad, h0, sp] = mBase[i], hh = (h0 + t * sp) % 9; const ang = a + t * 0.2 * sp;
      mp[i * 3] = tx + Math.cos(ang) * rad + OPEN.x * hh; mp[i * 3 + 1] = y + hh * OPEN.y + 0.1; mp[i * 3 + 2] = Math.sin(ang) * rad + OPEN.z * hh; }
    mg.attributes.position.needsUpdate = true;
    return { bloom: [lerp(0.55, 0.62, hope), 0.75, lerp(0.8, 0.82, hope)], tint: [lerp(0.9, 1.07, hope), lerp(0.97, 1.0, hope), lerp(1.12, 0.9, hope)], sat: lerp(0.9, 1.12, hope), vig: 0.55 - 0.15 * hope, exposure: lerp(1.3, 1.0, hope) };
  }
  return { scene, camera, update };
}
