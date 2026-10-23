/**
 * Dulatuon mark — an isometric low-poly terrain block (grass top, layered
 * earth sides) echoing the simulation dioramas.
 */
export default function AppLogoIcon({ className }: { className?: string }) {
    return (
        <svg viewBox="0 0 48 48" role="img" aria-label="Dulatuon" className={className ?? 'size-8'}>
            <path d="M24 6 42 16 24 26 6 16Z" fill="#38a352" />
            <path d="M24 6 33 11 24 16 15 11Z" fill="#4cc068" />
            <path d="M15 11 24 16 24 26 6 16Z" fill="#2f8f46" opacity=".55" />
            <path d="M6 16 24 26v6L6 22Z" fill="#a0703f" />
            <path d="M6 22 24 32v5L6 27Z" fill="#7b4a2a" />
            <path d="M6 27 24 37v5L6 32Z" fill="#55301c" />
            <path d="M42 16 24 26v6l18-10Z" fill="#8a5d32" />
            <path d="M42 22 24 32v5l18-10Z" fill="#663c22" />
            <path d="M42 27 24 37v5l18-10Z" fill="#452616" />
            <path d="M28 15.5 31 11l3 6.5-3 1.7Z" fill="#fbbf24" />
        </svg>
    );
}
