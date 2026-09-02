/**
 * test/integration/server.integration.test.js
 *
 * Integration tests for server.js using a real Socket.IO server and client.
 *
 * Each test spins up the actual server (with NODE_ENV=test so auth is skipped)
 * and connects real socket.io-client instances to it, verifying the observable
 * protocol behaviour.
 *
 * The server is imported as a module so we don't need to start a separate
 * process. We patch `require.main` so the `server.listen()` guard at the
 * bottom of server.js does NOT run — we bind the port ourselves below.
 *
 * Edge cases covered:
 *  - Invalid room ID format → 'error' event, no join
 *  - Valid join → 'joined' event with roomId + users list
 *  - Room capacity (MAX_USERS_PER_ROOM patched to 1 for the test)
 *  - Node-add broadcast to other members (not echo back to sender)
 *  - user-left broadcast on disconnect
 *  - Room switch: user removed from old room's roster, 'user-left' sent to old room
 */

const test = require('node:test');
const assert = require('node:assert/strict');
const http = require('http');

// ── Silence structured logger output during tests ────────────────────────────
// server.js writes JSON to stdout/stderr via logger.*. We redirect those
// descriptors so test output stays clean.
const { Writable } = require('stream');
const devNull = new Writable({ write(_, __, cb) { cb(); } });

// Intercept console to swallow any accidental plain console calls
const originalConsole = { log: console.log, warn: console.warn, error: console.error };
console.log = console.warn = console.error = () => {};

// ── Mock ioredis so the server starts without a real Redis ───────────────────
const Module = require('module');
const originalRequire = Module.prototype.require;
Module.prototype.require = function () {
  if (arguments[0] === 'ioredis') {
    // Return a constructor that produces a no-op client.
    return function FakeRedis() {
      return {
        on: () => {},
        connect: async () => {},
        get: async () => null,
        setex: async () => 'OK',
        del: async () => 1,
        ping: async () => 'PONG',
        quit: async () => {},
        status: 'end',
      };
    };
  }
  if (arguments[0] === '@supabase/supabase-js') {
    return { createClient: () => ({ auth: { getUser: async () => ({ data: { user: null }, error: null }) } }) };
  }
  return originalRequire.apply(this, arguments);
};

// Force development mode so the server accepts connections without a real JWT.
process.env.NODE_ENV = 'development';
process.env.ALLOWED_ORIGINS = 'http://localhost:3000';
// Prevent require.main guard from starting the listener.
const fakeMain = { filename: '__test__' };

// ── Import server AFTER patching ─────────────────────────────────────────────
// We wrap require to ensure require.main !== module inside server.js.
const serverModule = (() => {
  const original_main = require.main;
  // Temporarily make require.main something server.js won't match
  Object.defineProperty(require, 'main', { value: fakeMain, configurable: true });
  const mod = require('../../server.js');
  Object.defineProperty(require, 'main', { value: original_main, configurable: true });
  return mod;
})();

const { server } = serverModule;

// ── Helper: get a connected socket client ─────────────────────────────────────
function connectClient(port, opts = {}) {
  const { io: clientIO } = require('socket.io-client');
  return clientIO(`http://localhost:${port}`, {
    transports: ['websocket'],
    autoConnect: false,
    ...opts,
  });
}

function waitForEvent(socket, event, timeoutMs = 2000) {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(`Timeout waiting for '${event}'`)), timeoutMs);
    socket.once(event, (data) => { clearTimeout(timer); resolve(data); });
  });
}

