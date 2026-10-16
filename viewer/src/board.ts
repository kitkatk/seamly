import type { Assembly, EdgeRef, Placement, Seam } from './assembly';
import type { Piece } from './pattern';
import { bounds, edgeKey, edgeLength } from './workflow';

export const seamColors = ['#386b5a', '#5168a0', '#a56532', '#8a5294', '#427b85', '#8d7134'];
const escape = (value: string) => value.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;').replaceAll("'", '&#39;');
export const formatLength = (mm: number) => `${new Intl.NumberFormat('en', { maximumFractionDigits: 1 }).format(mm / 10)} cm`;
export type BoardOptions = {
  pieces: Piece[]; assembly: Assembly; selected: string; joining: boolean;
  first?: EdgeRef; second?: EdgeRef; reverse: boolean; activeSeam?: string;
  onPiece: (id: string) => void; onEdge: (ref: EdgeRef) => void;
};
export function pieceThumbnail(piece: Piece) {
  const b = bounds(piece), padding = Math.max(b.width, b.height) * .08;
  return `<svg class="piece-thumbnail" viewBox="${b.x-padding} ${b.y-padding} ${b.width+2*padding} ${b.height+2*padding}" aria-hidden="true"><polygon points="${piece.points.map(p => `${p.x},${p.y}`).join(' ')}"/></svg>`;
}
export function renderBoard(host: HTMLElement, options: BoardOptions) {
  const { pieces, assembly, selected, joining, first, second, reverse, activeSeam } = options;
  host.classList.toggle('joining', joining);
  if (!pieces.length) { host.innerHTML = '<p class="board-empty">Piece outlines will appear here when you open a pattern.</p>'; return; }
  const instances: Placement[] = assembly.instances.length ? assembly.instances : pieces.map(piece => ({ id: piece.id, pieceId: piece.id, name: piece.name, mirrored: false, position: [0,0,0], rotation:[0,0,0], wrap:0 }));
  const used = new Map<string, { seam: Seam; index: number }>();
  assembly.seams.forEach((seam, index) => [seam.a, seam.b].forEach(ref => used.set(edgeKey(ref), {seam,index})));
  const firstKey = first && edgeKey(first), secondKey = second && edgeKey(second);
  const focus = host.contains(document.activeElement) ? (document.activeElement as HTMLElement).getAttribute('data-edge-key') : null;
  host.innerHTML = instances.map(instance => {
    const piece = pieces.find(p => p.id === instance.pieceId)!;
    const b = bounds(piece), padding = Math.max(b.width, b.height) * .18, stroke = Math.max(b.width, b.height) * .009;
    const transform = instance.mirrored ? `translate(${2*b.x+b.width},0) scale(-1,1)` : '';
    return `<article class="board-piece ${selected === instance.id ? 'selected' : ''}" data-board-piece="${escape(instance.id)}"><button class="board-piece-name" data-select-piece="${escape(instance.id)}" aria-pressed="${selected === instance.id}">${escape(instance.name)} ${instance.mirrored ? '<span>mirrored</span>' : ''}</button><svg viewBox="${b.x-padding} ${b.y-padding} ${b.width+2*padding} ${b.height+2*padding}" role="group" aria-label="${escape(instance.name)} outline"><g transform="${transform}"><polygon class="board-fill" points="${piece.points.map(p => `${p.x},${p.y}`).join(' ')}"/>${piece.edges.map((edge, index) => {
      const ref = {instance:instance.id,edge:index}, key = edgeKey(ref), connection = used.get(key);
      const isFirst = key === firstKey, isSecond = key === secondKey, highlighted = isFirst || isSecond || connection?.seam.id === activeSeam;
      const color = isFirst ? '#19674b' : isSecond ? '#365bba' : connection ? seamColors[connection.index % seamColors.length] : '#818c81';
      const polyline = edge.points.map(p => `${p.x},${p.y}`).join(' '), middle = edge.points[Math.floor(edge.points.length/2)];
      const label = `${instance.name}, edge ${index+1}, ${formatLength(edgeLength(edge.points))}${connection ? `, joined in seam ${connection.index+1}` : ''}`;
      const endpoints = (isFirst || isSecond) ? [edge.points[0],edge.points.at(-1)!].map((p,i) => {
        const text = `${isFirst ? 'A' : 'B'}${isSecond && reverse ? 2-i : i+1}`;
        return `<g class="endpoint" transform="translate(${p.x},${p.y}) ${instance.mirrored ? 'scale(-1,1)' : ''}"><circle r="${stroke*2.6}" fill="${color}"/><text y="${-stroke*4.6}" font-size="${stroke*4.8}" text-anchor="middle">${text}</text></g>`;
      }).join('') : '';
      return `<g class="board-edge ${joining ? 'pickable' : ''} ${highlighted ? 'highlighted' : ''} ${connection ? 'joined' : ''}" data-edge-key="${escape(key)}" ${joining ? `tabindex="0" role="button" aria-label="${escape(label)}" aria-pressed="${isFirst || isSecond}"` : ''}><title>${escape(label)}</title><polyline points="${polyline}" class="edge-hit" stroke-width="${stroke*7}"/><polyline points="${polyline}" class="edge-visible" stroke="${color}" stroke-width="${stroke*(highlighted?2.7:connection?1.8:1)}"/><g class="edge-label" transform="translate(${middle.x},${middle.y}) ${instance.mirrored ? 'scale(-1,1)' : ''}"><circle r="${stroke*5.5}"/><text y="${stroke*1.8}" font-size="${stroke*5.3}" text-anchor="middle">${index+1}</text></g>${endpoints}</g>`;
    }).join('')}</g></svg><div class="board-piece-foot">${formatLength(b.width)} × ${formatLength(b.height)}${assembly.instances.length ? `<span>${instance.arranged ? 'Position set' : 'Not positioned'}</span>` : ''}</div></article>`;
  }).join('');
  host.querySelectorAll<HTMLButtonElement>('[data-select-piece]').forEach(button => button.onclick = () => options.onPiece(button.dataset.selectPiece!));
  if (joining) host.querySelectorAll<SVGElement>('[data-edge-key]').forEach(element => {
    const activate = () => { const [instance, edge] = element.dataset.edgeKey!.split(':'); options.onEdge({instance,edge:Number(edge)}); };
    element.onclick = e => { e.stopPropagation(); activate(); };
    element.onkeydown = e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); activate(); } };
  });
  if (focus) host.querySelector<SVGElement>(`[data-edge-key="${CSS.escape(focus)}"]`)?.focus({preventScroll:true});
}
