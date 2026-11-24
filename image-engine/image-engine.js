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
    const lb = new Int32Array(w * h); let id = 0;
    for (let q = 0; q < m.length; q++) { if (!m[q] || lb[q]) continue; id++; const st = [q]; lb[q] = id; const px = []; let x0 = w, x1 = 0, y0 = h, y1 = 0;
      while (st.length) { const k = st.pop(); px.push(k); const x = k % w, y = (k / w) | 0; x0 = Math.min(x0, x); x1 = Math.max(x1, x); y0 = Math.min(y0, y); y1 = Math.max(y1, y);
        for (const n of [k - 1, k + 1, k - w, k + w]) if (n >= 0 && n < m.length && m[n] && !lb[n] && !((n === k - 1 && x === 0) || (n === k + 1 && x === w - 1))) { lb[n] = id; st.push(n); } }
      if (px.length < 14 || (y1 - y0 < 3 && x1 - x0 < 14)) { px.forEach(k => { m[k] = 0; ink--; }); } }
    if (ink < 25) return null;
    const cs = trace(m, w, h).filter(c => Math.abs(area(c)) >= 8).map(c => simplify(smooth(c, 3), 0.9)).filter(c => c.length >= 3);
    return cs.length ? { contours: cs, base: ar.base != null ? ar.base : 0.75 * h, k: ar.k, ink } : null; }

  // چندضلعی ساده‌شده → منحنی درجه‌دوی TrueType: رأس‌های تیز on-curve، رأس‌های نرم off-curve با نقطهٔ میانی on-curve
  function quad(p) { const n = p.length, o = [];
    for (let i = 0; i < n; i++) { const a = p[(i + n - 1) % n], b = p[i], c = p[(i + 1) % n], ax = b.x - a.x, ay = b.y - a.y, bx = c.x - b.x, by = c.y - b.y, l = Math.hypot(ax, ay) * Math.hypot(bx, by);
      if (l === 0 || (ax * bx + ay * by) / l < 0.3) o.push({ x: b.x, y: b.y, on: true });
      else { o.push({ x: (a.x + b.x) / 2, y: (a.y + b.y) / 2, on: true }); o.push({ x: b.x, y: b.y, on: false }); } }
    return o; }
  /** raw → گلیف فونت. t: {dx,dy,s,aw}. وارونه‌شدن محور y خودبه‌خود خارجی‌ها را ساعتگرد می‌کند (استاندارد TrueType) */
  function toGlyph(raw, form, t) { t = t || {}; const s = (t.s || 1) * (raw.k || K); let mn = 1e9, mx = -1e9;
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


  // ───────── تشخیص جدول واقعی (مستقل از حاشیه‌ها و مقیاس چاپ) ─────────
  const TOP = 28 / ((PH - GY - 60) / ROWS), BL = 0.7779; // ناحیهٔ برچسب و خط مبنا نسبت به ارتفاع خانه (مطابق طرح برگه)
  function boxMean(a, W, H, r) { const S = new Float64Array((W + 1) * (H + 1)), o = new Float32Array(W * H);
    for (let y = 0; y < H; y++) { let s = 0; for (let x = 0; x < W; x++) { s += a[y * W + x]; S[(y + 1) * (W + 1) + x + 1] = S[y * (W + 1) + x + 1] + s; } }
    for (let y = 0; y < H; y++) { const y0 = Math.max(0, y - r), y1 = Math.min(H, y + r + 1);
      for (let x = 0; x < W; x++) { const x0 = Math.max(0, x - r), x1 = Math.min(W, x + r + 1);
        o[y * W + x] = (S[y1 * (W + 1) + x1] - S[y0 * (W + 1) + x1] - S[y1 * (W + 1) + x0] + S[y0 * (W + 1) + x0]) / ((x1 - x0) * (y1 - y0)); } }
    return o; }
  /** حذف اثر سایه و نور ناهمگون: تقسیم بر پس‌زمینهٔ محلی (کاغذ ≈ ۲۵۵) */
  function normalize(g, W, H, r) { r = r || 30; const m = boxMean(g, W, H, r), b = new Float32Array(W * H);
    for (let i = 0; i < b.length; i++) b[i] = Math.max(g[i], m[i]);
    const bg = boxMean(b, W, H, r), o = new Uint8Array(W * H); for (let i = 0; i < o.length; i++) o[i] = Math.min(255, g[i] / Math.max(1, bg[i]) * 255); return o; }
  function rotate(g, W, H, deg) { if (Math.abs(deg) < 0.03) return g; const a = deg * Math.PI / 180, c = Math.cos(a), s = Math.sin(a), cx = W / 2, cy = H / 2, o = new Uint8Array(W * H).fill(255);
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) { const dx = x - cx, dy = y - cy, u = c * dx + s * dy + cx, v = -s * dx + c * dy + cy;
      if (u < 0 || v < 0 || u >= W - 1 || v >= H - 1) continue; const x0 = u | 0, y0 = v | 0, fx = u - x0, fy = v - y0, p = y0 * W + x0;
      o[y * W + x] = (g[p] * (1 - fx) + g[p + 1] * fx) * (1 - fy) + (g[p + W] * (1 - fx) + g[p + W + 1] * fx) * fy; } return o; }
  function skewAngle(m, W, H) { const pts = []; for (let y = 0; y < H; y += 2) for (let x = 0; x < W; x += 2) if (m[y * W + x]) pts.push(x, y);
    const st = Math.max(2, 2 * Math.ceil(pts.length / 2 / 150000)), sc = a => { const s = Math.sin(a * Math.PI / 180), c = Math.cos(a * Math.PI / 180), h = new Float64Array(H + W + 8);
      for (let i = 0; i < pts.length; i += st) h[Math.round(pts[i + 1] * c + pts[i] * s) + W / 2 | 0]++; let t = 0; for (const v of h) t += v * v; return t; };
    let best = 0, bs = -1; for (let a = -5; a <= 5.001; a += 0.25) { const v = sc(a); if (v > bs) { bs = v; best = a; } }
    for (let a = best - 0.25; a <= best + 0.251; a += 0.05) { const v = sc(a); if (v > bs) { bs = v; best = a; } } return best; }
  function lineScores(m, W, H, horiz, minLen, gap) { const n = horiz ? H : W, L = horiz ? W : H, sc = new Float32Array(n);
    for (let k = 0; k < n; k++) { let run = 0, g = 0, tot = 0;
      for (let t = 0; t < L; t++) { const v = horiz ? m[k * W + t] : m[t * W + k];
        if (v) { run += 1 + g; g = 0; } else if (run && g < gap) g++; else { if (run >= minLen) tot += run; run = 0; g = 0; } }
      if (run >= minLen) tot += run; sc[k] = tot; } return sc; }
  function dil(m, W, H, horiz, r) { const o = new Uint8Array(W * H); for (let d = -r; d <= r; d++) for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
      const yy = horiz ? y + d : y, xx = horiz ? x : x + d; if (yy >= 0 && yy < H && xx >= 0 && xx < W && m[yy * W + xx]) o[y * W + x] = 1; } return o; }
  function groups(sc, thr) { const out = []; let i = 0; while (i < sc.length) { if (sc[i] >= thr) { let sw = 0, s = 0, mx = 0, j = i; while (j < sc.length && sc[j] >= thr) { sw += sc[j]; s += sc[j] * j; mx = Math.max(mx, sc[j]); j++; } out.push({ p: s / sw, w: mx }); i = j; } else i++; } return out; }
  /** n خط هم‌فاصله را از خطوط پیداشده انتخاب می‌کند (خطوط اضافی مثل لبهٔ کاغذ حذف، یک خط جاافتاده بازسازی می‌شود) */
  function pickLines(gr, n) { if (gr.length < n - 1) return null; let best = null;
    for (let i = 0; i < gr.length; i++) for (let j = i + 1; j < gr.length; j++) for (let m = 1; m <= n - 1; m++) { const d = (gr[j].p - gr[i].p) / m;
      for (let k1 = 0; k1 + m <= n - 1; k1++) { const p0 = gr[i].p - k1 * d; let hit = 0, err = 0; const used = [];
        for (let k = 0; k < n; k++) { const pk = p0 + k * d; let bi = -1, bd = 0.12 * d; gr.forEach((g, ix) => { const e = Math.abs(g.p - pk); if (e < bd) { bd = e; bi = ix; } }); if (bi >= 0) { hit++; err += bd; used.push([k, gr[bi].p]); } }
        const score = hit * 1000 - err; if (!best || score > best.score) best = { score, hit, used }; } }
    if (!best || best.hit < n - 1 || best.hit < 2) return null; const u = best.used, N = u.length; let sk = 0, sp = 0, skk = 0, skp = 0; u.forEach(([k, p]) => { sk += k; sp += p; skk += k * k; skp += k * p; });
    const b = (N * skp - sk * sp) / (N * skk - sk * sk), a = (sp - b * sk) / N, pos = []; for (let k = 0; k < n; k++) { const f = u.find(x => x[0] === k); pos.push(f ? f[1] : a + b * k); } return { pos, hit: best.hit }; }
  /** تشخیص جدول R×C روی تصویر نرمال‌شده؛ خروجی: تصویر صاف‌شده و grid={xs,ys,ok,msg,angle} */
  function detectGrid(nr, W, H, R, C) {
    const thr = 255 * 0.88, m0 = new Uint8Array(W * H); for (let i = 0; i < m0.length; i++) m0[i] = nr[i] < thr ? 1 : 0;
    const ang = skewAngle(m0, W, H), img = rotate(nr, W, H, ang), m = new Uint8Array(W * H); for (let i = 0; i < m.length; i++) m[i] = img[i] < thr ? 1 : 0;
    const hs = lineScores(dil(m, W, H, true, 2), W, H, true, 0.15 * W, 3), vs = lineScores(dil(m, W, H, false, 2), W, H, false, 0.12 * H, 3);
    const gy = groups(hs, 0.15 * Math.max(...hs)), gx = groups(vs, 0.15 * Math.max(...vs)), py = pickLines(gy, R + 1), px = pickLines(gx, C + 1), g = { angle: ang, ok: false, msg: '' };
    if (!px || !py) { g.msg = 'خطوط جدول به‌اندازهٔ کافی پیدا نشد (' + (px ? '' : 'ستون‌ها ') + (py ? '' : 'ردیف‌ها') + '). نور، سایه یا برش برگه را بررسی کنید یا مرز جدول را دستی تنظیم کنید.'; g.xs = px ? px.pos : lin(0.06 * W, 0.94 * W, C); g.ys = py ? py.pos : lin(0.07 * H, 0.93 * H, R); return { img, grid: g }; }
    g.xs = px.pos; g.ys = py.pos; g.hitX = px.hit; g.hitY = py.hit; const cw = (g.xs[C] - g.xs[0]) / C, ch = (g.ys[R] - g.ys[0]) / R, ratio = cw / ch;
    if (ratio < 0.6 || ratio > 1.7 || (g.xs[C] - g.xs[0]) < 0.5 * W) g.msg = 'شکل جدول تشخیص‌داده‌شده با برگهٔ نمونه نمی‌خواند؛ مرز جدول را دستی تنظیم کنید.';
    else { g.ok = true; g.msg = 'جدول با ' + (C + 1 - g.hitX + R + 1 - g.hitY ? 'بازسازی ' + (C + 1 - g.hitX + R + 1 - g.hitY) + ' خط جاافتاده و ' : '') + 'چرخش ' + ang.toFixed(1) + '° شناسایی شد.'; }
    return { img, grid: g }; }
  const lin = (a, b, n) => Array.from({ length: n + 1 }, (_, i) => a + (b - a) * i / n);
  /** ناحیهٔ استخراج خانهٔ i با مختصات واقعی جدول؛ برچسب بالا، خط مبنا و حاشیه‌ها خارج‌اند */
  function gridArea(grid, i) { const j = i % PER, c = COLS - 1 - (j % COLS), r = Math.floor(j / COLS), x0 = grid.xs[c], x1 = grid.xs[c + 1], y0 = grid.ys[r], y1 = grid.ys[r + 1], w = x1 - x0, h = y1 - y0, ix = Math.max(5, 0.05 * w), top = y0 + TOP * h, bot = y1 - Math.max(5, 0.035 * h);
    return { x: Math.round(x0 + ix), y: Math.round(top), w: Math.round(w - 2 * ix), h: Math.round(bot - top), base: (BL - TOP) * h, k: 800 / ((BL - TOP) * h) }; }
  const rowsOf = pg => Math.ceil((Math.min(cellList().length, (pg + 1) * PER) - pg * PER) / COLS);

  const api = { PW, PH, COLS, ROWS, PER, K, cellList, cellBox, exArea, warp, otsu, trace, extract, toGlyph, autoCorners, normalize, rotate, detectGrid, gridArea, rowsOf, lin, BL, TOP, area };
  if (typeof module !== 'undefined') module.exports = api; else root.ImageEngine = api;
})(typeof self !== 'undefined' ? self : this);
