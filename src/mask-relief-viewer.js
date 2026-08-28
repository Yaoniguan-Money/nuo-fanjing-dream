(function (root) {
  "use strict";

  const clamp = (value, min, max) => Math.max(min, Math.min(max, value));

  class MaskReliefViewer {
    constructor(host, options) {
      this.host = host;
      this.options = options || {};
      this.scene = null; this.camera = null; this.renderer = null; this.mesh = null;
      this.rotation = { x: this.options.rotationX || 0.16, y: this.options.rotationY || -0.32 };
      this.distance = 3.1; this.drag = null; this.frame = null; this.resizeObserver = null;
    }

    async mount(mask) {
      this.dispose();
      if (!root.THREE || !this.host) throw new Error("3D renderer unavailable");
      const THREE = root.THREE;
      this.host.replaceChildren();
      this.scene = new THREE.Scene();
      this.camera = new THREE.PerspectiveCamera(36, 1, 0.1, 20);
      this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: "low-power" });
      this.renderer.setPixelRatio(Math.min(root.devicePixelRatio || 1, 1.6));
      this.renderer.outputColorSpace = THREE.SRGBColorSpace || "srgb";
      this.host.appendChild(this.renderer.domElement);

      const group = new THREE.Group();
      group.rotation.set(this.rotation.x, this.rotation.y, 0);
      this.scene.add(group); this.mesh = group;
      const sourceTexture = await new THREE.TextureLoader().loadAsync(mask.asset);
      sourceTexture.colorSpace = THREE.SRGBColorSpace || "srgb";
      const image = sourceTexture.image;
      const relief = mask.visual?.relief || {};
      const geometry = this.makeGeometry(image, relief);
      sourceTexture.dispose();
      const texture = new THREE.CanvasTexture(geometry.textureCanvas);
      texture.colorSpace = THREE.SRGBColorSpace || "srgb";
      const front = new THREE.MeshStandardMaterial({ map: texture, transparent: true, alphaTest: 0.16, roughness: 0.72, metalness: 0.06, side: THREE.FrontSide });
      const edge = new THREE.MeshStandardMaterial({ color: "#26180e", roughness: 0.86, metalness: 0.08, side: THREE.DoubleSide });
      const reliefMesh = new THREE.Mesh(geometry.front, front);
      const backMesh = new THREE.Mesh(geometry.back, edge);
      const edgeMesh = new THREE.Mesh(geometry.edge, edge);
      group.add(reliefMesh, backMesh, edgeMesh);
      group.userData.resources = { geometry, front, edge, texture };

      this.scene.add(new THREE.HemisphereLight("#f7dfaa", "#120b07", 1.35));
      const key = new THREE.DirectionalLight(this.options.light || "#f0ce87", 2.6);
      key.position.set(2.2, 2.6, 3.8); this.scene.add(key);
      const rim = new THREE.PointLight("#9d3327", 1.25, 6); rim.position.set(-2.2, -0.8, -1.8); this.scene.add(rim);
      this.bindInput();
      this.resizeObserver = new ResizeObserver(() => this.resize()); this.resizeObserver.observe(this.host);
      this.resize(); this.render();
    }

    makeGeometry(image, relief) {
      const THREE = root.THREE;
      const resolution = clamp(Number(relief.resolution) || 56, 32, 80);
      const canvas = document.createElement("canvas"); canvas.width = resolution; canvas.height = resolution;
      const context = canvas.getContext("2d", { willReadFrequently: true });
      context.drawImage(image, 0, 0, resolution, resolution);
      const imageData = context.getImageData(0, 0, resolution, resolution);
      const data = imageData.data;
      const lumAt = (x, y) => { const o = (y * resolution + x) * 4; return (data[o] + data[o + 1] + data[o + 2]) / 765; };
      const threshold = Number(relief.threshold) || 24;
      // The supplied source images are RGB studio photographs. Flooding the dark
      // edge background makes a silhouette while retaining dark features within
      // the closed mask outline.
      const background = new Uint8Array(resolution * resolution);
      const queue = [];
      const visit = (x, y) => {
        const at = y * resolution + x;
        if (background[at] || lumAt(x, y) * 255 > threshold) return;
        background[at] = 1; queue.push([x, y]);
      };
      for (let i = 0; i < resolution; i += 1) { visit(i, 0); visit(i, resolution - 1); visit(0, i); visit(resolution - 1, i); }
      while (queue.length) {
        const [x, y] = queue.pop();
        [[x - 1, y], [x + 1, y], [x, y - 1], [x, y + 1]].forEach(([nx, ny]) => { if (nx >= 0 && ny >= 0 && nx < resolution && ny < resolution) visit(nx, ny); });
      }
      const alphaAt = (x, y) => background[y * resolution + x] ? 0 : 255;
      for (let i = 0; i < resolution * resolution; i += 1) data[i * 4 + 3] = background[i] ? 0 : 255;
      context.putImageData(imageData, 0, 0);
      const depth = Number(relief.depth) || 0.3;
      const positions = [], uvs = [], indices = [];
      const indexAt = new Int32Array(resolution * resolution).fill(-1);
      for (let y = 0; y < resolution; y += 1) for (let x = 0; x < resolution; x += 1) {
        if (alphaAt(x, y) < threshold) continue;
        const i = positions.length / 3; indexAt[y * resolution + x] = i;
        const u = x / (resolution - 1), v = y / (resolution - 1);
        const z = (0.22 + lumAt(x, y) * 0.78) * depth;
        positions.push((u - 0.5) * 1.7, (0.5 - v) * 2.2, z); uvs.push(u, 1 - v);
      }
      for (let y = 0; y < resolution - 1; y += 1) for (let x = 0; x < resolution - 1; x += 1) {
        const a = indexAt[y * resolution + x], b = indexAt[y * resolution + x + 1], c = indexAt[(y + 1) * resolution + x], d = indexAt[(y + 1) * resolution + x + 1];
        if (a >= 0 && b >= 0 && c >= 0) indices.push(a, c, b);
        if (b >= 0 && c >= 0 && d >= 0) indices.push(b, c, d);
      }
      const front = new THREE.BufferGeometry();
      front.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3)); front.setAttribute("uv", new THREE.Float32BufferAttribute(uvs, 2)); front.setIndex(indices); front.computeVertexNormals();
      const back = front.clone();
      const backPositions = back.getAttribute("position");
      for (let i = 2; i < backPositions.count * 3; i += 3) backPositions.array[i] = -depth * 0.24;
      backPositions.needsUpdate = true; back.computeVertexNormals();
      const edgePositions = [], edgeIndices = [];
      const point = (x, y, fallback) => {
        const index = indexAt[y * resolution + x];
        if (index < 0) return fallback || [0, 0, 0];
        const i = index * 3;
        return [positions[i], positions[i + 1], positions[i + 2]];
      };
      const addSide = (a, b) => {
        const base = edgePositions.length / 3;
        edgePositions.push(a[0], a[1], a[2], b[0], b[1], b[2], a[0], a[1], -depth * 0.24, b[0], b[1], -depth * 0.24);
        edgeIndices.push(base, base + 2, base + 1, base + 1, base + 2, base + 3);
      };
      for (let y = 0; y < resolution; y += 1) for (let x = 0; x < resolution; x += 1) {
        if (indexAt[y * resolution + x] < 0) continue;
        const here = point(x, y);
        const below = point(x, Math.min(y + 1, resolution - 1), here);
        const right = point(Math.min(x + 1, resolution - 1), y, here);
        if (x === 0 || indexAt[y * resolution + x - 1] < 0) addSide(here, below);
        if (x === resolution - 1 || indexAt[y * resolution + x + 1] < 0) addSide(below, here);
        if (y === 0 || indexAt[(y - 1) * resolution + x] < 0) addSide(here, right);
        if (y === resolution - 1 || indexAt[(y + 1) * resolution + x] < 0) addSide(right, here);
      }
      const edge = new THREE.BufferGeometry(); edge.setAttribute("position", new THREE.Float32BufferAttribute(edgePositions, 3)); edge.setIndex(edgeIndices); edge.computeVertexNormals();
      return { front, back, edge, textureCanvas: canvas };
    }

    bindInput() {
      const canvas = this.renderer.domElement;
      canvas.addEventListener("pointerdown", (event) => { this.drag = { x: event.clientX, y: event.clientY }; canvas.setPointerCapture?.(event.pointerId); });
      canvas.addEventListener("pointermove", (event) => { if (!this.drag || !this.mesh) return; this.rotation.y += (event.clientX - this.drag.x) * 0.012; this.rotation.x = clamp(this.rotation.x + (event.clientY - this.drag.y) * 0.009, -0.65, 0.65); this.drag = { x: event.clientX, y: event.clientY }; this.mesh.rotation.set(this.rotation.x, this.rotation.y, 0); this.render(); });
      canvas.addEventListener("pointerup", () => { this.drag = null; }); canvas.addEventListener("pointercancel", () => { this.drag = null; });
      canvas.addEventListener("wheel", (event) => { event.preventDefault(); this.distance = clamp(this.distance + event.deltaY * 0.003, this.options.minDistance || 2.25, this.options.maxDistance || 4.25); this.render(); }, { passive: false });
    }

    reset() { this.rotation = { x: this.options.rotationX || 0.16, y: this.options.rotationY || -0.32 }; this.distance = 3.1; if (this.mesh) this.mesh.rotation.set(this.rotation.x, this.rotation.y, 0); this.render(); }
    resize() { if (!this.renderer || !this.camera || !this.host) return; const width = Math.max(1, this.host.clientWidth), height = Math.max(1, this.host.clientHeight); this.renderer.setSize(width, height, false); this.camera.aspect = width / height; this.camera.updateProjectionMatrix(); this.render(); }
    render() { if (!this.renderer || !this.scene || !this.camera) return; this.camera.position.set(0, 0, this.distance); this.camera.lookAt(0, 0, 0); this.renderer.render(this.scene, this.camera); }
    dispose() { if (this.resizeObserver) this.resizeObserver.disconnect(); this.resizeObserver = null; if (this.mesh?.userData?.resources) { const r = this.mesh.userData.resources; r.geometry.front.dispose(); r.geometry.back.dispose(); r.geometry.edge.dispose(); r.front.dispose(); r.edge.dispose(); r.texture.dispose(); } if (this.renderer) { this.renderer.dispose(); this.renderer.domElement.remove(); } this.scene = this.camera = this.renderer = this.mesh = null; }
  }

  root.NuoMaskReliefViewer = MaskReliefViewer;
})(window);
