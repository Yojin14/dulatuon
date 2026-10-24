import { enableShadows } from '@/lib/sim-models';
import { makeTextSprite, SimStage } from '@/lib/sim-stage';
import * as THREE from 'three';

export type TargetId = 'shelf' | 'box' | 'exit' | 'window' | 'kit' | 'desk' | 'door' | 'student';

interface SceneCallbacks {
    onPick: (id: TargetId) => void;
}

const ROOM_WIDTH = 9;
const ROOM_DEPTH = 7;
const WALL_HEIGHT = 3;
const BACK = -ROOM_DEPTH / 2;
const LEFT = -ROOM_WIDTH / 2;

const FOUND_LABELS: Record<Exclude<TargetId, 'student'>, string> = {
    shelf: 'Strapped to the wall',
    box: 'Moved down low',
    exit: 'Exit cleared',
    window: 'Stay away from glass',
    kit: 'Emergency kit',
    desk: 'Safe spot',
    door: 'Way out',
};

function lambert(colour: number): THREE.MeshLambertMaterial {
    return new THREE.MeshLambertMaterial({ color: colour });
}

function box(width: number, height: number, depth: number, colour: number): THREE.Mesh {
    return new THREE.Mesh(new THREE.BoxGeometry(width, height, depth), lambert(colour));
}

/** Small repeatable random source, so cracks look the same on every visit. */
function seeded(seed: number): () => number {
    let state = seed;

    return () => {
        state = (state * 1664525 + 1013904223) % 4294967296;

        return state / 4294967296;
    };
}

/** A jagged crack with side branches and a patch of chipped plaster, on a see-through canvas. */
function crackTexture(seed: number): THREE.CanvasTexture {
    const size = 256;
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const context = canvas.getContext('2d');
    const random = seeded(seed);

    if (context) {
        context.lineCap = 'round';
        context.lineJoin = 'round';

        const branch = (x: number, y: number, angle: number, length: number, width: number): void => {
            let remaining = length;
            while (remaining > 0 && width > 0.5) {
                const step = 10 + random() * 14;
                const turn = angle + (random() - 0.5) * 1.1;
                const nextX = x + Math.cos(turn) * step;
                const nextY = y + Math.sin(turn) * step;
                context.strokeStyle = 'rgba(30, 24, 20, 0.92)';
                context.lineWidth = width;
                context.beginPath();
                context.moveTo(x, y);
                context.lineTo(nextX, nextY);
                context.stroke();
                // A pale edge on one side reads as broken plaster catching the light.
                context.strokeStyle = 'rgba(255, 255, 255, 0.35)';
                context.lineWidth = Math.max(0.6, width * 0.35);
                context.beginPath();
                context.moveTo(x + 1.5, y + 1);
                context.lineTo(nextX + 1.5, nextY + 1);
                context.stroke();

                if (width > 1.6 && random() < 0.38) {
                    branch(nextX, nextY, turn + (random() < 0.5 ? -1 : 1) * (0.6 + random() * 0.6), remaining * 0.45, width * 0.55);
                }
                x = nextX;
                y = nextY;
                remaining -= step;
                width *= 0.9;
            }
        };

        // Chipped plaster where the crack starts.
        const startX = size * (0.35 + random() * 0.3);
        context.fillStyle = 'rgba(150, 138, 122, 0.55)';
        context.beginPath();
        for (let i = 0; i < 9; i++) {
            const angle = (i / 9) * Math.PI * 2;
            const radius = 14 + random() * 16;
            context.lineTo(startX + Math.cos(angle) * radius, 26 + Math.sin(angle) * radius * 0.7);
        }
        context.closePath();
        context.fill();

        branch(startX, 14, Math.PI / 2, size * 0.95, 5.5);
    }

    const texture = new THREE.CanvasTexture(canvas);
    texture.colorSpace = THREE.SRGBColorSpace;

    return texture;
}

