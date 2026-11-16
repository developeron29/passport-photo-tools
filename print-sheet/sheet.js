const DPI = 300;
const SHEET_W = 6 * DPI; // landscape 6 x 4 in
const SHEET_H = 4 * DPI;
const GAP = Math.round(0.08 * DPI); // space between photos for cutting
const mmToPx = (mm) => Math.round((mm / 25.4) * DPI);

const $ = (id) => document.getElementById(id);
let img;

$('file').addEventListener('change', async () => {
  const f = $('file').files[0];
  if (!f) return;
  try {
    img = await new Promise((res, rej) => {
      const i = new Image();
      i.onload = () => res(i);
      i.onerror = rej;
      i.src = URL.createObjectURL(f);
    });
    draw();
  } catch {
    $('status').textContent = 'This browser can’t open that file. If it’s an iPhone HEIC photo, export it as JPEG first.';
  }
});
$('size').addEventListener('change', () => img && draw());

function draw() {
  const [wmm, hmm] = $('size').value.split('x').map(Number);
  const pw = mmToPx(wmm), ph = mmToPx(hmm);
  const cols = Math.floor((SHEET_W + GAP) / (pw + GAP));
  const rows = Math.floor((SHEET_H + GAP) / (ph + GAP));
  const gridW = cols * pw + (cols - 1) * GAP;
  const gridH = rows * ph + (rows - 1) * GAP;
  const x0 = Math.round((SHEET_W - gridW) / 2);
  const y0 = Math.round((SHEET_H - gridH) / 2);

  const c = $('sheet');
  c.width = SHEET_W;
  c.height = SHEET_H;
  const ctx = c.getContext('2d');
  ctx.fillStyle = '#fff';
  ctx.fillRect(0, 0, SHEET_W, SHEET_H);

  // Centre-crop the photo to the target shape (it should already be close).
  const want = pw / ph, have = img.naturalWidth / img.naturalHeight;
  let sx = 0, sy = 0, sw = img.naturalWidth, sh = img.naturalHeight;
  if (have > want) { sw = sh * want; sx = (img.naturalWidth - sw) / 2; } else { sh = sw / want; sy = (img.naturalHeight - sh) / 2; }
  const cropped = Math.abs(have - want) / want > 0.02;

  ctx.imageSmoothingQuality = 'high';
  for (let r = 0; r < rows; r++) {
    for (let k = 0; k < cols; k++) {
      ctx.drawImage(img, sx, sy, sw, sh, x0 + k * (pw + GAP), y0 + r * (ph + GAP), pw, ph);
    }
  }
  // Cut lines in the gaps and margins.
  ctx.strokeStyle = '#b5b5b5';
  ctx.lineWidth = 2;
  const vx = [x0 - GAP / 2, ...Array.from({ length: cols }, (_, k) => x0 + k * (pw + GAP) + pw + GAP / 2)];
  const hy = [y0 - GAP / 2, ...Array.from({ length: rows }, (_, r) => y0 + r * (ph + GAP) + ph + GAP / 2)];
  for (const x of vx) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, SHEET_H); ctx.stroke(); }
  for (const y of hy) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(SHEET_W, y); ctx.stroke(); }

  c.toBlob((b) => {
    $('download').href = URL.createObjectURL(b);
    $('download').download = `print-sheet-4x6-${wmm}x${hmm}mm.jpg`;
  }, 'image/jpeg', 0.95);
  $('info').textContent = `${cols * rows} photos of ${wmm === 50.8 ? '2 x 2 in' : `${wmm} x ${hmm} mm`} on a 4x6 in sheet.` +
    (cropped ? ' Your photo had a different shape, so it was centre-cropped: check the head isn’t cut off.' : '');
  $('out').hidden = false;
  $('status').textContent = '';
}
