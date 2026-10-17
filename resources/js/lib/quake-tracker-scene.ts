import { makeTextSprite, SimStage } from '@/lib/sim-stage';
import * as THREE from 'three';

export type StructureId =
    | 'pfz'
    | 'philippine_trench'
    | 'manila_trench'
    | 'cotabato_trench'
    | 'north_bohol'
    | 'bogo_bay'
    | 'central_mindanao'
    | 'valley';

export type LayerId = 'faults' | 'pfz' | 'trenches';

type LonLat = [number, number];

interface Structure {
    id: StructureId;
    name: string;
    layer: LayerId;
    colour: number;
    /** Drawn width of the line on the map. */
    width: number;
    /** Point on the line that the name tag's pointer starts from. */
    anchor: LonLat;
    /** Where the name tag sits, out in open sea where it covers nothing. */
    labelAt: LonLat;
    path: LonLat[];
}

export interface QuakeCase {
    name: string;
    magnitude: string;
    /** Focal depth where the lesson gives one; otherwise the focus is drawn at a nominal shallow depth. */
    depthKm: number | null;
    position: LonLat;
    aftershocks: number;
}

/** Simplified, hand-traced outlines. Good enough to recognise the islands, not for navigation. */
const ISLANDS: LonLat[][] = [
    // Luzon
    [
        [120.6, 18.5], [121.0, 18.6], [122.2, 18.5], [122.3, 17.3], [122.5, 16.9], [122.2, 16.3], [121.6, 15.9], [121.6, 15.0], [121.7, 14.3],
        [122.3, 14.1], [122.7, 14.3], [123.3, 14.0], [123.9, 13.8], [124.1, 13.0], [124.1, 12.6], [123.9, 12.8], [123.3, 13.2], [122.8, 13.6],
        [122.6, 13.2], [122.4, 13.5], [121.8, 13.9], [121.2, 13.6], [120.6, 13.9], [120.6, 14.4], [120.9, 14.6], [120.5, 14.5], [120.1, 14.8],
        [119.9, 15.8], [119.8, 16.3], [120.3, 16.1], [120.4, 16.9], [120.4, 17.6],
    ],
    // Mindoro
    [[120.3, 13.5], [121.1, 13.4], [121.5, 13.1], [121.5, 12.6], [121.2, 12.2], [120.9, 12.3], [120.6, 13.0]],
    // Palawan
    [[117.2, 8.4], [117.6, 8.9], [118.4, 9.6], [119.0, 10.3], [119.5, 10.9], [119.6, 11.3], [119.3, 11.3], [119.1, 10.6], [118.4, 10.0], [117.7, 9.2]],
    // Panay
    [[121.9, 11.9], [122.6, 11.5], [123.1, 11.5], [123.0, 11.0], [122.6, 10.7], [122.0, 10.4], [121.9, 10.9], [122.0, 11.4]],
    // Negros
    [[122.4, 9.9], [122.6, 10.4], [122.9, 10.9], [123.3, 11.0], [123.5, 10.9], [123.2, 10.3], [123.3, 9.4], [123.1, 9.05], [122.6, 9.4]],
    // Cebu
    [[123.3, 9.5], [123.4, 9.9], [123.6, 10.4], [124.0, 11.2], [124.05, 11.3], [124.0, 10.6], [123.8, 10.1], [123.6, 9.7], [123.4, 9.45]],
    // Bohol
    [[123.8, 9.9], [124.1, 10.15], [124.5, 10.1], [124.6, 9.75], [124.3, 9.6], [123.85, 9.6]],
    // Leyte
    [[124.3, 11.5], [124.9, 11.4], [125.05, 11.1], [125.0, 10.7], [125.2, 10.3], [125.0, 10.0], [124.8, 10.2], [124.75, 10.7], [124.4, 10.9]],
    // Samar
    [[124.2, 12.5], [125.2, 12.6], [125.5, 12.2], [125.75, 11.2], [125.6, 11.0], [125.0, 11.3], [124.9, 11.7], [124.4, 12.0]],
    // Masbate
    [[123.2, 12.5], [123.7, 12.4], [124.0, 12.0], [123.6, 11.9], [123.3, 12.1]],
    // Mindanao
    [
        [122.0, 6.9], [122.1, 7.6], [122.4, 8.1], [123.0, 8.5], [123.4, 8.6], [123.8, 8.1], [124.2, 8.2], [124.6, 8.5], [125.2, 9.0], [125.5, 9.8],
        [126.2, 9.2], [126.4, 8.2], [126.6, 7.3], [126.2, 6.3], [125.9, 6.9], [125.6, 7.1], [125.4, 6.5], [125.6, 5.6], [125.1, 5.9], [124.6, 6.0],
        [124.0, 6.6], [124.2, 7.2], [123.5, 7.6], [123.3, 7.4], [122.8, 7.5],
    ],
];

