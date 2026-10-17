import { DEFAULT_CONFIG, groundEffects, type GroundConfig, type GroundResult } from '@/lib/ground-test-model';
import { makeBuilding, makeHouse, makeRocks, makeTree } from '@/lib/sim-models';
import { makeTextSprite, SimStage } from '@/lib/sim-stage';
import * as THREE from 'three';

interface SceneCallbacks {
    onDone: (result: GroundResult) => void;
}

const WIDTH = 12;
const DEPTH = 6;
const THICKNESS = 1.3;
const HILL_HEIGHTS = [0.22, 1.25, 2.9];
const FAULT_X = 2.6;
const SHAKE_SECONDS = 3.2;

const smooth = (edge0: number, edge1: number, x: number): number => {
    const t = Math.min(1, Math.max(0, (x - edge0) / (edge1 - edge0)));

    return t * t * (3 - 2 * t);
};
const bell = (x: number): number => Math.exp(-x * x);

interface Rider {
    object: THREE.Object3D;
    x: number;
    z: number;
    /** Sits on the hillside and is carried down by a landslide. */
    onSlope: boolean;
    /** Stands on the plain and sinks during liquefaction. */
    onPlain: boolean;
    lean: number;
}

/**
 * Imperative three.js scene for Ground Test: a piece of land with a hill and a
 * plain. The student sets the slope, soil, water and shaking, then watches for
 * a landslide, liquefaction or ground rupture.
 */
export class GroundTestScene extends SimStage {
    private readonly ground: THREE.Mesh;

    private readonly base: Float32Array;

    private readonly riders: Rider[] = [];

    private readonly boils = new THREE.Group();

    private readonly road: THREE.Mesh;

    private readonly roadBase: Float32Array;

    private readonly faultLabel: THREE.Sprite;

    private config: GroundConfig = DEFAULT_CONFIG;

    private result: GroundResult = { landslide: false, liquefaction: false, rupture: false };

    private running = false;

    private runTime = 0;

    /** How far each lasting effect has progressed, 0 to 1. */
    private slide = 0;

    private liquefy = 0;

    private rupture = 0;

