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
                        // Shared by the course player and its lazy flipbook chunks; kept apart so the
                        // player page keeps its own manifest entry instead of becoming a shared chunk.
                        if (/components[\\/]flipbook[\\/]flipbook-(types|draft)\.ts$/.test(id)) {
                            return 'flipbook-core';
                        }
                        // Course player modules shared by the page and its lazy edit panel.
                        if (/components[\\/]course-player[\\/](types|helpers|viewers|sidebar|announcements)\.tsx?$/.test(id)) {
                            return 'course-player';
                        }
                        // Same for the games page and its lazy 3D labs.
                        if (/lib[\\/]game-audio\.ts$/.test(id)) {
                            return 'game-audio';
                        }
                        // Small shared building blocks (primitives, game HUD, world chips) in one chunk,
                        // so a page and its own lazy children never fold the page into a shared chunk.
                        if (/resources[\\/]js[\\/]components[\\/](ui|game|world)[\\/]/.test(id) || /resources[\\/]js[\\/]lib[\\/](utils|worlds|gamification)\.ts$/.test(id)) {
                            return 'app-ui';
                        }
                        return undefined;
                    }
                    if (id.includes('@radix-ui')) return 'radix';
                    if (id.includes('lucide-react') || id.includes('@phosphor-icons')) return 'icons';
                    if (id.includes('@dnd-kit')) return 'dnd';
                    if (id.includes('node_modules/three/')) return 'three';
                    if (id.includes('pusher-js') || id.includes('laravel-echo')) return 'echo';
                    if (id.includes('@tiptap') || id.includes('prosemirror')) return 'editor';
                    if (id.includes('pdfjs-dist')) return 'pdfjs';
                    if (id.includes('node_modules/motion') || id.includes('framer-motion') || id.includes('motion-dom') || id.includes('motion-utils')) return 'motion';
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
