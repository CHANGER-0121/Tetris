/////////////////////////////
// Socket.IO Setup
/////////////////////////////

const socket = io("https://tetris-l8kg.onrender.com"); // ✅ Updated for deployed backend

let currentRoomId = null;

document.getElementById('joinBtn').addEventListener('click', () => {
  const roomId = document.getElementById('roomId').value.trim();
  if (roomId) {
    socket.emit('joinRoom', roomId);
    currentRoomId = roomId;
    document.getElementById('joinDiv').style.display = 'none';
    document.getElementById('gameArea').style.display = 'block';
    initGame();
  }
});

// Listen for detailed room updates
socket.on('roomData', (players) => {
  renderOtherPlayers(players);
});

function renderOtherPlayers(players) {
  const container = document.getElementById('otherPlayers');
  container.innerHTML = '';

  Object.entries(players).forEach(([id, pState]) => {
    if (id === socket.id) return;

    const div = document.createElement('div');
    div.className = 'playerPanel';

    div.innerHTML = `
      <p><strong>Player:</strong> ${id}</p>
      <p><strong>Score:</strong> ${pState.score || 0}</p>
      <canvas id="canvas-${id}" width="${CELL_SIZE * COLS}" height="${CELL_SIZE * ROWS}"></canvas>
    `;

    container.appendChild(div);

    if (pState.grid) {
      drawOpponentBoard(`canvas-${id}`, pState.grid, pState.currentPiece, pState.currentRow, pState.currentCol);
    }
  });
}

// Send complete state to server
function sendStateToServer() {
  if (currentRoomId && !isGameOver) {
    socket.emit('stateUpdate', {
      roomId: currentRoomId,
      state: {
        score,
        grid,
        currentPiece,
        currentRow,
        currentCol
      }
    });
  }
}

/////////////////////////////
// Multiplayer rendering logic
/////////////////////////////

function drawOpponentBoard(canvasId, boardGrid, piece, pieceRow, pieceCol) {
  const canvas = document.getElementById(canvasId);
  const ctx = canvas.getContext('2d');

  ctx.clearRect(0, 0, canvas.width, canvas.height);

  boardGrid.forEach((row, r) => {
    row.forEach((cell, c) => {
      if (cell) drawOpponentSquare(ctx, r, c, cell);
    });
  });

  if (piece) {
    piece.coords.forEach(([x, y]) => {
      let r = pieceRow + y;
      let c = pieceCol + x;
      if (r >= 0) drawOpponentSquare(ctx, r, c, piece.color);
    });
  }
}

function drawOpponentSquare(ctx, row, col, color) {
  ctx.fillStyle = color;
  ctx.fillRect(col * CELL_SIZE, row * CELL_SIZE, CELL_SIZE, CELL_SIZE);
  ctx.strokeRect(col * CELL_SIZE, row * CELL_SIZE, CELL_SIZE, CELL_SIZE);
}

/////////////////////////////
// Existing Tetris Game Logic (Unchanged)
// (Keep existing Tetris logic intact)
/////////////////////////////

const COLS = 10, ROWS = 20, CELL_SIZE = 30, DROP_INTERVAL = 500;
const canvas = document.getElementById('tetris');
const ctx = canvas.getContext('2d');
const scoreElem = document.getElementById('score');
const messageElem = document.getElementById('message');

let grid = [], currentPiece, currentRow, currentCol, score = 0;
let isGameOver = false, isPaused = false, lastTime = 0, dropCounter = 0;

// ... Existing Tetris logic functions remain unchanged: 
// createGrid, getRandomTetromino, spawnNewPiece, isValidPosition, 
// lockPiece, clearLines, rotatePiece, draw, drawSquare, update, 
// event listeners, and initGame.

/////////////////////////////
// Modified Game Loop
/////////////////////////////

function update(time = 0) {
  if (isGameOver) {
    draw();
    sendStateToServer();
    return;
  }

  const delta = time - lastTime;
  lastTime = time;

  if (!isPaused) {
    dropCounter += delta;
    if (dropCounter > DROP_INTERVAL) {
      dropCounter = 0;
      if (isValidPosition(currentPiece, currentRow + 1, currentCol)) {
        currentRow++;
      } else {
        lockPiece();
        clearLines();
        spawnNewPiece();
      }
    }
  }

  draw();
  sendStateToServer(); // sends full state to server (grid & current piece)
  requestAnimationFrame(update);
}
