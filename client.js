const socket = io("https://tetris-l8kg.onrender.com");
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

function drawOpponentBoard(playerId, playerState) {
  let canvas = document.getElementById(`opponent-${playerId}`);
  if (!canvas) {
    canvas = document.createElement('canvas');
    canvas.id = `opponent-${playerId}`;
    canvas.width = 300;
    canvas.height = 600;
    canvas.style.border = '1px solid #000';
    canvas.style.margin = '10px';
    document.getElementById('otherPlayers').appendChild(canvas);
  }

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
