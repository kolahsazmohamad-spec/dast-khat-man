import subprocess,sys,os
from PIL import Image,ImageDraw,ImageFont
import numpy as np
os.chdir(os.path.dirname(os.path.abspath(__file__)))
subprocess.check_call(['node','-e',r'''
const E=require("../font-engine/ttf-builder.js"),fs=require("fs");
const box=(w,h)=>[[{x:50,y:0,on:true},{x:50,y:h,on:true},{x:w-50,y:h,on:true},{x:w-50,y:0,on:true}]];
const G={space:{adv:300}},hi={isol:300,init:400,medi:500,fina:600};
for(const[cp,t]of Object.entries(E.LETTERS))for(const f of E.FORMS[t]){const g={adv:500,contours:box(500,hi[f])};
 if(f==="fina"||f==="medi")g.entry=[500,0];if(f==="init"||f==="medi")g.exit=[0,f==="medi"?100:0];G[E.hex(+cp)+"."+f]=g}
for(const cp of E.SINGLES)G["u"+E.hex(cp)]={adv:400,contours:box(400,350)};
fs.writeFileSync("/tmp/hw-shape.ttf",E.buildTTF({family:"S",designer:"t",glyphs:G}).bytes)'''])
f=ImageFont.truetype('/tmp/hw-shape.ttf',100,layout_engine=ImageFont.Layout.RAQM)
def runs(t):
    im=Image.new('L',(1400,500),255);ImageDraw.Draw(im).text((1350,300),t,font=f,fill=0,anchor='rs',direction='rtl',language='fa')
    a=np.array(im)<128;cols=a.any(0);out=[];i=0
    while i<len(cols):
        if cols[i]:
            j=i
            while j<len(cols) and cols[j]:j+=1
            rows=np.where(a[:,i:j].any(1))[0];out.append((int(300-rows.min()),int(300-rows.max()-1)));i=j
        else:i+=1
    return out[::-1]
# (متن، ارتفاع بالای هر گلیف، پایین هر گلیف) — جابه‌جایی -۱۰ از اثر curs است (خروج medi در y=100)
T=[('ببب',[30,40,60],[-10,-10,0],'ابتدا/میان/انتها + curs'),('با',[40,60],[0,0],'ابتدا+انتها'),('ابا',[30,40,60],[0,0,0],'ا مستقل، ب ابتدا، ا انتها'),
('ب\u200cب',[30,30],[0,0],'نیم‌فاصله'),('دد',[30,30],[0,0],'غیرمتصل‌شونده‌ها'),('ور',[30,30],[0,0],'و ر'),('پچژگ',[30,40,60,30],[-10,-10,0,0],'پ چ ژ گ'),
('كيك',[30,40,60],[-10,-10,0],'ك و ي عربی'),('ب',[30],[0],'مستقل'),('۱۲۳',[35,35,35],[0,0,0],'ارقام فارسی')]
bad=0
for t,tp,bt,d in T:
    r=runs(t);ok=[x[0] for x in r]==tp and [x[1] for x in r]==bt;bad+=not ok;print('PASS' if ok else 'FAIL','شکل‌دهی HarfBuzz',d,[x for x in r])
sys.exit(bad)