    constructor(
        container: HTMLElement,
        private readonly callbacks: SceneCallbacks,
    ) {
        super(container, { direction: [0.32, 0.46, 0.83], distance: 19, fitAspect: 1.6, polar: [30, 84], azimuth: [-65, 65] });
        this.controls.target.set(0, 0.5, 0);

        const geometry = new THREE.BoxGeometry(WIDTH, THICKNESS, DEPTH, 60, 1, 30).toNonIndexed();
        geometry.translate(0, -THICKNESS / 2, 0);
        this.base = Float32Array.from(geometry.getAttribute('position').array as Float32Array);
        geometry.setAttribute('color', new THREE.BufferAttribute(new Float32Array(this.base.length), 3));
        this.ground = new THREE.Mesh(geometry, new THREE.MeshLambertMaterial({ vertexColors: true }));
        this.ground.castShadow = true;
        this.ground.receiveShadow = true;
        this.world.add(this.ground);

        const roadGeometry = new THREE.PlaneGeometry(1, 1, 40, 1);
        roadGeometry.rotateX(-Math.PI / 2);
        const roadPosition = roadGeometry.getAttribute('position') as THREE.BufferAttribute;
        for (let i = 0; i < roadPosition.count; i++) {
            roadPosition.setXYZ(i, THREE.MathUtils.lerp(-0.2, WIDTH / 2, roadPosition.getX(i) + 0.5), 0, 2.1 + roadPosition.getZ(i) * 0.7);
        }
        this.roadBase = Float32Array.from(roadPosition.array as Float32Array);
        this.road = new THREE.Mesh(roadGeometry, new THREE.MeshLambertMaterial({ color: 0x4b5563 }));
        this.road.receiveShadow = true;
        this.world.add(this.road);

        this.addRider(makeHouse(0xe5604d), 0.5, -0.9, false, true);
        this.addRider(makeHouse(0x3b82c4, 0xf1f5f9), 1.7, 0.6, false, true);
        const school = makeBuilding(0.7, 0.6, '#f3dfa6', 2);
        this.addRider(school.object, 4.1, -0.6, false, true);
        const flats = makeBuilding(0.45, 1.0, '#dbe7f5', 5);
        this.addRider(flats.object, 4.6, 0.9, false, true);
        [-1.6, -2.2, -2.8, -3.3].forEach((x, i) => this.addRider(makeTree(i), x, -1.6 + i * 1.0, true, false));
        this.addRider(makeRocks(2), -2.5, 0.3, true, false);
        this.addRider(makeRocks(4), -3.0, -0.9, true, false);
        this.addRider(makeTree(7), -5.0, 1.8, false, false);
        this.addRider(makeTree(8), -4.6, -2.0, false, false);
        this.addRider(makeTree(9), 3.1, 2.6, false, true);

        // Sand boils and puddles that appear on the plain during liquefaction.
        for (let i = 0; i < 7; i++) {
            const x = 0.4 + ((i * 1.37) % 5);
            const z = -2.4 + ((i * 2.1) % 4.4);
            const cone = new THREE.Mesh(new THREE.ConeGeometry(0.2, 0.14, 12), new THREE.MeshLambertMaterial({ color: 0xcdb27a }));
            cone.position.set(x, 0.05, z);
            const puddle = new THREE.Mesh(new THREE.CircleGeometry(0.34, 20), new THREE.MeshLambertMaterial({ color: 0x38bdf8, transparent: true, opacity: 0.75 }));
            puddle.rotation.x = -Math.PI / 2;
            puddle.position.set(x + 0.15, 0.025, z + 0.1);
            this.boils.add(cone, puddle);
        }
        this.world.add(this.boils);

        this.faultLabel = makeTextSprite('fault under the ground', '#7c2d12', 0.26);
        this.faultLabel.position.set(FAULT_X, -THICKNESS - 0.25, DEPTH / 2);
        this.world.add(this.faultLabel);

        this.setConfig(DEFAULT_CONFIG);
        this.start();
    }

    /** Reshape and recolour the land for a new set-up, clearing earlier damage. */
    setConfig(config: GroundConfig): void {
        if (this.running) {
            return;
        }
        this.config = config;
        this.slide = 0;
        this.liquefy = 0;
        this.rupture = 0;
        this.paint();
        this.apply();
    }

    /** Shake the land; `onDone` reports which effects happened. */
    shake(): void {
        if (this.running) {
            return;
        }
        this.setConfig(this.config);
        this.result = groundEffects(this.config);
        this.running = true;
        this.runTime = 0;
    }

    protected update(delta: number): void {
        if (!this.running) {
            return;
        }
        this.runTime += delta;
        const progress = smooth(0.25, 0.85, this.runTime / SHAKE_SECONDS);

        this.slide = this.result.landslide ? progress : 0;
        this.liquefy = this.result.liquefaction ? progress : 0;
        // A fault breaks the surface in one sudden jolt near the start.
        this.rupture = this.result.rupture ? smooth(0.1, 0.22, this.runTime / SHAKE_SECONDS) : 0;
        this.apply();

        const envelope = Math.sin(Math.PI * Math.min(1, this.runTime / SHAKE_SECONDS));
        const amount = envelope * (this.config.strong ? 0.16 : 0.035);
        this.world.position.set((Math.random() - 0.5) * amount, 0, (Math.random() - 0.5) * amount);

        if (this.runTime >= SHAKE_SECONDS) {
            this.running = false;
            this.world.position.set(0, 0, 0);
            this.callbacks.onDone(this.result);
        }
    }

    // ── Terrain ──────────────────────────────────────────────────────────────

    private addRider(object: THREE.Object3D, x: number, z: number, onSlope: boolean, onPlain: boolean): void {
        this.riders.push({ object, x, z, onSlope, onPlain, lean: (this.riders.length % 2 === 0 ? 1 : -1) * (0.6 + (this.riders.length % 3) * 0.2) });
        this.world.add(object);
    }

