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
const PADDLE_SPEED = 7; // px/frame, movimiento por teclado
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

const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');
const scoreEl = document.getElementById('score');
const livesEl = document.getElementById('lives');
const overlayEl = document.getElementById('overlay');
const overlayMessageEl = document.getElementById('overlay-message');
const retryBtn = document.getElementById('retry-btn');

function updateHUD() {
  scoreEl.textContent = 'Puntaje: ' + state.score;
  livesEl.textContent = 'Vidas: ' + state.lives;
}

function showOverlay(message) {
  overlayMessageEl.textContent = message;
  overlayEl.classList.remove('hidden');
}

function hideOverlay() {
  overlayEl.classList.add('hidden');
}

const ballBounceSound = new Audio('assets/sounds/ball-bounce.mp3');
const breakSound = new Audio('assets/sounds/break-sound.mp3');

function playSound(audio) {
  audio.currentTime = 0;
  audio.play().catch(() => {});
}

const keys = { left: false, right: false };

function clampPaddleX(x) {
  return Math.max(0, Math.min(CANVAS_WIDTH - state.paddle.w, x));
}

canvas.addEventListener('mousemove', (e) => {
  const rect = canvas.getBoundingClientRect();
  const mouseX = e.clientX - rect.left;
  state.paddle.x = clampPaddleX(mouseX - state.paddle.w / 2);
});

window.addEventListener('keydown', (e) => {
  if (e.key === 'ArrowLeft' || e.key === 'a' || e.key === 'A') keys.left = true;
  if (e.key === 'ArrowRight' || e.key === 'd' || e.key === 'D') keys.right = true;
});

window.addEventListener('keyup', (e) => {
  if (e.key === 'ArrowLeft' || e.key === 'a' || e.key === 'A') keys.left = false;
  if (e.key === 'ArrowRight' || e.key === 'd' || e.key === 'D') keys.right = false;
});

function updatePaddleKeyboard() {
  if (keys.left) state.paddle.x = clampPaddleX(state.paddle.x - PADDLE_SPEED);
  if (keys.right) state.paddle.x = clampPaddleX(state.paddle.x + PADDLE_SPEED);
}

function updateBall() {
  const ball = state.ball;
  ball.x += ball.dx;
  ball.y += ball.dy;

  if (ball.x <= 0) {
    ball.x = 0;
    ball.dx = Math.abs(ball.dx);
    playSound(ballBounceSound);
  } else if (ball.x + ball.w >= CANVAS_WIDTH) {
    ball.x = CANVAS_WIDTH - ball.w;
    ball.dx = -Math.abs(ball.dx);
    playSound(ballBounceSound);
  }

  if (ball.y <= 0) {
    ball.y = 0;
    ball.dy = Math.abs(ball.dy);
    playSound(ballBounceSound);
  }
}

function checkPaddleCollision() {
  const ball = state.ball;
  const paddle = state.paddle;

  const overlaps =
    ball.x < paddle.x + paddle.w &&
    ball.x + ball.w > paddle.x &&
    ball.y < paddle.y + paddle.h &&
    ball.y + ball.h > paddle.y;

  if (!overlaps || ball.dy <= 0) return;

  const ballCenterX = ball.x + ball.w / 2;
  const paddleCenterX = paddle.x + paddle.w / 2;
  const relativeIntersect = (ballCenterX - paddleCenterX) / (paddle.w / 2);
  const clampedRelative = Math.max(-1, Math.min(1, relativeIntersect));
  const angleRad = clampedRelative * (MAX_BOUNCE_ANGLE * Math.PI / 180);

  ball.dx = BALL_SPEED * Math.sin(angleRad);
  ball.dy = -BALL_SPEED * Math.cos(angleRad);
  ball.y = paddle.y - ball.h;

  playSound(ballBounceSound);
}

function generateBlocks() {
  const blocks = [];
  for (let row = 0; row < ROWS; row++) {
    for (let col = 0; col < COLS; col++) {
      blocks.push({
        row,
        col,
        x: GRID_MARGIN_LEFT + col * (BLOCK_W + BLOCK_GAP),
        y: GRID_MARGIN_TOP + row * (BLOCK_H + BLOCK_GAP),
        w: BLOCK_W,
        h: BLOCK_H,
        color: ROW_COLORS[row],
        alive: true,
      });
    }
  }
  return blocks;
}

state.blocks = generateBlocks();

function checkBlockCollisions() {
  const ball = state.ball;

  for (const block of state.blocks) {
    if (!block.alive) continue;

    const overlapX = ball.x < block.x + block.w && ball.x + ball.w > block.x;
    const overlapY = ball.y < block.y + block.h && ball.y + ball.h > block.y;
    if (!overlapX || !overlapY) continue;

    block.alive = false;
    state.score += 10;
    updateHUD();
    playSound(breakSound);

    const overlapLeft = (ball.x + ball.w) - block.x;
    const overlapRight = (block.x + block.w) - ball.x;
    const overlapTop = (ball.y + ball.h) - block.y;
    const overlapBottom = (block.y + block.h) - ball.y;

    const minOverlapX = Math.min(overlapLeft, overlapRight);
    const minOverlapY = Math.min(overlapTop, overlapBottom);

    if (minOverlapX < minOverlapY) {
      ball.dx = -ball.dx;
    } else {
      ball.dy = -ball.dy;
    }

    break;
  }
}

function resetBallAndPaddle() {
  state.paddle.x = 350;
  state.paddle.y = 570;
  state.ball.x = 400;
  state.ball.y = 554;
  state.ball.dx = 3;
  state.ball.dy = -4;
}

function checkBallLost() {
  const ball = state.ball;
  if (ball.y <= CANVAS_HEIGHT) return;

  state.lives -= 1;
  updateHUD();

  if (state.lives > 0) {
    resetBallAndPaddle();
  }
}

function checkGameEnd() {
  if (state.lives <= 0) {
    state.status = 'lost';
    showOverlay('Game Over');
    return;
  }

  if (state.blocks.every((block) => !block.alive)) {
    state.status = 'won';
    showOverlay('¡Ganaste!');
  }
}

function resetGame() {
  state.score = 0;
  state.lives = 3;
  state.status = 'playing';
  resetBallAndPaddle();
  state.blocks = generateBlocks();
  updateHUD();
  hideOverlay();
}

retryBtn.addEventListener('click', resetGame);

function draw() {
  ctx.clearRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
  drawSprite(ctx, 'paddle', state.paddle.x, state.paddle.y, state.paddle.w, state.paddle.h);
  drawSprite(ctx, 'ball', state.ball.x, state.ball.y, state.ball.w, state.ball.h);
  for (const block of state.blocks) {
    if (!block.alive) continue;
    drawSprite(ctx, 'block_' + block.color, block.x, block.y, block.w, block.h);
  }
}

function loop() {
  if (state.status === 'playing') {
    updatePaddleKeyboard();
    updateBall();
    checkPaddleCollision();
    checkBlockCollisions();
    checkBallLost();
    checkGameEnd();
  }
  draw();
  requestAnimationFrame(loop);
}

loadSpritesheet(() => {
  requestAnimationFrame(loop);
});
