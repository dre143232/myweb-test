// ESCENA 5 — La victoria y la esperanza: amanecer sobre la montaña verde.
import * as THREE from 'three';
import { clamp, lerp, sstep, ease, pulse, wob, rng, fbm2, GLSL_NOISE } from './util.js';

const terrainH = (x, z) => { const r2 = x * x + z * z, rr = Math.sqrt(r2);
  return 7.0 * Math.exp(-r2 / 520) + 0.12 * (fbm2(x * 0.45, z * 0.45) - 0.5) + sstep(8, 40, rr) * 7.0 * (fbm2(x * 0.022 + 9, z * 0.022 + 4) - 0.56) - 1.2; };
const SUN = new THREE.Vector3(-0.5, 0.26, -0.83).normalize();

export function buildMountain() {
  const scene = new THREE.Scene(); scene.fog = new THREE.Fog(0x9fc4f0, 40, 700);
  const camera = new THREE.PerspectiveCamera(40, 9 / 16, 0.1, 900), r = rng(77);
  const SY = terrainH(0, 0);

  // Terreno verde
  const tg = new THREE.PlaneGeometry(520, 520, 300, 300); tg.rotateX(-Math.PI / 2);
  const tp = tg.attributes.position, tc = new Float32Array(tp.count * 3);
  for (let i = 0; i < tp.count; i++) { const x = tp.getX(i), z = tp.getZ(i), h = terrainH(x, z); tp.setY(i, h);
    const n = fbm2(x * 0.09, z * 0.09), n2 = fbm2(x * 0.5 + 7, z * 0.5);
    tc[i * 3] = 0.2 + 0.2 * n + 0.07 * n2; tc[i * 3 + 1] = 0.5 + 0.2 * n + 0.1 * n2; tc[i * 3 + 2] = 0.13 + 0.08 * n; }
  tg.setAttribute('color', new THREE.BufferAttribute(tc, 3)); tg.computeVertexNormals();
  const terrain = new THREE.Mesh(tg, new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.95 })); terrain.receiveShadow = true; scene.add(terrain);
  // Lagos y río en el valle, ya en calma
  const lake = new THREE.Mesh(new THREE.PlaneGeometry(900, 900), new THREE.MeshStandardMaterial({ color: 0x7fc0e8, roughness: 0.12, metalness: 0.25 })); lake.rotation.x = -Math.PI / 2; lake.position.y = -2.25; scene.add(lake);

  // Cordillera lejana con nieve
  for (let i = 0; i < 16; i++) {
    const a = -2.6 + i * 0.36 + (r() - 0.5) * 0.15, d = 190 + r() * 110, h = 55 + r() * 60, w = 55 + r() * 40;
    const g = new THREE.ConeGeometry(w, h, 9, 6); const p = g.attributes.position, col = new Float32Array(p.count * 3);
    for (let k = 0; k < p.count; k++) { const y = p.getY(k) / h + 0.5, j = (fbm2(p.getX(k) * 0.05 + i, p.getZ(k) * 0.05) - 0.5) * 12 * (1 - y); p.setX(k, p.getX(k) + j); p.setZ(k, p.getZ(k) + j);
      const snow = sstep(0.55, 0.72, y + 0.1 * fbm2(p.getX(k) * 0.2, i)); col[k * 3] = lerp(0.36, 0.97, snow); col[k * 3 + 1] = lerp(0.46, 0.97, snow); col[k * 3 + 2] = lerp(0.6, 1.0, snow); }
    g.setAttribute('color', new THREE.BufferAttribute(col, 3)); g.computeVertexNormals();
    const m = new THREE.Mesh(g, new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 1, flatShading: true })); m.position.set(Math.sin(a) * d, h / 2 - 6, -Math.cos(a) * d); scene.add(m);
  }

  // Cielo del amanecer
  const skyU = { time: { value: 0 }, clear: { value: 0 }, sun: { value: SUN } };
  const sky = new THREE.Mesh(new THREE.SphereGeometry(800, 48, 24), new THREE.ShaderMaterial({ uniforms: skyU, side: THREE.BackSide, depthWrite: false, fog: false,
    vertexShader: `varying vec3 vDir; void main(){ vDir=position; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.); }`,
    fragmentShader: GLSL_NOISE + /* glsl */`uniform float time, clear; uniform vec3 sun; varying vec3 vDir;
      void main(){ vec3 d = normalize(vDir); float y = max(d.y, 0.0); float a = max(dot(d, sun), 0.0);
        vec3 col = mix(vec3(0.85,0.58,0.38), vec3(0.16,0.42,0.9), smoothstep(0.0,0.28,y));
        col = mix(col, vec3(0.03,0.17,0.62), smoothstep(0.2,0.9,y));
        col += vec3(1.0,0.62,0.3)*pow(a,6.0)*0.3 + vec3(1.0,0.9,0.7)*pow(a,90.0)*0.6 + vec3(1.0,0.97,0.88)*pow(a,1500.0)*12.0;
        vec2 cuv = d.xz/(y+0.22)*0.9 + vec2(time*0.012, 0.0); float c = fbm(cuv*1.6);
        col = mix(col, mix(vec3(0.95,0.78,0.66), vec3(0.9), smoothstep(0.1,0.5,y)), smoothstep(0.62,0.88,c)*0.3*smoothstep(0.02,0.25,y));
        float st = fbm(cuv*0.9+3.0); col = mix(col, vec3(0.22,0.25,0.32), (1.0-clear)*smoothstep(0.3,0.7,st)*0.8);   // últimos nubarrones retirándose
        gl_FragColor = vec4(col, 1.0); }` }));
  sky.frustumCulled = false; scene.add(sky);

  // Nubes esponjosas
  const cloudM = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 1, emissive: 0xffe8d8, emissiveIntensity: 0.12, fog: false });
  const clouds = [];
  for (let i = 0; i < 12; i++) { const g = new THREE.Group(), n = 5 + Math.floor(r() * 4);
    for (let k = 0; k < n; k++) { const s = new THREE.Mesh(new THREE.SphereGeometry(4 + r() * 5, 14, 10), cloudM); s.position.set((k - n / 2) * 5 + r() * 2, r() * 2.5, r() * 4); s.scale.y = 0.62; g.add(s); }
    const a = -2.2 + r() * 2.9, d = 90 + r() * 110; g.position.set(Math.sin(a) * d, 26 + r() * 30, -Math.cos(a) * d); g.userData.x0 = g.position.x; g.userData.sp = 0.5 + r(); scene.add(g); clouds.push(g); }

  // Arcoíris
  const rainbow = new THREE.Mesh(new THREE.RingGeometry(92, 101, 128, 1, 0, Math.PI), new THREE.ShaderMaterial({ transparent: true, depthWrite: false, fog: false, side: THREE.DoubleSide, uniforms: { k: { value: 0 } },
    vertexShader: `varying float vR; void main(){ vR = (length(position.xy)-92.0)/9.0; gl_Position = projectionMatrix*modelViewMatrix*vec4(position,1.); }`,
    fragmentShader: `uniform float k; varying float vR; void main(){ float h = (1.0-vR)*0.8; vec3 c = clamp(abs(mod(h*6.0+vec3(0.,4.,2.),6.0)-3.0)-1.0, 0.0, 1.0); gl_FragColor = vec4(c, sin(3.14159*vR)*0.36*k); }` }));
  rainbow.position.set(70, -6, -150); rainbow.rotation.y = -0.45; scene.add(rainbow);

  // Hierba mecida por la brisa
  const NG = 26000, bladeG = new THREE.ConeGeometry(0.024, 0.34, 3); bladeG.translate(0, 0.17, 0);
  const timeU = { value: 0 };
  const grassM = new THREE.MeshLambertMaterial({ color: 0xffffff });
  grassM.onBeforeCompile = (sh) => { sh.uniforms.time = timeU; sh.vertexShader = 'uniform float time;\n' + sh.vertexShader.replace('#include <begin_vertex>', `#include <begin_vertex>\n float ph = instanceMatrix[3].x*0.8 + instanceMatrix[3].z*1.1; float bend = position.y*position.y*5.0; transformed.x += (sin(time*1.9+ph)*0.1 + 0.06)*bend; transformed.z += cos(time*1.4+ph*1.3)*0.05*bend;`); };
  const grass = new THREE.InstancedMesh(bladeG, grassM, NG); const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler(), v = new THREE.Vector3(), s3 = new THREE.Vector3(), col = new THREE.Color();
  for (let i = 0; i < NG; i++) { const a = r() * 6.2832, d = Math.pow(r(), 0.62) * 17, x = Math.cos(a) * d, z = Math.sin(a) * d + 2.0;
    e.set((r() - 0.5) * 0.5, r() * 6.28, (r() - 0.5) * 0.5); q.setFromEuler(e); const s = 0.7 + r() * 0.9; m4.compose(v.set(x, terrainH(x, z) - 0.02, z), q, s3.set(s, s * (0.8 + r() * 0.6), s)); grass.setMatrixAt(i, m4);
    col.setRGB(0.28 + r() * 0.22, 0.62 + r() * 0.25, 0.16 + r() * 0.12); grass.setColorAt(i, col); }
  grass.frustumCulled = false; scene.add(grass);
  // Flores
  const NFl = 900, flowers = new THREE.InstancedMesh(new THREE.SphereGeometry(0.05, 8, 6), new THREE.MeshLambertMaterial({ color: 0xffffff }), NFl), pal = [0xffffff, 0xffe45c, 0xff8fb3, 0xc79bff, 0xff7a59];
  for (let i = 0; i < NFl; i++) { const a = r() * 6.2832, d = 0.9 + Math.pow(r(), 0.7) * 15, x = Math.cos(a) * d, z = Math.sin(a) * d + 2.0, s = 0.7 + r() * 0.8;
    m4.compose(v.set(x, terrainH(x, z) + 0.26 + r() * 0.08, z), q.identity(), s3.set(s, s * 0.7, s)); flowers.setMatrixAt(i, m4); flowers.setColorAt(i, col.setHex(pal[Math.floor(r() * pal.length)])); }
  flowers.frustumCulled = false; scene.add(flowers);
  // Árboles redondeados en las laderas
  const trunkM = new THREE.MeshStandardMaterial({ color: 0x6b4a2f, roughness: 0.9 }), leafM = new THREE.MeshStandardMaterial({ color: 0x3f8f3a, roughness: 0.9 });
  for (let i = 0; i < 70; i++) { const a = r() * 6.2832, d = 24 + r() * 80, x = Math.cos(a) * d, z = Math.sin(a) * d, h = terrainH(x, z); if (h < -2) continue;
    const g = new THREE.Group(), tr = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.28, 2, 6), trunkM); tr.position.y = 1; g.add(tr);
    for (let k = 0; k < 3; k++) { const b = new THREE.Mesh(new THREE.SphereGeometry(1.2 - k * 0.2, 10, 8), leafM); b.position.set((r() - 0.5) * 0.9, 2.5 + k * 0.7, (r() - 0.5) * 0.9); b.castShadow = true; g.add(b); }
    g.position.set(x, h - 0.1, z); g.scale.setScalar(0.9 + r() * 1.2); scene.add(g); }
  // Aves
  const birdM = new THREE.MeshBasicMaterial({ color: 0x2b2f3a, side: THREE.DoubleSide, fog: false }), birds = [];
  const wingG = new THREE.BufferGeometry(); wingG.setAttribute('position', new THREE.Float32BufferAttribute([0, 0, 0.12, 0, 0, -0.12, 0.75, 0, -0.05], 3));
  for (let i = 0; i < 7; i++) { const g = new THREE.Group(), wl = new THREE.Mesh(wingG, birdM), wr = new THREE.Mesh(wingG, birdM); wr.scale.x = -1; g.add(wl, wr);
    g.userData = { wl, wr, ph: r() * 6, off: [(i % 4) * 2.4 - 3 + r(), Math.floor(i / 4) * 1.6 + r() * 1.2, -(i % 3) * 2.2] }; scene.add(g); birds.push(g); }

  // Luces
  const hemi = new THREE.HemisphereLight(0xcfe3ff, 0x6f8f4a, 1.1); scene.add(hemi);
  const sun = new THREE.DirectionalLight(0xffdfae, 3.4); sun.castShadow = true; sun.shadow.mapSize.set(2048, 2048); sun.shadow.bias = -0.0005; sun.shadow.radius = 4;
  Object.assign(sun.shadow.camera, { left: -8, right: 8, top: 8, bottom: -8, near: 1, far: 80 }); scene.add(sun, sun.target);
  const front = new THREE.DirectionalLight(0xfff1de, 1.3); scene.add(front, front.target);

  const P0 = new THREE.Vector3(-4.4, 0, 1.7), head = new THREE.Vector3(), tmp = new THREE.Vector3(), camA = new THREE.Vector3(), camB = new THREE.Vector3();
  const walkLen = P0.length(), TH0 = Math.atan2(-P0.x, -P0.z), TH1 = 0.3;
  function update(t, hero) {
    scene.add(hero.root);
    // ---- Protagonista: últimos pasos hasta la cima, mira al cielo y levanta las manos ----
    const s = 51.2 - t, dist = s > 0.8 ? s - 0.4 : s > 0 ? s * s / 1.6 : 0, k = clamp(dist * 1.0 / walkLen), amp = clamp(s / 0.8);
    const x = P0.x * k, z = P0.z * k, y = terrainH(x, z);
    hero.rest(); hero.root.position.set(x, y, z);
    const turn = ease((t - 50.8) / 1.5); hero.root.rotation.set(0, lerp(TH0, TH1, turn), 0);
    hero.walk(((walkLen - dist) / hero.stride) * 6.2832, amp * 0.9, 0.12 * amp);
    const awe = sstep(51.0, 52.4, t), raise = ease((t - 52.5) / 1.7), thanks = pulse(54.3, 54.9, 55.7, 56.4, t), br = Math.sin(t * 1.7), f = hero.face;
    hero.spine.rotation.x += -0.1 * raise; hero.spine.scale.set(1 + 0.01 * br, 1 + 0.01 * raise, 1 + 0.025 * br);
    hero.head.rotation.x += -0.42 * awe - 0.12 * raise + 0.1 * thanks; hero.head.rotation.y += -0.25 * awe * (1 - raise) + 0.03 * wob(t, 0.4, 3);
    for (const a of hero.arms) { const sw = 0.05 * Math.sin(t * 1.3 + a.s) * raise;
      a.sh.rotation.x = lerp(a.sh.rotation.x, -2.72 + sw, raise); a.sh.rotation.z = lerp(a.sh.rotation.z, -a.s * (0.5 + sw), raise); a.el.rotation.x = lerp(a.el.rotation.x, -0.22, raise); }
    f.smile = lerp(0.35, 1.0, awe); f.open = 0.75 * sstep(51.8, 53.2, t) - 0.3 * thanks; f.browTilt = 0.1 * thanks; f.browRaise = 0.3 + 0.6 * awe; f.squint = 0.3; f.lid = 0.02 + 0.95 * thanks; f.gazeY = 0.2 + 0.6 * awe; f.gazeX = -0.2 * awe * (1 - raise); f.blush = 1; f.tear = f.tear2 = -1;
    hero.applyFace(t); hero.headWorld(head);

    // ---- Cámara ----
    if (t < 51.6) { const kk = ease((t - 47) / 4.6);       // G: plano general, grúa ascendente que descubre el valle
      camera.position.set(lerp(6.2, 4.6, kk), SY + lerp(0.7, 1.75, kk), lerp(8.8, 6.6, kk)); camera.fov = 46; tmp.set(x * 0.7, y + 1.15, z * 0.7);
    } else {                                              // H → I: plano medio contrapicado y retroceso final
      const kk = (t - 51.6) / 4.4, back = ease((t - 55.6) / 4.4);
      camA.set(0.95 - 0.15 * kk, SY + 1.0 + 0.04 * kk, 3.0 - 0.35 * kk); camB.set(2.1, SY + 2.3, 8.2);
      camera.position.lerpVectors(camA, camB, back); camera.fov = lerp(35, 44, back); tmp.set(0, SY + lerp(1.42, 2.75, back), 0);
    }
    camera.position.y += 0.012 * wob(t, 0.5, 51); camera.lookAt(tmp); camera.updateProjectionMatrix();

    // ---- Ambiente ----
    const clear = sstep(47, 50, t); skyU.time.value = t; skyU.clear.value = clear; timeU.value = t;
    rainbow.material.uniforms.k.value = sstep(49, 53, t);
    for (const c of clouds) c.position.x = c.userData.x0 + (t - 47) * c.userData.sp;
    for (const b of birds) { const u = b.userData, fl = Math.sin(t * 9 + u.ph) * 0.65; u.wl.rotation.z = fl; u.wr.rotation.z = -fl;
      b.position.set(-34 + (t - 47) * 4.2 + u.off[0], SY + 17 + u.off[1] + 0.3 * Math.sin(t * 2 + u.ph), -38 + u.off[2] - (t - 47) * 0.6); b.rotation.y = Math.PI / 2; b.scale.setScalar(1.1); }
    sun.position.set(x, y, z).addScaledVector(SUN, 40); sun.target.position.set(x, y, z); sun.intensity = 3.4 * (0.6 + 0.4 * clear);
    front.position.copy(camera.position); front.target.position.copy(head);
    return { bloom: [0.3, 0.7, 0.97], tint: [1.04, 1.0, 0.95], sat: 1.3, vig: 0.28, exposure: lerp(0.7, 0.85, clear) };
  }
  return { scene, camera, update };
}
