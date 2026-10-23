import * as THREE from 'three';

/**
 * Low-poly props shared by the 3D simulation games. Everything is built from
 * primitives in code, so there are no model or texture files to download.
 */

function lambert(colour: number, flat = false): THREE.MeshLambertMaterial {
    return new THREE.MeshLambertMaterial({ color: colour, flatShading: flat });
}

function box(width: number, height: number, depth: number, material: THREE.Material): THREE.Mesh {
    return new THREE.Mesh(new THREE.BoxGeometry(width, height, depth), material);
}

/** Let every mesh in a prop cast and receive shadows. */
export function enableShadows(root: THREE.Object3D): void {
    root.traverse((object) => {
        if ((object as THREE.Mesh).isMesh) {
            object.castShadow = true;
            object.receiveShadow = true;
        }
    });
}

/** Free the GPU resources held by a subtree. */
export function disposeObject(root: THREE.Object3D): void {
    root.traverse((object) => {
        const mesh = object as THREE.Mesh;
        mesh.geometry?.dispose();
        const material = mesh.material as THREE.Material | THREE.Material[] | undefined;
        for (const entry of Array.isArray(material) ? material : material ? [material] : []) {
            (entry as THREE.MeshLambertMaterial).map?.dispose();
            entry.dispose();
        }
    });
}

/** Soft daylight with one shadow-casting sun, sized to cover a crust block. */
export function addDaylight(scene: THREE.Scene, renderer: THREE.WebGLRenderer): void {
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    scene.add(new THREE.HemisphereLight(0xffffff, 0x9a7b5c, 1.35));

    const sun = new THREE.DirectionalLight(0xfff4e0, 1.9);
    sun.position.set(6, 11, 7);
    sun.castShadow = true;
    sun.shadow.mapSize.set(1024, 1024);
    sun.shadow.camera.left = -9;
    sun.shadow.camera.right = 9;
    sun.shadow.camera.top = 9;
    sun.shadow.camera.bottom = -9;
    sun.shadow.camera.near = 1;
    sun.shadow.camera.far = 30;
    sun.shadow.bias = -0.0004;
    sun.shadow.normalBias = 0.03;
    scene.add(sun);
}

function gable(width: number, height: number, depth: number, material: THREE.Material): THREE.Mesh {
    const shape = new THREE.Shape();
    shape.moveTo(-width / 2, 0);
    shape.lineTo(width / 2, 0);
    shape.lineTo(0, height);
    shape.closePath();
    const geometry = new THREE.ExtrudeGeometry(shape, { depth, bevelEnabled: false });
    geometry.translate(0, 0, -depth / 2);

    return new THREE.Mesh(geometry, material);
}

/** A small house with a gabled roof, door, windows and chimney. Faces +Z. */
export function makeHouse(roofColour: number, wallColour = 0xfff7ed): THREE.Group {
    const house = new THREE.Group();
    const width = 0.64;
    const height = 0.4;
    const depth = 0.54;

    const walls = box(width, height, depth, lambert(wallColour));
    walls.position.y = height / 2;

    const roofMaterial = lambert(roofColour);
    const roof = gable(width + 0.14, 0.3, depth + 0.12, roofMaterial);
    roof.position.y = height;

    const chimney = box(0.09, 0.22, 0.09, lambert(0x9a5b47));
    chimney.position.set(width * 0.24, height + 0.2, -depth * 0.12);

    const door = box(0.12, 0.2, 0.02, lambert(0x7c4a21));
    door.position.set(-0.12, 0.1, depth / 2 + 0.005);

    const glass = lambert(0x7dd3fc);
    const frontWindow = box(0.14, 0.12, 0.02, glass);
    frontWindow.position.set(0.14, 0.22, depth / 2 + 0.005);
    const sideWindow = box(0.02, 0.12, 0.16, glass);
    sideWindow.position.set(width / 2 + 0.005, 0.22, 0);
    const otherSideWindow = sideWindow.clone();
    otherSideWindow.position.x = -width / 2 - 0.005;

    house.add(walls, roof, chimney, door, frontWindow, sideWindow, otherSideWindow);
    enableShadows(house);

    return house;
}

