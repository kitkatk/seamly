import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import type { Pattern, Piece, Point } from './pattern';
import { fabrics, type FabricId } from './fabrics';
import { createInstance, distance, place, sampleEdge, seamSamples, stitch, type Assembly, type Cloth, type Placement, type Vec3 } from './assembly';

export class PatternScene {
  private scene = new THREE.Scene();
  private camera = new THREE.PerspectiveCamera(38, 1, 0.1, 100000);
  private renderer: THREE.WebGLRenderer;
  private controls: OrbitControls;
  private group = new THREE.Group();
  private texture: THREE.CanvasTexture;
  private cloths = new Map<string, Cloth>();
  private meshes = new Map<string, THREE.Mesh>();
  private frame = 0;
  private observer: ResizeObserver;
  private pattern?: Pattern;
  private assembly?: Assembly;
  private fabric: FabricId = 'cotton';
  private mode: 'pieces' | 'assembly' = 'assembly';
  private selected = '';
  private sewn = false;
  private edges = true;
  private pick: (id: string) => void;
  constructor(private host: HTMLElement, pick: (id: string) => void) {
    this.pick = pick;
    this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
    this.renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
    this.renderer.setClearColor('#eeede7');
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.domElement.setAttribute('aria-label', 'Interactive 3D pattern. Drag to orbit, scroll to zoom, right drag to pan.');
    this.renderer.domElement.tabIndex = 0;
    this.host.append(this.renderer.domElement);
    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.enableDamping = true;
    this.controls.minDistance = 10;
    this.controls.maxDistance = 50000;
    this.scene.add(new THREE.HemisphereLight('#ffffff', '#b2b3a6', 2.5));
    const key = new THREE.DirectionalLight('#fff5e4', 3.4); key.position.set(-300, 600, 700); this.scene.add(key);
    const fill = new THREE.DirectionalLight('#e7efff', 1.5); fill.position.set(400, 100, -400); this.scene.add(fill);
    this.scene.add(this.group);
    const grid = new THREE.GridHelper(4000, 80, '#c4c5ba', '#deded5'); grid.position.y = -600; this.scene.add(grid);
    const canvas = document.createElement('canvas'); canvas.width = canvas.height = 64;
    const ctx = canvas.getContext('2d')!;
    ctx.fillStyle = '#888888'; ctx.fillRect(0, 0, 64, 64);
    for (let i = 0; i < 64; i += 8) {
      ctx.fillStyle = '#bcbcbc'; ctx.fillRect(i, 0, 3, 64); ctx.fillRect(0, i, 64, 3);
      ctx.fillStyle = '#737373'; ctx.fillRect(i + 3, 0, 1, 64); ctx.fillRect(0, i + 3, 64, 1);
    }
    this.texture = new THREE.CanvasTexture(canvas); this.texture.wrapS = this.texture.wrapT = THREE.RepeatWrapping;
    this.observer = new ResizeObserver(() => this.resize()); this.observer.observe(host); this.resize();
    let down = { x: 0, y: 0 };
    this.renderer.domElement.addEventListener('pointerdown', e => { down = { x: e.clientX, y: e.clientY }; });
    this.renderer.domElement.addEventListener('pointerup', e => {
      if (Math.hypot(e.clientX - down.x, e.clientY - down.y) > 5) return;
      const rect = this.host.getBoundingClientRect(), ray = new THREE.Raycaster();
      ray.setFromCamera(new THREE.Vector2((e.clientX - rect.left) / rect.width * 2 - 1, -(e.clientY - rect.top) / rect.height * 2 + 1), this.camera);
      const hit = ray.intersectObjects([...this.meshes.values()])[0];
      if (hit) this.pick(hit.object.userData.id);
    });
    const animate = () => { this.frame = requestAnimationFrame(animate); this.controls.update(); this.renderer.render(this.scene, this.camera); }; animate();
  }
  private resize() {
    const { width, height } = this.host.getBoundingClientRect();
    this.renderer.setSize(width, height); this.camera.aspect = width / Math.max(height, 1); this.camera.updateProjectionMatrix();
  }
  update(pattern: Pattern | undefined, assembly: Assembly, fabric: FabricId, mode: 'pieces' | 'assembly', selected: string, sewn: boolean, edges: boolean) {
    const reset = pattern !== this.pattern || mode !== this.mode;
    this.pattern = pattern; this.assembly = assembly; this.fabric = fabric; this.mode = mode; this.selected = selected; this.sewn = sewn; this.edges = edges;
    this.rebuild(); if (reset) this.fit();
  }
  private clear() {
    this.group.traverse(object => {
      if (object instanceof THREE.Mesh || object instanceof THREE.Line || object instanceof THREE.Sprite) {
        if ('geometry' in object) object.geometry.dispose();
        for (const material of Array.isArray(object.material) ? object.material : [object.material]) {
          if (material instanceof THREE.SpriteMaterial) material.map?.dispose();
          material.dispose();
        }
      }
    });
    this.group.clear(); this.cloths.clear(); this.meshes.clear();
  }
  private makeCloth(piece: Piece, instance: Placement): Cloth {
    const points: Point[] = [], edgeIndices: number[][] = [];
    for (const edge of piece.edges) {
      const length = edge.points.slice(1).reduce((sum, p, i) => sum + Math.hypot(p.x - edge.points[i].x, p.y - edge.points[i].y), 0);
      const samples = sampleEdge(edge.points, Math.max(3, Math.min(60, Math.ceil(length / 20) + 1)));
      const indices = samples.slice(0, -1).map(p => { points.push(p); return points.length - 1; });
      edgeIndices.push(indices);
    }
    for (let i = 0; i < edgeIndices.length; i++) edgeIndices[i].push(edgeIndices[(i + 1) % edgeIndices.length][0]);
    let triangles = THREE.ShapeUtils.triangulateShape(points.map(p => new THREE.Vector2(p.x, -p.y)), []);
    let edges = edgeIndices;
    for (let pass = 0; pass < 2; pass++) {
      const midpoints = new Map<string, number>();
      const mid = (a: number, b: number) => {
        const key = a < b ? `${a}:${b}` : `${b}:${a}`;
        if (!midpoints.has(key)) { midpoints.set(key, points.length); points.push({ x: (points[a].x + points[b].x) / 2, y: (points[a].y + points[b].y) / 2 }); }
        return midpoints.get(key)!;
      };
      triangles = triangles.flatMap(([a, b, c]) => { const ab = mid(a, b), bc = mid(b, c), ca = mid(c, a); return [[a, ab, ca], [ab, b, bc], [ca, bc, c], [ab, bc, ca]]; });
      edges = edges.map(indices => indices.flatMap((a, i) => i < indices.length - 1 ? [a, mid(a, indices[i+1])] : [a]));
    }
    const positions = points.map(p => place(p, piece, instance));
    const constraints: Cloth['constraints'] = [], known = new Set<string>();
    const add = (a: number, b: number) => {
      const key = a < b ? `${a}:${b}` : `${b}:${a}`;
      if (!known.has(key)) { known.add(key); constraints.push([a, b, Math.hypot(points[a].x - points[b].x, points[a].y - points[b].y)]); }
    };
    for (const [a, b, c] of triangles) { add(a, b); add(b, c); add(c, a); }
    for (const edge of edges) for (let i = 1; i < edge.length; i++) add(edge[i-1], edge[i]);
    return { positions, initial: positions.map(p => [...p] as Vec3), triangles: triangles.flat(), constraints, edges, uvs: points.flatMap(p => [p.x / 8, p.y / 8]) };
  }
  private rebuild() {
    this.clear(); if (!this.pattern || !this.assembly) return;
    const pattern = this.pattern, fabric = fabrics[this.fabric];
    let instances = this.assembly.instances;
    if (this.mode === 'pieces') {
      let x = 0;
      instances = pattern.pieces.map((piece, i) => {
        const instance = createInstance(piece, i), width = Math.max(...piece.points.map(p => p.x)) - Math.min(...piece.points.map(p => p.x));
        instance.id = piece.id; instance.position = [x + width / 2, 0, 0]; x += width + 60; return instance;
      });
    }
    for (const instance of instances) {
      const piece = pattern.pieces.find(p => p.id === instance.pieceId);
      if (piece) this.cloths.set(instance.id, this.makeCloth(piece, instance));
    }
    if (this.sewn && this.mode === 'assembly') stitch(this.cloths, this.assembly.seams, 160, this.fabric === 'cotton' ? 0.85 : 1);
    for (const instance of instances) {
      const piece = pattern.pieces.find(p => p.id === instance.pieceId), cloth = this.cloths.get(instance.id);
      if (!piece || !cloth) continue;
      const geometry = new THREE.BufferGeometry();
      geometry.setAttribute('position', new THREE.Float32BufferAttribute(cloth.positions.flat(), 3)); geometry.setIndex(cloth.triangles);
      // UVs stay in pattern space so the weave follows the cloth through assembly.
      geometry.setAttribute('uv', new THREE.Float32BufferAttribute(cloth.uvs!, 2)); geometry.computeVertexNormals();
      const material = new THREE.MeshStandardMaterial({ color: fabric.color, roughness: fabric.roughness, metalness: 0, side: THREE.DoubleSide,
        bumpMap: this.texture, bumpScale: fabric.bump, polygonOffset: true, polygonOffsetFactor: 1, polygonOffsetUnits: 1 });
      if (this.selected && instance.id !== this.selected) material.color.multiplyScalar(0.87);
      const mesh = new THREE.Mesh(geometry, material); mesh.userData.id = instance.id; this.group.add(mesh); this.meshes.set(instance.id, mesh);
      // A back surface and edge ribbon give the fabric its preset thickness.
      const back = geometry.clone(), normal = geometry.getAttribute('normal'), position = back.getAttribute('position');
      for (let i = 0; i < position.count; i++) position.setXYZ(i, position.getX(i) - normal.getX(i) * fabric.thickness, position.getY(i) - normal.getY(i) * fabric.thickness, position.getZ(i) - normal.getZ(i) * fabric.thickness);
      const backing = new THREE.Mesh(back, new THREE.MeshStandardMaterial({ color: fabric.color, roughness: 1, side: THREE.DoubleSide })); this.group.add(backing);
      const walls: number[] = [];
      for (const indices of cloth.edges) for (let i = 1; i < indices.length; i++) {
        const a = indices[i-1], b = indices[i];
        const av = cloth.positions[a], bv = cloth.positions[b];
        const ab: Vec3 = [position.getX(a), position.getY(a), position.getZ(a)];
        const bb: Vec3 = [position.getX(b), position.getY(b), position.getZ(b)];
        walls.push(...av, ...bv, ...bb, ...av, ...bb, ...ab);
      }
      const wallGeometry = new THREE.BufferGeometry(); wallGeometry.setAttribute('position', new THREE.Float32BufferAttribute(walls, 3)); wallGeometry.computeVertexNormals();
      this.group.add(new THREE.Mesh(wallGeometry, new THREE.MeshStandardMaterial({ color: fabric.color, roughness: 1, side: THREE.DoubleSide })));
      if (this.edges) for (let e = 0; e < cloth.edges.length; e++) {
        const selected = instance.id === this.selected, indices = cloth.edges[e];
        const line = new THREE.Line(new THREE.BufferGeometry().setFromPoints(indices.map(i => new THREE.Vector3(...cloth.positions[i]))), new THREE.LineBasicMaterial({ color: selected ? '#385b43' : '#6c7861', depthTest: false, transparent: true, opacity: selected ? 0.95 : 0.45 }));
        line.renderOrder = 3; this.group.add(line);
        if (selected) this.label(String(e + 1), cloth.positions[indices[Math.floor(indices.length / 2)]]);
      }
    }
    if (this.mode === 'assembly' && !this.sewn) for (const seam of this.assembly.seams) {
      const [a, b] = seamSamples(seam, this.assembly, pattern.pieces);
      const points = a.filter((_, i) => i % 4 === 0).flatMap((p, j) => [new THREE.Vector3(...p), new THREE.Vector3(...b[j * 4])]);
      const lines = new THREE.LineSegments(new THREE.BufferGeometry().setFromPoints(points), new THREE.LineBasicMaterial({ color: '#b9773d', transparent: true, opacity: 0.7 })); this.group.add(lines);
    }
  }
  private label(text: string, point: Vec3) {
    const canvas = document.createElement('canvas'); canvas.width = canvas.height = 64;
    const ctx = canvas.getContext('2d')!; ctx.fillStyle = '#fffef9'; ctx.beginPath(); ctx.arc(32, 32, 27, 0, Math.PI * 2); ctx.fill(); ctx.strokeStyle = '#385b43'; ctx.lineWidth = 2; ctx.stroke();
    ctx.fillStyle = '#385b43'; ctx.font = 'bold 29px sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(text, 32, 33);
    const sprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: new THREE.CanvasTexture(canvas), depthTest: false })); sprite.position.set(...point); sprite.scale.set(19, 19, 1); sprite.renderOrder = 4; this.group.add(sprite);
  }
  fit(direction: 'front' | 'back' | 'top' | 'perspective' = 'perspective') {
    const box = new THREE.Box3().setFromObject(this.group);
    if (box.isEmpty()) { box.min.set(-200, -200, -100); box.max.set(200, 200, 100); }
    const size = box.getSize(new THREE.Vector3()), center = box.getCenter(new THREE.Vector3());
    const distance = Math.max(size.y, size.x / this.camera.aspect, size.z, 100) / (2 * Math.tan(THREE.MathUtils.degToRad(this.camera.fov / 2))) * 1.35;
    const offset = direction === 'top' ? new THREE.Vector3(0, 1, 0.001) : direction === 'back' ? new THREE.Vector3(0, 0, -1) : direction === 'front' ? new THREE.Vector3(0, 0, 1) : new THREE.Vector3(0.35, 0.18, 1).normalize();
    this.controls.target.copy(center); this.camera.position.copy(center).addScaledVector(offset, distance); this.controls.update();
  }
  seamGap(): number {
    if (!this.assembly?.seams.length) return 0;
    const distances: number[] = [];
    for (const seam of this.assembly.seams) {
      const a = this.cloths.get(seam.a.instance), b = this.cloths.get(seam.b.instance); if (!a || !b) continue;
      const ea = a.edges[seam.a.edge], eb = [...b.edges[seam.b.edge]]; if (seam.reverse) eb.reverse();
      ea.forEach((v, i) => distances.push(distance(a.positions[v], b.positions[eb[Math.round(i * (eb.length - 1) / (ea.length - 1))]])));
    }
    return distances.reduce((a, b) => a + b, 0) / (distances.length || 1);
  }
  dispose() { cancelAnimationFrame(this.frame); this.observer.disconnect(); this.controls.dispose(); this.clear(); this.texture.dispose(); this.renderer.dispose(); }
}
