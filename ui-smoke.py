from playwright.sync_api import sync_playwright
errs=[]
with sync_playwright() as p:
    b=p.chromium.launch();ctx=b.new_context(viewport={'width':390,'height':800},has_touch=True,is_mobile=True);pg=ctx.new_page()
    pg.on('pageerror',lambda e:errs.append(str(e)));pg.on('console',lambda m:m.type=='error' and errs.append(m.text))
    pg.goto('http://localhost:8765/index.html');pg.wait_for_selector('text=ساخت فونت جدید')
    pg.click('text=ساخت فونت جدید');pg.fill('#n','تست');pg.click('text=ایجاد پروژه');pg.wait_for_selector('text=برگهٔ نمونه‌نویسی')
    print('hub ok');pg.click('text=برگهٔ نمونه‌نویسی');pg.wait_for_selector('#c');print('sheet canvas',pg.evaluate("[$('#c').width,$('#c').height]"))
    ov=pg.evaluate("document.documentElement.scrollWidth>innerWidth");print('horizontal overflow:',ov)
    # تزریق نمونه‌های مصنوعی با همان موتور تصویر در مرورگر
    r=pg.evaluate("""async()=>{const g=new Uint8Array(I.PW*I.PH).fill(255);
     for(let i=0;i<I.PER;i++){const a=I.exArea(i),cx=a.x+a.w*.5,cy=a.y+a.h*.45;for(let y=a.y;y<a.y+a.h;y++)for(let x=a.x;x<a.x+a.w;x++){const d=Math.hypot(x-cx,y-cy);if(d<28&&d>16)g[y*I.PW+x]=20;if(x>cx+20&&x<cx+a.w*.5-4&&Math.abs(y-(a.y+a.h*.45))<4)g[y*I.PW+x]=20}}
     for(let pgi=0;pgi<2;pgi++)for(let i=pgi*I.PER;i<Math.min(cells.length,(pgi+1)*I.PER);i++){const rw=I.extract(g,I.PW,120,I.exArea(i%I.PER));if(rw)S.p.glyphs[cells[i].name]={raw:rw,t:{dx:0,dy:0,s:1,aw:0},ok:true}}
     await save();const f=await mkFont();return [Object.keys(S.p.glyphs).length,f.bytes.length,f.report.missing.length,document.fonts.check('40px HWuser')]}""")
    print('glyphs/bytes/missing/fontLoaded',r)
    pg.evaluate("go('pv')");pg.wait_for_selector('#pv');pg.fill('#in','می‌روم ببب کتاب‌ها');pg.evaluate('up()');pg.screenshot(path='/tmp/hw-pv.png')
    pg.evaluate("go('gl')");pg.wait_for_selector('.cell');pg.click('.cell >> nth=0');pg.wait_for_selector('#ec');print('editor opened')
    pg.evaluate("cm();go('home')");pg.wait_for_selector('text=ادامه');print('persisted card visible')
    pg.reload();pg.wait_for_selector('text=ادامه');print('reload keeps project');
    pg.wait_for_timeout(800);print('sw controller:',pg.evaluate("!!navigator.serviceWorker.controller"),'| registrations:',pg.evaluate("navigator.serviceWorker.getRegistrations().then(r=>r.length)"))
    ctx.set_offline(True);pg.reload();pg.wait_for_selector('text=ساخت فونت جدید',timeout=5000);print('offline reload OK')
    b.close()
print('errors:',errs)
