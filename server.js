// ══════════════════════════════════════════════════════
// SERVER.JS — Socket.IO Collaboration Server
// ══════════════════════════════════════════════════════
//
// Dependencies: express, http, socket.io, cors, ioredis (optional)
// All imports below are declared in package.json.

const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const { createClient } = require('@supabase/supabase-js');
const { z } = require('zod');

// ── Shared Zod Validation Schemas ─────────────────────────────────────────────
const nodeSchema = z.object({
  id: z.string().max(100),
  type: z.string().max(50).optional(),
  position: z.object({ x: z.number(), y: z.number() }),
  data: z.object({
    label: z.string().max(200).optional(),
    subtext: z.string().max(500).nullable().optional(),
  }).passthrough().optional(),
}).passthrough();

const edgeSchema = z.object({
  id: z.string().max(100),
  source: z.string().max(100),
  target: z.string().max(100),
  type: z.string().max(50).optional(),
  data: z.record(z.unknown()).optional(),
}).passthrough();

const cursorMoveSchema = z.object({
  roomId: z.string().max(50),
  x: z.number(),
  y: z.number(),
});

// ── Supabase Setup ────────────────────────────────────────────────────────────
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
let supabase = null;
if (supabaseUrl && supabaseKey) {
  supabase = createClient(supabaseUrl, supabaseKey);
}

// ── Structured logger (zero-dep replacement for winston) ──────────────────────
const logger = {
  _format(level, msg, ctx) {
    const entry = { level, msg, ts: new Date().toISOString(), ...ctx };
    return JSON.stringify(entry);
  },
  info(msg, ctx = {}) { console.log(this._format('info', msg, ctx)); },
  warn(msg, ctx = {}) { console.warn(this._format('warn', msg, ctx)); },
  error(msg, ctx = {}) { console.error(this._format('error', msg, ctx)); },
};

// ── Redis (optional — falls back to in-memory when unavailable) ───────────────
let db = null;
let redisAvailable = false;

function tryConnectRedis() {
  const redisHost = process.env.REDIS_HOST;
  if (!redisHost) {
    logger.warn('REDIS_HOST not set — using in-memory room state only');
    return;
  }

  try {
    const Redis = require('ioredis');
    db = new Redis({
      host: redisHost,
      port: parseInt(process.env.REDIS_PORT, 10) || 6379,
      password: process.env.REDIS_PASSWORD || undefined,
      lazyConnect: true,
      retryStrategy(times) {
        if (times > 3) return null; // stop retrying after 3 attempts
        return Math.min(times * 200, 2000);
      },
    });

    db.on('connect', () => {
      redisAvailable = true;
      logger.info('Redis connected');
    });
    db.on('error', (err) => {
      redisAvailable = false;
      logger.error('Redis error', { error: err.message });
    });
    db.on('close', () => {
      redisAvailable = false;
      logger.warn('Redis connection closed');
    });

    db.connect().catch((err) => {
      logger.warn('Redis connection failed — falling back to in-memory', { error: err.message });
    });
  } catch (err) {
    logger.warn('ioredis not available — using in-memory room state only', { error: err.message });
  }
}

tryConnectRedis();

// ── In-process rate limiter (replaces rate-limiter-flexible) ──────────────────
const rateLimitStore = new Map(); // key -> { count, resetAt }
const RATE_LIMIT_POINTS = parseInt(process.env.RATE_LIMIT_POINTS, 10) || 100;
const RATE_LIMIT_WINDOW_SECONDS = parseInt(process.env.RATE_LIMIT_WINDOW_SECONDS, 10) || 3600;

function consumeRateLimit(key) {
  const now = Date.now();
  let entry = rateLimitStore.get(key);

  if (!entry || now >= entry.resetAt) {
    entry = { count: 0, resetAt: now + RATE_LIMIT_WINDOW_SECONDS * 1000 };
  }

  entry.count += 1;
  rateLimitStore.set(key, entry);

  return {
    allowed: entry.count <= RATE_LIMIT_POINTS,
    remaining: Math.max(0, RATE_LIMIT_POINTS - entry.count),
    resetIn: Math.ceil((entry.resetAt - now) / 1000),
  };
}

