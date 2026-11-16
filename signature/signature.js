import { encodeJpeg, kbText, loadImageFile } from '../assets/jpeg.js';

// From each exam's official notice (as tracked by visaphotos.app; check the current notice).
// mode "exact": fixed pixels; "aspect": cm box, exported at a width in px; "free": keep the signature's shape.
const PRESETS = [
  { id: 'sbi-po', name: 'SBI PO', mode: 'exact', w: 140, h: 60, minKb: 10, maxKb: 20, note: '140 x 60 px (preferred), 10–20 KB. Signatures in CAPITAL LETTERS are not accepted.' },
  { id: 'ibps-po', name: 'IBPS PO / Clerk', mode: 'exact', w: 140, h: 60, minKb: 10, maxKb: 20, note: '140 x 60 px, 10–20 KB, black ink on white paper.' },
  { id: 'ssc', name: 'SSC (CGL, CHSL, MTS, GD, CPO)', mode: 'aspect', cmW: 6, cmH: 2, exportW: 354, minKb: 10, maxKb: 20, note: 'About 6.0 x 2.0 cm, JPEG, 10–20 KB. The signature should fill at least 80% of the box.' },
  { id: 'rrb-ntpc', name: 'RRB NTPC', mode: 'aspect', cmW: 3.5, cmH: 2, exportW: 350, minKb: 30, maxKb: 49, note: '35 x 20 mm box, 30–49 KB, at least 140 x 60 px, running handwriting in black ink.' },
  { id: 'upsc', name: 'UPSC (three signatures)', mode: 'free', minSide: 350, maxSide: 500, minKb: 20, maxKb: 100, note: 'Three signatures one below the other, 350–500 px, 20–100 KB.' },
  { id: 'neet-ug', name: 'NEET UG', mode: 'free', maxSide: 600, minKb: 10, maxKb: 100, note: 'JPG, 10–100 KB. No pixel size given.' },
  { id: 'jee-main', name: 'JEE Main', mode: 'free', maxSide: 600, minKb: 10, maxKb: 100, note: 'JPG, 10–100 KB. No pixel size given.' },
  { id: 'cuet-ug', name: 'CUET UG', mode: 'free', maxSide: 600, minKb: 10, maxKb: 50, note: 'JPG, 10–50 KB. No pixel size given.' },
  { id: 'custom', name: 'Custom size', mode: 'exact' },
];

const $ = (id) => document.getElementById(id);
for (const p of PRESETS) $('preset').add(new Option(p.name, p.id));
let img;

function preset() {
  const p = PRESETS.find((x) => x.id === $('preset').value);
  if (p.id !== 'custom') return p;
  return { ...p, w: +$('cw').value || 140, h: +$('ch').value || 60, minKb: +$('cmin').value || 0, maxKb: +$('cmax').value || 20, note: 'Your own size and KB limits.' };
}
function showRule() {
  $('custom').hidden = $('preset').value !== 'custom';
  $('rule').textContent = preset().note;
}
showRule();
$('preset').addEventListener('change', () => { showRule(); if (img) run(); });
for (const id of ['cw', 'ch', 'cmin', 'cmax', 'clean']) $(id).addEventListener('change', () => img && run());
$('file').addEventListener('change', async () => {
  const f = $('file').files[0];
  if (!f) return;
  try { img = await loadImageFile(f); run(); }
  catch { $('status').textContent = 'This browser can’t open that file. If it’s an iPhone HEIC photo, convert it to JPEG first.'; }
});

const lum = (d, i) => 0.299 * d[i] + 0.587 * d[i + 1] + 0.114 * d[i + 2];

