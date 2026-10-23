import { LazyMotion, MotionConfig, domAnimation, m } from 'motion/react';
import { type ReactNode } from 'react';

const EASE_OUT_QUART = [0.25, 1, 0.5, 1] as const;

/** Provides lazy-loaded motion features and honours prefers-reduced-motion. */
export function MotionRoot({ children }: { children: ReactNode }) {
    return (
        <LazyMotion features={domAnimation} strict>
            <MotionConfig reducedMotion="user">{children}</MotionConfig>
        </LazyMotion>
    );
}

/** Fade-and-rise when scrolled into view. Must sit inside MotionRoot. */
export function Reveal({ children, delay = 0, className, as = 'div' }: { children: ReactNode; delay?: number; className?: string; as?: 'div' | 'li' }) {
    const Component = as === 'li' ? m.li : m.div;

    return (
        <Component
            className={className}
            initial={{ opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-60px' }}
            transition={{ duration: 0.7, delay, ease: EASE_OUT_QUART }}
        >
            {children}
        </Component>
    );
}
