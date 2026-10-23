/**
 * Promise-based confirm / alert / form dialogs, rendered by <DialogHost /> with
 * the app's own Dialog styling. Drop-in replacement for SweetAlert prompts.
 */
export type DialogTone = 'default' | 'danger' | 'success' | 'error';

export interface DialogField {
    name: string;
    label: string;
    placeholder?: string;
    multiline?: boolean;
    required?: boolean;
}

export interface DialogRequest {
    kind: 'confirm' | 'alert' | 'form';
    title: string;
    description?: string;
    confirmLabel?: string;
    cancelLabel?: string;
    tone?: DialogTone;
    fields?: DialogField[];
}

export type DialogValues = Record<string, string>;

interface PendingDialog extends DialogRequest {
    id: number;
    resolve: (result: { confirmed: boolean; values: DialogValues }) => void;
}

type Listener = (dialog: PendingDialog | null) => void;

let current: PendingDialog | null = null;
let nextId = 1;
const listeners = new Set<Listener>();

function emit(): void {
    listeners.forEach((listener) => listener(current));
}

function open(request: DialogRequest): Promise<{ confirmed: boolean; values: DialogValues }> {
    current?.resolve({ confirmed: false, values: {} });

    return new Promise((resolve) => {
        current = { ...request, id: nextId++, resolve };
        emit();
    });
}

export function subscribeDialog(listener: Listener): () => void {
    listeners.add(listener);
    listener(current);

    return () => listeners.delete(listener);
}

export function settleDialog(confirmed: boolean, values: DialogValues = {}): void {
    const dialog = current;
    current = null;
    emit();
    dialog?.resolve({ confirmed, values });
}

/** Ask the user to confirm. Resolves true when they confirm. */
export async function confirmDialog(request: Omit<DialogRequest, 'kind' | 'fields'>): Promise<boolean> {
    const result = await open({ kind: 'confirm', confirmLabel: 'Confirm', cancelLabel: 'Cancel', ...request });

    return result.confirmed;
}

/** Tell the user something. Resolves when dismissed. */
export async function alertDialog(request: Omit<DialogRequest, 'kind' | 'cancelLabel' | 'fields'>): Promise<void> {
    await open({ kind: 'alert', confirmLabel: 'Got it', ...request });
}

/** Collect a few text values. Resolves with the values, or null when cancelled. */
export async function formDialog(request: Omit<DialogRequest, 'kind'> & { fields: DialogField[] }): Promise<DialogValues | null> {
    const result = await open({ kind: 'form', confirmLabel: 'Submit', cancelLabel: 'Cancel', ...request });

    return result.confirmed ? result.values : null;
}
