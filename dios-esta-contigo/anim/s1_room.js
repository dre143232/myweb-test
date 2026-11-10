// ESCENA 1 — El momento difícil: habitación de noche, lluvia en la ventana.
import * as THREE from 'three';
import { clamp, lerp, sstep, ease, pulse, wob, GLSL_NOISE } from './util.js';

const box = (w, h, d, color, pos, parent, opt = {}) => {
  const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), new THREE.MeshStandardMaterial({ color, roughness: opt.rough ?? 0.8, ...opt.mat }));
  m.position.set(...pos); m.castShadow = opt.cast ?? true; m.receiveShadow = true; parent.add(m); return m;
};

function woodTexture() {
  const c = document.createElement('canvas'); c.width = c.height = 512; const g = c.getContext('2d');
  for (let i = 0; i < 8; i++) {
    const v = 86 + ((i * 37) % 23); g.fillStyle = `rgb(${v + 22},${v - 8},${v - 34})`; g.fillRect(i * 64, 0, 64, 512);
    g.fillStyle = 'rgba(20,10,5,.55)'; g.fillRect(i * 64, 0, 2, 512);
    g.fillStyle = 'rgba(20,10,5,.4)'; g.fillRect(i * 64, (i * 173) % 512, 64, 2);
    for (let k = 0; k < 14; k++) { g.fillStyle = `rgba(40,20,8,${0.05 + ((k * i) % 5) * 0.02})`; g.fillRect(i * 64 + ((k * 29 + i * 7) % 60), 0, 1.5, 512); }
  }
  const t = new THREE.CanvasTexture(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(2.5, 2.5); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8; return t;
}

export function buildRoom() {
  const scene = new THREE.Scene(); scene.background = new THREE.Color(0x05070c);
  const camera = new THREE.PerspectiveCamera(46, 9 / 16, 0.1, 60);

  // Arquitectura
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(7, 7), new THREE.MeshStandardMaterial({ map: woodTexture(), roughness: 0.55 }));
  floor.rotation.x = -Math.PI / 2; floor.position.z = 0.5; floor.receiveShadow = true; scene.add(floor);
  const wallC = 0x5d6f8e;
  box(7, 3.2, 0.1, wallC, [0, 1.6, -2.55], scene, { cast: false, rough: 0.95 });
  box(0.1, 3.2, 7, wallC, [-2.7, 1.6, 0.5], scene, { cast: false, rough: 0.95 });
  box(0.1, 3.2, 7, wallC, [2.7, 1.6, 0.5], scene, { cast: false, rough: 0.95 });
  box(7, 0.1, 7, 0x8a93a6, [0, 3.2, 0.5], scene, { cast: false });
  box(7, 0.14, 0.04, 0xd9d2c3, [0, 0.07, -2.48], scene, { cast: false });

  // Ventana con lluvia (shader)
  const WX = 0.95, WY = 1.72, WW = 1.35, WH = 1.55;
  const glassU = { time: { value: 0 }, flash: { value: 0 } };
  const glass = new THREE.Mesh(new THREE.PlaneGeometry(WW, WH), new THREE.ShaderMaterial({ uniforms: glassU,
    vertexShader: `varying vec2 vUv; void main(){ vUv=uv; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.); }`,
    fragmentShader: GLSL_NOISE + /* glsl */`
      uniform float time, flash; varying vec2 vUv;
      void main(){
        vec2 uv = vUv;
        vec3 col = mix(vec3(0.035,0.06,0.12), vec3(0.11,0.17,0.30), uv.y);
        col += vec3(0.05,0.07,0.12) * fbm(uv*3.0 + vec2(time*0.05, 0.0));
        // luces lejanas de la ciudad, desenfocadas
        for(int i=0;i<6;i++){ float fi=float(i); vec2 p=vec2(hash21(vec2(fi,1.3)), 0.08+0.3*hash21(vec2(fi,7.7)));
          vec3 lc = mix(vec3(1.0,0.72,0.38), vec3(0.6,0.75,1.0), step(0.6,hash21(vec2(fi,3.1))));
          col += lc * smoothstep(0.075, 0.0, length((uv-p)*vec2(1.0,1.15))) * 0.34; }
        // lluvia cayendo afuera
        float streak = 0.0;
        for(int i=0;i<3;i++){ float fi=float(i); float cols = 34.0 + fi*22.0;
          float cx = floor(uv.x*cols); float sp = 2.6 + fi*0.9 + hash21(vec2(cx,fi))*1.5;
          float y = uv.y*1.6 + time*sp + hash21(vec2(cx, fi+4.0))*9.0;
          float on = step(0.72, hash21(vec2(cx, floor(y)+fi)));
          streak += on * smoothstep(0.5,0.1,abs(fract(uv.x*cols)-0.5)) * pow(fract(y),1.5) * (0.6 - fi*0.14); }
        col += streak * vec3(0.5,0.62,0.85) * (0.55 + flash*1.2);
        // gotas resbalando por el cristal
        float drops = 0.0;
        for(int i=0;i<16;i++){ float fi=float(i); float x = hash21(vec2(fi,9.1)); float sp = 0.035+0.07*hash21(vec2(fi,2.2));
          float y = 1.0 - fract(hash21(vec2(fi,5.5)) + time*sp); x += 0.012*sin(y*30.0+fi);
          vec2 d = (uv - vec2(x,y)) * vec2(1.0, 0.72);
          drops += smoothstep(0.02,0.006,length(d));
          drops += 0.35*smoothstep(0.006,0.0,abs(uv.x-x)) * step(y,uv.y) * smoothstep(y+0.3,y,uv.y); }
        col += drops * vec3(0.42,0.52,0.7) * (0.75 + flash);
        col += flash * vec3(0.75,0.85,1.0) * (0.55 + 0.6*fbm(uv*2.5+3.0));
        gl_FragColor = vec4(col*1.25, 1.0);
      }` }));
  glass.position.set(WX, WY, -2.49); scene.add(glass);
  const fc = 0xe4ddce;
  box(WW + 0.16, 0.08, 0.1, fc, [WX, WY + WH / 2 + 0.03, -2.46], scene); box(WW + 0.26, 0.07, 0.2, fc, [WX, WY - WH / 2 - 0.03, -2.42], scene);
  box(0.08, WH, 0.1, fc, [WX - WW / 2 - 0.03, WY, -2.46], scene); box(0.08, WH, 0.1, fc, [WX + WW / 2 + 0.03, WY, -2.46], scene);
  box(0.045, WH, 0.06, fc, [WX, WY, -2.47], scene); box(WW, 0.045, 0.06, fc, [WX, WY + 0.1, -2.47], scene);
  // Cortinas
  const curtM = new THREE.MeshStandardMaterial({ color: 0x8a4c50, roughness: 0.9 });
  for (const s of [-1, 1]) for (let i = 0; i < 5; i++) {
    const c = new THREE.Mesh(new THREE.CylinderGeometry(0.055, 0.065, 2.05, 10), curtM); c.position.set(WX + s * (WW / 2 + 0.12 + i * 0.075), WY - 0.12, -2.38 + (i % 2) * 0.03); c.castShadow = true; c.receiveShadow = true; scene.add(c);
  }
  const rod = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, WW + 1.1, 8), new THREE.MeshStandardMaterial({ color: 0x3a2a1c })); rod.rotation.z = Math.PI / 2; rod.position.set(WX, WY + WH / 2 + 0.16, -2.38); scene.add(rod);

  // Cama
  box(2.5, 0.3, 1.5, 0x6d4a33, [-0.75, 0.15, -1.72], scene);
  box(2.4, 0.16, 1.42, 0xece6da, [-0.75, 0.32, -1.72], scene);
  box(0.12, 1.0, 1.56, 0x6d4a33, [-2.02, 0.5, -1.72], scene);
  const blanket = box(1.25, 0.2, 1.46, 0x40688c, [-0.05, 0.325, -1.72], scene); 
  box(1.25, 0.21, 0.2, 0xdfe7ee, [-0.05, 0.325, -1.0], scene, { cast: false }).scale.set(1, 1, 0.3);
  const pillow = new THREE.Mesh(new THREE.SphereGeometry(0.3, 20, 14), new THREE.MeshStandardMaterial({ color: 0xf4f0e8, roughness: 0.9 })); pillow.scale.set(0.75, 0.32, 1.5); pillow.position.set(-1.62, 0.47, -1.72); pillow.castShadow = true; pillow.receiveShadow = true; scene.add(pillow);
  // Mesa de noche y lámpara
  box(0.55, 0.52, 0.45, 0x5c3f2c, [1.75, 0.26, -2.2], scene); box(0.5, 0.03, 0.01, 0x3d2a1d, [1.75, 0.34, -1.97], scene, { cast: false });
  const lampBase = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.1, 0.3, 14), new THREE.MeshStandardMaterial({ color: 0xb08a55, roughness: 0.4, metalness: 0.4 })); lampBase.position.set(1.78, 0.67, -2.22); scene.add(lampBase);
  const shadeM = new THREE.MeshStandardMaterial({ color: 0xffe2b0, emissive: 0xffa550, emissiveIntensity: 1.5, roughness: 0.9, side: THREE.DoubleSide });
  const shade = new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.19, 0.24, 20, 1, true), shadeM); shade.position.set(1.78, 0.92, -2.22); scene.add(shade);
  box(0.26, 0.05, 0.18, 0x7a2f2f, [1.62, 0.545, -2.12], scene).rotation.y = 0.3;  // libro
  // Alfombra, cruz y cuadro
  const rug = new THREE.Mesh(new THREE.CircleGeometry(1.25, 48), new THREE.MeshStandardMaterial({ color: 0x9a5f4c, roughness: 1 })); rug.rotation.x = -Math.PI / 2; rug.position.set(-0.7, 0.006, -0.2); rug.receiveShadow = true; scene.add(rug);
  const rug2 = new THREE.Mesh(new THREE.RingGeometry(0.95, 1.05, 48), new THREE.MeshStandardMaterial({ color: 0xe0c9a0, roughness: 1 })); rug2.rotation.x = -Math.PI / 2; rug2.position.set(-0.7, 0.008, -0.2); rug2.receiveShadow = true; scene.add(rug2);
  box(0.07, 0.5, 0.035, 0x94714a, [-0.95, 2.1, -2.48], scene, { cast: false }); box(0.32, 0.07, 0.035, 0x94714a, [-0.95, 2.19, -2.48], scene, { cast: false });
  box(0.5, 0.62, 0.04, 0x3d2a1d, [-1.95, 1.9, -2.48], scene, { cast: false }); box(0.4, 0.52, 0.05, 0x8fa7b8, [-1.95, 1.9, -2.475], scene, { cast: false });

  // Luces
  const hemi = new THREE.HemisphereLight(0x6f86c8, 0x3a2a22, 1.0); scene.add(hemi);
  const moon = new THREE.SpotLight(0x9dbcff, 150, 14, 0.42, 0.55, 1.6); moon.position.set(WX + 1.2, 3.3, -5.4); moon.target.position.set(-0.95, 0.7, -0.7);
  moon.castShadow = true; moon.shadow.mapSize.set(2048, 2048); moon.shadow.bias = -0.0008; moon.shadow.radius = 5; moon.shadow.camera.near = 1; moon.shadow.camera.far = 14; scene.add(moon, moon.target);
  const lamp = new THREE.PointLight(0xffa860, 2.2, 7, 1.8); lamp.position.set(1.7, 1.0, -2.0); scene.add(lamp);
  const fill = new THREE.DirectionalLight(0x8fa6d8, 0.5); fill.position.set(-0.6, 1.2, 3); scene.add(fill);
  // luz cálida de la lámpara que modela el rostro
  const key = new THREE.SpotLight(0xffb878, 26, 9, 0.5, 0.8, 1.6); key.position.set(1.9, 1.25, 0.9); key.target.position.set(-0.85, 0.95, -0.9); key.castShadow = true; key.shadow.mapSize.set(1024, 1024); key.shadow.bias = -0.001; key.shadow.radius = 6; scene.add(key, key.target);
  const eyeL = new THREE.PointLight(0xffc89a, 0.0, 3, 2); scene.add(eyeL);   // luz tenue sobre el rostro en el primer plano

  const head = new THREE.Vector3();
  function update(t, hero) {
    scene.add(hero.root);
    const flash = Math.max(pulse(4.25, 4.3, 4.36, 4.75, t) * (0.6 + 0.4 * Math.sin(t * 90)), pulse(9.8, 9.9, 10, 10.1, t));
    glassU.time.value = t; glassU.flash.value = flash;
    moon.intensity = 150 * (1 + 5 * flash); hemi.intensity = 1.0 + 0.8 * flash;
    lamp.intensity = 2.2 * (1 + 0.04 * wob(t, 3, 1));

    // Pose sentado, abatido
    hero.rest();
    hero.root.position.set(-0.85, 0, -1.08); hero.root.rotation.set(0, 0.12, 0);
    const breath = Math.sin(t * 1.5), sigh = pulse(4.6, 5.5, 5.7, 7.0, t), lift = sstep(6.4, 8.2, t);
    hero.hips.position.y = 0.565;
    for (const l of hero.legs) { l.hp.rotation.set(-1.27, l.s * 0.06, l.s * 0.14); l.kn.rotation.x = 1.3; }
    hero.spine.rotation.x = 0.52 + 0.012 * breath - 0.09 * sigh - 0.05 * lift;
    hero.spine.scale.set(1 + 0.012 * breath + 0.02 * sigh, 1 + 0.01 * sigh, 1 + 0.02 * breath + 0.03 * sigh);
    hero.head.rotation.set(0.3 - 0.36 * lift + 0.05 * sigh + 0.012 * wob(t, 0.5, 2), 0.05 * wob(t, 0.25, 3) - 0.08 * lift, 0.04 * wob(t, 0.3, 4));
    for (const a of hero.arms) { a.sh.rotation.set(-0.5 - 0.03 * sigh, 0, -a.s * 0.1); a.el.rotation.set(-1.02 + 0.02 * breath, 0, -a.s * 0.52); }
    const f = hero.face;
    f.smile = -0.85 + 0.1 * lift; f.open = 0.0; f.browTilt = 0.9; f.browRaise = 0.3 + 0.4 * lift; f.squint = 0.25;
    f.lid = 0.34 - 0.14 * lift + pulse(8.5, 9.1, 9.6, 10.2, t) * 0.7; f.gazeX = 0.1 * lift; f.gazeY = -0.55 + 0.75 * lift; f.blush = 0.25;
    f.tear = t > 4.4 ? clamp((t - 4.4) / 4.2) * 0.999 : -1; f.tear2 = t > 6.6 ? clamp((t - 6.6) / 3.6) * 0.999 : -1;
    hero.applyFace(t + 0.6);

    // Cámara: travelling lento hacia el rostro
    hero.headWorld(head);
    const k = ease((t - 0.4) / 8.8);
    camera.position.set(lerp(0.55, -0.55, k), lerp(1.5, 0.98, k), lerp(3.55, 0.82, k));
    camera.position.x += 0.012 * wob(t, 0.4, 7); camera.position.y += 0.01 * wob(t, 0.35, 8);
    camera.lookAt(lerp(-0.45, head.x + 0.02, k), lerp(1.12, head.y - 0.02, k), lerp(-1.5, head.z, k));
    camera.fov = lerp(47, 30, k); camera.updateProjectionMatrix();
    eyeL.position.set(head.x + 0.5, head.y + 0.15, head.z + 1.0); eyeL.intensity = 0.9 * k;
    return { bloom: [0.5, 0.7, 0.8], tint: [0.92, 0.98, 1.1], sat: 0.95, vig: 0.55, exposure: 1.25 };
  }
  return { scene, camera, update };
}
