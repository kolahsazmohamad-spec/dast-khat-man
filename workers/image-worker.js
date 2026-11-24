/* پردازش سنگین تصویر خارج از رشتهٔ اصلی؛ لغو = terminate() از سمت برنامه */
importScripts('../font-engine/ttf-builder.js', '../image-engine/image-engine.js');
onmessage = e => { const m = e.data, I = ImageEngine;
  if (m.type === 'warp') { const w0 = I.warp(m.g, m.w, m.h, m.q, I.PW, I.PH), d = I.detectGrid(I.normalize(w0, I.PW, I.PH), I.PW, I.PH, m.R, I.COLS); postMessage({ wg: d.img, t: I.otsu(d.img), grid: d.grid }); }
  else if (m.type === 'ext') { const res = [], n = m.to - m.from;
    for (let i = m.from; i < m.to; i++) { res.push([i, I.extract(m.wg, I.PW, m.t, I.gridArea(m.grid, i))]); if ((i - m.from) % 6 === 0) postMessage({ type: 'prog', p: Math.round(100 * (i - m.from) / n) }); }
    postMessage({ type: 'done', res }); } };
