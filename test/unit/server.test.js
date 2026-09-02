const test = require('node:test');
const assert = require('node:assert');

process.env.REDIS_HOST = 'localhost';

const { mock } = test;
const mockGet = mock.fn();
const mockSetex = mock.fn();

const eventHandlers = {};
const mockDB = {
  get: mockGet,
  setex: mockSetex,
  quit: mock.fn(),
  ping: mock.fn(),
  on: (event, handler) => {
    eventHandlers[event] = handler;
    if (event === 'connect') {
      process.nextTick(handler);
    }
  },
  connect: async () => {
    if (eventHandlers['connect']) eventHandlers['connect']();
  },
};

// We intercept require('ioredis') for testing
const Module = require('module');
const originalRequire = Module.prototype.require;
Module.prototype.require = function() {
  if (arguments[0] === 'ioredis') {
    return function() { return mockDB; };
  }
  return originalRequire.apply(this, arguments);
};

const { isValidRoomId, getRoomFromDB, saveRoomToDB } = require('../../server.js');

test('Server Utility Functions', async (t) => {
  t.beforeEach(() => {
    mockGet.mock.restore();
    mockSetex.mock.restore();
  });

  await t.test('isValidRoomId', async (t) => {
    await t.test('should return true for valid room IDs', () => {
      assert.strictEqual(isValidRoomId('room123'), true);
      assert.strictEqual(isValidRoomId('room_123'), true);
      assert.strictEqual(isValidRoomId('room-123'), true);
      assert.strictEqual(isValidRoomId('a'), true);
      assert.strictEqual(isValidRoomId('a'.repeat(50)), true);
    });

    await t.test('should return false for invalid room IDs', () => {
      assert.strictEqual(isValidRoomId(''), false);
      assert.strictEqual(isValidRoomId('a'.repeat(51)), false);
      assert.strictEqual(isValidRoomId('room/123'), false);
      assert.strictEqual(isValidRoomId('room@123'), false);
      assert.strictEqual(isValidRoomId('room 123'), false);
    });
  });

  await t.test('getRoomFromDB', async (t) => {
    await t.test('should return room data from Redis', async () => {
      const mockRoomData = { users: [], nodes: [], edges: [] };
      mockGet.mock.mockImplementation(async () => JSON.stringify(mockRoomData));

      const result = await getRoomFromDB('test-room');
      assert.deepStrictEqual(result, mockRoomData);
      assert.strictEqual(mockGet.mock.calls[0].arguments[0], 'room:test-room');
    });

    await t.test('should return null for non-existent room', async () => {
      mockGet.mock.mockImplementation(async () => null);

      const result = await getRoomFromDB('non-existent');
      assert.strictEqual(result, null);
    });

    await t.test('should handle Redis errors gracefully', async () => {
      mockGet.mock.mockImplementation(async () => { throw new Error('Redis error'); });

      const result = await getRoomFromDB('test-room');
      assert.strictEqual(result, null);
    });
  });

  await t.test('saveRoomToDB', async (t) => {
    await t.test('should save room data to Redis', async () => {
      const roomData = { users: [], nodes: [], edges: [] };
      mockSetex.mock.mockImplementation(async () => 'OK');

      await saveRoomToDB('test-room', roomData);
      assert.strictEqual(mockSetex.mock.calls[0].arguments[0], 'room:test-room');
      assert.strictEqual(mockSetex.mock.calls[0].arguments[1], 3600);
      assert.strictEqual(mockSetex.mock.calls[0].arguments[2], JSON.stringify(roomData));
    });

    await t.test('should handle Redis errors gracefully', async () => {
      const roomData = { users: [], nodes: [], edges: [] };
      mockSetex.mock.mockImplementation(async () => { throw new Error('Redis error'); });

      try {
        await saveRoomToDB('test-room', roomData);
      } catch (err) {
        assert.ok(err);
      }
    });
  });
});

// Restore require & cleanup server handles
test.after(async () => {
  Module.prototype.require = originalRequire;
  const { server, io } = require('../../server.js');
  if (io) io.close();
  if (server && server.listening) {
    await new Promise((resolve) => server.close(resolve));
  }
});