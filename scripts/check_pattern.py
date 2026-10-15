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


def check(path=PATTERN, schema=None):
    doc=E.parse(str(path))
    if schema:E.XMLSchema(E.parse(str(schema))).assertValid(doc)
    variables={}
    for v in doc.findall('.//variables/variable'):
        variables[v.get('name')[1:]]=evaluate(v.get('formula'),variables)
    points={}; names={}; curves={}; ids=[]
    def polar(p,angle,length):
        a=math.radians(angle)
        return (p[0]+length*math.cos(a),p[1]-length*math.sin(a))
    for block in doc.findall('draftBlock'):
        for item in block.find('calculation'):
            id_=item.get('id'); ids.append(id_)
            if item.tag=='point':
                if item.get('type')=='single':p=(float(item.get('x')),float(item.get('y')))
                else:p=polar(points[item.get('basePoint')],evaluate(item.get('angle'),variables),evaluate(item.get('length'),variables))
                points[id_]=p;names[item.get('name')]=p
            elif item.tag=='spline':
                a,b=points[item.get('point1')],points[item.get('point4')]
                curves[id_]=(a,polar(a,evaluate(item.get('angle1'),variables),evaluate(item.get('length1'),variables)),polar(b,evaluate(item.get('angle2'),variables),evaluate(item.get('length2'),variables)),b)
        for item in block.find('modeling'):
            ids.append(item.get('id'))
            assert item.get('idObject') in (points if item.tag=='point' else curves)
        for piece in block.find('pieces'):
            ids.append(piece.get('id'))
            assert piece.get('seamAllowance')=='true'
            assert evaluate(piece.get('width'),variables)==variables['sa']
            models={x.get('id'):x for x in block.find('modeling')}
            assert all(x.get('idObject') in models for x in piece.findall('./nodes/node'))
    assert len(ids)==len(set(ids)), 'Duplicate object IDs'
    assert len(doc.findall('.//piece'))==4
    distance=math.dist
    front=distance(names['FCrotch'],names['FInnerHem'])
    back=distance(names['BCrotch'],names['BInnerHem'])
    assert abs(front-back)<1e-8, 'Inseams do not match'
    side_f=distance(names['FO'],names['FOuterHem'])
    side_b=distance(names['BO'],names['BOuterHem'])
    assert abs(side_f-side_b)<1e-8
    assert side_f>variables['rise'] and side_f>variables['back_crotch_y'], 'Hem must be below crotch tips'
    hip=2*(distance(names['FHipSide'],names['FHip'])+distance(names['BHipSide'],names['BHip']))
    assert abs(hip-variables['hip']-variables['hip_ease'])<1e-8
    shell_waist=2*(distance(names['FO'],names['FWaist'])+distance(names['BO'],names['BWaist']))
    for p in ('F','B'):
        assert names[p+'InnerHem'][1]>names[p+'Crotch'][1]>names[p+'Hip'][1]
    from annotate_pattern import curve_length
    contours = {}
    for prefix, target in [('F','front_rise_target'),('B','back_rise_target')]:
        arc = next(c for c in curves.values() if math.dist(c[0],names[prefix+'Hip'])<1e-8)
        rise = distance(names[prefix+'Waist'],names[prefix+'Hip']) + curve_length(arc)
        assert abs(rise-variables[target])<1e-6, 'Seam-walked rise target not met'
        assert abs(distance(names[prefix+'O'],names[prefix+'Waist'])-variables['front_waist' if prefix=='F' else 'back_waist'])<1e-8
        assert abs(distance(names[prefix+'HipSide'],names[prefix+'Hip'])-variables['front_width' if prefix=='F' else 'back_width'])<1e-8
        assert abs(distance(names[prefix+'OuterHem'],names[prefix+'InnerHem'])-variables['hem_width'])<1e-8
        contours[prefix]=rise
    result={
        'hip_circumference_cm':round(hip,3), 'shell_waist_circumference_cm':round(shell_waist,3),
        'finished_side_length_cm':round(side_f+variables['band_height']+variables['cuff_height'],3),
        'matching_inseam_seam_length_cm':round(front,3),
        'front_rise_seam_cm':round(contours['F'],3),
        'back_rise_seam_cm':round(contours['B'],3),
        'front_waist_seam_cm':variables['front_waist'],
        'back_waist_seam_cm':variables['back_waist'],
        'front_hip_width_cm':variables['front_width'],
        'back_hip_width_cm':variables['back_width'],
        'hem_width_each_piece_cm':variables['hem_width'],
        'shell_side_seam_cm':round(side_f,3),
        'front_crotch_depth_from_finished_side_waist_cm':variables['rise']+variables['band_height'],
        'upper_thigh_circumference_at_tips_cm':round(variables['front_width']+variables['front_ext']+variables['back_width']+variables['back_ext'],3),
        'shell_leg_opening_cm':variables['hem'],
        'waist_rib_cut_cm':[variables['band_length']+2*variables['sa'],2*variables['band_height']+2*variables['sa']],
        'cuff_rib_cut_cm':[variables['cuff_length']+2*variables['sa'],2*variables['cuff_height']+2*variables['sa']],
        'waist_rib_stretch_to_attach_percent':round((shell_waist/variables['band_length']-1)*100,1),
        'waist_rib_stretch_to_pass_body_hip_percent':round((variables['hip']/variables['band_length']-1)*100,1),
        'cuff_rib_stretch_to_attach_percent':round((variables['hem']/variables['cuff_length']-1)*100,1),
    }
    return result

if __name__=='__main__':
    parser=argparse.ArgumentParser()
    parser.add_argument('--schema',type=Path,help='Optional upstream Seamly2D v0.7.5.xsd')
    args=parser.parse_args()
    result=check(schema=args.schema)
    print(json.dumps(result,indent=2))
    (PATTERN.parent/'dimensions.json').write_text(json.dumps(result,indent=2)+'\n')
