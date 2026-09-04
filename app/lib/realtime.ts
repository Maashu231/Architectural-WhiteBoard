import { createClient, RealtimeChannel } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

// Singleton client initialization
export const supabase = (supabaseUrl && supabaseAnonKey)
    ? createClient(supabaseUrl, supabaseAnonKey)
    : null;

export interface BroadcastPayload {
    type: 'DIAGRAM_UPDATE' | 'CURSOR_MOVE' | 'USER_JOINED';
    roomId: string;
    senderId: string;
    data: unknown;
}

/**
 * Creates and connects to a Supabase Realtime Broadcast channel for a whiteboard room.
 */
export function joinRealtimeRoom(
    roomId: string,
    onMessage: (payload: BroadcastPayload) => void
): RealtimeChannel | null {
    if (!supabase) {
        console.warn('Supabase credentials not configured. Realtime sync is disabled.');
        return null;
    }

    const channel = supabase.channel(`room:${roomId}`, {
        config: { broadcast: { self: false } },
    });

    channel
        .on('broadcast', { event: 'room_event' }, ({ payload }) => {
            if (payload) {
                onMessage(payload as BroadcastPayload);
            }
        })
        .subscribe();

    return channel;
}

/**
 * Broadcasts an event to all connected peers in the room.
 */
export async function broadcastToRoom(
    channel: RealtimeChannel | null,
    payload: BroadcastPayload
): Promise<boolean> {
    if (!channel) return false;

    const response = await channel.send({
        type: 'broadcast',
        event: 'room_event',
        payload,
    });

    return response === 'ok';
}