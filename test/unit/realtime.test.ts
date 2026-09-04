import { describe, it, expect } from 'vitest';
import { BroadcastPayload } from '@/app/lib/realtime';

describe('Realtime Payload Formatting', () => {
    it('formats DIAGRAM_UPDATE event correctly', () => {
        const payload: BroadcastPayload = {
            type: 'DIAGRAM_UPDATE',
            roomId: 'room-123',
            senderId: 'user-abc',
            data: {
                nodes: [{ id: '1', position: { x: 10, y: 20 } }],
                edges: [],
            },
        };

        expect(payload.type).toBe('DIAGRAM_UPDATE');
        expect(payload.roomId).toBe('room-123');
        expect(payload.senderId).toBe('user-abc');
    });

    it('formats CURSOR_MOVE event correctly', () => {
        const payload: BroadcastPayload = {
            type: 'CURSOR_MOVE',
            roomId: 'room-123',
            senderId: 'user-abc',
            data: { x: 250, y: 400 },
        };

        expect(payload.type).toBe('CURSOR_MOVE');
        expect((payload.data as { x: number }).x).toBe(250);
    });
});