const STRUCTURES: Structure[] = [
    {
        id: 'pfz', name: 'Philippine Fault Zone', layer: 'pfz', colour: 0xff8a00, width: 0.06, anchor: [121.4, 15.4], labelAt: [124.6, 16.5],
        path: [[120.7, 17.6], [121.0, 15.9], [121.4, 15.4], [122.0, 14.0], [122.8, 13.4], [123.7, 12.2], [124.7, 11.1], [125.0, 10.3], [125.5, 9.6], [125.9, 8.0], [126.2, 7.0], [126.2, 6.4]],
    },
    {
        id: 'philippine_trench', name: 'Philippine Trench', layer: 'trenches', colour: 0xff2d2d, width: 0.055, anchor: [126.9, 10.5], labelAt: [129.0, 11.3],
        path: [[124.9, 14.8], [126.2, 12.5], [126.9, 10.5], [127.2, 8.5], [127.3, 6.5], [127.0, 5.2]],
    },
    { id: 'manila_trench', name: 'Manila Trench', layer: 'trenches', colour: 0xff2d2d, width: 0.055, anchor: [119.0, 16.0], labelAt: [117.2, 17.4], path: [[119.2, 17.5], [119.0, 16.0], [119.3, 14.5], [119.9, 13.3]] },
    { id: 'cotabato_trench', name: 'Cotabato Trench', layer: 'trenches', colour: 0xff2d2d, width: 0.055, anchor: [123.6, 6.3], labelAt: [121.7, 5.2], path: [[123.3, 7.0], [123.6, 6.3], [124.2, 5.6], [125.0, 5.2]] },
    { id: 'north_bohol', name: 'North Bohol Fault', layer: 'faults', colour: 0xd026e6, width: 0.045, anchor: [124.0, 10.02], labelAt: [121.7, 8.6], path: [[123.8, 9.95], [124.0, 10.02], [124.2, 10.05]] },
    { id: 'bogo_bay', name: 'Bogo Bay Fault', layer: 'faults', colour: 0xd026e6, width: 0.045, anchor: [124.02, 11.05], labelAt: [122.0, 12.6], path: [[123.93, 10.92], [124.02, 11.05], [124.12, 11.18]] },
    { id: 'central_mindanao', name: 'Central Mindanao Fault', layer: 'faults', colour: 0xd026e6, width: 0.045, anchor: [125.1, 6.3], labelAt: [127.0, 4.6], path: [[124.7, 8.9], [124.9, 8.0], [125.0, 7.0], [125.1, 6.3]] },
    { id: 'valley', name: 'Valley Fault System', layer: 'faults', colour: 0xd026e6, width: 0.045, anchor: [121.08, 14.6], labelAt: [118.3, 12.6], path: [[121.1, 14.9], [121.08, 14.6], [121.05, 14.3]] },
];

export const CASES: QuakeCase[] = [
    { name: '1990 Luzon', magnitude: '7.8', depthKm: null, position: [121.17, 15.68], aftershocks: 14 },
    { name: '2013 Bohol', magnitude: '7.2', depthKm: null, position: [124.1, 9.88], aftershocks: 14 },
    { name: '2017 Leyte', magnitude: '6.5', depthKm: 2, position: [124.63, 11.13], aftershocks: 16 },
    { name: '2025 Cebu', magnitude: '6.9', depthKm: null, position: [124.0, 11.1], aftershocks: 18 },
    { name: '2026 Sarangani', magnitude: '7.8', depthKm: 33, position: [124.7, 5.85], aftershocks: 20 },
];

const SCALE = 0.72;
const CENTRE: LonLat = [122.3, 12];
const UNITS_PER_KM_DEPTH = 0.03;
const NOMINAL_DEPTH_KM = 10;