/** A tree in one of two styles: a layered pine or a round broadleaf. */
export function makeTree(variant: number): THREE.Group {
    const tree = new THREE.Group();
    const scale = 0.85 + ((variant * 37) % 10) / 30;
    const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.07, 0.32, 6), lambert(0x7c4a21));
    trunk.position.y = 0.16;
    tree.add(trunk);

    if (variant % 2 === 0) {
        const greens = [0x2f8f46, 0x38a352, 0x46b860];
        greens.forEach((green, i) => {
            const layer = new THREE.Mesh(new THREE.ConeGeometry(0.28 - i * 0.065, 0.34, 7), lambert(green, true));
            layer.position.y = 0.42 + i * 0.2;
            tree.add(layer);
        });
    } else {
        const crown = lambert(0x4caf50, true);
        const blobs: [number, number, number, number][] = [
            [0, 0.5, 0, 0.24],
            [0.14, 0.42, 0.05, 0.16],
            [-0.13, 0.44, -0.04, 0.17],
            [0.02, 0.66, 0.02, 0.15],
        ];
        for (const [x, y, z, radius] of blobs) {
            const blob = new THREE.Mesh(new THREE.IcosahedronGeometry(radius, 0), crown);
            blob.position.set(x, y, z);
            tree.add(blob);
        }
    }

    tree.scale.setScalar(scale);
    tree.rotation.y = variant * 1.7;
    enableShadows(tree);

    return tree;
}

/** A parked car, pointing along the X axis. */
export function makeCar(colour: number): THREE.Group {
    const car = new THREE.Group();
    const body = box(0.36, 0.09, 0.17, lambert(colour));
    body.position.y = 0.085;
    const cabin = box(0.19, 0.08, 0.15, lambert(0xcfe8f7));
    cabin.position.set(-0.02, 0.17, 0);
    car.add(body, cabin);

    const tyre = lambert(0x1f2937);
    for (const x of [-0.11, 0.11]) {
        for (const z of [-0.085, 0.085]) {
            const wheel = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 0.03, 10), tyre);
            wheel.rotation.x = Math.PI / 2;
            wheel.position.set(x, 0.04, z);
            car.add(wheel);
        }
    }
    enableShadows(car);

    return car;
}

/** Jointed parts of a person, so scenes can animate walking, running and panic. */
export interface PersonRig {
    root: THREE.Group;
    body: THREE.Group;
    leftArm: THREE.Group;
    rightArm: THREE.Group;
    leftLeg: THREE.Group;
    rightLeg: THREE.Group;
}

const SKIN_TONES = [0xf1c27d, 0xc68642, 0x8d5524, 0xe0ac69];
const HAIR_COLOURS = [0x1f2937, 0x3f2a1d, 0x111827, 0x6b4423];

/**
 * A blocky townsperson about half a house tall, facing +Z. Arms and legs hang
 * from pivot groups at the shoulders and hips.
 */
export function makePerson(shirtColour: number, variant: number): PersonRig {
    const root = new THREE.Group();
    const body = new THREE.Group();
    root.add(body);

    const skin = lambert(SKIN_TONES[variant % SKIN_TONES.length]);
    const shirt = lambert(shirtColour);
    const trousers = lambert(variant % 2 ? 0x334155 : 0x1e3a8a);

    const limb = (width: number, length: number, material: THREE.Material, x: number, y: number): THREE.Group => {
        const pivot = new THREE.Group();
        pivot.position.set(x, y, 0);
        const mesh = box(width, length, width, material);
        mesh.position.y = -length / 2;
        pivot.add(mesh);
        body.add(pivot);
        return pivot;
    };

    const leftLeg = limb(0.035, 0.09, trousers, -0.022, 0.09);
    const rightLeg = limb(0.035, 0.09, trousers, 0.022, 0.09);

    const torso = box(0.085, 0.085, 0.05, shirt);
    torso.position.y = 0.132;
    body.add(torso);

    const leftArm = limb(0.026, 0.08, shirt, -0.057, 0.17);
    const rightArm = limb(0.026, 0.08, shirt, 0.057, 0.17);
    for (const arm of [leftArm, rightArm]) {
        const hand = box(0.026, 0.02, 0.026, skin);
        hand.position.y = -0.088;
        arm.add(hand);
    }

    const head = box(0.065, 0.065, 0.065, skin);
    head.position.y = 0.21;
    const hair = box(0.07, 0.022, 0.07, lambert(HAIR_COLOURS[variant % HAIR_COLOURS.length]));
    hair.position.y = 0.25;
    body.add(head, hair);

    enableShadows(root);

    return { root, body, leftArm, rightArm, leftLeg, rightLeg };
}

/** A street lamp with a glowing head. */
export function makeLamp(): THREE.Group {
    const lamp = new THREE.Group();
    const post = new THREE.Mesh(new THREE.CylinderGeometry(0.015, 0.02, 0.5, 6), lambert(0x475569));
    post.position.y = 0.25;
    const head = new THREE.Mesh(
        new THREE.SphereGeometry(0.045, 10, 8),
        new THREE.MeshLambertMaterial({ color: 0xfff3b0, emissive: 0xfde68a, emissiveIntensity: 0.8 }),
    );
    head.position.y = 0.52;
    lamp.add(post, head);
    enableShadows(lamp);

    return lamp;
}

