// ESCENA 4 — Dios nos sostiene: un camino entre llamas que no lo alcanzan.
import * as THREE from 'three';
import { clamp, lerp, sstep, ease, pulse, wob, rng, GLSL_NOISE } from './util.js';

function emberTexture() {
  const c = document.createElement('canvas'); c.width = c.height = 512; const g = c.getContext('2d'), r = rng(5);
  g.fillStyle = '#000'; g.fillRect(0, 0, 512, 512); g.lineCap = 'round';
  for (let i = 0; i < 70; i++) {
    let x = r() * 512, y = r() * 512; g.beginPath(); g.moveTo(x, y);
    for (let k = 0; k < 6; k++) { x += (r() - 0.5) * 90; y += (r() - 0.5) * 90; g.lineTo(x, y); }
    g.strokeStyle = `rgba(255,${90 + Math.floor(r() * 90)},20,${0.35 + r() * 0.5})`; g.lineWidth = 1 + r() * 3.5; g.shadowColor = '#ff5a10'; g.shadowBlur = 12; g.stroke();
  }
  const t = new THREE.CanvasTexture(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(14, 20); t.colorSpace = THREE.SRGBColorSpace; return t;
}
function radialTexture(stops) {
  const c = document.createElement('canvas'); c.width = c.height = 256; const g = c.getContext('2d'), gr = g.createRadialGradient(128, 128, 0, 128, 128, 128);
  for (const [o, col] of stops) gr.addColorStop(o, col); g.fillStyle = gr; g.fillRect(0, 0, 256, 256);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
}

export function buildFire() {
  const scene = new THREE.Scene(); scene.fog = new THREE.FogExp2(0x1c0805, 0.038);
  const camera = new THREE.PerspectiveCamera(40, 9 / 16, 0.1, 400), r = rng(21);

  const ground = new THREE.Mesh(new THREE.PlaneGeometry(90, 140), new THREE.MeshStandardMaterial({ color: 0x1a100d, roughness: 0.95, emissive: 0xff5a18, emissiveMap: emberTexture(), emissiveIntensity: 0.8 }));
  ground.rotation.x = -Math.PI / 2; ground.position.z = 25; ground.receiveShadow = true; scene.add(ground);
  // sendero de ceniza clara
  const pc = document.createElement('canvas'); pc.width = 64; pc.height = 4; const pg = pc.getContext('2d'), gr = pg.createLinearGradient(0, 0, 64, 0);
  gr.addColorStop(0, 'rgba(120,104,96,0)'); gr.addColorStop(0.3, 'rgba(120,104,96,1)'); gr.addColorStop(0.7, 'rgba(120,104,96,1)'); gr.addColorStop(1, 'rgba(120,104,96,0)'); pg.fillStyle = gr; pg.fillRect(0, 0, 64, 4);
  const pt = new THREE.CanvasTexture(pc); pt.colorSpace = THREE.SRGBColorSpace;
  const path = new THREE.Mesh(new THREE.PlaneGeometry(3.6, 140), new THREE.MeshStandardMaterial({ map: pt, transparent: true, roughness: 1, depthWrite: false })); path.rotation.x = -Math.PI / 2; path.position.set(0, 0.01, 25); path.receiveShadow = true; scene.add(path);

  // Cielo de humo con la salida luminosa al fondo
  const skyU = { time: { value: 0 }, exit: { value: 0 } };
  const sky = new THREE.Mesh(new THREE.SphereGeometry(300, 40, 20), new THREE.ShaderMaterial({ uniforms: skyU, side: THREE.BackSide, depthWrite: false, fog: false,
    vertexShader: `varying vec3 vDir; void main(){ vDir=position; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.); }`,
    fragmentShader: GLSL_NOISE + /* glsl */`uniform float time, exit; varying vec3 vDir;
      void main(){ vec3 d = normalize(vDir); float y = max(d.y,0.0);
        float n = fbm(vec2(atan(d.x,d.z)*2.5, y*4.0 - time*0.12));
        vec3 col = mix(vec3(0.3,0.07,0.02), vec3(0.02,0.01,0.01), smoothstep(0.0,0.55,y + (n-0.5)*0.25));
        col += vec3(0.3,0.09,0.02)*smoothstep(0.55,0.9,n)*(1.0-smoothstep(0.0,0.5,y))*0.6;
        float a = max(dot(d, normalize(vec3(0.0,0.16,1.0))), 0.0);
        col += exit*(vec3(1.0,0.9,0.7)*pow(a,40.0)*2.2 + vec3(1.0,0.7,0.4)*pow(a,6.0)*0.35);
        gl_FragColor = vec4(col,1.0); }` }));
  sky.frustumCulled = false; scene.add(sky);

  // Llamas: billboards instanciados con shader procedural; se apartan a su paso
  const NF = 300, base = new THREE.PlaneGeometry(1, 1); base.translate(0, 0.5, 0);
  const fg = new THREE.InstancedBufferGeometry(); fg.index = base.index; fg.setAttribute('position', base.attributes.position); fg.setAttribute('uv', base.attributes.uv);
  const iPos = new Float32Array(NF * 3), iScale = new Float32Array(NF * 2), iSeed = new Float32Array(NF);
  for (let i = 0; i < NF; i++) {
    const near = i < 130, sgn = i % 2 ? 1 : -1;
    const x = near ? sgn * (1.3 + r() * 1.5) : sgn * (3.0 + r() * 15), z = near ? -7 + (i / 130) * 62 + r() * 0.8 : -10 + r() * 75;
    iPos.set([x, -0.05, z], i * 3); const h = near ? 1.5 + r() * 1.5 : 1.6 + r() * 3.6; iScale.set([h * (0.5 + r() * 0.2), h], i * 2); iSeed[i] = r();
  }
  fg.setAttribute('iPos', new THREE.InstancedBufferAttribute(iPos, 3)); fg.setAttribute('iScale', new THREE.InstancedBufferAttribute(iScale, 2)); fg.setAttribute('iSeed', new THREE.InstancedBufferAttribute(iSeed, 1));
  fg.instanceCount = NF;
  const flameU = { time: { value: 0 }, heroPos: { value: new THREE.Vector3() } };
  const flames = new THREE.Mesh(fg, new THREE.ShaderMaterial({ uniforms: flameU, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide, fog: false,
    vertexShader: /* glsl */`attribute vec3 iPos; attribute vec2 iScale; attribute float iSeed; uniform float time; uniform vec3 heroPos; varying vec2 vUv; varying float vSeed; varying float vFog;
      void main(){ vUv = uv; vSeed = iSeed;
        vec3 toCam = cameraPosition - iPos; toCam.y = 0.0; toCam = normalize(toCam); vec3 right = vec3(toCam.z, 0.0, -toCam.x);
        float dz = iPos.z - heroPos.z; float near = exp(-dz*dz/12.0) * smoothstep(6.0, 1.2, abs(iPos.x));
        vec3 p = iPos + right*(position.x*iScale.x) + vec3(0.0, position.y*iScale.y*(1.0-0.22*near), 0.0);
        p.x += sign(iPos.x) * near * (0.35 + 0.6 * uv.y*uv.y * iScale.y) + sin(time*2.3 + iSeed*20.0)*0.07*uv.y*iScale.y;
        vec4 mv = viewMatrix*vec4(p,1.0); vFog = exp(-0.0009*dot(mv.xyz,mv.xyz)); gl_Position = projectionMatrix*mv; }`,
    fragmentShader: GLSL_NOISE + /* glsl */`uniform float time; varying vec2 vUv; varying float vSeed; varying float vFog;
      void main(){ vec2 uv = vUv; float t = time*(1.25 + 0.5*fract(vSeed*7.0));
        float n = fbm(vec2(uv.x*3.0 + vSeed*20.0, uv.y*2.3 - t*1.8)), n2 = fbm(vec2(uv.x*6.5 - vSeed*9.0, uv.y*4.2 - t*2.7));
        float d = abs(uv.x-0.5)*2.0;
        float shape = (1.0-uv.y) * (1.0 - d*d*(1.0+uv.y*2.0));
        float f = shape*1.2 + (n-0.5)*0.95*(0.25+uv.y) + (n2-0.5)*0.35;
        float a = smoothstep(0.2,0.5,f) * smoothstep(1.0,0.75,d);
        float heat = f * (1.0 - 0.45*uv.y) - 0.25*d;
        vec3 col = mix(vec3(0.85,0.09,0.01), vec3(1.0,0.38,0.04), smoothstep(0.25,0.7,heat));
        col = mix(col, vec3(1.0,0.72,0.2), smoothstep(0.75,1.25,heat));
        gl_FragColor = vec4(col*a*0.62*vFog, a); }` }));
  flames.frustumCulled = false; scene.add(flames);

  // Pavesas
  const NE = 700, ep = new Float32Array(NE * 3), eb = []; for (let i = 0; i < NE; i++) eb.push([(r() - 0.5) * 22, r() * 9, -8 + r() * 70, 0.6 + r() * 1.4, r() * 6.28]);
  const eg = new THREE.BufferGeometry(); eg.setAttribute('position', new THREE.BufferAttribute(ep, 3));
  const embers = new THREE.Points(eg, new THREE.PointsMaterial({ color: new THREE.Color(3.0, 1.1, 0.25), size: 0.06, transparent: true, opacity: 0.9, depthWrite: false, blending: THREE.AdditiveBlending, fog: false })); embers.frustumCulled = false; scene.add(embers);

  // Árboles calcinados
  const charM = new THREE.MeshStandardMaterial({ color: 0x0c0706, roughness: 1 });
  for (let i = 0; i < 26; i++) {
    const sgn = i % 2 ? 1 : -1, x = sgn * (4 + r() * 12), z = -8 + r() * 70, g = new THREE.Group(), h = 3 + r() * 3;
    const tr = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.22, h, 6), charM); tr.position.y = h / 2; g.add(tr);
    for (let k = 0; k < 3; k++) { const b = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.07, 1.4, 5), charM); b.position.set(0, h * (0.5 + 0.15 * k), 0); b.rotation.set(0, r() * 6.28, 0.9 + r() * 0.5); b.translateY(0.7); g.add(b); }
    g.position.set(x, 0, z); g.rotation.z = (r() - 0.5) * 0.2; scene.add(g);
  }

  // Presencia protectora: cúpula de luz, haz y resplandor en el suelo (nunca un rostro)
  const domeU = { time: { value: 0 } };
  const dome = new THREE.Mesh(new THREE.SphereGeometry(1.55, 48, 32), new THREE.ShaderMaterial({ uniforms: domeU, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, fog: false,
    vertexShader: `varying vec3 vN; varying vec3 vV; varying vec3 vP; void main(){ vP = position; vec4 mv = modelViewMatrix*vec4(position,1.); vN = normalize(normalMatrix*normal); vV = normalize(-mv.xyz); gl_Position = projectionMatrix*mv; }`,
    fragmentShader: GLSL_NOISE + /* glsl */`uniform float time; varying vec3 vN; varying vec3 vV; varying vec3 vP;
      void main(){ float fr = pow(1.0 - abs(dot(normalize(vN), normalize(vV))), 2.6);
        float sh = 0.75 + 0.5*vnoise(vec2(atan(vP.x,vP.z)*5.0 + time*0.5, vP.y*4.0 - time*1.2));
        float a = fr*sh*0.2; gl_FragColor = vec4(vec3(1.0,0.88,0.6)*a, a); }` }));
  scene.add(dome);
  const glow = new THREE.Mesh(new THREE.CircleGeometry(2.6, 48), new THREE.MeshBasicMaterial({ map: radialTexture([[0, 'rgba(255,236,190,0.28)'], [0.35, 'rgba(255,210,130,0.14)'], [1, 'rgba(255,180,90,0)']]), transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, fog: false }));
  glow.rotation.x = -Math.PI / 2; scene.add(glow);
  const beamG = new THREE.CylinderGeometry(0.75, 1.45, 40, 40, 1, true); beamG.translate(0, 20, 0);
  const beam = new THREE.Mesh(beamG, new THREE.ShaderMaterial({ transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide, fog: false,
    vertexShader: `varying vec3 vN; varying vec3 vV; varying vec2 vUv; void main(){ vUv=uv; vec4 mv = modelViewMatrix*vec4(position,1.); vN = normalize(normalMatrix*normal); vV = normalize(-mv.xyz); gl_Position = projectionMatrix*mv; }`,
    fragmentShader: `varying vec3 vN; varying vec3 vV; varying vec2 vUv; void main(){ float f = pow(abs(dot(normalize(vN), normalize(vV))), 2.0); float a = f*smoothstep(0.0,0.04,vUv.y)*(1.0-0.7*vUv.y)*0.06; gl_FragColor = vec4(vec3(1.0,0.86,0.58)*a, a); }` }));
  beam.rotation.z = -0.1; beam.rotation.x = 0.12; scene.add(beam);

  // Luces
  scene.add(new THREE.HemisphereLight(0x5a2a1c, 0x240a05, 1.1));
  const fireL = [-1, 1].map((s) => { const l = new THREE.PointLight(0xff641c, 12, 16, 1.5); scene.add(l); return l; });
  const back = new THREE.PointLight(0xff4a10, 20, 18, 1.5); scene.add(back);
  const key = new THREE.SpotLight(0xfff0cf, 110, 30, 0.2, 0.85, 1.3); key.castShadow = true; key.shadow.mapSize.set(2048, 2048); key.shadow.bias = -0.0008; key.shadow.radius = 5; scene.add(key, key.target);
  const fill = new THREE.PointLight(0xffe4b8, 2.5, 8, 1.5); scene.add(fill);

  const head = new THREE.Vector3(), tmp = new THREE.Vector3();
  function update(t, hero) {
    scene.add(hero.root);
    const z = 1.02 * (t - 35), phase = (z / (hero.stride * 0.9)) * 6.2832, exit = sstep(40.5, 46.8, t);
    hero.rest(); hero.root.position.set(0, 0, z); hero.root.rotation.set(0, 0, 0);
    hero.walk(phase, 0.86, 0.03);
    const glance = pulse(37.2, 37.9, 38.6, 39.4, t), f = hero.face;
    hero.head.rotation.y += 0.5 * glance; hero.head.rotation.x += -0.1 - 0.12 * sstep(39.5, 41, t) + 0.08 * glance;
    hero.spine.scale.set(1, 1, 1 + 0.02 * Math.sin(t * 1.6));
    f.smile = 0.45 + 0.25 * sstep(39.5, 41, t) - 0.15 * glance; f.open = 0; f.browTilt = 0.04 + 0.2 * glance; f.browRaise = 0.3 + 0.5 * glance; f.squint = 0.35; f.lid = 0.05; f.gazeX = 0.5 * glance; f.gazeY = 0.2 + 0.3 * sstep(39.5, 41, t); f.blush = 0.8; f.tear = f.tear2 = -1;
    hero.applyFace(t); hero.headWorld(head);

    if (t < 41.2) {                                  // E: travelling frontal, ángulo bajo, entre las llamas
      const k = (t - 35) / 6.2; camera.position.set(0.7 - 0.5 * k, 0.95 + 0.1 * k, z + 4.6 - 0.9 * k); camera.fov = 40; tmp.set(0, 1.1, z);
    } else {                                         // F: grúa por detrás; camina hacia la salida luminosa
      const k = ease((t - 41.2) / 5.8); camera.position.set(-1.1 + 0.7 * k, 1.9 + 1.5 * k, z - 3.6 - 1.4 * k); camera.fov = 46; tmp.set(0, 1.1 + 0.5 * k, z + 2.5 + 3 * k);
    }
    camera.position.x += 0.02 * wob(t, 1.2, 31); camera.position.y += 0.015 * wob(t, 1.5, 32); camera.lookAt(tmp); camera.updateProjectionMatrix();

    skyU.time.value = t; skyU.exit.value = exit; flameU.time.value = t; flameU.heroPos.value.set(0, 0, z); domeU.time.value = t;
    scene.fog.color.setHex(0x1c0805).lerp(new THREE.Color(0x6a4a30), exit * 0.25);
    for (let i = 0; i < NE; i++) { const [x0, y0, z0, sp, ph] = eb[i], yy = (y0 + t * sp) % 9; ep[i * 3] = x0 + Math.sin(t * 0.9 + ph + yy) * 0.5; ep[i * 3 + 1] = yy; ep[i * 3 + 2] = z0 + Math.cos(t * 0.7 + ph) * 0.3; }
    eg.attributes.position.needsUpdate = true;
    const fl = (s) => 0.8 + 0.2 * wob(t, 7, s) + 0.12 * wob(t, 17, s + 1);
    fireL[0].position.set(-2.8, 1.5, z + 0.6); fireL[1].position.set(2.8, 1.5, z + 0.3); fireL[0].intensity = 12 * fl(40); fireL[1].intensity = 12 * fl(41);
    back.position.set(0.5, 2.2, z - 4); back.intensity = 9 * fl(42);
    key.position.set(-1.2, 13, z + 2.6); key.target.position.set(0, 0.9, z); fill.position.set(0.8, 1.5, z + 2.2);
    dome.position.set(0, 0.95, z); glow.position.set(0, 0.03, z); beam.position.set(0, 0, z);
    const pul = 1 + 0.04 * Math.sin(t * 2.2); dome.scale.setScalar(pul);
    return { bloom: [0.5, 0.7, 0.8], tint: [1.06, 0.98, 0.9], sat: 1.08, vig: 0.5, exposure: 0.9 };
  }
  return { scene, camera, update };
}
