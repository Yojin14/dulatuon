import { addDaylight, disposeObject, makeCloud } from '@/lib/sim-models';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';

export interface StageOptions {
    /** Direction from the orbit target to the camera. */
    direction: [number, number, number];
    /** Camera distance on a wide screen. */
    distance: number;
    /** Aspect ratio below which the camera pulls back to keep the scene in view. */
    fitAspect: number;
    /** Allowed polar (up/down) angles in degrees. */
    polar: [number, number];
    /** Allowed azimuth (left/right) angles in degrees. */
    azimuth: [number, number];
    clouds?: boolean;
}

/** A rounded text label that always faces the camera. */
export function makeTextSprite(text: string, background: string, worldHeight: number): THREE.Sprite {
    const canvas = document.createElement('canvas');
    const texture = new THREE.CanvasTexture(canvas);
    texture.colorSpace = THREE.SRGBColorSpace;
    const sprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: texture, depthTest: false, transparent: true }));
    sprite.renderOrder = 20;
    sprite.userData.worldHeight = worldHeight;
    setSpriteText(sprite, text, background);

    return sprite;
}

export function setSpriteText(sprite: THREE.Sprite, text: string, background: string): void {
    const texture = (sprite.material as THREE.SpriteMaterial).map as THREE.CanvasTexture;
    const canvas = texture.image as HTMLCanvasElement;
    const height = 72;
    const font = 'bold 40px system-ui, sans-serif';
    const measure = canvas.getContext('2d');
    if (!measure) {
        return;
    }
    measure.font = font;
    const width = Math.ceil(measure.measureText(text).width) + 44;
    canvas.width = width;
    canvas.height = height;

    const context = canvas.getContext('2d');
    if (!context) {
        return;
    }
    context.fillStyle = background;
    context.beginPath();
    context.roundRect(2, 2, width - 4, height - 4, height / 2.4);
    context.fill();
    context.fillStyle = '#ffffff';
    context.font = font;
    context.textAlign = 'center';
    context.textBaseline = 'middle';
    context.fillText(text, width / 2, height / 2 + 2);

    // Resizing a canvas invalidates the uploaded texture, so start a fresh one.
    texture.dispose();
    texture.needsUpdate = true;
    const worldHeight = sprite.userData.worldHeight as number;
    sprite.scale.set((worldHeight * width) / height, worldHeight, 1);
}

/**
 * Shared three.js plumbing for the simulation games: renderer, daylight,
 * orbit camera, resize handling, click picking and the animation loop.
 * Subclasses build their scene in the constructor and then call `start()`.
 */
export abstract class SimStage {
    protected readonly renderer: THREE.WebGLRenderer;

    protected readonly scene = new THREE.Scene();

    protected readonly camera = new THREE.PerspectiveCamera(34, 1, 0.1, 100);

    protected readonly controls: OrbitControls;

    /** Everything that should jolt when the ground shakes goes in here. */
    protected readonly world = new THREE.Group();

    private readonly clouds = new THREE.Group();

    private readonly resizeObserver: ResizeObserver;

    private readonly raycaster = new THREE.Raycaster();

    private pickTargets: (() => THREE.Object3D[]) | null = null;

    private onPick: ((id: string, object: THREE.Object3D) => void) | null = null;

    private pointerDown: { x: number; y: number } | null = null;

    private lastFrameAt = performance.now();

    private elapsed = 0;

    private frame = 0;

    private disposed = false;

