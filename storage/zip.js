/* ZIP بدون فشرده‌سازی (store) برای پشتیبان کامل؛ خواندن فقط فایل‌های ساخته‌شده توسط همین برنامه را پشتیبانی می‌کند */
(function (r) {
  const T = new Uint32Array(256); for (let i = 0; i < 256; i++) { let c = i; for (let k = 0; k < 8; k++) c = c & 1 ? 0xEDB88320 ^ (c >>> 1) : c >>> 1; T[i] = c >>> 0; }
  const crc = b => { let c = -1; for (let i = 0; i < b.length; i++) c = T[(c ^ b[i]) & 255] ^ (c >>> 8); return (c ^ -1) >>> 0; };
  function make(files) { const enc = new TextEncoder(), parts = [], cd = []; let off = 0;
    for (const f of files) { const n = enc.encode(f.name), c = crc(f.data), L = f.data.length, h = new DataView(new ArrayBuffer(30));
      h.setUint32(0, 0x04034b50, true); h.setUint16(4, 20, true); h.setUint16(6, 0x0800, true); h.setUint32(14, c, true); h.setUint32(18, L, true); h.setUint32(22, L, true); h.setUint16(26, n.length, true);
      parts.push(new Uint8Array(h.buffer), n, f.data);
      const d = new DataView(new ArrayBuffer(46)); d.setUint32(0, 0x02014b50, true); d.setUint16(4, 20, true); d.setUint16(6, 20, true); d.setUint16(8, 0x0800, true); d.setUint32(16, c, true); d.setUint32(20, L, true); d.setUint32(24, L, true); d.setUint16(28, n.length, true); d.setUint32(42, off, true);
      cd.push(new Uint8Array(d.buffer), n); off += 30 + n.length + L; }
    let cs = 0; cd.forEach(x => cs += x.length); const e = new DataView(new ArrayBuffer(22)); e.setUint32(0, 0x06054b50, true); e.setUint16(8, files.length, true); e.setUint16(10, files.length, true); e.setUint32(12, cs, true); e.setUint32(16, off, true);
    return new Blob([...parts, ...cd, new Uint8Array(e.buffer)], { type: 'application/zip' }); }
  function read(buf) { const u = new Uint8Array(buf), v = new DataView(buf), dec = new TextDecoder(), out = {}; let e = u.length - 22;
    while (e >= 0 && v.getUint32(e, true) !== 0x06054b50) e--; if (e < 0) throw Error('bad zip');
    const n = v.getUint16(e + 10, true); let p = v.getUint32(e + 16, true);
    for (let i = 0; i < n; i++) { const m = v.getUint16(p + 10, true), c = v.getUint32(p + 20, true), nl = v.getUint16(p + 28, true), el = v.getUint16(p + 30, true), cl = v.getUint16(p + 32, true), lo = v.getUint32(p + 42, true);
      if (m !== 0) throw Error('compressed zip'); const s = lo + 30 + v.getUint16(lo + 26, true) + v.getUint16(lo + 28, true); out[dec.decode(u.subarray(p + 46, p + 46 + nl))] = u.slice(s, s + c); p += 46 + nl + el + cl; }
    return out; }
  const api = { make, read, crc }; if (typeof module !== 'undefined') module.exports = api; else r.Z = api;
})(typeof self !== 'undefined' ? self : this);
