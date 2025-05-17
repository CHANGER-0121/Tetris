const socket = io("https://tetris-l8kg.onrender.com");   // ← backend URL
let currentRoomId = null;
let hasGameStarted = false;

const joinBtn         = document.getElementById("joinBtn");
const startBtn        = document.getElementById("startBtn");
const roomIdInput     = document.getElementById("roomId");
const playerNameInput = document.getElementById("playerName");

/* ───── JOIN ROOM ───── */
joinBtn.addEventListener("click", () => {
  const roomId     = roomIdInput.value.trim();
  const playerName = playerNameInput.value.trim();
  if (!roomId || !playerName) { alert("Please enter Name and Room ID"); return; }

  socket.emit("joinRoom", { roomId, playerName });
  currentRoomId = roomId;

  document.getElementById("joinDiv" ).classList.remove("active");
  document.getElementById("lobbyDiv").classList.add   ("active");
  document.getElementById("roomLabel").textContent = `Room: ${roomId}`;
});

/* ───── START GAME ───── */
startBtn.addEventListener("click", () => {
  if (currentRoomId) socket.emit("startGame", currentRoomId);
});

/* ───── SERVER EVENTS ───── */
socket.on("roomData", (players) => {
  renderOtherPlayers(players);
  if (Object.keys(players).length === 2) {
    startBtn.disabled = false;
    startBtn.textContent = "Start Game";
  } else {
    startBtn.disabled = true;
    startBtn.textContent = "Waiting for Player…";
  }
});

socket.on("gameStarted", () => {
  hasGameStarted = true;
  document.getElementById("lobbyDiv").classList.remove("active");
  document.getElementById("gameArea").classList.add   ("active");
  initGame();
});

/* ───── SEND STATE ───── */
function sendStateToServer() {
  if (currentRoomId && !isGameOver && hasGameStarted) {
    socket.emit("stateUpdate", {
      roomId: currentRoomId,
      state: { score, grid, currentPiece, currentRow, currentCol }
    });
  }
}

/* ───── OPPONENT RENDERING ───── */
function renderOtherPlayers(players) {
  const container = document.getElementById("otherPlayers");
  container.innerHTML = "";
  Object.entries(players).forEach(([id, p]) => {
    if (id === socket.id) return;
    const div = document.createElement("div");
    div.className = "playerPanel";
    div.innerHTML = `
      <p><strong>${p.name || id.slice(0,5)}</strong></p>
      <canvas id="opponent-${id}" width="300" height="600"></canvas>
    `;
    container.appendChild(div);
    if (p.grid) drawOpponentBoard(id, p);
  });
}

/* ───── DRAW OPPONENT BOARD ───── */
function drawOpponentBoard(id, p) {
  const canvas = document.getElementById(`opponent-${id}`);
  if (!canvas) return;
  const ctx = canvas.getContext("2d");
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  const size = 30, rows = p.grid.length, cols = p.grid[0].length;

  for (let r=0;r<rows;r++){
    for (let c=0;c<cols;c++){
      const cell = p.grid[r][c];
      if (cell){
        ctx.fillStyle = cell;
        ctx.fillRect(c*size, r*size, size, size);
        ctx.strokeStyle = "#000";
        ctx.strokeRect(c*size, r*size, size, size);
      }
    }
  }
  if (p.currentPiece){
    p.currentPiece.coords.forEach(([x,y])=>{
      const rr = p.currentRow + y, cc = p.currentCol + x;
      if (rr>=0 && rr<rows && cc>=0 && cc<cols){
        ctx.fillStyle = p.currentPiece.color;
        ctx.fillRect(cc*size, rr*size, size, size);
        ctx.strokeStyle="#000";
        ctx.strokeRect(cc*size, rr*size, size, size);
      }
    });
  }
}

/* ───── SHOW JOIN SCREEN ON LOAD ───── */
window.addEventListener("DOMContentLoaded", () => {
  document.getElementById("joinDiv").classList.add("active");
});
