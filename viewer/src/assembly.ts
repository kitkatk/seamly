import type { Piece, Point } from './pattern';

export type Placement = {
  id: string; pieceId: string; name: string; mirrored: boolean;
  position: [number, number, number]; rotation: [number, number, number]; wrap: number;
};
export type EdgeRef = { instance: string; edge: number };
export type Seam = { id: string; a: EdgeRef; b: EdgeRef; reverse: boolean };
export type Assembly = { version: 1; instances: Placement[]; seams: Seam[] };
export type Vec3 = [number, number, number];
export type Cloth = {
  positions: Vec3[]; initial: Vec3[]; triangles: number[];
  constraints: [number, number, number][]; edges: number[][]; uvs?: number[];
};
export const emptyAssembly = (): Assembly => ({ version: 1, instances: [], seams: [] });
export function createInstance(piece: Piece, index: number): Placement {
  return { id: crypto.randomUUID(), pieceId: piece.id, name: `${piece.name} · ${index + 1}`, mirrored: false,
    position: [(index % 3 - 1) * 240, 0, Math.floor(index / 3) * 100], rotation: [0, 0, 0], wrap: 0 };
}
export function place(p: Point, piece: Piece, instance: Placement): Vec3 {
  const xs = piece.points.map(p => p.x), ys = piece.points.map(p => p.y);
  let x = (p.x - (Math.min(...xs) + Math.max(...xs)) / 2) * (instance.mirrored ? -1 : 1);
  let y = (Math.min(...ys) + Math.max(...ys)) / 2 - p.y, z = 0;
  const width = Math.max(...xs) - Math.min(...xs);
  if (Math.abs(instance.wrap) > 0.1 && width > 0) {
    const angle = instance.wrap * Math.PI / 180, radius = width / angle;
    z = radius * (1 - Math.cos(x / radius)); x = radius * Math.sin(x / radius);
  }
  const [rx, ry, rz] = instance.rotation.map(v => v * Math.PI / 180);
  [y, z] = [y * Math.cos(rx) - z * Math.sin(rx), y * Math.sin(rx) + z * Math.cos(rx)];
  [x, z] = [x * Math.cos(ry) + z * Math.sin(ry), -x * Math.sin(ry) + z * Math.cos(ry)];
  [x, y] = [x * Math.cos(rz) - y * Math.sin(rz), x * Math.sin(rz) + y * Math.cos(rz)];
  return [x + instance.position[0], y + instance.position[1], z + instance.position[2]];
}
export const distance = (a: Vec3, b: Vec3) => Math.hypot(...a.map((v, i) => v - b[i]));
export function sampleEdge(points: Point[], count = 25): Point[] {
  const lengths = [0];
  for (let i = 1; i < points.length; i++) lengths.push(lengths.at(-1)! + Math.hypot(points[i].x - points[i-1].x, points[i].y - points[i-1].y));
  return Array.from({ length: count }, (_, i) => {
    const target = lengths.at(-1)! * i / (count - 1);
    let j = 1;
    while (j < lengths.length - 1 && lengths[j] < target) j++;
    const t = (target - lengths[j-1]) / (lengths[j] - lengths[j-1] || 1);
    return { x: points[j-1].x + t * (points[j].x - points[j-1].x), y: points[j-1].y + t * (points[j].y - points[j-1].y) };
  });
}
export function seamSamples(seam: Seam, assembly: Assembly, pieces: Piece[]): [Vec3[], Vec3[]] {
  const edge = (ref: EdgeRef) => {
    const instance = assembly.instances.find(i => i.id === ref.instance)!;
    const piece = pieces.find(p => p.id === instance.pieceId)!;
    return sampleEdge(piece.edges[ref.edge].points).map(p => place(p, piece, instance));
  };
  const a = edge(seam.a), b = edge(seam.b);
  if (seam.reverse) b.reverse();
  return [a, b];
}

// Position-based seam preview. Length constraints resist stretching; seam
// constraints close user-matched boundaries. This is not a calibrated fit solver.
export function stitch(cloths: Map<string, Cloth>, seams: Seam[], iterations: number, stiffness: number) {
  const links: [Vec3, Vec3][] = [];
  for (const seam of seams) {
    const a = cloths.get(seam.a.instance), b = cloths.get(seam.b.instance);
    if (!a || !b) continue;
    const ea = a.edges[seam.a.edge], eb = [...b.edges[seam.b.edge]];
    if (seam.reverse) eb.reverse();
    const count = Math.max(ea.length, eb.length);
    for (let i = 0; i < count; i++) {
      const ia = ea[Math.round(i * (ea.length - 1) / (count - 1))];
      const ib = eb[Math.round(i * (eb.length - 1) / (count - 1))];
      links.push([a.positions[ia], b.positions[ib]]);
    }
  }
  const constrain = (a: Vec3, b: Vec3, rest: number, strength: number) => {
    const length = distance(a, b);
    if (length < 1e-8) return;
    const factor = (length - rest) / length * strength * 0.5;
    for (let j = 0; j < 3; j++) { const delta = (b[j] - a[j]) * factor; a[j] += delta; b[j] -= delta; }
  };
  for (let step = 0; step < iterations; step++) {
    for (const cloth of cloths.values()) for (const [a, b, length] of cloth.constraints) constrain(cloth.positions[a], cloth.positions[b], length, stiffness);
    for (const [a, b] of links) constrain(a, b, 0, 0.8);
  }
}
export function validateAssembly(value: unknown, pieces: Piece[]): Assembly {
  const data = value as Assembly;
  if (!data || data.version !== 1 || !Array.isArray(data.instances) || !Array.isArray(data.seams) || data.instances.length > 40 || data.seams.length > 100) throw new Error('Invalid assembly file.');
  const ids = new Set<string>();
  for (const instance of data.instances) {
    if (typeof instance.id !== 'string' || !/^[A-Za-z0-9_-]{1,100}$/.test(instance.id) || ids.has(instance.id) || typeof instance.name !== 'string' || !pieces.some(p => p.id === instance.pieceId) || typeof instance.mirrored !== 'boolean') throw new Error('Assembly pieces do not match this pattern.');
    ids.add(instance.id);
    for (const vector of [instance.position, instance.rotation]) if (!Array.isArray(vector) || vector.length !== 3 || vector.some(v => !Number.isFinite(v) || Math.abs(v) > 100000)) throw new Error('Invalid assembly placement.');
    if (!Number.isFinite(instance.wrap) || Math.abs(instance.wrap) > 359) throw new Error('Invalid wrap angle.');
  }
  const used = new Set<string>(), seamIds = new Set<string>();
  for (const seam of data.seams) {
    if (typeof seam.id !== 'string' || !/^[A-Za-z0-9_-]{1,100}$/.test(seam.id) || seamIds.has(seam.id) || typeof seam.reverse !== 'boolean') throw new Error('Invalid seam.');
    seamIds.add(seam.id);
    for (const ref of [seam.a, seam.b]) {
      if (!ref) throw new Error('Missing seam edge.');
      const instance = data.instances.find(i => i.id === ref.instance);
      const piece = pieces.find(p => p.id === instance?.pieceId);
      const key = `${ref.instance}:${ref.edge}`;
      if (!piece || !Number.isInteger(ref.edge) || !piece.edges[ref.edge] || used.has(key)) throw new Error('Invalid or duplicate seam edge.');
      used.add(key);
    }
  }
  return data;
}
