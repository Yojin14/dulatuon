import '../css/app.css';
import './echo';

import { DialogHost } from '@/components/dialog-host';
import { createInertiaApp } from '@inertiajs/react';
import { resolvePageComponent } from 'laravel-vite-plugin/inertia-helpers';
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { initializeTheme } from './hooks/use-appearance';
import { initializeTextScale } from './hooks/use-text-scale';

const appName = import.meta.env.VITE_APP_NAME || 'Laravel';

createInertiaApp({
    title: (title) => (title ? `${title} - ${appName}` : appName),
    resolve: (name) =>
        resolvePageComponent(
            `./pages/${name}.tsx`,
            import.meta.glob('./pages/**/*.tsx'),
        ),
    setup({ el, App, props }) {
        const root = createRoot(el);

        root.render(
            <StrictMode>
                <App {...props} />
                <DialogHost />
            </StrictMode>,
        );
    },
    progress: {
        color: '#7c3aed',
    },
});

// This will set light / dark mode on load...
initializeTheme();
// Apply saved text scale before first render...
initializeTextScale();
