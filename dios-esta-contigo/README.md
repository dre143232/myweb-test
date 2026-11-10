# Dios está contigo en la tormenta

Cortometraje cristiano animado en 3D, vertical (1080 × 1920, 60 s, 30 fps), basado en
**Isaías 43:2 (Reina-Valera 1909)**, listo para TikTok, Reels, Facebook y YouTube Shorts.

**Video final:** [`salida/dios-esta-contigo.mp4`](salida/dios-esta-contigo.mp4)

## Qué hay aquí

| Ruta | Contenido |
|---|---|
| `salida/dios-esta-contigo.mp4` | Video terminado, con narración, música, efectos y subtítulos incrustados. Sin marcas de agua. |
| `salida/dios-esta-contigo_audio.wav` | Mezcla final de audio (voz + música + efectos). |
| `salida/musica_original.wav` | La música sola (piano y cuerdas). |
| `salida/portada.jpg` | Fotograma de portada. |
| `subtitulos/` | Subtítulos `.srt` y `.vtt` sincronizados y `cues.json` con los tiempos exactos de cada frase. |
| `docs/GUION_Y_STORYBOARD.md` | Guion, storyboard plano a plano y decisiones de dirección. |
| `docs/PROMPTS_GENERADOR_IA.md` | Prompts por plano para rehacer la imagen con un generador de video con IA. |
| `anim/` | La animación 3D (Three.js): personaje, cinco escenas, cámara, shaders de agua, fuego, lluvia y cielo. |
| `audio/` | Síntesis de la narración y composición de la música y los efectos. |
| `render.mjs`, `construir.sh` | Render fotograma a fotograma y montaje final con ffmpeg. |

## Cómo está hecho

- **Animación real, no imágenes fijas:** todo se dibuja en 3D en tiempo de render. El personaje es un
  único modelo articulado (camina, se sienta, respira, parpadea, llora, sonríe, levanta los brazos) y
  es el mismo en las cinco escenas. Lluvia, río, llamas, pavesas, hierba, nubes y aves están animados;
  la cámara hace travellings, grúas y primeros planos.
- **Narración:** voz masculina mexicana sintetizada con Piper (`es_MX-ald-medium`), bajada ligeramente
  de tono para darle calidez. Es voz sintética, no un locutor humano.
- **Música original:** piano y cuerdas sintetizados con numpy a partir de una partitura escrita para
  este video (Re menor → Fa mayor). No usa ningún material de terceros.
- **Subtítulos:** cada frase se sintetiza por separado, así que el subtítulo entra exactamente cuando
  empieza la voz.

## Reconstruir

```bash
./construir.sh          # descarga la voz, sintetiza el audio, renderiza 1800 fotogramas y monta el MP4
node render.mjs --still 5,30,58 --out trabajo/pruebas   # fotogramas sueltos para revisar
```

Requiere Node 18+, Python 3 (`numpy`, `scipy`, `piper-tts`), ffmpeg y Playwright con Chromium.
El render completo tarda unos 25 minutos en 4 núcleos sin GPU.

## Licencias

Texto bíblico Reina-Valera 1909: dominio público. Tipografías Montserrat y Playfair Display: SIL OFL.
Voz Piper `es_MX-ald`: ver la ficha del modelo en `rhasspy/piper-voices`. Three.js: MIT.
