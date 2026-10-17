import { makeTextSprite, setSpriteText, SimStage } from '@/lib/sim-stage';
import * as THREE from 'three';

export type WaveKind = 'P' | 'S' | 'Love' | 'Rayleigh';

export interface WaveRun {
    /** One wave per lane, top lane first. */
    waves: WaveKind[];
    /** Lane names to show instead of the real wave names (for mystery waves). */
    labels?: string[];
    liquid: boolean;
    /** Where the recording station sits, from 0 (near the source) to 1 (far end). */
    station: number;
}

export interface WaveResult {
    /** Seconds until each lane's wave reached the station, or null if it never arrived. */
    arrivals: (number | null)[];
}

interface SceneCallbacks {
    onDone: (result: WaveResult) => void;
}

const SPEEDS: Record<WaveKind, number> = { P: 3.6, S: 2.1, Love: 1.8, Rayleigh: 1.5 };
const LANE_COLOURS = ['#f59e0b', '#22d3ee'];

const COLUMNS = 44;
const ROWS = 4;
const LAYERS = 3;
const SPACING = 0.27;
const LENGTH = (COLUMNS - 1) * SPACING;
const START_X = -LENGTH / 2;
const LANE_GAP = 2.3;
const LIQUID_FROM = START_X + LENGTH * 0.42;
const LIQUID_TO = START_X + LENGTH * 0.62;
const PACKET = 1.5;
const AMPLITUDE = 0.2;

const ROCK = new THREE.Color(0xc9a27a);
const LIQUID = new THREE.Color(0x38bdf8);

interface Lane {
    group: THREE.Group;
    particles: THREE.InstancedMesh;
    label: THREE.Sprite;
    station: THREE.Group;
    wave: WaveKind;
    arrival: number | null;
}

/**
 * Imperative three.js scene for Wave Tank: bars of "rock" drawn as grids of
 * particles. A wave packet travels along each bar so the particle motion of
 * P, S, Love and Rayleigh waves can be compared, and a station at the far end
 * draws a seismogram onto a 2D canvas.
 */
export class WaveTankScene extends SimStage {
    private readonly lanes: Lane[] = [];

    private readonly matrix = new THREE.Matrix4();

    private run: WaveRun = { waves: ['P', 'S'], liquid: false, station: 1 };

    private running = false;

    private runTime = 0;

    private runLength = 0;

    private trace: number[][] = [[], []];

    constructor(
        container: HTMLElement,
        private readonly seismogram: HTMLCanvasElement,
        private readonly callbacks: SceneCallbacks,
    ) {
        super(container, { direction: [0.25, 0.42, 0.87], distance: 19, fitAspect: 1.7, polar: [25, 88], azimuth: [-70, 70] });

        for (let i = 0; i < 2; i++) {
            this.lanes.push(this.buildLane(i));
        }
        this.configure(this.run);
        this.start();
    }

    /** Set up the lanes for the next run without starting it. */
    configure(run: WaveRun): void {
        if (this.running) {
            return;
        }
        this.run = run;
        this.runTime = 0;
        this.trace = [[], []];

        const single = run.waves.length === 1;
        this.lanes.forEach((lane, i) => {
            const active = i < run.waves.length;
            lane.group.visible = active;
            if (!active) {
                return;
            }
            lane.wave = run.waves[i];
            lane.arrival = this.arrivalTime(lane.wave);
            lane.group.position.y = single ? 0 : (i === 0 ? 1 : -1) * (LANE_GAP / 2);
            lane.station.position.x = this.stationX();
            setSpriteText(lane.label, run.labels?.[i] ?? `${lane.wave} wave`, LANE_COLOURS[i]);
            this.paintLane(lane);
            this.placeParticles(lane, 0, false);
        });
        this.drawSeismogram();
    }

    /** Send the waves; `onDone` fires after they have passed the station. */
    send(run: WaveRun): void {
        if (this.running) {
            return;
        }
        this.configure(run);
        this.running = true;
        this.runTime = 0;

        const slowest = Math.min(...run.waves.map((wave) => SPEEDS[wave]));
        this.runLength = (this.stationX() - START_X + PACKET * 2.2) / slowest;
    }

