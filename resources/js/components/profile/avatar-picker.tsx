import { RankAvatar } from '@/components/game/rank-avatar';
import InputError from '@/components/input-error';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useInitials } from '@/hooks/use-initials';
import { presetIdFromSrc, presetsFor, type Gender } from '@/lib/avatar-presets';
import { toast } from '@/lib/toast';
import { cn } from '@/lib/utils';
import { destroy, preset as savePreset, upload } from '@/routes/avatar';
import { type SharedData } from '@/types';
import { router, usePage } from '@inertiajs/react';
import { Check, ImageUp, LoaderCircle, Trash2 } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';

const UPLOAD_SIZE = 256;

/** Centre-crops a photo to a square and shrinks it, so uploads stay small on mobile data. */
async function squarePhoto(file: File): Promise<File> {
    const url = URL.createObjectURL(file);
    try {
        const image = new Image();
        image.src = url;
        await image.decode();
        const side = Math.min(image.naturalWidth, image.naturalHeight);
        const canvas = document.createElement('canvas');
        canvas.width = UPLOAD_SIZE;
        canvas.height = UPLOAD_SIZE;
        const context = canvas.getContext('2d');
        if (!context) {
            return file;
        }
        context.drawImage(
            image,
            (image.naturalWidth - side) / 2,
            (image.naturalHeight - side) / 2,
            side,
            side,
            0,
            0,
            UPLOAD_SIZE,
            UPLOAD_SIZE,
        );
        const blob = await new Promise<Blob | null>((resolve) =>
            canvas.toBlob(resolve, 'image/webp', 0.9),
        );
        if (!blob) {
            return file;
        }
        const extension = blob.type === 'image/webp' ? 'webp' : 'png';

        return new File([blob], `avatar.${extension}`, { type: blob.type });
    } catch {
        return file;
    } finally {
        URL.revokeObjectURL(url);
    }
}

/**
 * Profile picture card: pick a pixel character (matched to the user's gender) or upload a photo.
 */
