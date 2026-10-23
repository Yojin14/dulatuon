import { enableShadows, makeBuilding, makeCar, makeHouse, makeLamp, makePerson, makeTree, type PersonRig } from '@/lib/sim-models';
import { SimStage, makeTextSprite } from '@/lib/sim-stage';
import * as THREE from 'three';

const WIDTH = 9;
const DEPTH = 5.2;
const STRATA = [
    { height: 0.9, colour: 0xc99a6b },
    { height: 0.8, colour: 0xa3623f },
    { height: 0.7, colour: 0x6f3b2a },
];
const QUAKE_EVERY = 7;
const SHAKE_FOR = 1.4;
/** People keep running for a moment after the ground settles. */
const PANIC_FOR = 3.2;
const EPICENTRE_X = -1.5;
const TOWN_EDGE = 4.1;

type Reaction = 'panic' | 'cover';

interface Townsperson {
    rig: PersonRig;
    homeX: number;
    baseZ: number;
    dir: 1 | -1;
    stroll: number;
    seed: number;
    reaction: Reaction;
    alert: THREE.Sprite | null;
}

/** Where everyone stands: [x, z, shirt colour, strolling speed (0 = standing), reaction]. */
const PEOPLE: [number, number, number, number, Reaction][] = [
    [-3.8, 0.62, 0xf59e0b, 0.16, 'panic'],
    [-2.5, 0.72, 0x10b981, 0, 'panic'],
    [-1.9, 0.58, 0xec4899, 0.12, 'cover'],
    [-0.6, 0.7, 0x6366f1, 0.18, 'panic'],
    [0.4, 0.6, 0xef4444, 0, 'panic'],
    [1.1, 0.74, 0x0ea5e9, 0.14, 'panic'],
    [2.4, 0.6, 0xa855f7, 0, 'cover'],
    [3.6, 0.7, 0x84cc16, 0.15, 'panic'],
    [-0.5, -0.78, 0xf97316, 0.1, 'panic'],
    [0.75, -0.72, 0x14b8a6, 0, 'panic'],
];

/**
 * Landing-page diorama built from the same low-poly props and stage as the
 * simulation games: a crust block with strata, a small town and a gentle
 * periodic tremor with a seismic ripple from the focus.
 */
export class HeroWorldScene extends SimStage {
    private readonly ring: THREE.Mesh;

    private readonly focus: THREE.Mesh;

    private readonly town = new THREE.Group();

    private readonly cars: THREE.Group[] = [];

    private readonly people: Townsperson[] = [];

    private wasPanicking = false;

