import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import { v4 as uuidv4 } from 'uuid';

const app = express();
const server = createServer(app);
const io = new Server(server, {
  cors: { origin: '*', methods: ['GET', 'POST'] },
});

app.use(cors());
app.use(express.json());

// ─── In-Memory Data Store ───
const onlineUsers = new Map();    // socketId → { id, nickname, avatar, interests, category, bio }
const waitingPool = new Map();    // category → [{ socketId, userId, interests }]
const activeRooms = new Map();    // roomId → { users: [socketId, socketId], category, createdAt }
const friendRequests = [];        // { from, to, status }
const messages = new Map();       // roomId → [{ id, sender, content, type, timestamp }]

const CATEGORIES = [
  { id: 'random', name: 'Random Global', icon: '🌍', color: '#6366f1' },
  { id: 'developers', name: 'Developers', icon: '💻', color: '#8b5cf6' },
  { id: 'gaming', name: 'Gaming', icon: '🎮', color: '#ec4899' },
  { id: 'music', name: 'Music', icon: '🎵', color: '#f59e0b' },
  { id: 'anime', name: 'Anime', icon: '🎌', color: '#ef4444' },
  { id: 'study', name: 'Study Partners', icon: '📚', color: '#10b981' },
  { id: 'startup', name: 'Startup Founders', icon: '🚀', color: '#3b82f6' },
  { id: 'ai', name: 'AI Enthusiasts', icon: '🤖', color: '#a855f7' },
];

const ICEBREAKERS = [
  "What's the most interesting thing you've learned this week?",
  "If you could have dinner with anyone, who would it be?",
  "What's a skill you're currently trying to learn?",
  "What's the best advice you've ever received?",
  "If you could live anywhere in the world, where would it be?",
  "What's your go-to comfort movie or show?",
  "What's something on your bucket list?",
  "What's a hobby you'd love to pick up?",
  "What tech trend excites you the most right now?",
  "If you could master any instrument overnight, which would it be?",
  "What's the last book that really changed your perspective?",
  "What would you do if you had an extra hour every day?",
];

// ─── REST API ───
app.get('/api/categories', (req, res) => {
  res.json(CATEGORIES);
});

app.get('/api/online-users', (req, res) => {
  res.json({ count: onlineUsers.size, categories: getCategoryCounts() });
});

app.get('/api/icebreaker', (req, res) => {
  const random = ICEBREAKERS[Math.floor(Math.random() * ICEBREAKERS.length)];
  res.json({ icebreaker: random });
});

function getCategoryCounts() {
  const counts = {};
  for (const [, user] of onlineUsers) {
    counts[user.category] = (counts[user.category] || 0) + 1;
  }
  return counts;
}

function matchInterests(a, b) {
  if (!a?.length || !b?.length) return 0;
  const setA = new Set(a.map(i => i.toLowerCase()));
  return b.filter(i => setA.has(i.toLowerCase())).length;
}

function findMatch(socketId, category, interests) {
  const pool = waitingPool.get(category) || [];
  let bestMatch = null;
  let bestScore = -1;

  for (const candidate of pool) {
    if (candidate.socketId === socketId) continue;
    const score = matchInterests(interests, candidate.interests);
    if (score > bestScore) {
      bestScore = score;
      bestMatch = candidate;
    }
  }

  // If no interest match, take first available
  if (!bestMatch && pool.length > 0) {
    bestMatch = pool.find(c => c.socketId !== socketId);
  }

  return bestMatch;
}

