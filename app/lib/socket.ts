import { io } from 'socket.io-client';

export const socket = io('http://localhost:4002', {
    autoConnect: false, // we'll connect manually inside useEffect
});