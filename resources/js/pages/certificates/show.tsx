import AppLogoIcon from '@/components/app-logo-icon';
import { LowPolyBlock } from '@/components/game/low-poly-scene';
import { Button } from '@/components/ui/button';
import { worldFor } from '@/lib/worlds';
import { Head, Link } from '@inertiajs/react';
import { ArrowLeft, Printer } from 'lucide-react';

interface Certificate {
    code: string;
    student_name: string;
    course_title: string;
    course_code: string | null;
    instructor: string | null;
    modules: number;
    items: number;
    completed_at: string | null;
}

/**
 * Certificate of completion, sized as a landscape A4 sheet. On screen it sits on a
 * toolbar page; printing (or "Save as PDF") outputs just the sheet, edge to edge.
 */
export default function CertificateShow({
    certificate,
}: {
    certificate: Certificate;
}) {
    const world = worldFor({
        title: certificate.course_title,
        course_code: certificate.course_code,
    });

    return (
        <>
            <Head title={`Certificate · ${certificate.course_title}`} />
            <style>
                {
                    '@page { size: A4 landscape; margin: 0; } @media print { html, body { background: #fff !important; } }'
                }
            </style>

            <div className="min-h-svh bg-muted/60 px-4 py-6 sm:px-8 sm:py-10 print:min-h-0 print:bg-white print:p-0">
                <div className="mx-auto mb-6 flex max-w-5xl flex-wrap items-center justify-between gap-3 print:hidden">
                    <Button asChild variant="outline">
                        <Link href="/my-progress">
                            <ArrowLeft /> My Progress
                        </Link>
                    </Button>
                    <div className="flex items-center gap-3">
                        <p className="hidden text-sm text-muted-foreground sm:block">
                            Choose "Save as PDF" in the print window to keep a
                            copy.
                        </p>
                        <Button onClick={() => window.print()}>
                            <Printer /> Print or save PDF
                        </Button>
                    </div>
                </div>

                {/* The sheet */}
                <article
                    aria-label={`Certificate of completion for ${certificate.student_name}`}
                    className="relative mx-auto aspect-[297/210] w-full max-w-5xl overflow-hidden rounded-2xl bg-white text-slate-900 shadow-[0_30px_80px_-30px_rgb(15_23_42/0.45)] [print-color-adjust:exact] print:aspect-auto print:h-[210mm] print:w-[297mm] print:max-w-none print:rounded-none print:shadow-none"
                >
                    {/* Sky wash and low-poly hills, echoing the landing page */}
                    <div
                        aria-hidden
                        className="absolute inset-0 bg-[linear-gradient(180deg,#e0f2fe_0%,#ffffff_45%,#ffffff_100%)]"
                    />
                    <svg
                        aria-hidden
                        viewBox="0 0 1200 120"
                        preserveAspectRatio="none"
                        className="absolute inset-x-0 bottom-[3.2%] h-[13%] w-full"
                    >
                        <polygon
                            points="0,120 0,70 140,40 300,78 470,30 640,74 820,36 990,80 1200,44 1200,120"
                            fill="#d9f0c9"
                        />
                        <polygon
                            points="0,120 0,92 180,66 380,98 560,70 760,100 960,72 1200,96 1200,120"
                            fill="#bfe3a5"
                        />
                    </svg>
                    <div
                        aria-hidden
                        className="absolute inset-x-0 bottom-0 h-[3.2%] bg-[linear-gradient(180deg,#6fbf5a_0_40%,#c99a6b_40%_70%,#a3623f_70%)]"
                    />

                    {/* Frame */}
                    <div
                        aria-hidden
                        className="absolute inset-[3.5%] rounded-xl border-2 border-violet-200 print:rounded-none"
                    />
                    <div
                        aria-hidden
                        className="absolute inset-[4.4%] rounded-lg border border-violet-100 print:rounded-none"
                    />

                    <div className="relative flex h-full flex-col px-[9%] pt-[7.5%] pb-[10%]">
                        <header className="flex items-start justify-between gap-4">
                            <div className="flex items-center gap-2">
                                <span className="flex size-9 items-center justify-center rounded-xl bg-sky-100 ring-1 ring-sky-200">
                                    <AppLogoIcon className="size-7" />
                                </span>
                                <span className="flex flex-col leading-none">
                                    <span className="font-display text-lg font-semibold tracking-tight text-slate-900">
                                        Dulatuon
                                    </span>
                                    <span className="text-[10px] font-extrabold tracking-[0.14em] text-violet-700 uppercase">
                                        Learn by playing
                                    </span>
                                </span>
                            </div>
                            <p className="text-right font-mono text-[clamp(0.55rem,1.1vw,0.75rem)] tracking-wider text-slate-500 print:text-[9pt]">
                                {certificate.code}
                            </p>
                        </header>

                        <div className="flex flex-1 flex-col items-center justify-center text-center">
                            <p className="text-[clamp(0.6rem,1.3vw,0.85rem)] font-extrabold tracking-[0.28em] text-violet-700 uppercase print:text-[11pt]">
                                Certificate of completion
                            </p>
                            <p className="mt-[2.2%] text-[clamp(0.75rem,1.6vw,1.05rem)] text-slate-600 print:text-[13pt]">
                                This certifies that
                            </p>
                            <h1 className="mt-[1.2%] max-w-[90%] font-display text-[clamp(1.6rem,5.4vw,3.6rem)] leading-[1.05] font-extrabold tracking-[-0.03em] text-balance print:text-[44pt]">
                                {certificate.student_name}
                            </h1>
                            <div
                                aria-hidden
                                className="mt-[1.6%] h-[3px] w-[38%] rounded-full bg-[linear-gradient(90deg,transparent,#7c3aed,transparent)]"
                            />
                            <p className="mt-[2.2%] text-[clamp(0.75rem,1.6vw,1.05rem)] text-slate-600 print:text-[13pt]">
                                has cleared every module of
                            </p>
                            <p className="mt-[0.8%] max-w-[85%] font-display text-[clamp(1.05rem,3vw,2rem)] leading-tight font-extrabold tracking-[-0.02em] text-balance text-slate-900 print:text-[24pt]">
                                {certificate.course_title}
                            </p>
                            <p className="mt-[1.4%] text-[clamp(0.65rem,1.2vw,0.85rem)] font-semibold text-slate-500 print:text-[10pt]">
                                {certificate.modules}{' '}
                                {certificate.modules === 1
                                    ? 'module'
                                    : 'modules'}{' '}
                                · {certificate.items} lessons and labs completed
                                on Dulatuon
                            </p>
                        </div>

                        <footer className="grid grid-cols-[1fr_auto_1fr] items-end gap-6">
                            <div>
                                <p className="font-display text-[clamp(0.8rem,1.7vw,1.15rem)] font-bold print:text-[14pt]">
                                    {certificate.completed_at}
                                </p>
                                <div className="mt-1.5 h-px w-full max-w-56 bg-slate-300" />
                                <p className="mt-1 text-[clamp(0.55rem,1vw,0.75rem)] font-semibold tracking-wide text-slate-500 uppercase print:text-[8pt]">
                                    Date completed
                                </p>
                            </div>

                            <div className="flex w-[clamp(4.5rem,13vw,9rem)] flex-col items-center print:w-[34mm]">
                                <LowPolyBlock
                                    biome={world.biome}
                                    variant={
                                        world.biome === 'earth'
                                            ? 'quake'
                                            : 'town'
                                    }
                                    className="drop-shadow-[0_10px_10px_rgba(85,48,28,0.25)]"
                                />
                                <p
                                    className="mt-1 text-center text-[clamp(0.5rem,0.9vw,0.7rem)] font-extrabold tracking-[0.14em] uppercase"
                                    style={{ color: world.accentInk }}
                                >
                                    {world.name}
                                </p>
                            </div>

                            <div className="text-right">
                                <p className="font-display text-[clamp(0.8rem,1.7vw,1.15rem)] font-bold print:text-[14pt]">
                                    {certificate.instructor ?? 'Dulatuon'}
                                </p>
                                <div className="mt-1.5 ml-auto h-px w-full max-w-56 bg-slate-300" />
                                <p className="mt-1 text-[clamp(0.55rem,1vw,0.75rem)] font-semibold tracking-wide text-slate-500 uppercase print:text-[8pt]">
                                    {certificate.instructor
                                        ? 'Course teacher'
                                        : 'Issued by'}
                                </p>
                            </div>
                        </footer>
                    </div>
                </article>
            </div>
        </>
    );
}