// ─── Socket.io ───
io.on('connection', (socket) => {
  console.log(`[+] Connected: ${socket.id}`);

  socket.on('join', (userData) => {
    const user = {
      id: uuidv4(),
      socketId: socket.id,
      nickname: userData.nickname || 'Anonymous',
      avatar: userData.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${userData.nickname}`,
      interests: userData.interests || [],
      category: userData.category || 'random',
      bio: userData.bio || '',
      joinedAt: Date.now(),
    };
    onlineUsers.set(socket.id, user);
    io.emit('online-count', onlineUsers.size);
    socket.emit('joined', { userId: user.id, user });
  });

  socket.on('find-match', ({ category, interests, mode }) => {
    const user = onlineUsers.get(socket.id);
    if (!user) return;

    const match = findMatch(socket.id, category || user.category, interests || user.interests);

    if (match) {
      // Remove match from waiting pool
      const pool = waitingPool.get(category || user.category) || [];
      waitingPool.set(
        category || user.category,
        pool.filter(c => c.socketId !== match.socketId)
      );

      // Create room
      const roomId = uuidv4();
      activeRooms.set(roomId, {
        users: [socket.id, match.socketId],
        category: category || user.category,
        mode: mode || 'video',
        createdAt: Date.now(),
      });
      messages.set(roomId, []);

      const matchUser = onlineUsers.get(match.socketId);
      const icebreaker = ICEBREAKERS[Math.floor(Math.random() * ICEBREAKERS.length)];

      socket.join(roomId);
      io.sockets.sockets.get(match.socketId)?.join(roomId);

      socket.emit('matched', {
        roomId,
        peer: { nickname: matchUser?.nickname, avatar: matchUser?.avatar, interests: matchUser?.interests, bio: matchUser?.bio },
        isInitiator: true,
        icebreaker,
      });

      io.to(match.socketId).emit('matched', {
        roomId,
        peer: { nickname: user.nickname, avatar: user.avatar, interests: user.interests, bio: user.bio },
        isInitiator: false,
        icebreaker,
      });
    } else {
      // Add to waiting pool
      const cat = category || user.category;
      if (!waitingPool.has(cat)) waitingPool.set(cat, []);
      const pool = waitingPool.get(cat);
      if (!pool.find(c => c.socketId === socket.id)) {
        pool.push({ socketId: socket.id, userId: user.id, interests: interests || user.interests });
      }
      socket.emit('waiting', { position: pool.length });
    }
  });

  // WebRTC Signaling
  socket.on('offer', ({ roomId, offer }) => {
    const room = activeRooms.get(roomId);
    if (!room) return;
    const peer = room.users.find(id => id !== socket.id);
    if (peer) io.to(peer).emit('offer', { offer, roomId });
  });

  socket.on('answer', ({ roomId, answer }) => {
    const room = activeRooms.get(roomId);
    if (!room) return;
    const peer = room.users.find(id => id !== socket.id);
    if (peer) io.to(peer).emit('answer', { answer, roomId });
  });

  socket.on('ice-candidate', ({ roomId, candidate }) => {
    const room = activeRooms.get(roomId);
    if (!room) return;
    const peer = room.users.find(id => id !== socket.id);
    if (peer) io.to(peer).emit('ice-candidate', { candidate, roomId });
  });

  // Chat
  socket.on('chat-message', ({ roomId, content, type }) => {
    const user = onlineUsers.get(socket.id);
    if (!user || !roomId) return;
    const msg = {
      id: uuidv4(),
      sender: user.nickname,
      senderId: socket.id,
      content,
      type: type || 'text',
      timestamp: Date.now(),
    };
    const roomMessages = messages.get(roomId) || [];
    roomMessages.push(msg);
    messages.set(roomId, roomMessages);
    io.to(roomId).emit('chat-message', msg);
  });

  socket.on('typing', ({ roomId, isTyping }) => {
    const user = onlineUsers.get(socket.id);
    if (!user) return;
    socket.to(roomId).emit('typing', { nickname: user.nickname, isTyping });
  });

  socket.on('reaction', ({ roomId, emoji }) => {
    const user = onlineUsers.get(socket.id);
    if (!user) return;
    io.to(roomId).emit('reaction', { emoji, from: user.nickname });
  });

  // Skip
  socket.on('skip', ({ roomId }) => {
    const room = activeRooms.get(roomId);
    if (!room) return;
    const peer = room.users.find(id => id !== socket.id);
    if (peer) io.to(peer).emit('peer-skipped');

    socket.leave(roomId);
    io.sockets.sockets.get(peer)?.leave(roomId);
    activeRooms.delete(roomId);
    messages.delete(roomId);
  });

  // Friend Request
  socket.on('friend-request', ({ roomId }) => {
    const room = activeRooms.get(roomId);
    if (!room) return;
    const peer = room.users.find(id => id !== socket.id);
    const user = onlineUsers.get(socket.id);
    if (peer && user) {
      io.to(peer).emit('friend-request', {
        from: { nickname: user.nickname, avatar: user.avatar, socketId: socket.id },
      });
    }
  });

  socket.on('friend-accept', ({ fromSocketId }) => {
    const user = onlineUsers.get(socket.id);
    if (user) {
      io.to(fromSocketId).emit('friend-accepted', {
        user: { nickname: user.nickname, avatar: user.avatar },
      });
    }
  });

  // Rating
  socket.on('rate-conversation', ({ roomId, rating }) => {
    console.log(`Room ${roomId} rated: ${rating}/5`);
  });

  // Disconnect
  socket.on('disconnect', () => {
    console.log(`[-] Disconnected: ${socket.id}`);
    const user = onlineUsers.get(socket.id);

    // Remove from waiting pools
    for (const [cat, pool] of waitingPool) {
      waitingPool.set(cat, pool.filter(c => c.socketId !== socket.id));
    }

    // Notify room peers
    for (const [roomId, room] of activeRooms) {
      if (room.users.includes(socket.id)) {
        const peer = room.users.find(id => id !== socket.id);
        if (peer) io.to(peer).emit('peer-disconnected');
        activeRooms.delete(roomId);
      }
    }

    onlineUsers.delete(socket.id);
    io.emit('online-count', onlineUsers.size);
  });
});

const PORT = process.env.PORT || 3001;
server.listen(PORT, () => {
  console.log(`⚡ QuantumChat server running on port ${PORT}`);
});