    constructor(
        protected readonly container: HTMLElement,
        private readonly options: StageOptions,
    ) {
        this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
        this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        this.renderer.localClippingEnabled = true;
        this.renderer.domElement.style.display = 'block';
        this.renderer.domElement.style.touchAction = 'none';
        container.appendChild(this.renderer.domElement);

        addDaylight(this.scene, this.renderer);
        this.scene.add(this.world);

        if (options.clouds !== false) {
            for (let i = 0; i < 3; i++) {
                const cloud = makeCloud(i);
                cloud.position.set(-7 + i * 6.5, 5.6 + (i % 2) * 0.7, -6 - i);
                this.clouds.add(cloud);
            }
            this.scene.add(this.clouds);
        }

        this.controls = new OrbitControls(this.camera, this.renderer.domElement);
        this.controls.enablePan = false;
        this.controls.enableDamping = true;
        this.controls.minPolarAngle = THREE.MathUtils.degToRad(options.polar[0]);
        this.controls.maxPolarAngle = THREE.MathUtils.degToRad(options.polar[1]);
        this.controls.minAzimuthAngle = THREE.MathUtils.degToRad(options.azimuth[0]);
        this.controls.maxAzimuthAngle = THREE.MathUtils.degToRad(options.azimuth[1]);

        this.renderer.domElement.addEventListener('pointerdown', this.handlePointerDown);
        this.renderer.domElement.addEventListener('pointerup', this.handlePointerUp);

        this.resizeObserver = new ResizeObserver(() => this.resize());
        this.resizeObserver.observe(container);
    }

    dispose(): void {
        this.disposed = true;
        cancelAnimationFrame(this.frame);
        this.resizeObserver.disconnect();
        this.renderer.domElement.removeEventListener('pointerdown', this.handlePointerDown);
        this.renderer.domElement.removeEventListener('pointerup', this.handlePointerUp);
        this.controls.dispose();
        disposeObject(this.scene);
        this.renderer.dispose();
        this.renderer.domElement.remove();
    }

    /** Advance the simulation by `delta` seconds. */
    protected abstract update(delta: number, elapsed: number): void;

    protected start(): void {
        this.resize();
        this.frame = requestAnimationFrame(this.tick);
    }

    /**
     * Report taps on objects. Any object (or its ancestor) carrying
     * `userData.pickId` is pickable; a drag to orbit does not count as a tap.
     */
    protected enablePicking(targets: () => THREE.Object3D[], onPick: (id: string, object: THREE.Object3D) => void): void {
        this.pickTargets = targets;
        this.onPick = onPick;
    }

    private readonly handlePointerDown = (event: PointerEvent): void => {
        this.pointerDown = { x: event.clientX, y: event.clientY };
    };

    private readonly handlePointerUp = (event: PointerEvent): void => {
        const start = this.pointerDown;
        this.pointerDown = null;
        if (!start || !this.pickTargets || !this.onPick || Math.hypot(event.clientX - start.x, event.clientY - start.y) > 8) {
            return;
        }

        const bounds = this.renderer.domElement.getBoundingClientRect();
        const pointer = new THREE.Vector2(
            ((event.clientX - bounds.left) / bounds.width) * 2 - 1,
            -((event.clientY - bounds.top) / bounds.height) * 2 + 1,
        );
        this.raycaster.setFromCamera(pointer, this.camera);

        for (const hit of this.raycaster.intersectObjects(this.pickTargets(), true)) {
            let object: THREE.Object3D | null = hit.object;
            while (object) {
                if (typeof object.userData.pickId === 'string' && object.visible) {
                    this.onPick(object.userData.pickId, object);

                    return;
                }
                object = object.parent;
            }
        }
    };

    private readonly tick = (): void => {
        if (this.disposed) {
            return;
        }
        this.frame = requestAnimationFrame(this.tick);

        const now = performance.now();
        const delta = Math.min((now - this.lastFrameAt) / 1000, 0.05);
        this.lastFrameAt = now;
        this.elapsed += delta;

        this.update(delta, this.elapsed);

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

        // Pull the camera back on narrow screens so the whole scene stays in view.
        const distance = this.options.distance * Math.max(1, this.options.fitAspect / this.camera.aspect);
        const direction = this.camera.position.lengthSq() > 0
            ? this.camera.position.clone().sub(this.controls.target).normalize()
            : new THREE.Vector3(...this.options.direction).normalize();
        this.camera.position.copy(this.controls.target).addScaledVector(direction, distance);
        this.controls.minDistance = distance * 0.55;
        this.controls.maxDistance = distance * 1.3;
    }
}
