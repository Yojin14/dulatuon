type ToastType = 'success' | 'info' | 'error';

const TONES: Record<ToastType, { tile: string; svg: string }> = {
    success: {
        tile: '#16a34a',
        svg: '<path d="M5 12l5 5L20 7" stroke="currentColor" stroke-width="2.75" stroke-linecap="round" stroke-linejoin="round" fill="none"/>',
    },
    info: {
        tile: '#7c3aed',
        svg: '<path d="M12 8v.01M12 11v5" stroke="currentColor" stroke-width="2.75" stroke-linecap="round"/>',
    },
    error: {
        tile: '#ef4444',
        svg: '<path d="M7 7l10 10M7 17L17 7" stroke="currentColor" stroke-width="2.75" stroke-linecap="round"/>',
    },
};

let container: HTMLDivElement | null = null;

function ensureContainer(): HTMLDivElement {
    if (container && document.body.contains(container)) return container;
    container = document.createElement('div');
    container.setAttribute('role', 'status');
    container.setAttribute('aria-live', 'polite');
    container.style.cssText =
        'position:fixed;left:50%;bottom:24px;transform:translateX(-50%);z-index:9999;display:flex;flex-direction:column;align-items:center;gap:8px;pointer-events:none;width:max-content;max-width:calc(100vw - 32px);';
    document.body.appendChild(container);
    return container;
}

/**
 * Small game-HUD style toast: a dark pill with a coloured icon tile, rising
 * from the bottom centre. Theme-neutral, so it reads in light and dark mode.
 */
export function toast(
    message: string,
    type: ToastType = 'info',
    duration = 2500,
): void {
    const root = ensureContainer();
    const { tile, svg } = TONES[type];
    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    const el = document.createElement('div');
    el.style.cssText = [
        'display:flex',
        'align-items:center',
        'gap:10px',
        'max-width:420px',
        'padding:8px 16px 8px 8px',
        'background:rgba(15,23,42,0.94)',
        'color:#f8fafc',
        'border-radius:999px',
        'box-shadow:0 18px 40px -16px rgba(46,16,101,0.55),0 0 0 1px rgba(255,255,255,0.08)',
        "font:700 14px/1.35 'Figtree',ui-sans-serif,system-ui,sans-serif",
        'pointer-events:auto',
        'opacity:0',
        reduceMotion ? 'transform:none' : 'transform:translateY(12px) scale(0.98)',
        'transition:opacity .2s cubic-bezier(.25,1,.5,1),transform .25s cubic-bezier(.25,1,.5,1)',
    ].join(';');

    el.innerHTML = `
        <span style="display:inline-grid;place-items:center;width:28px;height:28px;border-radius:999px;background:${tile};color:#fff;flex-shrink:0;">
            <svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true">${svg}</svg>
        </span>
        <span>${message.replace(/</g, '&lt;')}</span>
    `;

    root.appendChild(el);
    requestAnimationFrame(() => {
        el.style.opacity = '1';
        el.style.transform = 'none';
    });

    window.setTimeout(() => {
        el.style.opacity = '0';
        if (!reduceMotion) {
            el.style.transform = 'translateY(8px)';
        }
        window.setTimeout(() => el.remove(), 220);
    }, duration);
}
