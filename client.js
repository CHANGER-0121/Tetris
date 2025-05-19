/****************************************************************
 * client.js  — Pause / Resume / End / Restart logic
 ****************************************************************/
const socket = io("https://tetris-l8kg.onrender.com");

let currentRoomId=null, hasGameStarted=false, gamePaused=false;

/* DOM */
const joinBtn  = document.getElementById("joinBtn");
const startBtn = document.getElementById("startBtn");
const pauseBtn = document.getElementById("pauseBtn");
const endBtn   = document.getElementById("endBtn");
const modal    = document.getElementById("gameOverModal");
const restartBtn = document.getElementById("restartBtn");
const menuBtn    = document.getElementById("menuBtn");
const roomIdInput = document.getElementById("roomId");
const nameInput   = document.getElementById("playerName");

/* —— JOIN —— */
joinBtn.addEventListener("click",()=>{
  const room=roomIdInput.value.trim(), name=nameInput.value.trim();
  if(!room||!name){alert("Enter name & room");return;}
  socket.emit("joinRoom",{roomId:room,playerName:name});
  currentRoomId=room;
  document.getElementById("joinDiv").classList.remove("active");
  document.getElementById("lobbyDiv").classList.add("active");
  document.getElementById("roomLabel").textContent=`Room: ${room}`;
});

/* —— START —— */
startBtn.addEventListener("click",()=> currentRoomId && socket.emit("startGame",currentRoomId));

/* —— PAUSE / RESUME —— */
pauseBtn.addEventListener("click",()=>{
  if(!currentRoomId||!hasGameStarted)return;
  socket.emit(gamePaused?"resumeGame":"pauseGame",currentRoomId);
});
socket.on("pauseGame", ()=>setPaused(true));
socket.on("resumeGame",()=>setPaused(false));

function setPaused(p){
  gamePaused=p;
  pauseBtn.textContent = p? "Resume game" : "Pause game";
  endBtn.style.display = p? "inline-block" : "none";
  document.getElementById("message").textContent = p? "Game Paused" : "";
}

/* —— END GAME —— */
endBtn.addEventListener("click",()=> currentRoomId && socket.emit("endGame",currentRoomId));
socket.on("endGame", showGameOverDialog);

function showGameOverDialog(){
  isGameOver=true; gamePaused=false;
  pauseBtn.style.display="none"; endBtn.style.display="none";
  modal.classList.add("active");
}

/* —— RESTART —— */
restartBtn.addEventListener("click",()=>{
  if(currentRoomId) socket.emit("restartGame",currentRoomId);
});
socket.on("gameRestart",()=>{
  modal.classList.remove("active");
  resetLocalState();     // clear grids, score, board
  initGame();
});

/* —— MAIN MENU —— */
menuBtn.addEventListener("click",()=>location.reload());

/* —— ROOM DATA —— */
socket.on("roomData",(players)=>{
  renderOtherPlayers(players);
  const ready=Object.keys(players).length===2;
  startBtn.disabled=!ready;
  startBtn.textContent=ready?"Start Game":"Waiting…";
});

/* —— GAME STARTED —— */
socket.on("gameStarted",()=>{
  hasGameStarted=true;
  document.getElementById("lobbyDiv").classList.remove("active");
  document.getElementById("gameArea").classList.add("active");
  initGame();
});

/* —— SEND STATE —— */
function sendStateToServer(){
  if(currentRoomId&&!isGameOver&&hasGameStarted&&!gamePaused){
    socket.emit("stateUpdate",{roomId:currentRoomId,
      state:{score,grid,currentPiece,currentRow,currentCol}});
  }
}

/* —— Helpers to reset local board —— */
function resetLocalState(){
  grid = createGrid(); score=0; isGameOver=false;
  document.getElementById("score").textContent="Score: 0";
  document.getElementById("message").textContent="";
}

/* —— Opponent rendering stays unchanged —— */
function renderOtherPlayers(players){ /* … same as previous … */ }
function drawOpponentBoard(id,p){    /* … same as previous … */ }

/* initial */
window.addEventListener("DOMContentLoaded",()=>document.getElementById("joinDiv").classList.add("active"));
