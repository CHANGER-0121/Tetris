const socket = io("https://tetris-l8kg.onrender.com");
let currentRoomId = null;
let hasGameStarted = false;
let gamePaused      = false;          // ← NEW

const joinBtn         = document.getElementById("joinBtn");
const startBtn        = document.getElementById("startBtn");
const pauseBtn        = document.getElementById("pauseBtn");   // ← NEW
const roomIdInput     = document.getElementById("roomId");
const playerNameInput = document.getElementById("playerName");

/* ───── JOIN ROOM ───── */
joinBtn.addEventListener("click", () => {
  const roomId     = roomIdInput.value.trim();
  const playerName = playerNameInput.value.trim();
  if (!roomId || !playerName) { alert("Please enter Name and Room ID"); return; }

  socket.emit("joinRoom", { roomId, playerName });
  currentRoomId = roomId;

  document.getElementById("joinDiv").classList.remove("active");
  document.getElementById("lobbyDiv").classList.add("active");
  document.getElementById("roomLabel").textContent = `Room: ${roomId}`;
});

/* ───── START GAME ───── */
startBtn.addEventListener("click", () => {
  if (currentRoomId) socket.emit("startGame", currentRoomId);
});

/* ───── PAUSE / RESUME ───── */
pauseBtn.addEventListener("click", () => {
  if (!currentRoomId || !hasGameStarted) return;
  if (gamePaused){
    socket.emit("resumeGame", currentRoomId);
  }else{
    socket.emit("pauseGame", currentRoomId);
  }
});

/* handle incoming pause / resume */
socket.on("pauseGame", () => togglePause(true));
socket.on("resumeGame", () => togglePause(false));

function togglePause(shouldPause){
  gamePaused = shouldPause;
  pauseBtn.textContent = shouldPause ? "Resume" : "Pause";
  document.getElementById("message").textContent = shouldPause ? "Game Paused" : "";
}

/* ───── ROOM DATA ───── */
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

/* ───── GAME STARTED ───── */
socket.on("gameStarted", () => {
  hasGameStarted = true;
  document.getElementById("lobbyDiv").classList.remove("active");
  document.getElementById("gameArea").classList.add("active");
  initGame();
});

/* ───── SEND STATE ───── */
function sendStateToServer() {
  if (currentRoomId && !isGameOver && hasGameStarted && !gamePaused) {
    socket.emit("stateUpdate", {
      roomId: currentRoomId,
      state : { score, grid, currentPiece, currentRow, currentCol }
    });
  }
}

/* ───── RENDER OPPONENTS  ───── ... unchanged ... */
