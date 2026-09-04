import { describe, it, expect } from 'vitest';
import { joinRealtimeRoom, broadcastToRoom } from '@/app/lib/realtime';

describe('Serverless Realtime Graceful Degradation', () => {
    it('returns null when Supabase environment variables are missing', () => {
        const channel = joinRealtimeRoom('test-room', () => { });
        expect(channel).toBeNull();
    });

    it('handles broadcasting with null channel safely', async () => {
        const success = await broadcastToRoom(null, {
            type: 'DIAGRAM_UPDATE',
            roomId: 'test-room',
            senderId: 'user-1',
            data: {},
        });
        expect(success).toBe(false);
    });
});