const $ = (id) => document.getElementById(id);
const status = $('status');
let img, name = 'photo';

$('file').addEventListener('change', async () => {
  const f = $('file').files[0];
  if (!f) return;
  name = f.name.replace(/\.[^.]+$/, '') || 'photo';
  try {
    img = await new Promise((res, rej) => {
      const i = new Image();
      i.onload = () => res(i);
      i.onerror = rej;
      i.src = URL.createObjectURL(f);
    });
    run();
  } catch {
    status.textContent = 'This browser can’t open that file. If it’s an iPhone HEIC photo, export it as JPEG first.';
  }
});
$('preset').addEventListener('change', () => {
  $('custom').hidden = $('preset').value !== 'custom';
  if (img) run();
});
$('kb').addEventListener('change', () => img && run());
$('px').addEventListener('change', () => img && run());

function limits() {
  if ($('preset').value === 'custom') return { kb: Number($('kb').value) || 100, px: Number($('px').value) || 0 };
  const [kb, px] = $('preset').value.split('|');
  return { kb: Number(kb), px: Number(px) || 0 };
}

const encode = (canvas, q) => new Promise((res) => canvas.toBlob(res, 'image/jpeg', q));

async function run() {
  const { kb, px } = limits();
  const target = kb * 1024;
  status.textContent = 'Compressing…';
  let scale = px ? Math.min(1, px / Math.max(img.naturalWidth, img.naturalHeight)) : 1;
  let best = null;
  // Try quality first (binary search), then shrink the pixels by 10% at a time if needed.
  for (let round = 0; round < 25 && !best; round++) {
    const c = document.createElement('canvas');
    c.width = Math.max(1, Math.round(img.naturalWidth * scale));
    c.height = Math.max(1, Math.round(img.naturalHeight * scale));
    const ctx = c.getContext('2d');
    ctx.fillStyle = '#fff';
    ctx.fillRect(0, 0, c.width, c.height);
    ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(img, 0, 0, c.width, c.height);
    let lo = 0.4, hi = 0.95, found = null;
    for (let i = 0; i < 7; i++) {
      const q = (lo + hi) / 2;
      const b = await encode(c, q);
      if (b.size <= target) { found = { blob: b, q, w: c.width, h: c.height }; lo = q; } else hi = q;
    }
    if (found) best = found;
    else scale *= 0.9;
  }
  if (!best) { status.textContent = 'Couldn’t get it under that limit.'; return; }
  const url = URL.createObjectURL(best.blob);
  $('preview').src = url;
  $('download').href = url;
  $('download').download = `${name}-${kb}kb.jpg`;
  $('info').textContent = `${best.w} x ${best.h} px, ${Math.round(best.blob.size / 1024)} KB (limit ${kb} KB), JPEG quality ${Math.round(best.q * 100)}.`;
  $('out').hidden = false;
  status.textContent = '';
}
