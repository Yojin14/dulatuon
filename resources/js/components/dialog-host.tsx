import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { settleDialog, subscribeDialog, type DialogRequest, type DialogValues } from '@/lib/dialog';
import { cn } from '@/lib/utils';
import { AlertTriangle, CheckCircle2, Info, XCircle } from 'lucide-react';
import { useEffect, useState, type FormEvent } from 'react';

const TONES = {
    default: { icon: Info, tile: 'bg-violet-100 text-violet-700 dark:bg-violet-500/15 dark:text-violet-300' },
    danger: { icon: AlertTriangle, tile: 'bg-red-100 text-red-700 dark:bg-red-500/15 dark:text-red-300' },
    success: { icon: CheckCircle2, tile: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300' },
    error: { icon: XCircle, tile: 'bg-red-100 text-red-700 dark:bg-red-500/15 dark:text-red-300' },
} as const;

type HostedDialog = DialogRequest & { id: number };

function DialogBody({ dialog }: { dialog: HostedDialog }) {
    const [values, setValues] = useState<DialogValues>(() => Object.fromEntries((dialog.fields ?? []).map((f) => [f.name, ''])));
    const [error, setError] = useState<string | null>(null);
    const tone = TONES[dialog.tone ?? 'default'];
    const Icon = tone.icon;
    const isForm = dialog.kind === 'form';

    const submit = (event?: FormEvent) => {
        event?.preventDefault();
        if (isForm && (dialog.fields ?? []).some((f) => f.required !== false && !values[f.name]?.trim())) {
            setError('Please fill in every field.');

            return;
        }
        settleDialog(true, values);
    };

    return (
        <form onSubmit={submit} className="grid gap-4">
            {!isForm && (
                <span className={cn('grid size-12 place-items-center rounded-2xl', tone.tile)}>
                    <Icon className="size-6" />
                </span>
            )}
            <div>
                <DialogTitle>{dialog.title}</DialogTitle>
                {dialog.description ? (
                    <DialogDescription className="mt-2 leading-relaxed">{dialog.description}</DialogDescription>
                ) : (
                    <DialogDescription className="sr-only">{dialog.title}</DialogDescription>
                )}
            </div>

            {isForm &&
                (dialog.fields ?? []).map((field, index) => (
                    <div key={field.name} className="grid gap-2">
                        <Label htmlFor={`dialog-${field.name}`}>{field.label}</Label>
                        {field.multiline ? (
                            <Textarea
                                id={`dialog-${field.name}`}
                                rows={4}
                                placeholder={field.placeholder}
                                value={values[field.name]}
                                autoFocus={index === 0}
                                onChange={(e) => setValues((v) => ({ ...v, [field.name]: e.target.value }))}
                            />
                        ) : (
                            <Input
                                id={`dialog-${field.name}`}
                                placeholder={field.placeholder}
                                value={values[field.name]}
                                autoFocus={index === 0}
                                onChange={(e) => setValues((v) => ({ ...v, [field.name]: e.target.value }))}
                            />
                        )}
                    </div>
                ))}
            {error && <p className="text-sm font-semibold text-red-600 dark:text-red-400">{error}</p>}

            <div className="flex gap-2">
                {dialog.kind !== 'alert' && (
                    <Button type="button" variant="outline" className="flex-1" onClick={() => settleDialog(false)}>
                        {dialog.cancelLabel}
                    </Button>
                )}
                <Button type="submit" autoFocus={!isForm} variant={dialog.tone === 'danger' ? 'destructive' : 'default'} className="flex-1">
                    {dialog.confirmLabel}
                </Button>
            </div>
        </form>
    );
}

/** Renders dialogs requested through confirmDialog(), alertDialog() and formDialog(). Mount once. */
export function DialogHost() {
    const [dialog, setDialog] = useState<HostedDialog | null>(null);

    useEffect(() => subscribeDialog(setDialog), []);

    return (
        <Dialog open={dialog !== null} onOpenChange={(open) => !open && settleDialog(false)}>
            {dialog && (
                <DialogContent key={dialog.id} className="max-w-md">
                    <DialogBody dialog={dialog} />
                </DialogContent>
            )}
        </Dialog>
    );
}
