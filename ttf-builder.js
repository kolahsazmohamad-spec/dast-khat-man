/* موتور ساخت فونت TTF فارسی — JavaScript خالص، بدون وابستگی.
   ورودی: گلیف‌ها به‌صورت contour درجه‌دو (TrueType)؛ خروجی: Uint8Array فایل TTF.
   اتصال حروف با GSUB (isol/init/medi/fina) روی اسکریپت arab. */
(function (root) {
  'use strict';
  // D = اتصال دوطرفه (۴ شکل)، R = فقط به حرف قبل (۲ شکل)، U = فقط مستقل
  const LETTERS = {
    0x0627:'R',0x0628:'D',0x067E:'D',0x062A:'D',0x062B:'D',0x062C:'D',0x0686:'D',0x062D:'D',0x062E:'D',
    0x062F:'R',0x0630:'R',0x0631:'R',0x0632:'R',0x0698:'R',0x0633:'D',0x0634:'D',0x0635:'D',0x0636:'D',
    0x0637:'D',0x0638:'D',0x0639:'D',0x063A:'D',0x0641:'D',0x0642:'D',0x06A9:'D',0x06AF:'D',0x0644:'D',
    0x0645:'D',0x0646:'D',0x0648:'R',0x0647:'D',0x06CC:'D',0x0621:'U',0x0622:'R',0x0623:'R',0x0624:'R',0x0626:'D'
  };
  // ورودی‌های عربی که به گلیف فارسی معادل هدایت می‌شوند
  const ALIAS = { 0x0643:0x06A9, 0x064A:0x06CC, 0x0649:0x06CC };
  const FORMS = { D:['isol','init','medi','fina'], R:['isol','fina'], U:['isol'] };
  const SINGLES = [0x06F0,0x06F1,0x06F2,0x06F3,0x06F4,0x06F5,0x06F6,0x06F7,0x06F8,0x06F9,
    0x060C,0x061B,0x061F,0x002E,0x0021,0x003A,0x0028,0x0029,0x00AB,0x00BB,0x002D];
  const hex = cp => cp.toString(16).toUpperCase().padStart(4, '0');

  function W() { const a = []; return {
    a, u8:v=>(a.push(v&255),0), u16(v){a.push((v>>8)&255,v&255)}, i16(v){this.u16(v&0xFFFF)},
    u32(v){a.push((v>>>24)&255,(v>>>16)&255,(v>>>8)&255,v&255)}, tag(s){for(const c of s)a.push(c.charCodeAt(0))},
    bytes(b){for(const x of b)a.push(x)}, pad4(){while(a.length%4)a.push(0)} }; }
  function checksum(b) { let s = 0; for (let i = 0; i < b.length; i += 4)
    s = (s + (((b[i]||0)<<24)>>>0) + ((b[i+1]||0)<<16) + ((b[i+2]||0)<<8) + (b[i+3]||0)) >>> 0; return s; }

  function glyfData(g) {
    const w = W(), cs = g.contours || [];
    if (!cs.length) return { bytes: [], bbox: [0,0,0,0] };
    const pts = cs.flat();
    const xs = pts.map(p=>Math.round(p.x)), ys = pts.map(p=>Math.round(p.y));
    const bb = [Math.min(...xs), Math.min(...ys), Math.max(...xs), Math.max(...ys)];
    w.i16(cs.length); bb.forEach(v=>w.i16(v));
    let n = -1; cs.forEach(c => { n += c.length; w.u16(n); });
    w.u16(0);
    pts.forEach(p => w.u8(p.on === false ? 0 : 1));
    let px = 0; pts.forEach(p => { const x = Math.round(p.x); w.i16(x - px); px = x; });
    let py = 0; pts.forEach(p => { const y = Math.round(p.y); w.i16(y - py); py = y; });
    w.pad4(); return { bytes: w.a, bbox: bb };
  }

  // ساخت ScriptList/FeatureList/LookupList مشترک GSUB و GPOS؛ featTags[i] به lookups[i] اشاره می‌کند
  function layout(featTags, lookups) {
    const lang = W(); lang.u16(0); lang.u16(0xFFFF); lang.u16(featTags.length); featTags.forEach((_, i) => lang.u16(i));
    const sc = W(); sc.u16(4); sc.u16(0); sc.bytes(lang.a);
    const base = 2 + 12, sl = W(); sl.u16(2); sl.tag('DFLT'); sl.u16(base); sl.tag('arab'); sl.u16(base + sc.a.length); sl.bytes(sc.a); sl.bytes(sc.a);
    const order = featTags.map((t, i) => [t, i]).sort((x, y) => (x[0] < y[0] ? -1 : x[0] > y[0] ? 1 : 0));
    const fl = W(); fl.u16(order.length); order.forEach(([t], i) => { fl.tag(t); fl.u16(2 + order.length * 6 + i * 6); });
    order.forEach(([, li]) => { fl.u16(0); fl.u16(1); fl.u16(li); });
    const ll = W(); ll.u16(lookups.length); let off = 2 + lookups.length * 2; lookups.forEach(t => { ll.u16(off); off += t.length; }); lookups.forEach(t => ll.bytes(t));
    const w = W(), fo = 10 + sl.a.length, lo = fo + fl.a.length;
    w.u16(1); w.u16(0); w.u16(10); w.u16(fo); w.u16(lo); w.bytes(sl.a); w.bytes(fl.a); w.bytes(ll.a); return w.a;
  }
  const lookupTbl = (type, flag, sub) => { const t = W(); t.u16(type); t.u16(flag); t.u16(1); t.u16(8); t.bytes(sub); return t.a; };
  function buildGSUB(order, formMap) {
    const tags = ['isol', 'init', 'medi', 'fina'];
    const lk = tags.map(t => { const pr = (formMap[t] || []).map(([f, to]) => [order.indexOf(f), order.indexOf(to)]).sort((x, y) => x[0] - y[0]);
      const n = pr.length, s = W(); s.u16(2); s.u16(6 + 2 * n); s.u16(n); pr.forEach(p => s.u16(p[1])); s.u16(1); s.u16(n); pr.forEach(p => s.u16(p[0]));
      return lookupTbl(1, 0, s.a); });
    return layout(tags, lk);
  }
  // اتصال شناور (curs): هر گلیف می‌تواند نقطهٔ ورود (راست) و خروج (چپ) داشته باشد
  function buildGPOS(order, G) {
    const ids = order.map((n, i) => [i, G[n]]).filter(([, g]) => g && (g.entry || g.exit)); if (!ids.length) return null;
    const n = ids.length, s = W(), hdr = 6 + 4 * n, covLen = 4 + 2 * n; s.u16(1); s.u16(hdr); s.u16(n);
    let ao = hdr + covLen; const an = W();
    ids.forEach(([, g]) => { ['entry', 'exit'].forEach(k => { if (g[k]) { s.u16(ao + an.a.length); an.u16(1); an.i16(Math.round(g[k][0])); an.i16(Math.round(g[k][1])); } else s.u16(0); }); });
    s.u16(1); s.u16(n); ids.forEach(([i]) => s.u16(i)); s.bytes(an.a);
    return layout(['curs'], [lookupTbl(3, 1, s.a)]);
  }

  /** @param opts {family, style, designer, version, upm, ascender, descender, glyphs}
   *  glyphs: { "0628.init": {contours:[[{x,y,on}]], adv}, "space":{adv}, ... } */
  function buildTTF(opts) {
    const upm = opts.upm || 1000, asc = opts.ascender || 800, desc = opts.descender || -300;
    const family = opts.family || 'MyHandwriting', style = opts.style || 'Regular';
    const G = opts.glyphs || {}, report = { missing: [], present: [] };
    const order = ['.notdef', 'space', 'zwnj'], formMap = { isol:[], init:[], medi:[], fina:[] };
    const cmap = {}; // cp -> glyph name
    const def = (n, g) => { order.push(n); };
    const need = n => { if (G[n] && G[n].contours) { report.present.push(n); return true; } report.missing.push(n); return false; };
    Object.keys(LETTERS).forEach(cp => {
      cp = +cp; const t = LETTERS[cp];
      FORMS[t].forEach(f => { const n = hex(cp) + '.' + f;
        if (need(n)) { order.push(n); if (f !== 'isol') formMap[f].push([hex(cp)+'.isol', n]); } });
      if (order.includes(hex(cp)+'.isol')) cmap[cp] = hex(cp)+'.isol';
    });
    // اگر شکل isol وجود نداشته باشد، جایگزینی آن شکل هم بی‌اثر است؛ فقط شکل‌های موجود ثبت می‌شوند
    ['init','medi','fina'].forEach(f => formMap[f] = formMap[f].filter(([a]) => order.includes(a)));
    Object.entries(ALIAS).forEach(([a,b]) => { if (cmap[b]) cmap[a] = cmap[b]; });
    SINGLES.forEach(cp => { const n = 'u' + hex(cp); if (need(n)) { order.push(n); cmap[cp] = n; } });
    for (let i = 0; i < 10; i++) if (cmap[0x06F0+i]) cmap[0x0660+i] = cmap[0x06F0+i];
    cmap[0x20] = 'space'; cmap[0x200C] = 'zwnj'; cmap[0xA0] = 'space';
    const notdef = G['.notdef'] || { adv: 600, contours: [
      [{x:50,y:0},{x:50,y:700},{x:550,y:700},{x:550,y:0}], [{x:100,y:50},{x:500,y:50},{x:500,y:650},{x:100,y:650}]] };
    const get = n => n === '.notdef' ? notdef : n === 'space' ? { adv: G.space?.adv ?? 300 } : n === 'zwnj' ? { adv: 0 } : G[n];
    const N = order.length, gl = order.map(n => glyfData(get(n)));
    // glyf/loca/hmtx
    const glyf = W(), loca = W(), hmtx = W(); let maxPts = 0, maxC = 0, xMin = 1e9, yMin = 1e9, xMax = -1e9, yMax = -1e9, advMax = 0, adv0 = 0;
    order.forEach((n,i) => { loca.u32(glyf.a.length); glyf.bytes(gl[i].bytes);
      const g = get(n), adv = Math.round(g.adv ?? 500), bb = gl[i].bbox; advMax = Math.max(advMax, adv); adv0 += adv;
      hmtx.u16(adv); hmtx.i16(bb[0]); const cs = g.contours || [];
      maxC = Math.max(maxC, cs.length); maxPts = Math.max(maxPts, cs.flat().length);
      if (cs.length) { xMin=Math.min(xMin,bb[0]); yMin=Math.min(yMin,bb[1]); xMax=Math.max(xMax,bb[2]); yMax=Math.max(yMax,bb[3]); } });
    loca.u32(glyf.a.length);
    // cmap فرمت ۴ (BMP)
    const cps = Object.keys(cmap).map(Number).sort((a,b)=>a-b), seg = cps.length + 1;
    const cm = W(); cm.u16(0); cm.u16(1); cm.u16(3); cm.u16(1); cm.u32(12);
    const sub = W(); const sr = 2 * Math.pow(2, Math.floor(Math.log2(seg)));
    sub.u16(4); sub.u16(16 + seg * 8); sub.u16(0); sub.u16(seg * 2); sub.u16(sr); sub.u16(Math.log2(sr / 2)); sub.u16(seg * 2 - sr);
    cps.forEach(c => sub.u16(c)); sub.u16(0xFFFF); sub.u16(0);
    cps.forEach(c => sub.u16(c)); sub.u16(0xFFFF);
    cps.forEach(c => sub.u16((order.indexOf(cmap[c]) - c) & 0xFFFF)); sub.u16(1);
    for (let i = 0; i < seg; i++) sub.u16(0);
    cm.bytes(sub.a);
    // name
    const strs = [[0, opts.copyright || ('© ' + (opts.designer || family))],[1,family],[2,style],[3,family+' '+style+' v1'],[4,family+' '+style],[5,'Version '+(opts.version||'1.000')],[6,family.replace(/\s/g,'')+'-'+style],[9,opts.designer||'']];
    const nm = W(), strBuf = W(); nm.u16(0); nm.u16(strs.length); nm.u16(6 + strs.length * 12);
    strs.forEach(([id,s]) => { nm.u16(3); nm.u16(1); nm.u16(0x409); nm.u16(s.length*2); nm.u16(strBuf.a.length); for (const ch of s) strBuf.u16(ch.charCodeAt(0)); });
    nm.bytes(strBuf.a);
    const head = W(); head.u32(0x00010000); head.u32(0x00010000); head.u32(0); head.u32(0x5F0F3CF5); head.u16(3); head.u16(upm);
    const t = Math.floor(Date.now()/1000) + 2082844800; head.u32(0); head.u32(t); head.u32(0); head.u32(t);
    head.i16(xMin); head.i16(yMin); head.i16(xMax); head.i16(yMax); head.u16(0); head.u16(8); head.i16(2); head.i16(1); head.i16(0);
    const hhea = W(); hhea.u32(0x00010000); hhea.i16(asc); hhea.i16(desc); hhea.i16(0); hhea.u16(advMax); hhea.i16(0); hhea.i16(0); hhea.i16(xMax);
    hhea.i16(1); hhea.i16(0); hhea.i16(0); for (let i=0;i<4;i++) hhea.i16(0); hhea.i16(0); hhea.u16(N);
    const maxp = W(); maxp.u32(0x00010000); maxp.u16(N); maxp.u16(maxPts); maxp.u16(maxC); maxp.u16(0); maxp.u16(0);
    maxp.u16(2); maxp.u16(0); maxp.u16(0); maxp.u16(0); maxp.u16(0); maxp.u16(0); maxp.u16(0); maxp.u16(0); maxp.u16(0);
    const os2 = W(); os2.u16(4); os2.i16(Math.round(adv0 / N)); os2.u16(400); os2.u16(5); os2.u16(0);
    [650,600,0,75,650,600,0,350,50,300].forEach(v => os2.i16(v)); os2.i16(0); for (let i=0;i<10;i++) os2.u8(0);
    os2.u32(0x00002000); os2.u32(0); os2.u32(0); os2.u32(0); os2.tag('NONE'); os2.u16(0x40); os2.u16(0x20); os2.u16(0xFFFF);
    os2.i16(asc); os2.i16(desc); os2.i16(0); os2.u16(Math.max(asc, yMax)); os2.u16(Math.max(-desc, -yMin));
    os2.u32(0x00000040); os2.u32(0); os2.i16(500); os2.i16(700); os2.u16(0); os2.u16(0x20); os2.u16(4);
    const post = W(); post.u32(0x00030000); post.u32(0); post.i16(-100); post.i16(50); post.u32(0); for (let i=0;i<4;i++) post.u32(0);
    const gpos = buildGPOS(order, Object.fromEntries(order.map(n => [n, G[n]])));
    const tables = { GSUB: buildGSUB(order, formMap), 'OS/2': os2.a, cmap: cm.a, glyf: glyf.a, head: head.a, hhea: hhea.a, hmtx: hmtx.a, loca: loca.a, maxp: maxp.a, name: nm.a, post: post.a }; if (gpos) tables.GPOS = gpos;
    const tags = Object.keys(tables).sort(), out = W(), nT = tags.length, sr2 = 16 * Math.pow(2, Math.floor(Math.log2(nT)));
    out.u32(0x00010000); out.u16(nT); out.u16(sr2); out.u16(Math.log2(sr2/16)); out.u16(nT*16 - sr2);
    let off = 12 + nT * 16; const placed = {};
    tags.forEach(tg => { const b = tables[tg]; const pb = b.slice(); while (pb.length % 4) pb.push(0); placed[tg] = pb;
      out.tag(tg); out.u32(checksum(pb)); out.u32(off); out.u32(b.length); off += pb.length; });
    tags.forEach(tg => out.bytes(placed[tg]));
    const bytes = Uint8Array.from(out.a);
    // checkSumAdjustment
    const hOff = 12 + nT * 16 + tags.slice(0, tags.indexOf('head')).reduce((s,tg)=>s+placed[tg].length,0);
    const adj = (0xB1B0AFBA - checksum(bytes)) >>> 0;
    bytes[hOff+8]=adj>>>24; bytes[hOff+9]=(adj>>>16)&255; bytes[hOff+10]=(adj>>>8)&255; bytes[hOff+11]=adj&255;
    return { bytes, report, glyphOrder: order };
  }
  const api = { buildTTF, LETTERS, ALIAS, FORMS, SINGLES, hex };
  if (typeof module !== 'undefined') module.exports = api; else root.PersianTTF = api;
})(typeof self !== 'undefined' ? self : this);
