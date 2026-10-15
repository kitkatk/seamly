import { readFileSync } from 'node:fs';
import { describe, it, expect } from 'vitest';
import { parsePattern, parseMeasurements } from '../src/pattern';
const demo = readFileSync('public/examples/sleeveless-shell.sm2d', 'utf8');
const simple = (extra = '', length = '#width') => `<pattern><unit>cm</unit>${extra}<variables><variable name="#width" formula="waist/4"/></variables><draftBlock><calculation><point id="1" type="single" x="0" y="0"/><point id="2" type="endLine" basePoint="1" angle="0" length="${length}"/><point id="3" type="endLine" basePoint="2" angle="270" length="10"/></calculation><modeling><point id="11" idObject="1"/><point id="12" idObject="2"/><point id="13" idObject="3"/></modeling><pieces><piece id="20" name="Panel"><nodes><node idObject="11"/><node idObject="12"/><node idObject="13"/></nodes></piece></pieces></draftBlock></pattern>`;
describe('pattern and body measurement loading', () => {
  it('loads embedded measurements, outlines, quantities and selectable edges', () => {
    const pattern = parsePattern(demo); expect(pattern.pieces).toHaveLength(2); expect(pattern.warnings).toEqual([]);
    expect(pattern.measurements.rows).toHaveLength(4); expect(pattern.pieces[0].edges).toHaveLength(13);
    expect(pattern.pieces[0].points[9]).toEqual({x:370,y:620});
  });
  it('requires loading linked .smis and converts units for geometry', () => {
    const xml = simple('<measurements>../person.smis</measurements>');
    const missing = parsePattern(xml); expect(missing.pieces).toHaveLength(0); expect(missing.measurementPath).toBe('../person.smis');
    const measurements = parseMeasurements('<smis><unit>mm</unit><body-measurements><m name="waist" value="800"/><m name="@half" full_name="Half waist" value="waist/2"/></body-measurements></smis>', 'person.smis');
    expect(measurements.rows[1].value).toBe(400);
    const loaded = parsePattern(xml, measurements); expect(loaded.pieces[0].points[1].x).toBe(200); expect(loaded.variables[0].value).toBe(20);
    expect(loaded.measurements.rows).toHaveLength(0);
  });
  it('prioritizes embedded measurements and keeps variables separate', () => {
    const pattern = parsePattern(simple('<body-measurements><m name="waist" value="100"/></body-measurements>'), {unit:'cm',source:'external',rows:[{name:'waist',label:'Waist',formula:'80',description:'',value:80}]});
    expect(pattern.pieces[0].points[1].x).toBe(250); expect(pattern.variables).toHaveLength(1); expect(pattern.measurements.rows).toHaveLength(1);
  });
  it('reports unsupported geometry instead of fabricating a piece', () => {
    const pattern = parsePattern(simple('', '10').replace('type="endLine" basePoint="1"', 'type="unknownTool" basePoint="1"'));
    expect(pattern.pieces).toHaveLength(0); expect(pattern.warnings.join(' ')).toContain('Unsupported');
  });
  it('rejects malformed, wrong-root, entity and empty measurement documents', () => {
    for (const xml of ['<pattern>', '<smis/>', '<!DOCTYPE pattern><pattern/>']) expect(() => parsePattern(xml)).toThrow();
    expect(() => parseMeasurements('<smis/>', 'empty.smis')).toThrow();
    expect(() => parseMeasurements('<smis><unit>yard</unit><body-measurements><m name="x" value="1"/></body-measurements></smis>', 'bad.smis')).toThrow();
  });
  it('preserves unresolved measurement formulas without inventing a value', () => {
    const measurements = parseMeasurements('<smis><body-measurements><m name="x" value="missing+2"/></body-measurements></smis>', 'missing.smis');
    expect(measurements.rows[0].value).toBeUndefined(); expect(measurements.rows[0].error).toContain('missing');
  });
});
