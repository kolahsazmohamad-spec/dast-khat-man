from playwright.sync_api import sync_playwright
errs=[]
with sync_playwright() as p:
    b=p.chromium.launch(args=['--use-fake-ui-for-media-stream','--use-fake-device-for-media-stream']);ctx=b.new_context(viewport={'width':390,'height':800},permissions=['camera']);pg=ctx.new_page()
    pg.on('pageerror',lambda e:errs.append(str(e)));pg.on('console',lambda m:m.type=='error' and errs.append(m.text))
    pg.goto('http://localhost:8765/index.html');pg.wait_for_selector('text=ساخت فونت جدید')
    pg.click('text=ساخت فونت جدید');pg.click('text=ایجاد پروژه');pg.wait_for_selector('text=ورود تصویر');pg.click('text=ورود تصویر');pg.wait_for_selector('text=دوربین با کادر')
    pg.click('text=دوربین با کادر');pg.wait_for_selector('#vd');pg.wait_for_function("document.querySelector('#vd').videoWidth>0");pg.click('text=ثبت عکس');pg.wait_for_selector('#cc',timeout=8000);print('camera capture -> corner UI OK; auto msg:',pg.inner_text('#ai')[:40])
    # عکس مصنوعی برگه با پرسپکتیو → worker → استخراج
    ok=pg.evaluate("""async()=>{const c=document.createElement('canvas');c.width=1240;c.height=1754;const x=c.getContext('2d');x.fillStyle='#555';x.fillRect(0,0,1240,1754);
     const q=[[110,90],[1150,130],[1120,1650],[80,1600]];x.fillStyle='#f2f2ee';x.beginPath();q.forEach((p,i)=>x[i?'lineTo':'moveTo'](...p));x.fill();
     const t=document.createElement('canvas');t.width=I.PW;t.height=I.PH;const y=t.getContext('2d');y.fillStyle='#fff';y.fillRect(0,0,t.width,t.height);y.strokeStyle='#999';y.lineWidth=2;for(let i=0;i<I.PER;i++){const b=I.cellBox(i);y.strokeRect(b.x,b.y,b.w,b.h)}y.strokeStyle='#111';y.lineWidth=7;
     for(let i=0;i<I.PER;i++){const a=I.exArea(i);y.beginPath();y.arc(a.x+a.w/2,a.y+a.h*.45,24,0,7);y.stroke()}
     // نگاشت دوخطی صفحه→چهارضلعی با رسم نوارهای افقی
     for(let r=0;r<I.PH;r+=2){const v=r/I.PH,L=[q[0][0]*(1-v)+q[3][0]*v,q[0][1]*(1-v)+q[3][1]*v],R=[q[1][0]*(1-v)+q[2][0]*v,q[1][1]*(1-v)+q[2][1]*v];x.save();x.setTransform((R[0]-L[0])/I.PW,(R[1]-L[1])/I.PW,0,1,L[0],L[1]);x.drawImage(t,0,r,I.PW,2,0,0,I.PW,2);x.restore()}
     const bl=await new Promise(r=>c.toBlob(r,'image/jpeg',.95));S.pg=0;ld(bl);await new Promise(r=>setTimeout(r,800));return [S.auto,S.q.map(p=>p.map(Math.round))]}""")
    print('auto corners on skewed photo',ok)
    pg.evaluate("proc()");pg.wait_for_selector('#pc2',timeout=20000);print('worker warp OK, threshold',pg.evaluate('S.t'))
    pg.evaluate("ext()");pg.wait_for_selector('.cell',timeout=30000)
    print('worker extract ->glyphs',pg.evaluate("Object.keys(S.p.glyphs).length"),'imgs stored',pg.evaluate("S.p.imgs.length"),pg.evaluate("S.p.imgs[0].blob.size>1000"))
    pg.evaluate("go('imp');cornerUI()");pg.evaluate("proc()");pg.wait_for_selector('#bt');pg.evaluate("stopW()");print('cancel -> corner UI back:',pg.evaluate("!!document.querySelector('#cc')"))
    # پشتیبان ZIP و بازیابی
    r=pg.evaluate("""async()=>{Object.values(S.p.glyphs).forEach(g=>g.ok=true);await save();const imgs=S.p.imgs,enc=new TextEncoder();
      const files=[{name:'project.json',data:enc.encode(JSON.stringify({...S.p,id:'copy1',imgs:imgs.map(x=>({pg:x.pg,file:'images/page-'+(x.pg+1)+'.jpg'}))}))}];for(const x of imgs)files.push({name:'images/page-'+(x.pg+1)+'.jpg',data:new Uint8Array(await x.blob.arrayBuffer())});
      await imp(new File([Z.make(files)],'b.zip'));const l=await all(),c=l.find(p=>p.id==='copy1');return [l.length,Object.keys(c.glyphs).length,c.imgs[0].blob.size>1000]}""")
    print('zip import ->',r)
    pg.evaluate("open_('copy1')");pg.wait_for_selector('text=پیش‌نمایش زنده');pg.evaluate("go('pv')");pg.wait_for_selector('#pv');pg.fill('#in','بتپ');pg.evaluate('up()');print('warning shown for incomplete?',pg.is_visible('#wr'))
    b.close()
print('errors:',errs)
