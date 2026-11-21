const E=require('../font-engine/ttf-builder.js'),I=require('../image-engine/image-engine.js'),fs=require('fs');
// ۱) تست پرسپکتیو: تصویر مصنوعی با حلقه‌ی "ا" در یک چهارضلعی کج
const sw=1600,sh=2200,g=new Uint8Array(sw*sh).fill(255);
const quad=[[120,90],[1500,140],[1450,2100],[70,2050]];
// نگاشت وارونه: نقطهٔ صفحه (u,v)→تصویر با درون‌یابی دوخطی چهارضلعی (تقریب برای ساخت ورودی)
const mapP=(u,v)=>{const a=u/I.PW,b=v/I.PH,t=[quad[0][0]*(1-a)+quad[1][0]*a,quad[0][1]*(1-a)+quad[1][1]*a],d=[quad[3][0]*(1-a)+quad[2][0]*a,quad[3][1]*(1-a)+quad[2][1]*a];return[t[0]*(1-b)+d[0]*b,t[1]*(1-b)+d[1]*b]};
const ink=(x,y)=>{ // حلقه + نقطه در تمام خانه‌های صفحه ۱
 return false};
const cells=I.cellList();const marks=[];
for(let i=0;i<I.PER;i++){const a=I.exArea(i);marks.push(a)}
for(let y=0;y<I.PH;y+=1)for(let x=0;x<I.PW;x+=1){const a=marks.find(m=>x>=m.x&&x<m.x+m.w&&y>=m.y&&y<m.y+m.h);if(!a)continue;const cx=a.x+a.w/2,cy=a.y+a.h*.45,d=Math.hypot(x-cx,y-cy);if((d<30&&d>18)||(x>cx+25&&x<cx+60&&Math.abs(y-cy)<5)){const[p,q]=mapP(x,y);g[Math.round(q)*sw+Math.round(p)]=20}}
const wg=I.warp(g,sw,sh,quad,I.PW,I.PH);const th=I.otsu(wg);let ok=0,ring=0,holes=0;
const G={space:{adv:300}};
for(let i=0;i<I.PER&&i<cells.length;i++){const r=I.extract(wg,I.PW,Math.max(60,th),I.exArea(i));if(!r)continue;ok++;const gl=I.toGlyph(r,cells[i].form,{});G[cells[i].name]=gl;
 if(i==0){const ar=gl.contours.map(c=>{let s=0;for(let k=0;k<c.length;k++){const a=c[k],b=c[(k+1)%c.length];s+=a.x*b.y-b.x*a.y}return s/2});ring=ar.length;console.log('contour areas (y-up; outer must be negative=clockwise):',ar.map(Math.round))}}
console.log('otsu',th,'cells extracted',ok,'of',I.PER);
const out=E.buildTTF({family:'E2E',designer:'test',glyphs:G});fs.writeFileSync('/tmp/hw-e2e.ttf',out.bytes);console.log('ttf bytes',out.bytes.length,'present',out.report.present.length,'missing',out.report.missing.length);
