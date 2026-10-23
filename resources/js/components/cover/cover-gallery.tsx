import { cn } from '@/lib/utils';
import { Check, Loader2, Upload } from 'lucide-react';
import { useRef, useState } from 'react';
import { COVER_PRESETS, CoverArt, coverToFile } from './cover-art';

/**
 * Pick a ready-made Dulatuon cover or upload your own photo. A picked preset is
 * rendered to a PNG in the browser and handed back exactly like an uploaded file.
 */
export function CoverGallery({
    onPick,
    onUpload,
    selectedId,
    className,
}: {
    onPick: (file: File, presetId: string) => void;
    onUpload: () => void;
    selectedId?: string | null;
    className?: string;
}) {
    const artRefs = useRef<Record<string, SVGSVGElement | null>>({});
    const [busyId, setBusyId] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);

    const pick = async (id: string) => {
        const svg = artRefs.current[id];
        if (!svg || busyId) {
            return;
        }
        setBusyId(id);
        setError(null);
        try {
            onPick(await coverToFile(svg, `dulatuon-cover-${id}`), id);
        } catch (e) {
            setError((e as Error).message || 'Could not use that cover. Try another one.');
        } finally {
            setBusyId(null);
        }
    };

    return (
        <div className={cn('flex flex-col gap-3', className)}>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                <button
                    type="button"
                    onClick={onUpload}
                    className="group flex aspect-video cursor-pointer flex-col items-center justify-center gap-1.5 rounded-2xl border-2 border-dashed border-border bg-muted/40 px-3 text-center transition-colors hover:border-primary/50 hover:bg-primary/5"
                >
                    <span className="flex size-9 items-center justify-center rounded-xl bg-card text-primary shadow-sm">
                        <Upload className="size-4" />
                    </span>
                    <span className="text-sm font-bold text-foreground">Upload your own</span>
                    <span className="text-[11px] text-muted-foreground">JPG, PNG, WebP · 4 MB</span>
                </button>

                {COVER_PRESETS.map((preset) => {
                    const selected = selectedId === preset.id;
                    const busy = busyId === preset.id;
                    return (
                        <button
                            key={preset.id}
                            type="button"
                            onClick={() => void pick(preset.id)}
                            disabled={!!busyId}
                            aria-pressed={selected}
                            aria-label={`Use the ${preset.label} cover`}
                            className={cn(
                                'group relative aspect-video cursor-pointer overflow-hidden rounded-2xl border-2 transition-[border-color,transform] disabled:cursor-wait',
                                selected ? 'border-primary' : 'border-transparent hover:border-primary/40',
                            )}
                        >
                            <CoverArt
                                ref={(el) => {
                                    artRefs.current[preset.id] = el;
                                }}
                                preset={preset}
                                className="absolute inset-0 h-full w-full transition-transform duration-300 group-hover:scale-[1.04]"
                            />
                            <span className="absolute inset-x-0 bottom-0 bg-linear-to-t from-slate-900/70 to-transparent px-2.5 pt-6 pb-1.5 text-left text-xs font-bold text-white">
                                {preset.label}
                            </span>
                            {(selected || busy) && (
                                <span className="absolute top-2 right-2 flex size-6 items-center justify-center rounded-full bg-primary text-primary-foreground shadow">
                                    {busy ? <Loader2 className="size-3.5 animate-spin" /> : <Check className="size-3.5" />}
                                </span>
                            )}
                        </button>
                    );
                })}
            </div>
            {error && <p className="text-xs font-medium text-destructive">{error}</p>}
        </div>
    );
}