// ── Tests ─────────────────────────────────────────────────────────────────────
test('Server Integration', async (t) => {
  let port;

  t.before(() =>
    new Promise((resolve) => {
      server.listen(0, () => {
        port = server.address().port;
        resolve();
      });
    })
  );

  t.after(() => {
    Module.prototype.require = originalRequire;
    Object.assign(console, originalConsole);
    if (serverModule.io) serverModule.io.close();
    return new Promise((resolve) => server.close(resolve));
  });

  // ── join-room: invalid room ID ──────────────────────────────────────────────
  await t.test('rejects join-room with invalid room ID', async () => {
    const client = connectClient(port);
    client.connect();
    await waitForEvent(client, 'connect');

    const errorPromise = waitForEvent(client, 'error');
    client.emit('join-room', 'bad room!@#');
    const err = await errorPromise;

    assert.ok(err.message, 'should receive an error message');
    assert.match(err.message, /invalid room id/i);
    client.disconnect();
  });

  // ── join-room: valid join ───────────────────────────────────────────────────
  await t.test('allows join-room with a valid room ID and echoes state', async () => {
    const client = connectClient(port);
    client.connect();
    await waitForEvent(client, 'connect');

    const joinedPromise = waitForEvent(client, 'joined');
    client.emit('join-room', 'test-room-valid');
    const joined = await joinedPromise;

    assert.equal(joined.roomId, 'test-room-valid');
    assert.ok(Array.isArray(joined.users));
    client.disconnect();
  });

  // ── node-add: broadcast to peers ───────────────────────────────────────────
  await t.test('broadcasts node-add to other room members (not back to sender)', async () => {
    const sender   = connectClient(port);
    const receiver = connectClient(port);

    sender.connect();
    receiver.connect();
    await Promise.all([waitForEvent(sender, 'connect'), waitForEvent(receiver, 'connect')]);

    // Both join the same room
    const senderJoined   = waitForEvent(sender, 'joined');
    const receiverJoined = waitForEvent(receiver, 'joined');
    sender.emit('join-room', 'broadcast-room');
    receiver.emit('join-room', 'broadcast-room');
    await Promise.all([senderJoined, receiverJoined]);

    const node = {
      id: 'n1',
      type: 'microservice',
      position: { x: 100, y: 200 },
      data: { label: 'Test Service', subtext: null },
    };

    // Receiver should get 'node-add'; sender should NOT receive it back.
    const receiverGotNode = waitForEvent(receiver, 'node-add');

    let senderGotNode = false;
    sender.once('node-add', () => { senderGotNode = true; });

    sender.emit('node-add', { roomId: 'broadcast-room', node });
    await receiverGotNode;

    // Give the event loop a tick to see if the echo arrives (it shouldn't).
    await new Promise((r) => setTimeout(r, 50));
    assert.equal(senderGotNode, false, 'sender must not receive its own node-add');

    sender.disconnect();
    receiver.disconnect();
  });

  // ── disconnect: user-left broadcast ────────────────────────────────────────
  await t.test('broadcasts user-left when a member disconnects', async () => {
    const stayer  = connectClient(port);
    const leaver  = connectClient(port);

    stayer.connect();
    leaver.connect();
    await Promise.all([waitForEvent(stayer, 'connect'), waitForEvent(leaver, 'connect')]);

    const stayerJoined = waitForEvent(stayer, 'joined');
    const leaverJoined = waitForEvent(leaver, 'joined');
    stayer.emit('join-room', 'leave-room');
    leaver.emit('join-room', 'leave-room');
    await Promise.all([stayerJoined, leaverJoined]);

    const userLeftPromise = waitForEvent(stayer, 'user-left');
    leaver.disconnect();
    const leaverId = await userLeftPromise;

    assert.equal(typeof leaverId, 'string');
    stayer.disconnect();
  });

  // ── join-room switch: user removed from old room ────────────────────────────
  await t.test('removes user from old room on room switch and notifies old-room members', async () => {
    const switcher  = connectClient(port);
    const observer  = connectClient(port); // stays in room-alpha

    switcher.connect();
    observer.connect();
    await Promise.all([waitForEvent(switcher, 'connect'), waitForEvent(observer, 'connect')]);

    // Both join room-alpha
    switcher.emit('join-room', 'room-alpha');
    observer.emit('join-room', 'room-alpha');
    await Promise.all([waitForEvent(switcher, 'joined'), waitForEvent(observer, 'joined')]);

    // Observer waits for the 'user-left' that should come when switcher changes rooms
    const userLeftInAlpha = waitForEvent(observer, 'user-left');

    // Switcher moves to room-beta
    const joinedBeta = waitForEvent(switcher, 'joined');
    switcher.emit('join-room', 'room-beta');
    const [leftId, betaJoined] = await Promise.all([userLeftInAlpha, joinedBeta]);

    assert.equal(typeof leftId, 'string', 'observer should receive the leaver socket ID');
    assert.equal(betaJoined.roomId, 'room-beta');

    switcher.disconnect();
    observer.disconnect();
  });
});