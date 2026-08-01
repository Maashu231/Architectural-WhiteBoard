const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');

const app = express();
app.use(cors());

const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST'],
  },
});

io.on('connection', (socket) => {
  console.log(`User connected: ${socket.id}`);

  let currentRoom = null;

  socket.on('join-room', (roomId) => {
    if (currentRoom) {
      socket.leave(currentRoom);
    }
    socket.join(roomId);
    currentRoom = roomId;
    console.log(`User ${socket.id} joined room ${roomId}`);
  });

  socket.on('node-change', ({ roomId, changes }) => {
    socket.to(roomId).emit('node-change', changes);
  });

  socket.on('node-add', ({ roomId, node }) => {
    socket.to(roomId).emit('node-add', node);
  });

  socket.on('edge-add', ({ roomId, edge }) => {
    socket.to(roomId).emit('edge-add', edge);
  });

  socket.on('cursor-move', ({ roomId, x, y }) => {
    socket.to(roomId).emit('cursor-move', { id: socket.id, x, y });
  });

  socket.on('disconnect', () => {
    console.log(`User disconnected: ${socket.id}`);
    if (currentRoom) {
      io.to(currentRoom).emit('user-left', socket.id);
    }
  });
});

const PORT = 4002;
server.listen(PORT, () => {
  console.log(`Socket.IO server running on http://localhost:${PORT}`);
});
