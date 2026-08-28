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
  textureCanvas: HTMLCanvasElement;
}

interface ViewerResources {
  geometry: ReliefGeometry;
  frontMaterial: THREE.MeshStandardMaterial;
  edgeMaterial: THREE.MeshStandardMaterial;
  texture: THREE.CanvasTexture;
}

const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(max, value));

/**
 * A deliberately procedural relief. It represents the supplied visual source,
 * not a historical scan or an archaeological 3D model.
 */
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
  private drag: { x: number; y: number } | null = null;
  private rotation: { x: number; y: number };
  private distance = 3.1;
  private mountToken = 0;

  constructor(host: HTMLElement, options: ReliefViewerOptions = {}) {
    this.host = host;
    this.options = options;
    this.rotation = { x: options.rotationX ?? 0.16, y: options.rotationY ?? -0.32 };
  }

  async mount(mask: FaceMask): Promise<void> {
    this.dispose();
    if (!this.host) throw new Error("3D viewer host unavailable");
    const token = ++this.mountToken;
    let sourceTexture: THREE.Texture | null = null;
    try {
      this.host.replaceChildren();
      this.scene = new THREE.Scene();
      this.camera = new THREE.PerspectiveCamera(36, 1, 0.1, 20);
      this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: "low-power" });
      this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.6));
      this.renderer.outputColorSpace = THREE.SRGBColorSpace;
      this.host.appendChild(this.renderer.domElement);

      const group = new THREE.Group();
      group.rotation.set(this.rotation.x, this.rotation.y, 0);
      this.scene.add(group);
      this.mesh = group;

      sourceTexture = await new THREE.TextureLoader().loadAsync(mask.asset);
      if (token !== this.mountToken || !this.renderer) throw new Error("3D viewer mount cancelled");
      sourceTexture.colorSpace = THREE.SRGBColorSpace;
      const relief = mask.visual?.relief ?? { depth: 0.3, resolution: 56, threshold: 24 };
      const geometry = this.makeGeometry(sourceTexture.image as CanvasImageSource, relief);
      sourceTexture.dispose();
      sourceTexture = null;
      const texture = new THREE.CanvasTexture(geometry.textureCanvas);
      texture.colorSpace = THREE.SRGBColorSpace;
      const frontMaterial = new THREE.MeshStandardMaterial({ map: texture, transparent: true, alphaTest: 0.16, roughness: 0.72, metalness: 0.06, side: THREE.FrontSide });
      const edgeMaterial = new THREE.MeshStandardMaterial({ color: "#26180e", roughness: 0.86, metalness: 0.08, side: THREE.DoubleSide });
      group.add(new THREE.Mesh(geometry.front, frontMaterial), new THREE.Mesh(geometry.back, edgeMaterial), new THREE.Mesh(geometry.edge, edgeMaterial));
      group.userData.resources = { geometry, frontMaterial, edgeMaterial, texture } satisfies ViewerResources;

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
    } catch (error) {
      sourceTexture?.dispose();
      this.dispose();
      throw error;
    }
  }

  reset(): void {
    this.rotation = { x: this.options.rotationX ?? 0.16, y: this.options.rotationY ?? -0.32 };
    this.distance = 3.1;
    this.mesh?.rotation.set(this.rotation.x, this.rotation.y, 0);
    this.render();
  }

  zoomIn(): void {
    this.setDistance(this.distance - 0.35);
  }

  zoomOut(): void {
    this.setDistance(this.distance + 0.35);
  }

  dispose(): void {
    this.mountToken += 1;
    this.drag = null;
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
      resources.edgeMaterial.dispose();
      resources.texture.dispose();
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
      this.drag = { x: pointer.clientX, y: pointer.clientY };
      canvas.setPointerCapture?.(pointer.pointerId);
    });
    add("pointermove", (event) => {
      if (!this.drag || !this.mesh) return;
      const pointer = event as PointerEvent;
      this.rotation.y += (pointer.clientX - this.drag.x) * 0.012;
      this.rotation.x = clamp(this.rotation.x + (pointer.clientY - this.drag.y) * 0.009, -0.65, 0.65);
      this.drag = { x: pointer.clientX, y: pointer.clientY };
      this.mesh.rotation.set(this.rotation.x, this.rotation.y, 0);
      this.render();
    });
    add("pointerup", () => { this.drag = null; });
    add("pointercancel", () => { this.drag = null; });
    add("wheel", (event) => {
      event.preventDefault();
      const wheel = event as WheelEvent;
      this.setDistance(this.distance + wheel.deltaY * 0.003);
    }, { passive: false });
  }

  private setDistance(distance: number): void {
    this.distance = clamp(distance, this.options.minDistance ?? 2.25, this.options.maxDistance ?? 4.25);
    this.render();
  }

  private resize(): void {
    if (!this.renderer || !this.camera) return;
    const width = Math.max(1, this.host.clientWidth);
    const height = Math.max(1, this.host.clientHeight);
    this.renderer.setSize(width, height, false);
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
    this.render();
  }

  private render(): void {
    if (!this.renderer || !this.scene || !this.camera) return;
    this.camera.position.set(0, 0, this.distance);
    this.camera.lookAt(0, 0, 0);
    this.renderer.render(this.scene, this.camera);
  }

  private makeGeometry(image: CanvasImageSource, relief: FaceMask["visual"]["relief"]): ReliefGeometry {
    const resolution = clamp(Number(relief.resolution) || 56, 32, 80);
    const canvas = document.createElement("canvas");
    canvas.width = resolution;
    canvas.height = resolution;
    const context = canvas.getContext("2d", { willReadFrequently: true });
    if (!context) throw new Error("2D canvas unavailable");
    context.drawImage(image, 0, 0, resolution, resolution);
    const imageData = context.getImageData(0, 0, resolution, resolution);
    const data = imageData.data;
    const lumAt = (x: number, y: number) => {
      const offset = (y * resolution + x) * 4;
      return (data[offset] + data[offset + 1] + data[offset + 2]) / 765;
    };
    const threshold = Number(relief.threshold) || 24;
    const background = new Uint8Array(resolution * resolution);
    const queue: Array<[number, number]> = [];
    const visit = (x: number, y: number) => {
      const at = y * resolution + x;
      if (background[at] || lumAt(x, y) * 255 > threshold) return;
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
      positions.push((u - 0.5) * 1.7, (0.5 - v) * 2.2, (0.22 + lumAt(x, y) * 0.78) * depth);
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
    for (let index = 2; index < backPositions.count * 3; index += 3) backPositions.array[index] = -depth * 0.24;
    backPositions.needsUpdate = true;
    back.computeVertexNormals();
    const edgePositions: number[] = [], edgeIndices: number[] = [];
    const point = (x: number, y: number, fallback: [number, number, number]): [number, number, number] => {
      const index = indexAt[y * resolution + x];
      if (index < 0) return fallback;
      return [positions[index * 3], positions[index * 3 + 1], positions[index * 3 + 2]];
    };
    const addSide = (a: [number, number, number], b: [number, number, number]) => {
      const base = edgePositions.length / 3;
      edgePositions.push(a[0], a[1], a[2], b[0], b[1], b[2], a[0], a[1], -depth * 0.24, b[0], b[1], -depth * 0.24);
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
    edge.setIndex(edgeIndices);
    edge.computeVertexNormals();
    return { front, back, edge, textureCanvas: canvas };
  }
}