    /** Height of the land surface, including any landslide scar and debris pile. */
    private height(x: number, z: number): number {
        const peak = HILL_HEIGHTS[this.config.slope];
        const hill = peak * smooth(-0.8, -3.6, x) * (0.92 + 0.08 * Math.cos(z * 1.3));

        // A slide scoops out the slope and dumps the debris at its foot.
        const across = bell(z / 2.1);
        const scar = -0.42 * peak * bell((x + 2.5) / 1.1) * across;
        const pile = 0.3 * peak * bell((x - 0.2) / 1.15) * across;

        const sag = x > -0.4 ? -0.07 * this.liquefy : 0;

        return hill + (scar + pile) * this.slide + sag;
    }

    /** Ground rupture drops and shifts everything on the far side of the fault. */
    private offset(x: number, out: THREE.Vector3): THREE.Vector3 {
        const moved = x > FAULT_X ? this.rupture : 0;

        return out.set(0, -0.32 * moved, 0.7 * moved);
    }

    private apply(): void {
        const scratch = new THREE.Vector3();
        const position = this.ground.geometry.getAttribute('position') as THREE.BufferAttribute;
        for (let i = 0; i < position.count; i++) {
            const x = this.base[i * 3];
            const y = this.base[i * 3 + 1];
            const z = this.base[i * 3 + 2];
            const shift = this.offset(x, scratch);
            const top = y > -0.001 ? this.height(x, z) : 0;
            position.setXYZ(i, x, y + top + shift.y, z + shift.z);
        }
        position.needsUpdate = true;
        this.ground.geometry.computeVertexNormals();

        const road = this.road.geometry.getAttribute('position') as THREE.BufferAttribute;
        for (let i = 0; i < road.count; i++) {
            const x = this.roadBase[i * 3];
            const z = this.roadBase[i * 3 + 2];
            const shift = this.offset(x, scratch);
            road.setXYZ(i, x, this.height(x, z) + 0.02 + shift.y, z + shift.z);
        }
        road.needsUpdate = true;

        for (const rider of this.riders) {
            const x = rider.x + (rider.onSlope ? 1.9 * this.slide : 0);
            const shift = this.offset(x, scratch);
            const sink = rider.onPlain ? 0.26 * this.liquefy : 0;
            rider.object.position.set(x, this.height(x, rider.z) - sink + shift.y, rider.z + shift.z);
            const tilt = (rider.onSlope ? 0.9 * this.slide : 0) + (rider.onPlain ? 0.2 * this.liquefy : 0);
            rider.object.rotation.z = tilt * rider.lean;
        }

        this.boils.visible = this.liquefy > 0.05;
        this.boils.scale.set(1, Math.max(0.01, this.liquefy), 1);

        const material = this.faultLabel.material as THREE.SpriteMaterial;
        material.opacity = this.config.surfaceFault ? 1 : 0.75;
    }

    private paint(): void {
        const position = this.ground.geometry.getAttribute('position') as THREE.BufferAttribute;
        const colours = this.ground.geometry.getAttribute('color') as THREE.BufferAttribute;
        const colour = new THREE.Color();
        const { loose, wet } = this.config;

        for (let i = 0; i < position.count; i += 3) {
            const y = (this.base[i * 3 + 1] + this.base[(i + 1) * 3 + 1] + this.base[(i + 2) * 3 + 1]) / 3;
            if (y > -0.001) {
                // Surface: turf on solid rock, bare sand on loose soil, darker when soaked.
                colour.setHex(loose ? 0xdcc27f : 0x74c365);
                if (wet) {
                    colour.lerp(new THREE.Color(0x3f6f8f), 0.28);
                }
            } else if (wet && y < -THICKNESS * 0.35) {
                // Soaked ground: the water table shows on the cut sides.
                colour.setHex(loose ? 0x7fb2c9 : 0x6f8fa3);
            } else {
                colour.setHex(loose ? 0xc8a868 : 0x8b8478);
            }
            colour.multiplyScalar(0.93 + ((i * 7) % 13) / 100);
            for (let j = 0; j < 3; j++) {
                colours.setXYZ(i + j, colour.r, colour.g, colour.b);
            }
        }
        colours.needsUpdate = true;
    }
}
