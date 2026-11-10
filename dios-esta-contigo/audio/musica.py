"""Música original (piano + cuerdas), efectos de sonido y mezcla final.
Todo se sintetiza con numpy: no se usa ningún material con derechos.
Uso: python3 audio/musica.py <dir_trabajo>   (necesita voz_cruda.wav)
"""
import sys, wave
import numpy as np
from scipy.signal import fftconvolve, butter, sosfilt

SR, DUR = 44100, 60.0
N = int(SR * DUR)
rng = np.random.default_rng(43)
T = np.arange(N) / SR

def midi(n): return 440.0 * 2 ** ((n - 69) / 12)
def filt(x, kind, fc, order=2):
    return sosfilt(butter(order, fc, kind, fs=SR, output="sos"), x)
def env_pts(pts):
    """Envolvente lineal por puntos [(t, v), ...] sobre los 60 s."""
    ts, vs = zip(*pts)
    return np.interp(T, ts, vs).astype(np.float32)

def piano(f, dur, vel=0.6):
    n = int(SR * (dur + 2.5)); t = np.arange(n) / SR
    out = np.zeros(n)
    B = 0.0004
    for k in range(1, 10):
        fk = f * k * np.sqrt(1 + B * k * k)
        if fk > 9000: break
        amp = (1.0 / k ** 1.35) * (vel ** (0.4 * k))
        out += amp * np.exp(-t * (0.55 + 0.42 * k) * (f / 220) ** 0.45) * np.sin(2 * np.pi * fk * t + k)
    out *= np.minimum(1, t / 0.006)
    rel = np.clip((dur + 2.3 - t) / 0.5, 0, 1)
    return (out * rel * vel).astype(np.float32)

def cuerda(f, dur, amp=1.0, atk=1.4, rel=1.8):
    n = int(SR * (dur + rel)); t = np.arange(n) / SR
    out = np.zeros(n)
    for det, ph in ((-0.0035, 0.0), (0.0, 1.7), (0.004, 3.1)):
        vib = 1 + 0.0028 * np.sin(2 * np.pi * (5.1 + det * 40) * t + ph) * np.minimum(1, t / 1.5)
        phase = 2 * np.pi * np.cumsum(f * (1 + det) * vib) / SR
        k = 1
        while f * k < 5200 and k <= 24:
            out += np.sin(k * phase + ph * k) / k * np.exp(-f * k / 2600.0)
            k += 1
    e = np.minimum(1, t / atk) ** 1.5 * np.clip((dur + rel - t) / rel, 0, 1) ** 1.5
    return (out * e * amp / 3).astype(np.float32)

def put(buf, t0, x, gain=1.0, pan=0.0):
    i = max(0, int(t0 * SR))
    if i >= N: return
    x = x[: N - i]; pan = float(np.clip(pan, -0.9, 0.9))
    buf[0, i:i + len(x)] += x * gain * np.sqrt(0.5 * (1 - pan))
    buf[1, i:i + len(x)] += x * gain * np.sqrt(0.5 * (1 + pan))

# ---------- Armonía: compases de 4 s (negra = 60) ----------
# (inicio, duración, bajo, [acorde], nota de melodía)
ACORDES = [
 (0, 4, 38, [62, 65, 69], 77), (4, 4, 34, [58, 62, 65], 74), (8, 4, 31, [55, 58, 62], 70),
 (12, 4, 33, [57, 61, 64], 69), (16, 4, 38, [62, 65, 69], 74),
 # La promesa: el modo se abre hacia Fa mayor
 (20, 4, 34, [58, 62, 65, 70], 77), (24, 4, 41, [60, 65, 69], 81), (28, 4, 31, [58, 62, 67], 79),
 (32, 4, 36, [60, 64, 67], 76),
 # Dios nos sostiene: crescendo
 (36, 4, 38, [62, 65, 69], 81), (40, 4, 34, [62, 65, 70], 82), (44, 4, 36, [60, 64, 67, 72], 84),
 # Victoria: Fa mayor pleno
 (48, 4, 41, [60, 65, 69, 72], 84), (52, 2, 34, [62, 65, 70], 86), (54, 2, 36, [60, 64, 67, 72], 84),
 (56, 4.5, 41, [60, 65, 69, 72, 77], 89),
]
inten = lambda t: np.interp(t, [0, 19, 21, 34, 36, 46, 48, 56, 60], [.35, .4, .6, .75, .8, 1.0, 1.1, 1.1, .9])

