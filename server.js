// server.js

const express = require('express');
const http = require('http');
const { Server } = require('socket.io');

const app = express();
const server = http.createServer(app);

// ✅ Configure CORS to allow GitHub Pages
const io = new Server(server, {
  cors: {
    origin: "https://changer-0121.github.io", // ✅ Allow only your GitHub Pages domain
    methods: ["GET", "POST"]
  }
});

// ✅ If you ever serve static frontend files, use this
app.use(express.static('public'));

// ✅ Optionally respond to GET /
app.get('/', (req, res) => {
  res.send('Tetris multiplayer server is running.');
});

// Room and player state storage
const rooms = {};

io.on('connection', (socket) => {
  console.log('🟢 Client connected:', socket.id);

  socket.on('joinRoom', (roomId) => {
    if (!rooms[roomId]) {
      rooms[roomId] = { players: {} };
    }

    rooms[roomId].players[socket.id] = {
      score: 0,
      grid: null,
      currentPiece: null,
      currentRow: 0,
      currentCol: 0
    };

    socket.join(roomId);
    console.log(`🔗 ${socket.id} joined room ${roomId}`);

    io.to(roomId).emit('roomData', rooms[roomId].players);
  });

  socket.on('stateUpdate', ({ roomId, state }) => {
    if (rooms[roomId]?.players[socket.id]) {
      rooms[roomId].players[socket.id] = state;
      io.to(roomId).emit('roomData', rooms[roomId].players);
    }
  });

  socket.on('disconnect', () => {
    console.log('🔴 Client disconnected:', socket.id);

    for (const [roomId, room] of Object.entries(rooms)) {
      if (room.players[socket.id]) {
        delete room.players[socket.id];
        console.log(`❌ Removed ${socket.id} from room ${roomId}`);

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

// ✅ Start the server (Render will inject PORT env var)
const PORT = process.env.PORT || 3000;
server.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Server running on port ${PORT}`);
});