async function run() {
  const p = preset();
  $('status').textContent = 'Working…';
  // 1. Work on a copy at most 1600 px wide.
  const s = Math.min(1, 1600 / Math.max(img.naturalWidth, img.naturalHeight));
  const src = document.createElement('canvas');
  src.width = Math.round(img.naturalWidth * s);
  src.height = Math.round(img.naturalHeight * s);
  const sctx = src.getContext('2d', { willReadFrequently: true });
  sctx.drawImage(img, 0, 0, src.width, src.height);
  const data = sctx.getImageData(0, 0, src.width, src.height);
  const d = data.data;

  // 2. Paper brightness = 90th percentile of luminance; ink = clearly darker than the paper.
  const hist = new Array(256).fill(0);
  for (let i = 0; i < d.length; i += 4) hist[Math.round(lum(d, i))]++;
  const total = d.length / 4;
  let acc = 0, paper = 255;
  for (let v = 0; v < 256; v++) { acc += hist[v]; if (acc >= total * 0.9) { paper = v; break; } }
  const inkCut = paper * 0.72;

  // 3. Bounding box of ink, ignoring rows/columns with only a few dark pixels (noise, paper edges).
  const W = src.width, H = src.height;
  const rows = new Array(H).fill(0), cols = new Array(W).fill(0);
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    if (lum(d, (y * W + x) * 4) < inkCut) { rows[y]++; cols[x]++; }
  }
  const minRun = 2;
  let top = rows.findIndex((n) => n > minRun), bottom = H - 1 - [...rows].reverse().findIndex((n) => n > minRun);
  let left = cols.findIndex((n) => n > minRun), right = W - 1 - [...cols].reverse().findIndex((n) => n > minRun);
  if (top < 0 || left < 0) { $('status').textContent = 'No signature found. Use dark ink on white paper and a brighter photo.'; return; }
  const pad = Math.round(Math.max(right - left, bottom - top) * 0.06);
  left = Math.max(0, left - pad); top = Math.max(0, top - pad);
  right = Math.min(W - 1, right + pad); bottom = Math.min(H - 1, bottom + pad);

  // 4. Clean: paper to white, ink stretched darker.
  if ($('clean').checked) {
    for (let i = 0; i < d.length; i += 4) {
      const l = lum(d, i);
      if (l >= inkCut) { d[i] = d[i + 1] = d[i + 2] = 255; }
      else {
        const k = Math.max(0, (l / inkCut) * 0.6);
        d[i] = Math.round(d[i] * k); d[i + 1] = Math.round(d[i + 1] * k); d[i + 2] = Math.round(d[i + 2] * k);
      }
    }
    sctx.putImageData(data, 0, 0);
  }
  const cw = right - left + 1, ch = bottom - top + 1;

  // 5. Fit into the target canvas on white.
  let outW, outH;
  if (p.mode === 'exact') { outW = p.w; outH = p.h; }
  else if (p.mode === 'aspect') { outW = p.exportW; outH = Math.round((p.exportW * p.cmH) / p.cmW); }
  else {
    const long = Math.max(cw, ch);
    const target = Math.min(p.maxSide || 600, Math.max(p.minSide || 0, long));
    outW = Math.round((cw / long) * target); outH = Math.round((ch / long) * target);
  }
  const out = $('result');
  out.width = outW; out.height = outH;
  const octx = out.getContext('2d');
  octx.fillStyle = '#fff';
  octx.fillRect(0, 0, outW, outH);
  const fill = p.mode === 'free' ? 1 : 0.9; // signature fills about 90% of a fixed box
  const sc = Math.min((outW * fill) / cw, (outH * fill) / ch);
  const dw = cw * sc, dh = ch * sc;
  octx.imageSmoothingQuality = 'high';
  octx.drawImage(src, left, top, cw, ch, (outW - dw) / 2, (outH - dh) / 2, dw, dh);

  const res = await encodeJpeg(out, { maxKb: p.maxKb, minKb: p.minKb, dpi: 200 });
  const url = URL.createObjectURL(res.blob);
  $('download').href = url;
  $('download').download = `signature-${p.id}-${outW}x${outH}.jpg`;
  $('info').textContent = `${outW} x ${outH} px, ${kbText(res.bytes.length)}` +
    (p.maxKb ? ` (allowed ${p.minKb || 0}–${p.maxKb} KB)` : '') + (res.fits ? '.' : '. Could not get under the limit; try a cleaner photo.');
  $('out').hidden = false;
  $('status').textContent = '';
}