    constructor(container: HTMLElement) {
        super(container, { direction: [0.55, 0.42, 0.72], distance: 17, fitAspect: 1.5, polar: [40, 78], azimuth: [-50, 50] });
        const touch = window.matchMedia('(pointer: coarse)').matches;
        // Phones: lighter rendering, and the page keeps scrolling when a finger lands on the scene.
        this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, touch ? 1.25 : 1.5));
        this.controls.target.set(0, -0.6, 0);
        this.controls.enableZoom = false;
        this.controls.autoRotate = true;
        this.controls.autoRotateSpeed = touch ? 0.7 : 0.45;
        if (touch) {
            this.controls.enableRotate = false;
            this.renderer.domElement.style.touchAction = 'pan-y';
        }

        let top = 0;
        for (const layer of STRATA) {
            const slab = new THREE.Mesh(new THREE.BoxGeometry(WIDTH, layer.height, DEPTH), new THREE.MeshLambertMaterial({ color: layer.colour }));
            slab.position.y = top - layer.height / 2;
            slab.receiveShadow = true;
            this.world.add(slab);
            top -= layer.height;
        }

        const grass = new THREE.Mesh(new THREE.BoxGeometry(WIDTH, 0.1, DEPTH), new THREE.MeshLambertMaterial({ color: 0x6fbf5a }));
        grass.position.y = 0.05;
        grass.receiveShadow = true;
        this.world.add(grass);

        const road = new THREE.Mesh(new THREE.BoxGeometry(WIDTH, 0.02, 0.7), new THREE.MeshLambertMaterial({ color: 0x475569 }));
        road.position.set(0, 0.11, 1.2);
        road.receiveShadow = true;
        this.world.add(road);
        const stripe = new THREE.Mesh(new THREE.BoxGeometry(WIDTH, 0.005, 0.05), new THREE.MeshBasicMaterial({ color: 0xfde68a }));
        stripe.position.set(0, 0.125, 1.2);
        this.world.add(stripe);

        const roofs = [0xe5604d, 0x3b82c4, 0xd9912b, 0x7c5cc4];
        [-3.2, -1.4, 1.6, 3.3].forEach((x, i) => {
            const house = makeHouse(roofs[i]);
            house.position.set(x, 0.1, 0.1 - (i % 2) * 0.6);
            house.rotation.y = (i % 2 ? -1 : 1) * 0.12;
            this.town.add(house);
        });

        const tower = makeBuilding(0.6, 1.5, '#dbe7f5', 3);
        tower.object.position.set(0.1, 0.1, -1.3);
        this.town.add(tower.object);
        const school = makeBuilding(0.85, 0.7, '#f3dfa6', 7);
        school.object.position.set(-0.9, 0.1, -1.6);
        this.town.add(school.object);

        for (let i = 0; i < 9; i++) {
            const tree = makeTree(i);
            tree.position.set(-4 + i * 1.0 + (i % 3) * 0.15, 0.1, -2 + ((i * 7) % 5) * 0.12);
            this.town.add(tree);
        }
        for (let i = 0; i < 3; i++) {
            const lamp = makeLamp();
            lamp.position.set(-3 + i * 3, 0.1, 1.7);
            this.town.add(lamp);
        }
        [0xef4444, 0x3b82f6].forEach((colour, i) => {
            const car = makeCar(colour);
            car.position.set(-3 + i * 4, 0.12, 1.05 + i * 0.3);
            car.rotation.y = i ? Math.PI / 2 : -Math.PI / 2;
            this.cars.push(car);
            this.town.add(car);
        });
        PEOPLE.forEach(([x, z, shirt, stroll, reaction], i) => {
            const rig = makePerson(shirt, i);
            rig.root.position.set(x, 0.1, z);
            const dir = i % 2 ? -1 : 1;
            rig.root.rotation.y = stroll ? (dir * Math.PI) / 2 : (i % 3) * 0.6;
            this.town.add(rig.root);

            let alert: THREE.Sprite | null = null;
            if (reaction === 'panic' && i % 2 === 0) {
                alert = makeTextSprite('!', '#dc2626', 0.22);
                alert.position.set(0, 0.42, 0);
                alert.visible = false;
                rig.root.add(alert);
            }
            this.people.push({ rig, homeX: x, baseZ: z, dir, stroll, seed: i * 1.7, reaction, alert });
        });

        enableShadows(this.town);
        this.world.add(this.town);

        this.focus = new THREE.Mesh(new THREE.SphereGeometry(0.16, 16, 12), new THREE.MeshBasicMaterial({ color: 0xfff1a8 }));
        this.focus.position.set(-1.5, -1.2, DEPTH / 2 + 0.01);
        this.world.add(this.focus);

        this.ring = new THREE.Mesh(
            new THREE.RingGeometry(0.9, 1, 48),
            new THREE.MeshBasicMaterial({ color: 0xfde68a, transparent: true, opacity: 0, side: THREE.DoubleSide, depthWrite: false }),
        );
        this.ring.position.copy(this.focus.position).setZ(DEPTH / 2 + 0.02);
        this.world.add(this.ring);

        const label = makeTextSprite('M 6.0 · 10 km deep', '#7c3aed', 0.32);
        label.position.set(-0.2, -1.2, DEPTH / 2 + 0.05);
        this.world.add(label);

        const townLabel = makeTextSprite('Your town', '#0f172a', 0.36);
        townLabel.position.set(0.1, 2.15, -1.3);
        this.world.add(townLabel);

        this.start();
    }

    protected update(delta: number, elapsed: number): void {
        for (const [i, car] of this.cars.entries()) {
            const dir = i ? -1 : 1;
            car.position.x += dir * delta * 0.6;
            if (car.position.x > WIDTH / 2 - 0.3) {
                car.position.x = -WIDTH / 2 + 0.3;
            } else if (car.position.x < -WIDTH / 2 + 0.3) {
                car.position.x = WIDTH / 2 - 0.3;
            }
        }

        const phase = elapsed % QUAKE_EVERY;
        const shaking = phase < SHAKE_FOR;
        const strength = shaking ? Math.sin((phase / SHAKE_FOR) * Math.PI) * 0.045 : 0;
        this.updatePeople(delta, elapsed, phase);
        this.town.position.x = strength * Math.sin(elapsed * 55);
        this.town.position.z = strength * Math.cos(elapsed * 47) * 0.6;

        const material = this.ring.material as THREE.MeshBasicMaterial;
        if (phase < 2) {
            const t = phase / 2;
            this.ring.scale.setScalar(0.2 + t * 3.2);
            material.opacity = (1 - t) * 0.85;
        } else {
            material.opacity = 0;
        }
        this.focus.scale.setScalar(1 + Math.sin(elapsed * 4) * 0.12);
    }

    /**
     * Calm town life between quakes; when the ground shakes most people panic and
     * run from the epicentre with their arms up, while a couple drop, cover and hold.
     */
    private updatePeople(delta: number, elapsed: number, phase: number): void {
        const panicking = phase < PANIC_FOR;
        const justStarted = panicking && !this.wasPanicking;
        this.wasPanicking = panicking;
        // Ease out of the panic over the last second.
        const fear = panicking ? Math.min(1, (PANIC_FOR - phase) / 1) : 0;

        for (const person of this.people) {
            const { rig } = person;
            const t = elapsed + person.seed;
            const ease = 1 - Math.exp(-delta * 10);

            if (justStarted && person.reaction === 'panic') {
                person.dir = rig.root.position.x >= EPICENTRE_X ? 1 : -1;
            }

            let speed = person.stroll;
            let stride = person.stroll ? 7 : 0;
            let swing = person.stroll ? 0.45 : 0;
            let armRaise = 0;
            let crouch = 0;
            let hop = 0;

            if (fear > 0 && person.reaction === 'panic') {
                speed = 0.35 + 0.9 * fear;
                stride = 19;
                swing = 0.9 * fear + swing * (1 - fear);
                armRaise = fear;
                hop = Math.abs(Math.sin(t * stride)) * 0.03 * fear;
                rig.root.position.z = person.baseZ + Math.sin(t * 5) * 0.07 * fear;
            } else if (fear > 0) {
                speed = 0;
                crouch = fear;
            } else {
                rig.root.position.z += (person.baseZ - rig.root.position.z) * ease;
                // People who were standing still wander back to their spot.
                const away = person.homeX - rig.root.position.x;
                if (!person.stroll && Math.abs(away) > 0.04) {
                    person.dir = away > 0 ? 1 : -1;
                    speed = Math.min(0.22, Math.abs(away) * 4);
                    stride = 7;
                    swing = 0.45;
                }
            }

            if (speed > 0) {
                rig.root.position.x += person.dir * speed * delta;
                if (Math.abs(rig.root.position.x) > TOWN_EDGE) {
                    rig.root.position.x = Math.sign(rig.root.position.x) * TOWN_EDGE;
                    person.dir = person.dir === 1 ? -1 : 1;
                }
                const facing = (person.dir * Math.PI) / 2;
                rig.root.rotation.y += (facing - rig.root.rotation.y) * ease;
            }

            const legSwing = Math.sin(t * stride) * swing;
            rig.leftLeg.rotation.x = legSwing * (1 - crouch) - 1.3 * crouch;
            rig.rightLeg.rotation.x = -legSwing * (1 - crouch) - 1.3 * crouch;

            // Arms: swing while walking, wave overhead in panic, cover the head when ducking.
            const flail = Math.sin(t * 24) * 0.35;
            const overhead = Math.PI * 0.92;
            rig.leftArm.rotation.x = -legSwing * (1 - armRaise) * (1 - crouch) - 2.6 * crouch;
            rig.rightArm.rotation.x = legSwing * (1 - armRaise) * (1 - crouch) - 2.6 * crouch;
            rig.leftArm.rotation.z = -(overhead + flail) * armRaise;
            rig.rightArm.rotation.z = (overhead - flail) * armRaise;

            rig.body.position.y = hop - 0.07 * crouch;
            rig.body.rotation.x = 0.35 * crouch + 0.12 * armRaise;

            if (person.alert) {
                person.alert.visible = fear > 0.15;
                person.alert.position.y = 0.42 + Math.abs(Math.sin(t * 9)) * 0.05;
            }
        }
    }
}
