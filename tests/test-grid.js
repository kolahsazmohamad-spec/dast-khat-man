/* آزمون تشخیص جدول: حاشیه/مقیاس/چرخش/سایه/پرسپکتیو/صفحهٔ ناقص/شکست قابل‌فهم */
const I = require('../image-engine/image-engine.js');
let fails = 0; const ok = (c, m) => { console.log((c ? 'PASS ' : 'FAIL ') + m); if (!c) fails++; };
let seed = 7; const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
function sheet(W, H, o) {
  const g = new Uint8Array(W * H).fill(235), C = 8, lv = o.line ?? 175;
  const set = (x, y, v) => { x = Math.round(x); y = Math.round(y); if (x >= 0 && y >= 0 && x < W && y < H) g[y * W + x] = Math.min(g[y * W + x], v); };
  const n = o.n ?? o.R * C, last = n - (o.R - 1) * C; // تعداد خانهٔ ردیف آخر
  for (let r = 0; r <= o.R; r++) { const lr = r === o.R, ca = (r === o.R && o.partial) ? last : C, xa = o.x0 + (C - ca) * o.cw, xb = o.x0 + C * o.cw;
    if (lr && o.partial) { if (o.partialBottomMissing) continue; }
    for (let x = xa; x <= xb; x++) for (let t = -1; t <= 0; t++) set(x, o.y0 + r * o.ch + t, lv); }
  for (let c = 0; c <= C; c++) for (let r = 0; r < o.R; r++) { if (r === o.R - 1 && o.partial && c < C - last) continue; for (let y = o.y0 + r * o.ch; y <= o.y0 + (r + 1) * o.ch; y++) for (let t = -1; t <= 0; t++) set(o.x0 + c * o.cw + t, y, lv); }
  const truth = [];
  for (let i = 0; i < n; i++) { const r = Math.floor(i / C), c = C - 1 - (i % C), x = o.x0 + c * o.cw, y = o.y0 + r * o.ch;
    for (let yy = y + 6; yy < y + 16; yy++) for (let xx = x + o.cw - 42; xx < x + o.cw - 8; xx++) set(xx, yy, 120); // برچسب
    for (let xx = x + 4; xx < x + o.cw - 4; xx++) if (xx % 11 < 6) set(xx, y + I.BL * o.ch, 190); // خط مبنا خط‌چین
    const rad = 14 + (i % 8) * 2, cx = x + o.cw / 2, cy = y + 0.6 * o.ch; truth.push({ i, rad, cx, cy });
    for (let yy = Math.floor(cy - rad - 3); yy <= cy + rad + 3; yy++) for (let xx = Math.floor(cx - rad - 3); xx <= cx + rad + 3; xx++) { const d = Math.hypot(xx - cx, yy - cy); if (d > rad - 2.5 && d < rad + 2.5) set(xx, yy, 40); } }
  return { g, truth };
}
function post(g, W, H, o) { let out = g;
  if (o.rot) out = I.rotate(out, W, H, o.rot);
  out = Uint8Array.from(out, (v, i) => { const x = i % W, y = (i / W) | 0; let f = o.shadow ? 0.55 + 0.45 * x / W - (Math.hypot(x - W * .8, y - H * .85) < 250 ? .25 : 0) : 1; return Math.max(0, Math.min(255, v * f + (o.noise ? (rnd() - .5) * 12 : 0))); });
  return out; }
function run(name, o, W = 1240, H = 1754) {
  const s = sheet(W, H, o), img = post(s.g, W, H, o), d = I.detectGrid(I.normalize(img, W, H), W, H, o.R, 8), G = d.grid;
  if (o.expectFail) { ok(!G.ok && G.msg.length > 10, name + ': تشخیص ناموفق با پیام قابل‌فهم → «' + G.msg.slice(0, 40) + '…»'); return; }
  ok(G.ok, name + ': جدول تشخیص داده شد، زاویه ' + G.angle.toFixed(2) + '°'); if (!G.ok) return;
  const ex = Math.max(...G.xs.map((v, k) => Math.abs(v - (o.x0 + k * o.cw)))), ey = Math.max(...G.ys.map((v, k) => Math.abs(v - (o.y0 + k * o.ch))));
  ok(ex <= 4 && ey <= 4, name + ': خطای حداکثر خطوط ' + ex.toFixed(1) + ' / ' + ey.toFixed(1) + ' پیکسل');
  const t = I.otsu(d.img); let bad = 0, miss = 0;
  for (const q of s.truth) { const a = I.gridArea(G, q.i), r = I.extract(d.img, W, Math.max(60, t - 8), a); if (!r) { miss++; continue; }
    const xs = r.contours.flat().map(p => p[0]), ys = r.contours.flat().map(p => p[1]), bw = Math.max(...xs) - Math.min(...xs), bh = Math.max(...ys) - Math.min(...ys), cx = a.x + (Math.max(...xs) + Math.min(...xs)) / 2, cy = a.y + (Math.max(...ys) + Math.min(...ys)) / 2;
    if (Math.abs(bw - (2 * q.rad + 5)) > 5 || Math.abs(bh - (2 * q.rad + 5)) > 5 || Math.abs(cx - q.cx) > 5 || Math.abs(cy - q.cy) > 5) bad++; }
  ok(miss === 0 && bad === 0, name + ': استخراج ' + s.truth.length + ' خانه — هر خانه فقط حلقهٔ خودش (بدون خط/برچسب/خط مبنا)، خانهٔ ناقص ' + miss + '، نادرست ' + bad);
}
run('A) چیدمان اسمی', { x0: 60, y0: 130, cw: 140, ch: 142.2, R: 11 });
run('B) حاشیه و مقیاس چاپ متفاوت', { x0: 28, y0: 70, cw: 146, ch: 150, R: 11 });
run('C) مقیاس کوچک‌تر با حاشیهٔ بزرگ', { x0: 130, y0: 210, cw: 118, ch: 122, R: 11 });
run('D) چرخش ۲٫۵° + سایه', { x0: 60, y0: 130, cw: 140, ch: 142.2, R: 11, rot: -2.5, shadow: 1 });
run('E) چرخش ‎−۳° + سایه + نویز', { x0: 70, y0: 150, cw: 135, ch: 138, R: 11, rot: 3, shadow: 1, noise: 1 });
run('F) صفحهٔ ۲ جدید (۸ ردیف کامل)', { x0: 60, y0: 130, cw: 140, ch: 142.2, R: 8, n: 58 });
run('G) صفحهٔ ۲ قدیمی (ردیف آخر ناقص و خط پایینی جاافتاده)', { x0: 60, y0: 130, cw: 140, ch: 142.2, R: 8, n: 58, partial: 1, partialBottomMissing: 1 });
run('H) خطوط جدول تقریباً نامرئی → خطای قابل‌فهم', { x0: 60, y0: 130, cw: 140, ch: 142.2, R: 11, line: 232, expectFail: 1 });
process.exit(fails ? 1 : 0);
