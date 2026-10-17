export default function AppLogo({ inverted = false }: { inverted?: boolean }) {
    return (
        <>
            <div
                className={`flex shrink-0 aspect-square size-9 items-center justify-center rounded-xl shadow-md overflow-hidden ${
                    inverted ? 'bg-white ring-1 ring-white/15' : 'bg-blue-900'
                }`}
            >
                <img src="/ccrc-logo.png" alt="Dulatuon Logo" className="size-7 object-contain" />
            </div>
            <div className="ml-2 flex flex-col leading-none group-data-[collapsible=icon]:hidden">
                <span
                    className={`text-[10px] font-semibold tracking-wider uppercase ${
                        inverted ? 'text-white/60' : 'text-gray-400 dark:text-gray-400'
                    }`}
                >
                    Learning Platform
                </span>
                <span
                    className={`-mt-0.5 text-base font-bold ${
                        inverted ? 'text-white' : 'text-blue-900 dark:text-white'
                    }`}
                >
                    Dulatuon
                </span>
            </div>
        </>
    );
}
