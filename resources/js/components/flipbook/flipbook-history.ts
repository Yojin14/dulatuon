import { useCallback, useRef, useState } from 'react';
import { type FlipbookPage } from './flipbook-types';

type PagePatch = Partial<Omit<FlipbookPage, 'id' | 'body'>>;

/**
 * One undoable change to the flipbook, stored as what changed (not a snapshot of every page),
 * so undoing it never wipes out other edits made since. Body text has its own history in the
 * text editor.
 */
export type HistoryEntry =
    | { type: 'patch'; pageId: string; before: PagePatch; after: PagePatch }
    | { type: 'insert'; page: FlipbookPage; index: number }
    | { type: 'remove'; page: FlipbookPage; index: number }
    | { type: 'move'; pageId: string; from: number; to: number }
    | { type: 'batch'; entries: HistoryEntry[] };

interface Stamped {
    entry: HistoryEntry;
    at: number;
}

const LIMIT = 100;
/** Typing in the same field within this time counts as one undo step. */
const MERGE_MS = 1000;

function insertAt(pages: FlipbookPage[], page: FlipbookPage, index: number) {
    const copy = pages.filter((p) => p.id !== page.id);
    copy.splice(Math.min(Math.max(index, 0), copy.length), 0, page);
    return copy;
}

/** Apply an entry forwards (redo) or backwards (undo) to the current pages. */
function apply(
    pages: FlipbookPage[],
    entry: HistoryEntry,
    backwards: boolean,
): FlipbookPage[] {
    switch (entry.type) {
        case 'patch': {
            const values = backwards ? entry.before : entry.after;
            return pages.map((p) =>
                p.id === entry.pageId ? { ...p, ...values } : p,
            );
        }
        case 'insert':
            return backwards
                ? pages.filter((p) => p.id !== entry.page.id)
                : insertAt(pages, entry.page, entry.index);
        case 'remove':
            return backwards
                ? insertAt(pages, entry.page, entry.index)
                : pages.filter((p) => p.id !== entry.page.id);
        case 'move': {
            const page = pages.find((p) => p.id === entry.pageId);
            return page
                ? insertAt(pages, page, backwards ? entry.from : entry.to)
                : pages;
        }
        case 'batch': {
            const order = backwards
                ? [...entry.entries].reverse()
                : entry.entries;
            return order.reduce((acc, e) => apply(acc, e, backwards), pages);
        }
    }
}

/** The page an entry is about, to show it after undo/redo. */
function focusOf(entry: HistoryEntry, backwards: boolean): string | null {
    switch (entry.type) {
        case 'patch':
        case 'move':
            return entry.pageId;
        case 'insert':
            return backwards ? null : entry.page.id;
        case 'remove':
            return backwards ? entry.page.id : null;
        case 'batch':
            return entry.entries.length > 0
                ? focusOf(entry.entries[0], backwards)
                : null;
    }
}

/**
 * Undo/redo for everything in the flipbook except the body text: page fields, layout,
 * background, pictures in template spots, and adding, moving or deleting pages.
 */
export function useFlipbookHistory() {
    const undoStack = useRef<Stamped[]>([]);
    const redoStack = useRef<Stamped[]>([]);
    const [counts, setCounts] = useState({ undo: 0, redo: 0 });
    const bump = () =>
        setCounts({
            undo: undoStack.current.length,
            redo: redoStack.current.length,
        });

    const record = useCallback((entry: HistoryEntry) => {
        const now = Date.now();
        const last = undoStack.current[undoStack.current.length - 1];
        redoStack.current = [];
        // Merge quick successive edits of the same fields on the same page (typing a title).
        if (
            entry.type === 'patch' &&
            last?.entry.type === 'patch' &&
            last.entry.pageId === entry.pageId &&
            now - last.at < MERGE_MS &&
            Object.keys(last.entry.after).sort().join() ===
                Object.keys(entry.after).sort().join()
        ) {
            last.entry = { ...last.entry, after: entry.after };
            last.at = now;
        } else {
            undoStack.current = [
                ...undoStack.current.slice(-(LIMIT - 1)),
                { entry, at: now },
            ];
        }
        bump();
    }, []);

    const step = (
        pages: FlipbookPage[],
        from: React.RefObject<Stamped[]>,
        to: React.RefObject<Stamped[]>,
        backwards: boolean,
    ) => {
        const item = from.current.pop();
        if (!item) {
            return null;
        }
        to.current.push({ entry: item.entry, at: Date.now() });
        bump();

        return {
            pages: apply(pages, item.entry, backwards),
            focus: focusOf(item.entry, backwards),
        };
    };

    return {
        record,
        undo: (pages: FlipbookPage[]) =>
            step(pages, undoStack, redoStack, true),
        redo: (pages: FlipbookPage[]) =>
            step(pages, redoStack, undoStack, false),
        canUndo: counts.undo > 0,
        canRedo: counts.redo > 0,
        /** When the newest undoable (or redoable) change was made; 0 if none. */
        lastUndoAt: () =>
            undoStack.current[undoStack.current.length - 1]?.at ?? 0,
        lastRedoAt: () =>
            redoStack.current[redoStack.current.length - 1]?.at ?? 0,
    };
}
