"use client";

import * as THREE from "three";
import type { FaceMask } from "@/domain/get-face";

export interface ReliefViewerOptions {
  rotationX?: number;
  rotationY?: number;
  minDistance?: number;
  maxDistance?: number;
  light?: string;
}

interface ReliefGeometry {
  front: THREE.BufferGeometry;
  back: THREE.BufferGeometry;
  edge: THREE.BufferGeometry;
  textureCanvases: { front: HTMLCanvasElement; side: HTMLCanvasElement; back: HTMLCanvasElement };
}

interface ViewerResources {
  geometry: ReliefGeometry;
  frontMaterial: THREE.MeshStandardMaterial;
  backMaterial: THREE.MeshStandardMaterial;
  edgeMaterial: THREE.MeshStandardMaterial;
  textures: THREE.CanvasTexture[];
}

const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(max, value));

const TILT_LIMIT = 0.72;
const DEFAULT_DISTANCE = 3.1;

/** A closed WebGL display mesh inferred from the supplied front/side/back art. */
export class MaskReliefViewer {
  private readonly host: HTMLElement;
  private readonly options: ReliefViewerOptions;
  private scene: THREE.Scene | null = null;
  private camera: THREE.PerspectiveCamera | null = null;
  private renderer: THREE.WebGLRenderer | null = null;
  private mesh: THREE.Group | null = null;
  private resizeObserver: ResizeObserver | null = null;
  private resizeListener: (() => void) | null = null;
  private listeners: Array<{ target: EventTarget; type: string; listener: EventListener; options?: AddEventListenerOptions }> = [];
  private frame = 0;
  private lastFrameTime = 0;
  private mountToken = 0;
  private reducedMotion = false;

  private dragging = false;
  private lastPointer = { x: 0, y: 0 };
  private lastMoveAt = 0;
  /** Rotation the user asked for; `current` eases toward it every frame. */
  private target = { x: 0, y: 0 };
  private current = { x: 0, y: 0 };
  /** Angular velocity (rad/ms) kept after release for inertia. */
  private velocity = { x: 0, y: 0 };
  private hovered = false;
  private hover = { x: 0, y: 0 };
  private hoverCurrent = { x: 0, y: 0 };
  private distance = DEFAULT_DISTANCE;
  private targetDistance = DEFAULT_DISTANCE;

  constructor(host: HTMLElement, options: ReliefViewerOptions = {}) {
    this.host = host;
    this.options = options;
    this.target = { x: options.rotationX ?? 0.14, y: options.rotationY ?? -0.3 };
    this.current = { ...this.target };
  }

