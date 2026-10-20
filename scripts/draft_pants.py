"""Original children's barrel overtrouser draft; all dimensions are centimetres.

Edit DESIGN and regenerate to rebalance constraints. This replaces the native file.
Commercial sewing-site research was blocked by the cloud network policy; this is
an original barrel-inspired construction, not a traced or verified commercial block.
"""
from pathlib import Path
import math
import xml.etree.ElementTree as E
from annotate_pattern import curve_length

ROOT=Path(__file__).resolve().parents[1]
OUT=ROOT/'patterns/children_pants_86'
DESIGN={
    'size':86, 'waist':50, 'hip':55, 'outseam':41, 'inseam':25,
    'front_waist':14.5, 'back_waist':16.5,
    'front_width':16.5, 'back_width':18,
    'front_rise_target':18, 'back_rise_target':23.5,
    'shell_length':40, 'hip_depth':8, 'hem_width':12.8,
    'barrel_bow':2, 'barrel_level':.56, 'hem_shift':1.5,
    'front_extension':2.75, 'back_extension':5.5,
    'band_height':3, 'cuff_height':3, 'waist_ratio':.94,
    'ankle':16, 'cuff_ease':2, 'sa':1,
}
DESCRIPTIONS={
    'front_waist':'Front shell waist edge, seam-walked',
    'back_waist':'Back shell waist CURVE, seam-walked',
    'front_width':'Front horizontal width at hip reference',
    'back_width':'Back horizontal width at hip reference',
    'front_rise_target':'Front centre stitching line excluding ribbing',
    'back_rise_target':'Back centre stitching line excluding ribbing',
    'shell_length':'Full curved shell side stitching line excluding bands',
    'barrel_bow':'Outward bow at broad upper-knee station; regenerate after edits',
    'barrel_level':'Bow station as fraction of shell vertical height',
    'hem_shift':'Horizontal outer-hem position relative to side waist',
    'hem_width':'Hem stitching-line width on EACH front and back piece',
    'outseam':'Dressed BODY waist-to-floor reference, not garment seam length',
    'inseam':'Dressed BODY crotch-to-floor VERTICAL reference, not seam length',
    'waist_ratio':'Relaxed rib loop / body waist; provisional',
    'ankle':'Estimated ankle; provisional',
}


def bisect(f,lo,hi):
    flo,fhi=f(lo),f(hi)
    assert flo<=0<=fhi, f'Unbracketed design constraint: {flo}, {fhi}'
    for _ in range(42):
        mid=(lo+hi)/2
        if f(mid)>0:hi=mid
        else:lo=mid
    return (lo+hi)/2


def at(c,t):
    return tuple((1-t)**3*c[0][i]+3*(1-t)**2*t*c[1][i]+3*(1-t)*t*t*c[2][i]+t**3*c[3][i] for i in (0,1))


def solve(v):
    def sides(h):
        k=v['barrel_level']*h;a=.12*h;b=v['barrel_bow'];x=v['hem_shift']
        return (((0,0),(0,.42*k),(-b,k-a),(-b,k)),
                ((-b,k),(-b,k+a),(x,h-.42*(h-k)),(x,h)))
    h=bisect(lambda h:sum(curve_length(c) for c in sides(h))-v['shell_length'],v['shell_length']*.7,v['shell_length'])
    side_upper,side_lower=sides(h)
    t=bisect(lambda t:at(side_upper,t)[1]-v['hip_depth'],0,1)
    hip_side=at(side_upper,t)
    def leg(pre,raise_):
        w=v['front_waist' if pre=='F' else 'back_waist']
        if pre=='B':
            wc=lambda x:((0,0),(x/3,0),(2*x/3,-raise_),(x,-raise_))
            wx=bisect(lambda x:curve_length(wc(x))-w,w-3,w)
            waist_curve=wc(wx)
        else:wx=w;waist_curve=None
        waist=(wx,-raise_);hip=(hip_side[0]+v['front_width' if pre=='F' else 'back_width'],v['hip_depth'])
        upper_curve=(waist,(waist[0],waist[1]+(hip[1]-waist[1])/3),(hip[0],hip[1]-(hip[1]-waist[1])/3),hip)
        upper=curve_length(upper_curve);ext=v['front_extension' if pre=='F' else 'back_extension']
        target=v['front_rise_target' if pre=='F' else 'back_rise_target']
        def scoop(drop):
            return (hip,(hip[0],hip[1]+.75*drop),(hip[0]+.3*ext,hip[1]+drop),(hip[0]+ext,hip[1]+drop))
        drop=bisect(lambda d:upper+curve_length(scoop(d))-target,.0001,target)
        crotch=scoop(drop)[-1];inner=(v['hem_shift']+v['hem_width'],h)
        run=crotch[0]-inner[0];dy=h-crotch[1]
        inside=(crotch,(crotch[0]-.45*run,crotch[1]+dy/3),(inner[0],inner[1]-dy/3),inner)
        points={'O':(0,0),'SideWaist':(0,0),'Waist':waist,'HipSide':hip_side,'Hip':hip,
                'Crotch':crotch,'InnerHem':inner,'OuterHem':(v['hem_shift'],h),'Barrel':side_upper[-1]}
        curves={'CentreUpper':upper_curve,'Crotch':scoop(drop),'Inseam':inside,'SideUpper':side_upper,'SideLower':side_lower}
        if waist_curve:curves['Waist']=waist_curve
        return points,curves
    front=leg('F',0)
    front_length=curve_length(front[1]['Inseam'])
    back_raise=bisect(lambda r:curve_length(leg('B',r)[1]['Inseam'])-front_length,1,5)
    back=leg('B',back_raise)
    return {'F':front,'B':back},h,back_raise


