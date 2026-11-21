const I=require('../image-engine/image-engine.js'),Z=require('../storage/zip.js');let fail=0;const ok=(c,m)=>{console.log((c?'PASS ':'FAIL ')+m);if(!c)fail=1};
const w=1600,h=2200,g=new Uint8Array(w*h).fill(70),Q=[[160,120],[1480,200],[1400,2050],[90,1960]];
const sg=(a,b,p)=>(b[0]-a[0])*(p[1]-a[1])-(b[1]-a[1])*(p[0]-a[0]);
for(let y=0;y<h;y++)for(let x=0;x<w;x++)if(Q.every((q,i)=>sg(q,Q[(i+1)%4],[x,y])>=0))g[y*w+x]=235;
const c=I.autoCorners(g,w,h),err=Math.max(...c.map((p,i)=>Math.hypot(p[0]-Q[i][0],p[1]-Q[i][1])));ok(err<20,'تشخیص خودکار گوشه‌ها، خطای حداکثر '+err.toFixed(1)+' پیکسل');
(async()=>{const b=Z.make([{name:'a.json',data:Buffer.from('{"x":1}')},{name:'images/p.jpg',data:new Uint8Array([1,2,3,255,0])}]),r=Z.read(await b.arrayBuffer());
ok(Buffer.from(r['a.json']).toString()==='{"x":1}'&&[...r['images/p.jpg']].join()==='1,2,3,255,0','رفت‌وبرگشت ZIP');process.exit(fail)})();
