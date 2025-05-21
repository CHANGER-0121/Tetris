/****************************************************************
 * client.js  — Pause / Resume / End / Restart + opponent-left
 * Entire file wrapped in DOMContentLoaded.
 ****************************************************************/
document.addEventListener("DOMContentLoaded", () => {
  const socket = io();

  let currentRoomId = null;
  let hasGameStarted = false;
  let gamePaused = false;
  let opponentLeft = false;

  /* DOM refs */
  const joinBtn      = document.getElementById("joinBtn");
  const startBtn     = document.getElementById("startBtn");
  const pauseBtn     = document.getElementById("pauseBtn");
  const endBtn       = document.getElementById("endBtn");
  const modal        = document.getElementById("gameOverModal");
  const restartBtn   = document.getElementById("restartBtn");
  const menuBtn      = document.getElementById("menuBtn");
  const notice       = document.getElementById("opponentLeftMsg");
  const roomIdInput  = document.getElementById("roomId");
  const nameInput    = document.getElementById("playerName");
  const myNameLabel  = document.getElementById("myName");

  /* ─── JOIN ─── */
  joinBtn.onclick = () => {
    const room = roomIdInput.value.trim();
    const name = nameInput.value.trim();
    if (!room || !name) {
      alert("Enter name & room");
      return;
    }
    socket.emit("joinRoom", { roomId: room, playerName: name });
    currentRoomId = room;
    myNameLabel.textContent = name;

    document.getElementById("joinDiv").classList.remove("active");
    document.getElementById("lobbyDiv").classList.add("active");
    document.getElementById("roomLabel").textContent = `Room: ${room}`;
  };

  /* ─── START ─── */
  startBtn.onclick = () =>
    currentRoomId && socket.emit("startGame", currentRoomId);

  /* ─── PAUSE / RESUME ─── */
  pauseBtn.onclick = () => {
    if (!currentRoomId || !hasGameStarted) return;
    socket.emit(gamePaused ? "resumeGame" : "pauseGame", currentRoomId);
  };
  socket.on("pauseGame", () => setPaused(true));
  socket.on("resumeGame", () => setPaused(false));

  function setPaused(paused) {
    gamePaused = paused;
    pauseBtn.textContent = paused ? "Resume game" : "Pause game";
    endBtn.style.display = paused ? "inline-block" : "none";
    document.getElementById("message").textContent = paused
      ? "Game Paused"
      : "";
  }

  /* ─── END GAME ─── */
  endBtn.onclick = () =>
    currentRoomId && socket.emit("endGame", currentRoomId);
  socket.on("endGame", showGameOver);

  function showGameOver() {
    isGameOver = true;
    gamePaused = false;
    pauseBtn.style.display = "none";
    endBtn.style.display = "none";
    modal.classList.add("active");
  }

  /* ─── RESTART ─── */
  restartBtn.onclick = () =>
    currentRoomId && socket.emit("restartGame", currentRoomId);
  socket.on("gameRestart", () => {
    modal.classList.remove("active");
    notice.style.display = opponentLeft ? "block" : "none";
    resetLocalState();
    initGame();
  });

  /* ─── MAIN MENU ─── */
  menuBtn.onclick = () => location.reload();

  /* ─── OPPONENT LEFT ─── */
  socket.on("opponentLeft", () => {
    opponentLeft = true;
    notice.style.display = "block";
  });

  /* ─── ROOM DATA ─── */
  socket.on("roomData", (players) => {
    renderOtherPlayers(players);
    const ready = Object.keys(players).length === 2;
    startBtn.disabled = !ready;
    startBtn.textContent = ready ? "Start Game" : "Waiting…";
  });

  /* ─── GAME STARTED ─── */
  socket.on("gameStarted", () => {
    hasGameStarted = true;
    document.getElementById("lobbyDiv").classList.remove("active");
    document.getElementById("gameArea").classList.add("active");
    initGame();
  });

  /* ─── UTILS ─── */
  function resetLocalState() {
    grid = createGrid();
    score = 0;
    isGameOver = false;
    document.getElementById("score").textContent = "Score: 0";
    document.getElementById("message").textContent = "";
  }

  /* ─── SEND STATE ─── */
  function sendStateToServer() {
    if (
      currentRoomId &&
      !isGameOver &&
      hasGameStarted &&
      !gamePaused &&
      typeof socket !== "undefined"
    ) {
      socket.emit("stateUpdate", {
        roomId: currentRoomId,
        state: { score, grid, currentPiece, currentRow, currentCol },
      });
    }
  }
  window.sendStateToServer = sendStateToServer;   // ★ expose globally

  /* ─── RENDER OTHER PLAYERS ─── */
  function renderOtherPlayers(players) {
    const container = document.getElementById("otherPlayers");
    container.innerHTML = "";
    Object.entries(players).forEach(([id, p]) => {
      if (id === socket.id) return;
      const div = document.createElement("div");
      div.className = "playerPanel";
      div.innerHTML = `
        <p><strong>${p.name || id.slice(0, 5)}</strong></p>
        <p class="panelLabel">Score: ${p.score || 0}</p>
        <canvas id="opponent-${id}" width="300" height="600"></canvas>
      `;
      container.appendChild(div);
      if (p.grid) drawOpponentBoard(id, p);
    });
  }
  window.renderOtherPlayers = renderOtherPlayers; // ★ expose globally

  /* ─── DRAW OPPONENT BOARD ─── */
  function drawOpponentBoard(id, p) {
    const canvas = document.getElementById(`opponent-${id}`);
    if (!canvas) return;

    const ctx  = canvas.getContext("2d");
    const size = 30;
    const rows = p.grid?.length || 0;
    const cols = rows ? p.grid[0].length : 0;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    /* fixed blocks */
    if (p.grid) {
      for (let r = 0; r < rows; ++r)
        for (let c = 0; c < cols; ++c)
          if (p.grid[r][c]) {
            ctx.fillStyle = p.grid[r][c];
            ctx.fillRect(c * size, r * size, size, size);
            ctx.strokeStyle = "#000";
            ctx.strokeRect(c * size, r * size, size, size);
          }
    }

    /* falling piece */
    if (p.currentPiece) {
      ctx.fillStyle = p.currentPiece.color || "#888";
      p.currentPiece.coords.forEach(([x, y]) => {
        const rr = p.currentRow + y,
              cc = p.currentCol + x;
        if (rr >= 0 && rr < rows && cc >= 0 && cc < cols) {
          ctx.fillRect(cc * size, rr * size, size, size);
          ctx.strokeStyle = "#000";
          ctx.strokeRect(cc * size, rr * size, size, size);
        }
      });
    }
  }
});
