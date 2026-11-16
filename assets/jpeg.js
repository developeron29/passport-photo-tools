// JPEG helpers shared by the tools: encode under a size limit, set the DPI header, and pad up to
// a minimum size (some forms refuse files under 10–20 KB, which a small signature never reaches).

/** Write the pixel density (DPI) into the JFIF header, inserting one if missing. */
export function setJfifDpi(jpeg, dpi) {
  const hasJfif = jpeg[2] === 0xff && jpeg[3] === 0xe0 && jpeg[6] === 0x4a && jpeg[7] === 0x46;
  if (hasJfif) {
    const out = jpeg.slice();
    out[13] = 1;
    out[14] = (dpi >> 8) & 0xff; out[15] = dpi & 0xff;
    out[16] = (dpi >> 8) & 0xff; out[17] = dpi & 0xff;
    return out;
  }
  const app0 = new Uint8Array([0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46, 0x49, 0x46, 0x00, 0x01, 0x01, 0x01,
    (dpi >> 8) & 0xff, dpi & 0xff, (dpi >> 8) & 0xff, dpi & 0xff, 0x00, 0x00]);
  const out = new Uint8Array(jpeg.length + app0.length);
  out.set(jpeg.subarray(0, 2), 0);
  out.set(app0, 2);
  out.set(jpeg.subarray(2), 2 + app0.length);
  return out;
}

/** Add blank comment segments after the header until the file reaches minBytes. The image is unchanged. */
export function padToMinBytes(jpeg, minBytes) {
  let missing = minBytes - jpeg.length;
  if (missing <= 0) return jpeg;
  const segs = [];
  while (missing > 0) {
    const payload = Math.min(65533, Math.max(1, missing - 4));
    const seg = new Uint8Array(payload + 4);
    seg[0] = 0xff; seg[1] = 0xfe;
    seg[2] = ((payload + 2) >> 8) & 0xff; seg[3] = (payload + 2) & 0xff;
    seg.fill(0x20, 4);
    segs.push(seg);
    missing -= seg.length;
  }
  const at = jpeg[2] === 0xff && jpeg[3] === 0xe0 ? 4 + ((jpeg[4] << 8) | jpeg[5]) : 2;
  const out = new Uint8Array(jpeg.length + segs.reduce((a, s) => a + s.length, 0));
  out.set(jpeg.subarray(0, at), 0);
  let o = at;
  for (const s of segs) { out.set(s, o); o += s.length; }
  out.set(jpeg.subarray(at), o);
  return out;
}

const toBytes = (canvas, q) =>
  new Promise((res) => canvas.toBlob((b) => b.arrayBuffer().then((a) => res(new Uint8Array(a))), 'image/jpeg', q));

/**
 * Encode a canvas as JPEG at the highest quality that fits maxKb, then set the DPI and pad to minKb.
 * Returns { blob, bytes, quality, fits }.
 */
export async function encodeJpeg(canvas, { maxKb, minKb, dpi } = {}) {
  let best = null;
  if (!maxKb) best = { b: await toBytes(canvas, 0.95), q: 0.95 };
  else {
    let lo = 0.3, hi = 0.97;
    for (let i = 0; i < 8; i++) {
      const q = (lo + hi) / 2;
      const b = await toBytes(canvas, q);
      if (b.length <= maxKb * 1024 - 64) { best = { b, q }; lo = q; } else hi = q;
    }
    if (!best) best = { b: await toBytes(canvas, 0.3), q: 0.3 };
  }
  let bytes = best.b;
  if (dpi) bytes = setJfifDpi(bytes, dpi);
  if (minKb) bytes = padToMinBytes(bytes, minKb * 1024 + 64);
  const fits = !maxKb || bytes.length <= maxKb * 1024;
  return { blob: new Blob([bytes], { type: 'image/jpeg' }), bytes, quality: best.q, fits };
}

export const kbText = (bytes) => (bytes >= 1024 * 1000 ? `${(bytes / 1048576).toFixed(1)} MB` : `${Math.round(bytes / 1024)} KB`);

export function loadImageFile(file) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = URL.createObjectURL(file);
  });
}
