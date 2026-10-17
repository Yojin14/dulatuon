export default function AppLogoIcon({ className }: { className?: string }) {
    return (
        <img src="/ccrc-logo.png" alt="Dulatuon Logo" className={className ?? 'size-8 object-contain'} />
    );
}
