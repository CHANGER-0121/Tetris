const express = require('express');
const http    = require('http');
const path    = require('path');
const { Server } = require('socket.io');
const cors    = require('cors');

const app    = express();
const server = http.createServer(app);
const io     = new Server(server,{cors:{origin:'*'}});

app.use(cors({origin:'*'}));
app.use(express.static(__dirname));
app.get('/',(_,res)=>res.sendFile(path.join(__dirname,'index.html')));

/* —— room map —— */
const rooms={};

io.on('connection',socket=>{
  /* JOIN */
  socket.on('joinRoom',({roomId,playerName})=>{
    if(!roomId)return;
    if(!rooms[roomId]) rooms[roomId]={players:{},hasStarted:false};
    if(Object.keys(rooms[roomId].players).length>=2){socket.emit('roomFull');return;}
    rooms[roomId].players[socket.id]={
      name:playerName||'Player',score:0,grid:null,currentPiece:null,currentRow:0,currentCol:0};
    socket.join(roomId);
    io.to(roomId).emit('roomData',rooms[roomId].players);
  });

  /* STATE UPDATE */
  socket.on('stateUpdate',({roomId,state})=>{
    const room=rooms[roomId];
    if(room&&room.players[socket.id]){
      rooms[roomId].players[socket.id]={...rooms[roomId].players[socket.id],...state};
      io.to(roomId).emit('roomData',room.players);
    }
  });

  /* START */
  socket.on('startGame',roomId=>{
    if(rooms[roomId]){rooms[roomId].hasStarted=true;io.to(roomId).emit('gameStarted');}
  });

  /* PAUSE / RESUME */
  socket.on('pauseGame', roomId=>io.to(roomId).emit('pauseGame'));
  socket.on('resumeGame',roomId=>io.to(roomId).emit('resumeGame'));

  /* END GAME */
  socket.on('endGame', roomId=>io.to(roomId).emit('endGame'));

  /* DISCONNECT */
  socket.on('disconnect',()=>{
    for(const roomId in rooms){
      const room=rooms[roomId];
      if(room.players[socket.id]){
        delete room.players[socket.id];
        io.to(roomId).emit('roomData',room.players);
        if(!Object.keys(room.players).length) delete rooms[roomId];
      }
    }
  });
});

const PORT=process.env.PORT||3000;
server.listen(PORT,()=>console.log(`🚀 Server on ${PORT}`));