function floorTexture(): THREE.CanvasTexture {
    const size = 128;
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const context = canvas.getContext('2d');
    if (context) {
        context.fillStyle = '#d9c7a3';
        context.fillRect(0, 0, size, size);
        context.fillStyle = '#d2bf99';
        context.fillRect(0, 0, size / 2, size / 2);
        context.fillRect(size / 2, size / 2, size / 2, size / 2);
        context.strokeStyle = 'rgba(120, 100, 70, 0.45)';
        context.lineWidth = 2;
        context.strokeRect(0, 0, size / 2, size / 2);
        context.strokeRect(size / 2, 0, size / 2, size / 2);
        context.strokeRect(0, size / 2, size / 2, size / 2);
        context.strokeRect(size / 2, size / 2, size / 2, size / 2);
    }
    const texture = new THREE.CanvasTexture(canvas);
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.RepeatWrapping;
    texture.repeat.set(ROOM_WIDTH / 2, ROOM_DEPTH / 2);

    return texture;
}

function pickable<T extends THREE.Object3D>(object: T, id: TargetId): T {
    object.userData.pickId = id;

    return object;
}

/**
 * Imperative three.js scene for Quake Ready: a classroom the student prepares
 * before an earthquake, takes cover in during it, and checks afterwards.
 * Anything left unsecured really does fall when the shaking starts.
 */
export class QuakeReadyScene extends SimStage {
    private readonly room = new THREE.Group();

    private readonly shelf = new THREE.Group();

    private readonly straps = new THREE.Group();

    private readonly heavyBox: THREE.Mesh;

    private readonly clutter = new THREE.Group();

    private readonly glass: THREE.Mesh;

    private readonly shards = new THREE.Group();

    private readonly tape: THREE.Mesh;

    private readonly lamp = new THREE.Group();

    private readonly student = new THREE.Group();

    private readonly aftermathProps = new THREE.Group();

    private readonly spark: THREE.Mesh;

    private readonly sparks = new THREE.Group();

    private readonly labels = new Map<string, THREE.Sprite>();

    private readonly found = new Set<TargetId>();

    private readonly studentHome = new THREE.Vector3(-0.2, 0, 2.3);

    private readonly studentGoal = new THREE.Vector3(-0.2, 0, 2.3);

    private crouch = 0;

    private crouchGoal = 0;

    private shaking = false;

    private shakeTime = 0;

    private shakeLimit = Infinity;

    private fallen = 0;

