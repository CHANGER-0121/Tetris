/***********************************************************************
 * game.js
 * Contains core Tetris logic including initGame and helper functions
 * **********************************************************************/

function createGrid() {
  const rows = [];
  for (let r = 0; r < ROWS; r++) {
    rows.push(new Array(COLS).fill(null));
  }
  return rows;
}

function getRandomTetromino() {
  const tetrominoes = [
    { shape: [[0,0],[1,0],[2,0],[3,0]], color: 'cyan' }, // I
    { shape: [[0,0],[1,0],[1,1],[2,1]], color: 'blue' }, // Z
    { shape: [[0,1],[1,1],[1,0],[2,0]], color: 'red' },  // S
    { shape: [[0,0],[1,0],[2,0],[2,1]], color: 'orange' }, // L
    { shape: [[0,0],[1,0],[2,0],[0,1]], color: 'purple' }, // J
    { shape: [[0,0],[1,0],[0,1],[1,1]], color: 'yellow' }, // O
    { shape: [[0,1],[1,0],[1,1],[2,1]], color: 'green' }  // T
  ];
  const t = tetrominoes[Math.floor(Math.random() * tetrominoes.length)];
  return { coords: t.shape, color: t.color };
}

function initGame() {
  grid = createGrid();
  score = 0;
  isGameOver = false;
  spawnNewPiece();
  update();
  document.addEventListener('keydown', handleKey);
}

function spawnNewPiece() {
  currentPiece = getRandomTetromino();
  currentRow = 0;
  currentCol = Math.floor(COLS / 2) - 1;
  if (!isValidPosition(currentPiece, currentRow, currentCol)) {
    isGameOver = true;
    messageElem.textContent = 'Game Over';
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
      scoreElem.textContent = score;
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

function rotatePiece() {
  const rotated = currentPiece.coords.map(([x, y]) => [-y, x]);
  const original = currentPiece.coords;
  currentPiece.coords = rotated;
  if (!isValidPosition(currentPiece, currentRow, currentCol)) {
    currentPiece.coords = original;
  }
}

function handleKey(e) {
  if (isGameOver || isPaused) return;

  if (e.key === 'ArrowLeft' && isValidPosition(currentPiece, currentRow, currentCol - 1)) {
    currentCol--;
  } else if (e.key === 'ArrowRight' && isValidPosition(currentPiece, currentRow, currentCol + 1)) {
    currentCol++;
  } else if (e.key === 'ArrowDown' && isValidPosition(currentPiece, currentRow + 1, currentCol)) {
    currentRow++;
  } else if (e.key === 'ArrowUp') {
    rotatePiece();
  } else if (e.key === ' ') {
    while (isValidPosition(currentPiece, currentRow + 1, currentCol)) {
      currentRow++;
    }
  }
}
