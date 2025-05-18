/*************************************************************************
 *  client.js  —  Multiplayer Tetris front-end
 *************************************************************************/

const socket = io("https://tetris-l8kg.onrender.com");   // ← update if backend URL differs

/* ──────────── GLOBAL STATE ──────────── */
let currentRoomId   = null;
let hasGameStarted  = false;
let gamePaused      = false;   // toggled by pause / resume

/* ──────────── DOM HANDLES ──────────── */
const joinBtn         = document.getElementById("joinBtn");
const startBtn        = document.getElementById("startBtn");
const pauseBtn        = document.getElementById("pauseBtn");
const roomIdInput     = document.getElementById("roomId");
const playerNameInput = document.getElementById("playerName");

/* ──────────── JOIN ROOM ──────────── */
joinBtn.addEventListener("click", () => {
  const roomId     = roomIdInput.value.trim();
  const playerName = playerNameInput.value.trim();

  if (!roomId || !playerName) {
    alert("Please enter Name and Room ID");
    return;
  }

  socket.emit("joinRoom", { roomId, playerName });
  currentRoomId = roomId;

  // screen transition: Join → Lobby
  document.getElementById("joinDiv" ).classList.remove("active");
  document.getElementById("lobbyDiv").classList.add   ("active");
  document.getElementById("roomLabel").textContent = `Room: ${roomId}`;
});

/* ──────────── START GAME ──────────── */
startBtn.addEventListener("click", () => {
  if (currentRoomId) socket.emit("startGame", currentRoomId);
});

/* ──────────── PAUSE / RESUME ──────────── */
pauseBtn.addEventListener("click", () => {
  if (!currentRoomId || !hasGameStarted) return;

  if (gamePaused) {
    socket.emit("resumeGame", currentRoomId);
  } else {
    socket.emit("pauseGame",  currentRoomId);
  }
});

/*  Broadcast received from server */
socket.on("pauseGame",  () => togglePause(true));
socket.on("resumeGame", () => togglePause(false));

function togglePause(shouldPause) {
  gamePaused = shouldPause;
  pauseBtn.textContent = shouldPause ? "Resume" : "Pause";
  document.getElementById("message").textContent =
    shouldPause ? "Game Paused" : "";
}

/* ──────────── ROOM DATA ──────────── */
socket.on("roomData", (players) => {
  renderOtherPlayers(players);

  // Enable start when exactly 2 players
  if (Object.keys(players).length === 2) {
    startBtn.disabled  = false;
    startBtn.textContent = "Start Game";
  } else {
    startBtn.disabled  = true;
    startBtn.textContent = "Waiting for Player…";
  }
});

/* ──────────── GAME STARTED ──────────── */
socket.on("gameStarted", () => {
  hasGameStarted = true;
  document.getElementById("lobbyDiv").classList.remove("active");
  document.getElementById("gameArea").classList.add   ("active");
  initGame();
});

/* ──────────── SEND GAME STATE ──────────── */
function sendStateToServer() {
  if (currentRoomId && !isGameOver && hasGameStarted && !gamePaused) {
    socket.emit("stateUpdate", {
      roomId: currentRoomId,
      state : { score, grid, currentPiece, currentRow, currentCol }
    });
  }
}

/* ──────────── RENDER OTHER PLAYERS ──────────── */
function renderOtherPlayers(players) {
  const container = document.getElementById("otherPlayers");
  container.innerHTML = "";   // clear existing

  Object.entries(players).forEach(([id, p]) => {
    if (id === socket.id) return;           // skip yourself

    // wrapper panel
    const wrapper = document.createElement("div");
    wrapper.className = "playerPanel";
    wrapper.innerHTML = `
      <p><strong>${p.name || id.slice(0,5)}</strong></p>
      <canvas id="opponent-${id}" width="300" height="600"></canvas>
    `;
    container.appendChild(wrapper);

    // draw their board
    if (p.grid) drawOpponentBoard(id, p);
  });
}

/* ──────────── DRAW OPPONENT BOARD ──────────── */
function drawOpponentBoard(playerId, p) {
  const canvas = document.getElementById(`opponent-${playerId}`);
  if (!canvas) return;

  const ctx      = canvas.getContext("2d");
  const cellSize = 30;
  const rows     = p.grid.length;
  const cols     = p.grid[0].length;

  ctx.clearRect(0, 0, canvas.width, canvas.height);

  // fixed blocks
  for (let r=0;r<rows;r++){
    for (let c=0;c<cols;c++){
      const cell = p.grid[r][c];
      if (cell){
        ctx.fillStyle = cell;
        ctx.fillRect(c*cellSize,r*cellSize,cellSize,cellSize);
        ctx.strokeStyle="#000";
        ctx.strokeRect(c*cellSize,r*cellSize,cellSize,cellSize);
      }
    }
  }
  // current falling piece
  if (p.currentPiece){
    ctx.fillStyle = p.currentPiece.color;
    p.currentPiece.coords.forEach(([x,y])=>{
      const rr = p.currentRow + y;
      const cc = p.currentCol + x;
      if (rr>=0 && rr<rows && cc>=0 && cc<cols){
        ctx.fillRect(cc*cellSize, rr*cellSize, cellSize, cellSize);
        ctx.strokeStyle="#000";
        ctx.strokeRect(cc*cellSize, rr*cellSize, cellSize, cellSize);
      }
    });
  }
}

/* ──────────── INITIAL SCREEN ──────────── */
window.addEventListener("DOMContentLoaded", () => {
  document.getElementById("joinDiv").classList.add("active");
});
