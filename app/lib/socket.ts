import { io, type Socket } from 'socket.io-client';

export interface UserMetadata {
  name: string;
  avatar: string;
}

export interface CursorMoveEmitPayload {
  roomId: string;
  x: number;
  y: number;
}

export interface CursorMoveListenPayload {
  id: string;
  x: number;
  y: number;
  user?: UserMetadata;
}

/**
 * Create a Socket.IO client with authentication.
 *
 * The server URL is read from `NEXT_PUBLIC_SOCKET_URL` (validated at startup
 * by `app/lib/env.ts`). Falls back to `http://localhost:4002` in development
 * only when the env variable is absent, which env.ts already warns about.
 *
 * @param accessToken - The Supabase access token (JWT) to send to the server.
 *                      In development, a placeholder token is used if none is provided.
 */
export function createSocket(accessToken?: string): Socket {
  const serverUrl =
    process.env.NEXT_PUBLIC_SOCKET_URL ||
    (process.env.NODE_ENV !== 'production' ? 'http://localhost:4002' : '');

  if (!serverUrl) {
    throw new Error(
      'NEXT_PUBLIC_SOCKET_URL is not set. Check your environment configuration.'
    );
  }

  const token =
    accessToken || (process.env.NODE_ENV !== 'production' ? 'dev-token' : undefined);

  return io(serverUrl, {
    autoConnect: false,
    transports: ['polling', 'websocket'],
    reconnectionAttempts: 5,
    reconnectionDelay: 1000,
    timeout: 10000,
    auth: token ? { token } : undefined,
  });
}