// Periodically clean up expired entries
setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of rateLimitStore) {
    if (now >= entry.resetAt) rateLimitStore.delete(key);
  }
}, 60_000).unref();

// ── Environment Configuration ─────────────────────────────────────────────────
const ALLOWED_ORIGINS = (
  process.env.ALLOWED_ORIGINS || 'http://localhost:3000'
).split(',').map(s => s.trim());

const MAX_ROOMS = parseInt(process.env.MAX_ROOMS, 10) || 50;
const MAX_USERS_PER_ROOM = parseInt(process.env.MAX_USERS_PER_ROOM, 10) || 100;
const isDev = process.env.NODE_ENV !== 'production';

// ── Validation Helpers ────────────────────────────────────────────────────────
const isValidRoomId = (roomId) => {
  return typeof roomId === 'string' && /^[a-zA-Z0-9_-]{1,50}$/.test(roomId);
};

const validateNodeChange = (data) => {
  if (!data || typeof data !== 'object') return false;
  return Array.isArray(data.changes) && data.changes.length <= 100;
};

// ── Express Setup ─────────────────────────────────────────────────────────────
const app = express();
const server = http.createServer(app);

app.use(express.json({ limit: '100kb' }));
app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (e.g. server-to-server, health checks)
    if (!origin) return callback(null, true);
    if (ALLOWED_ORIGINS.some(allowed => origin.startsWith(allowed))) {
      callback(null, true);
    } else {
      logger.warn('CORS blocked', { origin });
      callback(new Error('Forbidden'));
    }
  },
  methods: ['GET', 'POST'],
  credentials: true,
}));

// Health check endpoint
app.get('/ready', (req, res) => {
  res.status(200).json({ status: 'ready', redis: redisAvailable });
});

// Error handling middleware
app.use((err, req, res, _next) => {
  logger.error('Unhandled Express error', { error: err.message, path: req.path });
  res.status(500).json({ error: 'Internal Server Error' });
});

// Rate limiting middleware for API routes
app.use('/api', (req, res, next) => {
  const result = consumeRateLimit(`http:${req.ip}`);
  if (!result.allowed) {
    return res.status(429).json({ error: 'Too Many Requests', retryAfter: result.resetIn });
  }
  next();
});

// ── Socket.IO Configuration ──────────────────────────────────────────────────
const io = new Server(server, {
  cors: {
    origin: ALLOWED_ORIGINS,
    methods: ['GET', 'POST'],
    credentials: true,
  },
  pingTimeout: 30000,
  maxHttpBufferSize: 512 * 1024, // 512 KB payload limit
});

// ── Room Management ──────────────────────────────────────────────────────────
const rooms = new Map();

const getRoomFromDB = async (roomId) => {
  if (!db || !redisAvailable) return null;
  try {
    const roomData = await db.get(`room:${roomId}`);
    return roomData ? JSON.parse(roomData) : null;
  } catch (error) {
    logger.error('Error fetching room from Redis', { roomId, error: error.message });
    return null;
  }
};

const saveRoomToDB = async (roomId, roomData) => {
  if (!db || !redisAvailable) return;
  try {
    await db.setex(`room:${roomId}`, 3600, JSON.stringify(roomData));
  } catch (error) {
    logger.error('Error saving room to Redis', { roomId, error: error.message });
  }
};

// ── Health & Ready Endpoints ─────────────────────────────────────────────────
app.get('/health', async (req, res) => {
  try {
    const checks = {
      redis: redisAvailable ? 'connected' : 'unavailable',
      rooms: rooms.size,
    };

    if (db && redisAvailable) {
      try {
        const pong = await db.ping();
        checks.redis = pong === 'PONG' ? 'connected' : 'error';
      } catch {
        checks.redis = 'error';
      }
    }

    res.json({ status: 'healthy', ...checks });
  } catch (error) {
    logger.error('Health check error', { error: error.message });
    res.status(503).json({ error: 'Health check failed' });
  }
});

