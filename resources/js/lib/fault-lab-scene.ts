import { addDaylight, disposeObject, makeCar, makeCloud, makeHouse, makeLamp, makeRocks, makeTree } from '@/lib/sim-models';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';

export type ForceKind = 'pull' | 'push' | 'slide';
export type MarkerMode = 'none' | 'points';

interface SceneCallbacks {
    onStress: (stress: number) => void;
    onSlip: () => void;
    onSettled: () => void;
}

type Phase = 'idle' | 'building' | 'slipping' | 'settled';

// Crust block dimensions (top surface sits at y = 0).
const WIDTH = 12;
const HEIGHT = 3.2;
const DEPTH = 5;
const DIP = THREE.MathUtils.degToRad(60);
const FAR_FIELD = 4.5;
const DIP_SLIP_AMPLITUDE = 0.22;
const STRIKE_SLIP_AMPLITUDE = 0.9;
const BUILD_SECONDS = 3.8;
const SLIP_SECONDS = 0.32;
const SETTLE_SECONDS = 2.4;
const WAVE_SPEED = 3.2;
// The crust group is lifted so the block is centred on the orbit target.
const WORLD_Y = HEIGHT / 2 - 0.3;

const STRATA = [0x8a5a3c, 0xb98a5e, 0x9c6b47, 0xd2a679, 0x7b4f36, 0xa97c50];
const GRASS = 0x6fbf5a;

interface Rider {
    object: THREE.Object3D;
    base: THREE.Vector3;
    side: number;
}

interface DeformedMesh {
    mesh: THREE.Mesh;
    base: Float32Array;
    side: number;
}

function smoothstep(edge0: number, edge1: number, x: number): number {
    const t = Math.min(1, Math.max(0, (x - edge0) / (edge1 - edge0)));
    return t * t * (3 - 2 * t);
}

function makeLabel(text: string, background: string): THREE.Sprite {
    const size = 128;
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const context = canvas.getContext('2d');
    if (context) {
        context.fillStyle = background;
        context.beginPath();
        context.arc(size / 2, size / 2, size / 2 - 6, 0, Math.PI * 2);
        context.fill();
        context.lineWidth = 8;
        context.strokeStyle = '#ffffff';
        context.stroke();
        context.fillStyle = '#ffffff';
        context.font = 'bold 76px system-ui, sans-serif';
        context.textAlign = 'center';
        context.textBaseline = 'middle';
        context.fillText(text, size / 2, size / 2 + 4);
    }
    const texture = new THREE.CanvasTexture(canvas);
    texture.colorSpace = THREE.SRGBColorSpace;
    const sprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: texture, depthTest: false, transparent: true }));
    sprite.scale.setScalar(0.85);
    sprite.renderOrder = 20;

    return sprite;
}

/**
 * Imperative three.js scene for Fault Lab: two crust blocks separated by a
 * fault that bend elastically while force is applied, then slip and rebound.
 */
export class FaultLabScene {
    private readonly renderer: THREE.WebGLRenderer;

    private readonly scene = new THREE.Scene();

    private readonly camera = new THREE.PerspectiveCamera(34, 1, 0.1, 100);

    private readonly controls: OrbitControls;

    private readonly world = new THREE.Group();

    private readonly crust = new THREE.Group();

    private readonly clouds = new THREE.Group();

    private readonly arrows = new THREE.Group();

    private readonly markers = new THREE.Group();

    private readonly waves = new THREE.Group();

    private readonly faultLine: THREE.Line;

    private readonly depthLine: THREE.Line;

    private readonly resizeObserver: ResizeObserver;

    private lastFrameAt = performance.now();

    private elapsed = 0;

    private deformed: DeformedMesh[] = [];

    private riders: Rider[] = [];

    private frontRings: THREE.Mesh[] = [];

    private surfaceRings: THREE.Mesh[] = [];

    private kind: ForceKind | null = null;

    private phase: Phase = 'idle';

    private stress = 0;

    private rebound = 0;

    private phaseTime = 0;

    private pushing = false;

    private waveTime = -1;

    private waveLoop = false;

    private shake = 0;

    private dirty = true;

    private frame = 0;

    private disposed = false;

    private lastReportedStress = -1;