function project([lon, lat]: LonLat, y = 0): THREE.Vector3 {
    return new THREE.Vector3((lon - CENTRE[0]) * SCALE, y, -(lat - CENTRE[1]) * SCALE);
}

interface StructureView {
    structure: Structure;
    /** The line itself, plus the teeth on a trench. */
    line: THREE.Group;
    /** A wider, soft band shown behind the line when it is picked. */
    glow: THREE.Mesh;
    /** Name tag with a thin pointer line back to the structure. */
    label: THREE.Group;
}

/** Shrink an outline toward its centre, used to stack highland tiers on an island. */
function inset(outline: LonLat[], factor: number): LonLat[] {
    const lon = outline.reduce((sum, point) => sum + point[0], 0) / outline.length;
    const lat = outline.reduce((sum, point) => sum + point[1], 0) / outline.length;

    return outline.map(([x, y]) => [lon + (x - lon) * factor, lat + (y - lat) * factor]);
}

function outlineShape(outline: LonLat[]): THREE.Shape {
    const shape = new THREE.Shape();
    outline.forEach((point, i) => {
        const { x, z } = project(point);
        if (i === 0) {
            shape.moveTo(x, -z);
        } else {
            shape.lineTo(x, -z);
        }
    });
    shape.closePath();

    return shape;
}

/** A flat band of the given width following a curve across the map. */
function ribbon(curve: THREE.Curve<THREE.Vector3>, width: number, samples: number): THREE.BufferGeometry {
    const positions: number[] = [];
    const indices: number[] = [];
    for (let i = 0; i <= samples; i++) {
        const point = curve.getPoint(i / samples);
        const tangent = curve.getTangent(i / samples);
        const side = new THREE.Vector3(-tangent.z, 0, tangent.x).normalize().multiplyScalar(width / 2);
        positions.push(point.x + side.x, point.y, point.z + side.z, point.x - side.x, point.y, point.z - side.z);
        if (i < samples) {
            const a = i * 2;
            indices.push(a, a + 1, a + 2, a + 1, a + 3, a + 2);
        }
    }
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    geometry.setIndex(indices);

    return geometry;
}

/**
 * The map symbol for a trench: triangles along one side of the line, pointing
 * toward the land that the sinking plate slides beneath.
 */
function teeth(curve: THREE.Curve<THREE.Vector3>, size: number): THREE.BufferGeometry {
    const positions: number[] = [];
    const count = Math.max(3, Math.round(curve.getLength() / (size * 2.4)));
    for (let i = 0; i < count; i++) {
        const t = (i + 0.5) / count;
        const point = curve.getPoint(t);
        const tangent = curve.getTangent(t).setY(0).normalize();
        const side = new THREE.Vector3(-tangent.z, 0, tangent.x);
        // Point toward the middle of the country rather than out to sea.
        if (side.dot(point) > 0) {
            side.negate();
        }
        const tip = point.clone().addScaledVector(side, size * 1.3);
        const left = point.clone().addScaledVector(tangent, -size * 0.7);
        const right = point.clone().addScaledVector(tangent, size * 0.7);
        positions.push(left.x, left.y, left.z, right.x, right.y, right.z, tip.x, tip.y, tip.z);
    }
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));

    return geometry;
}

interface Aftershock {
    mesh: THREE.Mesh;
    at: number;
}

/**
 * Imperative three.js scene for Quake Tracker: a relief map of the Philippines
 * with switchable layers of faults and trenches, and earthquakes plotted at
 * their real depth beneath the map.
 */
export class QuakeTrackerScene extends SimStage {
    private readonly structures: StructureView[] = [];

    private readonly pins = new THREE.Group();

    private readonly pulse: THREE.Mesh;

    private readonly aftershocks = new THREE.Group();

    private layers: Record<LayerId, boolean> = { faults: false, pfz: false, trenches: false };

    private highlighted: StructureId | null = null;

    private highlightColour = 0xfde047;

    /** When set, only these structures are drawn, whatever the layers say. */
    private candidates: StructureId[] | null = null;

    private readonly pinLabels: THREE.Sprite[] = [];

    private pinLabelsVisible = false;

    private labelsVisible = true;

    private activeCase: number | null = null;

    private shocks: Aftershock[] = [];

    private shockTime = -1;

    private onAftershocksDone: (() => void) | null = null;

