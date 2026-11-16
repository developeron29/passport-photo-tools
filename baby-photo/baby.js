import { detectFaces } from '../assets/face.js';
import { loadImageFile } from '../assets/jpeg.js';

const $ = (id) => document.getElementById(id);
let img;

$('file').addEventListener('change', async () => {
  const f = $('file').files[0];
  if (!f) return;
  try { img = await loadImageFile(f); run(); }
  catch { $('status').textContent = 'This browser can’t open that file. If it’s an iPhone HEIC photo, convert it to JPEG first.'; }
});
$('age').addEventListener('change', () => img && run());

const lumAt = (ctx, x, y, r) => {
  const d = ctx.getImageData(Math.max(0, x - r), Math.max(0, y - r), r * 2, r * 2).data;
  let s = 0;
  for (let i = 0; i < d.length; i += 4) s += 0.2126 * d[i] + 0.7152 * d[i + 1] + 0.0722 * d[i + 2];
  return s / (d.length / 4);
};

async function run() {
  const baby = $('age').value === 'baby';
  const c = $('canvas');
  const s = Math.min(1, 900 / Math.max(img.naturalWidth, img.naturalHeight));
  c.width = Math.round(img.naturalWidth * s);
  c.height = Math.round(img.naturalHeight * s);
  const ctx = c.getContext('2d', { willReadFrequently: true });
  ctx.drawImage(img, 0, 0, c.width, c.height);
  $('status').textContent = 'Checking…';

  const checks = [];
  const add = (level, title, detail = '') => checks.push({ level, title, detail });
  let faces;
  try { faces = await detectFaces(c, c.width, c.height); }
  catch { $('status').textContent = 'The face model could not load. Check your connection and try again.'; return; }

  if (faces.length === 0) add('bad', 'No face found', 'The whole face must be visible and facing the camera.');
  else if (faces.length > 1) add('bad', 'More than one person', 'No other person can be in the photo.');
  else {
    const f = faces[0];
    add('ok', 'One face, no one else visible', 'Make sure no hands or arms are in the frame either.');
    if (Math.abs(f.yaw) > 0.15) add('bad', 'Not facing the camera', 'The child must face the camera straight on.');
    else add('ok', 'Facing the camera');
    if (f.eyeTilt > 8) add('warn', `Head tilted about ${Math.round(f.eyeTilt)}°`, 'Keep the head level if you can.');
    const closed = (f.blink.l + f.blink.r) / 2 > 0.5;
    if (closed && baby) add('ok', 'Eyes not fully open', 'That is allowed for babies.');
    else if (closed) add('bad', 'Eyes closed', 'Children other than babies must have their eyes open.');
    else add('ok', 'Eyes open');
    if (f.smile > 0.6 || f.jawOpen > 0.35) add('warn', 'Expression may not be neutral', 'A wide smile, crying or an open mouth can be refused. Try for a calm, neutral face.');
    else add('ok', 'Neutral expression');

    // Shadows: compare light on the two cheeks.
    const r = Math.max(3, Math.round(f.faceW * 0.06));
    const lc = lumAt(ctx, Math.round(f.cheekL.x), Math.round(f.cheekL.y), r);
    const rc = lumAt(ctx, Math.round(f.cheekR.x), Math.round(f.cheekR.y), r);
    if (Math.abs(lc - rc) > 28) add('warn', 'Uneven light on the face', 'One side of the face is darker. Light the face evenly, facing a window.');
    else add('ok', 'Even light on the face');

    // Head size, against the 2x2 in photo (50–69% of the height), using the crop it would need.
    const headH = f.chinY - f.crownY;
    const room = (Math.min(c.width, c.height)) / headH;
    if (room < 1 / 0.69) add('bad', 'Too tight around the head', 'Leave space around the head so it can be cropped to a 2x2 in photo.');
    else add('ok', 'Enough space around the head to crop to 2x2 in');

    // Background beside the head.
    const top = Math.max(0, Math.round(f.crownY));
    const bottom = Math.round(Math.min(f.chinY, c.height));
    const samples = [];
    for (const [x0, x1] of [[2, f.left - f.faceW * 0.15], [f.right + f.faceW * 0.15, c.width - 2]]) {
      const w = Math.round(x1 - x0);
      if (w < 4 || bottom - top < 4) continue;
      const d = ctx.getImageData(Math.round(x0), top, w, bottom - top).data;
      for (let i = 0; i < d.length; i += 16) samples.push([0.2126 * d[i] + 0.7152 * d[i + 1] + 0.0722 * d[i + 2], Math.max(d[i], d[i + 1], d[i + 2]) - Math.min(d[i], d[i + 1], d[i + 2])]);
    }
    if (samples.length > 50) {
      const mean = samples.reduce((a, s) => a + s[0], 0) / samples.length;
      const chroma = samples.reduce((a, s) => a + s[1], 0) / samples.length;
      const std = Math.sqrt(samples.reduce((a, s) => a + (s[0] - mean) ** 2, 0) / samples.length);
      if (mean < 200 || chroma > 25) add('bad', 'Background not white', 'Use a plain white or off-white sheet behind the child.');
      else if (std > 25) add('warn', 'Background not plain', 'Smooth out the sheet and remove toys or patterns.');
      else add('ok', 'Plain white background');
    }
  }

  $('checks').replaceChildren(...checks.map((ch) => {
    const li = document.createElement('li');
    li.className = ch.level;
    li.innerHTML = `<span class="mark">${ch.level === 'ok' ? '✓' : ch.level === 'warn' ? '!' : '✗'}</span><span><span></span><br><span class="detail"></span></span>`;
    li.querySelector('span > span').textContent = ch.title;
    li.querySelector('.detail').textContent = ch.detail;
    return li;
  }));
  $('result').hidden = false;
  const bad = checks.filter((x) => x.level === 'bad').length;
  $('status').textContent = bad ? `${bad} problem${bad > 1 ? 's' : ''} found.` : 'No problems found by these checks.';
}