pno = np.zeros((2, N), np.float32); stg = np.zeros((2, N), np.float32)
for (t0, d, bajo, ac, mel) in ACORDES:
    I = inten(t0)
    # Piano: arpegio en corcheas, más denso cuando llega la esperanza
    paso = 1.0 if t0 < 20 else 0.5
    patron = [bajo + 12, ac[0], ac[1], ac[2], ac[1] + 12 if t0 >= 20 else ac[1], ac[2], ac[1], ac[0]]
    k = 0; tt = 0.0
    while tt < d - 1e-6:
        n = patron[k % len(patron)]
        hum = rng.uniform(-0.012, 0.012)
        put(pno, t0 + tt + hum, piano(midi(n), 1.6, 0.34 + 0.22 * I + (0.1 if k == 0 else 0)), 0.5, rng.uniform(-.3, .3))
        tt += paso; k += 1
    put(pno, t0, piano(midi(bajo), d, 0.45 + 0.2 * I), 0.6, -0.1)
    put(pno, t0 + (0.0 if t0 >= 20 else 2.0), piano(midi(mel), 2.5, 0.5 + 0.25 * I), 0.62, 0.15)
    if t0 >= 36 and d >= 4:
        put(pno, t0 + 2.0, piano(midi(mel - (2 if t0 != 44 else -2)), 1.5, 0.55), 0.5, 0.2)
        put(pno, t0 + 3.0, piano(midi(mel), 1.5, 0.6), 0.5, 0.2)
    # Cuerdas: violonchelo siempre; violines desde la promesa
    put(stg, t0 - 0.3, cuerda(midi(bajo + 12), d, 0.55), 0.5 + 0.4 * I, -0.35)
    if t0 >= 16:
        for j, n in enumerate(ac):
            put(stg, t0 - 0.4, cuerda(midi(n), d, 0.4), 0.35 * I + (0.0 if t0 >= 20 else -0.1), (-0.5 + j * 0.45))
    if t0 >= 28:
        put(stg, t0 - 0.4, cuerda(midi(mel), d, 0.34, atk=1.0), 0.5 * I, 0.4)
    if t0 >= 44:
        put(stg, t0 - 0.4, cuerda(midi(bajo), d, 0.6), 0.7, 0.0)

# Reverberación de sala (respuesta al impulso sintética, estéreo)
def reverb(x, secs=2.8, wet=0.3):
    n = int(SR * secs); t = np.arange(n) / SR
    out = np.zeros_like(x)
    for c in range(2):
        ir = rng.standard_normal(n) * np.exp(-t * 6.9 / secs) * np.minimum(1, t / 0.012)
        ir = filt(ir, "low", 5200); ir /= np.sqrt((ir ** 2).sum())
        out[c] = fftconvolve(x[c], ir)[:x.shape[1]]
    return x + wet * out
musica = reverb(pno, 2.6, 0.34) * 1.0 + reverb(stg, 3.2, 0.5) * 0.5

# Redoble grave + "aire" que anuncian la luz (20 s) y la victoria (47 s)
for t0, g in ((18.6, 0.5), (45.2, 0.9)):
    n = int(SR * 2.6); t = np.arange(n) / SR
    sw = filt(rng.standard_normal(n), "high", 3500) * (t / 2.6) ** 2.5 * 0.05
    put(musica, t0, sw.astype(np.float32), g, 0)
    boom = np.sin(2 * np.pi * 52 * t * (1 - 0.08 * t)) * np.exp(-t * 2.2) * np.minimum(1, t / 0.01)
    put(musica, t0 + 2.6, boom.astype(np.float32), g * 0.5, 0)
musica = filt(musica, "high", 32)

