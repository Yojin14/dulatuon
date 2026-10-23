import { LowPolyBlock } from '@/components/game/low-poly-scene';
import { cn } from '@/lib/utils';
import { type ReactNode } from 'react';

export function EmptyState({ title, description, action, className }: { title: ReactNode; description?: ReactNode; action?: ReactNode; className?: string }) {
    return (
        <div className={cn('flex flex-col items-center justify-center gap-3 rounded-3xl border-2 border-dashed bg-card/60 px-6 py-10 text-center', className)}>
            <LowPolyBlock variant="empty" className="w-28 opacity-90" />
            <div>
                <h3 className="text-lg font-semibold text-foreground">{title}</h3>
                {description && <p className="mx-auto mt-1 max-w-sm text-sm text-muted-foreground">{description}</p>}
            </div>
            {action}
        </div>
    );
}
