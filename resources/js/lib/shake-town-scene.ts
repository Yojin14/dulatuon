import { depthToSlider, intensities, roman, TOWNS } from '@/lib/shake-town-model';
import { addDaylight, disposeObject, makeBuilding, makeCloud, makeHouse, makeTree } from '@/lib/sim-models';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';

interface SceneCallbacks {
    onDone: (run: { magnitude: number; depthKm: number; results: number[] }) => void;
}

// Crust block dimensions (top surface sits at y = 0).
const WIDTH = 12;
const HEIGHT = 4.4;
const DEPTH = 4.5;
const WORLD_Y = HEIGHT / 2 - 0.2;
const FRONT = DEPTH / 2;
const EPICENTER_X = -2.2;
const UNITS_PER_KM = 0.06;
const WAVE_SPEED = 3;
const SHAKE_SECONDS = 2.6;
const RING_COUNT = 5;
const RING_SPACING = 0.32;

const ZONES = [
    { label: 'SHALLOW · under 70 km', from: 0, to: 70, colour: 0xc99a6b },
    { label: 'INTERMEDIATE · 70 to 300 km', from: 70, to: 300, colour: 0xa3623f },
    { label: 'DEEP · 300 to 700 km', from: 300, to: 700, colour: 0x6f3b2a },
];

const RUBBLE = new THREE.Color(0x57534e);

const INTENSITY_COLOURS = ['#64748b', '#64748b', '#0ea5e9', '#22c55e', '#84cc16', '#eab308', '#f59e0b', '#f97316', '#ef4444', '#dc2626', '#991b1b'];

interface Building {
    object: THREE.Object3D;
    /** Materials to grey out as the building is damaged, with their undamaged colours. */
    materials: { material: THREE.MeshLambertMaterial; base: THREE.Color }[];
    homeX: number;
    baseScale: number;
    height: number;
    phase: number;
}

interface TownView {
    group: THREE.Group;
    buildings: Building[];
    label: THREE.Sprite;
    x: number;
    arrival: number;
    intensity: number;
    revealed: boolean;
}

/** Depth is drawn on a log scale so 5 km and 650 km both fit on the block. */
function depthToY(depthKm: number): number {
    if (depthKm <= 0) {
        return 0;
    }

    return -(0.3 + (HEIGHT - 0.6) * Math.min(1.05, Math.max(0, depthToSlider(depthKm))));
}

function drawPill(sprite: THREE.Sprite, lines: string[], background: string): void {
    const material = sprite.material as THREE.SpriteMaterial;
    const canvas = (material.map as THREE.CanvasTexture).image as HTMLCanvasElement;
    const context = canvas.getContext('2d');
    if (!context) {
        return;
    }
    const { width, height } = canvas;
    context.clearRect(0, 0, width, height);
    context.fillStyle = background;
    context.beginPath();
    context.roundRect(4, 4, width - 8, height - 8, height / 3);
    context.fill();
    context.fillStyle = '#ffffff';
    context.textAlign = 'center';
    context.textBaseline = 'middle';
    const size = lines.length > 1 ? height * 0.34 : height * 0.5;
    context.font = `bold ${size}px system-ui, sans-serif`;
    lines.forEach((line, index) => {
        context.fillText(line, width / 2, (height * (index + 1)) / (lines.length + 1) + 2, width - 20);
    });
    (material.map as THREE.CanvasTexture).needsUpdate = true;
}

function makePill(width: number, height: number, worldHeight: number): THREE.Sprite {
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const texture = new THREE.CanvasTexture(canvas);
    texture.colorSpace = THREE.SRGBColorSpace;
    const sprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: texture, depthTest: false, transparent: true }));
    sprite.scale.set((worldHeight * width) / height, worldHeight, 1);
    sprite.renderOrder = 20;

    return sprite;
}

/**
 * Imperative three.js scene for Shake Town: a cutaway of the crust with four
 * towns on top. An earthquake of a chosen magnitude and depth sends waves
 * outward, and each town shakes according to the intensity it experiences.
 */
export class ShakeTownScene {
    private readonly renderer: THREE.WebGLRenderer;

    private readonly scene = new THREE.Scene();

