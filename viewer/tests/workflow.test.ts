import { describe, expect, it } from 'vitest';
import { emptyAssembly } from '../src/assembly';
import type { Piece } from '../src/pattern';
import { addSeam, applyPreset, canVisit, copyChoices, History, prepareCopies, suggestedReverse, unusedEdges } from '../src/workflow';
const panel: Piece = {id:'front',name:'Front',quantity:2,points:[{x:0,y:0},{x:100,y:0},{x:100,y:100},{x:0,y:100}],edges:[{name:'Top',points:[{x:0,y:0},{x:100,y:0}]},{name:'Right',points:[{x:100,y:0},{x:100,y:100}]}]};
const back: Piece = {...panel,id:'back',name:'Back',quantity:1};
describe('guided assembly workflow', () => {
  it('requires prepared and positioned pieces before joining, and a seam before preview', () => {
    let assembly = emptyAssembly();
    expect(canVisit(0,assembly)).toBe(true); expect(canVisit(1,assembly)).toBe(false);
    assembly = prepareCopies(assembly,[panel],copyChoices([panel]));
    expect(canVisit(1,assembly)).toBe(true); expect(canVisit(2,assembly)).toBe(false);
    applyPreset(assembly.instances[0],panel,'front',assembly);
    expect(canVisit(2,assembly)).toBe(false);
    applyPreset(assembly.instances[1],panel,'back',assembly);
    expect(canVisit(2,assembly)).toBe(true); expect(canVisit(3,assembly)).toBe(false);
    addSeam(assembly,{instance:assembly.instances[0].id,edge:0},{instance:assembly.instances[1].id,edge:0},true);
    expect(canVisit(3,assembly)).toBe(true);
  });
  it('uses source cut quantities and explicit mirroring choices, not guesses from piece names', () => {
    const choices = copyChoices([panel,back]);
    expect(choices.front).toEqual({count:2,mirroredPairs:false});
    choices.front.mirroredPairs = true;
    const assembly = prepareCopies(emptyAssembly(),[panel,back],choices);
    expect(assembly.instances.map(i=>i.mirrored)).toEqual([false,true,false]);
    expect(assembly.instances.map(i=>i.name)).toEqual(['Front 1','Front 2','Back 1']);
  });
  it('retains placements, manual mirroring and surviving seams when revisiting quantities', () => {
    let assembly = prepareCopies(emptyAssembly(),[panel,back],copyChoices([panel,back]));
    const id=assembly.instances[0].id, lastId=assembly.instances[2].id;
    assembly.instances[0].mirrored=true;assembly.instances[0].arranged=true;assembly.instances[0].position=[1,2,3];
    addSeam(assembly,{instance:id,edge:0},{instance:lastId,edge:0},false);
    let choices=copyChoices([panel,back],assembly);
    assembly=prepareCopies(assembly,[panel,back],choices);
    expect(assembly.instances[0]).toMatchObject({id,mirrored:true,arranged:true,position:[1,2,3]});
    expect(assembly.seams).toHaveLength(1);
    choices=copyChoices([panel,back],assembly);choices.back.count=0;
    assembly=prepareCopies(assembly,[panel,back],choices);
    expect(assembly.instances).toHaveLength(2);expect(assembly.seams).toHaveLength(0);
  });
  it('rejects invalid copy totals before changing the workspace', () => {
    for(const count of [0,41,-1,1.5]) expect(()=>prepareCopies(emptyAssembly(),[panel],{front:{count,mirroredPairs:false}})).toThrow();
  });
  it('supports undo/redo without keeping mutable references or a stale redo branch', () => {
    const history=new History<{value:number}>();const initial={value:1};history.checkpoint(initial,'Move');initial.value=99;
    expect(history.undo({value:2})?.value.value).toBe(1);
    expect(history.redo({value:1})?.value.value).toBe(2);
    history.undo({value:2});history.checkpoint({value:1},'New seam');expect(history.canRedo).toBe(false);
  });
  it('does not allow sewing an edge to itself or using it twice', () => {
    const assembly=prepareCopies(emptyAssembly(),[panel],copyChoices([panel]));
    const a={instance:assembly.instances[0].id,edge:0},b={instance:assembly.instances[1].id,edge:0};
    expect(()=>addSeam(assembly,a,a,false)).toThrow(/different edge/);
    addSeam(assembly,a,b,true);
    expect(unusedEdges(assembly,[panel])).toHaveLength(2);
    expect(()=>addSeam(assembly,a,{...b,edge:1},false)).toThrow(/already belongs/);
  });
  it('suggests end matching based on current 3D placement', () => {
    const assembly=prepareCopies(emptyAssembly(),[panel],copyChoices([panel]));
    const [a,b]=assembly.instances;a.position=b.position=[0,0,0];
    const first={instance:a.id,edge:0},second={instance:b.id,edge:0};
    expect(suggestedReverse(first,second,assembly,[panel])).toBe(false);
    b.mirrored=true;expect(suggestedReverse(first,second,assembly,[panel])).toBe(true);
  });
});
