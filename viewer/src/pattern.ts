import { evaluate, resolveFormulas } from './formula';

export type Point = { x: number; y: number };
export type Measurement = { name: string; label: string; formula: string; value?: number; description: string; error?: string };
export type Measurements = { rows: Measurement[]; unit: string; source: string };
export type Piece = { id: string; name: string; points: Point[]; quantity: number; edges: { name: string; points: Point[] }[] };
export type Pattern = {
  unit: string; description: string; notes: string; pieces: Piece[];
  measurements: Measurements; variables: Measurement[]; measurementPath: string; warnings: string[];
};
const children = (element: Element, tag?: string) => Array.from(element.children).filter(child => !tag || child.tagName === tag);
const direct = (element: Element, tag: string) => children(element, tag)[0];
const all = (element: Element, tag: string) => Array.from(element.getElementsByTagName(tag));
const text = (element: Element, tag: string) => direct(element, tag)?.textContent?.trim() ?? '';
const attr = (element: Element, name: string, fallback = '') => element.getAttribute(name) ?? fallback;
export const unitScale: Record<string, number> = { mm: 1, cm: 10, inch: 25.4, in: 25.4 };

function xml(source: string, roots: string[]) {
  if (source.length > 10_000_000) throw new Error('This file is too large. The limit is 10 MB.');
  if (/<!DOCTYPE|<!ENTITY/i.test(source)) throw new Error('XML declarations with DTDs or entities are not supported.');
  const document = new DOMParser().parseFromString(source, 'application/xml');
  if (document.getElementsByTagName('parsererror').length) throw new Error('The file is not valid XML.');
  if (!roots.includes(document.documentElement.tagName)) throw new Error(`Expected a ${roots.join(' or ')} file.`);
  return document.documentElement;
}
function unit(root: Element) {
  const value = text(root, 'unit') || 'cm';
  if (!Object.hasOwn(unitScale, value)) throw new Error(`Unsupported measurement unit: ${value}`);
  return value;
}
function rows(elements: Element[], values: Record<string, number> = {}): Measurement[] {
  const items = elements.map(element => ({
    name: attr(element, 'name'), label: attr(element, 'full_name') || attr(element, 'name').replace(/^[@#]/, '').replaceAll('_', ' '),
    formula: attr(element, 'value', attr(element, 'formula')), description: attr(element, 'description'),
  })).filter(row => row.name);
  const result = resolveFormulas(items, values);
  return items.map(row => ({ ...row, value: result.errors[row.name] ? undefined : result.values[row.name], error: result.errors[row.name] }));
}
function embedded(root: Element): Element[] {
  return [...all(root, 'body-measurements').flatMap(container => children(container, 'm')),
    ...children(direct(root, 'measurements') ?? root, 'm')];
}
export function parseMeasurements(source: string, name: string): Measurements {
  const root = xml(source, ['smis', 'vit']);
  const result = rows(embedded(root));
  if (!result.length) throw new Error('This file has no body measurements.');
  return { rows: result, unit: unit(root), source: name };
}

export function parsePattern(source: string, external?: Measurements): Pattern {
  const root = xml(source, ['pattern']), patternUnit = unit(root);
  const measurements: Measurements = { rows: rows(embedded(root)), unit: patternUnit, source: 'Embedded in pattern' };
  const active = measurements.rows.length ? measurements : external;
  const initial: Record<string, number> = {};
  for (const row of active?.rows ?? []) if (row.value !== undefined) initial[row.name] = row.value * unitScale[active!.unit] / unitScale[patternUnit];
  const variables = rows(all(root, 'variables').flatMap(container => children(container, 'variable')), initial);
  const values = { ...initial };
  for (const variable of variables) if (variable.value !== undefined) values[variable.name] = variable.value;
  const objects = new Map<string, Point[]>(), failures = new Map<string, string>();
  const calc = (element: Element, name: string, fallback = '') => evaluate(attr(element, name, fallback), values);
  const get = (id: string): Point[] => {
    const result = objects.get(id);
    if (!result) throw new Error(failures.get(id) ?? `Unresolved object ${id}`);
    return result;
  };
  const point = (element: Element, key: string) => get(attr(element, key))[0];
  const direction = (a: Point, b: Point) => Math.atan2(a.y - b.y, b.x - a.x) * 180 / Math.PI;
  const offset = (p: Point, length: number, angle: number): Point => ({ x: p.x + length * Math.cos(angle * Math.PI / 180), y: p.y - length * Math.sin(angle * Math.PI / 180) });
  function calculate(element: Element): Point[] {
    const type = attr(element, 'type');
    if (element.tagName === 'point') {
      let p: Point;
      if (type === 'single') p = { x: calc(element, 'x'), y: calc(element, 'y') };
      else if (type === 'endLine') p = offset(point(element, 'basePoint'), calc(element, 'length'), calc(element, 'angle'));
      else if (['alongLine', 'midPoint', 'normal'].includes(type)) {
        const a = point(element, 'firstPoint'), b = point(element, 'secondPoint');
        const length = type === 'midPoint' ? Math.hypot(b.x - a.x, b.y - a.y) / 2 : calc(element, 'length');
        p = offset(a, length, direction(a, b) + (type === 'normal' ? 90 + calc(element, 'angle', '0') : 0));
      } else if (type === 'pointOfIntersection') p = { x: point(element, 'firstPoint').x, y: point(element, 'secondPoint').y };
      else if (type === 'lineIntersect') {
        const a = point(element, 'p1Line1'), b = point(element, 'p2Line1'), c = point(element, 'p1Line2'), d = point(element, 'p2Line2');
        const cross = (u: Point, v: Point) => u.x * v.y - u.y * v.x;
        const sub = (u: Point, v: Point) => ({ x: u.x - v.x, y: u.y - v.y });
        const r = sub(b, a), s = sub(d, c), denominator = cross(r, s);
        if (Math.abs(denominator) < 1e-10) throw new Error('Parallel construction lines');
        const t = cross(sub(c, a), s) / denominator;
        p = { x: a.x + t * r.x, y: a.y + t * r.y };
      } else throw new Error(`Unsupported point type “${type}”`);
      return [p];
    }
    if (element.tagName === 'spline' && type === 'simpleInteractive') {
      const a = point(element, 'point1'), d = point(element, 'point4');
      const b = offset(a, calc(element, 'length1'), calc(element, 'angle1'));
      const c = offset(d, calc(element, 'length2'), calc(element, 'angle2'));
      return Array.from({ length: 41 }, (_, i) => {
        const t = i / 40, u = 1 - t;
        return { x: u ** 3 * a.x + 3 * u ** 2 * t * b.x + 3 * u * t ** 2 * c.x + t ** 3 * d.x,
          y: u ** 3 * a.y + 3 * u ** 2 * t * b.y + 3 * u * t ** 2 * c.y + t ** 3 * d.y };
      });
    }
    if (element.tagName === 'arc' && type === 'simple') {
      const center = point(element, 'center'), radius = calc(element, 'radius');
      const start = calc(element, 'angle1'), end = calc(element, 'angle2');
      const sweep = ((end - start) % 360 + 360) % 360 || 360;
      return Array.from({ length: 65 }, (_, i) => offset(center, radius, start + sweep * i / 64));
    }
    throw new Error(`Unsupported ${element.tagName} type “${type}”`);
  }
  const construction = all(root, 'calculation').flatMap(container => children(container).filter(element => ['point', 'spline', 'arc'].includes(element.tagName)));
  let pending = [...construction];
  for (let pass = 0; pending.length && pass <= construction.length; pass++) {
    const next = [];
    for (const element of pending) {
      const id = attr(element, 'id');
      try {
        const geometry = calculate(element);
        if (geometry.some(p => !Number.isFinite(p.x) || !Number.isFinite(p.y) || Math.abs(p.x) > 1e6 || Math.abs(p.y) > 1e6)) throw new Error('Invalid point coordinates');
        objects.set(id, geometry); failures.delete(id);
      } catch (error) { failures.set(id, (error as Error).message); next.push(element); }
    }
    if (next.length === pending.length) break;
    pending = next;
  }
  const aliases = all(root, 'modeling').flatMap(container => children(container));
  for (let pass = 0; pass < aliases.length; pass++) {
    let changed = false;
    for (const alias of aliases) {
      const id = attr(alias, 'id'), target = attr(alias, 'idObject');
      if (!objects.has(id) && objects.has(target)) { objects.set(id, get(target)); changed = true; }
      if (failures.has(target)) failures.set(id, failures.get(target)!);
    }
    if (!changed) break;
  }
  const pieces: Piece[] = [], warnings: string[] = [];
  for (const element of [...all(root, 'piece'), ...all(root, 'detail')]) {
    if (!direct(element, 'nodes')) continue;
    const name = attr(element, 'name', `Piece ${pieces.length + 1}`);
    try {
      const points: Point[] = [], segments: Point[][] = [];
      for (const node of children(direct(element, 'nodes')!, 'node')) {
        if (attr(node, 'excluded') === 'true' || attr(node, 'excluded') === '1') continue;
        let samples = [...get(attr(node, 'idObject'))];
        if (['1', 'true'].includes(attr(node, 'reverse'))) samples.reverse();
        segments.push(samples);
        for (const p of samples) if (!points.length || Math.hypot(p.x - points.at(-1)!.x, p.y - points.at(-1)!.y) > 1e-7) points.push(p);
      }
      if (points.length > 1 && Math.hypot(points[0].x - points.at(-1)!.x, points[0].y - points.at(-1)!.y) < 1e-7) points.pop();
      if (points.length < 3) throw new Error('Fewer than three outline points');
      const area = Math.abs(points.reduce((sum, p, i) => { const q = points[(i + 1) % points.length]; return sum + p.x * q.y - q.x * p.y; }, 0)) / 2;
      if (area < 1e-7) throw new Error('The outline has zero area');
      const convert = (p: Point) => ({ x: p.x * unitScale[patternUnit], y: p.y * unitScale[patternUnit] });
      const edges: Piece['edges'] = [];
      for (let i = 0; i < segments.length; i++) {
        if (segments[i].length !== 1) continue;
        const edge = [...segments[i]];
        for (let j = 1; j <= segments.length; j++) {
          const next = segments[(i + j) % segments.length];
          edge.push(...next);
          if (next.length === 1) break;
        }
        edges.push({ name: `Edge ${edges.length + 1}`, points: edge.map(convert) });
      }
      if (!edges.length) edges.push({ name: 'Outline', points: [...points, points[0]].map(convert) });
      pieces.push({ id: attr(element, 'id'), name, points: points.map(convert), edges,
        quantity: Math.max(1, Number(attr(direct(element, 'data') ?? element, 'quantity', '1')) || 1) });
    } catch (error) { warnings.push(`${name}: ${(error as Error).message}`); }
  }
  if (!pieces.length) warnings.unshift('No renderable pattern pieces. Define piece outlines in Seamly2D, or load the referenced measurements.');
  if (variables.some(row => row.error)) warnings.push('Some pattern variables could not be evaluated. Check the Variables table for details.');
  return { unit: patternUnit, description: text(root, 'description'), notes: text(root, 'notes'), pieces,
    measurements, variables, measurementPath: text(root, 'measurements'), warnings };
}