    private readonly camera = new THREE.PerspectiveCamera(34, 1, 0.1, 100);

    private readonly controls: OrbitControls;

    private readonly world = new THREE.Group();

    private readonly clouds = new THREE.Group();

    private readonly focus: THREE.Mesh;

    private readonly depthLine: THREE.Line;

    private readonly depthLabel: THREE.Sprite;

    private readonly resizeObserver: ResizeObserver;

    private readonly towns: TownView[] = [];

    private readonly rings: THREE.Mesh[] = [];

    private magnitude = 6;

    private depthKm = 10;

    private running = false;

    private runTime = 0;

    private runLength = 0;

    private lastFrameAt = performance.now();

    private frame = 0;

    private disposed = false;

    constructor(
        private readonly container: HTMLElement,
        private readonly callbacks: SceneCallbacks,
    ) {
        this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
        this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        this.renderer.localClippingEnabled = true;
        this.renderer.domElement.style.display = 'block';
        this.renderer.domElement.style.touchAction = 'none';
        container.appendChild(this.renderer.domElement);

        addDaylight(this.scene, this.renderer);
        for (let i = 0; i < 3; i++) {
            const cloud = makeCloud(i);
            cloud.position.set(-7 + i * 6.5, 5.6 + (i % 2) * 0.7, -6 - i);
            this.clouds.add(cloud);
        }
        this.scene.add(this.clouds);

        this.world.position.y = WORLD_Y;
        this.scene.add(this.world);

        this.buildCrust();
        this.buildTowns();
        this.buildRings();

        this.focus = new THREE.Mesh(
            new THREE.SphereGeometry(1, 20, 14),
            new THREE.MeshBasicMaterial({ color: 0xfff1a8, depthTest: false, transparent: true }),
        );
        this.focus.renderOrder = 14;
        this.world.add(this.focus);

        this.depthLine = new THREE.Line(
            new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(), new THREE.Vector3()]),
            new THREE.LineDashedMaterial({ color: 0xffffff, dashSize: 0.14, gapSize: 0.09, depthTest: false, transparent: true }),
        );
        this.depthLine.renderOrder = 13;
        this.world.add(this.depthLine);

        this.depthLabel = makePill(320, 96, 0.34);
        this.world.add(this.depthLabel);

        this.controls = new OrbitControls(this.camera, this.renderer.domElement);
        this.controls.enablePan = false;
        this.controls.enableDamping = true;
        this.controls.minPolarAngle = THREE.MathUtils.degToRad(40);
        this.controls.maxPolarAngle = THREE.MathUtils.degToRad(86);
        this.controls.minAzimuthAngle = THREE.MathUtils.degToRad(-45);
        this.controls.maxAzimuthAngle = THREE.MathUtils.degToRad(45);
        this.controls.target.set(0, 0, 0);

        this.setQuake(this.magnitude, this.depthKm);

        this.resizeObserver = new ResizeObserver(() => this.resize());
        this.resizeObserver.observe(container);
        this.resize();

        this.frame = requestAnimationFrame(this.tick);
    }

    /** Preview where the earthquake will begin and how big it is. */
    setQuake(magnitude: number, depthKm: number): void {
        if (this.running) {
            return;
        }
        this.magnitude = magnitude;
        this.depthKm = depthKm;

        const y = depthToY(depthKm);
        this.focus.position.set(EPICENTER_X, y, FRONT + 0.04);
        this.focus.scale.setScalar(0.1 + (magnitude - 4) * 0.055);

        const line = this.depthLine.geometry.getAttribute('position') as THREE.BufferAttribute;
        line.setXYZ(0, EPICENTER_X, 0.02, FRONT + 0.04);
        line.setXYZ(1, EPICENTER_X, y, FRONT + 0.04);
        line.needsUpdate = true;
        this.depthLine.computeLineDistances();

        drawPill(this.depthLabel, [`M ${magnitude.toFixed(1)} · ${depthKm} km deep`], '#7c3aed');
        this.depthLabel.position.set(EPICENTER_X + 1.45, Math.min(-0.35, y), FRONT + 0.06);
    }

    /** Clear damage and intensity readings from the previous run. */
    reset(): void {
        this.running = false;
        this.runTime = 0;
        this.hideRings();
        for (const town of this.towns) {
            town.revealed = false;
            town.intensity = 0;
            drawPill(town.label, [`Town ${TOWNS[this.towns.indexOf(town)].id}`], '#334155');
            for (const building of town.buildings) {
                building.object.rotation.z = 0;
                building.object.position.x = building.homeX;
                building.object.scale.setScalar(building.baseScale);
                for (const { material, base } of building.materials) {
                    material.color.copy(base);
                }
            }
        }
        this.setQuake(this.magnitude, this.depthKm);
    }

    /** Release the earthquake; `onDone` fires once every town has stopped shaking. */
    release(): void {
        if (this.running) {
            return;
        }
        this.reset();
        this.running = true;
        this.runTime = 0;

        const results = intensities(this.magnitude, this.depthKm);
        const focusY = depthToY(this.depthKm);
        let latest = 0;
        this.towns.forEach((town, index) => {
            town.intensity = results[index];
            town.arrival = Math.hypot(town.x - EPICENTER_X, focusY) / WAVE_SPEED;
            latest = Math.max(latest, town.arrival);
        });
        this.runLength = latest + SHAKE_SECONDS + 0.4;
    }

    dispose(): void {
        this.disposed = true;
        cancelAnimationFrame(this.frame);
        this.resizeObserver.disconnect();
        this.controls.dispose();
        disposeObject(this.scene);
        this.renderer.dispose();
        this.renderer.domElement.remove();
    }

    // ── Geometry ─────────────────────────────────────────────────────────────

    private buildCrust(): void {
        for (const zone of ZONES) {
            const top = depthToY(zone.from);
            const bottom = zone.to >= 700 ? -HEIGHT : depthToY(zone.to);
            const slab = new THREE.Mesh(new THREE.BoxGeometry(WIDTH, top - bottom, DEPTH), new THREE.MeshLambertMaterial({ color: zone.colour }));
            slab.position.y = (top + bottom) / 2;
            slab.receiveShadow = true;
            this.world.add(slab);

            const label = makePill(512, 72, 0.26);
            drawPill(label, [zone.label], 'rgba(15, 23, 42, 0.55)');
            label.position.set(WIDTH / 2 - 2.1, (top + bottom) / 2, FRONT + 0.05);
            this.world.add(label);

            if (zone.from > 0) {
                const boundary = new THREE.Line(
                    new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(-WIDTH / 2, top, FRONT + 0.02), new THREE.Vector3(WIDTH / 2, top, FRONT + 0.02)]),
                    new THREE.LineBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.55 }),
                );
                this.world.add(boundary);
            }
        }

        const grass = new THREE.Mesh(new THREE.BoxGeometry(WIDTH, 0.08, DEPTH), new THREE.MeshLambertMaterial({ color: 0x6fbf5a }));
        grass.position.y = 0.04;
        grass.receiveShadow = true;
        this.world.add(grass);

        // Soft sediment basin under the town that sits on loose ground.
        const softTown = TOWNS.find((town) => town.soft);
        if (softTown) {
            const x = EPICENTER_X + softTown.offsetKm * UNITS_PER_KM;
            const basinShape = new THREE.Shape();
            basinShape.absellipse(0, 0, 1.15, 0.62, Math.PI, Math.PI * 2, false);
            const basin = new THREE.Mesh(new THREE.ShapeGeometry(basinShape, 24), new THREE.MeshBasicMaterial({ color: 0xf2d98b }));
            basin.position.set(x, 0, FRONT + 0.015);
            this.world.add(basin);

            const patch = new THREE.Mesh(new THREE.CircleGeometry(1, 32), new THREE.MeshLambertMaterial({ color: 0xe9d08a }));
            patch.rotation.x = -Math.PI / 2;
            patch.scale.set(1.15, DEPTH / 2 - 0.1, 1);
            patch.position.set(x, 0.085, 0);
            patch.receiveShadow = true;
            this.world.add(patch);

            const tag = makePill(360, 72, 0.24);
            drawPill(tag, ['soft sediment'], '#a16207');
            tag.position.set(x, -0.3, FRONT + 0.05);
            this.world.add(tag);
        }
    }

    private buildTowns(): void {
        const walls = ['#f8e9d2', '#dbe7f5', '#f3dfa6', '#f0cfc4'];
        const roofs = [0xe5604d, 0x3b82c4, 0xd9912b, 0x7c5cc4];

        TOWNS.forEach((town, index) => {
            const group = new THREE.Group();
            const x = EPICENTER_X + town.offsetKm * UNITS_PER_KM;
            group.position.set(x, 0.08, 0.7);

            const buildings: Building[] = [];
            const add = (object: THREE.Object3D, materials: THREE.MeshLambertMaterial[], dx: number, dz: number, height: number): void => {
                object.position.set(dx, 0, dz);
                group.add(object);
                buildings.push({
                    object,
                    materials: materials.map((material) => ({ material, base: material.color.clone() })),
                    homeX: dx,
                    baseScale: object.scale.x,
                    height,
                    phase: Math.random() * Math.PI * 2,
                });
            };

            const tower = makeBuilding(0.32, 1.0, walls[index % walls.length], index);
            add(tower.object, tower.materials, -0.42, -0.1, 1.0);
            const block = makeBuilding(0.38, 0.52, walls[(index + 1) % walls.length], index + 3);
            add(block.object, block.materials, 0.02, -0.3, 0.52);

            const house = makeHouse(roofs[index % roofs.length]);
            house.scale.setScalar(0.72);
            const houseMaterials: THREE.MeshLambertMaterial[] = [];
            house.traverse((object) => {
                const material = (object as THREE.Mesh).material as THREE.MeshLambertMaterial | undefined;
                if (material && !houseMaterials.includes(material)) {
                    houseMaterials.push(material);
                }
            });
            add(house, houseMaterials, 0.46, 0.25, 0.4);

            const tree = makeTree(index + 4);
            tree.position.set(-0.05, 0, 0.45);
            group.add(tree);

            const label = makePill(256, 128, 0.62);
            drawPill(label, [`Town ${town.id}`], '#334155');
            label.position.set(0, 1.55, 0);
            group.add(label);

            this.world.add(group);
            this.towns.push({ group, buildings, label, x, arrival: 0, intensity: 0, revealed: false });
        });
    }

    private buildRings(): void {
        const clip = [
            new THREE.Plane(new THREE.Vector3(0, -1, 0), WORLD_Y),
            new THREE.Plane(new THREE.Vector3(0, 1, 0), HEIGHT - WORLD_Y),
            new THREE.Plane(new THREE.Vector3(1, 0, 0), WIDTH / 2),
            new THREE.Plane(new THREE.Vector3(-1, 0, 0), WIDTH / 2),
        ];
        for (let i = 0; i < RING_COUNT; i++) {
            const ring = new THREE.Mesh(
                new THREE.RingGeometry(0.95, 1, 96),
                new THREE.MeshBasicMaterial({ color: 0xfff1a8, transparent: true, side: THREE.DoubleSide, depthTest: false, clippingPlanes: clip }),
            );
            ring.renderOrder = 12;
            ring.visible = false;
            this.rings.push(ring);
            this.world.add(ring);
        }
    }

    private hideRings(): void {
        for (const ring of this.rings) {
            ring.visible = false;
        }
    }

    // ── Simulation ───────────────────────────────────────────────────────────

    private updateRun(delta: number): void {
        this.runTime += delta;
        const focus = this.focus.position;
        const strength = (this.magnitude - 3) / 5;

        this.rings.forEach((ring, i) => {
            const age = this.runTime - i * RING_SPACING;
            const radius = age * WAVE_SPEED;
            const alive = age > 0 && radius < WIDTH * 1.2;
            ring.visible = alive;
            if (alive) {
                ring.position.set(focus.x, focus.y, FRONT + 0.03);
                ring.scale.setScalar(Math.max(0.01, radius));
                // Waves fade as their energy spreads over a larger and larger front.
                (ring.material as THREE.MeshBasicMaterial).opacity = Math.min(1, (strength * 2.4) / (1 + radius * 0.55));
            }
        });

        // The source flashes at rupture, scaled by the energy released.
        const flash = Math.max(0, 1 - this.runTime / 0.6);
        this.focus.scale.setScalar((0.1 + (this.magnitude - 4) * 0.055) * (1 + flash * 1.4));

        for (const town of this.towns) {
            const since = this.runTime - town.arrival;
            if (since < 0) {
                continue;
            }
            if (!town.revealed) {
                town.revealed = true;
                const id = TOWNS[this.towns.indexOf(town)].id;
                drawPill(town.label, [`Town ${id}`, `Intensity ${roman(town.intensity)}`], INTENSITY_COLOURS[town.intensity]);
            }
            this.shakeTown(town, since);
        }

        if (this.runTime >= this.runLength) {
            this.running = false;
            this.hideRings();
            this.focus.scale.setScalar(0.1 + (this.magnitude - 4) * 0.055);
            this.callbacks.onDone({ magnitude: this.magnitude, depthKm: this.depthKm, results: this.towns.map((town) => town.intensity) });
        }
    }

    private shakeTown(town: TownView, since: number): void {
        const envelope = since < SHAKE_SECONDS ? Math.sin((Math.PI * since) / SHAKE_SECONDS) : 0;
        const amplitude = Math.pow(Math.max(0, town.intensity - 1) / 9, 1.6);
        const progress = Math.min(1, since / (SHAKE_SECONDS * 0.6));
        // Deep earthquakes arrive as slow, long-period motion that tall buildings sway to.
        const longPeriod = this.depthKm >= 150;

        town.buildings.forEach((building, i) => {
            const tall = building.height > 0.8;
            const frequency = longPeriod ? (tall ? 7 : 11) : 26 - i * 3;
            const sway = longPeriod && tall ? 1.8 : 1;
            const wobble = Math.sin(since * frequency + building.phase) * envelope * amplitude * sway;
            const side = i % 2 === 0 ? 1 : -1;

            // Lasting damage sets in while the shaking is at its strongest.
            const tilt = town.intensity >= 7 ? side * 0.09 * (town.intensity - 6) * progress : 0;
            building.object.rotation.z = wobble * 0.5 + tilt;
            building.object.position.x = building.homeX + wobble * 0.12;

            if (town.intensity >= 9) {
                building.object.scale.y = building.baseScale * THREE.MathUtils.lerp(1, 0.28, progress);
            }
            if (town.intensity >= 7) {
                const damage = progress * Math.min(1, (town.intensity - 6) / 3);
                for (const { material, base } of building.materials) {
                    material.color.copy(base).lerp(RUBBLE, damage);
                }
            }
        });
    }

    private readonly tick = (): void => {
        if (this.disposed) {
            return;
        }
        this.frame = requestAnimationFrame(this.tick);

        const now = performance.now();
        const delta = Math.min((now - this.lastFrameAt) / 1000, 0.05);
        this.lastFrameAt = now;

        if (this.running) {
            this.updateRun(delta);
        }

        for (const cloud of this.clouds.children) {
            cloud.position.x = cloud.position.x > 11 ? -11 : cloud.position.x + delta * 0.12;
        }

        this.controls.update();
        this.renderer.render(this.scene, this.camera);
    };

    private resize(): void {
        const width = this.container.clientWidth;
        const height = this.container.clientHeight;
        if (width === 0 || height === 0) {
            return;
        }
        this.renderer.setSize(width, height, false);
        this.renderer.domElement.style.width = '100%';
        this.renderer.domElement.style.height = '100%';
        this.camera.aspect = width / height;
        this.camera.updateProjectionMatrix();

        // Pull the camera back on narrow screens so the whole block stays in view.
        const distance = 18 * Math.max(1, 1.5 / this.camera.aspect);
        const direction = this.camera.position.lengthSq() > 0
            ? this.camera.position.clone().sub(this.controls.target).normalize()
            : new THREE.Vector3(0.22, 0.3, 0.93).normalize();
        this.camera.position.copy(this.controls.target).addScaledVector(direction, distance);
        this.controls.minDistance = distance * 0.6;
        this.controls.maxDistance = distance * 1.3;
    }
}
