const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');

const app = express();
const server = http.createServer(app);
app.use(cors({ origin: '*', methods: ['GET', 'POST'] }));

const io = new Server(server, {
  cors: { origin: '*', methods: ['GET', 'POST'] },
});

const rooms = {};

io.on('connection', (socket) => {
  console.log('🟢 Connected:', socket.id);

  socket.on('joinRoom', (roomId) => {
    if (!rooms[roomId]) rooms[roomId] = { players: {}, hasStarted: false };

    const room = rooms[roomId];
    if (Object.keys(room.players).length >= 2) {
      socket.emit('roomFull');
      return;
    }

    room.players[socket.id] = { score: 0, grid: null, currentPiece: null, currentRow: 0, currentCol: 0 };
    socket.join(roomId);
    console.log(`🔗 ${socket.id} joined room ${roomId}`);

    io.to(roomId).emit('roomData', room.players);
  });

  socket.on('stateUpdate', ({ roomId, state }) => {
    const room = rooms[roomId];
    if (room && room.players[socket.id]) {
      room.players[socket.id] = state;
      io.to(roomId).emit('roomData', room.players);
    }
  });

  socket.on('startGame', (roomId) => {
    if (rooms[roomId]) {
      rooms[roomId].hasStarted = true;
      io.to(roomId).emit('gameStarted');
    }
  });

  socket.on('disconnect', () => {
    for (const roomId in rooms) {
      const room = rooms[roomId];
      if (room.players[socket.id]) {
        delete room.players[socket.id];
        io.to(roomId).emit('roomData', room.players);
        console.log(`❌ ${socket.id} left room ${roomId}`);
        if (Object.keys(room.players).length === 0) delete rooms[roomId];
      }
    }
  });
});

server.listen(3000, () => console.log('🚀 Server running on port 3000'));
