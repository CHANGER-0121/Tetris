const express=require('express'), http=require('http'), path=require('path');
const {Server}=require('socket.io'); const cors=require('cors');
const app=express(), server=http.createServer(app);
const io=new Server(server,{cors:{origin:'*'}});

app.use(cors({origin:'*'})); app.use(express.static(__dirname));
app.get('/',(_,res)=>res.sendFile(path.join(__dirname,'index.html')));

/* rooms */
const rooms={};

io.on('connection',socket=>{
  socket.on('joinRoom',({roomId,playerName})=>{
    if(!roomId)return;
    if(!rooms[roomId]) rooms[roomId]={players:{},hasStarted:false};
    if(Object.keys(rooms[roomId].players).length>=2){socket.emit('roomFull');return;}
    rooms[roomId].players[socket.id]={name:playerName,score:0,grid:null,currentPiece:null,currentRow:0,currentCol:0};
    socket.join(roomId); io.to(roomId).emit('roomData',rooms[roomId].players);
  });

  socket.on('stateUpdate',({roomId,state})=>{
    const room=rooms[roomId]; if(room&&room.players[socket.id]){
      rooms[roomId].players[socket.id]={...rooms[roomId].players[socket.id],...state};
      io.to(roomId).emit('roomData',room.players); }
  });

  socket.on('startGame',roomId=> rooms[roomId]&&io.to(roomId).emit('gameStarted'));
  socket.on('pauseGame', roomId=>io.to(roomId).emit('pauseGame'));
  socket.on('resumeGame',roomId=>io.to(roomId).emit('resumeGame'));
  socket.on('endGame',  roomId=>io.to(roomId).emit('endGame'));

  socket.on('restartGame',roomId=>{
    const room=rooms[roomId]; if(room){
      Object.keys(room.players).forEach(id=>room.players[id]={...room.players[id],score:0,grid:null});
      io.to(roomId).emit('roomData',room.players);
      io.to(roomId).emit('gameRestart');
    }
  });

  socket.on('disconnect',()=>{
    for(const roomId in rooms){
      const room=rooms[roomId];
      if(room.players[socket.id]){
        delete room.players[socket.id];
        io.to(roomId).emit('roomData',room.players);
        io.to(roomId).emit('opponentLeft');                 // notify remaining
        if(!Object.keys(room.players).length) delete rooms[roomId];
      }
    }
  });
});

server.listen(process.env.PORT||3000,()=>console.log('🚀 server running'));
