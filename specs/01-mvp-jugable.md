# SPEC 01 — MVP jugable de Arkanoid

> **Status:** Aprobado
> **Depends on:** Ninguno
> **Date:** 2026-09-03
> **Objective:** Construir una versión mínima pero completamente jugable de Arkanoid, con un único nivel, control de paleta por mouse y teclado, colisiones simples y puntaje básico.

---

## Scope

**In:**

- `index.html` con un `<canvas>` de 800×600px y el HUD (puntaje y vidas).
- Loop de juego (`requestAnimationFrame`) sobre `game.js`, construido encima de `assets/spritesheet.js`.
- Control de la paleta simultáneo por mouse (seguir posición X del mouse) y teclado (flechas izquierda/derecha o A/D).
- Un único layout de bloques fijo: grilla de 10 columnas × 6 filas.
- Física de rebote simple y predecible: velocidad de la pelota constante durante toda la partida (sin aceleración progresiva).
- Rebote pelota-paleta con ángulo según punto de impacto (estilo Arkanoid clásico: pegar cerca del borde angula más, pegar al centro rebota casi vertical).
- Rebote pelota-bloque simple (reflexión de eje básica, sin física de esquina fina).
- Puntaje plano: 10 puntos por bloque roto, sin variación por color.
- Sistema de 3 vidas. Perder la pelota (cae debajo de la paleta) resta una vida y reinicia pelota/paleta si quedan vidas.
- Overlay único de fin de partida (victoria al romper todos los bloques, o derrota al quedarse sin vidas) con botón "Reintentar" que reinicia el estado completo sin recargar la página.
- Sonidos existentes: `ball-bounce.mp3` en rebotes contra pared/paleta, `break-sound.mp3` al romper un bloque. Sin control de mute.
- `style.css` con layout básico centrando el canvas.

**Out of scope (for future specs):**

- Progresión multi-nivel (más de un layout de bloques).
- Power-ups.
- Persistencia de highscore (localStorage) entre sesiones.
- Pausa del juego.
- Control de mute/volumen para los sonidos.
- Pantallas separadas de victoria/derrota distintas del overlay (por ejemplo, menú principal).
- Velocidad de pelota creciente o dificultad dinámica.
- Bloques indestructibles o con múltiples golpes.
- Controles táctiles/mobile.

---

## Data model

```js
// Constantes de layout
const CANVAS_WIDTH = 800;
const CANVAS_HEIGHT = 600;

const ROWS = 6;
const COLS = 10;
const BLOCK_W = 72;
const BLOCK_H = 24;
const BLOCK_GAP = 8;
const GRID_MARGIN_TOP = 50;
const GRID_MARGIN_LEFT = 4;

// Colores de fila, puramente cosméticos (todos valen 10 puntos igual)
const ROW_COLORS = ['red', 'yellow', 'cyan', 'magenta', 'hotpink', 'green'];

const PADDLE_W = 100;
const PADDLE_H = 14;
const BALL_SIZE = 16;
const BALL_SPEED = 5; // px/frame, magnitud constante durante toda la partida
const MAX_BOUNCE_ANGLE = 60; // grados, usado en el rebote paleta

// Estado del juego
const state = {
  score: 0,
  lives: 3,
  status: 'playing', // 'playing' | 'won' | 'lost'
  paddle: { x: 350, y: 570, w: PADDLE_W, h: PADDLE_H },
  ball: { x: 400, y: 554, w: BALL_SIZE, h: BALL_SIZE, dx: 3, dy: -4 },
  blocks: [
    // { row, col, x, y, w, h, color, alive: true }
  ],
};
```

Convenciones:

- Origen de coordenadas: esquina superior izquierda.
- Velocidades en píxeles/frame.
- `blocks` se genera una vez al iniciar/reiniciar la partida a partir de `ROWS`, `COLS` y `ROW_COLORS`; cada bloque roto pasa `alive: false` y deja de dibujarse y de colisionar.
- El vector `(dx, dy)` de la pelota siempre se normaliza para que su magnitud sea `BALL_SPEED`, tanto en el rebote de paleta como en el de pared/bloque.

---

## Implementation plan

