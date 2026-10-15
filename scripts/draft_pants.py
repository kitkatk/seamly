"""Generate an original, parameterised Seamly2D trouser block (centimetres)."""
from pathlib import Path
import xml.etree.ElementTree as ET

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / 'patterns/children_pants_86'
# Formula order is significant in Seamly2D's Variables table.
VARIABLES = [
 ('size', '86', 'Nominal height size; label only, not automatic grading'),
 ('waist', '50', 'Measured waist circumference'),
 ('hip', '55', 'Measured hip circumference'),
 ('outseam', '41', 'Dressed body waistband to bare floor at side; garment length derived separately'),
 ('inseam', '25', 'Vertical crotch to floor measured OVER diaper and leggings, NOT seam length'),
 ('hip_ease', '10', 'Total hip ease for an outer layer over leggings'),
 ('crotch_drop', '2', 'Baseline crotch drop beyond dressed body rise'),
 ('rise_ease', '1', 'Additional rise ease for sitting and squatting'),
 ('leg_ease', '2', 'Additional length relative to floor-based draft; ankle blousing checked at fitting'),
 ('band_height', '3', 'Finished folded waistband height'),
 ('cuff_height', '3', 'Finished folded ankle cuff height'),
 ('back_raise', '2', 'Extra height at centre back, tapered to zero at side'),
 ('hem', '24', 'Shell opening circumference per leg, before gathering'),
 ('ankle', '16', 'PROVISIONAL ankle circumference; replace with measurement'),
 ('cuff_ease', '2', 'PROVISIONAL positive ankle ease for firm ribbing'),
 ('waist_ratio', '0.94', 'PROVISIONAL rib loop / body waist; verify recovery and hip passage'),
 ('sa', '1', 'Uniform seam allowance added by Seamly2D, cm'),
 ('hip_finished', '#hip+#hip_ease', 'Finished circumference at hip'),
 ('front_width', '#hip_finished/4-0.5', 'Front quarter hip width'),
 ('back_width', '#hip_finished/4+0.5', 'Back quarter hip width'),
 ('front_ext', '#hip/20', 'Front crotch extension beyond centre front'),
 ('back_ext', '#hip/10', 'Back crotch extension beyond centre back'),
 ('rise', '#outseam-#inseam+#crotch_drop+#rise_ease-#band_height', 'Shell side waist to front crotch level'),
 ('shell_length', '#outseam+#rise_ease+#leg_ease-#band_height-#cuff_height', 'Exact vertical shell side seam length'),
 ('front_run', '#front_width+#front_ext-#hem/2', 'Horizontal front inseam run'),
 ('back_run', '#back_width+#back_ext-#hem/2', 'Horizontal back inseam run'),
 ('back_crotch_y', '#shell_length-sqrt((#shell_length-#rise)^2+#front_run^2-#back_run^2)', 'Lower back tip to match straight inseam seam lengths'),
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
                      ('notes', 'All inputs in Variables. No external measurement file. Hip ease 10 cm. 44 cm developed side length: 41 cm body reference plus 1 cm rise ease and 2 cm leg blousing. Includes 3 cm waistband and 3 cm cuff. Measurements taken over diaper and leggings; cuffs at ankle. Rib lengths and ankle estimate provisional. Seam allowance 1 cm. See README.'),
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
            cw = point('Waist', width, '-('+raise_+')')
            ch = point('Hip', width, '#rise*0.5')
            ct = point('Crotch', width+'+'+ext, tip)
            ih = point('InnerHem', '#hem/2', '#shell_length')
            oh = point('OuterHem', '0', '#shell_length')
            # Smooth vertical centre-to-horizontal crotch scoop; endpoints remain editable.
            scoop = curve(ch,ct,'270','180', '('+tip+'-#rise*0.5)*0.75', ext+'*0.7')
            line(sw,cw); line(cw,ch); line(ct,ih); line(ih,oh); line(oh,sw)
            hip_outer=point('HipSide','0','#rise*0.5'); line(hip_outer,ch,'dashLine')
            ga=point('GrainTop','#hem/4','#rise'); gb=point('GrainBottom','#hem/4','#shell_length-2');line(ga,gb,'dashLine')
            outline=[('point',sw),('point',cw),('point',ch),('spline',scoop),('point',ct),('point',ih),('point',oh)]
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
        for txt in [title,'Size 86 / cm','Seam allowance enabled','Fold lengthwise at half height' if not ext else 'Grain parallel to side seam']:
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
