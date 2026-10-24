import AppLogo from '@/components/app-logo';
import { LowPolyBlock, LowPolyClouds } from '@/components/game/low-poly-scene';
import { HeroWorld } from '@/components/three/hero-world';
import { welcome } from '@/routes';
import { Link } from '@inertiajs/react';
import { type PropsWithChildren } from 'react';

interface AuthLayoutProps {
    name?: string;
    title?: string;
    description?: string;
}

/**
 * Split auth screen: the sky world with the live diorama on wide screens, a
 * quiet form column beside it. On phones the 3D is skipped entirely.
 */
export default function AuthSimpleLayout({
    children,
    title,
    description,
}: PropsWithChildren<AuthLayoutProps>) {
    return (
        <div className="grid min-h-svh bg-background lg:grid-cols-[minmax(0,1.15fr)_minmax(0,1fr)]">
            <aside className="relative isolate hidden overflow-hidden bg-world-sky text-[oklch(0.22_0.04_40)] lg:flex lg:flex-col">
                <LowPolyClouds className="absolute inset-x-0 top-20 -z-10 opacity-90" />
                <div className="p-10">
                    <Link
                        href={welcome()}
                        className="flex w-fit items-center rounded-xl focus-visible:ring-4 focus-visible:ring-violet-500/30 focus-visible:outline-none"
                    >
                        <AppLogo />
                    </Link>
                </div>

                <HeroWorld className="min-h-0 flex-1" />

                <div className="p-10 pt-0">
                    <p className="max-w-[18ch] font-display text-4xl leading-[1.02] font-extrabold tracking-[-0.035em]">
                        Learn science by playing it.
                    </p>
                    <p className="mt-3 text-sm font-semibold text-[oklch(0.38_0.05_45)]">
                        Live from our Earthquakes course. Drag to look around.
                    </p>
                </div>
                <div
                    aria-hidden
                    className="h-4 bg-[linear-gradient(180deg,#6fbf5a_0_40%,#c99a6b_40%_70%,#a3623f_70%)]"
                />
            </aside>

            <main className="flex flex-col">
                {/* Phone header: a sky strip with the SVG diorama, no WebGL */}
                <div className="relative overflow-hidden bg-world-sky px-5 pt-5 lg:hidden">
                    <LowPolyClouds className="absolute inset-x-0 top-0 opacity-80" />
                    <div className="relative flex items-end justify-between gap-4">
                        <Link
                            href={welcome()}
                            className="mb-5 flex items-center rounded-xl"
                        >
                            <AppLogo />
                        </Link>
                        <LowPolyBlock className="w-28 translate-y-3" />
                    </div>
                    <div
                        aria-hidden
                        className="-mx-5 h-3 bg-[linear-gradient(180deg,#6fbf5a_0_45%,#c99a6b_45%)]"
                    />
                </div>

                <div className="flex flex-1 items-center justify-center px-5 py-10 sm:px-8 lg:py-12">
                    <div className="w-full max-w-sm">
                        <div className="mb-8">
                            <h1 className="font-display text-[2rem] leading-tight font-extrabold tracking-[-0.03em]">
                                {title}
                            </h1>
                            {description && (
                                <p className="mt-2 text-muted-foreground">
                                    {description}
                                </p>
                            )}
                        </div>
                        {children}
                    </div>
                </div>
            </main>
        </div>
    );
}