def sub(p,tag,**attrs):return E.SubElement(p,tag,{k:str(v) for k,v in attrs.items()})


def generate():
    OUT.mkdir(parents=True,exist_ok=True)
    pieces,height,back_raise=solve(DESIGN)
    r=E.Element('pattern')
    for tag,text in [('version','0.7.5'),('unit','cm'),('description','Size 86 barrel-inspired softshell overtrousers: full curved legs, rib waist and cuffs.'),
        ('notes','Original whole-leg redraft. Waist 62 cm, curved side 40 cm. Bow at upper knee, tapered shell opening 25.6 cm per leg. Native Beziers are editable; solved coordinates require regeneration for exact constraint balance. Previous straight-side cut pieces are not a guaranteed base for this shape. See README for research access limits and fitting notes.'),('measurements','')]:
        sub(r,tag).text=text
    vs=sub(r,'variables')
    for name,value in DESIGN.items():sub(vs,'variable',name='#'+name,formula=f'{value:.14g}',description=DESCRIPTIONS.get(name,name.replace('_',' ')))
    derived={'hip_finished':2*(DESIGN['front_width']+DESIGN['back_width']),
        'hip_ease':2*(DESIGN['front_width']+DESIGN['back_width'])-DESIGN['hip'],
        'hem':2*DESIGN['hem_width'],'rise':pieces['F'][0]['Crotch'][1],
        'back_raise':back_raise,'shell_vertical_height':height,
        'band_length':DESIGN['waist']*DESIGN['waist_ratio'],
        'cuff_length':DESIGN['ankle']+DESIGN['cuff_ease']}
    for name,value in derived.items():sub(vs,'variable',name='#'+name,formula=f'{value:.14g}',description='Solved result: '+name.replace('_',' '))
    uid=0
    def ident():
        nonlocal uid
        uid+=1;return uid
    for pre,title,origin in [('F','Front barrel - cut 2 mirrored',(7,8)),('B','Back barrel - cut 2 mirrored',(40,8)),('W','Waist rib - cut 1',(7,56)),('C','Cuff rib - cut 2',(7,72))]:
        d=sub(r,'draftBlock',name=title);calc=sub(d,'calculation');model=sub(d,'modeling');parts=sub(d,'pieces')
        ids={};curveids={}
        anchor=sub(calc,'point',id=ident(),type='single',name=pre+'Origin',x=origin[0],y=origin[1],mx='.2',my='.2').get('id')
        if pre in pieces:ps,cs=pieces[pre]
        else:
            length=derived['band_length' if pre=='W' else 'cuff_length'];rh=2*DESIGN['band_height' if pre=='W' else 'cuff_height']
            ps={'O':(0,0),'End':(length,0),'EndBottom':(length,rh),'Bottom':(0,rh),'FoldStart':(0,rh/2),'FoldEnd':(length,rh/2)};cs={}
        for name,(x,y) in ps.items():
            # Solved coordinates remain visible and editable in the Variables table.
            for axis,val in [('x',x),('y',y)]:sub(vs,'variable',name=f'#{pre}{name}_{axis}',formula=f'{val:.14g}',description='Solved coordinate; regenerate after design-input edits')
            hx=sub(calc,'point',id=ident(),type='endLine',name=pre+name+'X',basePoint=anchor,angle='0',length=f'#{pre}{name}_x',lineType='none',lineColor='black',mx='.2',my='.2').get('id')
            ids[name]=sub(calc,'point',id=ident(),type='endLine',name=pre+name,basePoint=hx,angle='270',length=f'#{pre}{name}_y',lineType='none',lineColor='black',mx='.2',my='.2').get('id')
        endpoints={'CentreUpper':('Waist','Hip'),'Crotch':('Hip','Crotch'),'Inseam':('Crotch','InnerHem'),'SideUpper':('SideWaist','Barrel'),'SideLower':('Barrel','OuterHem'),'Waist':('SideWaist','Waist')}
        for name,c in cs.items():
            a,b=endpoints[name]
            def handle(p,q):return -math.degrees(math.atan2(q[1]-p[1],q[0]-p[0]))%360,math.dist(p,q)
            a1,l1=handle(c[0],c[1]);a2,l2=handle(c[3],c[2])
            curveids[name]=sub(calc,'spline',id=ident(),type='simpleInteractive',point1=ids[a],point4=ids[b],
                angle1=f'{a1:.14g}',angle2=f'{a2:.14g}',length1=f'{l1:.14g}',length2=f'{l2:.14g}',color='black',penStyle='solidLine').get('id')
        def line(a,b,style='solidLine'):
            sub(calc,'line',id=ident(),firstPoint=ids[a],secondPoint=ids[b],lineType=style,lineColor='black')
        if pre in pieces:
            if pre=='F':line('SideWaist','Waist')
            line('InnerHem','OuterHem');line('HipSide','Hip','dashLine')
            outline=[('point',ids['SideWaist'],0)]
            if pre=='B':outline.append(('spline',curveids['Waist'],0))
            outline += [('point',ids['Waist'],0),('spline',curveids['CentreUpper'],0),('point',ids['Hip'],0),('spline',curveids['Crotch'],0),('point',ids['Crotch'],0),('spline',curveids['Inseam'],0),('point',ids['InnerHem'],0),('point',ids['OuterHem'],0),('spline',curveids['SideLower'],1),('point',ids['Barrel'],0),('spline',curveids['SideUpper'],1)]
            quantity=2
        else:
            for a,b in [('O','End'),('End','EndBottom'),('EndBottom','Bottom'),('Bottom','O')]:line(a,b)
            line('FoldStart','FoldEnd','dashLine');outline=[('point',ids[n],0) for n in ['O','End','EndBottom','Bottom']];quantity=1 if pre=='W' else 2
        nodes=[]
        for kind,ref,reverse in outline:
            mid=ident();attrs=dict(id=mid,idObject=ref,type='modeling' if kind=='point' else 'modelingSpline',inUse='true')
            if kind=='point':attrs.update(mx='.2',my='.2')
            sub(model,kind,**attrs);nodes.append((kind,mid,reverse))
        piece=sub(parts,'piece',id=ident(),version='2',name=title,mx='0',my='0',closed='1',seamAllowance='true',width='#sa',inLayout='true',forbidFlipping='false')
        label=sub(piece,'data',visible='true',fontSize='10',mx=origin[0]+3,my=origin[1]+4,width='10',height='5',rotation='0',quantity=quantity,onFold='false')
        for text in [title,'Size 86 / cm','Seam allowance enabled','Grain: vertical' if pre in pieces else 'Fold lengthwise at half height']:sub(label,'line',text=text)
        sub(piece,'patternInfo',visible='false')
        if pre in pieces:sub(piece,'grainline',visible='true',mx=origin[0]+7,my=origin[1]+20,length='10',rotation='90',arrows='0')
        else:sub(piece,'grainline',visible='false')
        ns=sub(piece,'nodes')
        for kind,mid,rev in nodes:sub(ns,'node',idObject=mid,type='NodePoint' if kind=='point' else 'NodeSpline',**({'reverse':str(rev)} if kind=='spline' else {}))
    E.indent(r);E.ElementTree(r).write(OUT/'children_pants_86.sm2d',encoding='UTF-8',xml_declaration=True)
    print('Solved vertical height',height,'back raise',back_raise)
    return r

if __name__=='__main__':generate()
