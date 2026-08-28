import gsap from "gsap";
import * as THREE from "three";
import { startTrackedRafLoop, trackScene } from "./runtime-lifecycle";

interface ThresholdSceneElements {
  canvas: HTMLCanvasElement;
  mountain: HTMLElement;
  hall: HTMLElement;
  village: HTMLElement;
}

export interface ThresholdScene {
  resize: () => void;
  intro: () => Promise<void>;
  openDoor: () => Promise<void>;
  dispose: () => void;
}

function createRenderer(canvas: HTMLCanvasElement) {
  const attributes: WebGLContextAttributes = {
    alpha: true,
    antialias: true,
    powerPreference: "high-performance",
  };

  try {
    const context = canvas.getContext("webgl2", attributes)
      ?? canvas.getContext("webgl", attributes);
    if (!context) return null;
    return new THREE.WebGLRenderer({
      canvas,
      context,
      antialias: true,
      alpha: true,
      powerPreference: "high-performance",
    });
  } catch {
    return null;
  }
}

function createCssFallback(
  { canvas, mountain, hall, village }: ThresholdSceneElements,
  releaseScene: () => void,
): ThresholdScene {
  canvas.hidden = true;
  canvas.dataset.renderMode = "css-fallback";
  gsap.set(mountain, { scale: 1.08, opacity: 1 });
  gsap.set(village, { scale: 1, opacity: 1 });
  gsap.set(hall, { scale: 1.05, opacity: 0 });
  let disposed = false;

  return {
    resize: () => undefined,
    intro: async () => undefined,
    openDoor: async () => {
      gsap.set(hall, { opacity: 1, scale: 1 });
      gsap.set([village, mountain], { opacity: 0 });
    },
    dispose: () => {
      if (disposed) return;
      disposed = true;
      gsap.killTweensOf([mountain, hall, village]);
      releaseScene();
    },
  };
}

function makeSoftTexture() {
  const canvas = document.createElement("canvas");
  canvas.width = 256;
  canvas.height = 256;
  const context = canvas.getContext("2d");
  if (!context) throw new Error("无法创建雾气纹理");
  const gradient = context.createRadialGradient(128, 128, 4, 128, 128, 128);
  gradient.addColorStop(0, "rgba(236,242,239,.52)");
  gradient.addColorStop(.45, "rgba(225,234,230,.18)");
  gradient.addColorStop(1, "rgba(225,234,230,0)");
  context.fillStyle = gradient;
  context.fillRect(0, 0, 256, 256);
  return new THREE.CanvasTexture(canvas);
}

