import { useState } from 'react';

export type FlipbookImageUploader = (
    file: File,
    onProgress: (percent: number) => void,
) => Promise<string>;

export const MAX_IMAGE_BYTES = 8 * 1024 * 1024;
export const IMAGE_ACCEPT = 'image/jpeg,image/png,image/webp,image/gif';

/**
 * Checks and uploads one image for a flipbook page, tracking progress and errors.
 * `upload` resolves to the stored URL, or null when the file was refused or failed.
 */
export function useImageUpload(uploadImage: FlipbookImageUploader) {
    const [progress, setProgress] = useState<number | null>(null);
    const [error, setError] = useState<string | null>(null);

    const upload = async (file: File | undefined): Promise<string | null> => {
        if (!file) {
            return null;
        }
        if (!file.type.startsWith('image/')) {
            setError('Choose an image file (JPG, PNG, WebP or GIF).');
            return null;
        }
        if (file.size > MAX_IMAGE_BYTES) {
            setError('That image is over 8 MB. Try a smaller one.');
            return null;
        }
        setError(null);
        setProgress(0);
        try {
            return await uploadImage(file, setProgress);
        } catch (e) {
            setError((e as Error).message || 'Upload failed. Try again.');
            return null;
        } finally {
            setProgress(null);
        }
    };

    return { upload, progress, error, setError };
}