  async mount(mask: FaceMask): Promise<void> {
    this.dispose();
    if (!this.host) throw new Error("3D viewer host unavailable");
    const token = ++this.mountToken;
    let sourceTextures: THREE.Texture[] = [];
    try {
      this.host.replaceChildren();
      this.reducedMotion = typeof window.matchMedia === "function" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      this.scene = new THREE.Scene();
      this.camera = new THREE.PerspectiveCamera(36, 1, 0.1, 20);
      this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: "low-power" });
      this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.75));
      this.renderer.outputColorSpace = THREE.SRGBColorSpace;
      this.renderer.domElement.tabIndex = 0;
      this.renderer.domElement.setAttribute("role", "img");
      this.renderer.domElement.setAttribute("aria-label", `${mask.name}傩面三维模型，按住拖拽旋转，滚轮缩放`);
      this.host.appendChild(this.renderer.domElement);

      const group = new THREE.Group();
      this.scene.add(group);
      this.mesh = group;

      sourceTextures = await Promise.all([
        new THREE.TextureLoader().loadAsync(mask.views.front),
        new THREE.TextureLoader().loadAsync(mask.views.side),
        new THREE.TextureLoader().loadAsync(mask.views.back)
      ]);
      if (token !== this.mountToken || !this.renderer) throw new Error("3D viewer mount cancelled");
      sourceTextures.forEach((texture) => { texture.colorSpace = THREE.SRGBColorSpace; });
      const relief = mask.visual?.relief ?? { depth: 0.3, resolution: 56, threshold: 24 };
      const geometry = this.makeGeometry(sourceTextures.map((texture) => texture.image as CanvasImageSource) as [CanvasImageSource, CanvasImageSource, CanvasImageSource], relief);
      sourceTextures.forEach((texture) => texture.dispose());
      sourceTextures = [];
      const textures = [geometry.textureCanvases.front, geometry.textureCanvases.side, geometry.textureCanvases.back].map((canvas) => {
        const texture = new THREE.CanvasTexture(canvas);
        texture.colorSpace = THREE.SRGBColorSpace;
        return texture;
      });
      const frontMaterial = new THREE.MeshStandardMaterial({ map: textures[0], transparent: true, alphaTest: 0.12, roughness: 0.68, metalness: 0.08, side: THREE.FrontSide });
      const edgeMaterial = new THREE.MeshStandardMaterial({ map: textures[1], transparent: true, alphaTest: 0.08, color: "#b78b60", roughness: 0.82, metalness: 0.05, side: THREE.DoubleSide });
      const backMaterial = new THREE.MeshStandardMaterial({ map: textures[2], transparent: true, alphaTest: 0.12, roughness: 0.88, metalness: 0.04, side: THREE.BackSide });
      group.add(new THREE.Mesh(geometry.front, frontMaterial), new THREE.Mesh(geometry.back, backMaterial), new THREE.Mesh(geometry.edge, edgeMaterial));
      group.userData.resources = { geometry, frontMaterial, backMaterial, edgeMaterial, textures } satisfies ViewerResources;

      this.scene.add(new THREE.HemisphereLight("#f7dfaa", "#120b07", 1.35));
      const key = new THREE.DirectionalLight(this.options.light ?? "#f0ce87", 2.6);
      key.position.set(2.2, 2.6, 3.8);
      this.scene.add(key);
      const rim = new THREE.PointLight("#9d3327", 1.25, 6);
      rim.position.set(-2.2, -0.8, -1.8);
      this.scene.add(rim);

      this.bindInput();
      if (typeof ResizeObserver !== "undefined") {
        this.resizeObserver = new ResizeObserver(() => this.resize());
        this.resizeObserver.observe(this.host);
      } else {
        this.resizeListener = () => this.resize();
        window.addEventListener("resize", this.resizeListener);
      }
      this.resize();
      this.lastFrameTime = performance.now();
      this.frame = requestAnimationFrame(this.tick);
    } catch (error) {
      sourceTextures.forEach((texture) => texture.dispose());
      this.dispose();
      throw error;
    }
  }

  reset(): void {
    this.target = { x: this.options.rotationX ?? 0.14, y: this.options.rotationY ?? -0.3 };
    this.velocity = { x: 0, y: 0 };
    this.targetDistance = DEFAULT_DISTANCE;
  }

  dispose(): void {
    this.mountToken += 1;
    cancelAnimationFrame(this.frame);
    this.frame = 0;
    this.dragging = false;
    this.hovered = false;
    for (const { target, type, listener, options } of this.listeners) target.removeEventListener(type, listener, options);
    this.listeners = [];
    this.resizeObserver?.disconnect();
    this.resizeObserver = null;
    if (this.resizeListener) window.removeEventListener("resize", this.resizeListener);
    this.resizeListener = null;
    const resources = this.mesh?.userData.resources as ViewerResources | undefined;
    if (resources) {
      resources.geometry.front.dispose();
      resources.geometry.back.dispose();
      resources.geometry.edge.dispose();
      resources.frontMaterial.dispose();
      resources.backMaterial.dispose();
      resources.edgeMaterial.dispose();
      resources.textures.forEach((texture) => texture.dispose());
    }
    if (this.renderer) {
      this.renderer.dispose();
      this.renderer.domElement.remove();
    }
    this.host.replaceChildren();
    this.scene = null;
    this.camera = null;
    this.renderer = null;
    this.mesh = null;
  }

  private bindInput(): void {
    const canvas = this.renderer?.domElement;
    if (!canvas) return;
    const add = (type: string, listener: EventListener, options?: AddEventListenerOptions) => {
      canvas.addEventListener(type, listener, options);
      this.listeners.push({ target: canvas, type, listener, options });
    };
    add("pointerdown", (event) => {
      const pointer = event as PointerEvent;
      this.dragging = true;
      this.velocity = { x: 0, y: 0 };
      this.lastPointer = { x: pointer.clientX, y: pointer.clientY };
      this.lastMoveAt = performance.now();
      canvas.setPointerCapture?.(pointer.pointerId);
    });
    add("pointermove", (event) => {
      const pointer = event as PointerEvent;
      if (this.dragging) {
        const now = performance.now();
        const dt = Math.max(1, now - this.lastMoveAt);
        const dx = pointer.clientX - this.lastPointer.x;
        const dy = pointer.clientY - this.lastPointer.y;
        const stepY = dx * 0.0115;
        const stepX = dy * 0.0085;
        this.target.y += stepY;
        this.target.x = clamp(this.target.x + stepX, -TILT_LIMIT, TILT_LIMIT);
        const blend = 0.55;
        this.velocity.y = this.velocity.y * (1 - blend) + (stepY / dt) * blend;
        this.velocity.x = this.velocity.x * (1 - blend) + (stepX / dt) * blend;
        this.lastPointer = { x: pointer.clientX, y: pointer.clientY };
        this.lastMoveAt = now;
      } else {
        const rect = canvas.getBoundingClientRect();
        this.hover.x = ((pointer.clientX - rect.left) / Math.max(1, rect.width) - 0.5) * 2;
        this.hover.y = ((pointer.clientY - rect.top) / Math.max(1, rect.height) - 0.5) * 2;
      }
    });
    add("pointerup", () => { this.dragging = false; });
    add("pointercancel", () => { this.dragging = false; });
    add("pointerenter", () => { this.hovered = true; });
    add("pointerleave", () => { this.hovered = false; });
    add("wheel", (event) => {
      event.preventDefault();
      const wheel = event as WheelEvent;
      this.targetDistance = clamp(this.targetDistance + wheel.deltaY * 0.003, this.options.minDistance ?? 2.3, this.options.maxDistance ?? 4.3);
    }, { passive: false });
    add("keydown", (event) => {
      const key = (event as KeyboardEvent).key;
      const step = 0.22;
      if (key === "ArrowLeft") this.target.y -= step;
      else if (key === "ArrowRight") this.target.y += step;
      else if (key === "ArrowUp") this.target.x = clamp(this.target.x - step * 0.7, -TILT_LIMIT, TILT_LIMIT);
      else if (key === "ArrowDown") this.target.x = clamp(this.target.x + step * 0.7, -TILT_LIMIT, TILT_LIMIT);
      else if (key === "+" || key === "=") this.targetDistance = clamp(this.targetDistance - 0.3, this.options.minDistance ?? 2.3, this.options.maxDistance ?? 4.3);
      else if (key === "-" || key === "_") this.targetDistance = clamp(this.targetDistance + 0.3, this.options.minDistance ?? 2.3, this.options.maxDistance ?? 4.3);
      else return;
      event.preventDefault();
    });
  }

  private readonly tick = (time: number) => {
    this.frame = requestAnimationFrame(this.tick);
    if (!this.renderer || !this.scene || !this.camera || !this.mesh) return;
    const dt = clamp((time - this.lastFrameTime) / 1000, 0.001, 0.05);
    this.lastFrameTime = time;

    if (!this.dragging) {
      this.target.y += this.velocity.y * dt * 1000;
      this.target.x = clamp(this.target.x + this.velocity.x * dt * 1000, -TILT_LIMIT, TILT_LIMIT);
      const decay = Math.exp(-dt * 4.2);
      this.velocity.x *= decay;
      this.velocity.y *= decay;
      if (Math.abs(this.velocity.x) < 0.00002) this.velocity.x = 0;
      if (Math.abs(this.velocity.y) < 0.00002) this.velocity.y = 0;
    }

    const ease = 1 - Math.exp(-dt * 11);
    this.current.x += (this.target.x - this.current.x) * ease;
    this.current.y += (this.target.y - this.current.y) * ease;
    this.distance += (this.targetDistance - this.distance) * ease;

    const hoverActive = this.hovered && !this.dragging && !this.reducedMotion;
    const hoverGoalX = hoverActive ? this.hover.y * -0.07 : 0;
    const hoverGoalY = hoverActive ? this.hover.x * 0.1 : 0;
    this.hoverCurrent.x += (hoverGoalX - this.hoverCurrent.x) * ease;
    this.hoverCurrent.y += (hoverGoalY - this.hoverCurrent.y) * ease;

    const idle = !this.dragging && !this.reducedMotion && this.velocity.x === 0 && this.velocity.y === 0;
    const seconds = time / 1000;
    const swayY = idle ? Math.sin(seconds * 0.5) * 0.045 : 0;
    const swayX = idle ? Math.sin(seconds * 0.68 + 1.2) * 0.018 : 0;
    const bob = this.reducedMotion ? 0 : Math.sin(seconds * 0.9) * 0.032;

    this.mesh.rotation.set(this.current.x + this.hoverCurrent.x + swayX, this.current.y + this.hoverCurrent.y + swayY, 0);
    this.mesh.position.y = bob;
    this.camera.position.set(0, 0, this.distance);
    this.camera.lookAt(0, 0, 0);
    this.renderer.render(this.scene, this.camera);
  };

  private resize(): void {
    if (!this.renderer || !this.camera) return;
    const width = Math.max(1, this.host.clientWidth);
    const height = Math.max(1, this.host.clientHeight);
    this.renderer.setSize(width, height, false);
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
  }

  private makeGeometry(images: [CanvasImageSource, CanvasImageSource, CanvasImageSource], relief: FaceMask["visual"]["relief"]): ReliefGeometry {
    const resolution = clamp(Number(relief.resolution) || 56, 32, 80);
    const canvases = images.map((image) => {
      const canvas = document.createElement("canvas");
      canvas.width = resolution;
      canvas.height = resolution;
      const context = canvas.getContext("2d", { willReadFrequently: true });
      if (!context) throw new Error("2D canvas unavailable");
      context.drawImage(image, 0, 0, resolution, resolution);
      return canvas;
    }) as [HTMLCanvasElement, HTMLCanvasElement, HTMLCanvasElement];
    const canvas = canvases[0];
    const context = canvas.getContext("2d", { willReadFrequently: true });
    if (!context) throw new Error("2D canvas unavailable");
    const imageData = context.getImageData(0, 0, resolution, resolution);
    const data = imageData.data;
    const lumAt = (x: number, y: number) => {
      const offset = (y * resolution + x) * 4;
      return (data[offset] + data[offset + 1] + data[offset + 2]) / 765;
    };
    const alphaAt = (x: number, y: number) => data[(y * resolution + x) * 4 + 3];
    const background = new Uint8Array(resolution * resolution);
    const queue: Array<[number, number]> = [];
    const visit = (x: number, y: number) => {
      const at = y * resolution + x;
      if (background[at] || alphaAt(x, y) > 18) return;
      background[at] = 1;
      queue.push([x, y]);
    };
    for (let index = 0; index < resolution; index += 1) { visit(index, 0); visit(index, resolution - 1); visit(0, index); visit(resolution - 1, index); }
    while (queue.length) {
      const [x, y] = queue.pop() as [number, number];
      for (const [nextX, nextY] of [[x - 1, y], [x + 1, y], [x, y - 1], [x, y + 1]] as Array<[number, number]>) {
        if (nextX >= 0 && nextY >= 0 && nextX < resolution && nextY < resolution) visit(nextX, nextY);
      }
    }
    for (let index = 0; index < resolution * resolution; index += 1) data[index * 4 + 3] = background[index] ? 0 : 255;
    context.putImageData(imageData, 0, 0);
    const depth = Number(relief.depth) || 0.3;
    const positions: number[] = [], uvs: number[] = [], indices: number[] = [];
    const indexAt = new Int32Array(resolution * resolution).fill(-1);
    for (let y = 0; y < resolution; y += 1) for (let x = 0; x < resolution; x += 1) {
      if (background[y * resolution + x]) continue;
      const index = positions.length / 3;
      indexAt[y * resolution + x] = index;
      const u = x / (resolution - 1), v = y / (resolution - 1);
      const widthCurve = Math.sqrt(Math.max(0, 1 - Math.pow((u - .5) * 1.86, 2)));
      const heightCurve = .78 + Math.sqrt(Math.max(0, 1 - Math.pow((v - .52) * 1.55, 2))) * .22;
      positions.push((u - 0.5) * 1.7, (0.5 - v) * 2.2, (0.28 + widthCurve * .86 * heightCurve + lumAt(x, y) * .16) * depth * 1.35);
      uvs.push(u, 1 - v);
    }
    for (let y = 0; y < resolution - 1; y += 1) for (let x = 0; x < resolution - 1; x += 1) {
      const a = indexAt[y * resolution + x], b = indexAt[y * resolution + x + 1], c = indexAt[(y + 1) * resolution + x], d = indexAt[(y + 1) * resolution + x + 1];
      if (a >= 0 && b >= 0 && c >= 0) indices.push(a, c, b);
      if (b >= 0 && c >= 0 && d >= 0) indices.push(b, c, d);
    }
    const front = new THREE.BufferGeometry();
    front.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
    front.setAttribute("uv", new THREE.Float32BufferAttribute(uvs, 2));
    front.setIndex(indices);
    front.computeVertexNormals();
    const back = front.clone();
    const backPositions = back.getAttribute("position");
    for (let index = 0; index < backPositions.count; index += 1) {
      const x = backPositions.getX(index) / .85;
      backPositions.setZ(index, -depth * (.46 + Math.max(0, 1 - x * x) * .12));
    }
    backPositions.needsUpdate = true;
    back.computeVertexNormals();
    const edgePositions: number[] = [], edgeIndices: number[] = [], edgeUvs: number[] = [];
    const point = (x: number, y: number, fallback: [number, number, number]): [number, number, number] => {
      const index = indexAt[y * resolution + x];
      if (index < 0) return fallback;
      return [positions[index * 3], positions[index * 3 + 1], positions[index * 3 + 2]];
    };
    const addSide = (a: [number, number, number], b: [number, number, number]) => {
      const base = edgePositions.length / 3;
      const backDepthA = -depth * (.46 + Math.max(0, 1 - Math.pow(a[0] / .85, 2)) * .12);
      const backDepthB = -depth * (.46 + Math.max(0, 1 - Math.pow(b[0] / .85, 2)) * .12);
      edgePositions.push(a[0], a[1], a[2], b[0], b[1], b[2], a[0], a[1], backDepthA, b[0], b[1], backDepthB);
      edgeUvs.push(.84, .5 + a[1] / 2.2, .84, .5 + b[1] / 2.2, .16, .5 + a[1] / 2.2, .16, .5 + b[1] / 2.2);
      edgeIndices.push(base, base + 2, base + 1, base + 1, base + 2, base + 3);
    };
    for (let y = 0; y < resolution; y += 1) for (let x = 0; x < resolution; x += 1) {
      if (indexAt[y * resolution + x] < 0) continue;
      const here = point(x, y, [0, 0, 0]);
      const below = point(x, Math.min(y + 1, resolution - 1), here);
      const right = point(Math.min(x + 1, resolution - 1), y, here);
      if (x === 0 || indexAt[y * resolution + x - 1] < 0) addSide(here, below);
      if (x === resolution - 1 || indexAt[y * resolution + x + 1] < 0) addSide(below, here);
      if (y === 0 || indexAt[(y - 1) * resolution + x] < 0) addSide(here, right);
      if (y === resolution - 1 || indexAt[(y + 1) * resolution + x] < 0) addSide(right, here);
    }
    const edge = new THREE.BufferGeometry();
    edge.setAttribute("position", new THREE.Float32BufferAttribute(edgePositions, 3));
    edge.setAttribute("uv", new THREE.Float32BufferAttribute(edgeUvs, 2));
    edge.setIndex(edgeIndices);
    edge.computeVertexNormals();
    return { front, back, edge, textureCanvases: { front: canvases[0], side: canvases[1], back: canvases[2] } };
  }
}
