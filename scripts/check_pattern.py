"""Check the actual generated XML, its formulas, geometry, and sewing dimensions."""
import argparse
import ast
import json
import math
import operator
from pathlib import Path
from lxml import etree as E

ROOT = Path(__file__).resolve().parents[1]
PATTERN = ROOT/'patterns/children_pants_86/children_pants_86.sm2d'
OPS = {ast.Add:operator.add, ast.Sub:operator.sub, ast.Mult:operator.mul,
       ast.Div:operator.truediv, ast.Pow:operator.pow}

def evaluate(text, variables):
    def visit(n):
        if isinstance(n,ast.Constant) and isinstance(n.value,(int,float)):return n.value
        if isinstance(n,ast.Name):return variables[n.id]
        if isinstance(n,ast.BinOp) and type(n.op) in OPS:return OPS[type(n.op)](visit(n.left),visit(n.right))
        if isinstance(n,ast.UnaryOp) and isinstance(n.op,ast.USub):return -visit(n.operand)
        if isinstance(n,ast.Call) and isinstance(n.func,ast.Name) and n.func.id=='sqrt' and len(n.args)==1:return math.sqrt(visit(n.args[0]))
        raise ValueError(f'Unsupported expression: {text}')
    result=visit(ast.parse(text.replace('#','').replace('^','**'),mode='eval').body)
    assert math.isfinite(result)
    return result


