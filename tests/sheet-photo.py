"""آزمون بدون هیچ تصویر شخصی: برگهٔ واقعی برنامه (drawSheet) + دست‌خط مصنوعی (حلقه‌هایی با اندازهٔ متفاوت)، با پرسپکتیو، چرخش و سایه
→ مسیر کامل UI در Chromium: گوشه‌یابی، پرسپکتیو، تشخیص جدول، استخراج ۸۸ خانه."""
import sys
from playwright.sync_api import sync_playwright
bad=0
def chk(c,m):
    global bad;print(('PASS ' if c else 'FAIL ')+m);bad+=0 if c else 1
errs=[]
with sync_playwright() as p:
    b=p.chromium.launch();pg=b.new_context(viewport={'width':390,'height':800}).new_page();pg.on('pageerror',lambda e:errs.append(str(e)))
    pg.goto('http://localhost:8765/index.html');pg.click('text=ساخت فونت جدید');pg.click('text=ایجاد پروژه');pg.click('text=ورود تصویر');pg.wait_for_selector('#ws',state='attached')
    pg.evaluate("""async()=>{const sh=document.createElement('canvas');drawSheet(sh,0);const x=sh.getContext('2d');x.strokeStyle='#1a2a8a';x.lineWidth=6;
      for(let i=0;i<I.PER;i++){const b=I.cellBox(i),r=12+(i%8)*2.5;x.beginPath();x.arc(b.x+b.w/2,b.y+b.h*.6,r,0,7);x.stroke()}
      const ph=document.createElement('canvas');ph.width=1500;ph.height=2100;const y=ph.getContext('2d');y.fillStyle='#3a3a3a';y.fillRect(0,0,1500,2100);
      const q=[[130,110],[1390,170],[1340,1980],[70,1930]];
      for(let r=0;r<I.PH;r+=2){const v=r/I.PH,L=[q[0][0]*(1-v)+q[3][0]*v,q[0][1]*(1-v)+q[3][1]*v],R=[q[1][0]*(1-v)+q[2][0]*v,q[1][1]*(1-v)+q[2][1]*v];y.save();y.setTransform((R[0]-L[0])/I.PW,(R[1]-L[1])/I.PW,0,1,L[0],L[1]);y.drawImage(sh,0,r,I.PW,2,0,0,I.PW,2);y.restore()}
      y.globalCompositeOperation='multiply';const gr=y.createLinearGradient(0,0,1500,0);gr.addColorStop(0,'#8a8a8a');gr.addColorStop(1,'#ffffff');y.fillStyle=gr;y.fillRect(0,0,1500,2100);
      const bl=await new Promise(r=>ph.toBlob(r,'image/jpeg',.92));S.pg=0;ld(bl)}""")
    pg.wait_for_selector('#cc',timeout=20000);pg.evaluate('proc()');pg.wait_for_selector('#gm',timeout=60000)
    g=pg.evaluate('S.grid');chk(g['ok'],'جدول در عکس مصنوعی (پرسپکتیو+سایه) تشخیص داده شد: '+g['msg']);chk(len(g['xs'])==9 and len(g['ys'])==12,'۹ خط عمودی و ۱۲ خط افقی (۸ ستون × ۱۱ ردیف)')
    pg.evaluate('ext()');pg.wait_for_selector('.cell',timeout=60000)
    r=pg.evaluate("""()=>{let n=0,touch=0,size=0;for(let i=0;i<88;i++){const g=S.p.glyphs[cells[i].name];if(!g)continue;n++;const a=I.gridArea(S.grid,i),pts=g.raw.contours.flat(),xs=pts.map(p=>p[0]),ys=pts.map(p=>p[1]);
      if(Math.min(...xs)<=3||Math.max(...xs)>=a.w-3||Math.min(...ys)<=3||Math.max(...ys)>=a.h-3)touch++;const d=2*(12+(i%8)*2.5)+6;if(Math.abs((Math.max(...xs)-Math.min(...xs))-d)>6)size++}return[n,touch,size]}""")
    chk(r[0]==88,'استخراج %d از ۸۸ خانه'%r[0]);chk(r[1]==0,'نمونه‌ای به مرز ناحیه (خط جدول/برچسب) نچسبیده است (%d)'%r[1]);chk(r[2]==0,'اندازهٔ دست‌خط هر خانه با خانهٔ متناظر می‌خواند (ناهمخوان: %d)'%r[2])
    b.close()
chk(not errs,'بدون خطای کنسول '+str(errs[:2]));sys.exit(1 if bad else 0)
