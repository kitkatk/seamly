"""Generate an original, parameterised Seamly2D trouser block (centimetres)."""
from pathlib import Path
import xml.etree.ElementTree as ET
import math
from annotate_pattern import curve_length

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / 'patterns/children_pants_86'
def calibrated_shape(hip_width, waist_length, back_raise, hip_depth, extension, rise_target):
    """Calibrate a unit-length cubic, retaining the original crotch extensions."""
    waist_x = math.sqrt(waist_length**2-back_raise**2)
    upper = math.hypot(hip_width-waist_x, hip_depth+back_raise)
    target = rise_target-upper
    assert target > extension > 0
    def length(drop):
        return curve_length(((0,0),(0,.75*drop),(.3*extension,drop),(extension,drop)))
    lo,hi=0.0,rise_target
    for _ in range(60):
        mid=(lo+hi)/2
        if length(mid)<target:lo=mid
        else:hi=mid
    drop=(lo+hi)/2
    return extension/target,drop/target


# Shape ratios make the curve a scaled unit-length cubic. Editing rise targets
# inside Seamly2D therefore updates the actual seam lengths without an external solver.
FDX,FDY=calibrated_shape(16.5,16,0,8,2.75,18)
BDX,BDY=calibrated_shape(18,18,2,8,5.5,23.5)
# Formula order is significant in Seamly2D's Variables table.
VARIABLES = [
 ('size', '86', 'Nominal height size; label only, not automatic grading'),
 ('waist', '50', 'Measured body waist circumference'),
 ('hip', '55', 'Measured body hip circumference'),
 ('outseam', '41', 'Dressed body waistband to bare floor at side; reference only'),
 ('inseam', '25', 'Vertical crotch to floor measured OVER diaper and leggings; reference only'),
 ('front_rise_target', '18', 'Front seam-walked rise, excluding rib waistband and seam allowance'),
 ('back_rise_target', '23.5', 'Back seam-walked rise, excluding rib waistband and seam allowance'),
 ('front_waist', '16', 'Front piece waist stitching-line length'),
 ('back_waist', '18', 'Back piece waist stitching-line length, including its slope'),
 ('front_width', '16.5', 'Front piece horizontal hip width'),
 ('back_width', '18', 'Back piece horizontal hip width'),
 ('hem_width', '12.8', 'Hem stitching-line width on EACH front and back piece'),
 ('shell_length', '40', 'Main fabric side seam length, excluding waistband and cuff'),
 ('hip_depth', '8', 'Hip reference level below shell side waist'),
 ('band_height', '3', 'Finished folded waistband height'),
 ('cuff_height', '3', 'Finished folded ankle cuff height'),
 ('back_raise', '2', 'Centre back above side waist'),
 ('ankle', '16', 'PROVISIONAL ankle circumference; replace with measurement'),
 ('cuff_ease', '2', 'PROVISIONAL positive ankle ease for firm ribbing'),
 ('waist_ratio', '0.94', 'PROVISIONAL rib loop / body waist; verify recovery and hip passage'),
 ('sa', '1', 'Uniform seam allowance, cm'),
 ('hip_finished', '2*(#front_width+#back_width)', 'Full finished shell hip circumference'),
 ('hip_ease', '#hip_finished-#hip', 'Resulting total hip ease'),
 ('hem', '2*#hem_width', 'Shell opening circumference per leg'),
 ('front_waist_x', '#front_waist', 'Horizontal front waist projection'),
 ('back_waist_x', 'sqrt(#back_waist^2-#back_raise^2)', 'Horizontal back waist projection'),
 ('front_upper', 'sqrt((#front_width-#front_waist_x)^2+#hip_depth^2)', 'Straight centre front above crotch curve'),
 ('back_upper', 'sqrt((#back_width-#back_waist_x)^2+(#hip_depth+#back_raise)^2)', 'Straight centre back above crotch curve'),
 ('front_curve_length', '#front_rise_target-#front_upper', 'Required front crotch curve length'),
 ('back_curve_length', '#back_rise_target-#back_upper', 'Required back crotch curve length'),
 ('front_shape_dx', f'{FDX:.15g}', 'Calibrated curve horizontal unit-length ratio; do not edit'),
 ('front_shape_dy', f'{FDY:.15g}', 'Calibrated curve vertical unit-length ratio; do not edit'),
 ('back_shape_dx', f'{BDX:.15g}', 'Calibrated curve horizontal unit-length ratio; do not edit'),
 ('back_shape_dy', f'{BDY:.15g}', 'Calibrated curve vertical unit-length ratio; do not edit'),
 ('front_ext', '#front_curve_length*#front_shape_dx', 'Front crotch extension derived from target curve length'),
 ('back_ext', '#back_curve_length*#back_shape_dx', 'Back crotch extension derived from target curve length'),
 ('rise', '#hip_depth+#front_curve_length*#front_shape_dy', 'Front crotch-tip depth below shell side waist'),
 ('back_crotch_y', '#hip_depth+#back_curve_length*#back_shape_dy', 'Back crotch-tip depth below shell side waist'),
 ('front_run', '#front_width+#front_ext-#hem_width', 'Horizontal front inseam run'),
 ('back_run', '#back_width+#back_ext-#hem_width', 'Horizontal back inseam run'),
 ('front_inseam_length', 'sqrt((#shell_length-#rise)^2+#front_run^2)', 'Straight front inseam length'),
 ('back_lower_side', '#shell_length-#hip_depth', 'Back side length below hip reference'),
 ('back_circle_dy', '#back_crotch_y-#hip_depth', 'Circle-centre vertical separation for lower-leg balance'),
 ('back_circle_distance', 'sqrt(#back_run^2+#back_circle_dy^2)', 'Distance between lower-leg construction circle centres'),
 ('back_circle_a', '(#back_lower_side^2-#front_inseam_length^2+#back_circle_distance^2)/(2*#back_circle_distance)', 'Circle intersection projection'),
 ('back_circle_h', 'sqrt(#back_lower_side^2-#back_circle_a^2)', 'Circle intersection offset'),
 ('back_hem_x', '(#back_circle_a*#back_run-#back_circle_h*#back_circle_dy)/#back_circle_distance', 'Back outer hem horizontal shift; matches side and inseam lengths'),
 ('back_hem_y', '#hip_depth+(#back_circle_a*#back_circle_dy+#back_circle_h*#back_run)/#back_circle_distance', 'Back hem vertical position'),
 ('band_length', '#waist*#waist_ratio', 'Finished relaxed waistband loop, provisional'),
 ('cuff_length', '#ankle+#cuff_ease', 'Finished relaxed cuff loop, provisional'),
]