    private readonly focusTarget = new THREE.Vector3();

    /** True while the camera is sliding to a new case; a drag by the student cancels it. */
    private gliding = false;

    constructor(container: HTMLElement) {
        // Looked at straight from above and never tilted, so it reads as a flat map with north at the top.
        super(container, { direction: [0, 1, 0.01], distance: 20, fitAspect: 0.85, polar: [0.6, 0.6], azimuth: [0, 0], clouds: false });
        this.controls.enableRotate = false;

        // Dragging slides the map around instead of turning it.
        this.controls.enablePan = true;
        this.controls.screenSpacePanning = true;
        this.controls.mouseButtons = { LEFT: THREE.MOUSE.PAN, MIDDLE: THREE.MOUSE.DOLLY, RIGHT: THREE.MOUSE.PAN };
        this.controls.touches = { ONE: THREE.TOUCH.PAN, TWO: THREE.TOUCH.DOLLY_PAN };
        this.controls.addEventListener('start', () => {
            this.gliding = false;
            this.renderer.domElement.style.cursor = 'grabbing';
        });
        this.controls.addEventListener('end', () => {
            this.renderer.domElement.style.cursor = 'grab';
        });
        this.renderer.domElement.style.cursor = 'grab';

        this.buildMap();
        this.buildStructures();

        this.pulse = new THREE.Mesh(
            new THREE.RingGeometry(0.82, 1, 48),
            new THREE.MeshBasicMaterial({ color: 0xfde047, transparent: true, side: THREE.DoubleSide, depthTest: false }),
        );
        this.pulse.rotation.x = -Math.PI / 2;
        this.pulse.renderOrder = 15;
        this.pulse.visible = false;
        this.world.add(this.pulse, this.pins, this.aftershocks);

        this.applyLayers();
        this.start();
    }

    setLayers(layers: Record<LayerId, boolean>): void {
        this.layers = layers;
        this.applyLayers();
    }

    /**
     * Limit the map to a few structures (the possible sources of the current
     * case) so the student is not looking at every fault at once.
     */
    setCandidates(ids: StructureId[] | null): void {
        this.candidates = ids;
        this.applyLayers();
    }

    /** Show or hide the name tags on the faults and trenches currently drawn. */
    showLabels(visible: boolean): void {
        this.labelsVisible = visible;
        this.applyLayers();
    }

    /** Name the pinned earthquakes, or leave them as plain markers. */
    showPinLabels(visible: boolean): void {
        this.pinLabelsVisible = visible;
        for (const label of this.pinLabels) {
            label.visible = visible;
        }
    }

    /** Brighten and name one structure, e.g. the answer the student just picked. */
    highlight(id: StructureId | null, correct = false): void {
        this.highlighted = id;
        this.highlightColour = correct ? 0x22c55e : 0xfde047;
        this.applyLayers();
    }

    /** Mark an earthquake's epicenter with a pulsing ring and glide the camera to it. */
    showCase(index: number | null): void {
        this.activeCase = index;
        this.gliding = true;
        this.pulse.visible = index !== null;
        if (index !== null) {
            const position = project(CASES[index].position, 0.5);
            this.pulse.position.copy(position);
            this.focusTarget.set(position.x * 0.6, 0, position.z * 0.6);
        } else {
            this.focusTarget.set(0, 0, 0);
        }
    }

