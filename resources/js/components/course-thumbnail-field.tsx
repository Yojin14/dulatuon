import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { GripVertical, Upload, X } from 'lucide-react';
import { useRef, useState } from 'react';

interface CourseThumbnailFieldProps {
    /** Current preview image URL (an existing thumbnail or an object URL for a freshly picked file). */
    preview: string | null;
    /** Initial focus point (percentages). Used to seed the live preview; the component owns it afterwards. */
    initialFocusX?: number;
    initialFocusY?: number;
    error?: string;
    /** A new image file was chosen. The parent should store the File and set `preview` to an object URL. */
    onSelect: (file: File) => void;
    /** The image was removed. The parent should clear the File and `preview`. */
    onRemove: () => void;
    /** The focus point changed (drag, select, or remove). Value is a CSS object-position string, e.g. "50.0% 50.0%". */
    onFocusChange: (focus: string) => void;
}

export function CourseThumbnailField({
    preview,
    initialFocusX = 50,
    initialFocusY = 50,
    error,
    onSelect,
    onRemove,
    onFocusChange,
}: CourseThumbnailFieldProps) {
    const inputRef = useRef<HTMLInputElement>(null);
    const containerRef = useRef<HTMLDivElement>(null);
    const imgRef = useRef<HTMLImageElement>(null);
    const dragRef = useRef<{ startX: number; startY: number; fx: number; fy: number } | null>(null);
    const focusPosRef = useRef({ x: initialFocusX, y: initialFocusY });

    const [isDragging, setIsDragging] = useState(false);
    const [focusX, setFocusX] = useState(initialFocusX);
    const [focusY, setFocusY] = useState(initialFocusY);
    focusPosRef.current = { x: focusX, y: focusY };

    function handleDragStart(e: React.MouseEvent) {
        e.preventDefault();
        const { x, y } = focusPosRef.current;
        dragRef.current = { startX: e.clientX, startY: e.clientY, fx: x, fy: y };
        setIsDragging(true);
    }

    function handleDragMove(e: React.MouseEvent) {
        if (!dragRef.current) {
            return;
        }
        const img = imgRef.current;
        const container = containerRef.current;
        if (!img || !container) {
            return;
        }
        const cw = container.offsetWidth;
        const ch = container.offsetHeight;
        const nw = img.naturalWidth || cw;
        const nh = img.naturalHeight || ch;
        const scale = Math.max(cw / nw, ch / nh);
        const overflowX = Math.max(1, nw * scale - cw);
        const overflowY = Math.max(1, nh * scale - ch);
        const dx = e.clientX - dragRef.current.startX;
        const dy = e.clientY - dragRef.current.startY;
        const newX = Math.max(0, Math.min(100, dragRef.current.fx - (dx / overflowX) * 100));
        const newY = Math.max(0, Math.min(100, dragRef.current.fy - (dy / overflowY) * 100));
        setFocusX(newX);
        setFocusY(newY);
        focusPosRef.current = { x: newX, y: newY };
    }

    function handleDragEnd() {
        if (!dragRef.current) {
            return;
        }
        dragRef.current = null;
        setIsDragging(false);
        const { x, y } = focusPosRef.current;
        onFocusChange(`${x.toFixed(1)}% ${y.toFixed(1)}%`);
    }

    function resetFocus() {
        setFocusX(50);
        setFocusY(50);
        focusPosRef.current = { x: 50, y: 50 };
        onFocusChange('50.0% 50.0%');
    }

    return (
        <Card>
            <CardHeader>
                <CardTitle className="flex items-center gap-2">
                    <Upload className="h-4 w-4 text-muted-foreground" />
                    Course Thumbnail
                </CardTitle>
                <CardDescription>
                    Shown as the cover image on the course card. Recommended: 1280×720px, JPG or PNG.
                </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
                {/* Drag-to-reposition preview */}
                <div
                    ref={containerRef}
                    className={`relative w-full select-none overflow-hidden rounded-xl bg-gray-100 ring-1 ring-gray-200 dark:bg-gray-800 dark:ring-gray-700 ${preview ? (isDragging ? 'cursor-grabbing' : 'cursor-grab') : ''}`}
                    style={{ aspectRatio: '16 / 7' }}
                    onMouseDown={preview ? handleDragStart : undefined}
                    onMouseMove={preview ? handleDragMove : undefined}
                    onMouseUp={handleDragEnd}
                    onMouseLeave={handleDragEnd}
                >
                    {preview ? (
                        <>
                            <img
                                ref={imgRef}
                                src={preview}
                                alt=""
                                draggable={false}
                                className="pointer-events-none h-full w-full object-cover"
                                style={{ objectPosition: `${focusX}% ${focusY}%` }}
                            />
                            <div className="pointer-events-none absolute inset-x-0 bottom-0 flex items-center justify-center bg-gradient-to-t from-black/50 to-transparent pb-2 pt-8">
                                <span className="flex items-center gap-1.5 text-[11px] font-medium text-white/90">
                                    <GripVertical className="h-3 w-3" />
                                    Drag to reposition
                                </span>
                            </div>
                        </>
                    ) : (
                        <button
                            type="button"
                            onClick={() => inputRef.current?.click()}
                            className="flex h-full w-full flex-col items-center justify-center gap-2 text-gray-400 transition-colors hover:bg-gray-200/60 hover:text-gray-600 dark:hover:bg-gray-700/50"
                        >
                            <Upload className="h-8 w-8" />
                            <span className="text-sm font-medium">Click to upload photo</span>
                            <span className="text-xs">JPG, PNG, WebP · Max 4 MB</span>
                        </button>
                    )}
                </div>

                {/* Controls row */}
                <div className="flex items-center gap-2">
                    <input
                        ref={inputRef}
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={(e) => {
                            const file = e.target.files?.[0] ?? null;
                            if (!file) {
                                return;
                            }
                            onSelect(file);
                            resetFocus();
                            if (inputRef.current) {
                                inputRef.current.value = '';
                            }
                        }}
                    />
                    {preview ? (
                        <>
                            <Button type="button" variant="outline" size="sm" onClick={() => inputRef.current?.click()}>
                                <Upload className="mr-2 h-4 w-4" />
                                Change Photo
                            </Button>
                            <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                className="text-gray-400 hover:text-red-500"
                                onClick={() => {
                                    onRemove();
                                    resetFocus();
                                    if (inputRef.current) {
                                        inputRef.current.value = '';
                                    }
                                }}
                            >
                                <X className="mr-1.5 h-4 w-4" />
                                Remove
                            </Button>
                        </>
                    ) : (
                        <Button type="button" variant="outline" size="sm" onClick={() => inputRef.current?.click()}>
                            <Upload className="mr-2 h-4 w-4" />
                            Upload Photo
                        </Button>
                    )}
                </div>
                {error && <p className="text-xs text-red-500">{error}</p>}
            </CardContent>
        </Card>
    );
}