    constructor(
        container: HTMLElement,
        private readonly callbacks: SceneCallbacks,
    ) {
        super(container, { direction: [0.5, 0.5, 0.72], distance: 17, fitAspect: 1.55, polar: [35, 82], azimuth: [5, 70], clouds: false });
        this.controls.target.set(-0.3, 1.1, -0.3);

        this.world.add(this.room);
        this.buildRoom();

        // Bookshelf: tall, heavy and free-standing until it is strapped.
        const frame = box(1.2, 2.2, 0.42, 0x8b5a2b);
        frame.position.y = 1.1;
        this.shelf.add(frame);
        const bookColours = [0xef4444, 0x3b82f6, 0x22c55e, 0xf59e0b, 0xa855f7];
        for (let row = 0; row < 4; row++) {
            for (let i = 0; i < 6; i++) {
                const book = box(0.13, 0.36, 0.26, bookColours[(row + i) % bookColours.length]);
                book.position.set(-0.42 + i * 0.165, 0.38 + row * 0.5, 0.1);
                this.shelf.add(book);
            }
        }
        this.shelf.position.set(-2.6, 0, BACK + 0.24);
        this.room.add(pickable(this.shelf, 'shelf'));
        for (const x of [-0.45, 0.45]) {
            const strap = box(0.08, 0.06, 0.3, 0x94a3b8);
            strap.position.set(-2.6 + x, 2.05, BACK + 0.12);
            this.straps.add(strap);
        }
        this.straps.visible = false;
        this.room.add(this.straps);

        // A heavy box left on top of a tall cabinet.
        const cabinet = box(0.9, 1.5, 0.5, 0x64748b);
        cabinet.position.set(0.4, 0.75, BACK + 0.28);
        this.room.add(cabinet);
        this.heavyBox = pickable(box(0.55, 0.45, 0.42, 0xb45309), 'box');
        this.room.add(this.heavyBox);

        // Chairs and bags piled in front of the door.
        const chair = box(0.45, 0.5, 0.45, 0x0ea5e9);
        chair.position.set(0, 0.25, 0);
        const bag = box(0.4, 0.3, 0.3, 0x16a34a);
        bag.position.set(0.25, 0.65, 0.05);
        const crate = box(0.5, 0.4, 0.45, 0xa16207);
        crate.position.set(0.1, 0.2, 0.55);
        this.clutter.add(chair, bag, crate);
        this.room.add(pickable(this.clutter, 'exit'));

        // Door in the left wall, with an exit sign above it.
        const door = pickable(box(0.08, 2.0, 1.0, 0x7c4a21), 'door');
        door.position.set(LEFT + 0.06, 1.0, 1.6);
        const sign = box(0.05, 0.22, 0.6, 0x16a34a);
        sign.position.set(LEFT + 0.07, 2.25, 1.6);
        this.room.add(door, sign);

        // Window in the back wall: a frame with the sky outside, and a pane of glass.
        const sky = new THREE.Mesh(new THREE.PlaneGeometry(1.5, 1.1), new THREE.MeshBasicMaterial({ color: 0x9ed8f5 }));
        sky.position.set(2.9, 1.7, BACK + 0.012);
        this.room.add(sky);
        for (const [width, height, x, y] of [
            [1.72, 0.1, 0, 0.6],
            [1.72, 0.1, 0, -0.6],
            [0.1, 1.3, -0.81, 0],
            [0.1, 1.3, 0.81, 0],
            [0.05, 1.1, 0, 0],
            [1.5, 0.05, 0, 0],
        ] as [number, number, number, number][]) {
            const bar = box(width, height, 0.1, 0xf8fafc);
            bar.position.set(2.9 + x, 1.7 + y, BACK + 0.05);
            this.room.add(bar);
        }
        const sill = box(1.9, 0.06, 0.22, 0xe2e8f0);
        sill.position.set(2.9, 1.07, BACK + 0.11);
        this.room.add(sill);
        this.glass = pickable(
            new THREE.Mesh(new THREE.BoxGeometry(1.5, 1.1, 0.03), new THREE.MeshLambertMaterial({ color: 0xbfe9ff, transparent: true, opacity: 0.45 })),
            'window',
        );
        this.glass.position.set(2.9, 1.7, BACK + 0.07);
        this.room.add(this.glass);
        for (let i = 0; i < 14; i++) {
            const shard = new THREE.Mesh(new THREE.TetrahedronGeometry(0.09 + (i % 3) * 0.03), new THREE.MeshLambertMaterial({ color: 0xbae6fd, transparent: true, opacity: 0.8 }));
            shard.position.set(2.3 + (i % 7) * 0.2, 0.06, BACK + 0.35 + ((i * 3) % 5) * 0.16);
            shard.rotation.set(i, i * 2, i * 3);
            this.shards.add(shard);
        }
        this.shards.visible = false;
        this.room.add(this.shards);
        this.tape = new THREE.Mesh(new THREE.PlaneGeometry(2.2, 1.3), new THREE.MeshBasicMaterial({ color: 0xfacc15, transparent: true, opacity: 0.45 }));
        this.tape.rotation.x = -Math.PI / 2;
        this.tape.position.set(2.9, 0.02, BACK + 0.75);
        this.tape.visible = false;
        this.room.add(this.tape);

        // Emergency kit hanging on the left wall.
        const kit = pickable(new THREE.Group(), 'kit');
        const kitBag = box(0.2, 0.45, 0.5, 0xdc2626);
        const cross = box(0.21, 0.22, 0.07, 0xffffff);
        const crossBar = box(0.21, 0.07, 0.22, 0xffffff);
        kit.add(kitBag, cross, crossBar);
        kit.position.set(LEFT + 0.14, 1.4, -1.6);
        this.room.add(kit);

        // Sturdy desks: four student desks and the teacher's table.
        for (const [x, z, width] of [
            [-1.9, 0.1, 1.0],
            [-0.3, 0.1, 1.0],
            [-1.9, 1.7, 1.0],
            [1.5, 1.2, 1.5],
        ] as [number, number, number][]) {
            this.room.add(this.makeDesk(x, z, width));
        }

        // Ceiling lamp that swings when the room shakes.
        const cord = box(0.03, 0.6, 0.03, 0x334155);
        cord.position.y = -0.3;
        const shade = new THREE.Mesh(new THREE.ConeGeometry(0.32, 0.26, 16, 1, true), new THREE.MeshLambertMaterial({ color: 0xfde68a, side: THREE.DoubleSide }));
        shade.position.y = -0.68;
        this.lamp.add(cord, shade);
        this.lamp.position.set(-0.4, WALL_HEIGHT, 0.4);
        this.room.add(this.lamp);

        this.buildStudent();
        this.spark = new THREE.Mesh(new THREE.SphereGeometry(0.06, 10, 8), new THREE.MeshBasicMaterial({ color: 0xfffbeb }));
        this.buildAftermath();

        enableShadows(this.room);
        // Flat, unlit pieces (crack decals, floor marks, glass, sparks) must not cast square shadows.
        this.room.traverse((object) => {
            const mesh = object as THREE.Mesh;
            if (mesh.isMesh && ((mesh.material as THREE.Material).type === 'MeshBasicMaterial' || (mesh.material as THREE.Material).transparent)) {
                mesh.castShadow = false;
            }
        });

        this.enablePicking(
            () => [this.room],
            (id) => this.callbacks.onPick(id as TargetId),
        );
        this.restore();
        this.start();
    }