    private readonly scratch = new THREE.Vector3();

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
            cloud.position.set(-7 + i * 6.5, 5.2 + (i % 2) * 0.7, -6 - i);
            this.clouds.add(cloud);
        }
        this.scene.add(this.clouds);

        this.world.position.y = WORLD_Y;
        this.world.add(this.crust, this.arrows, this.markers, this.waves);
        this.scene.add(this.world);

        this.faultLine = new THREE.Line(
            new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(), new THREE.Vector3(), new THREE.Vector3()]),
            new THREE.LineBasicMaterial({ color: 0x3b2416, depthTest: false, transparent: true }),
        );
        this.faultLine.renderOrder = 10;
        this.world.add(this.faultLine);

        this.depthLine = new THREE.Line(
            new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(), new THREE.Vector3()]),
            new THREE.LineDashedMaterial({ color: 0xffffff, dashSize: 0.16, gapSize: 0.1, depthTest: false, transparent: true }),
        );
        this.depthLine.renderOrder = 15;
        this.depthLine.visible = false;
        this.world.add(this.depthLine);

        this.controls = new OrbitControls(this.camera, this.renderer.domElement);
        this.controls.enablePan = false;
        this.controls.enableDamping = true;
        this.controls.minPolarAngle = THREE.MathUtils.degToRad(35);
        this.controls.maxPolarAngle = THREE.MathUtils.degToRad(84);
        this.controls.minAzimuthAngle = THREE.MathUtils.degToRad(-55);
        this.controls.maxAzimuthAngle = THREE.MathUtils.degToRad(55);
        this.controls.target.set(0, 0, 0);

        this.buildWaves();
        this.buildMarkers();
        this.setExperiment(null);

        this.resizeObserver = new ResizeObserver(() => this.resize());
        this.resizeObserver.observe(container);
        this.resize();

        this.frame = requestAnimationFrame(this.tick);
    }

    /** Reset the crust for a new experiment (or a calm block when `null`). */
    setExperiment(kind: ForceKind | null): void {
        this.kind = kind;
        this.phase = kind ? 'building' : 'idle';
        this.stress = 0;
        this.rebound = 0;
        this.phaseTime = 0;
        this.pushing = false;
        this.shake = 0;
        this.waveTime = -1;
        this.waveLoop = false;
        this.lastReportedStress = -1;
        this.hideRings();
        this.buildCrust();
        this.buildArrows();
        this.setMarkers('none');
        this.dirty = true;
    }

    /** While true, stress builds until the fault slips. */
    setPushing(pushing: boolean): void {
        if (this.phase !== 'building') {
            this.pushing = false;

            return;
        }
        if (pushing && !this.pushing) {
            this.stress = Math.min(1, this.stress + 0.04);
            this.dirty = true;
        }
        this.pushing = pushing;
    }

    /** Show the A / B / C points and loop the waves from the focus. */
    setMarkers(mode: MarkerMode): void {
        this.markers.visible = mode === 'points';
        this.depthLine.visible = false;
        this.waveLoop = mode === 'points';
        if (this.waveLoop && this.waveTime < 0) {
            this.waveTime = 0;
        }
    }

    /** Draw the focal-depth line between the focus and the epicenter. */
    showFocalDepth(): void {
        this.depthLine.visible = true;
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

    private get dipSlip(): boolean {
        return this.kind !== 'slide';
    }

    /** X position of the fault plane at a given depth. */
    private faultX(y: number): number {
        return this.dipSlip ? -(y + HEIGHT / 2) / Math.tan(DIP) : 0;
    }

    private focus(): THREE.Vector3 {
        const y = -HEIGHT * 0.58;

        return new THREE.Vector3(this.faultX(y), y, DEPTH / 2);
    }

    private clearGroup(group: THREE.Group): void {
        for (const child of [...group.children]) {
            group.remove(child);
            disposeObject(child);
        }
    }

    private buildCrust(): void {
        this.clearGroup(this.crust);
        this.deformed = [];
        this.riders = [];

        for (const side of [-1, 1]) {
            this.addDeformed(this.makeBlock(side), side);
            this.addDeformed(this.makeStrip(side, 0.9, 0.9, 0x4b5563, 0.02), side);
            this.addDeformed(this.makeStrip(side, 0.9, 0.07, 0xfde68a, 0.03), side);
        }

        // A straight row of trees crossing the fault makes sideways offset easy to see.
        [-5.2, -4.2, -3.2, -2.2, -1.4, 1.4, 2.2, 3.2, 4.2, 5.2].forEach((x, i) => {
            this.addRider(makeTree(i), x, -1.5);
        });
        this.addRider(makeHouse(0xe5604d), -3.9, -0.35);
        this.addRider(makeHouse(0x3b82c4, 0xf1f5f9), -2.0, 2.0);
        this.addRider(makeHouse(0xd9912b), 2.3, -0.35);
        this.addRider(makeHouse(0x7c5cc4, 0xfef3c7), 4.3, 2.0);
        this.addRider(makeHouse(0x3f9a6b), 4.9, -0.4);

        this.addRider(makeCar(0xef4444), -4.6, 1.12);
        this.addRider(makeCar(0x2563eb), 3.3, 0.68);
        [-5.0, -2.6, 2.6, 5.0].forEach((x) => this.addRider(makeLamp(), x, 0.32));
        this.addRider(makeRocks(1), -5.3, -2.1);
        this.addRider(makeRocks(2), 1.2, -2.15);
        this.addRider(makeRocks(3), 5.4, 1.1);
        this.addRider(makeTree(11), -4.9, 1.9);
        this.addRider(makeTree(12), 1.5, 2.1);
    }

    private addDeformed(mesh: THREE.Mesh, side: number): void {
        const position = mesh.geometry.getAttribute('position') as THREE.BufferAttribute;
        this.deformed.push({ mesh, base: Float32Array.from(position.array as Float32Array), side });
        this.crust.add(mesh);
    }

    private addRider(object: THREE.Object3D, x: number, z: number): void {
        const side = x < this.faultX(0) ? -1 : 1;
        this.riders.push({ object, base: new THREE.Vector3(x, 0, z), side });
        this.crust.add(object);
    }

    private makeBlock(side: number): THREE.Mesh {
        const geometry = new THREE.BoxGeometry(1, 1, 1, 16, 6, 6).toNonIndexed();
        const position = geometry.getAttribute('position') as THREE.BufferAttribute;

        for (let i = 0; i < position.count; i++) {
            const u = position.getX(i) + 0.5;
            const y = (position.getY(i) - 0.5) * HEIGHT;
            const fault = this.faultX(y);
            const x = side < 0 ? THREE.MathUtils.lerp(-WIDTH / 2, fault, u) : THREE.MathUtils.lerp(fault, WIDTH / 2, u);
            position.setXYZ(i, x, y, position.getZ(i) * DEPTH);
        }

        const colors = new Float32Array(position.count * 3);
        const color = new THREE.Color();
        const bandHeight = HEIGHT / STRATA.length;
        for (let i = 0; i < position.count; i += 3) {
            const centreY = (position.getY(i) + position.getY(i + 1) + position.getY(i + 2)) / 3;
            const isTop = centreY > -0.001;
            const band = Math.min(STRATA.length - 1, Math.floor(-centreY / bandHeight));
            color.setHex(isTop ? GRASS : STRATA[band]);
            // Slight variation per facet so the rock and turf do not look like flat paint.
            color.multiplyScalar(0.94 + Math.random() * 0.12);
            for (let j = 0; j < 3; j++) {
                colors[(i + j) * 3] = color.r;
                colors[(i + j) * 3 + 1] = color.g;
                colors[(i + j) * 3 + 2] = color.b;
            }
        }
        geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
        geometry.computeVertexNormals();

        const block = new THREE.Mesh(geometry, new THREE.MeshLambertMaterial({ vertexColors: true }));
        block.castShadow = true;
        block.receiveShadow = true;

        return block;
    }

    /** A flat strip on the surface running across the fault (road, lane line). */
    private makeStrip(side: number, z: number, width: number, colour: number, lift: number): THREE.Mesh {
        const geometry = new THREE.PlaneGeometry(1, 1, 24, 1);
        geometry.rotateX(-Math.PI / 2);
        const position = geometry.getAttribute('position') as THREE.BufferAttribute;
        const fault = this.faultX(0);

        for (let i = 0; i < position.count; i++) {
            const u = position.getX(i) + 0.5;
            const x = side < 0 ? THREE.MathUtils.lerp(-WIDTH / 2, fault, u) : THREE.MathUtils.lerp(fault, WIDTH / 2, u);
            position.setXYZ(i, x, lift, z + position.getZ(i) * width);
        }

        const strip = new THREE.Mesh(geometry, new THREE.MeshLambertMaterial({ color: colour }));
        strip.receiveShadow = true;

        return strip;
    }

    private buildArrows(): void {
        this.clearGroup(this.arrows);
        if (!this.kind) {
            return;
        }

        for (const side of [-1, 1]) {
            const arrow = new THREE.Group();
            const material = new THREE.MeshLambertMaterial({ color: 0xf59e0b, emissive: 0x7c2d12, emissiveIntensity: 0.35 });
            const shaft = new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.11, 1.1, 10), material);
            shaft.position.y = 0.55;
            const head = new THREE.Mesh(new THREE.ConeGeometry(0.28, 0.5, 12), material);
            head.position.y = 1.35;
            arrow.add(shaft, head);

            // The arrow model points along +Y; aim it along the force direction.
            const direction = this.forceDirection(side);
            arrow.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), direction);
            const anchor = this.kind === 'slide' ? new THREE.Vector3(side * 2.6, 1.1, 0) : new THREE.Vector3(side * 3.4, 1.1, 0);
            arrow.position.copy(anchor).addScaledVector(direction, -0.8);
            arrow.userData = { anchor, direction };
            this.arrows.add(arrow);
        }
    }

    private forceDirection(side: number): THREE.Vector3 {
        if (this.kind === 'pull') {
            return new THREE.Vector3(side, 0, 0);
        }
        if (this.kind === 'push') {
            return new THREE.Vector3(-side, 0, 0);
        }

        return new THREE.Vector3(0, 0, side);
    }

    private buildWaves(): void {
        const frontClip = [
            new THREE.Plane(new THREE.Vector3(0, -1, 0), WORLD_Y),
            new THREE.Plane(new THREE.Vector3(0, 1, 0), HEIGHT - WORLD_Y),
            new THREE.Plane(new THREE.Vector3(1, 0, 0), WIDTH / 2 + 0.3),
            new THREE.Plane(new THREE.Vector3(-1, 0, 0), WIDTH / 2 + 0.3),
        ];
        const surfaceClip = [
            new THREE.Plane(new THREE.Vector3(0, 0, -1), DEPTH / 2),
            new THREE.Plane(new THREE.Vector3(0, 0, 1), DEPTH / 2),
            new THREE.Plane(new THREE.Vector3(1, 0, 0), WIDTH / 2 + 0.3),
            new THREE.Plane(new THREE.Vector3(-1, 0, 0), WIDTH / 2 + 0.3),
        ];

        for (let i = 0; i < 4; i++) {
            const front = new THREE.Mesh(
                new THREE.RingGeometry(0.93, 1, 72),
                new THREE.MeshBasicMaterial({ color: 0xfff1a8, transparent: true, side: THREE.DoubleSide, depthTest: false, clippingPlanes: frontClip }),
            );
            front.renderOrder = 12;
            front.visible = false;
            this.frontRings.push(front);

            const surface = new THREE.Mesh(
                new THREE.RingGeometry(0.93, 1, 72),
                new THREE.MeshBasicMaterial({ color: 0xff6b4a, transparent: true, side: THREE.DoubleSide, depthTest: false, clippingPlanes: surfaceClip }),
            );
            surface.rotation.x = -Math.PI / 2;
            surface.renderOrder = 12;
            surface.visible = false;
            this.surfaceRings.push(surface);

            this.waves.add(front, surface);
        }
    }

    private buildMarkers(): void {
        const dot = (colour: number): THREE.Mesh =>
            new THREE.Mesh(new THREE.SphereGeometry(0.1, 16, 12), new THREE.MeshBasicMaterial({ color: colour, depthTest: false }));

        for (const [text, background, colour] of [
            ['A', '#7c3aed', 0x7c3aed],
            ['B', '#db2777', 0xdb2777],
            ['C', '#0891b2', 0x0891b2],
        ] as const) {
            const marker = new THREE.Group();
            const point = dot(colour);
            point.renderOrder = 18;
            const label = makeLabel(text, background);
            label.position.y = 0.6;
            marker.add(point, label);
            marker.name = text;
            this.markers.add(marker);
        }
        this.markers.visible = false;
    }

    private placeMarkers(): void {
        const focus = this.focus();
        const epicenter = new THREE.Vector3(focus.x, 0.04, DEPTH / 2);
        const elsewhere = new THREE.Vector3(WIDTH / 2 - 1.6, 0.04, DEPTH / 2);
        const [a, b, c] = this.markers.children;
        a.position.set(focus.x, focus.y, focus.z + 0.05);
        b.position.copy(epicenter);
        c.position.copy(elsewhere);

        const line = this.depthLine.geometry.getAttribute('position') as THREE.BufferAttribute;
        line.setXYZ(0, focus.x, focus.y, focus.z + 0.05);
        line.setXYZ(1, epicenter.x, epicenter.y, epicenter.z + 0.05);
        line.needsUpdate = true;
        this.depthLine.computeLineDistances();
    }

    // ── Simulation ───────────────────────────────────────────────────────────

    /**
     * Elastic rebound: far from the fault the rock moves with the plate while
     * the locked fault holds the near field back. When the fault slips, the
     * near field catches up (rebound → 1) and the offset becomes permanent.
     */
    private deform(x: number, y: number, z: number, side: number, out: THREE.Vector3): THREE.Vector3 {
        out.set(x, y, z);
        if (!this.kind) {
            return out;
        }

        const farField = smoothstep(0, FAR_FIELD, Math.abs(x - this.faultX(Math.min(y, 0))));
        const moved = farField + (1 - farField) * this.rebound;

        if (this.kind === 'slide') {
            out.z += side * STRIKE_SLIP_AMPLITUDE * this.stress * moved;

            return out;
        }

        const direction = this.kind === 'pull' ? 1 : -1;
        out.x += direction * side * DIP_SLIP_AMPLITUDE * this.stress * moved;
        if (side > 0) {
            // Hanging wall slides along the dipping fault plane.
            out.y -= direction * 2 * DIP_SLIP_AMPLITUDE * this.stress * Math.tan(DIP) * this.rebound;
        }

        return out;
    }

    private applyDeformation(): void {
        for (const { mesh, base, side } of this.deformed) {
            const position = mesh.geometry.getAttribute('position') as THREE.BufferAttribute;
            for (let i = 0; i < position.count; i++) {
                const p = this.deform(base[i * 3], base[i * 3 + 1], base[i * 3 + 2], side, this.scratch);
                position.setXYZ(i, p.x, p.y, p.z);
            }
            position.needsUpdate = true;
            mesh.geometry.computeVertexNormals();
            mesh.geometry.computeBoundingSphere();
        }

        for (const rider of this.riders) {
            rider.object.position.copy(this.deform(rider.base.x, rider.base.y, rider.base.z, rider.side, this.scratch));
        }

        // The fault trace follows the footwall, across the top and down the front face.
        const line = this.faultLine.geometry.getAttribute('position') as THREE.BufferAttribute;
        const z = DEPTH / 2 + 0.02;
        const corners: [number, number, number][] = [
            [this.faultX(0), 0.04, -DEPTH / 2],
            [this.faultX(0), 0.04, z],
            [this.faultX(-HEIGHT), -HEIGHT, z],
        ];
        corners.forEach(([x, y, cz], i) => {
            const p = this.deform(x, y, cz, -1, this.scratch);
            line.setXYZ(i, p.x, y, this.kind === 'slide' ? cz : p.z);
        });
        line.needsUpdate = true;

        const material = this.faultLine.material as THREE.LineBasicMaterial;
        material.color.setHex(0x3b2416).lerp(new THREE.Color(0xef4444), this.phase === 'building' ? this.stress : 0);

        this.placeMarkers();
    }

    private hideRings(): void {
        for (const ring of [...this.frontRings, ...this.surfaceRings]) {
            ring.visible = false;
        }
    }

    private updateWaves(delta: number): void {
        if (this.waveTime < 0) {
            return;
        }
        this.waveTime += delta;

        const focus = this.focus();
        const depth = -focus.y;
        const spacing = 0.45;
        const lifetime = 2.6;
        let active = false;

        this.frontRings.forEach((ring, i) => {
            const age = this.waveTime - i * spacing;
            const alive = age > 0 && age < lifetime;
            ring.visible = alive;
            if (alive) {
                active = true;
                ring.position.set(focus.x, focus.y, DEPTH / 2 + 0.03);
                ring.scale.setScalar(Math.max(0.01, age * WAVE_SPEED));
                (ring.material as THREE.MeshBasicMaterial).opacity = 0.9 * (1 - age / lifetime);
            }
        });

        // Surface waves start once the rupture's energy reaches the epicenter.
        const arrival = depth / WAVE_SPEED;
        this.surfaceRings.forEach((ring, i) => {
            const age = this.waveTime - arrival - i * spacing;
            const alive = age > 0 && age < lifetime;
            ring.visible = alive;
            if (alive) {
                active = true;
                ring.position.set(focus.x, 0.06, DEPTH / 2);
                ring.scale.setScalar(Math.max(0.01, age * WAVE_SPEED));
                (ring.material as THREE.MeshBasicMaterial).opacity = 0.85 * (1 - age / lifetime);
            }
        });

        if (!active && this.waveTime > arrival + spacing * 4) {
            this.waveTime = this.waveLoop ? 0 : -1;
        }
    }

    private updateArrows(elapsed: number): void {
        const speed = this.pushing ? 9 : 3;
        const travel = this.pushing ? 0.28 : 0.14;
        for (const arrow of this.arrows.children) {
            const { anchor, direction } = arrow.userData as { anchor: THREE.Vector3; direction: THREE.Vector3 };
            const offset = -0.8 + (Math.sin(elapsed * speed) * 0.5 + 0.5) * travel;
            arrow.position.copy(anchor).addScaledVector(direction, offset);
            arrow.visible = this.phase === 'building';
        }
    }

    private readonly tick = (): void => {
        if (this.disposed) {
            return;
        }
        this.frame = requestAnimationFrame(this.tick);

        const now = performance.now();
        const delta = Math.min((now - this.lastFrameAt) / 1000, 0.05);
        this.lastFrameAt = now;
        this.elapsed += delta;
        const elapsed = this.elapsed;

        if (this.phase === 'building' && this.pushing) {
            this.stress = Math.min(1, this.stress + delta / BUILD_SECONDS);
            this.dirty = true;
        }

        if (this.phase === 'building') {
            if (Math.abs(this.stress - this.lastReportedStress) >= 0.01 || (this.stress === 1 && this.lastReportedStress !== 1)) {
                this.lastReportedStress = this.stress;
                this.callbacks.onStress(this.stress);
            }
            if (this.stress >= 1) {
                this.phase = 'slipping';
                this.phaseTime = 0;
                this.pushing = false;
                this.shake = 1;
                this.waveTime = 0;
                this.callbacks.onSlip();
            }
        } else if (this.phase === 'slipping') {
            this.phaseTime += delta;
            const t = Math.min(1, this.phaseTime / SLIP_SECONDS);
            this.rebound = 1 - Math.pow(1 - t, 3);
            this.dirty = true;
            if (this.phaseTime >= SETTLE_SECONDS) {
                this.phase = 'settled';
                this.callbacks.onSettled();
            }
        }

        if (this.dirty) {
            this.applyDeformation();
            this.dirty = false;
        }

        this.updateWaves(delta);
        this.updateArrows(elapsed);
        for (const cloud of this.clouds.children) {
            cloud.position.x = cloud.position.x > 11 ? -11 : cloud.position.x + delta * 0.12;
        }

        // Tremor near critical stress, then a decaying jolt after the slip.
        const tremor = this.phase === 'building' && this.stress > 0.8 ? (this.stress - 0.8) * 0.12 : 0;
        this.shake = Math.max(0, this.shake - delta / 1.6);
        const amount = tremor + this.shake * this.shake * 0.22;
        this.world.position.x = (Math.random() - 0.5) * amount;
        this.world.position.z = (Math.random() - 0.5) * amount;
        for (const rider of this.riders) {
            rider.object.rotation.z = (Math.random() - 0.5) * amount * 1.4;
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
        const distance = 17 * Math.max(1, 1.55 / this.camera.aspect);
        const direction = this.camera.position.lengthSq() > 0
            ? this.camera.position.clone().sub(this.controls.target).normalize()
            : new THREE.Vector3(0.42, 0.42, 0.8).normalize();
        this.camera.position.copy(this.controls.target).addScaledVector(direction, distance);
        this.controls.minDistance = distance * 0.6;
        this.controls.maxDistance = distance * 1.3;
    }
}
