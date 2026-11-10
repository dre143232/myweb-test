#!/usr/bin/env bash
# Reconstruye el video completo: voz -> música y mezcla -> fotogramas -> MP4.
# Requisitos: node 18+, python3 (numpy, scipy, piper-tts), ffmpeg, Playwright con Chromium.
set -euo pipefail
cd "$(dirname "$0")"
T=trabajo; mkdir -p "$T" salida
VOZ="$T/es_MX-ald-medium.onnx"
if [ ! -f "$VOZ" ]; then
  B=https://huggingface.co/rhasspy/piper-voices/resolve/main/es/es_MX/ald/medium/es_MX-ald-medium.onnx
  curl -L "$B" -o "$VOZ"; curl -L "$B.json" -o "$VOZ.json"
fi
npm install
python3 audio/narracion.py "$VOZ" "$T"          # voz + tiempos exactos
cp "$T/cues.json" subtitulos/cues.json
python3 audio/musica.py "$T"                    # música original, efectos y mezcla
N=${WORKERS:-4}; PER=$((1800 / N))
for i in $(seq 0 $((N - 1))); do node render.mjs --from $((i * PER)) --to $(((i + 1) * PER)) --out "$T/frames" & done; wait
ffmpeg -y -framerate 30 -i "$T/frames/f%05d.jpg" -i "$T/mezcla.wav" \
  -c:v libx264 -preset slow -crf 17 -profile:v high -pix_fmt yuv420p -color_primaries bt709 -color_trc bt709 -colorspace bt709 \
  -af "loudnorm=I=-14:TP=-1.5:LRA=11" -c:a aac -b:a 192k -ar 48000 -movflags +faststart -t 60 \
  -metadata title="Dios está contigo en la tormenta" -metadata comment="Isaías 43:2 (RV1909)" \
  salida/dios-esta-contigo.mp4
echo "Listo: salida/dios-esta-contigo.mp4"