    /** Fix a danger or mark a safety item, and label it. */
    setFound(id: Exclude<TargetId, 'student'>): void {
        if (this.found.has(id)) {
            return;
        }
        this.found.add(id);

        if (id === 'shelf') {
            this.straps.visible = true;
        } else if (id === 'box') {
            this.heavyBox.position.set(1.25, 0.225, BACK + 0.4);
        } else if (id === 'exit') {
            this.clutter.position.set(LEFT + 0.7, 0, -2.7);
        } else if (id === 'window') {
            this.tape.visible = true;
        }

        const anchor = this.anchorFor(id);
        const label = makeTextSprite(`✓ ${FOUND_LABELS[id]}`, '#15803d', 0.3);
        label.position.copy(anchor);
        this.room.add(label);
        this.labels.set(id, label);
    }

    /** Begin shaking. Unsecured things fall. Shaking continues until `stopShaking`, or for `seconds`. */
    startShaking(seconds = Infinity): void {
        this.shaking = true;
        this.shakeTime = 0;
        this.shakeLimit = seconds;
    }

    stopShaking(): void {
        this.shaking = false;
        this.world.position.set(0, 0, 0);
        this.lamp.rotation.set(0, 0, 0);
    }

    /** The student drops to hands and knees where they stand. */
    studentDrop(): void {
        this.crouchGoal = 1;
    }

    /** The student shelters under the teacher's table. */
    studentCover(): void {
        this.crouchGoal = 1;
        this.studentGoal.set(1.5, 0, 1.25);
    }

    studentStand(): void {
        this.crouchGoal = 0;
        this.studentGoal.copy(this.studentHome);
    }

    /** Stand fallen things back up and mend the window, so a preview can loop. */
    tidyUp(): void {
        this.stopShaking();
        this.fallen = 0;
        this.shelf.rotation.x = 0;
        this.shelf.position.z = BACK + 0.24;
        this.heavyBox.rotation.x = 0;
        this.heavyBox.position.set(0.4, 1.725, BACK + 0.28);
        this.glass.visible = true;
        this.shards.visible = false;
    }