    protected update(delta: number): void {
        if (!this.running) {
            return;
        }
        this.runTime += delta;

        this.lanes.forEach((lane, i) => {
            if (!lane.group.visible) {
                return;
            }
            const motion = this.placeParticles(lane, this.runTime, true);
            this.trace[i].push(motion);
            // The station bobs with the ground beneath it.
            lane.station.position.y = ROWS * SPACING * 0.5 + 0.12 + motion * 0.6;
        });
        this.drawSeismogram();

        if (this.runTime >= this.runLength) {
            this.running = false;
            this.callbacks.onDone({
                arrivals: this.lanes.filter((lane) => lane.group.visible).map((lane) => lane.arrival),
            });
        }
    }

    // ── Geometry ─────────────────────────────────────────────────────────────

    private stationX(): number {
        return START_X + LENGTH * (0.72 + 0.26 * this.run.station);
    }

    private buildLane(index: number): Lane {
        const group = new THREE.Group();

        const particles = new THREE.InstancedMesh(
            new THREE.SphereGeometry(0.075, 10, 8),
            new THREE.MeshLambertMaterial(),
            COLUMNS * ROWS * LAYERS,
        );
        particles.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
        particles.castShadow = true;
        // Particles move every frame, so skip culling against a stale bounding sphere.
        particles.frustumCulled = false;
        group.add(particles);

        const source = new THREE.Mesh(new THREE.OctahedronGeometry(0.22, 0), new THREE.MeshLambertMaterial({ color: 0xef4444, emissive: 0x7f1d1d }));
        source.position.set(START_X - 0.55, 0, 0);
        group.add(source);

        const label = makeTextSprite('P wave', LANE_COLOURS[index], 0.34);
        label.position.set(START_X + 0.6, ROWS * SPACING * 0.5 + 0.55, 0);
        group.add(label);

        const station = new THREE.Group();
        const hut = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.22, 0.34), new THREE.MeshLambertMaterial({ color: 0xf8fafc }));
        const roof = new THREE.Mesh(new THREE.ConeGeometry(0.3, 0.16, 4), new THREE.MeshLambertMaterial({ color: 0x7c3aed }));
        roof.position.y = 0.19;
        roof.rotation.y = Math.PI / 4;
        const mast = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.012, 0.34, 5), new THREE.MeshLambertMaterial({ color: 0x475569 }));
        mast.position.set(0.1, 0.36, 0);
        station.add(hut, roof, mast);
        station.position.y = ROWS * SPACING * 0.5 + 0.12;
        group.add(station);

        this.world.add(group);

        return { group, particles, label, station, wave: 'P', arrival: null };
    }

    private inLiquid(x: number): boolean {
        return this.run.liquid && x >= LIQUID_FROM && x <= LIQUID_TO;
    }

    private paintLane(lane: Lane): void {
        const colour = new THREE.Color();
        let index = 0;
        for (let column = 0; column < COLUMNS; column++) {
            const x = START_X + column * SPACING;
            for (let row = 0; row < ROWS; row++) {
                for (let layer = 0; layer < LAYERS; layer++) {
                    colour.copy(this.inLiquid(x) ? LIQUID : ROCK).multiplyScalar(0.9 + ((column + row * 3 + layer * 5) % 4) * 0.045);
                    lane.particles.setColorAt(index++, colour);
                }
            }
        }
        if (lane.particles.instanceColor) {
            lane.particles.instanceColor.needsUpdate = true;
        }
    }

    /** S waves cannot cross a liquid, so their energy never reaches the far side. */
    private arrivalTime(wave: WaveKind): number | null {
        if (wave === 'S' && this.run.liquid) {
            return null;
        }

        return (this.stationX() - START_X) / SPEEDS[wave];
    }

    /**
     * Move every particle of a lane for the given time and return how far the
     * ground under the station is displaced (the seismogram reading).
     */
    private placeParticles(lane: Lane, time: number, moving: boolean): number {
        const speed = SPEEDS[lane.wave];
        const front = START_X + speed * time;
        const stationX = this.stationX();
        let reading = 0;
        let index = 0;

        for (let column = 0; column < COLUMNS; column++) {
            const x = START_X + column * SPACING;
            const behind = front - x;
            let strength = 0;
            if (moving && behind > 0 && behind < PACKET * 2) {
                strength = Math.sin((Math.PI * behind) / (PACKET * 2));
            }
            // Shear motion dies out in the liquid and never comes back beyond it.
            if (lane.wave === 'S' && this.run.liquid && x >= LIQUID_FROM - 0.4) {
                strength *= Math.max(0, 1 - (x - (LIQUID_FROM - 0.4)) / 0.8);
            }
            const phase = behind * 5.2;
            const wobble = Math.sin(phase) * strength * AMPLITUDE;
            const roll = Math.cos(phase) * strength * AMPLITUDE;

            if (Math.abs(x - stationX) < SPACING / 2) {
                reading = wobble;
            }

            for (let row = 0; row < ROWS; row++) {
                const y = (row - (ROWS - 1) / 2) * SPACING;
                // Surface waves fade with depth; body waves fill the whole bar.
                const depthFade = Math.exp(-(ROWS - 1 - row) * 0.55);
                for (let layer = 0; layer < LAYERS; layer++) {
                    const z = (layer - (LAYERS - 1) / 2) * SPACING;
                    let dx = 0;
                    let dy = 0;
                    let dz = 0;
                    if (lane.wave === 'P') {
                        dx = wobble;
                    } else if (lane.wave === 'S') {
                        dy = wobble;
                    } else if (lane.wave === 'Love') {
                        dz = wobble * depthFade * 1.3;
                    } else {
                        dx = -roll * depthFade;
                        dy = wobble * depthFade;
                    }
                    this.matrix.makeTranslation(x + dx, y + dy, z + dz);
                    lane.particles.setMatrixAt(index++, this.matrix);
                }
            }
        }
        lane.particles.instanceMatrix.needsUpdate = true;

        return reading;
    }

    // ── Seismogram ───────────────────────────────────────────────────────────

    private drawSeismogram(): void {
        const canvas = this.seismogram;
        const context = canvas.getContext('2d');
        if (!context) {
            return;
        }
        const ratio = Math.min(window.devicePixelRatio, 2);
        const width = canvas.clientWidth;
        const height = canvas.clientHeight;
        if (width === 0 || height === 0) {
            return;
        }
        if (canvas.width !== Math.round(width * ratio) || canvas.height !== Math.round(height * ratio)) {
            canvas.width = Math.round(width * ratio);
            canvas.height = Math.round(height * ratio);
        }
        context.setTransform(ratio, 0, 0, ratio, 0, 0);
        context.clearRect(0, 0, width, height);

        const total = Math.max(this.runLength, 1);
        const samples = Math.max(...this.trace.map((lane) => lane.length), 1);
        const perSample = this.runTime / samples;
        const toX = (seconds: number): number => 12 + ((width - 24) * seconds) / total;
        const lanes = this.run.waves.length;

        this.run.waves.forEach((wave, i) => {
            const middle = (height * (i + 1)) / (lanes + 1) + 4;
            context.strokeStyle = 'rgba(255, 255, 255, 0.18)';
            context.lineWidth = 1;
            context.beginPath();
            context.moveTo(12, middle);
            context.lineTo(width - 12, middle);
            context.stroke();

            context.strokeStyle = LANE_COLOURS[i];
            context.lineWidth = 2;
            context.beginPath();
            this.trace[i].forEach((value, sample) => {
                const x = toX(sample * perSample);
                const y = middle - (value / AMPLITUDE) * (height / (lanes + 1)) * 0.42;
                if (sample === 0) {
                    context.moveTo(x, y);
                } else {
                    context.lineTo(x, y);
                }
            });
            context.stroke();

            const arrival = this.lanes[i].arrival;
            if (arrival !== null && this.runTime >= arrival) {
                const x = toX(arrival);
                context.fillStyle = LANE_COLOURS[i];
                context.fillRect(x - 1, middle - 16, 2, 32);
                context.font = 'bold 11px system-ui, sans-serif';
                context.fillText(`${this.run.labels?.[i] ?? wave} arrives · ${arrival.toFixed(1)} s`, Math.min(x + 6, width - 130), middle - 9);
            }
        });

        context.fillStyle = 'rgba(255, 255, 255, 0.7)';
        context.font = 'bold 10px system-ui, sans-serif';
        context.fillText('SEISMOGRAM AT THE STATION', 12, 13);
    }
}