export function AvatarPicker() {
    const { auth } = usePage<SharedData>().props;
    const user = auth.user;
    const getInitials = useInitials();
    const gender = (user.gender as Gender | null | undefined) ?? null;
    const current = user.avatar ?? null;

    const [tab, setTab] = useState<'characters' | 'upload'>(
        current && !presetIdFromSrc(current) ? 'upload' : 'characters',
    );
    const [showAll, setShowAll] = useState(false);
    const [selected, setSelected] = useState<string | null>(
        presetIdFromSrc(current),
    );
    const [photo, setPhoto] = useState<{ file: File; preview: string } | null>(
        null,
    );
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const fileInput = useRef<HTMLInputElement>(null);

    useEffect(
        () => () => {
            if (photo) {
                URL.revokeObjectURL(photo.preview);
            }
        },
        [photo],
    );

    const presets = showAll ? presetsFor(null) : presetsFor(gender);
    const selectedSrc =
        presets.find((item) => item.id === selected)?.src ?? null;
    const previewSrc =
        tab === 'upload'
            ? (photo?.preview ?? current)
            : (selectedSrc ?? current);
    const characterChanged =
        selected !== null && selected !== presetIdFromSrc(current);

    const finish = (message: string) => ({
        preserveScroll: true,
        onStart: () => {
            setSaving(true);
            setError(null);
        },
        onSuccess: () => toast(message, 'success'),
        onError: (errors: Record<string, string>) =>
            setError(
                errors.avatar ?? errors.preset ?? 'Could not save. Try again.',
            ),
        onFinish: () => setSaving(false),
    });

    const chooseFile = async (file: File | undefined) => {
        if (!file) {
            return;
        }
        if (!file.type.startsWith('image/')) {
            setError('That file is not a photo.');

            return;
        }
        const squared = await squarePhoto(file);
        setError(null);
        setPhoto({ file: squared, preview: URL.createObjectURL(squared) });
    };

    const savePhoto = () => {
        if (!photo) {
            return;
        }
        router.post(
            upload().url,
            { avatar: photo.file },
            {
                ...finish('Profile picture updated'),
                forceFormData: true,
                onSuccess: () => {
                    setPhoto(null);
                    toast('Profile picture updated', 'success');
                },
            },
        );
    };

    const saveCharacter = () => {
        if (!selected) {
            return;
        }
        router.put(
            savePreset().url,
            { preset: selected },
            finish('Character saved'),
        );
    };

    const remove = () => {
        router.delete(destroy().url, {
            ...finish('Profile picture removed'),
            onSuccess: () => {
                setSelected(null);
                setPhoto(null);
                toast('Profile picture removed', 'success');
            },
        });
    };

    return (
        <section className="rounded-3xl border bg-card p-5 shadow-panel sm:p-6">
            <div className="flex items-center gap-4">
                {user.role === 'student' ? (
                    <RankAvatar
                        name={user.name}
                        src={previewSrc}
                        xp={user.xp ?? 0}
                        size="lg"
                    />
                ) : (
                    <Avatar className="size-16 rounded-2xl text-xl">
                        <AvatarImage
                            src={previewSrc ?? undefined}
                            alt={user.name}
                        />
                        <AvatarFallback className="rounded-2xl bg-primary/10 font-bold text-primary">
                            {getInitials(user.name)}
                        </AvatarFallback>
                    </Avatar>
                )}
                <div className="min-w-0 flex-1">
                    <h2 className="font-display text-lg font-bold">
                        Profile picture
                    </h2>
                    <p className="text-sm text-muted-foreground">
                        Pick a character or upload your own photo.
                    </p>
                </div>
                {current && (
                    <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={remove}
                        disabled={saving}
                        className="shrink-0 text-muted-foreground"
                    >
                        <Trash2 />
                        <span className="sr-only sm:not-sr-only">Remove</span>
                    </Button>
                )}
            </div>

            <Tabs
                value={tab}
                onValueChange={(value) => setTab(value as typeof tab)}
                className="mt-5"
            >
                <TabsList className="grid w-full grid-cols-2 sm:w-80">
                    <TabsTrigger value="characters">Characters</TabsTrigger>
                    <TabsTrigger value="upload">Upload photo</TabsTrigger>
                </TabsList>

                <TabsContent value="characters" className="mt-4">
                    <div className="grid grid-cols-4 gap-2 sm:grid-cols-6">
                        {presets.map((item) => {
                            const isSelected = item.id === selected;

                            return (
                                <button
                                    key={item.id}
                                    type="button"
                                    onClick={() => setSelected(item.id)}
                                    aria-pressed={isSelected}
                                    aria-label={`Character ${item.id.replace('-', ' ')}`}
                                    className={cn(
                                        'relative aspect-square cursor-pointer overflow-hidden rounded-2xl ring-1 ring-border transition focus-visible:outline-none',
                                        isSelected
                                            ? 'ring-[3px] ring-primary'
                                            : 'hover:ring-2 hover:ring-primary/40 focus-visible:ring-2 focus-visible:ring-primary/60',
                                    )}
                                >
                                    <img
                                        src={item.src}
                                        alt=""
                                        loading="lazy"
                                        className="size-full [image-rendering:pixelated]"
                                    />
                                    {isSelected && (
                                        <span className="absolute top-1 right-1 grid size-5 place-items-center rounded-full bg-primary text-white shadow">
                                            <Check className="size-3.5" />
                                        </span>
                                    )}
                                </button>
                            );
                        })}
                    </div>
                    <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
                        {gender === 'male' || gender === 'female' ? (
                            <button
                                type="button"
                                onClick={() => setShowAll((value) => !value)}
                                className="cursor-pointer text-sm font-semibold text-primary hover:underline"
                            >
                                {showAll
                                    ? 'Show my characters'
                                    : 'Show all characters'}
                            </button>
                        ) : (
                            <span className="text-xs text-muted-foreground">
                                Set your gender below to see matching characters
                                first.
                            </span>
                        )}
                        <Button
                            type="button"
                            onClick={saveCharacter}
                            disabled={!characterChanged || saving}
                        >
                            {saving && (
                                <LoaderCircle className="animate-spin" />
                            )}
                            Use this character
                        </Button>
                    </div>
                </TabsContent>

                <TabsContent value="upload" className="mt-4">
                    <input
                        ref={fileInput}
                        type="file"
                        accept="image/jpeg,image/png,image/webp"
                        className="sr-only"
                        onChange={(event) => {
                            void chooseFile(event.target.files?.[0]);
                            event.target.value = '';
                        }}
                    />
                    <button
                        type="button"
                        onClick={() => fileInput.current?.click()}
                        onDragOver={(event) => event.preventDefault()}
                        onDrop={(event) => {
                            event.preventDefault();
                            void chooseFile(event.dataTransfer.files?.[0]);
                        }}
                        className="flex w-full cursor-pointer flex-col items-center gap-2 rounded-2xl border-2 border-dashed border-border bg-muted/40 px-4 py-8 text-center transition-colors hover:border-primary/50 hover:bg-primary/5"
                    >
                        <span className="grid size-11 place-items-center rounded-xl bg-primary/10 text-primary">
                            <ImageUp className="size-5" />
                        </span>
                        <span className="text-sm font-semibold">
                            {photo
                                ? 'Choose a different photo'
                                : 'Choose a photo'}
                        </span>
                        <span className="text-xs text-muted-foreground">
                            JPG, PNG or WebP. It is cropped to a square.
                        </span>
                    </button>
                    {photo && (
                        <div className="mt-4 flex justify-end">
                            <Button
                                type="button"
                                onClick={savePhoto}
                                disabled={saving}
                            >
                                {saving && (
                                    <LoaderCircle className="animate-spin" />
                                )}
                                Save photo
                            </Button>
                        </div>
                    )}
                </TabsContent>
            </Tabs>

            <InputError className="mt-3" message={error ?? undefined} />
        </section>
    );
}