app.get('/ready', async (req, res) => {
  const checks = { server: 'ok', redis: 'skipped' };

  if (db) {
    try {
      const pong = await db.ping();
      checks.redis = pong === 'PONG' ? 'ok' : 'error';
    } catch {
      checks.redis = 'error';
    }
  }

  const allOk = Object.values(checks).every(v => v === 'ok' || v === 'skipped');
  res.status(allOk ? 200 : 503).json({
    status: allOk ? 'ready' : 'not_ready',
    checks,
  });
});

// ── Connection Handler ───────────────────────────────────────────────────────
io.on('connection', async (socket) => {
  let currentRoom = null;

  try {
    // ── Authentication ──
    const auth = socket.handshake.auth;
    if (auth?.token && supabase) {
      const { data: { user }, error } = await supabase.auth.getUser(auth.token);
      if (error || !user) {
        socket.emit('error', { message: 'Invalid token' });
        socket.disconnect();
        return;
      }
      socket.data.userId = user.id;
      const metadata = user.user_metadata || {};
      socket.data.user = {
        name: metadata.full_name || metadata.name || user.email?.split('@')[0] || 'Anonymous',
        avatar: metadata.avatar_url || ''
      };
    } else if (!isDev) {
      socket.emit('error', { message: 'Authentication required' });
      socket.disconnect();
      return;
    }

    // ── Rate Limiting ──
    const clientAddr = socket.handshake.address || 'unknown';
    const rlResult = consumeRateLimit(`ws:${clientAddr}`);
    if (!rlResult.allowed) {
      socket.emit('error', { message: 'Rate limit exceeded' });
      socket.disconnect();
      return;
    }

    logger.info('User connected', { socketId: socket.id });

    // ── Join Room ──
    socket.on('join-room', async (roomId) => {
      try {
        if (!isValidRoomId(roomId)) {
          socket.emit('error', { message: 'Invalid room ID format' });
          return;
        }

        // ── Leave current room cleanly before joining a new one ──
        if (currentRoom && currentRoom !== roomId) {
          const prevRoom = rooms.get(currentRoom);
          if (prevRoom) {
            prevRoom.users = prevRoom.users.filter((u) => u.id !== socket.id);
            // Notify remaining members and persist updated roster.
            socket.to(currentRoom).emit('user-left', socket.id);
            await saveRoomToDB(currentRoom, prevRoom);
          }
          socket.leave(currentRoom);
        }

        if (rooms.size >= MAX_ROOMS && !rooms.has(roomId)) {
          socket.emit('error', { message: 'Maximum rooms limit reached' });
          return;
        }

        let room = rooms.get(roomId);
        if (!room) {
          const dbRoom = await getRoomFromDB(roomId);
          room = dbRoom || { users: [], nodes: [], edges: [], version: 0 };
        }

        if (room.users.length >= MAX_USERS_PER_ROOM) {
          socket.emit('error', { message: 'Room is full' });
          return;
        }

        // Join the Socket.IO room first. Only after a successful join do we
        // update the in-memory roster and persist — so a saveRoomToDB failure
        // never leaves room.users in an inconsistent state.
        socket.join(roomId);
        currentRoom = roomId;
        socket.data.roomId = roomId;

        room.users.push({ id: socket.id, joinedAt: Date.now() });
        rooms.set(roomId, room);
        await saveRoomToDB(roomId, room);

        // Send current room state to the joining client (reconnection recovery)
        socket.emit('joined', { roomId, users: room.users });
        if (room.nodes.length > 0 || room.edges.length > 0) {
          socket.emit('diagram-state', {
            nodes: room.nodes,
            edges: room.edges,
            version: room.version,
          });
        }
        socket.to(roomId).emit('user-joined', socket.id);

        logger.info('User joined room', { socketId: socket.id, roomId });
      } catch (error) {
        logger.error('Error joining room', { roomId, error: error.message });
        socket.emit('error', { message: 'Failed to join room' });
      }
    });

    // ── Node Change ──
    socket.on('node-change', (payload) => {
      try {
        const { roomId, changes } = payload || {};
        if (!roomId || !currentRoom || currentRoom !== roomId) {
          socket.emit('error', { message: 'Invalid room ID' });
          return;
        }

        if (!validateNodeChange(payload)) {
          socket.emit('error', { message: 'Invalid changes format' });
          return;
        }

        // Sanitize changes
        const sanitizedChanges = changes
          .map((change) => {
            if (!change || typeof change !== 'object') return null;
            const base = { type: change.type || 'replace', id: change.id };
            if (change.type === 'replace') {
              return { ...base, item: change.item ? JSON.parse(JSON.stringify(change.item)) : null };
            } else if (change.type === 'remove') {
              return base;
            }
            return base;
          })
          .filter(Boolean);

        socket.to(roomId).emit('node-change', sanitizedChanges);
      } catch (error) {
        logger.error('Error processing node-change', { error: error.message });
        socket.emit('error', { message: 'Failed to process node change' });
      }
    });

    // ── Node Add ──
    socket.on('node-add', (payload) => {
      try {
        const { roomId, node } = payload || {};
        if (!roomId || currentRoom !== roomId) {
          socket.emit('error', { message: 'Invalid room ID' });
          return;
        }
        
        const parsedNode = nodeSchema.safeParse(node);
        if (!parsedNode.success) {
          socket.emit('error', { message: 'Invalid node data' });
          return;
        }

        // Update room state
        const room = rooms.get(roomId);
        if (room) {
          if (!room.nodes.some((n) => n.id === parsedNode.data.id)) {
            if (room.nodes.length >= 500) {
              socket.emit('error', { message: 'Max nodes reached' });
              return;
            }
            room.nodes.push(parsedNode.data);
            room.version = (room.version || 0) + 1;
          }
        }

        socket.to(roomId).emit('node-add', parsedNode.data);
      } catch (error) {
        logger.error('Error processing node-add', { error: error.message });
        socket.emit('error', { message: 'Failed to add node' });
      }
    });

    // ── Edge Add ──
    socket.on('edge-add', (payload) => {
      try {
        const { roomId, edge } = payload || {};
        if (!roomId || currentRoom !== roomId) {
          socket.emit('error', { message: 'Invalid room ID' });
          return;
        }

        const parsedEdge = edgeSchema.safeParse(edge);
        if (!parsedEdge.success) {
          socket.emit('error', { message: 'Invalid edge data' });
          return;
        }

        // Update room state
        const room = rooms.get(roomId);
        if (room) {
          // Check referential integrity
          if (!room.nodes.some(n => n.id === parsedEdge.data.source) || !room.nodes.some(n => n.id === parsedEdge.data.target)) {
            socket.emit('error', { message: 'Edge refers to non-existent node' });
            return;
          }

          if (!room.edges.some((e) => e.id === parsedEdge.data.id)) {
            if (room.edges.length >= 1000) {
              socket.emit('error', { message: 'Max edges reached' });
              return;
            }
            room.edges.push(parsedEdge.data);
            room.version = (room.version || 0) + 1;
          }
        }

        socket.to(roomId).emit('edge-add', parsedEdge.data);
      } catch (error) {
        logger.error('Error processing edge-add', { error: error.message });
        socket.emit('error', { message: 'Failed to add edge' });
      }
    });

    // ── Edge Change ──
    socket.on('edge-change', (payload) => {
      try {
        const { roomId, changes } = payload || {};
        if (!roomId || currentRoom !== roomId) {
          socket.emit('error', { message: 'Invalid room ID' });
          return;
        }
        if (!Array.isArray(changes) || changes.length > 100) {
          socket.emit('error', { message: 'Invalid changes format' });
          return;
        }

        socket.to(roomId).emit('edge-change', changes);
      } catch (error) {
        logger.error('Error processing edge-change', { error: error.message });
        socket.emit('error', { message: 'Failed to process edge change' });
      }
    });

    // ── Cursor Move ──
    socket.on('cursor-move', (payload) => {
      try {
        const parsed = cursorMoveSchema.safeParse(payload);
        if (!parsed.success) return;
        
        const { roomId, x, y } = parsed.data;
        if (currentRoom !== roomId) return;

        socket.to(roomId).emit('cursor-move', { 
          id: socket.id, 
          x, 
          y,
          user: socket.data.user
        });
      } catch {
        // Silently drop invalid cursor moves — high-frequency event
      }
    });

    // ── Diagram State (full replacement) ──
    socket.on('diagram-state', async (payload) => {
      try {
        const { roomId, nodes, edges } = payload || {};
        if (!roomId || currentRoom !== roomId) {
          socket.emit('error', { message: 'Invalid room ID' });
          return;
        }
        if (!Array.isArray(nodes) || !Array.isArray(edges)) {
          socket.emit('error', { message: 'Invalid diagram state' });
          return;
        }
        if (nodes.length > 500 || edges.length > 1000) {
          socket.emit('error', { message: 'Diagram exceeds size limits' });
          return;
        }

        const parsedNodes = z.array(nodeSchema).safeParse(nodes);
        const parsedEdges = z.array(edgeSchema).safeParse(edges);

        if (!parsedNodes.success || !parsedEdges.success) {
          socket.emit('error', { message: 'Invalid diagram state elements' });
          return;
        }

        const room = rooms.get(roomId);
        if (room) {
          room.nodes = parsedNodes.data;
          room.edges = parsedEdges.data;
          room.version = (room.version || 0) + 1;
          await saveRoomToDB(roomId, room);
        }

        socket.to(roomId).emit('diagram-state', { nodes, edges });
      } catch (error) {
        logger.error('Error processing diagram-state', { error: error.message });
        socket.emit('error', { message: 'Failed to update diagram state' });
      }
    });

    // ── Disconnect ──
    socket.on('disconnect', async (reason) => {
      logger.info('User disconnected', { socketId: socket.id, reason });
      try {
        if (currentRoom) {
          const room = rooms.get(currentRoom);
          if (room) {
            room.users = room.users.filter((user) => user.id !== socket.id);
            if (room.users.length === 0) {
              // Start a cleanup timer — delete room after 5 minutes if no one rejoins
              const roomIdToClean = currentRoom;
              setTimeout(async () => {
                const r = rooms.get(roomIdToClean);
                if (r && r.users.length === 0) {
                  rooms.delete(roomIdToClean);
                  if (db && redisAvailable) {
                    try { await db.del(`room:${roomIdToClean}`); } catch { /* ignore */ }
                  }
                  logger.info('Room cleaned up after inactivity', { roomId: roomIdToClean });
                }
              }, 5 * 60 * 1000).unref();
            } else {
              await saveRoomToDB(currentRoom, room);
            }
            socket.to(currentRoom).emit('user-left', socket.id);
          }
        }
      } catch (error) {
        logger.error('Error during disconnect', { socketId: socket.id, error: error.message });
      }
    });
  } catch (error) {
    logger.error('Fatal connection error', { socketId: socket.id, error: error.message });
    socket.emit('error', { message: 'Connection failed' });
    socket.disconnect();
  }
});

