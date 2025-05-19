/****************************************************************
 * client.js  — Pause / Resume / End and Game Over dialog
 ****************************************************************/
const socket = io("https://tetris-l8kg.onrender.com");

let currentRoomId=null, hasGameStarted=false, gamePaused=false;

/* DOM refs */
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

/* Dialog buttons: both simply reload page for now */
restartBtn.addEventListener("click",()=> location.reload());
menuBtn.addEventListener("click",   ()=> location.reload());

function showGameOverDialog(){
  isGameOver=true; gamePaused=false;
  pauseBtn.style.display="none"; endBtn.style.display="none";
  modal.classList.add("active");
}

/* —— ROOM DATA —— */
socket.on("roomData",(players)=>{
  renderOtherPlayers(players);
  const ready = Object.keys(players).length===2;
  startBtn.disabled = !ready;
  startBtn.textContent = ready? "Start Game":"Waiting…";
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

/* —— Opponent rendering (unchanged) —— */
function renderOtherPlayers(players){
  const container=document.getElementById("otherPlayers");
  container.innerHTML="";
  Object.entries(players).forEach(([id,p])=>{
    if(id===socket.id) return;
    const wrap=document.createElement("div");
    wrap.className="playerPanel";
    wrap.innerHTML=`<p><strong>${p.name||id.slice(0,5)}</strong></p>
      <canvas id="opponent-${id}" width="300" height="600"></canvas>`;
    container.appendChild(wrap);
    if(p.grid) drawOpponentBoard(id,p);
  });
}
function drawOpponentBoard(id,p){
  const canvas=document.getElementById(`opponent-${id}`);
  if(!canvas) return;
  const ctx=canvas.getContext("2d"), size=30, rows=p.grid.length, cols=p.grid[0].length;
  ctx.clearRect(0,0,canvas.width,canvas.height);
  for(let r=0;r<rows;r++)for(let c=0;c<cols;c++){
    const cell=p.grid[r][c];
    if(cell){ctx.fillStyle=cell;ctx.fillRect(c*size,r*size,size,size);
             ctx.strokeStyle="#000";ctx.strokeRect(c*size,r*size,size,size);}
  }
  if(p.currentPiece){
    ctx.fillStyle=p.currentPiece.color;
    p.currentPiece.coords.forEach(([x,y])=>{
      const rr=p.currentRow+y, cc=p.currentCol+x;
      if(rr>=0&&rr<rows&&cc>=0&&cc<cols){
        ctx.fillRect(cc*size,rr*size,size,size);
        ctx.strokeStyle="#000";
        ctx.strokeRect(cc*size,rr*size,size,size);
      }
    });
  }
}

/* initial */
window.addEventListener("DOMContentLoaded",()=>
  document.getElementById("joinDiv").classList.add("active"));
