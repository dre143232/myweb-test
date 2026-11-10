"""Sintetiza la narración (Piper, voz masculina es_MX) frase por frase y
genera la pista de voz + los tiempos exactos para subtítulos y animación.
Uso: python3 audio/narracion.py <ruta_modelo.onnx> <dir_trabajo>
"""
import json, subprocess, sys, wave, os
import numpy as np

SR = 44100
# (escena, inicio_escena_s, subtítulo, texto hablado, pausa posterior)
FRASES = [
 (1, 1.3, "Hay momentos en la vida", "Hay momentos en la vida,", 0.10),
 (1, None, "cuando sentimos que las fuerzas se nos terminan…", "cuando sentimos que las fuerzas se nos terminan.", 0),
 (2, 10.7, "Las dificultades llegan,", "Las dificultades llegan,", 0.22),
 (2, None, "las puertas se cierran", "las puertas se cierran,", 0.12),
 (2, None, "y pensamos que estamos solos…", "y pensamos que estamos solos.", 0),
 (3, 21.0, "Pero Dios nos dejó una promesa", "Pero Dios nos dejó una promesa,", 0.05),
 (3, None, "en Isaías 43:2:", "en Isaías cuarenta y tres, dos.", 0.55),
 (3, None, "Cuando pasares por las aguas,", "Cuando pasares por las aguas,", 0.18),
 (3, None, "yo seré contigo;", "yo seré contigo;", 0.40),
 (3, None, "y por los ríos, no te anegarán.", "y por los ríos, no te anegarán.", 0),
 (4, 36.2, "Cuando pasares por el fuego,", "Cuando pasares por el fuego,", 0.25),
 (4, None, "no te quemarás,", "no te quemarás,", 0.30),
 (4, None, "ni la llama arderá en ti.", "ni la llama arderá en ti.", 0),
 (5, 47.6, "Recuerda:", "Recuerda:", 0.30),
 (5, None, "la prueba no significa que Dios te abandonó.", "la prueba no significa que Dios te abandonó.", 0.45),
 (5, None, "Aunque el camino sea difícil,", "Aunque el camino sea difícil,", 0.15),
 (5, None, "Él sigue contigo.", "Él sigue contigo.", 0.50),
 (5, None, "¡No pierdas la fe!", "¡No pierdas la fe!", 0),
]

def synth(model, text, path):
    subprocess.run([sys.executable, "-m", "piper", "-m", model, "-f", path,
                    "--length-scale", "1.10", "--noise-scale", "0.75", "--noise-w-scale", "0.9"],
                   input=text.encode(), check=True, capture_output=True)
    # Voz más grave y cálida: baja ~6 % el tono conservando el timbre natural
    out = path.replace(".wav", "_p.wav")
    subprocess.run(["ffmpeg", "-y", "-v", "error", "-i", path, "-af",
        "asetrate=22050*0.94,aresample=%d,atempo=1.02,"
        "silenceremove=start_periods=1:start_threshold=-45dB,areverse,"
        "silenceremove=start_periods=1:start_threshold=-45dB,areverse" % SR,
        "-ac", "1", out], check=True)
    with wave.open(out) as w:
        a = np.frombuffer(w.readframes(w.getnframes()), dtype=np.int16).astype(np.float32) / 32768
    return a

def main():
    model, work = sys.argv[1], sys.argv[2]
    os.makedirs(work, exist_ok=True)
    track = np.zeros(SR * 60, dtype=np.float32)
    t, cues = 0.0, []
    for i, (esc, ini, sub, txt, pausa) in enumerate(FRASES):
        if ini is not None:
            t = ini
        a = synth(model, txt, f"{work}/f{i:02d}.wav")
        a /= max(1e-6, np.abs(a).max()) / 0.9
        n0 = int(t * SR)
        track[n0:n0 + len(a)] += a
        dur = len(a) / SR
        cues.append({"escena": esc, "inicio": round(t, 3), "fin": round(t + dur, 3), "texto": sub})
        t += dur + pausa
    json.dump(cues, open(f"{work}/cues.json", "w"), ensure_ascii=False, indent=1)
    with wave.open(f"{work}/voz_cruda.wav", "w") as w:
        w.setnchannels(1); w.setsampwidth(2); w.setframerate(SR)
        w.writeframes((np.clip(track, -1, 1) * 32767).astype(np.int16).tobytes())
    for c in cues: print(c)

main()
