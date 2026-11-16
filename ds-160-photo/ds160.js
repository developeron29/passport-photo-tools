import { detectFaces } from '../assets/face.js';
import { encodeJpeg, kbText, loadImageFile } from '../assets/jpeg.js';

const $ = (id) => document.getElementById(id);
let img, face, work;

$('head').addEventListener('input', () => {
  $('headv').textContent = $('head').value;
  if (face) render();
});
$('file').addEventListener('change', async () => {
  const f = $('file').files[0];
  if (!f) return;
  try { img = await loadImageFile(f); }
  catch { $('status').textContent = 'This browser can’t open that file. If it’s an iPhone HEIC photo, convert it to JPEG first.'; return; }
  $('status').textContent = 'Finding your face…';
  const s = Math.min(1, 1600 / Math.max(img.naturalWidth, img.naturalHeight));
  work = document.createElement('canvas');
  work.width = Math.round(img.naturalWidth * s);
  work.height = Math.round(img.naturalHeight * s);
  work.getContext('2d').drawImage(img, 0, 0, work.width, work.height);
  try {
    const faces = await detectFaces(work, work.width, work.height);
    if (faces.length !== 1) {
      $('status').textContent = faces.length ? 'More than one face found. Use a photo of just you.' : 'No face found. Use a clear, front-facing photo.';
      $('out').hidden = true;
      face = null;
      return;
    }
    face = faces[0];
    render();
  } catch {
    $('status').textContent = 'The face model could not load. Check your connection and try again.';
  }
});

async function render() {
  const headPct = +$('head').value / 100;
  const scale = img.naturalWidth / work.width;
  const headH = (face.chinY - face.crownY) * scale;
  const S = headH / headPct; // square side in original pixels
  // Place the eye line 62% up from the bottom (the rule allows 56–69%).
  let x = face.centerX * scale - S / 2;
  let y = face.eyeY * scale - S * 0.38;
  const checks = [];
  const W = img.naturalWidth, H = img.naturalHeight;
  const over = Math.max(-x, -y, x + S - W, y + S - H, 0) / S;
  if (over > 0.03) {
    checks.push(['bad', 'Not enough space around your head', 'Use a photo taken from further away, with space above the hair and below the shoulders.']);
  }
  x = Math.min(Math.max(0, x), Math.max(0, W - S));
  y = Math.min(Math.max(0, y), Math.max(0, H - S));
  const side = Math.min(S, W, H);
  const outPx = Math.max(600, Math.min(1200, Math.round(side)));
  const c = $('result');
  c.width = c.height = side < 600 ? 600 : outPx;
  const ctx = c.getContext('2d');
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(img, x, y, side, side, 0, 0, c.width, c.height);

  const eyeFromBottom = 1 - ((face.eyeY * scale - y) / side);
  const res = await encodeJpeg(c, { maxKb: 240 });
  if (side < 600) checks.push(['warn', 'Low resolution', `Your photo has only ${Math.round(side)} px around the head; it was enlarged to 600 px. A sharper photo is safer.`]);
  checks.push(['ok', `${c.width} x ${c.height} px square`, '']);
  checks.push([res.fits ? 'ok' : 'bad', `${kbText(res.bytes.length)} JPEG`, res.fits ? 'Under the 240 KB limit.' : 'Still over 240 KB.']);
  checks.push(['ok', `Head ${Math.round(headPct * 100)}% of the height`, 'Allowed 50–69%.']);
  const ey = Math.round(eyeFromBottom * 100);
  checks.push([ey >= 56 && ey <= 69 ? 'ok' : 'warn', `Eyes ${ey}% up from the bottom`, 'Should be 56–69%. Adjust the head size if it’s outside.']);
  if (face.eyeTilt > 5) checks.push(['warn', `Head tilted about ${Math.round(face.eyeTilt)}°`, 'Keep your head level.']);
  if (Math.abs(face.yaw) > 0.15) checks.push(['warn', 'Not facing the camera', 'Look straight at the camera.']);

  $('checks').replaceChildren(...checks.map(([level, title, detail]) => {
    const li = document.createElement('li');
    li.className = level;
    li.innerHTML = `<span class="mark">${level === 'ok' ? '✓' : level === 'warn' ? '!' : '✗'}</span><span><span></span><br><span class="detail"></span></span>`;
    li.querySelector('span > span').textContent = title;
    li.querySelector('.detail').textContent = detail;
    return li;
  }));
  const url = URL.createObjectURL(res.blob);
  $('download').href = url;
  $('out').hidden = false;
  $('status').textContent = '';
}