def sub(parent, tag, **attrs):
    return ET.SubElement(parent, tag, {k: str(v) for k, v in attrs.items()})


def generate():
    OUT.mkdir(parents=True, exist_ok=True)
    r = ET.Element('pattern')
    for tag, text in [('version', '0.7.5'), ('unit', 'cm'),
                      ('description', 'Size 86 roomy overtrousers; original draft; cut front/back mirrored pairs. Folded rib waistband and cuffs. Fit sample required.'),
                      ('notes', 'All inputs in Variables. No external measurement file. User revised seam targets: front/back rise 18/23.5, waist 16/18, hip width 16.5/18, each piece hem 12.8 cm. Main fabric sides fixed at 40 cm; lower back leg balanced to match inseams. Includes 3 cm waistband and 3 cm cuff. Measurements taken over diaper and leggings; cuffs at ankle. Rib lengths and ankle estimate provisional. Seam allowance 1 cm. See README.'),
                      ('measurements', '')]:
        sub(r, tag).text = text
    vs = sub(r, 'variables')
    for name, formula, desc in VARIABLES:
        sub(vs, 'variable', name='#'+name, formula=formula, description=desc)
    uid = 0
    def ident():
        nonlocal uid
        uid += 1
        return uid
    for prefix, title, width, ext, tip, raise_, origin in [
        ('F', 'Front - cut 2 mirrored', '#front_width', '#front_ext', '#rise', '0', (5, 8)),
        ('B', 'Back - cut 2 mirrored', '#back_width', '#back_ext', '#back_crotch_y', '#back_raise', (35, 8)),
        ('W', 'Waist rib - cut 1', '#band_length', None, None, None, (5, 52)),
        ('C', 'Ankle rib - cut 2', '#cuff_length', None, None, None, (5, 68)),
    ]:
        d = sub(r, 'draftBlock', name=title)
        calc, model, pieces = (sub(d, t) for t in ('calculation', 'modeling', 'pieces'))
        a = sub(calc, 'point', id=ident(), type='single', name=prefix+'O', x=origin[0], y=origin[1], mx='.2', my='.2')
        anchor = a.get('id')
        def point(name, x, y):
            # Separate horizontal and vertical endLine tools keep formulas directly editable.
            h = sub(calc, 'point', id=ident(), type='endLine', name=prefix+name+'X', basePoint=anchor,
                    angle='0', length=x, lineType='none', lineColor='black', mx='.2', my='.2')
            return sub(calc, 'point', id=ident(), type='endLine', name=prefix+name, basePoint=h.get('id'),
                       angle='270', length=y, lineType='none', lineColor='black', mx='.2', my='.2').get('id')
        def line(a,b,style='solidLine'):
            sub(calc,'line',id=ident(),firstPoint=a,secondPoint=b,lineType=style,lineColor='black')
        def curve(a,b,angle1,angle2,len1,len2):
            return sub(calc,'spline', id=ident(),type='simpleInteractive',point1=a,point4=b,
                       angle1=angle1,angle2=angle2,length1=len1,length2=len2,color='black',penStyle='solidLine').get('id')
        if ext:
            sw = anchor
            waist_x = '#front_waist_x' if prefix=='F' else '#back_waist_x'
            cw = point('Waist', waist_x, '-('+raise_+')')
            ch = point('Hip', width, '#hip_depth')
            ct = point('Crotch', width+'+'+ext, tip)
            hem_x = '0' if prefix=='F' else '#back_hem_x'
            hem_y = '#shell_length' if prefix=='F' else '#back_hem_y'
            ih = point('InnerHem', hem_x+'+#hem_width', hem_y)
            oh = point('OuterHem', hem_x, hem_y)
            # Smooth vertical centre-to-horizontal crotch scoop; endpoints remain editable.
            scoop = curve(ch,ct,'270','180', '('+tip+'-#hip_depth)*0.75', ext+'*0.7')
            hip_outer=point('HipSide','0','#hip_depth')
            line(sw,cw); line(cw,ch); line(ct,ih); line(ih,oh)
            line(oh,hip_outer); line(hip_outer,sw); line(hip_outer,ch,'dashLine')
            ga=point('GrainTop','#hem/4','#rise'); gb=point('GrainBottom','#hem/4','#shell_length-2');line(ga,gb,'dashLine')
            outline=[('point',sw),('point',cw),('point',ch),('spline',scoop),('point',ct),('point',ih),('point',oh),('point',hip_outer)]
            quantity=2
        else:
            height='2*#band_height' if prefix=='W' else '2*#cuff_height'
            b=point('End',width,'0'); c=point('EndBottom',width,height); e=point('Bottom','0',height)
            for u,v in [(anchor,b),(b,c),(c,e),(e,anchor)]:line(u,v)
            f1=point('FoldStart','0','('+height+')/2');f2=point('FoldEnd',width,'('+height+')/2');line(f1,f2,'dashLine')
            outline=[('point',anchor),('point',b),('point',c),('point',e)]
            quantity=1 if prefix=='W' else 2
        nodes=[]
        for kind, ref in outline:
            nodeid=ident()
            attrs=dict(id=nodeid,idObject=ref,type='modelingSpline' if kind=='spline' else 'modeling',inUse='true')
            if kind=='point': attrs.update(mx='.2',my='.2')
            sub(model,kind,**attrs)
            nodes.append((kind,nodeid))
        p=sub(pieces,'piece',id=ident(),version='2',name=title,mx='0',my='0',closed='1',
              seamAllowance='true',width='#sa',inLayout='true',forbidFlipping='false')
        data=sub(p,'data',visible='true',fontSize='10',mx=str(origin[0]+2),my=str(origin[1]+3),
                 width='10',height='5',rotation='0',quantity=quantity,onFold='false')
        for txt in [title,'Size 86 / cm','Seam allowance enabled','Fold lengthwise at half height' if not ext else 'Grain parallel to upper side']:
            sub(data,'line',text=txt)
        sub(p,'patternInfo',visible='false')
        if ext:
            sub(p,'grainline',visible='true',mx=str(origin[0]+6),my=str(origin[1]+18),length='10',rotation='90',arrows='0')
        else:
            sub(p,'grainline',visible='false')
        ns=sub(p,'nodes')
        for kind,nodeid in nodes:sub(ns,'node',idObject=nodeid,type='NodePoint' if kind=='point' else 'NodeSpline',**({'reverse':'0'} if kind=='spline' else {}))
    ET.indent(r)
    ET.ElementTree(r).write(OUT/'children_pants_86.sm2d',encoding='UTF-8',xml_declaration=True)
    return r

if __name__ == '__main__':
    generate()
    print(OUT/'children_pants_86.sm2d')
