"""Read a native pattern and render a dimensioned review sheet. Never changes .sm2d."""
import argparse
import json
import math
from pathlib import Path
from xml.etree import ElementTree as E
from html import escape
from check_pattern import evaluate, PATTERN


def load(path):
    doc=E.parse(path); v={}; blocks=[]
    assert doc.findtext('unit')=='cm', 'This review sheet expects centimetres'
    def polar(p,a,l):
        a=math.radians(a);return p[0]+l*math.cos(a),p[1]-l*math.sin(a)
    for n in doc.findall('./variables/variable'):
        v[n.get('name').lstrip('#')]=evaluate(n.get('formula'),v)
    for b in doc.findall('draftBlock'):
        p={};ids={};cs=[]
        for n in b.find('calculation'):
            if n.tag=='point':
                assert n.get('type') in ('single','endLine'), 'Unsupported point construction'
                q=(float(n.get('x')),float(n.get('y'))) if n.get('type')=='single' else polar(ids[n.get('basePoint')],evaluate(n.get('angle'),v),evaluate(n.get('length'),v))
                ids[n.get('id')]=q;p[n.get('name')]=q
            if n.tag=='spline':
                assert n.get('type')=='simpleInteractive', 'Only the draft simple Bezier curves are supported'
                a,z=ids[n.get('point1')],ids[n.get('point4')]
                c=(a,polar(a,evaluate(n.get('angle1'),v),evaluate(n.get('length1'),v)),polar(z,evaluate(n.get('angle2'),v),evaluate(n.get('length2'),v)),z)
                cs.append(c)
        blocks.append((b.get('name'),p,cs))
    return v,blocks


def curve_length(c,n=1024):
    def speed(t):
        d=[3*(1-t)**2*(c[1][i]-c[0][i])+6*(1-t)*t*(c[2][i]-c[1][i])+3*t*t*(c[3][i]-c[2][i]) for i in (0,1)]
        return math.hypot(*d)
    return (speed(0)+speed(1)+sum((4 if i%2 else 2)*speed(i/n) for i in range(1,n)))/(3*n)


