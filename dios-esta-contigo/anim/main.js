// Línea de tiempo principal: 60 s, 5 escenas, 1080×1920. window.renderAt(t) dibuja el instante t.
import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { clamp, lerp, sstep, pulse } from './util.js';
import { makeHero } from './hero.js';
import { buildRoom } from './s1_room.js';

const W = 1080, H = 1920;
const params = new URLSearchParams(location.search);
const canvas = document.getElementById('c');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: false, preserveDrawingBuffer: true, powerPreference: 'high-performance' });
renderer.setPixelRatio(1); renderer.setSize(W, H, false);
renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.outputColorSpace = THREE.SRGBColorSpace;

const rt = new THREE.WebGLRenderTarget(W, H, { type: THREE.HalfFloatType, samples: params.has('fast') ? 0 : 4 });
const composer = new EffectComposer(renderer, rt);
const renderPass = new RenderPass(new THREE.Scene(), new THREE.PerspectiveCamera());
const bloom = new UnrealBloomPass(new THREE.Vector2(W / 2, H / 2), 0.5, 0.6, 0.85);
const grade = new ShaderPass({
  uniforms: { tDiffuse: { value: null }, tint: { value: new THREE.Vector3(1, 1, 1) }, sat: { value: 1 }, vig: { value: 0.4 }, time: { value: 0 } },
  vertexShader: `varying vec2 vUv; void main(){ vUv=uv; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.); }`,
  fragmentShader: /* glsl */`
    uniform sampler2D tDiffuse; uniform vec3 tint; uniform float sat, vig, time; varying vec2 vUv;
    float h(vec2 p){ return fract(sin(dot(p, vec2(12.9898,78.233)))*43758.5453); }
    void main(){
      vec3 c = texture2D(tDiffuse, vUv).rgb;
      float l = dot(c, vec3(0.2126,0.7152,0.0722));
      c = mix(vec3(l), c, sat) * tint;
      c = mix(c, c*c*(3.0-2.0*c), 0.35);                      // contraste suave en S
      vec2 d = (vUv-0.5)*vec2(0.85,1.0);
      c *= 1.0 - vig*smoothstep(0.28, 0.82, length(d));       // viñeta
      c += (h(vUv*vec2(1080.,1920.)+fract(time)*61.0)-0.5)*0.022; // grano fino
      gl_FragColor = vec4(c, 1.0);
    }` });
composer.addPass(renderPass); composer.addPass(bloom); composer.addPass(new OutputPass()); composer.addPass(grade);

const hero = makeHero();
const only = params.get('only');
const S = {};
S.room = buildRoom();
if (!only || only !== 'room') {
  const [{ buildStorm }, { buildFire }, { buildMountain }] = await Promise.all([import('./s2_storm.js'), import('./s4_fire.js'), import('./s5_mountain.js')]);
  S.storm = buildStorm(); S.fire = buildFire(); S.mountain = buildMountain();
}
const sceneAt = (t) => (t < 10 || !S.storm ? S.room : t < 35 ? S.storm : t < 47 ? S.fire : S.mountain);

// ---------- Capas de texto ----------
const CUES = await (await fetch('../subtitulos/cues.json')).json();
const $ = (s) => document.querySelector(s);
const subs = $('#subs'), wash = $('#wash'), verse = $('#verse'), verseTxt = $('#verse .txt'), fin = $('#final');
const VERSES = [
  { on: 26.5, off: 34.0, lines: [[26.84, 'Cuando pasares por las aguas,'], [29.29, 'yo seré contigo;'], [31.08, 'y por los ríos, no te anegarán.']] },
  { on: 35.9, off: 45.4, lines: [[36.2, 'Cuando pasares por el fuego,'], [38.81, 'no te quemarás,'], [40.48, 'ni la llama arderá en ti.']] },
];
let verseIdx = -1;
// [inicio, pico, fin de pico, final, color] — fundidos entre escenas
const WASH = [[-1, 0, 0, 0.9, '#000'], [9.82, 9.97, 10.04, 10.5, '#e6eeff'], [34.25, 34.95, 35.05, 35.9, '#ffe9b4'], [46.1, 46.95, 47.05, 48.1, '#fff7e0']];

