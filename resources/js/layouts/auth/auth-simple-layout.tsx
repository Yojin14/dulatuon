import { welcome } from '@/routes';
import { Link } from '@inertiajs/react';
import { type PropsWithChildren } from 'react';

interface AuthLayoutProps {
    name?: string;
    title?: string;
    description?: string;
}

export default function AuthSimpleLayout({
    children,
    title,
    description,
}: PropsWithChildren<AuthLayoutProps>) {
    return (
        <div className="flex min-h-svh flex-col items-center justify-center gap-6 bg-gray-50 p-6 md:p-10 dark:bg-gray-950">
            <div className="w-full max-w-sm">
                {/* Logo above card */}
                <div className="mb-6 flex flex-col items-center gap-3">
                    <Link href={welcome()} className="flex items-center gap-3 font-medium">
                        <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-900 shadow-lg">
                            <img src="/ccrc-logo.png" alt="Dulatuon Logo" className="h-10 w-10 object-contain" />
                        </div>
                        <div className="flex flex-col leading-none">
                            <span className="text-[10px] font-semibold tracking-widest text-gray-400 uppercase">
                                Learning Platform
                            </span>
                            <span className="text-2xl font-bold text-blue-900 dark:text-white">
                                Dulatuon
                            </span>
                        </div>
                        <span className="sr-only">{title}</span>
                    </Link>
                </div>

                {/* White card */}
                <div className="rounded-2xl border border-gray-200 bg-white px-8 py-8 shadow-sm dark:border-gray-700 dark:bg-gray-900">
                    <div className="mb-6 space-y-1 text-center">
                        <h1 className="text-xl font-semibold text-blue-900 dark:text-white">{title}</h1>
                        {description && (
                            <p className="text-sm text-gray-500 dark:text-gray-400">{description}</p>
                        )}
                    </div>
                    {children}
                </div>
            </div>
        </div>
    );
}
