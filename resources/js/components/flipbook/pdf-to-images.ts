/**
 * Turns each page of a PDF into an image in the browser (pdf.js), so an uploaded PDF can
 * become ordinary flipbook pages. pdf.js and its worker only download when this runs.
 */

const TARGET_WIDTH = 1400;

export class PdfImportCancelled extends Error {}

async function openPdf(file: File) {
    const pdfjs = await import('pdfjs-dist');
    const { default: workerUrl } =
        await import('pdfjs-dist/build/pdf.worker.min.mjs?url');
    pdfjs.GlobalWorkerOptions.workerSrc = workerUrl;

    return pdfjs.getDocument({ data: new Uint8Array(await file.arrayBuffer()) })
        .promise;
}

function canvasToBlob(canvas: HTMLCanvasElement): Promise<Blob> {
    return new Promise((resolve, reject) => {
        canvas.toBlob(
            (blob) => {
                if (blob && blob.type === 'image/webp') {
                    resolve(blob);
                    return;
                }
                // Older Safari can't encode WebP; fall back to JPEG.
                canvas.toBlob(
                    (jpeg) =>
                        jpeg
                            ? resolve(jpeg)
                            : reject(new Error('Could not render a PDF page.')),
                    'image/jpeg',
                    0.85,
                );
            },
            'image/webp',
            0.82,
        );
    });
}

/**
 * Renders pages 1..maxPages one at a time and hands each image to `onPage` before
 * rendering the next, so memory stays flat even on low-end devices.
 */
export async function renderPdfPages(
    file: File,
    {
        maxPages,
        signal,
        onPage,
    }: {
        maxPages: number;
        signal?: AbortSignal;
        onPage: (
            image: File,
            pageNumber: number,
            total: number,
        ) => Promise<void>;
    },
): Promise<number> {
    const pdf = await openPdf(file);
    const total = Math.min(pdf.numPages, maxPages);
    const baseName = file.name.replace(/\.pdf$/i, '');
    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d');

    if (!context) {
        throw new Error('This browser cannot render PDF pages.');
    }

    try {
        for (let n = 1; n <= total; n++) {
            if (signal?.aborted) {
                throw new PdfImportCancelled('Import cancelled.');
            }
            const page = await pdf.getPage(n);
            const unscaled = page.getViewport({ scale: 1 });
            const viewport = page.getViewport({
                scale: Math.min(TARGET_WIDTH / unscaled.width, 3),
            });
            canvas.width = Math.floor(viewport.width);
            canvas.height = Math.floor(viewport.height);
            context.fillStyle = '#ffffff';
            context.fillRect(0, 0, canvas.width, canvas.height);
            await page.render({ canvasContext: context, viewport }).promise;
            page.cleanup();

            const blob = await canvasToBlob(canvas);
            const extension = blob.type === 'image/webp' ? 'webp' : 'jpg';
            await onPage(
                new File([blob], `${baseName}-page-${n}.${extension}`, {
                    type: blob.type,
                }),
                n,
                total,
            );
        }
    } finally {
        canvas.width = 0;
        canvas.height = 0;
        await pdf.destroy();
    }

    return total;
}