    /** Reveal what the room looks like once the shaking has stopped. */
    showAftermath(): void {
        this.aftermathProps.visible = true;
        for (const label of this.labels.values()) {
            label.visible = false;
        }
    }

    protected update(delta: number, elapsed: number): void {
        this.crouch = THREE.MathUtils.lerp(this.crouch, this.crouchGoal, Math.min(1, delta * 9));
        this.student.position.lerp(this.studentGoal, Math.min(1, delta * 5));
        this.student.scale.set(1, 1 - this.crouch * 0.48, 1);

        // The live wire crackles: a flickering core with small sparks jumping off it.
        const crackle = this.aftermathProps.visible && Math.sin(elapsed * 23) + Math.sin(elapsed * 37) > 0.1;
        this.spark.visible = crackle;
        this.sparks.visible = crackle;
        if (crackle) {
            for (const fleck of this.sparks.children) {
                fleck.position.set((Math.random() - 0.5) * 0.5, Math.random() * 0.38, (Math.random() - 0.5) * 0.5);
                fleck.scale.setScalar(0.5 + Math.random());
            }
        }

        if (!this.shaking) {
            return;
        }
        this.shakeTime += delta;
        if (this.shakeTime >= this.shakeLimit) {
            this.stopShaking();

            return;
        }

        const amount = 0.11;
        this.world.position.set((Math.random() - 0.5) * amount, 0, (Math.random() - 0.5) * amount);
        this.lamp.rotation.z = Math.sin(elapsed * 6) * 0.45;
        this.lamp.rotation.x = Math.cos(elapsed * 5) * 0.25;

        // Things that were not secured fall over shortly after the shaking starts.
        this.fallen = Math.min(1, Math.max(this.fallen, (this.shakeTime - 0.9) / 0.7));
        const fall = this.fallen * this.fallen;
        if (fall > 0) {
            if (!this.found.has('shelf')) {
                this.shelf.rotation.x = fall * 1.45;
                this.shelf.position.z = BACK + 0.24 + fall * 0.2;
            }
            if (!this.found.has('box')) {
                this.heavyBox.position.set(0.4, THREE.MathUtils.lerp(1.725, 0.225, fall), BACK + 0.28 + fall * 1.1);
                this.heavyBox.rotation.x = fall * 2.2;
            }
            this.glass.visible = false;
            this.shards.visible = true;
        }
    }

    // ── Geometry ─────────────────────────────────────────────────────────────

    private restore(): void {
        this.heavyBox.position.set(0.4, 1.725, BACK + 0.28);
        this.clutter.position.set(LEFT + 0.7, 0, 1.3);
        this.student.position.copy(this.studentHome);
    }

    private anchorFor(id: Exclude<TargetId, 'student'>): THREE.Vector3 {
        switch (id) {
            case 'shelf':
                return new THREE.Vector3(-2.6, 2.55, BACK + 0.4);
            case 'box':
                return new THREE.Vector3(1.25, 0.85, BACK + 0.5);
            case 'exit':
                return new THREE.Vector3(LEFT + 0.9, 1.25, -2.5);
            case 'window':
                return new THREE.Vector3(2.9, 2.65, BACK + 0.2);
            case 'kit':
                return new THREE.Vector3(LEFT + 0.4, 2.0, -1.6);
            case 'desk':
                return new THREE.Vector3(1.5, 1.25, 1.2);
            case 'door':
                return new THREE.Vector3(LEFT + 0.4, 2.7, 1.6);
        }
    }

