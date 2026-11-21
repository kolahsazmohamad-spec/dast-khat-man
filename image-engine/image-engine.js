/* موتور تصویر: پرسپکتیو، آستانه، استخراج خانه‌ها، برداری‌سازی (ردیابی مرز پیکسل‌ها) */
(function (root) {
  'use strict';
  const T = typeof require !== 'undefined' ? require('../font-engine/ttf-builder.js') : root.PersianTTF;
  const PW = 1240, PH = 1754, COLS = 8, ROWS = 11, GX = 60, GY = 130, CW = (PW - 2 * GX) / COLS, CH = (PH - GY - 60) / ROWS, PER = COLS * ROWS;
  const K = 800 / (0.75 * (CH - 32));
  const FN = { isol: 'مستقل', init: 'ابتدا', medi: 'میان', fina: 'انتها' };

  function cellList() {
    const a = [];
    for (const k of Object.keys(T.LETTERS)) { const cp = +k, ch = String.fromCharCode(cp);
      for (const f of T.FORMS[T.LETTERS[cp]]) a.push({ name: T.hex(cp) + '.' + f, form: f, fn: FN[f],
        text: f === 'init' ? ch + '\u200D' : f === 'medi' ? '\u200D' + ch + '\u200D' : f === 'fina' ? '\u200D' + ch : ch }); }
    for (const cp of T.SINGLES) a.push({ name: 'u' + T.hex(cp), form: 'isol', fn: 'علامت', text: String.fromCharCode(cp) });
    return a;
  }
  function cellBox(i) { const j = i % PER, c = COLS - 1 - (j % COLS), r = Math.floor(j / COLS);
    return { x: GX + c * CW, y: GY + r * CH, w: CW, h: CH }; }
  function exArea(i) { const b = cellBox(i); return { x: Math.round(b.x + 4), y: Math.round(b.y + 28), w: Math.round(b.w - 8), h: Math.round(b.h - 32) }; }

  function solve(A, b) { const n = b.length;
    for (let i = 0; i < n; i++) { let m = i; for (let r = i + 1; r < n; r++) if (Math.abs(A[r][i]) > Math.abs(A[m][i])) m = r;
      [A[i], A[m]] = [A[m], A[i]]; [b[i], b[m]] = [b[m], b[i]];
      for (let r = i + 1; r < n; r++) { const f = A[r][i] / A[i][i]; for (let c = i; c < n; c++) A[r][c] -= f * A[i][c]; b[r] -= f * b[i]; } }
    const x = Array(n).fill(0);
    for (let i = n - 1; i >= 0; i--) { let s = b[i]; for (let c = i + 1; c < n; c++) s -= A[i][c] * x[c]; x[i] = s / A[i][i]; } return x; }

  /** quad: [[x,y]×4] گوشه‌های برگه در تصویر به ترتیب: بالا-چپ، بالا-راست، پایین-راست، پایین-چپ */
  function warp(g, sw, sh, quad, W, H) {
    const d = [[0, 0], [W, 0], [W, H], [0, H]], A = [], b = [];
    for (let i = 0; i < 4; i++) { const [x, y] = d[i], [u, v] = quad[i];
      A.push([x, y, 1, 0, 0, 0, -u * x, -u * y]); b.push(u); A.push([0, 0, 0, x, y, 1, -v * x, -v * y]); b.push(v); }
    const h = solve(A, b), o = new Uint8Array(W * H);
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
      const q = h[6] * x + h[7] * y + 1; let u = (h[0] * x + h[1] * y + h[2]) / q, v = (h[3] * x + h[4] * y + h[5]) / q;
      u = Math.min(sw - 1.001, Math.max(0, u)); v = Math.min(sh - 1.001, Math.max(0, v));
      const x0 = u | 0, y0 = v | 0, fx = u - x0, fy = v - y0, p = y0 * sw + x0;
      o[y * W + x] = (g[p] * (1 - fx) + g[p + 1] * fx) * (1 - fy) + (g[p + sw] * (1 - fx) + g[p + sw + 1] * fx) * fy;
    } return o; }

  function otsu(g) { const hst = new Array(256).fill(0); for (let i = 0; i < g.length; i++) hst[g[i]]++;
    let tot = 0, sum = 0; for (let i = 0; i < 256; i++) { tot += hst[i]; sum += i * hst[i]; }
    let wB = 0, sB = 0, best = 0, th = 128;
    for (let t = 0; t < 256; t++) { wB += hst[t]; if (!wB) continue; const wF = tot - wB; if (!wF) break; sB += t * hst[t];
      const mB = sB / wB, mF = (sum - sB) / wF, v = wB * wF * (mB - mF) * (mB - mF); if (v > best) { best = v; th = t; } }
    return th; }

  function trace(m, w, h) {
    const out = new Map(), on = (x, y) => x >= 0 && y >= 0 && x < w && y < h && m[y * w + x];
    const add = (a, b, c, d) => { const k = a + ',' + b; let l = out.get(k); if (!l) out.set(k, l = []); l.push([c, d]); };
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) if (on(x, y)) {
      if (!on(x, y - 1)) add(x, y, x + 1, y); if (!on(x + 1, y)) add(x + 1, y, x + 1, y + 1);
      if (!on(x, y + 1)) add(x + 1, y + 1, x, y + 1); if (!on(x - 1, y)) add(x, y + 1, x, y); }
    const res = [];
    for (const k of [...out.keys()]) { const l = out.get(k); while (l.length) {
      const [sx, sy] = k.split(',').map(Number), pts = [[sx, sy]]; let cur = l.pop();
      for (;;) { if (cur[0] === sx && cur[1] === sy) break; pts.push(cur);
        const nl = out.get(cur[0] + ',' + cur[1]); if (!nl || !nl.length) break; cur = nl.pop(); }
      res.push(pts); } }
    return res; }
  const area = p => { let s = 0; for (let i = 0; i < p.length; i++) { const a = p[i], b = p[(i + 1) % p.length]; s += a[0] * b[1] - b[0] * a[1]; } return s / 2; };
  function smooth(p, n) { let q = p; for (let t = 0; t < n; t++) { const L = q.length, r = q; q = r.map((b, i) => { const a = r[(i + L - 1) % L], c = r[(i + 1) % L]; return [(a[0] + 2 * b[0] + c[0]) / 4, (a[1] + 2 * b[1] + c[1]) / 4]; }); } return q; }
  function rdp(p, e) { if (p.length < 3) return p; const a = p[0], b = p[p.length - 1], dx = b[0] - a[0], dy = b[1] - a[1], L = Math.hypot(dx, dy) || 1;
    let m = 0, mi = 0; for (let i = 1; i < p.length - 1; i++) { const d = Math.abs(dy * (p[i][0] - a[0]) - dx * (p[i][1] - a[1])) / L; if (d > m) { m = d; mi = i; } }
    return m > e ? rdp(p.slice(0, mi + 1), e).slice(0, -1).concat(rdp(p.slice(mi), e)) : [a, b]; }
  function simplify(p, e) { if (p.length < 4) return p; let f = 0, m = 0; for (let i = 1; i < p.length; i++) { const d = Math.hypot(p[i][0] - p[0][0], p[i][1] - p[0][1]); if (d > m) { m = d; f = i; } }
    const A = rdp(p.slice(0, f + 1), e), B = rdp(p.slice(f).concat([p[0]]), e); return A.slice(0, -1).concat(B.slice(0, -1)); }

  /** استخراج یک خانه از تصویر صاف‌شدهٔ خاکستری؛ null اگر خالی باشد */
  function extract(g, W, t, ar) {
    const w = ar.w, h = ar.h, m = new Uint8Array(w * h); let ink = 0;
    for (let y = 3; y < h - 3; y++) for (let x = 3; x < w - 3; x++) if (g[(y + ar.y) * W + x + ar.x] < t) { m[y * w + x] = 1; ink++; }
    if (ink < 25) return null;
    const cs = trace(m, w, h).filter(c => Math.abs(area(c)) >= 8).map(c => simplify(smooth(c, 3), 0.9)).filter(c => c.length >= 3);
    return cs.length ? { contours: cs, base: 0.75 * h, ink } : null; }

  // چندضلعی ساده‌شده → منحنی درجه‌دوی TrueType: رأس‌های تیز on-curve، رأس‌های نرم off-curve با نقطهٔ میانی on-curve
  function quad(p) { const n = p.length, o = [];
    for (let i = 0; i < n; i++) { const a = p[(i + n - 1) % n], b = p[i], c = p[(i + 1) % n], ax = b.x - a.x, ay = b.y - a.y, bx = c.x - b.x, by = c.y - b.y, l = Math.hypot(ax, ay) * Math.hypot(bx, by);
      if (l === 0 || (ax * bx + ay * by) / l < 0.3) o.push({ x: b.x, y: b.y, on: true });
      else { o.push({ x: (a.x + b.x) / 2, y: (a.y + b.y) / 2, on: true }); o.push({ x: b.x, y: b.y, on: false }); } }
    return o; }
  /** raw → گلیف فونت. t: {dx,dy,s,aw}. وارونه‌شدن محور y خودبه‌خود خارجی‌ها را ساعتگرد می‌کند (استاندارد TrueType) */
  function toGlyph(raw, form, t) { t = t || {}; const s = (t.s || 1) * K; let mn = 1e9, mx = -1e9;
    raw.contours.forEach(c => c.forEach(p => { mn = Math.min(mn, p[0]); mx = Math.max(mx, p[0]); }));
    const pad = form === 'isol' ? 60 : 0, dx = t.dx || 0, dy = t.dy || 0, W = (mx - mn) * s;
    const all = raw.contours.flat(), near = f => { const q = all.filter(f).map(p => p[1]).sort((a, b) => a - b); return q.length ? (raw.base - q[q.length >> 1]) * s + dy : 0; };
    const g = { adv: W + 2 * pad + (t.aw || 0), contours: raw.contours.map(c => quad(c.map(p => ({ x: (p[0] - mn) * s + pad + dx, y: (raw.base - p[1]) * s + dy })))) };
    if (form === 'fina' || form === 'medi') g.entry = [pad + dx + W, near(p => p[0] > mx - 12)];
    if (form === 'init' || form === 'medi') g.exit = [pad + dx, near(p => p[0] < mn + 12)];
    return g; }

  /** تشخیص خودکار گوشه‌های برگه: بزرگ‌ترین ناحیهٔ روشن متصل؛ خروجی بالا-چپ، بالا-راست، پایین-راست، پایین-چپ یا null */
  function autoCorners(g, w, h) {
    const s = Math.max(1, Math.round(Math.max(w, h) / 320)), sw = Math.floor(w / s), sh = Math.floor(h / s), a = new Uint8Array(sw * sh);
    for (let y = 0; y < sh; y++) for (let x = 0; x < sw; x++) { let v = 0; for (let j = 0; j < s; j++) for (let i = 0; i < s; i++) v += g[(y * s + j) * w + x * s + i]; a[y * sw + x] = v / (s * s); }
    const t = otsu(a), lab = new Int32Array(sw * sh); let best = null, bn = 0, id = 0;
    for (let i0 = 0; i0 < sw * sh; i0++) { if (lab[i0] || a[i0] <= t) continue; id++; lab[i0] = id; const st = [i0], E = [1e9, -1e9, -1e9, 1e9], P = [0, 0, 0, 0]; let n = 0;
      while (st.length) { const k = st.pop(), x = k % sw, y = (k / sw) | 0; n++;
        const v = [x + y, x - y, x + y, x - y]; if (v[0] < E[0]) { E[0] = v[0]; P[0] = [x, y]; } if (v[1] > E[1]) { E[1] = v[1]; P[1] = [x, y]; } if (v[2] > E[2]) { E[2] = v[2]; P[2] = [x, y]; } if (v[3] < E[3]) { E[3] = v[3]; P[3] = [x, y]; }
        for (const q of [k - 1, k + 1, k - sw, k + sw]) if (q >= 0 && q < sw * sh && !lab[q] && a[q] > t && !((q === k - 1 && x === 0) || (q === k + 1 && x === sw - 1))) { lab[q] = id; st.push(q); } }
      if (n > bn) { bn = n; best = P; } }
    if (!best || bn < 0.2 * sw * sh) return null; return best.map(p => [p[0] * s, p[1] * s]); }

  const api = { PW, PH, COLS, ROWS, PER, K, cellList, cellBox, exArea, warp, otsu, trace, extract, toGlyph, autoCorners, area };
  if (typeof module !== 'undefined') module.exports = api; else root.ImageEngine = api;
})(typeof self !== 'undefined' ? self : this);
