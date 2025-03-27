/////////////////////////////
// Socket.IO Setup
/////////////////////////////

const socket = io(); // Connect to the server

let currentRoomId = null;

// When "Join Room" button is clicked
document.getElementById('joinBtn').addEventListener('click', () => {
  const roomId = document.getElementById('roomId').value.trim();
  if (roomId) {
    socket.emit('joinRoom', roomId);
    currentRoomId = roomId;
    // Hide join UI, show game area
    document.getElementById('joinDiv').style.display = 'none';
    document.getElementById('gameArea').style.display = 'block';
    
    initGame();
  }
});

// Listen for room data updates from server
socket.on('roomData', (players) => {
  renderOtherPlayers(players);
});

// Show other players' data
function renderOtherPlayers(players) {
  const container = document.getElementById('otherPlayers');
  container.innerHTML = '';
  Object.entries(players).forEach(([id, pState]) => {
    // Skip if it's this client
    if (id === socket.id) return;
    const div = document.createElement('div');
    div.className = 'playerPanel';
    div.innerHTML = `
      <p><strong>Player:</strong> ${id}</p>
      <p><strong>Score:</strong> ${pState.score || 0}</p>
    `;
    container.appendChild(div);
  });
}

// Send local state to server
function sendStateToServer() {
  if (currentRoomId && !isGameOver) {
    socket.emit('stateUpdate', {
      roomId: currentRoomId,
      state: {
        score,
      }
    });
  }
}

/////////////////////////////
// Tetris Game Logic
/////////////////////////////

const COLS = 10;
const ROWS = 20;
const CELL_SIZE = 30;
const DROP_INTERVAL = 500;

const canvas = document.getElementById('tetris');
const ctx = canvas.getContext('2d');
const scoreElem = document.getElementById('score');
const messageElem = document.getElementById('message');

let grid = [];
let currentPiece = null;
let currentRow = 0;
let currentCol = 0;
let score = 0;
let isGameOver = false;
let isPaused = false;

let lastTime = 0;
let dropCounter = 0;

// Basic Tetris piece definitions
const TetrominoTypes = [
  { coords: [[0,1],[1,1],[2,1],[3,1]], color: 'cyan'    }, // I
  { coords: [[0,0],[1,0],[0,1],[1,1]], color: 'yellow'  }, // O
  { coords: [[0,1],[1,1],[2,1],[1,0]], color: 'magenta' }, // T
  { coords: [[0,1],[1,1],[1,0],[2,0]], color: 'green'   }, // S
  { coords: [[0,0],[1,0],[1,1],[2,1]], color: 'red'     }, // Z
  { coords: [[0,0],[0,1],[1,1],[2,1]], color: 'blue'    }, // J
  { coords: [[2,0],[0,1],[1,1],[2,1]], color: 'orange'  }  // L
];

function createGrid(r, c) {
  let arr = [];
  for (let i = 0; i < r; i++) {
    arr.push(new Array(c).fill(null));
  }
  return arr;
}

function getRandomTetromino() {
  const idx = Math.floor(Math.random() * TetrominoTypes.length);
  const piece = TetrominoTypes[idx];
  // Shallow clone coords
  const coords = piece.coords.map(block => [...block]);
  return { coords, color: piece.color };
}

function spawnNewPiece() {
  currentPiece = getRandomTetromino();
  currentRow = -1;
  currentCol = Math.floor(COLS/2) - 2;

  // Check immediate game over
  if (!isValidPosition(currentPiece, currentRow + 1, currentCol)) {
    isGameOver = true;
    messageElem.textContent = 'GAME OVER';
  }
}

function isValidPosition(piece, newRow, newCol) {
  for (let [x, y] of piece.coords) {
    let r = newRow + y;
    let c = newCol + x;
    // Check boundary
    if (c < 0 || c >= COLS || r >= ROWS) {
      return false;
    }
    // Check collision
    if (r >= 0 && grid[r][c]) {
      return false;
    }
  }
  return true;
}

function lockPiece() {
  for (let [x, y] of currentPiece.coords) {
    let r = currentRow + y;
    let c = currentCol + x;
    if (r >= 0) {
      grid[r][c] = currentPiece.color;
    }
  }
}

function clearLines() {
  let linesCleared = 0;
  for (let r = 0; r < ROWS; r++) {
    if (grid[r].every(cell => cell !== null)) {
      linesCleared++;
      // shift all above rows down
      for (let rowAbove = r; rowAbove > 0; rowAbove--) {
        grid[rowAbove] = [...grid[rowAbove - 1]];
      }
      grid[0] = new Array(COLS).fill(null);
    }
  }
  if (linesCleared) {
    score += linesCleared * 100;
    scoreElem.textContent = score;
  }
}

function rotatePiece(piece) {
  let rotatedCoords = [];
  for (let [x, y] of piece.coords) {
    rotatedCoords.push([y, -x]); // 90 deg rotation
  }
  return { coords: rotatedCoords, color: piece.color };
}

// Drawing
function draw() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  // Draw locked grid
  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS; c++) {
      if (grid[r][c]) {
        drawSquare(r, c, grid[r][c]);
      }
    }
  }

  // Draw current piece
  if (!isGameOver && currentPiece) {
    for (let [x, y] of currentPiece.coords) {
      let r = currentRow + y;
      let c = currentCol + x;
      if (r >= 0) {
        drawSquare(r, c, currentPiece.color);
      }
    }
  }
}

function drawSquare(row, col, color) {
  const x = col * CELL_SIZE;
  const y = row * CELL_SIZE;
  ctx.fillStyle = color;
  ctx.fillRect(x, y, CELL_SIZE, CELL_SIZE);

  ctx.strokeStyle = '#000';
  ctx.strokeRect(x, y, CELL_SIZE, CELL_SIZE);
}

// Game loop
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
  sendStateToServer(); // send updated score, etc.
  requestAnimationFrame(update);
}

// Controls
document.addEventListener('keydown', (e) => {
  if (isGameOver) return;
  if (e.key === 'p' || e.key === 'P') {
    isPaused = !isPaused;
    messageElem.textContent = isPaused ? 'PAUSED' : '';
    return;
  }
  if (isPaused) return;

  switch (e.key) {
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
      }
      break;
    case 'ArrowUp':
      let rotated = rotatePiece(currentPiece);
      if (isValidPosition(rotated, currentRow, currentCol)) {
        currentPiece = rotated;
      }
      break;
    default:
      break;
  }
});

// Initialize the game once the player has joined a room
function initGame() {
  grid = createGrid(ROWS, COLS);
  score = 0;
  scoreElem.textContent = score;
  spawnNewPiece();
  requestAnimationFrame(update);
}