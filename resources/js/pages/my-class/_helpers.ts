export function uid(): string {
    return Math.random().toString(36).slice(2, 9);
}

export async function capi<T = unknown>(
    method: string,
    url: string,
    body?: unknown,
): Promise<T> {
    const token = document.cookie.match(/XSRF-TOKEN=([^;]+)/)?.[1];
    const res = await fetch(url, {
        method,
        headers: {
            'Content-Type': 'application/json',
            Accept: 'application/json',
            'X-XSRF-TOKEN': token ? decodeURIComponent(token) : '',
        },
        body: body !== undefined ? JSON.stringify(body) : undefined,
    });
    if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(
            (err as { message?: string }).message ??
                `Request failed (${res.status})`,
        );
    }
    return res.json() as Promise<T>;
}

export async function capiForm<T = unknown>(
    url: string,
    formData: FormData,
): Promise<T> {
    const token = document.cookie.match(/XSRF-TOKEN=([^;]+)/)?.[1];
    const res = await fetch(url, {
        method: 'POST',
        headers: {
            Accept: 'application/json',
            'X-XSRF-TOKEN': token ? decodeURIComponent(token) : '',
        },
        body: formData,
    });
    if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(
            (err as { message?: string }).message ??
                `Request failed (${res.status})`,
        );
    }
    return res.json() as Promise<T>;
}

export function fmtBytes(bytes: number): string {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function tzLabel(tz: string): string {
    return tz.replace(/_/g, ' ').replace('/', ' / ');
}

export function extractYouTubeId(url: string): string {
    try {
        const u = new URL(url);
        if (u.hostname === 'youtu.be') return u.pathname.slice(1).split('?')[0];
        return u.searchParams.get('v') || '';
    } catch {
        const match = url.match(/(?:youtu\.be\/|watch\?v=|embed\/)([^&\n?#]+)/);
        return match ? match[1] : '';
    }
}