    /** Pin a solved case: a marker on the map and the focus hanging below it at its real depth. */
    pinCase(index: number): void {
        const quake = CASES[index];
        const surface = project(quake.position, 0.5);
        const depth = Math.max(0.12, (quake.depthKm ?? NOMINAL_DEPTH_KM) * UNITS_PER_KM_DEPTH);

        const pin = new THREE.Group();
        const head = new THREE.Mesh(new THREE.SphereGeometry(0.11, 14, 10), new THREE.MeshLambertMaterial({ color: 0xfde047, emissive: 0x854d0e }));
        head.position.copy(surface);
        const focus = new THREE.Mesh(new THREE.SphereGeometry(0.09, 14, 10), new THREE.MeshBasicMaterial({ color: 0xff6b4a }));
        focus.position.set(surface.x, -depth, surface.z);
        const stick = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.012, depth + 0.5, 6), new THREE.MeshBasicMaterial({ color: 0xffffff }));
        stick.position.set(surface.x, (0.5 - depth) / 2, surface.z);
        const label = makeTextSprite(quake.name, '#7c2d12', 0.2);
        label.position.set(surface.x, 0.9, surface.z);
        label.visible = this.pinLabelsVisible;
        this.pinLabels.push(label);
        pin.add(head, focus, stick, label);
        this.pins.add(pin);
    }

    /** Pop smaller earthquakes around a case over a few seconds. */
    playAftershocks(index: number, onDone: () => void): void {
        const quake = CASES[index];
        const centre = project(quake.position, 0.52);
        this.aftershocks.clear();
        this.shocks = [];
        for (let i = 0; i < quake.aftershocks; i++) {
            const angle = i * 2.4;
            const distance = 0.12 + ((i * 7) % 10) * 0.045;
            const mesh = new THREE.Mesh(
                new THREE.SphereGeometry(0.035 + ((i * 3) % 5) * 0.012, 10, 8),
                new THREE.MeshBasicMaterial({ color: 0xfb923c, transparent: true, depthTest: false }),
            );
            mesh.position.set(centre.x + Math.cos(angle) * distance, centre.y, centre.z + Math.sin(angle) * distance);
            mesh.visible = false;
            this.aftershocks.add(mesh);
            this.shocks.push({ mesh, at: 0.3 + i * 0.22 });
        }
        this.shockTime = 0;
        this.onAftershocksDone = onDone;
    }

    protected update(delta: number, elapsed: number): void {
        if (this.pulse.visible) {
            const beat = (elapsed * 1.2) % 1;
            this.pulse.scale.setScalar(0.15 + beat * 0.55);
            (this.pulse.material as THREE.MeshBasicMaterial).opacity = 1 - beat;
        }

        // Slide the camera along with its target so the view pans without tilting.
        const before = this.controls.target.clone();
        if (this.gliding) {
            this.controls.target.lerp(this.focusTarget, Math.min(1, delta * 2.5));
            if (this.controls.target.distanceTo(this.focusTarget) < 0.01) {
                this.gliding = false;
            }
        }
        // Keep the map from being dragged out of sight.
        this.controls.target.x = THREE.MathUtils.clamp(this.controls.target.x, -6, 6);
        this.controls.target.z = THREE.MathUtils.clamp(this.controls.target.z, -6.5, 6.5);
        this.camera.position.add(this.controls.target.clone().sub(before));

        if (this.shockTime >= 0) {
            this.shockTime += delta;
            for (const shock of this.shocks) {
                const age = this.shockTime - shock.at;
                shock.mesh.visible = age > 0;
                if (age > 0) {
                    shock.mesh.scale.setScalar(1 + Math.max(0, 0.4 - age) * 4);
                }
            }
            const last = this.shocks[this.shocks.length - 1];
            if (!last || this.shockTime > last.at + 0.8) {
                this.shockTime = -1;
                this.onAftershocksDone?.();
                this.onAftershocksDone = null;
            }
        }
    }

    // ── Geometry ─────────────────────────────────────────────────────────────

    private buildMap(): void {
        const sea = new THREE.Mesh(
            new THREE.BoxGeometry(160, 1.6, 160),
            new THREE.MeshLambertMaterial({ color: 0x2f6fb0 }),
        );
        sea.position.set(0.15, -0.8, 0.1);
        sea.renderOrder = 1;
        sea.receiveShadow = true;
        this.world.add(sea);

        const shallows = new THREE.MeshBasicMaterial({ color: 0x7cc7e8, transparent: true, opacity: 0.55 });
        const shore = new THREE.MeshLambertMaterial({ color: 0xe8d9a0 });
        // Each island is a stack of shrinking tiers: lowland, hills, mountains.
        const tiers = [
            { factor: 1, height: 0.12, colour: 0x8fd16f },
            { factor: 0.68, height: 0.1, colour: 0x5fae52 },
            { factor: 0.36, height: 0.1, colour: 0x3f8a45 },
        ];

        for (const outline of ISLANDS) {
            const shelf = new THREE.Mesh(new THREE.ShapeGeometry(outlineShape(inset(outline, 1.14))), shallows);
            shelf.rotation.x = -Math.PI / 2;
            shelf.position.y = 0.012;
            shelf.renderOrder = 2;
            this.world.add(shelf);

            // Small islands only get the lowland tier, so they stay readable.
            const span = Math.max(...outline.map((point) => point[1])) - Math.min(...outline.map((point) => point[1]));
            const levels = span > 3 ? 3 : span > 1.2 ? 2 : 1;
            let base = 0;
            for (let level = 0; level < levels; level++) {
                const tier = tiers[level];
                const geometry = new THREE.ExtrudeGeometry(outlineShape(inset(outline, tier.factor)), {
                    depth: tier.height,
                    bevelEnabled: true,
                    bevelSize: 0.03,
                    bevelThickness: 0.03,
                    bevelSegments: 1,
                });
                geometry.rotateX(-Math.PI / 2);
                const island = new THREE.Mesh(geometry, [new THREE.MeshLambertMaterial({ color: tier.colour }), level === 0 ? shore : new THREE.MeshLambertMaterial({ color: tier.colour })]);
                island.position.y = base;
                island.castShadow = true;
                island.receiveShadow = true;
                this.world.add(island);
                base += tier.height + 0.03;
            }
        }

        // Region names sit out in the sea so they never cover the faults.
        for (const [text, position] of [
            ['LUZON', [118.6, 16.6]],
            ['VISAYAS', [120.3, 10.6]],
            ['MINDANAO', [121.3, 6.4]],
        ] as [string, LonLat][]) {
            const label = makeTextSprite(text, 'rgba(15, 23, 42, 0.35)', 0.2);
            label.position.copy(project(position, 0.1));
            this.world.add(label);
        }
    }

    private buildStructures(): void {
        for (const structure of STRUCTURES) {
            // Lines float just above the highest ground and always draw on top of it.
            const curve = new THREE.CatmullRomCurve3(structure.path.map((point) => project(point, 0.5)));
            const samples = structure.path.length * 12;
            const isTrench = structure.layer === 'trenches';

            const line = new THREE.Group();
            // Marked transparent so it is sorted with the pale edge and glow, and drawn after them.
            const material = new THREE.MeshBasicMaterial({ color: structure.colour, side: THREE.DoubleSide, depthTest: false, transparent: true });
            const band = new THREE.Mesh(ribbon(curve, structure.width, samples), material);
            band.renderOrder = 6;
            // A thin dark outline makes the bright line stand out over both land and sea.
            const edge = new THREE.Mesh(
                ribbon(curve, structure.width + 0.025, samples),
                new THREE.MeshBasicMaterial({ color: 0x111827, side: THREE.DoubleSide, depthTest: false, transparent: true, opacity: 0.9 }),
            );
            edge.renderOrder = 5;
            line.add(edge, band);
            if (isTrench) {
                const barbs = new THREE.Mesh(teeth(curve, 0.085), material);
                barbs.renderOrder = 6;
                line.add(barbs);
            }

            const glow = new THREE.Mesh(
                ribbon(curve, structure.width + 0.2, samples),
                new THREE.MeshBasicMaterial({ color: 0xfde047, side: THREE.DoubleSide, depthTest: false, transparent: true, opacity: 0.75 }),
            );
            glow.renderOrder = 4;

            const label = new THREE.Group();
            const tag = makeTextSprite(structure.name, `#${structure.colour.toString(16).padStart(6, '0')}`, 0.26);
            tag.position.copy(project(structure.labelAt, 0.6));
            const pointer = new THREE.Line(
                new THREE.BufferGeometry().setFromPoints([project(structure.anchor, 0.55), project(structure.labelAt, 0.55)]),
                new THREE.LineBasicMaterial({ color: 0x0f172a, depthTest: false, transparent: true }),
            );
            pointer.renderOrder = 8;
            label.add(pointer, tag);
            this.world.add(glow, line, label);
            this.structures.push({ structure, line, glow, label });
        }
    }

    private applyLayers(): void {
        for (const view of this.structures) {
            const active = this.highlighted === view.structure.id;
            const visible = this.candidates ? this.candidates.includes(view.structure.id) : this.layers[view.structure.layer];
            view.line.visible = visible;
            // The picked structure is lit up; every line on show carries its name tag.
            view.glow.visible = visible && active;
            (view.glow.material as THREE.MeshBasicMaterial).color.setHex(this.highlightColour);
            view.label.visible = visible && this.labelsVisible;
        }
    }
}
