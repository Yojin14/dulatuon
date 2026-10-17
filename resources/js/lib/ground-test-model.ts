export interface GroundConfig {
    /** 0 = flat, 1 = gentle hill, 2 = steep slope. */
    slope: 0 | 1 | 2;
    loose: boolean;
    wet: boolean;
    strong: boolean;
    /** Whether the fault movement reaches the surface. */
    surfaceFault: boolean;
}

export interface GroundResult {
    landslide: boolean;
    liquefaction: boolean;
    rupture: boolean;
}

export const DEFAULT_CONFIG: GroundConfig = { slope: 1, loose: false, wet: false, strong: false, surfaceFault: false };

/**
 * A simple classroom rule set, following the lesson:
 * - landslides need strong shaking on a steep slope (loose, soaked ground makes a gentle hill fail too);
 * - liquefaction needs loose soil, lots of water and strong shaking, all three;
 * - ground rupture happens only when the fault movement reaches the surface.
 */
export function groundEffects(config: GroundConfig): GroundResult {
    return {
        landslide: config.strong && (config.slope === 2 || (config.slope === 1 && config.loose && config.wet)),
        liquefaction: config.strong && config.loose && config.wet,
        rupture: config.surfaceFault,
    };
}