1. Crear `index.html` con el `<canvas id="game" width="800" height="600">`, elementos HUD (`#score`, `#lives`), y `<script>` tags cargando `assets/spritesheet.js` y luego `game.js`. Test manual: la página abre sin errores en consola y muestra un canvas vacío.
2. Crear `style.css` con fondo oscuro y el canvas centrado en la pantalla. Enlazarlo desde `index.html`.
3. En `game.js`, definir las constantes y el `state` inicial, llamar a `loadSpritesheet()` y arrancar un loop `requestAnimationFrame` que limpia el canvas y dibuja la paleta y la pelota estáticas con `drawSprite`. Test manual: se ven paleta y pelota en sus posiciones iniciales.
4. Implementar movimiento de paleta: listener de `mousemove` sobre el canvas que centra la paleta en la posición X del mouse, y listeners de teclado (`ArrowLeft`/`ArrowRight` o `A`/`D`) que mueven la paleta a velocidad constante; clamping a los bordes del canvas. Test manual: la paleta sigue al mouse y responde al teclado sin salirse del canvas.
5. Implementar movimiento de la pelota y rebote contra paredes (izquierda, derecha, arriba invierten `dx`/`dy` según corresponda), manteniendo `BALL_SPEED` constante. Test manual: la pelota se mueve y rebota contra los tres bordes.
6. Implementar colisión pelota-paleta: calcular el punto relativo de impacto, angular el rebote según `MAX_BOUNCE_ANGLE`, y reproducir `ball-bounce.mp3`. Test manual: la pelota rebota en distintos ángulos según dónde golpea la paleta, y se escucha el sonido.
7. Generar la grilla de 10×6 bloques en `state.blocks` usando `ROW_COLORS`, y dibujarla con `drawSprite('block_' + color, ...)`. Test manual: se ve la grilla completa con los colores por fila.
8. Implementar colisión pelota-bloque (AABB simple, invierte el eje correspondiente), marcar el bloque como `alive: false`, sumar 10 a `state.score`, actualizar el HUD y reproducir `break-sound.mp3`. Test manual: al romper un bloque, desaparece, el puntaje sube de a 10 y se escucha el sonido.
9. Implementar pérdida de vida: cuando `ball.y` supera `CANVAS_HEIGHT`, restar una vida, actualizar el HUD y, si quedan vidas, reiniciar posición de pelota y paleta y continuar el loop automáticamente. Test manual: al dejar caer la pelota, baja el contador de vidas y la pelota se reposiciona.
10. Implementar el overlay de fin de partida: si todos los bloques tienen `alive: false`, `status = 'won'`; si `lives === 0`, `status = 'lost'`. Mientras `status !== 'playing'`, pausar la actualización del loop y mostrar un overlay con el mensaje correspondiente y un botón "Reintentar" que reconstruye `state` desde cero (incluida la grilla de bloques) y vuelve a `status: 'playing'`. Test manual: romper todos los bloques muestra "¡Ganaste!" con botón funcional; quedarse sin vidas muestra "Game Over" con botón funcional.

---

## Acceptance criteria

- [ ] `index.html` carga sin errores en la consola del navegador.
- [ ] El spritesheet se carga (`loadSpritesheet`) y se ven los sprites de paleta, pelota y bloques.
- [ ] La paleta se mueve tanto con el mouse como con el teclado, sin salir de los límites del canvas.
- [ ] La pelota rebota contra las paredes izquierda, derecha y superior manteniendo velocidad constante.
- [ ] La pelota rebota contra la paleta con ángulo variable según el punto de impacto, y se escucha `ball-bounce.mp3`.
- [ ] La grilla inicial tiene exactamente 10×6 = 60 bloques visibles al empezar la partida.
- [ ] Romper un bloque lo hace desaparecer, suma exactamente 10 puntos al HUD y reproduce `break-sound.mp3`.
- [ ] Dejar caer la pelota debajo de la paleta resta exactamente una vida y reposiciona pelota y paleta si quedan vidas.
- [ ] Al llegar a 0 vidas aparece un overlay de "Game Over" con botón "Reintentar".
- [ ] Al romper los 60 bloques aparece un overlay de "¡Ganaste!" con botón "Reintentar".
- [ ] El botón "Reintentar" reinicia puntaje, vidas, posición de paleta/pelota y la grilla completa de bloques, sin recargar la página.

---

## Decisions

- **Sí:** control de paleta por mouse y teclado simultáneamente. El usuario lo pidió explícitamente para máxima accesibilidad de control.
- **Sí:** un único nivel fijo de 10×6 bloques. Suficiente para un MVP jugable; multi-nivel queda para un spec futuro.
- **Sí:** canvas fijo de 800×600px. Tamaño definido explícitamente por el usuario, sin necesidad de responsive.
- **Sí:** rebote pelota-paleta angulado según punto de impacto. Es la sensación clásica de Arkanoid y no agrega complejidad significativa sobre un rebote espejo.
- **Sí:** velocidad de pelota constante durante toda la partida. El usuario pidió física simple y predecible explícitamente.
- **Sí:** puntaje plano de 10 puntos por bloque, sin distinción por color. Decisión explícita del usuario para mantener el MVP simple.
- **Sí:** overlay único (victoria/derrota) con botón de reintentar, sin pantallas separadas. El usuario indicó que un overlay es "más que suficiente" para el MVP.
- **Sí:** sonidos activos sin control de mute. Los assets ya existen en el repo y agregarlos no suma complejidad; el mute queda fuera del MVP.
- **No:** highscore persistente (localStorage). Fuera de alcance del MVP, se resetea el puntaje al recargar.
- **No:** pausa del juego. Fuera de alcance del MVP.
- **No:** power-ups ni bloques indestructibles. Habría abierto un alcance mucho mayor; queda para specs futuros si se decide agregar.

---

## Risks

| Risk                                                                 | Mitigation                                                                                                     |
| --------------------------------------------------------------------| ---------------------------------------------------------------------------------------------------------------|
| Las políticas de autoplay del navegador pueden bloquear `play()` en el primer sonido si no hubo gesto de usuario previo | El primer movimiento de mouse/tecla ya cuenta como interacción en la mayoría de navegadores modernos antes del primer rebote; si algún navegador lo bloquea, el juego sigue funcionando visualmente sin sonido, sin romper el loop. |
| Colisión AABB simple puede sentirse "rara" en ángulos muy cerrados contra esquinas de bloques | Aceptado como parte de la física "simple y predecible" pedida para el MVP; se puede refinar en un spec futuro si hace falta. |

---

## What is **not** in this spec

- Progresión multi-nivel.
- Power-ups.
- Persistencia de highscore.
- Pausa del juego.
- Control de mute/volumen.
- Pantallas de menú separadas del overlay.
- Velocidad de pelota creciente.
- Bloques indestructibles o con múltiples golpes.
- Controles táctiles/mobile.

Cada uno de estos, si se decide implementar, va en su propio spec.
