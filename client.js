/****************************************************************
 * client.js  — Prompt when opponent leaves, scores per player
 ****************************************************************/
const socket = io();

/* flags */
let currentRoomId=null, hasGameStarted=false, gamePaused=false, opponentLeft=false;

/* DOM */
const joinBtn=document.getElementById("joinBtn"), startBtn=document.getElementById("startBtn");
const pauseBtn=document.getElementById("pauseBtn"), endBtn=document.getElementById("endBtn");
const modal=document.getElementById("gameOverModal"), restartBtn=document.getElementById("restartBtn");
const menuBtn=document.getElementById("menuBtn"), notice=document.getElementById("opponentLeftMsg");
const roomIdInput=document.getElementById("roomId"), nameInput=document.getElementById("playerName");

/* JOIN */
joinBtn.onclick=()=>{
  const room=roomIdInput.value.trim(), name=nameInput.value.trim();
  if(!room||!name){alert("Enter name & room");return;}
  socket.emit("joinRoom",{roomId:room,playerName:name});
  currentRoomId=room;
  document.getElementById("joinDiv").classList.remove("active");
  document.getElementById("lobbyDiv").classList.add("active");
  document.getElementById("roomLabel").textContent=`Room: ${room}`;
};

/* START */
startBtn.onclick=()=> currentRoomId&&socket.emit("startGame",currentRoomId);

/* PAUSE / RESUME */
pauseBtn.onclick=()=> currentRoomId&&hasGameStarted&&socket.emit(gamePaused?"resumeGame":"pauseGame",currentRoomId);
socket.on("pauseGame",()=>setPaused(true));
socket.on("resumeGame",()=>setPaused(false));
function setPaused(p){
  gamePaused=p;
  pauseBtn.textContent=p?"Resume game":"Pause game";
  endBtn.style.display=p?"inline-block":"none";
  document.getElementById("message").textContent=p?"Game Paused":"";
}

/* END GAME */
endBtn.onclick=()=> currentRoomId&&socket.emit("endGame",currentRoomId);
socket.on("endGame",showGameOver);

/* RESTART */
restartBtn.onclick=()=> currentRoomId&&socket.emit("restartGame",currentRoomId);
socket.on("gameRestart",()=>{
  modal.classList.remove("active"); notice.style.display=opponentLeft?"block":"none";
  resetLocalState(); initGame();
});

/* MAIN MENU */
menuBtn.onclick=()=> location.reload();

/* OPPONENT LEFT */
socket.on("opponentLeft",()=>{
  opponentLeft=true;
  notice.style.display="block";
});

/* ROOM DATA */
socket.on("roomData",players=>{
  renderOtherPlayers(players);
  const ready=Object.keys(players).length===2;
  startBtn.disabled=!ready;
  startBtn.textContent=ready?"Start Game":"Waiting…";
});

/* GAME STARTED */
socket.on("gameStarted",()=>{
  hasGameStarted=true;
  document.getElementById("lobbyDiv").classList.remove("active");
  document.getElementById("gameArea").classList.add("active");
  initGame();
});

/* Utils */
function showGameOver(){isGameOver=true;gamePaused=false;pauseBtn.style.display="none";endBtn.style.display="none";modal.classList.add("active");}
function resetLocalState(){grid=createGrid();score=0;isGameOver=false;document.getElementById("score").textContent="Score: 0";document.getElementById("message").textContent="";}

/* RENDER OPPONENTS WITH SCORE */
function renderOtherPlayers(players){
  const wrap=document.getElementById("otherPlayers");wrap.innerHTML="";
  Object.entries(players).forEach(([id,p])=>{
    if(id===socket.id) return;
    const div=document.createElement("div");
    div.className="playerPanel";
    div.innerHTML=`<p><strong>${p.name||id.slice(0,5)}</strong><br>Score: ${p.score||0}</p>
      <canvas id="opponent-${id}" width="300" height="600"></canvas>`;
    wrap.appendChild(div); if(p.grid) drawOpponentBoard(id,p);
  });
}

/* drawOpponentBoard unchanged (use previous impl) */

/* initial */
window.addEventListener("DOMContentLoaded",()=>document.getElementById("joinDiv").classList.add("active"));
