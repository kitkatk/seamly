import { afterEach, describe, expect, it, vi } from 'vitest';
import { renderBoard } from '../src/board';
import { emptyAssembly } from '../src/assembly';
import { copyChoices, prepareCopies } from '../src/workflow';
import type { Piece } from '../src/pattern';
const piece: Piece = {id:'panel',name:'Front',quantity:2,points:[{x:0,y:0},{x:100,y:0},{x:100,y:100}],edges:[{name:'Top',points:[{x:0,y:0},{x:100,y:0}]},{name:'Side',points:[{x:100,y:0},{x:100,y:100}]}]};
afterEach(()=>document.body.replaceChildren());
describe('flat view seam interaction',()=>{
  it('provides named edges that can be activated using Enter or Space',()=>{
    const host=document.createElement('div');document.body.append(host);
    const assembly=prepareCopies(emptyAssembly(),[piece],copyChoices([piece]));const onEdge=vi.fn();
    renderBoard(host,{pieces:[piece],assembly,selected:'',joining:true,reverse:false,onPiece:vi.fn(),onEdge});
    const edge=host.querySelector<SVGElement>('[data-edge-key]')!;
    expect(edge.getAttribute('role')).toBe('button');expect(edge.getAttribute('tabindex')).toBe('0');
    expect(edge.getAttribute('aria-label')).toContain('Front 1, edge 1, 10 cm');
    edge.dispatchEvent(new KeyboardEvent('keydown',{key:'Enter',bubbles:true}));edge.dispatchEvent(new KeyboardEvent('keydown',{key:' ',bubbles:true}));
    expect(onEdge).toHaveBeenCalledTimes(2);expect(onEdge).toHaveBeenLastCalledWith({instance:assembly.instances[0].id,edge:0});
  });
  it('labels the paired endpoints so reversed sewing is understandable without colour',()=>{
    const host=document.createElement('div'),assembly=prepareCopies(emptyAssembly(),[piece],copyChoices([piece]));
    const first={instance:assembly.instances[0].id,edge:0},second={instance:assembly.instances[1].id,edge:0};
    renderBoard(host,{pieces:[piece],assembly,selected:'',joining:true,first,second,reverse:true,onPiece:vi.fn(),onEdge:vi.fn()});
    expect(Array.from(host.querySelectorAll('.endpoint text')).map(e=>e.textContent)).toEqual(['A1','A2','B2','B1']);
    expect(host.querySelectorAll('[aria-pressed="true"][data-edge-key]')).toHaveLength(2);
  });
  it('identifies already joined edges for review instead of presenting them as unused',()=>{
    const host=document.createElement('div'),assembly=prepareCopies(emptyAssembly(),[piece],copyChoices([piece]));
    assembly.seams=[{id:'seam',a:{instance:assembly.instances[0].id,edge:0},b:{instance:assembly.instances[1].id,edge:1},reverse:false}];
    renderBoard(host,{pieces:[piece],assembly,selected:'',joining:true,reverse:false,onPiece:vi.fn(),onEdge:vi.fn()});
    expect(host.querySelectorAll('.joined')).toHaveLength(2);expect(host.querySelector('.joined')?.getAttribute('aria-label')).toContain('joined in seam 1');
  });
});