// ── Graceful Shutdown ────────────────────────────────────────────────────────
const gracefulShutdown = (signal) => {
  logger.info('Graceful shutdown started', { signal });
  server.close(() => {
    logger.info('HTTP server closed');
    if (db) {
      db.quit()
        .then(() => logger.info('Redis connection closed'))
        .catch(() => {})
        .finally(() => process.exit(0));
    } else {
      process.exit(0);
    }
  });

  // Force shutdown after 10 seconds
  setTimeout(() => {
    logger.error('Forced shutdown after timeout');
    process.exit(1);
  }, 10000);
};

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));
process.on('uncaughtException', (err) => {
  logger.error('Uncaught Exception', { error: err.message, stack: err.stack });
  gracefulShutdown('uncaughtException');
});
process.on('unhandledRejection', (reason) => {
  logger.error('Unhandled Rejection', { reason: String(reason) });
});

// ── Start Server ─────────────────────────────────────────────────────────────
const PORT = process.env.PORT || 4002;
if (require.main === module) {
  server.listen(PORT, () => {
    logger.info(`Socket.IO server running on http://localhost:${PORT}`, {
      redis: redisAvailable ? 'connected' : 'unavailable',
      cors: ALLOWED_ORIGINS,
      env: isDev ? 'development' : 'production',
    });
  });
}

module.exports = { app, server, io, isValidRoomId, getRoomFromDB, saveRoomToDB };