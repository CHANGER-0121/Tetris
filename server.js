// server.js (Enhanced Multiplayer Integration)

const express = require('express');
const http = require('http');
const { Server } = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: "*" } });

app.use(express.static('public'));

// Rooms storage
let rooms = {};

// Client connection
io.on('connection', (socket) => {
  console.log('Client connected:', socket.id);

  socket.on('joinRoom', (roomId) => {
    if (!rooms[roomId]) rooms[roomId] = { players: {} };

    // Initialize player state with detailed info
    rooms[roomId].players[socket.id] = {
      score: 0,
      grid: null,
      currentPiece: null,
      currentRow: 0,
      currentCol: 0
    };

    socket.join(roomId);
    io.to(roomId).emit('roomData', rooms[roomId].players);
    console.log(`Socket ${socket.id} joined room ${roomId}`);
  });

  // Receive detailed state updates
  socket.on('stateUpdate', ({ roomId, state }) => {
    if (rooms[roomId]?.players[socket.id]) {
      rooms[roomId].players[socket.id] = state;
      io.to(roomId).emit('roomData', rooms[roomId].players);
    }
  });

  socket.on('disconnect', () => {
    console.log('Client disconnected:', socket.id);
    for (const [roomId, room] of Object.entries(rooms)) {
      if (room.players[socket.id]) {
        delete room.players[socket.id];
        io.to(roomId).emit('roomData', room.players);
      }
    }
  });
});

// Start the server
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Server listening on http://localhost:${PORT}`);
});