def check(path=PATTERN,schema=None):
    from annotate_pattern import load,curve_between,curve_length,curve_at,point_at_y
    doc=E.parse(str(path))
    if schema:E.XMLSchema(E.parse(str(schema))).assertValid(doc)
    v,blocks=load(path);measure={};angles={};side_curves={}
    allids=[n.get('id') for n in doc.findall('.//*[@id]')]
    assert len(allids)==len(set(allids)), 'Duplicate object IDs'
    assert len(doc.findall('.//piece'))==4
    def vec(a,b):return b[0]-a[0],b[1]-a[1]
    def unit_dot(a,b):return sum(x*y for x,y in zip(a,b))/(math.hypot(*a)*math.hypot(*b))
    for pre,(_,p,cs) in zip(('F','B'),blocks[:2]):
        c=lambda a,b:curve_between(p,cs,pre+a,pre+b)
        centre=c('Waist','Hip');scoop=c('Hip','Crotch');inside=c('Crotch','InnerHem')
        su=c('SideWaist','Barrel');sl=c('Barrel','OuterHem')
        wc=c('SideWaist','Waist') if pre=='B' else None
        waistlen=curve_length(wc) if wc else math.dist(p[pre+'SideWaist'],p[pre+'Waist'])
        rise=curve_length(centre)+curve_length(scoop)
        side=curve_length(su)+curve_length(sl)
        for q in cs:
            assert abs(curve_length(q)-curve_length(q,512))<1e-6, 'Curve integration did not converge'
            assert math.dist(q[0],q[1])>0 and math.dist(q[2],q[3])>0
        assert abs(rise-v['front_rise_target' if pre=='F' else 'back_rise_target'])<1e-6
        assert abs(waistlen-v['front_waist' if pre=='F' else 'back_waist'])<1e-6
        assert abs(side-v['shell_length'])<1e-6, 'Full curved side target missed'
        hipwidth=math.dist(p[pre+'HipSide'],p[pre+'Hip'])
        assert abs(hipwidth-v['front_width' if pre=='F' else 'back_width'])<1e-6
        assert abs(math.dist(p[pre+'OuterHem'],p[pre+'InnerHem'])-v['hem_width'])<1e-6
        waist_t=vec(wc[0],wc[1]) if wc else vec(p[pre+'SideWaist'],p[pre+'Waist'])
        dot=unit_dot(vec(su[0],su[1]),waist_t);assert abs(dot)<1e-10
        angles[pre]=math.degrees(math.acos(max(-1,min(1,dot))))
        assert unit_dot(vec(centre[2],centre[3]),vec(scoop[0],scoop[1]))>1-1e-10, 'Centre seam has a corner at hip'
        end_waist=vec(wc[2],wc[3]) if wc else waist_t
        assert abs(unit_dot(end_waist,vec(centre[0],centre[1])))<1e-10, 'Centre waist is not square'
        assert unit_dot(vec(su[2],su[3]),vec(sl[0],sl[1]))>1-1e-10, 'Side has a corner at barrel station'
        assert abs(unit_dot(vec(sl[2],sl[3]),vec(p[pre+'OuterHem'],p[pre+'InnerHem'])))<1e-10
        assert abs(unit_dot(vec(inside[2],inside[3]),vec(p[pre+'OuterHem'],p[pre+'InnerHem'])))<1e-10
        for q in (su,sl,inside,centre,scoop):
            assert all(q[i+1][1]>=q[i][1]-1e-10 for i in range(3))
            assert q[-1][1]>q[0][1], 'Curve reverses vertically'
        assert math.dist(point_at_y(su,p[pre+'HipSide'][1]),p[pre+'HipSide'])<1e-6
        knee_y=p[pre+'Barrel'][1]
        knee_width=point_at_y(inside,knee_y)[0]-p[pre+'Barrel'][0]
        assert knee_width>v['hem_width'], 'No knee-to-hem taper'
        for i in range(101):
            y=inside[0][1]+(inside[-1][1]-inside[0][1])*i/100
            out=su if y<=su[-1][1] else sl
            assert point_at_y(inside,y)[0]>point_at_y(out,y)[0], 'Leg edges cross'
        origin=p[pre+'O']
        side_curves[pre]=[tuple((x-origin[0],y-origin[1]) for x,y in q) for q in (su,sl)]
        measure[pre]={'waist':waistlen,'hip':hipwidth,'rise':rise,'side':side,'inseam':curve_length(inside),'knee':knee_width}
    for a,b in zip(side_curves['F'],side_curves['B']):
        for x,y in zip(a,b):assert math.dist(x,y)<1e-7, 'Front/back side shapes do not match'
    assert abs(measure['F']['inseam']-measure['B']['inseam'])<1e-6
    for block in doc.findall('draftBlock'):
        calc={n.get('id') for n in block.find('calculation')};models={n.get('id'):n for n in block.find('modeling')}
        for n in models.values():assert n.get('idObject') in calc
        for piece in block.find('pieces'):
            assert piece.get('seamAllowance')=='true' and evaluate(piece.get('width'),v)==v['sa']
            for n in piece.findall('./nodes/node'):assert n.get('idObject') in models
    shellwaist=sum(m['waist'] for m in measure.values())*2
    return {
        'shell_waist_circumference_cm':round(shellwaist,3),
        'hip_circumference_cm':round(2*sum(m['hip'] for m in measure.values()),3),
        'shell_side_seam_cm':round(measure['F']['side'],3),
        'developed_total_side_cm':round(measure['F']['side']+v['band_height']+v['cuff_height'],3),
        'shell_vertical_height_cm':round(v['shell_vertical_height'],3),
        'matching_curved_inseam_cm':round(measure['F']['inseam'],3),
        'front_rise_seam_cm':round(measure['F']['rise'],3),'back_rise_seam_cm':round(measure['B']['rise'],3),
        'front_waist_seam_cm':round(measure['F']['waist'],3),'back_waist_seam_cm':round(measure['B']['waist'],3),
        'front_hip_width_cm':round(measure['F']['hip'],3),'back_hip_width_cm':round(measure['B']['hip'],3),
        'hem_width_each_piece_cm':v['hem_width'],'shell_leg_opening_cm':v['hem'],
        'barrel_station_leg_circumference_cm':round(sum(m['knee'] for m in measure.values()),3),
        'barrel_station_depth_cm':round(v['barrel_level']*v['shell_vertical_height'],3),
        'front_waist_side_angle_degrees':round(angles['F'],6),'back_waist_side_angle_degrees':round(angles['B'],6),
        'back_raise_cm':round(v['back_raise'],3),
        'waist_rib_cut_cm':[v['band_length']+2*v['sa'],2*v['band_height']+2*v['sa']],
        'cuff_rib_cut_cm':[v['cuff_length']+2*v['sa'],2*v['cuff_height']+2*v['sa']],
        'waist_rib_stretch_to_attach_percent':round((shellwaist/v['band_length']-1)*100,1),
        'cuff_rib_stretch_to_attach_percent':round((v['hem']/v['cuff_length']-1)*100,1),
    }

if __name__=='__main__':
    parser=argparse.ArgumentParser()
    parser.add_argument('--schema',type=Path,help='Optional upstream Seamly2D v0.7.5.xsd')
    args=parser.parse_args()
    result=check(schema=args.schema)
    print(json.dumps(result,indent=2))
    (PATTERN.parent/'dimensions.json').write_text(json.dumps(result,indent=2)+'\n')
