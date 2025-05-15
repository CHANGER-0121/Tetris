const socket = io("https://tetris-l8kg.onrender.com"); // Replace with your Render backend URL if different
let currentRoomId = null;
let hasGameStarted = false;

const joinBtn = document.getElementById('joinBtn');
const startBtn = document.getElementById('startBtn');
const roomIdInput = document.getElementById('roomId');

joinBtn.addEventListener('click', () => {
  const roomId = roomIdInput.value.trim();
  if (roomId) {
    socket.emit('joinRoom', roomId);
    currentRoomId = roomId;
    document.getElementById('joinDiv').style.display = 'none';
    document.getElementById('lobbyDiv').style.display = 'block';
    document.getElementById('roomLabel').textContent = `Room: ${roomId}`;
  }
});

startBtn.addEventListener('click', () => {
  if (currentRoomId) {
    socket.emit('startGame', currentRoomId);
  }
});

socket.on('roomData', (players) => {
  renderOtherPlayers(players);
  if (Object.keys(players).length === 2) {
    startBtn.disabled = false;
    startBtn.textContent = 'Start Game';
  } else {
    startBtn.disabled = true;
    startBtn.textContent = 'Waiting for Player...';
  }
});

socket.on('gameStarted', () => {
  hasGameStarted = true;
  document.getElementById('lobbyDiv').style.display = 'none';
  document.getElementById('gameArea').style.display = 'block';
  initGame();
});

function sendStateToServer() {
  if (currentRoomId && !isGameOver && hasGameStarted) {
    socket.emit('stateUpdate', {
      roomId: currentRoomId,
      state: { score, grid, currentPiece, currentRow, currentCol }
    });
  }
}

function renderOtherPlayers(players) {
  const container = document.getElementById('otherPlayers');
  container.innerHTML = '';

  Object.entries(players).forEach(([id, playerState]) => {
    if (id === socket.id) return;

    const div = document.createElement('div');
    div.className = 'playerPanel';
    div.innerHTML = `
      <p><strong>Player:</strong> ${id.slice(0, 5)}...</p>
      <canvas id="opponent-${id}" width="300" height="600"></canvas>
    `;
    container.appendChild(div);

    if (playerState.grid) {
      drawOpponentBoard(id, playerState);
    }
  });
}

function drawOpponentBoard(playerId, playerState) {
  const canvas = document.getElementById(`opponent-${playerId}`);
  if (!canvas) return;

  const ctx = canvas.getContext('2d');
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  const cellSize = 30;
  const rows = playerState.grid.length;
  const cols = playerState.grid[0].length;

  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const cell = playerState.grid[r][c];
      if (cell) {
        ctx.fillStyle = cell;
        ctx.fillRect(c * cellSize, r * cellSize, cellSize, cellSize);
        ctx.strokeStyle = 'black';
        ctx.strokeRect(c * cellSize, r * cellSize, cellSize, cellSize);
      }
    }
  }

  if (playerState.currentPiece) {
    playerState.currentPiece.coords.forEach(([x, y]) => {
      const r = playerState.currentRow + y;
      const c = playerState.currentCol + x;
      if (r >= 0 && r < rows && c >= 0 && c < cols) {
        ctx.fillStyle = playerState.currentPiece.color;
        ctx.fillRect(c * cellSize, r * cellSize, cellSize, cellSize);
        ctx.strokeStyle = 'black';
        ctx.strokeRect(c * cellSize, r * cellSize, cellSize, cellSize);
      }
    });
  }
}