/** A clump of low-poly boulders. */
export function makeRocks(variant: number): THREE.Group {
    const rocks = new THREE.Group();
    const material = lambert(0x9ca3af, true);
    for (let i = 0; i < 3; i++) {
        const rock = new THREE.Mesh(new THREE.DodecahedronGeometry(0.07 + ((variant + i * 3) % 4) * 0.02, 0), material);
        rock.position.set((i - 1) * 0.13, 0.05, ((variant + i) % 3) * 0.06 - 0.06);
        rock.rotation.set(i, variant, i * 2);
        rocks.add(rock);
    }
    enableShadows(rocks);

    return rocks;
}

function windowTexture(columns: number, rows: number, wall: string, seed: number): THREE.CanvasTexture {
    const cell = 32;
    const canvas = document.createElement('canvas');
    canvas.width = columns * cell;
    canvas.height = rows * cell;
    const context = canvas.getContext('2d');
    if (context) {
        context.fillStyle = wall;
        context.fillRect(0, 0, canvas.width, canvas.height);
        for (let row = 0; row < rows; row++) {
            for (let column = 0; column < columns; column++) {
                // A cheap deterministic scatter of lit and unlit windows.
                const lit = (column * 7 + row * 13 + seed * 5) % 5 === 0;
                context.fillStyle = lit ? '#fde68a' : '#38bdf8';
                context.fillRect(column * cell + 7, row * cell + 6, cell - 14, cell - 13);
                context.fillStyle = 'rgba(255, 255, 255, 0.35)';
                context.fillRect(column * cell + 7, row * cell + 6, cell - 14, 4);
            }
        }
    }
    const texture = new THREE.CanvasTexture(canvas);
    texture.colorSpace = THREE.SRGBColorSpace;

    return texture;
}

/**
 * A flat-roofed building with rows of windows, its base at y = 0. The returned
 * materials are the ones to tint when the building is damaged.
 */
export function makeBuilding(
    width: number,
    height: number,
    wall: string,
    seed: number,
): { object: THREE.Group; materials: THREE.MeshLambertMaterial[] } {
    const building = new THREE.Group();
    const columns = Math.max(2, Math.round(width / 0.11));
    const rows = Math.max(2, Math.round(height / 0.13));
    const side = new THREE.MeshLambertMaterial({ map: windowTexture(columns, rows, wall, seed) });
    const cap = new THREE.MeshLambertMaterial({ color: new THREE.Color(wall).multiplyScalar(0.8) });

    const body = new THREE.Mesh(new THREE.BoxGeometry(width, height, width), [side, side, cap, cap, side, side]);
    body.position.y = height / 2;

    const parapet = box(width + 0.04, 0.035, width + 0.04, cap);
    parapet.position.y = height + 0.0175;

    const unit = box(width * 0.3, 0.07, width * 0.3, lambert(0x94a3b8));
    unit.position.set(width * 0.15, height + 0.07, -width * 0.12);

    building.add(body, parapet, unit);
    if (height > 0.8) {
        const mast = new THREE.Mesh(new THREE.CylinderGeometry(0.008, 0.008, 0.26, 5), lambert(0x475569));
        mast.position.set(-width * 0.25, height + 0.16, width * 0.2);
        building.add(mast);
    }
    enableShadows(building);

    return { object: building, materials: [side, cap] };
}

/** A puffy cloud made of a few flat-shaded blobs. */
export function makeCloud(variant: number): THREE.Group {
    const cloud = new THREE.Group();
    const material = new THREE.MeshLambertMaterial({ color: 0xffffff, emissive: 0xc3cedd, emissiveIntensity: 0.8, flatShading: true, transparent: true, opacity: 0.92 });
    const blobs: [number, number, number][] = [
        [0, 0, 0.5],
        [0.55, -0.05, 0.38],
        [-0.55, -0.06, 0.36],
        [0.2, 0.22, 0.34],
    ];
    for (const [x, y, radius] of blobs) {
        const blob = new THREE.Mesh(new THREE.IcosahedronGeometry(radius, 1), material);
        blob.position.set(x, y, 0);
        blob.scale.y = 0.7;
        cloud.add(blob);
    }
    cloud.scale.setScalar(0.9 + (variant % 3) * 0.25);

    return cloud;
}
