const ROWS = 20;
const COLS = 10;
const CELL_SIZE = 30;
const DROP_INTERVAL = 1000;

let canvas, ctx;
let grid, currentPiece, currentRow, currentCol;
let score = 0;
let isGameOver = false;

function createGrid() {
  return Array.from({ length: ROWS }, () => Array(COLS).fill(null));
}

function getRandomTetromino() {
  const tetrominoes = [
    { shape: [[0,0],[1,0],[2,0],[3,0]], color: 'cyan' },
    { shape: [[0,0],[1,0],[1,1],[2,1]], color: 'blue' },
    { shape: [[0,1],[1,1],[1,0],[2,0]], color: 'red' },
    { shape: [[0,0],[1,0],[2,0],[2,1]], color: 'orange' },
    { shape: [[0,0],[1,0],[2,0],[0,1]], color: 'purple' },
    { shape: [[0,0],[1,0],[0,1],[1,1]], color: 'yellow' },
    { shape: [[0,1],[1,0],[1,1],[2,1]], color: 'green' }
  ];
  const t = tetrominoes[Math.floor(Math.random() * tetrominoes.length)];
  return { coords: t.shape, color: t.color };
}

function initGame() {
  canvas = document.getElementById('tetris');
  ctx = canvas.getContext('2d');
  grid = createGrid();
  score = 0;
  isGameOver = false;
  spawnNewPiece();
  document.addEventListener('keydown', handleKey);
  setInterval(update, DROP_INTERVAL);

  // ✅ Prevent arrow keys and space from scrolling the page
  window.addEventListener('keydown', function(e) {
    const keysToBlock = ['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', ' '];
    if (keysToBlock.includes(e.key)) {
      e.preventDefault();
    }
  }, false);
}

function spawnNewPiece() {
  currentPiece = getRandomTetromino();
  currentRow = 0;
  currentCol = Math.floor(COLS / 2) - 1;
  if (!isValidPosition(currentPiece, currentRow, currentCol)) {
    isGameOver = true;
    document.getElementById('message').textContent = 'Game Over';
  }
}

function isValidPosition(piece, row, col) {
  return piece.coords.every(([x, y]) => {
    const r = row + y;
    const c = col + x;
    return r >= 0 && r < ROWS && c >= 0 && c < COLS && !grid[r][c];
  });
}

function lockPiece() {
  currentPiece.coords.forEach(([x, y]) => {
    const r = currentRow + y;
    const c = currentCol + x;
    if (r >= 0) grid[r][c] = currentPiece.color;
  });
}

function clearLines() {
  for (let r = ROWS - 1; r >= 0; r--) {
    if (grid[r].every(cell => cell)) {
      grid.splice(r, 1);
      grid.unshift(new Array(COLS).fill(null));
      score += 100;
      document.getElementById('score').textContent = `Score: ${score}`;
      r++;
    }
  }
}

function drawSquare(ctx, row, col, color) {
  ctx.fillStyle = color;
  ctx.fillRect(col * CELL_SIZE, row * CELL_SIZE, CELL_SIZE, CELL_SIZE);
  ctx.strokeStyle = 'black';
  ctx.strokeRect(col * CELL_SIZE, row * CELL_SIZE, CELL_SIZE, CELL_SIZE);
}

function draw() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  grid.forEach((row, r) => {
    row.forEach((cell, c) => {
      if (cell) drawSquare(ctx, r, c, cell);
    });
  });
  if (currentPiece) {
    currentPiece.coords.forEach(([x, y]) => {
      const r = currentRow + y;
      const c = currentCol + x;
      if (r >= 0) drawSquare(ctx, r, c, currentPiece.color);
    });
  }
}

function update() {
  if (isGameOver) return;
  if (isValidPosition(currentPiece, currentRow + 1, currentCol)) {
    currentRow++;
  } else {
    lockPiece();
    clearLines();
    spawnNewPiece();
  }
  draw();
  sendStateToServer();
}

function handleKey(event) {
  if (typeof hasGameStarted === 'undefined' || isGameOver || !hasGameStarted) return;

  switch (event.key) {
    case 'ArrowLeft':
      if (isValidPosition(currentPiece, currentRow, currentCol - 1)) {
        currentCol--;
      }
      break;
    case 'ArrowRight':
      if (isValidPosition(currentPiece, currentRow, currentCol + 1)) {
        currentCol++;
      }
      break;
    case 'ArrowDown':
      if (isValidPosition(currentPiece, currentRow + 1, currentCol)) {
        currentRow++;
      } else {
        lockPiece();
        clearLines();
        spawnNewPiece();
      }
      break;
    case 'ArrowUp':
      const rotated = currentPiece.coords.map(([x, y]) => [-y, x]);
      const original = currentPiece.coords;
      currentPiece.coords = rotated;
      if (!isValidPosition(currentPiece, currentRow, currentCol)) {
        currentPiece.coords = original;
      }
      break;
    case ' ':
      while (isValidPosition(currentPiece, currentRow + 1, currentCol)) {
        currentRow++;
      }
      lockPiece();
      clearLines();
      spawnNewPiece();
      break;
  }

  draw();
  sendStateToServer();
}
