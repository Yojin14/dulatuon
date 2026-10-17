import { wayfinder } from '@laravel/vite-plugin-wayfinder';
import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import laravel from 'laravel-vite-plugin';
import path from 'path';
import { defineConfig } from 'vite';

export default defineConfig({
    plugins: [
        laravel({
            input: ['resources/css/app.css', 'resources/js/app.tsx'],
            ssr: 'resources/js/ssr.tsx',
            refresh: true,
        }),
        react({
            babel: {
                plugins: ['babel-plugin-react-compiler'],
            },
        }),
        tailwindcss(),
        wayfinder({
            formVariants: true,
        }),
    ],
    resolve: {
        alias: {
            '@': path.resolve(__dirname, './resources/js'),
        },
    },
    esbuild: {
        jsx: 'automatic',
    },
    build: {
        sourcemap: false,
        rollupOptions: {
            output: {
                manualChunks(id) {
                    if (!id.includes('node_modules')) {
                        return undefined;
                    }
                    if (id.includes('@radix-ui')) return 'radix';
                    if (id.includes('lucide-react') || id.includes('@phosphor-icons')) return 'icons';
                    if (id.includes('@dnd-kit')) return 'dnd';
                    if (id.includes('node_modules/three/')) return 'three';
                    if (id.includes('sweetalert2')) return 'sweetalert';
                    if (id.includes('pusher-js') || id.includes('laravel-echo')) return 'echo';
                    if (
                        id.includes('node_modules/react/') ||
                        id.includes('node_modules/react-dom/') ||
                        id.includes('node_modules/scheduler/') ||
                        id.includes('node_modules/react-is/')
                    ) {
                        return 'react';
                    }
                    return 'vendor';
                },
            },
        },
    },
    server: {
        host: '127.0.0.1',
        port: 5173,
        strictPort: true,
        hmr: {
            host: 'dulatuon.dev.com',
        },
        cors: {
            origin: 'http://dulatuon.dev.com',
            credentials: true,
        },
    },
});
