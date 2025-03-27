// server.js

const express = require('express');
const http = require('http');
const { Server } = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

// Serve all files from the "public" folder
app.use(express.static('public'));

// In-memory store of rooms (for demonstration)
let rooms = {};

/*
  rooms = {
    roomName: {
      players: {
        socketId1: { score: 0, ... },
        socketId2: { score: 100, ... },
      }
    }
  }
*/

// A client just connected
io.on('connection', (socket) => {
  console.log('New client connected:', socket.id);

  // The client wants to join a specific room
  socket.on('joinRoom', (roomId) => {
    if (!rooms[roomId]) {
      rooms[roomId] = { players: {} };
    }
    // Add this player to the room
    rooms[roomId].players[socket.id] = { score: 0 };
    socket.join(roomId);

    console.log(`Socket ${socket.id} joined room ${roomId}`);
    // Broadcast updated room data
    io.to(roomId).emit('roomData', rooms[roomId].players);
  });

  // The client sends a state update (e.g., Tetris score)
  socket.on('stateUpdate', ({ roomId, state }) => {
    if (rooms[roomId]?.players[socket.id]) {
      // Update player's state
      rooms[roomId].players[socket.id] = state;
      // Broadcast to everyone in the room
      io.to(roomId).emit('roomData', rooms[roomId].players);
    }
  });

  // Client disconnected
  socket.on('disconnect', () => {
    console.log('Client disconnected:', socket.id);
    // Remove this client from whichever room they were in
    for (const [roomId, room] of Object.entries(rooms)) {
      if (room.players[socket.id]) {
        delete room.players[socket.id];
        // Notify the room
        io.to(roomId).emit('roomData', room.players);
      }
    }
  });
});

// Start listening
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Server listening on http://localhost:${PORT}`);
});