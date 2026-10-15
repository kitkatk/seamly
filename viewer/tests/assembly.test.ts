import { describe, it, expect } from 'vitest';
import { createInstance, distance, emptyAssembly, place, sampleEdge, stitch, validateAssembly, type Cloth } from '../src/assembly';
import type { Piece } from '../src/pattern';
const piece: Piece = {id:'1',name:'Panel',quantity:2,points:[{x:0,y:0},{x:100,y:0},{x:100,y:100}],edges:[{name:'Edge 1',points:[{x:0,y:0},{x:100,y:0}]}]};
describe('manual garment assembly', () => {
  it('applies mirroring, rotation, curvature and placement', () => {
    const instance = createInstance(piece, 0); instance.position = [20,10,5];
    expect(place({x:0,y:0},piece,instance)).toEqual([-30,60,5]);
    instance.mirrored = true; expect(place({x:0,y:0},piece,instance)).toEqual([70,60,5]);
    instance.wrap = 180; expect(place({x:0,y:0},piece,instance)[2]).toBeGreaterThan(5);
  });
  it('samples curved seams by arc length', () => {
    expect(sampleEdge([{x:0,y:0},{x:10,y:0},{x:10,y:10}], 3)).toEqual([{x:0,y:0},{x:10,y:0},{x:10,y:10}]);
  });
  it('closes paired boundaries while retaining panel length', () => {
    const cloth = (z: number): Cloth => ({positions:[[0,0,z],[100,0,z]],initial:[[0,0,z],[100,0,z]],triangles:[],constraints:[[0,1,100]],edges:[[0,1]]});
    const a=cloth(40),b=cloth(-40);
    stitch(new Map([['a',a],['b',b]]), [{id:'s',a:{instance:'a',edge:0},b:{instance:'b',edge:0},reverse:false}], 60, .9);
    expect(distance(a.positions[0],b.positions[0])).toBeLessThan(.01); expect(distance(a.positions[0],a.positions[1])).toBeCloseTo(100);
  });
  it('round trips setups and rejects mismatched or reused edges', () => {
    const setup=emptyAssembly();setup.instances=[createInstance(piece,0),createInstance(piece,1)];
    setup.seams=[{id:'s',a:{instance:setup.instances[0].id,edge:0},b:{instance:setup.instances[1].id,edge:0},reverse:true}];
    expect(validateAssembly(JSON.parse(JSON.stringify(setup)),[piece])).toEqual(setup); expect(() => validateAssembly(setup,[])).toThrow();
    setup.seams.push({...setup.seams[0],id:'s2'}); expect(() => validateAssembly(setup,[piece])).toThrow();
    setup.seams.pop(); setup.seams[0].id = '<script>';
    expect(() => validateAssembly(setup,[piece])).toThrow();
  });
});
