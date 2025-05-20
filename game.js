/* ──────────── CONFIG ──────────── */
const ROWS          = 20;
const COLS          = 10;
const CELL_SIZE     = 30;
const DROP_INTERVAL = 1000;   // ms

/* ──────────── STATE ──────────── */
let canvas, ctx;
let grid, currentPiece, currentRow, currentCol;
let score        = 0;
let isGameOver   = false;

/* ──────────── TETROMINO LIST ──────────── */
const PIECES = [
  { shape:[[0,0],[1,0],[2,0],[3,0]],           color:'cyan'   }, // I
  { shape:[[0,0],[1,0],[1,1],[2,1]],           color:'blue'   }, // Z
  { shape:[[0,1],[1,1],[1,0],[2,0]],           color:'red'    }, // S
  { shape:[[0,0],[1,0],[2,0],[2,1]],           color:'orange' }, // L
  { shape:[[0,0],[1,0],[2,0],[0,1]],           color:'purple' }, // J
  { shape:[[0,0],[1,0],[0,1],[1,1]],           color:'yellow' }, // O
  { shape:[[0,1],[1,0],[1,1],[2,1]],           color:'green'  }  // T
];

/* ──────────── INITIALISE ──────────── */
function initGame() {
  canvas = document.getElementById("tetris");
  ctx    = canvas.getContext("2d");
  grid   = createGrid();
  score  = 0;
  isGameOver = false;
  spawnNewPiece();

  document.addEventListener("keydown", handleKey);

  setInterval(update, DROP_INTERVAL);

  // prevent arrow keys from scrolling page
  window.addEventListener("keydown", (e)=>{
    if (["ArrowUp","ArrowDown","ArrowLeft","ArrowRight"," "].includes(e.key))
      e.preventDefault();
  });
}

/* ──────────── GRID & PIECES ──────────── */
function createGrid() {
  return Array.from({length:ROWS}, ()=>Array(COLS).fill(null));
}
function randomPiece() {
  const t = PIECES[Math.floor(Math.random()*PIECES.length)];
  return { coords: t.shape.map(([x,y])=>[x,y]), color: t.color };
}
function spawnNewPiece() {
  currentPiece = randomPiece();
  currentRow   = 0;
  currentCol   = Math.floor(COLS/2)-1;
  if (!isValidPosition(currentPiece,currentRow,currentCol)) {
    isGameOver = true;
    document.getElementById("message").textContent = "Game Over";
  }
}

/* ──────────── VALIDATION ──────────── */
function isValidPosition(piece,row,col) {
  return piece.coords.every(([x,y])=>{
    const r=row+y, c=col+x;
    return r>=0 && r<ROWS && c>=0 && c<COLS && !grid[r][c];
  });
}

/* ──────────── LOCK & CLEAR ──────────── */
function lockPiece() {
  currentPiece.coords.forEach(([x,y])=>{
    const r=currentRow+y, c=currentCol+x;
    if (r>=0) grid[r][c] = currentPiece.color;
  });
}
function clearLines() {
  for (let r=ROWS-1;r>=0;r--){
    if (grid[r].every(cell=>cell)){
      grid.splice(r,1);
      grid.unshift(Array(COLS).fill(null));
      score+=100;
      document.getElementById("score").textContent=`Score: ${score}`;
      r++;
    }
  }
}

/* ──────────── DRAWING ──────────── */
function drawSquare(r,c,color){
  ctx.fillStyle = color;
  ctx.fillRect(c*CELL_SIZE,r*CELL_SIZE,CELL_SIZE,CELL_SIZE);
  ctx.strokeStyle="#000";
  ctx.strokeRect(c*CELL_SIZE,r*CELL_SIZE,CELL_SIZE,CELL_SIZE);
}
function draw(){
  ctx.clearRect(0,0,canvas.width,canvas.height);
  grid.forEach((row,r)=>row.forEach((cell,c)=>cell&&drawSquare(r,c,cell)));
  if (currentPiece){
    currentPiece.coords.forEach(([x,y])=>{
      const r=currentRow+y,c=currentCol+x;
      if (r>=0) drawSquare(r,c,currentPiece.color);
    });
  }
}

/* ──────────── GAME LOOP ──────────── */
function update(){
  if (isGameOver || (typeof gamePaused!=="undefined" && gamePaused)) return;
  if (isValidPosition(currentPiece,currentRow+1,currentCol)){
    currentRow++;
  }else{
    lockPiece(); clearLines(); spawnNewPiece();
  }
  draw();
  if (typeof sendStateToServer==="function") sendStateToServer();
}

/* ──────────── KEY HANDLER ──────────── */
function handleKey(e){
  if (isGameOver || (typeof gamePaused!=="undefined" && gamePaused)
      || typeof hasGameStarted==='undefined' || !hasGameStarted) return;

  switch(e.key){
    case "ArrowLeft":
      if (isValidPosition(currentPiece,currentRow,currentCol-1)) currentCol--; break;
    case "ArrowRight":
      if (isValidPosition(currentPiece,currentRow,currentCol+1)) currentCol++; break;
    case "ArrowDown":
      if (isValidPosition(currentPiece,currentRow+1,currentCol)) currentRow++;
      else { lockPiece(); clearLines(); spawnNewPiece(); }
      break;
    case "ArrowUp": {
      const rot = currentPiece.coords.map(([x,y])=>[-y,x]);
      const backup = currentPiece.coords;
      currentPiece.coords = rot;
      if (!isValidPosition(currentPiece,currentRow,currentCol))
        currentPiece.coords = backup;
      break;
    }
    case " ":  // hard drop
      while (isValidPosition(currentPiece,currentRow+1,currentCol)) currentRow++;
      lockPiece(); clearLines(); spawnNewPiece();
      break;
  }
  draw(); if (typeof sendStateToServer==="function") sendStateToServer();
}

/* ──────────── SEND STATE TO SERVER ──────────── */
function sendStateToServer(){
  if (typeof socket==='undefined') return;
  if (!currentRoomId || typeof isGameOver==='undefined') return;
  if (isGameOver || (typeof gamePaused!=="undefined" && gamePaused)) return;

  socket.emit("stateUpdate",{
    roomId: currentRoomId,
    state : { score, grid, currentPiece, currentRow, currentCol }
  });
}