def render(path,output):
    v,blocks=load(path); measures={};svg=[]
    def add(s):svg.append(s)
    def text(x,y,t,size=15,color='#24344a',anchor='start'):
        add(f'<text x="{x:.2f}" y="{y:.2f}" font-size="{size}" fill="{color}" text-anchor="{anchor}">{escape(t)}</text>')
    def line(a,b,color='#24344a',dash=False,width=1.5):
        add(f'<path d="M {a[0]:.3f},{a[1]:.3f} L {b[0]:.3f},{b[1]:.3f}" fill="none" stroke="{color}" stroke-width="{width}"'+(' stroke-dasharray="5 4"' if dash else '')+'/>')
    def dim(a,b,label,offset):
        # Parallel dimension displaced from measured edge, with extension lines.
        dx,dy=b[0]-a[0],b[1]-a[1]; length=math.hypot(dx,dy)
        nx,ny=-dy/length*offset,dx/length*offset
        aa=(a[0]+nx,a[1]+ny);bb=(b[0]+nx,b[1]+ny)
        line(a,aa,'#98a7b9',width=.8);line(b,bb,'#98a7b9',width=.8)
        add(f'<path d="M {aa[0]},{aa[1]} L {bb[0]},{bb[1]}" stroke="#2563a6" fill="none" marker-start="url(#arrow)" marker-end="url(#arrow)"/>')
        x,y=(aa[0]+bb[0])/2,(aa[1]+bb[1])/2
        angle=math.degrees(math.atan2(dy,dx))
        if angle>90 or angle< -90:angle+=180
        add(f'<text transform="translate({x:.2f},{y:.2f}) rotate({angle:.2f})" y="-7" text-anchor="middle" fill="#2563a6" font-size="14">{escape(label)}</text>')
    add('<svg xmlns="http://www.w3.org/2000/svg" width="1400" height="1020" viewBox="0 0 1400 1020">')
    add('<defs><marker id="arrow" viewBox="0 0 10 10" refX="5" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse"><path d="M 10 0 L 0 5 L 10 10" fill="none" stroke="#2563a6"/></marker></defs>')
    add('<rect width="1400" height="1020" fill="white"/><g font-family="DejaVu Sans, sans-serif">')
    text(45,38,f"SIZE {v['size']:g}  |  Dimensioned pattern review",26)
    text(45,66,f"All dimensions in cm on STITCHING lines. {v['sa']:g} cm seam allowance is excluded from the shell drawing.",16)
    text(45,89,'Snapshot of the supplied .sm2d file; regenerate after edits. Review sheet — do not use as a cutting layout.',14)
    for idx,(title,p,cs) in enumerate(blocks[:2]):
        pre='F' if idx==0 else 'B';origin=p[pre+'O'];ox=110+idx*390;oy=160;scale=10.5
        def xy(q):return ox+(q[0]-origin[0])*scale,oy+(q[1]-origin[1])*scale
        def point(s):return xy(p[pre+s])
        sw,cw,ch,ct,ih,oh=[point(s) for s in ['O','Waist','Hip','Crotch','InnerHem','OuterHem']]
        c=cs[0]; cv=[xy(q) for q in c]
        d=f'M {sw[0]},{sw[1]} L {cw[0]},{cw[1]} L {ch[0]},{ch[1]} C {cv[1][0]},{cv[1][1]} {cv[2][0]},{cv[2][1]} {ct[0]},{ct[1]} L {ih[0]},{ih[1]} L {oh[0]},{oh[1]} Z'
        add(f'<path d="{d}" fill="#eef5f0" stroke="#24344a" stroke-width="2"/>')
        for label,pos in [('O',sw),('Waist',cw),('Hip',ch),('Crotch',ct),('InnerHem',ih),('OuterHem',oh)]:
            add(f'<circle cx="{pos[0]}" cy="{pos[1]}" r="2.5" fill="#24344a"/>')
            if label in ('Waist','Hip','Crotch'):text(pos[0]+5,pos[1]-5,pre+label,11)
        text(ox+12,oy+38,'FRONT' if idx==0 else 'BACK',20)
        def dist(a,b):return math.dist(p[pre+a],p[pre+b])
        lens={'waist':dist('O','Waist'),'upper_centre':dist('Waist','Hip'),'crotch_curve':curve_length(c),
              'inseam':dist('Crotch','InnerHem'),'hem':dist('InnerHem','OuterHem'),'side':dist('OuterHem','O'),
              'hip_width':dist('HipSide','Hip')}
        assert abs(lens['crotch_curve']-curve_length(c,512))<1e-6
        assert lens['crotch_curve']>=math.dist(c[0],c[-1])
        lens['full_rise_seam']=lens['upper_centre']+lens['crotch_curve'];measures[pre]=lens
        dim(sw,cw,f"Waist {lens['waist']:.2f}",-27)
        dim(sw,oh,f"Side {lens['side']:.2f}",35)
        dim(ct,ih,f"Inseam {lens['inseam']:.2f}",-28)
        dim(oh,ih,f"Hem {lens['hem']:.2f}",35)
        line(point('HipSide'),ch,'#839b86',True)
        text(ox+8,ch[1]-8,f"Hip width {lens['hip_width']:.2f}",12)
        text(ox+12,oy+145,f"Upper centre: {lens['upper_centre']:.2f}",13)
        text(ox+12,oy+169,f"Crotch curve: {lens['crotch_curve']:.2f}",13)
        text(ox+12,oy+193,f"Full rise seam: {lens['full_rise_seam']:.2f}",13)
        text(ox+12,oy+217,'(waist edge to crotch tip)',11)
        text(ox+12,oy+260,'Grain parallel to side seam',11)
    text(905,132,'SIZING CHECK',20)
    summary=[('Body waist / hip',f"{v['waist']:.0f} / {v['hip']:.0f}"),('Finished shell hip',f"{v['hip_finished']:.2f}"),
             ('Shell waist opening',f"{2*(measures['F']['waist']+measures['B']['waist']):.2f}"),
             ('Shell side length',f"{v['shell_length']:.2f}"),('Developed total side',f"{v['shell_length']+v['band_height']+v['cuff_height']:.2f}"),
             ('Front vertical rise incl. band',f"{v['rise']+v['band_height']:.2f}"),('Back waist raise',f"{v['back_raise']:.2f}"),
             ('Shell opening / leg',f"{v['hem']:.2f}"),('Waistband finished height',f"{v['band_height']:.2f}"),('Cuff finished height',f"{v['cuff_height']:.2f}")]
    for i,(k,val) in enumerate(summary):text(905,168+i*29,k,14);text(1345,168+i*29,val,15,anchor='end')
    for i,t in enumerate([f"{v['shell_length']+v['band_height']+v['cuff_height']:.2f} cm is developed fabric length.", 'Cuffs sit at the ankle; excess blouses.', 'Crotch seam length differs from', 'vertical rise and from body height.', 'Rib lengths remain provisional.']):text(905,490+i*23,t,14)
    # Rib rectangles are raw cutting dimensions, explicitly distinguished from shell seams.
    for i,(pre,key,heightkey,x,y) in enumerate([('W','band_length','band_height',110,680),('C','cuff_length','cuff_height',790,680)]):
        length=v[key]; height=2*v[heightkey];sa=v['sa'];s=10.5;w=(length+2*sa)*s;h=(height+2*sa)*s
        text(x,y-42,'WAIST RIB — cut 1' if i==0 else 'ANKLE RIB — cut 2',18)
        add(f'<rect x="{x}" y="{y}" width="{w}" height="{h}" fill="#edf2fa" stroke="#24344a" stroke-width="2"/>')
        add(f'<rect x="{x+sa*s}" y="{y+sa*s}" width="{length*s}" height="{height*s}" fill="none" stroke="#8392a6" stroke-dasharray="4 3"/>')
        line((x,y+h/2),(x+w,y+h/2),'#2563a6',True)
        dim((x,y),(x+w,y),f"CUT {length+2*sa:.2f}",-17)
        dim((x+w,y),(x+w,y+h),f"CUT {height+2*sa:.2f}",-27)
        text(x,y+h+28,f"Relaxed loop {length:.2f}; finished height {v[heightkey]:.2f}",14)
        text(x,y+h+51,'Dashed centre = fold; inner dashed box = stitch line.',12)
    text(45,875,'HOW TO READ THIS SHEET',18)
    notes=['Shell dimensions exclude seam allowance; rib CUT dimensions include allowances.',
           'Front and back each cut as a mirrored pair. Two hem widths make the opening of ONE leg.',
           'Full shell crotch seam (front + back, excluding waistband): '+f"{measures['F']['full_rise_seam']+measures['B']['full_rise_seam']:.2f} cm.",
           'The body was measured over diaper and leggings. Baste and check standing, sitting and squatting.',
           'The drawing is a sizing snapshot, not a fitted guarantee or print-to-cut layout.']
    for i,t in enumerate(notes):text(45,906+i*22,t,14)
    add('</g></svg>')
    output.mkdir(parents=True,exist_ok=True)
    svgpath=output/'annotated_dimensions.svg';svgpath.write_text('\n'.join(svg)+'\n')
    (output/'seam_lengths.json').write_text(json.dumps(measures,indent=2)+'\n')
    import cairosvg
    cairosvg.svg2png(url=str(svgpath),write_to=str(output/'annotated_dimensions.png'))
    cairosvg.svg2pdf(url=str(svgpath),write_to=str(output/'annotated_dimensions.pdf'))
    print(json.dumps(measures,indent=2))
    return measures

if __name__=='__main__':
    ap=argparse.ArgumentParser(description=__doc__)
    ap.add_argument('--pattern',type=Path,default=PATTERN)
    ap.add_argument('--output',type=Path,default=PATTERN.parent)
    args=ap.parse_args();render(args.pattern,args.output)
