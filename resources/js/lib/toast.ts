type ToastType = 'success' | 'info' | 'error';

const COLORS: Record<ToastType, { bar: string; icon: string; svg: string }> = {
    success: {
        bar: '#0d9488',
        icon: '#0d9488',
        svg: '<path d="M5 12l5 5L20 7" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" fill="none"/>',
    },
    info: {
        bar: '#1e3a8a',
        icon: '#1e3a8a',
        svg: '<path d="M12 8v4m0 4h.01" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"/><circle cx="12" cy="12" r="9" stroke="currentColor" stroke-width="2" fill="none"/>',
    },
    error: {
        bar: '#ef4444',
        icon: '#ef4444',
        svg: '<path d="M6 6l12 12M6 18L18 6" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"/>',
    },
};

let container: HTMLDivElement | null = null;

function ensureContainer(): HTMLDivElement {
    if (container && document.body.contains(container)) return container;
    container = document.createElement('div');
    container.style.cssText =
        'position:fixed;top:16px;right:16px;z-index:9999;display:flex;flex-direction:column;gap:8px;pointer-events:none;';
    document.body.appendChild(container);
    return container;
}

export function toast(
    message: string,
    type: ToastType = 'info',
    duration = 2500,
): void {
    const root = ensureContainer();
    const { bar, icon, svg } = COLORS[type];

    const el = document.createElement('div');
    el.style.cssText = [
        'display:flex',
        'align-items:center',
        'gap:10px',
        'min-width:240px',
        'max-width:360px',
        'padding:10px 14px 10px 12px',
        'background:#fff',
        'color:#111827',
        'border-radius:10px',
        'border:1px solid #e5e7eb',
        `border-left:3px solid ${bar}`,
        'box-shadow:0 8px 24px rgba(0,0,0,0.10),0 2px 6px rgba(0,0,0,0.06)',
        'font:500 13px/1.4 ui-sans-serif,system-ui,-apple-system,Segoe UI,Roboto,sans-serif',
        'pointer-events:auto',
        'opacity:0',
        'transform:translateX(12px)',
        'transition:opacity .18s ease,transform .18s ease',
    ].join(';');

    el.innerHTML = `
        <span style="display:inline-flex;align-items:center;justify-content:center;width:20px;height:20px;color:${icon};flex-shrink:0;">
            <svg viewBox="0 0 24 24" width="20" height="20">${svg}</svg>
        </span>
        <span style="color:#111827;">${message.replace(/</g, '&lt;')}</span>
    `;

    root.appendChild(el);
    requestAnimationFrame(() => {
        el.style.opacity = '1';
        el.style.transform = 'translateX(0)';
    });

    window.setTimeout(() => {
        el.style.opacity = '0';
        el.style.transform = 'translateX(12px)';
        window.setTimeout(() => el.remove(), 200);
    }, duration);
}
