# SPEC 02 — Destrucción de bloques con animación

> **Status:** Aprobado
> **Depends on:** SPEC 01
> **Date:** 2026-09-06
> **Objective:** Reemplazar la desaparición instantánea de un bloque roto por una animación de explosión usando los frames ya definidos en `assets/spritesheet.js`.

---

## Scope

**In:**

- Al romperse un bloque, en su lugar se reproduce la animación de explosión correspondiente a su color (`EXPLOSION_FRAMES[color]`), usando `drawFrame` y `EXPLOSION_DURATION` ya definidos en `assets/spritesheet.js`.
- El bloque deja de colisionar con la pelota en el mismo instante del impacto (como hoy); la animación es puramente visual y corre en paralelo al resto del juego.
- Soporte para múltiples animaciones de explosión simultáneas, sin límite, si se rompe más de un bloque en rápida sucesión.
- El overlay de "¡Ganaste!" espera a que termine la última animación de explosión pendiente antes de mostrarse.
- Al reiniciar la partida (botón "Reintentar"), cualquier animación de explosión en curso se descarta junto con el resto del estado.
- `break-sound.mp3` se sigue reproduciendo en el instante del impacto, sin cambios respecto al MVP.

**Out of scope (for future specs):**

- Nuevos tipos de animación (paleta, pelota, power-ups).
- Efectos de partículas o screen-shake adicionales a los frames ya provistos por el spritesheet.
- Límite configurable de animaciones simultáneas o cualquier optimización de rendimiento.
- Cambios al sistema de puntaje, vidas o layout de bloques.

---

## Data model

```js
// Nuevo arreglo en el state existente
state.explosions = [
  // { x, y, w, h, color, startTime }
];
```

Convenciones:

- Cada entrada representa una explosión activa en curso, con la posición y tamaño (`w`, `h`) que tenía el bloque roto y su `color` (para indexar `EXPLOSION_FRAMES`).
- `startTime` se toma con `performance.now()` en el momento en que el bloque es golpeado.
- El frame a dibujar se calcula en cada tick como `Math.min(3, Math.floor((performance.now() - startTime) / (EXPLOSION_DURATION / 4)))`, indexando `EXPLOSION_FRAMES[color][frameIndex]`.
- Una explosión se elimina de `state.explosions` cuando `performance.now() - startTime >= EXPLOSION_DURATION` (ciclo completo de 4 frames reproducido una sola vez, sin loop).
- El frame se dibuja con `drawFrame(ctx, frame, x, y, w, h)` estirado al tamaño original del bloque (`w`/`h` = `BLOCK_W`/`BLOCK_H`), no al tamaño nativo del frame (32×16).

---

## Implementation plan

1. Agregar `explosions: []` al objeto `state` inicial en `game.js`. Test manual: la página sigue cargando sin errores en consola.
2. En `checkBlockCollisions()` (`game.js:170`), en el mismo punto donde hoy se hace `block.alive = false`, agregar una entrada a `state.explosions` con `{ x: block.x, y: block.y, w: block.w, h: block.h, color: block.color, startTime: performance.now() }`. Test manual: al romper un bloque no cambia nada visible todavía (la animación aún no se dibuja).
3. Crear `updateExplosions()` que recorra `state.explosions` y descarte (filtre) las que ya cumplieron `EXPLOSION_DURATION`, y llamarla una vez por frame en el loop principal antes de `draw()`. Test manual: no hay errores en consola durante el juego.
4. En `draw()` (`game.js:239` en adelante), después de dibujar los bloques vivos, recorrer `state.explosions` calculando el frame correspondiente según `startTime` y dibujarlo con `drawFrame` en el tamaño del bloque. Test manual: al romper un bloque se ve la animación de explosión de su color en su lugar durante un instante breve, en vez de desaparecer de golpe.
5. Modificar la condición de victoria en `checkGameEnd()` (`game.js:221`) para que además de `state.blocks.every(block => !block.alive)` exija `state.explosions.length === 0`. Test manual: al romper el último bloque, el overlay de "¡Ganaste!" aparece recién cuando termina de reproducirse su explosión, no antes.
6. En `resetGame()` (`game.js:227`), vaciar `state.explosions = []` junto con el resto del reseteo de estado. Test manual: tras perder o ganar y presionar "Reintentar", no quedan explosiones fantasma dibujándose en la partida nueva.

---

## Acceptance criteria

- [ ] Al romper un bloque, se reproduce la animación de explosión de `EXPLOSION_FRAMES` correspondiente a su color en el lugar exacto del bloque, en vez de que este desaparezca instantáneamente.
- [ ] La animación se dibuja al tamaño del bloque roto (72×24), no al tamaño nativo del frame (32×16).
- [ ] El bloque deja de colisionar con la pelota desde el instante del impacto, aunque su animación siga en pantalla.
- [ ] Romper varios bloques en rápida sucesión muestra varias animaciones de explosión corriendo en simultáneo, sin errores en consola.
- [ ] `break-sound.mp3` sigue sonando en el instante del impacto, sin retraso.
- [ ] El overlay "¡Ganaste!" no aparece mientras quede alguna animación de explosión en curso; aparece apenas termina la última.
- [ ] Presionar "Reintentar" después de ganar o perder no deja animaciones de explosión residuales visibles en la partida nueva.

---

## Decisions

- **Sí:** usar los frames de explosión ya definidos en `assets/spritesheet.js` (`EXPLOSION_FRAMES`, `EXPLOSION_DURATION`, `drawFrame`) en vez de un efecto hecho a mano. El asset ya está listo exactamente para este propósito, según `CLAUDE.md`.
- **Sí:** el bloque deja de ser sólido en el instante del impacto, no al terminar la animación. Evita rebotes dobles si la pelota vuelve a pasar por la misma zona mientras dura la explosión (150ms).
- **Sí:** sin límite de animaciones simultáneas. Es el comportamiento esperado de Arkanoid y el volumen máximo (60 bloques) no representa un riesgo de rendimiento real.
- **Sí:** el sonido de rotura se mantiene en el instante del impacto, desacoplado de la animación visual. Simplicidad: no hay razón para sincronizarlo con el fin de la explosión.
- **Sí:** la animación se dibuja al tamaño del bloque (72×24) en vez de al tamaño nativo del frame (32×16). Consistencia visual con el tamaño que el bloque ocupaba en la grilla.
- **Sí:** el overlay de victoria espera a que termine la última explosión pendiente. Evita que el overlay tape la animación del último bloque roto.
- **Sí:** `resetGame()` limpia `state.explosions`. Evita animaciones fantasma de una partida anterior colándose en la siguiente.

---

## Risks

| Risk | Mitigation |
|------|------------|
| Si `resetGame()` no limpiara `state.explosions`, quedarían animaciones de una partida anterior dibujándose sobre bloques nuevos en la misma posición | Contemplado explícitamente en el paso 6 del plan de implementación. |
| Sin límite de animaciones simultáneas, un caso extremo (romper los 60 bloques en el mismo frame) podría acumular hasta 60 explosiones a la vez | Aceptado: el impacto visual/de rendimiento es mínimo para un canvas 2D de este tamaño; no se optimiza en este spec. |

---

## What is **not** in this spec

- Animaciones para otros elementos del juego (paleta, pelota, power-ups).
- Efectos de partículas, screen-shake u otros efectos visuales adicionales.
- Límite o pooling de animaciones simultáneas.
- Cambios a puntaje, vidas o layout de bloques.

Cada uno de estos, si se decide implementar, va en su propio spec.
