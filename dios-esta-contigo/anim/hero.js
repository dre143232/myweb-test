// El protagonista: un único personaje construido una sola vez y reutilizado en
// todas las escenas, de modo que su apariencia es idéntica durante todo el video.
import * as THREE from 'three';
import { clamp, lerp, sstep } from './util.js';

const C = { piel: 0xe2a47a, pielOsc: 0xcf8c66, pelo: 0x33200f, chaqueta: 0x2a8794, chaquetaOsc: 0x1f6672,
  cuello: 0xf0e2c4, jean: 0x2a3a5c, bota: 0x5e3b20, ojo: 0xffffff, iris: 0x5b3716, boca: 0x5e241d };

const std = (color, rough = 0.6, extra = {}) => new THREE.MeshStandardMaterial({ color, roughness: rough, metalness: 0, ...extra });
function mesh(geo, mat, parent, pos, shadow = true) {
  const m = new THREE.Mesh(geo, mat); if (pos) m.position.set(...pos);
  m.castShadow = shadow; m.receiveShadow = shadow; parent.add(m); return m;
}
const grp = (parent, pos) => { const g = new THREE.Group(); if (pos) g.position.set(...pos); parent.add(g); return g; };

export function makeHero() {
  const M = { piel: std(C.piel, 0.55), pielOsc: std(C.pielOsc, 0.6), pelo: std(C.pelo, 0.75), chaq: std(C.chaqueta, 0.7),
    chaqOsc: std(C.chaquetaOsc, 0.7), cuello: std(C.cuello, 0.8), jean: std(C.jean, 0.8), bota: std(C.bota, 0.65),
    ojo: std(0xf3f0ea, 0.55), iris: std(C.iris, 0.3), negro: std(0x120c08, 0.3),
    brillo: new THREE.MeshBasicMaterial({ color: 0xffffff }), boca: std(C.boca, 0.5),
    rubor: new THREE.MeshBasicMaterial({ color: 0xe8705f, transparent: true, opacity: 0.0, depthWrite: false }),
    lagrima: new THREE.MeshPhysicalMaterial({ color: 0xcfeaff, roughness: 0.05, transmission: 0.0, transparent: true, opacity: 0.0, emissive: 0x9fd0ff, emissiveIntensity: 0.22 }) };

  const root = new THREE.Group(); root.scale.setScalar(0.86);
  const hips = grp(root, [0, 0.8, 0]);
  const spine = grp(hips);
  // --- Torso (chaqueta) ---
  const torso = mesh(new THREE.CapsuleGeometry(0.215, 0.33, 8, 24), M.chaq, spine, [0, 0.33, 0]); torso.scale.set(1.13, 1, 0.86);
  const hem = mesh(new THREE.TorusGeometry(0.2, 0.045, 10, 28), M.chaqOsc, spine, [0, 0.03, 0]); hem.rotation.x = Math.PI / 2; hem.scale.set(1.13, 0.86, 1);
  mesh(new THREE.BoxGeometry(0.022, 0.5, 0.02), M.chaqOsc, spine, [0, 0.36, 0.187]);
  const collar = mesh(new THREE.TorusGeometry(0.105, 0.04, 10, 24), M.cuello, spine, [0, 0.705, 0.005]); collar.rotation.x = Math.PI / 2 + 0.15;
  mesh(new THREE.CylinderGeometry(0.075, 0.085, 0.14, 16), M.piel, spine, [0, 0.76, 0]);

  // --- Cabeza ---
  const head = grp(spine, [0, 0.8, 0]);
  const skull = mesh(new THREE.SphereGeometry(0.27, 40, 32), M.piel, head, [0, 0.24, 0]); skull.scale.set(1, 1.04, 0.97);
  // mandíbula un poco más ancha: da un rostro adulto y amable
  const jaw = mesh(new THREE.SphereGeometry(0.2, 32, 24), M.piel, head, [0, 0.135, 0.03]); jaw.scale.set(1.12, 0.8, 1.02);
  for (const s of [-1, 1]) { const e = mesh(new THREE.SphereGeometry(0.052, 16, 12), M.piel, head, [s * 0.268, 0.225, -0.01]); e.scale.set(0.5, 1, 0.8); }
  const nose = mesh(new THREE.SphereGeometry(0.036, 16, 12), M.pielOsc, head, [0, 0.2, 0.266]); nose.scale.set(0.95, 0.85, 1);
  // Pelo: casquete + flequillo
  const cap = mesh(new THREE.SphereGeometry(0.284, 40, 20, 0, Math.PI * 2, 0, 1.32), M.pelo, head, [0, 0.245, -0.012]); cap.rotation.x = -0.42; cap.scale.set(1.02, 1.03, 1.0);
  const tufts = [[-0.13, 0.475, 0.13, 0.11, 0.3], [0.0, 0.5, 0.15, 0.125, 0.0], [0.13, 0.475, 0.13, 0.11, -0.3], [0.06, 0.52, 0.06, 0.12, -0.1], [-0.07, 0.52, 0.05, 0.12, 0.2], [-0.235, 0.33, 0.07, 0.07, 0], [0.235, 0.33, 0.07, 0.07, 0]];
  for (const [x, y, z, r, rz] of tufts) { const t = mesh(new THREE.SphereGeometry(r, 16, 12), M.pelo, head, [x, y, z]); t.scale.set(1.15, 0.62, 1.05); t.rotation.z = rz; }
  // Ojos
  const eyes = [];
  for (const s of [-1, 1]) {
    const eg = grp(head, [s * 0.098, 0.268, 0.2]);
    const ball = mesh(new THREE.SphereGeometry(0.066, 24, 20), M.ojo, eg, null, false); ball.scale.set(1, 1.1, 0.62);
    const look = grp(eg);
    const iris = mesh(new THREE.CircleGeometry(0.036, 28), M.iris, look, [0, 0, 0.0425], false);
    mesh(new THREE.CircleGeometry(0.019, 24), M.negro, look, [0, 0, 0.0431], false);
    const hl = mesh(new THREE.CircleGeometry(0.0095, 16), M.brillo, look, [0.013, 0.015, 0.0437], false);
    const hl2 = mesh(new THREE.CircleGeometry(0.005, 12), M.brillo, look, [-0.012, -0.012, 0.0437], false);
    const lid = mesh(new THREE.SphereGeometry(0.0675, 24, 12, 0, Math.PI * 2, 0, Math.PI / 2), M.piel, eg, null, false); lid.scale.set(1.0, 1.1, 0.655);
    const lidLow = mesh(new THREE.SphereGeometry(0.0675, 24, 12, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2), M.piel, eg, null, false); lidLow.scale.set(1.0, 1.1, 0.655);
    const brow = mesh(new THREE.CapsuleGeometry(0.0105, 0.072, 6, 12), M.pelo, head, [s * 0.1, 0.372, 0.23], false); brow.rotation.z = Math.PI / 2;
    const blush = mesh(new THREE.CircleGeometry(0.045, 20), M.rubor, head, [s * 0.165, 0.165, 0.2], false); blush.rotation.y = s * 0.65; blush.scale.set(1.1, 0.7, 1);
    eyes.push({ s, eg, look, lid, lidLow, brow, hl, hl2, iris });
  }
  // Boca: tubo curvo que se regenera según la emoción
  const mouth = new THREE.Mesh(new THREE.BufferGeometry(), M.boca); head.add(mouth);
  const mouthIn = mesh(new THREE.SphereGeometry(0.05, 20, 14), M.negro, head, [0, 0.105, 0.222], false);
  const teeth = mesh(new THREE.SphereGeometry(0.05, 20, 14), M.ojo, head, [0, 0.105, 0.222], false);
  // Lágrima
  const tear = mesh(new THREE.SphereGeometry(0.014, 12, 10), M.lagrima, head, null, false); tear.scale.set(0.85, 1.25, 0.7);
  const tear2 = mesh(new THREE.SphereGeometry(0.012, 12, 10), M.lagrima, head, null, false); tear2.scale.set(0.85, 1.25, 0.7);

  // --- Brazos ---
  const arms = [];
  for (const s of [-1, 1]) {
    const sh = grp(spine, [s * 0.262, 0.6, 0]); sh.rotation.order = 'ZXY';
    mesh(new THREE.SphereGeometry(0.092, 16, 12), M.chaq, sh);
    mesh(new THREE.CapsuleGeometry(0.078, 0.19, 6, 16), M.chaq, sh, [0, -0.16, 0]);
    const el = grp(sh, [0, -0.32, 0]);
    mesh(new THREE.CapsuleGeometry(0.068, 0.17, 6, 16), M.chaq, el, [0, -0.13, 0]);
    const cuff = mesh(new THREE.TorusGeometry(0.062, 0.022, 8, 18), M.chaqOsc, el, [0, -0.25, 0]); cuff.rotation.x = Math.PI / 2;
    const hand = mesh(new THREE.SphereGeometry(0.072, 18, 14), M.piel, el, [0, -0.325, 0]); hand.scale.set(0.9, 1.1, 0.75);
    const thumb = mesh(new THREE.SphereGeometry(0.03, 10, 8), M.piel, el, [-s * 0.045, -0.31, 0.03]);
    arms.push({ s, sh, el, hand });
  }
  // --- Piernas ---
  const legs = [];
  for (const s of [-1, 1]) {
    const hp = grp(hips, [s * 0.115, 0, 0]);
    mesh(new THREE.CapsuleGeometry(0.1, 0.2, 6, 16), M.jean, hp, [0, -0.18, 0]);
    const kn = grp(hp, [0, -0.4, 0]);
    mesh(new THREE.CapsuleGeometry(0.082, 0.2, 6, 16), M.jean, kn, [0, -0.17, 0]);
    const foot = mesh(new THREE.CapsuleGeometry(0.075, 0.13, 6, 14), M.bota, kn, [0, -0.345, 0.055]); foot.rotation.x = Math.PI / 2; foot.scale.set(1, 1, 0.85);
    mesh(new THREE.CylinderGeometry(0.086, 0.08, 0.1, 14), M.bota, kn, [0, -0.28, 0]);
    legs.push({ s, hp, kn, foot });
  }
  mesh(new THREE.SphereGeometry(0.2, 20, 14), M.jean, hips, [0, 0.0, 0]).scale.set(1.12, 0.7, 0.86);

  // Estado de la expresión
  const face = { smile: 0, open: 0, browTilt: 0, browRaise: 0, lid: 0, squint: 0, gazeX: 0, gazeY: 0, blush: 0, tear: -1, tear2: -1 };
  let lastMouthKey = '';

  function setMouth() {
    const sm = face.smile, w = 0.068 + 0.022 * Math.max(0, sm) + 0.004 * Math.abs(sm);
    const key = sm.toFixed(3) + '|' + face.open.toFixed(3);
    if (key === lastMouthKey) return; lastMouthKey = key;
    const pts = [];
    for (let i = 0; i <= 14; i++) {
      const u = i / 14 * 2 - 1, x = u * w;
      const y = 0.118 + sm * 0.034 * (u * u) - sm * 0.012 - face.open * 0.016 * (1 - u * u);
      const z = Math.sqrt(Math.max(0.0001, 0.262 * 0.262 - x * x * 1.25 - (y - 0.19) * (y - 0.19) * 0.9)) + 0.004;
      pts.push(new THREE.Vector3(x, y, z));
    }
    mouth.geometry.dispose();
    mouth.geometry = new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 24, 0.0078 + 0.0015 * Math.abs(sm), 8, false);
    const o = face.open;
    mouthIn.visible = teeth.visible = o > 0.02;
    mouthIn.scale.set(1.05 + 0.25 * sm, 0.12 + 0.55 * o, 0.3); mouthIn.position.set(0, 0.112 - 0.012 * sm - 0.012 * o, 0.224);
    teeth.scale.set(0.95 + 0.25 * sm, 0.07 + 0.2 * o, 0.3); teeth.position.set(0, 0.123 - 0.012 * sm + 0.004 * o, 0.2275);
  }

  // Parpadeo natural automático (determinista)
  function autoBlink(t) {
    let b = 0;
    for (let k = 0; k < 30; k++) { const tb = 1.7 + k * 2.9 + Math.sin(k * 12.9898) * 0.9; const d = Math.abs(t - tb); if (d < 0.11) b = Math.max(b, 1 - d / 0.11); }
    return b;
  }

  function applyFace(t) {
    setMouth();
    const blink = Math.max(face.lid, autoBlink(t));
    for (const e of eyes) {
      e.lid.rotation.x = lerp(-0.62, 1.42, clamp(blink * 0.94 + 0.06));
      e.lidLow.rotation.x = lerp(1.3, 0.62, clamp(face.squint));
      e.look.position.set(face.gazeX * 0.02, face.gazeY * 0.02, 0); e.look.rotation.set(-face.gazeY * 0.3, face.gazeX * 0.3, 0);
      e.brow.rotation.z = Math.PI / 2 - e.s * face.browTilt * 0.42;
      e.brow.position.y = 0.372 + face.browRaise * 0.022 + Math.abs(face.browTilt) * 0.004;
    }
    M.rubor.opacity = 0.16 * face.blush;
    const tr = (m, k, s) => {
      if (k < 0 || k > 1) { m.visible = false; return; }
      m.visible = true; M.lagrima.opacity = 0.92;
      const y = lerp(0.215, 0.07, k * k), x = s * (0.118 + 0.03 * Math.sin(k * 2.2));
      const z = Math.sqrt(Math.max(0.001, 0.263 * 0.263 - x * x - (y - 0.2) * (y - 0.2))) - 0.004 * k;
      m.position.set(x, y, z);
    };
    tr(tear, face.tear, 1); tr(tear2, face.tear2, -1);
  }

  // Pose neutra de pie
  function rest() {
    hips.position.set(0, 0.8, 0); hips.rotation.set(0, 0, 0); spine.rotation.set(0, 0, 0); spine.scale.set(1, 1, 1); head.rotation.set(0, 0, 0);
    for (const a of arms) { a.sh.rotation.set(0, 0, a.s * 0.1); a.el.rotation.set(-0.12, 0, 0); }
    for (const l of legs) { l.hp.rotation.set(0, 0, 0); l.kn.rotation.set(0, 0, 0); l.foot.rotation.x = Math.PI / 2; }
  }
  // Ciclo de caminata. fase en radianes (2π = dos pasos); amp 0..1; lean = inclinación del torso
  function walk(phase, amp = 1, lean = 0.08) {
    const s = Math.sin(phase), c = Math.cos(phase), A = 0.52 * amp;
    legs[0].hp.rotation.x = -A * s; legs[1].hp.rotation.x = A * s;
    legs[0].kn.rotation.x = (0.12 + 1.0 * Math.max(0, c) ** 1.3) * amp; legs[1].kn.rotation.x = (0.12 + 1.0 * Math.max(0, -c) ** 1.3) * amp;
    hips.position.y = 0.8 - 0.035 * amp * (1 - Math.abs(s)) - 0.01 * amp;
    hips.rotation.y = 0.09 * amp * s; hips.rotation.z = 0.03 * amp * c;
    spine.rotation.x = lean; spine.rotation.y = -0.16 * amp * s; spine.rotation.z = -0.03 * amp * c;
    arms[0].sh.rotation.x = 0.55 * amp * s; arms[1].sh.rotation.x = -0.55 * amp * s;
    arms[0].el.rotation.x = -0.25 - 0.3 * amp * Math.max(0, -s); arms[1].el.rotation.x = -0.25 - 0.3 * amp * Math.max(0, s);
    head.rotation.y = 0.08 * amp * s; head.rotation.z = 0.02 * amp * c;
  }
  const stride = 0.86 * 4 * 0.8 * Math.sin(0.52) * 0.93; // metros por ciclo completo, para que los pies no patinen

  const hero = { root, hips, spine, head, arms, legs, face, applyFace, rest, walk, stride, M,
    headWorld: (v = new THREE.Vector3()) => { head.updateWorldMatrix(true, false); return v.set(0, 0.24, 0).applyMatrix4(head.matrixWorld); } };
  rest(); applyFace(0);
  return hero;
}