# ---------- Efectos de sonido ----------
def ruido(): return rng.standard_normal(N).astype(np.float32)
sfx = np.zeros((2, N), np.float32)
# Lluvia: tras la ventana (apagada) en la escena 1, plena en la 2, se disipa con la luz
for c in range(2):
    r = ruido()
    dentro = filt(filt(r, "low", 1400), "high", 250) * env_pts([(0, 0), (.6, .5), (9.4, .5), (10.2, 0), (60, 0)])
    fuera = filt(filt(r, "high", 900), "low", 9000) * env_pts([(0, 0), (9.6, 0), (10.3, .2), (20, .2), (27, .1), (35, .03), (40, 0), (60, 0)])
    viento = filt(filt(ruido(), "low", 420 + 60 * c), "high", 110)
    viento *= (0.55 + 0.45 * np.sin(2 * np.pi * (0.17 + .03 * c) * T + c)) * env_pts([(0, .12), (9.5, .12), (10.4, .9), (19, .9), (24, .3), (35, 0), (60, 0)])
    rio = filt(filt(ruido(), "low", 1100), "high", 180) * (0.8 + 0.2 * np.sin(2 * np.pi * 0.6 * T + 2 * c))
    rio *= env_pts([(0, 0), (15.5, 0), (18, .35), (33, .35), (35.5, 0), (60, 0)])
    fuego = filt(filt(ruido(), "low", 300), "high", 45) * (0.7 + 0.3 * np.sin(2 * np.pi * 1.3 * T + c))
    chis = (rng.random(N) > 0.9993).astype(np.float32) * rng.random(N).astype(np.float32)
    chis = filt(fftconvolve(chis, np.exp(-np.arange(400) / 40.0))[:N], "high", 1800) * 0.5
    ef = env_pts([(0, 0), (34.6, 0), (36, 1), (45.5, 1), (47.4, 0), (60, 0)])
    sfx[c] += dentro + fuera + viento * 0.5 + rio * 0.6 + (fuego * 1.6 + chis) * ef * 0.5
# Truenos sincronizados con los relámpagos de la animación (0,3 s después)
for t0, g in ((4.6, 0.5), (10.5, 1.0), (14.3, 0.7), (17.9, 0.9)):
    n = int(SR * 4.5); t = np.arange(n) / SR
    for c in range(2):
        th = filt(rng.standard_normal(n), "low", 130) * np.exp(-t * 1.1) * (0.6 + 0.4 * np.sin(2 * np.pi * 3.1 * t + c)) * np.minimum(1, t / 0.03)
        crack = filt(rng.standard_normal(n), "low", 900) * np.exp(-t * 9)
        x = (th * 5 + crack * 0.6).astype(np.float32) * g
        if t0 < 10: x = filt(x, "low", 200).astype(np.float32) * 1.3
        i = int(t0 * SR); sfx[c, i:i + n] += x[: N - i]
# Pájaros al amanecer
for _ in range(34):
    t0 = rng.uniform(48.5, 59.2); f0 = rng.uniform(2600, 4600); pan = rng.uniform(-.8, .8)
    for j in range(rng.integers(2, 5)):
        n = int(SR * 0.09); t = np.arange(n) / SR
        ch = np.sin(2 * np.pi * (f0 * t + rng.uniform(-9000, 9000) * t * t)) * np.sin(np.pi * t / 0.09) ** 2
        put(sfx, t0 + j * 0.13, ch.astype(np.float32), 0.035, pan)

# ---------- Voz: calidez + un poco de sala; la música se agacha bajo la voz ----------
with wave.open(sys.argv[1] + "/voz_cruda.wav") as w:
    voz = np.frombuffer(w.readframes(N), dtype=np.int16).astype(np.float32) / 32768
voz = np.pad(voz, (0, N - len(voz)))
voz = filt(voz, "high", 70) + 0.35 * filt(filt(voz, "low", 260), "high", 90)   # cuerpo grave
voz = voz - 0.25 * filt(voz, "high", 7500)                                    # suaviza sibilantes
lvl = np.sqrt(fftconvolve(voz ** 2, np.ones(2205) / 2205, "same").clip(0))
voz = voz / (1 + 2.2 * np.maximum(0, lvl - 0.12))                             # compresión suave
voz2 = reverb(np.stack([voz, voz]), 1.3, 0.09)
presente = fftconvolve((lvl > 0.01).astype(np.float32), np.hanning(int(SR * 0.9)) / (SR * 0.45), "same").clip(0, 1)
duck = 1 - 0.42 * presente

mm = musica / np.abs(musica).max()
mezcla = voz2 / np.abs(voz2).max() * 0.92 + mm * 0.50 * duck + sfx * 0.20 * (1 - 0.3 * presente)
fade = env_pts([(0, 0), (0.5, 1), (58.3, 1), (60, 0)])
mezcla *= fade
mezcla = np.tanh(mezcla * 1.15) / np.tanh(1.15)
mezcla /= np.abs(mezcla).max() / 0.89

def guardar(nombre, x):
    with wave.open(f"{sys.argv[1]}/{nombre}", "w") as w:
        w.setnchannels(2); w.setsampwidth(2); w.setframerate(SR)
        w.writeframes((np.clip(x.T, -1, 1) * 32767).astype(np.int16).tobytes())
guardar("mezcla.wav", mezcla)
guardar("musica_sola.wav", mm * 0.8 * fade)
print("ok")