function overlays(t) {
  let w = 0, wc = '#000';
  for (const [a, b, c, d, col] of WASH) { const v = pulse(a, b, c, d, t); if (v > w) { w = v; wc = col; } }
  wash.style.background = wc; wash.style.opacity = w.toFixed(3);

  // Subtítulos sincronizados con la voz
  let cur = null;
  for (let i = 0; i < CUES.length; i++) {
    const c = CUES[i], end = Math.min(c.fin + 0.3, i + 1 < CUES.length ? CUES[i + 1].inicio - 0.04 : 99);
    if (t >= c.inicio - 0.06 && t < end) cur = { c, a: Math.min(sstep(c.inicio - 0.06, c.inicio + 0.1, t), 1 - sstep(end - 0.1, end, t)) };
  }
  if (cur) { if (subs.textContent !== cur.c.texto) subs.textContent = cur.c.texto; subs.style.opacity = cur.a.toFixed(3); subs.style.transform = `translateY(${((1 - sstep(cur.c.inicio - 0.06, cur.c.inicio + 0.16, t)) * 14).toFixed(2)}px)`; }
  else subs.style.opacity = 0;

  // Versículo
  const vi = VERSES.findIndex((v) => t >= v.on && t < v.off + 0.6);
  if (vi < 0) verse.style.opacity = 0;
  else {
    const v = VERSES[vi];
    if (verseIdx !== vi) { verseIdx = vi; verseTxt.innerHTML = v.lines.map((l) => `<span>${l[1]}</span>`).join(''); }
    verse.style.opacity = (sstep(v.on, v.on + 0.5, t) * (1 - sstep(v.off, v.off + 0.6, t))).toFixed(3);
    [...verseTxt.children].forEach((el, i) => { const k = sstep(v.lines[i][0] - 0.1, v.lines[i][0] + 0.55, t); el.style.opacity = k.toFixed(3); el.style.transform = `translateY(${((1 - k) * 18).toFixed(2)}px)`; });
  }
  // Texto final
  if (t < 55.7) fin.style.opacity = 0;
  else {
    fin.style.opacity = 1;
    const anim = (el, t0) => { const k = sstep(t0, t0 + 0.6, t); el.style.opacity = k.toFixed(3); el.style.transform = `translateY(${((1 - k) * 34).toFixed(2)}px) scale(${(1.14 - 0.14 * k).toFixed(4)})`; };
    anim(fin.querySelector('.l1'), 55.9); anim(fin.querySelector('.l2'), 56.3); anim(fin.querySelector('.ref'), 56.9);
    const b = (t - 56.9) * 1.25, ph = b - Math.floor(b), beat = t > 56.9 ? Math.exp(-ph * 7) * 0.16 + Math.exp(-Math.abs(ph - 0.22) * 14) * 0.08 : 0;
    fin.querySelector('svg').style.transform = `scale(${(1 + beat).toFixed(4)})`;
  }
}

window.renderAt = (t) => {
  const sc = sceneAt(t);
  const look = sc.update(t, hero) || {};
  renderPass.scene = sc.scene; renderPass.camera = sc.camera;
  const [bs, br, bt] = look.bloom || [0.5, 0.6, 0.85];
  bloom.strength = bs; bloom.radius = br; bloom.threshold = bt;
  renderer.toneMappingExposure = look.exposure ?? 1;
  grade.uniforms.tint.value.set(...(look.tint || [1, 1, 1])); grade.uniforms.sat.value = look.sat ?? 1; grade.uniforms.vig.value = look.vig ?? 0.4; grade.uniforms.time.value = t;
  composer.render();
  if (!params.has('notext')) overlays(t); 
  renderer.getContext().finish();
};
await document.fonts.ready;
await Promise.all([...document.fonts].map((f) => f.load().catch(() => 0)));
window.renderAt(0);
window.READY = true;
