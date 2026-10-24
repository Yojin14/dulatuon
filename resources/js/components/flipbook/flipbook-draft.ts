import { useEffect } from 'react';
import { type FlipbookPage } from './flipbook-types';

/**
 * Unsaved flipbook work kept in this browser, so a closed tab, a crash or a dead battery
 * doesn't cost the teacher their pages. Images are already on the server by the time they
 * appear in a page, so only the page data needs keeping here.
 */
export interface FlipbookDraft {
    title: string;
    description: string;
    pages: FlipbookPage[];
    savedAt: number;
}

const PREFIX = 'dulatuon:flipbook-draft:';
const MAX_AGE_MS = 30 * 24 * 60 * 60 * 1000;

export function flipbookDraftKey(
    userId: number | string | undefined,
    courseId: string | undefined,
    lessonId: string | number,
    contentId?: number | string,
): string {
    return `${PREFIX}${userId ?? 'guest'}:${courseId ?? 'local'}:${lessonId}:${contentId ?? 'new'}`;
}

export function readFlipbookDraft(key: string): FlipbookDraft | null {
    try {
        const raw = window.localStorage.getItem(key);
        if (!raw) {
            return null;
        }
        const draft = JSON.parse(raw) as FlipbookDraft;
        if (
            !Array.isArray(draft.pages) ||
            Date.now() - draft.savedAt > MAX_AGE_MS
        ) {
            window.localStorage.removeItem(key);
            return null;
        }
        return draft;
    } catch {
        return null;
    }
}

export function writeFlipbookDraft(
    key: string,
    draft: Omit<FlipbookDraft, 'savedAt'>,
): boolean {
    try {
        // Local preview images (blob: URLs) die with the tab, so they are not worth keeping.
        const pages = draft.pages.map((page) => ({
            ...page,
            images: page.images.filter(
                (image) => !image.url.startsWith('blob:'),
            ),
        }));
        window.localStorage.setItem(
            key,
            JSON.stringify({ ...draft, pages, savedAt: Date.now() }),
        );
        return true;
    } catch {
        return false;
    }
}

export function clearFlipbookDraft(key: string): void {
    try {
        window.localStorage.removeItem(key);
    } catch {
        /* storage unavailable: nothing to clear */
    }
}

/** Debounced autosave of the current flipbook while `enabled`, reporting when each save lands. */
export function useFlipbookAutosave(
    key: string,
    draft: Omit<FlipbookDraft, 'savedAt'>,
    enabled: boolean,
    onSaved: (savedAt: number | null) => void,
): void {
    const serialised = JSON.stringify(draft);

    useEffect(() => {
        if (!enabled) {
            return;
        }
        const timer = window.setTimeout(() => {
            onSaved(
                writeFlipbookDraft(key, JSON.parse(serialised))
                    ? Date.now()
                    : null,
            );
        }, 600);

        return () => window.clearTimeout(timer);
    }, [key, serialised, enabled, onSaved]);
}

export function formatDraftTime(savedAt: number): string {
    const date = new Date(savedAt);
    const sameDay = date.toDateString() === new Date().toDateString();

    return sameDay
        ? date.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })
        : date.toLocaleString([], {
              month: 'short',
              day: 'numeric',
              hour: 'numeric',
              minute: '2-digit',
          });
}