function makeWoodTexture() {
  const canvas = document.createElement("canvas");
  canvas.width = 256;
  canvas.height = 512;
  const context = canvas.getContext("2d");
  if (!context) throw new Error("无法创建门板纹理");
  const gradient = context.createLinearGradient(0, 0, 256, 0);
  gradient.addColorStop(0, "#130e09");
  gradient.addColorStop(.42, "#4b301c");
  gradient.addColorStop(.56, "#21150d");
  gradient.addColorStop(1, "#100b07");
  context.fillStyle = gradient;
  context.fillRect(0, 0, 256, 512);
  for (let y = 0; y < 512; y += 8) {
    context.strokeStyle = `rgba(209,157,92,${.025 + Math.random() * .055})`;
    context.lineWidth = .8 + Math.random() * 1.4;
    context.beginPath();
    context.moveTo(0, y + Math.random() * 5);
    context.bezierCurveTo(64, y - 7, 188, y + 10, 256, y + Math.random() * 5);
    context.stroke();
  }
  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

function disposeMaterial(material: THREE.Material) {
  const candidate = material as THREE.Material & Record<string, unknown>;
  for (const value of Object.values(candidate)) {
    if (value instanceof THREE.Texture) value.dispose();
  }
  material.dispose();
}

export function createThresholdScene({ canvas, mountain, hall, village }: ThresholdSceneElements): ThresholdScene {
  const releaseScene = trackScene();
  const renderer = createRenderer(canvas);
  if (!renderer) {
    console.warn("[threshold] WebGL unavailable; using CSS fallback.");
    return createCssFallback({ canvas, mountain, hall, village }, releaseScene);
  }
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.setClearColor(0x000000, 0);

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(42, 1, .1, 100);
  const lookAt = new THREE.Vector3(0, -.25, -13);
  const motion = { z: 18 };
  camera.position.set(0, .1, motion.z);
  camera.lookAt(lookAt);
  scene.add(new THREE.HemisphereLight(0xe4eced, 0x14100b, 1.9));
  const warm = new THREE.PointLight(0xe5a34e, 10, 18, 2);
  warm.position.set(0, -.15, -10);
  scene.add(warm);

  const root = new THREE.Group();
  const doorRoot = new THREE.Group();
  const fogs: THREE.Sprite[] = [];
  const timelines = new Set<gsap.core.Timeline>();
  scene.add(root);

  const wood = makeWoodTexture();
  const doorMaterial = new THREE.MeshBasicMaterial({ map: wood });
  const trimMaterial = new THREE.MeshStandardMaterial({ color: 0x22150c, roughness: .74, metalness: .05 });
  const leafGeometry = new THREE.BoxGeometry(1.47, 4.5, .18);
  const trimGeometry = new THREE.BoxGeometry(.14, 4.9, .32);
  const leftDoor = new THREE.Group();
  const rightDoor = new THREE.Group();
  const leftLeaf = new THREE.Mesh(leafGeometry, doorMaterial);
  const rightLeaf = new THREE.Mesh(leafGeometry, doorMaterial);
  leftLeaf.position.x = .735;
  rightLeaf.position.x = -.735;
  leftDoor.add(leftLeaf);
  rightDoor.add(rightLeaf);
  const ringMaterial = new THREE.MeshBasicMaterial({ color: 0x80592d });
  const leftRing = new THREE.Mesh(new THREE.TorusGeometry(.16, .028, 8, 22), ringMaterial);
  const rightRing = leftRing.clone();
  leftRing.position.set(.92, 0, .12);
  rightRing.position.set(-.92, 0, .12);
  leftDoor.add(leftRing);
  rightDoor.add(rightRing);
  leftDoor.position.x = -1.47;
  rightDoor.position.x = 1.47;
  doorRoot.position.set(0, -1.05, -4.62);
  doorRoot.add(leftDoor, rightDoor);
  const topTrim = new THREE.Mesh(new THREE.BoxGeometry(3.3, .22, .34), trimMaterial);
  topTrim.position.set(0, 2.38, 0);
  const leftTrim = new THREE.Mesh(trimGeometry, trimMaterial);
  const rightTrim = new THREE.Mesh(trimGeometry, trimMaterial);
  leftTrim.position.set(-1.6, 0, 0);
  rightTrim.position.set(1.6, 0, 0);
  doorRoot.add(topTrim, leftTrim, rightTrim);
  root.add(doorRoot);

  const fogTexture = makeSoftTexture();
  for (let index = 0; index < 5; index += 1) {
    const fog = new THREE.Sprite(new THREE.SpriteMaterial({ map: fogTexture, transparent: true, opacity: .1, depthWrite: false, color: 0xe5ece8 }));
    fog.position.set((index - 2) * 3, -1.3 - index % 2 * .5, -7 - index * .7);
    fog.scale.set(8, 2.3, 1);
    fogs.push(fog);
    root.add(fog);
  }

  const resize = () => {
    const rect = canvas.getBoundingClientRect();
    if (rect.width === 0 || rect.height === 0) return;
    renderer.setSize(rect.width, rect.height, false);
    camera.aspect = rect.width / rect.height;
    camera.updateProjectionMatrix();
  };
  const updateCamera = () => {
    camera.position.z = motion.z;
    lookAt.set(0, -.25, Math.min(-9, motion.z - 22));
    camera.lookAt(lookAt);
  };
  resize();
  gsap.set(mountain, { scale: 1.02, opacity: 1 });
  gsap.set(village, { scale: .22, opacity: .08 });
  gsap.set(hall, { scale: 1.75, opacity: 0 });

  const stopRaf = startTrackedRafLoop((time) => {
    fogs.forEach((fog, index) => {
      fog.position.x = Math.sin(time * .00013 + index * 1.7) * 4.5;
      (fog.material as THREE.SpriteMaterial).opacity = .08 + Math.sin(time * .0002 + index) * .025;
    });
    renderer.render(scene, camera);
  });
  let disposed = false;

  const runTimeline = (timeline: gsap.core.Timeline) => {
    timelines.add(timeline);
    const complete = timeline.eventCallback("onComplete");
    timeline.eventCallback("onComplete", () => {
      timelines.delete(timeline);
      if (typeof complete === "function") complete();
    });
    return timeline;
  };

  return {
    resize,
    intro: () => new Promise<void>((resolve) => {
      const timeline = gsap.timeline({ defaults: { duration: 1.35, ease: "power3.inOut", overwrite: "auto" }, onComplete: resolve });
      timeline.to(motion, { z: 3.25, onUpdate: updateCamera }, 0).to(mountain, { scale: 1.16 }, 0).to(village, { scale: 1.08, opacity: 1 }, 0);
      runTimeline(timeline);
    }),
    openDoor: () => new Promise<void>((resolve) => {
      const timeline = gsap.timeline({ defaults: { ease: "power3.inOut" }, onComplete: resolve });
      timeline.to(leftDoor.rotation, { y: -1.38, duration: 1.08 }, 0).to(rightDoor.rotation, { y: 1.38, duration: 1.08 }, 0).to(hall, { opacity: 1, scale: 1.05, duration: .68, ease: "power2.out" }, .34).to([village, mountain], { opacity: 0, duration: .48, ease: "power2.in" }, .58).to(motion, { z: -7.15, duration: 1.32, ease: "power4.inOut", onUpdate: updateCamera }, .14);
      runTimeline(timeline);
    }),
    dispose: () => {
      if (disposed) return;
      disposed = true;
      stopRaf();
      timelines.forEach((timeline) => timeline.kill());
      timelines.clear();
      gsap.killTweensOf([motion, mountain, hall, village, leftDoor.rotation, rightDoor.rotation]);
      scene.traverse((object) => {
        if (object instanceof THREE.Mesh || object instanceof THREE.Sprite) {
          object.geometry?.dispose();
          const materials = Array.isArray(object.material) ? object.material : [object.material];
          materials.forEach(disposeMaterial);
        }
      });
      fogTexture.dispose();
      wood.dispose();
      renderer.renderLists.dispose();
      renderer.dispose();
      renderer.forceContextLoss();
      releaseScene();
    }
  };
}
