/**
 * Removes a plain (single-colour) background from a picture, in the browser.
 *
 * The background colour is read from the picture's border. Pixels close to that colour are
 * cleared by flooding inwards from the edges, so the same colour *inside* the subject (a
 * white window on a house, say) is kept. Edges are softened so the cut-out looks clean.
 */

const MAX_SIDE = 2048;
/** How close a pixel must be to the background colour to be removed (0–441). */
const TOLERANCE = 42;
/** Pixels a little further away become partly see-through, for smooth edges. */
const SOFT_EDGE = 26;
/** Share of the border that must be the background colour for the picture to qualify. */
const MIN_BORDER_SHARE = 0.55;

export class NoPlainBackgroundError extends Error {
    constructor() {
        super(
            'This picture has no plain background to remove. It works best on drawings and pictures on a white or single-colour background.',
        );
    }
}

function loadImage(src: string): Promise<HTMLImageElement> {
    return new Promise((resolve, reject) => {
        const image = new Image();
        image.crossOrigin = 'anonymous';
        image.onload = () => resolve(image);
        image.onerror = () =>
            reject(new Error('The picture could not be loaded.'));
        image.src = src;
    });
}

function distance(
    data: Uint8ClampedArray,
    i: number,
    color: [number, number, number],
): number {
    const dr = data[i] - color[0];
    const dg = data[i + 1] - color[1];
    const db = data[i + 2] - color[2];

    return Math.sqrt(dr * dr + dg * dg + db * db);
}

/** The most common (rounded) colour along the picture's border, and how much of the border it covers. */
function borderColor(data: Uint8ClampedArray, width: number, height: number) {
    const counts = new Map<
        number,
        { n: number; r: number; g: number; b: number }
    >();
    let total = 0;
    const visit = (x: number, y: number) => {
        const i = (y * width + x) * 4;
        if (data[i + 3] < 128) {
            return;
        }
        total++;
        const key =
            ((data[i] >> 4) << 8) |
            ((data[i + 1] >> 4) << 4) |
            (data[i + 2] >> 4);
        const entry = counts.get(key) ?? { n: 0, r: 0, g: 0, b: 0 };
        entry.n++;
        entry.r += data[i];
        entry.g += data[i + 1];
        entry.b += data[i + 2];
        counts.set(key, entry);
    };
    for (let x = 0; x < width; x++) {
        visit(x, 0);
        visit(x, height - 1);
    }
    for (let y = 1; y < height - 1; y++) {
        visit(0, y);
        visit(width - 1, y);
    }
    let best: { n: number; r: number; g: number; b: number } | null = null;
    for (const entry of counts.values()) {
        if (!best || entry.n > best.n) {
            best = entry;
        }
    }
    if (!best || total === 0) {
        return null;
    }
    const color: [number, number, number] = [
        best.r / best.n,
        best.g / best.n,
        best.b / best.n,
    ];
    // Count border pixels close to that colour (rounding splits near shades into several buckets).
    let close = 0;
    for (let x = 0; x < width; x++) {
        for (const y of [0, height - 1]) {
            if (distance(data, (y * width + x) * 4, color) <= TOLERANCE) {
                close++;
            }
        }
    }
    for (let y = 1; y < height - 1; y++) {
        for (const x of [0, width - 1]) {
            if (distance(data, (y * width + x) * 4, color) <= TOLERANCE) {
                close++;
            }
        }
    }

    return { color, share: close / total };
}

/** Returns a PNG with the background made transparent. Throws NoPlainBackgroundError when there isn't one. */
export async function removePlainBackground(src: string): Promise<File> {
    const image = await loadImage(src);
    const scale = Math.min(
        1,
        MAX_SIDE / Math.max(image.naturalWidth, image.naturalHeight),
    );
    const width = Math.max(1, Math.round(image.naturalWidth * scale));
    const height = Math.max(1, Math.round(image.naturalHeight * scale));

    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const context = canvas.getContext('2d', { willReadFrequently: true });
    if (!context) {
        throw new Error('Your browser cannot edit pictures.');
    }
    context.drawImage(image, 0, 0, width, height);
    const pixels = context.getImageData(0, 0, width, height);
    const data = pixels.data;

    const border = borderColor(data, width, height);
    if (!border || border.share < MIN_BORDER_SHARE) {
        throw new NoPlainBackgroundError();
    }

    // Flood inwards from every border pixel that matches the background.
    const visited = new Uint8Array(width * height);
    const stack: number[] = [];
    const seed = (x: number, y: number) => {
        const p = y * width + x;
        if (
            !visited[p] &&
            distance(data, p * 4, border.color) <= TOLERANCE + SOFT_EDGE
        ) {
            visited[p] = 1;
            stack.push(p);
        }
    };
    for (let x = 0; x < width; x++) {
        seed(x, 0);
        seed(x, height - 1);
    }
    for (let y = 0; y < height; y++) {
        seed(0, y);
        seed(width - 1, y);
    }
    let cleared = 0;
    while (stack.length > 0) {
        const p = stack.pop()!;
        const i = p * 4;
        const d = distance(data, i, border.color);
        if (d <= TOLERANCE) {
            data[i + 3] = 0;
            cleared++;
        } else {
            // Soft edge: fade out pixels that are almost background, but don't flood past them.
            data[i + 3] = Math.round(
                data[i + 3] * ((d - TOLERANCE) / SOFT_EDGE),
            );
            continue;
        }
        const x = p % width;
        const y = (p - x) / width;
        if (x > 0) seed(x - 1, y);
        if (x < width - 1) seed(x + 1, y);
        if (y > 0) seed(x, y - 1);
        if (y < height - 1) seed(x, y + 1);
    }
    if (cleared === 0) {
        throw new NoPlainBackgroundError();
    }

    context.putImageData(pixels, 0, 0);
    const blob = await new Promise<Blob | null>((resolve) =>
        canvas.toBlob(resolve, 'image/png'),
    );
    if (!blob) {
        throw new Error('The picture could not be saved.');
    }

    return new File([blob], 'no-background.png', { type: 'image/png' });
}