    private buildRoom(): void {
        const floor = new THREE.Mesh(new THREE.BoxGeometry(ROOM_WIDTH, 0.2, ROOM_DEPTH), [
            lambert(0xb89f78),
            lambert(0xb89f78),
            new THREE.MeshLambertMaterial({ map: floorTexture() }),
            lambert(0xb89f78),
            lambert(0xb89f78),
            lambert(0xb89f78),
        ]);
        floor.position.y = -0.1;
        const backWall = box(ROOM_WIDTH, WALL_HEIGHT, 0.15, 0xf5efe0);
        backWall.position.set(0, WALL_HEIGHT / 2, BACK - 0.075);
        const leftWall = box(0.15, WALL_HEIGHT, ROOM_DEPTH, 0xece4d0);
        leftWall.position.set(LEFT - 0.075, WALL_HEIGHT / 2, 0);
        this.room.add(floor, backWall, leftWall);

        // A painted lower band and a skirting board along both walls.
        const backBand = box(ROOM_WIDTH, 0.9, 0.02, 0x9fc5b8);
        backBand.position.set(0, 0.45, BACK + 0.01);
        const leftBand = box(0.02, 0.9, ROOM_DEPTH, 0x94bbae);
        leftBand.position.set(LEFT + 0.01, 0.45, 0);
        const backSkirting = box(ROOM_WIDTH, 0.12, 0.05, 0x7c5a3a);
        backSkirting.position.set(0, 0.06, BACK + 0.025);
        const leftSkirting = box(0.05, 0.12, ROOM_DEPTH, 0x7c5a3a);
        leftSkirting.position.set(LEFT + 0.025, 0.06, 0);
        this.room.add(backBand, leftBand, backSkirting, leftSkirting);

        // Chalkboard with a wooden frame and a tray.
        const boardFrame = box(2.36, 1.16, 0.05, 0x8b5a2b);
        boardFrame.position.set(-0.6, 1.75, BACK + 0.03);
        const board = box(2.2, 1.0, 0.03, 0x14532d);
        board.position.set(-0.6, 1.75, BACK + 0.055);
        const tray = box(2.2, 0.04, 0.12, 0x8b5a2b);
        tray.position.set(-0.6, 1.2, BACK + 0.09);
        this.room.add(boardFrame, board, tray);

        // Wall clock.
        const clock = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.2, 0.04, 24), lambert(0xffffff));
        clock.rotation.x = Math.PI / 2;
        clock.position.set(1.5, 2.45, BACK + 0.03);
        const rim = new THREE.Mesh(new THREE.TorusGeometry(0.2, 0.025, 8, 24), lambert(0x1f2937));
        rim.position.set(1.5, 2.45, BACK + 0.05);
        this.room.add(clock, rim);

        // Electrical conduit along the top of the left wall, with a junction box.
        const conduit = box(0.05, 0.05, ROOM_DEPTH - 0.6, 0x94a3b8);
        conduit.position.set(LEFT + 0.04, 2.78, 0);
        const junction = box(0.12, 0.2, 0.2, 0x64748b);
        junction.position.set(LEFT + 0.07, 2.74, 0.2);
        this.room.add(conduit, junction);

        // Door frame and handle.
        for (const [height, depth, y, z] of [
            [2.12, 0.1, 1.06, 1.05],
            [2.12, 0.1, 1.06, 2.15],
            [0.1, 1.2, 2.07, 1.6],
        ] as [number, number, number, number][]) {
            const bar = box(0.1, height, depth, 0x5b3716);
            bar.position.set(LEFT + 0.06, y, z);
            this.room.add(bar);
        }
        const handle = new THREE.Mesh(new THREE.SphereGeometry(0.05, 10, 8), lambert(0xfacc15));
        handle.position.set(LEFT + 0.13, 1.0, 1.25);
        this.room.add(handle);
    }

    private makeDesk(x: number, z: number, width: number): THREE.Group {
        const desk = pickable(new THREE.Group(), 'desk');
        const top = box(width, 0.07, 0.65, 0xb7791f);
        top.position.y = 0.78;
        desk.add(top);
        for (const dx of [-width / 2 + 0.06, width / 2 - 0.06]) {
            for (const dz of [-0.27, 0.27]) {
                const leg = box(0.06, 0.75, 0.06, 0x475569);
                leg.position.set(dx, 0.375, dz);
                desk.add(leg);
            }
        }
        // Student desks have a chair tucked behind them; the teacher's table does not.
        if (width < 1.2) {
            const seat = box(0.42, 0.05, 0.4, 0x0ea5e9);
            seat.position.set(0, 0.45, 0.62);
            const backrest = box(0.42, 0.42, 0.05, 0x0ea5e9);
            backrest.position.set(0, 0.7, 0.82);
            desk.add(seat, backrest);
            for (const dx of [-0.17, 0.17]) {
                for (const dz of [0.46, 0.8]) {
                    const leg = box(0.04, 0.45, 0.04, 0x475569);
                    leg.position.set(dx, 0.225, dz);
                    desk.add(leg);
                }
            }
        }
        desk.position.set(x, 0, z);

        return desk;
    }

    /** A simple figure. Seated figures have their legs out in front of them. */
    private makePerson(shirt: number, seated = false): THREE.Group {
        const person = new THREE.Group();
        const skin = lambert(0xf1c9a5);
        const trousers = lambert(0x1e3a8a);
        const top = lambert(shirt);
        const hip = seated ? 0.12 : 0.52;

        for (const side of [-1, 1]) {
            const leg = new THREE.Mesh(new THREE.BoxGeometry(0.13, 0.5, 0.15), trousers);
            const shoe = new THREE.Mesh(new THREE.BoxGeometry(0.13, 0.08, 0.22), lambert(0x111827));
            if (seated) {
                leg.rotation.x = Math.PI / 2;
                leg.position.set(side * 0.09, 0.09, 0.3);
                shoe.position.set(side * 0.09, 0.11, 0.58);
                shoe.rotation.x = Math.PI / 2;
            } else {
                leg.position.set(side * 0.09, 0.27, 0);
                shoe.position.set(side * 0.09, 0.04, 0.04);
            }
            person.add(leg, shoe);

            const arm = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.42, 0.12), top);
            arm.position.set(side * 0.24, hip + 0.3, 0);
            arm.rotation.z = side * 0.12;
            const hand = new THREE.Mesh(new THREE.SphereGeometry(0.055, 8, 6), skin);
            hand.position.set(side * 0.27, hip + 0.06, 0);
            person.add(arm, hand);
        }

        const body = new THREE.Mesh(new THREE.BoxGeometry(0.36, 0.5, 0.22), top);
        body.position.y = hip + 0.25;
        const neck = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 0.08, 8), skin);
        neck.position.y = hip + 0.54;
        const head = new THREE.Mesh(new THREE.SphereGeometry(0.16, 16, 12), skin);
        head.position.y = hip + 0.72;
        const hair = new THREE.Mesh(new THREE.SphereGeometry(0.168, 16, 12, 0, Math.PI * 2, 0, Math.PI * 0.55), lambert(0x1f2937));
        hair.position.y = hip + 0.73;
        person.add(body, neck, head, hair);

        return person;
    }

    private buildStudent(): void {
        this.student.add(this.makePerson(0xf8fafc));
        const marker = makeTextSprite('You', '#7c3aed', 0.26);
        marker.position.y = 1.65;
        this.student.add(marker);
        this.room.add(pickable(this.student, 'student'));
    }

    private buildAftermath(): void {
        // Jagged cracks running down the walls, with plaster knocked loose beneath them.
        const cracks: { x: number; z: number; size: number; left: boolean; seed: number }[] = [
            { x: -3.7, z: BACK, size: 2.0, left: false, seed: 11 },
            { x: 1.55, z: BACK, size: 1.7, left: false, seed: 29 },
            { x: LEFT, z: -0.9, size: 1.8, left: true, seed: 47 },
        ];
        const plaster = lambert(0xe7dfcd);
        for (const crack of cracks) {
            const decal = new THREE.Mesh(
                new THREE.PlaneGeometry(crack.size, crack.size),
                new THREE.MeshBasicMaterial({ map: crackTexture(crack.seed), transparent: true, depthWrite: false }),
            );
            if (crack.left) {
                decal.rotation.y = Math.PI / 2;
                decal.position.set(LEFT + 0.03, WALL_HEIGHT - crack.size / 2 - 0.05, crack.z);
            } else {
                decal.position.set(crack.x, WALL_HEIGHT - crack.size / 2 - 0.05, BACK + 0.03);
            }
            decal.renderOrder = 3;
            this.aftermathProps.add(decal);

            const random = seeded(crack.seed);
            for (let i = 0; i < 7; i++) {
                const chunk = new THREE.Mesh(new THREE.DodecahedronGeometry(0.04 + random() * 0.07, 0), plaster);
                const along = (random() - 0.5) * 1.1;
                const out = 0.2 + random() * 0.5;
                chunk.position.set(crack.left ? LEFT + out : crack.x + along, 0.04, crack.left ? crack.z + along : BACK + out);
                chunk.rotation.set(random() * 3, random() * 3, random() * 3);
                this.aftermathProps.add(chunk);
            }
        }

        // A classmate sitting on the floor, hurt and holding their arm.
        const classmate = this.makePerson(0xfbbf24, true);
        classmate.position.set(-2.6, 0, 2.3);
        classmate.rotation.y = 0.7;
        const help = makeTextSprite('Hurt classmate', '#b91c1c', 0.26);
        help.position.set(-2.6, 1.25, 2.3);
        this.aftermathProps.add(classmate, help);

        // A live cable torn out of the junction box, drooping to the floor and sparking.
        const tip = new THREE.Vector3(LEFT + 1.42, 0.17, 0.74);
        const cable = new THREE.Mesh(
            new THREE.TubeGeometry(
                new THREE.CatmullRomCurve3([
                    new THREE.Vector3(LEFT + 0.14, 2.66, 0.2),
                    new THREE.Vector3(LEFT + 0.3, 2.2, 0.28),
                    new THREE.Vector3(LEFT + 0.62, 1.25, 0.42),
                    new THREE.Vector3(LEFT + 0.95, 0.42, 0.55),
                    new THREE.Vector3(LEFT + 1.2, 0.05, 0.7),
                    new THREE.Vector3(LEFT + 1.5, 0.04, 0.9),
                    new THREE.Vector3(LEFT + 1.68, 0.04, 0.66),
                    new THREE.Vector3(LEFT + 1.48, 0.04, 0.48),
                    new THREE.Vector3(LEFT + 1.3, 0.06, 0.6),
                    tip,
                ]),
                90,
                0.022,
                8,
            ),
            lambert(0x1f2937),
        );
        const copper = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.012, 0.09, 6), lambert(0xd97706));
        copper.position.copy(tip).add(new THREE.Vector3(0.03, 0.04, 0.04));
        copper.rotation.z = -0.6;
        const stub = new THREE.Mesh(new THREE.CylinderGeometry(0.022, 0.022, 0.3, 8), lambert(0x1f2937));
        stub.position.set(LEFT + 0.12, 2.5, 0.05);
        stub.rotation.x = 0.35;
        const scorch = new THREE.Mesh(new THREE.CircleGeometry(0.34, 20), new THREE.MeshBasicMaterial({ color: 0x1c1917, transparent: true, opacity: 0.5 }));
        scorch.rotation.x = -Math.PI / 2;
        scorch.position.set(tip.x, 0.012, tip.z);

        this.spark.position.copy(tip).add(new THREE.Vector3(0.05, 0.08, 0.06));
        this.sparks.position.copy(this.spark.position);
        for (let i = 0; i < 7; i++) {
            const fleck = new THREE.Mesh(new THREE.TetrahedronGeometry(0.03), new THREE.MeshBasicMaterial({ color: i % 2 === 0 ? 0xfde047 : 0x7dd3fc }));
            this.sparks.add(fleck);
        }

        const danger = makeTextSprite('Live wire down', '#b91c1c', 0.26);
        danger.position.set(tip.x + 0.1, 0.85, tip.z);
        this.aftermathProps.add(cable, copper, stub, scorch, this.spark, this.sparks, danger);

        this.aftermathProps.visible = false;
        this.room.add(this.aftermathProps);
    }
}
