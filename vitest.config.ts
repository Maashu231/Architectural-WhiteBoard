import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
    test: {
        environment: 'node',
        globals: true,
        include: ['test/unit/**/*.test.ts'], // Only run new TypeScript unit tests
    },
    resolve: {
        alias: {
            '@': path.resolve(__dirname, './'),
        },
    },
});
