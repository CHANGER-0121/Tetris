// server.js

const express = require('express');
const http = require('http');
const { Server } = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST']
  }
});

// Optional: Serve static files if hosting frontend together
app.use(express.static('public'));

// Store rooms and player states
const rooms = {};

io.on('connection', (socket) => {
  console.log('🟢 Client connected:', socket.id);

  // Handle joining a room
  socket.on('joinRoom', (roomId) => {
    if (!rooms[roomId]) {
      rooms[roomId] = { players: {} };
    }

    // Add player to room
    rooms[roomId].players[socket.id] = {
      score: 0,
      grid: null,
      currentPiece: null,
      currentRow: 0,
      currentCol: 0
    };

    socket.join(roomId);
    console.log(`🔗 ${socket.id} joined room ${roomId}`);

    // Send updated room data
    io.to(roomId).emit('roomData', rooms[roomId].players);
  });

  // Handle state updates from clients
  socket.on('stateUpdate', ({ roomId, state }) => {
    if (rooms[roomId]?.players[socket.id]) {
      rooms[roomId].players[socket.id] = state;

      // Broadcast updated room state to all clients in the room
      io.to(roomId).emit('roomData', rooms[roomId].players);
    }
  });

  // Handle disconnection
  socket.on('disconnect', () => {
    console.log('🔴 Client disconnected:', socket.id);

    for (const [roomId, room] of Object.entries(rooms)) {
      if (room.players[socket.id]) {
        delete room.players[socket.id];
        console.log(`❌ Removed ${socket.id} from room ${roomId}`);

        // If room is empty, delete it
        if (Object.keys(room.players).length === 0) {
          delete rooms[roomId];
          console.log(`🗑️ Deleted empty room: ${roomId}`);
        } else {
          io.to(roomId).emit('roomData', room.players);
        }
      }
    }
  });
});

// Start server
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
});
