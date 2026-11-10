# Prompts por escena para generadores de video con IA

El MP4 de `salida/` está renderizado por código (Three.js). Si quieres rehacer las imágenes con un
generador de video (Veo, Sora, Kling, Runway, Luma, Seedance…) para un acabado más cercano al de una
película de animación comercial, usa estos prompts y conserva **el mismo audio y subtítulos** de este
proyecto (`salida/dios-esta-contigo_audio.wav`, `subtitulos/*.srt`): los tiempos ya encajan.

## Cómo mantener al mismo personaje

1. Genera primero **una hoja de personaje** con el prompt de abajo y úsala como imagen de referencia
   en todos los clips (image-to-video / "character reference").
2. Copia el **bloque de personaje** sin cambiarlo al inicio de cada prompt.
3. Genera cada plano con la duración indicada y móntalos en orden; no generes texto dentro del video:
   los versículos y subtítulos se añaden en edición.

**Hoja de personaje (imagen):**
> Character turnaround sheet, front / three-quarter / side / back, stylized 3D animated family-film
> character, adult man around 30, large round head, short dark-brown hair with a soft side-swept fringe,
> big warm brown eyes, thin eyebrows, small round nose, light tan skin, gentle face. Teal-green zip
> jacket with a cream collar, dark navy jeans, brown boots. Neutral A-pose, soft studio lighting, plain
> light-grey background, subsurface skin shading, high-detail cloth, 3D render, no text.

**Bloque de personaje (pégalo en cada prompt):**
> The same stylized 3D animated man from the reference: around 30, large round head, short dark-brown
> hair with side-swept fringe, big warm brown eyes, light tan skin, teal-green zip jacket with cream
> collar, dark navy jeans, brown boots.

**Estilo común (pégalo al final de cada prompt):**
> Stylized 3D animated feature-film look, cinematic lighting, volumetric light, soft global
> illumination, expressive facial animation, natural body motion, shallow depth of field, vertical 9:16,
> 24–30 fps, no text, no watermark, no logos.

**Negativo:** photorealistic, live action, real person, 2D, anime, text, captions, watermark, logo,
extra fingers, deformed hands, face of God, religious figure with a face, gore, flicker, morphing.

## Planos

| # | Duración | Prompt (después del bloque de personaje) |
|---|---|---|
| 1 | 10 s | He sits alone on the edge of his bed in a dim bedroom at night, shoulders slumped, hands clasped, heavy rain streaming down the window behind him, cold blue moonlight and one warm bedside lamp, a small wooden cross on the wall. He sighs, a single tear rolls down his cheek, he slowly lifts his eyes. **Camera:** slow dolly-in from a wide shot to a close-up of his face. |
| 2A | 5 s | He walks against a violent night storm through a dark pine forest, leaning into the wind, one arm raised to shield his face, soaked, rain blowing sideways, pines bending, a lightning flash. **Camera:** handheld front three-quarter tracking shot moving backwards. |
| 2B | 5 s | He reaches the bank of a wide raging river at night in the storm and stops, looks left and right, then lowers his head in despair; lightning lights the foaming water. **Camera:** over-the-shoulder crane rising to reveal the full width of the river. |
| 3A | 2 s | The dark storm clouds part and a beautiful shaft of golden light descends from the sky onto the river bank. **Camera:** slow tilt up to the sky. |
| 3B | 3 s | Close-up: warm golden light falls on his face from above; his eyes widen, his brow relaxes, a small hopeful smile appears, rain easing. **Camera:** very slow push-in. |
| 3C | 10 s | He wades waist-deep across the raging river inside the shaft of golden light; rough waves crash around him but the water turns calm and golden where he walks and never knocks him down; he looks up, confident and peaceful. **Camera:** side tracking shot following him, rising at the end toward the light. |
| 4A | 6 s | He walks calmly along a narrow ash path between tall walls of fire; a soft dome of warm white-golden light surrounds him and the flames bend away without touching him; he glances at the flames, then looks ahead with a serene smile. **Camera:** low-angle front tracking shot. |
| 4B | 6 s | Seen from behind, he walks through a burning field toward a bright opening of daylight far ahead, a column of gentle light over him, glowing embers rising. **Camera:** crane up and forward from behind him. |
| 5A | 5 s | Sunrise after the storm: he climbs the last steps to the top of a lush green mountain covered in wildflowers, last grey clouds drifting away, a rainbow, birds, snowy peaks and a calm river valley far below. **Camera:** wide shot craning up to reveal the landscape. |
| 5B | 4 s | He looks up at the sky, breaks into a wide joyful smile and raises both hands in gratitude, closing his eyes for a moment; warm sun rim light. **Camera:** low-angle medium shot. |
| 5C | 4 s | He stands on the green summit with both arms raised to the bright morning sky, sun rays, rainbow and mountains around him; keep the upper half of the frame as open sky. **Camera:** slow pull-back and rise. |

## Audio (si prefieres regenerarlo)

- **Narrador (TTS):** voz masculina, 35–50 años, español latinoamericano neutro, timbre grave y cálido,
  ritmo pausado (~130 palabras/min), pausas tras «promesa» e «Isaías 43:2», sonrisa audible en la última
  frase. Texto exacto en `docs/GUION_Y_STORYBOARD.md`.
- **Música:** «Emotional cinematic piano and soft orchestral strings, 60 bpm, starts sparse and
  melancholic in D minor, strings enter at 0:20 with hope, builds from 0:35, resolves to a warm
  triumphant F major at 0:47, gentle sustained ending at 0:60, no vocals, no drums.»
- **Texto final (añadir en edición):** «DIOS ESTÁ CONTIGO ❤️» y «ISAÍAS 43:2».
