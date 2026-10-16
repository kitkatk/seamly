import { createInstance, place, type Assembly, type EdgeRef, type Placement, type Seam } from './assembly';
import type { Piece, Point } from './pattern';

export const steps = ['Prepare pieces', 'Arrange in 3D', 'Join edges', 'Preview & save'] as const;
export type Step = 0 | 1 | 2 | 3;
export type CopyChoice = { count: number; mirroredPairs: boolean; applyMirroring?: boolean };
export type CopyChoices = Record<string, CopyChoice>;
export type PlacementPreset = 'front' | 'back' | 'left' | 'right' | 'flat';
export const edgeKey = (ref: EdgeRef) => `${ref.instance}:${ref.edge}`;
export const sameEdge = (a: EdgeRef | undefined, b: EdgeRef | undefined) => !!a && !!b && a.instance === b.instance && a.edge === b.edge;
export const edgeLength = (points: Point[]) => points.slice(1).reduce((sum, p, i) => sum + Math.hypot(p.x - points[i].x, p.y - points[i].y), 0);
export function bounds(piece: Piece) {
  const xs = piece.points.map(p => p.x), ys = piece.points.map(p => p.y);
  return { x: Math.min(...xs), y: Math.min(...ys), width: Math.max(...xs) - Math.min(...xs), height: Math.max(...ys) - Math.min(...ys) };
}
export function copyChoices(pieces: Piece[], assembly?: Assembly): CopyChoices {
  return Object.fromEntries(pieces.map(piece => {
    const instances = assembly?.instances.filter(i => i.pieceId === piece.id);
    return [piece.id, { count: instances ? instances.length : Math.min(piece.quantity, 40), mirroredPairs: !!instances?.some(i => i.mirrored) && instances.every((item, index) => item.mirrored === (index % 2 === 1)) }];
  }));
}
// Keep the identity, placement and seams of existing copies when quantities change.
export function prepareCopies(assembly: Assembly, pieces: Piece[], choices: CopyChoices): Assembly {
  const count = Object.values(choices).reduce((sum, choice) => sum + choice.count, 0);
  if (count < 1 || count > 40 || Object.values(choices).some(c => !Number.isInteger(c.count) || c.count < 0)) throw new Error('Choose between 1 and 40 fabric pieces in total.');
  let offset = 0;
  const instances = pieces.flatMap(piece => {
    const choice = choices[piece.id], existing = assembly.instances.filter(i => i.pieceId === piece.id);
    return Array.from({ length: choice.count }, (_, i) => {
      const instance = existing[i] ? structuredClone(existing[i]) : createInstance(piece, i);
      if (!existing[i]) { instance.name = `${piece.name} ${i + 1}`; instance.position = [offset + bounds(piece).width / 2, 0, 0]; offset += bounds(piece).width + 60; }
      const mirrored = existing[i] && !choice.applyMirroring ? existing[i].mirrored : choice.mirroredPairs && i % 2 === 1;
      if (instance.mirrored !== mirrored) instance.arranged = false;
      instance.mirrored = mirrored;
      return instance;
    });
  });
  const ids = new Set(instances.map(i => i.id));
  return { version: 1, instances, seams: assembly.seams.filter(s => ids.has(s.a.instance) && ids.has(s.b.instance)) };
}
export function canVisit(step: Step, assembly: Assembly) {
  if (step === 0) return true;
  if (!assembly.instances.length) return false;
  if (step === 1) return true;
  if (!assembly.instances.every(instance => instance.arranged)) return false;
  return step === 2 || assembly.seams.length > 0;
}
export function blockedReason(step: Step, assembly: Assembly) {
  if (!assembly.instances.length) return 'Create your fabric pieces in step 1 first.';
  if (step > 1 && !assembly.instances.every(i => i.arranged)) return 'Choose a starting position for every piece in step 2 first.';
  return 'Add at least one seam in step 3 first.';
}
export function applyPreset(instance: Placement, piece: Piece, preset: PlacementPreset, assembly: Assembly) {
  const { width } = bounds(piece), siblings = assembly.instances.filter(i => i.pieceId === piece.id), index = siblings.findIndex(i => i.id === instance.id);
  const horizontal = siblings.length > 1 ? (index - (siblings.length - 1) / 2) * width * 0.9 : 0;
  const depth = Math.max(width * 0.24, 35);
  instance.position = preset === 'left' ? [-depth, 0, 0] : preset === 'right' ? [depth, 0, 0] : [horizontal, 0, preset === 'back' ? -depth : preset === 'front' ? depth : 0];
  instance.rotation = [0, preset === 'back' ? 180 : preset === 'left' ? -90 : preset === 'right' ? 90 : 0, 0];
  instance.wrap = preset === 'flat' ? 0 : -100;
  instance.arranged = true;
}
export function edgeFor(ref: EdgeRef, assembly: Assembly, pieces: Piece[]) {
  const instance = assembly.instances.find(i => i.id === ref.instance);
  const piece = pieces.find(p => p.id === instance?.pieceId);
  if (!instance || !piece || !piece.edges[ref.edge]) throw new Error('That edge is no longer available.');
  return { instance, piece, edge: piece.edges[ref.edge] };
}
export function suggestedReverse(a: EdgeRef, b: EdgeRef, assembly: Assembly, pieces: Piece[]) {
  const ends = (ref: EdgeRef) => { const { instance, piece, edge } = edgeFor(ref, assembly, pieces); return [place(edge.points[0], piece, instance), place(edge.points.at(-1)!, piece, instance)]; };
  const [a1, a2] = ends(a), [b1, b2] = ends(b);
  const distance = (a: number[], b: number[]) => Math.hypot(...a.map((v, i) => v - b[i]));
  return distance(a1, b2) + distance(a2, b1) < distance(a1, b1) + distance(a2, b2);
}
export function unusedEdges(assembly: Assembly, pieces: Piece[]) {
  const used = new Set(assembly.seams.flatMap(s => [edgeKey(s.a), edgeKey(s.b)]));
  return assembly.instances.flatMap(instance => pieces.find(p => p.id === instance.pieceId)!.edges.map((_, edge) => ({ instance: instance.id, edge }))).filter(ref => !used.has(edgeKey(ref)));
}
export function addSeam(assembly: Assembly, a: EdgeRef, b: EdgeRef, reverse: boolean): Seam {
  if (sameEdge(a, b)) throw new Error('Choose a different edge for the other side of this seam.');
  if (assembly.seams.some(s => [s.a, s.b].some(ref => sameEdge(ref, a) || sameEdge(ref, b)))) throw new Error('One of these edges already belongs to a seam. Remove that seam to use it again.');
  if (assembly.seams.length >= 100) throw new Error('This preview supports up to 100 seams.');
  const seam = { id: crypto.randomUUID(), a, b, reverse }; assembly.seams.push(seam); return seam;
}
export class History<T> {
  private past: { value: T; label: string }[] = [];
  private future: { value: T; label: string }[] = [];
  get canUndo() { return this.past.length > 0; }
  get canRedo() { return this.future.length > 0; }
  checkpoint(value: T, label: string) { this.past.push({ value: structuredClone(value), label }); if (this.past.length > 40) this.past.shift(); this.future = []; }
  undo(current: T) { const entry = this.past.pop(); if (!entry) return; this.future.push({ value: structuredClone(current), label: entry.label }); return entry; }
  redo(current: T) { const entry = this.future.pop(); if (!entry) return; this.past.push({ value: structuredClone(current), label: entry.label }); return entry; }
  clear() { this.past = []; this.future = []; }
}
