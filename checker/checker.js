import { SPECS, makerUrl } from '../assets/specs.js';

// MediaPipe Face Landmarker, pinned. Loaded only when a photo is chosen.
const MP_VERSION = '1.0.1';
const MP_BASE = `https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@${MP_VERSION}`;
const FACE_MODEL = 'https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task';
// MediaPipe has no crown landmark; the top of the head is estimated from the chin (152) and the
// hairline landmark (10): top = chin - (chin - lm10) * 1.47, the same factor visaphotos.app uses.
const HEAD_TOP_FACTOR = 1.47;

const $ = (id) => document.getElementById(id);
const docSel = $('doc');
const fileIn = $('file');
const status = $('status');

for (const s of SPECS) docSel.add(new Option(s.name, s.id));
docSel.value = new URLSearchParams(location.search).get('doc') || 'us-visa';

let landmarker;
async function getLandmarker() {
  if (landmarker) return landmarker;
  const { FilesetResolver, FaceLandmarker } = await import(`${MP_BASE}/vision_bundle.mjs`);
  const fileset = await FilesetResolver.forVisionTasks(`${MP_BASE}/wasm`);
  landmarker = await FaceLandmarker.createFromOptions(fileset, {
    baseOptions: { modelAssetPath: FACE_MODEL },
    runningMode: 'IMAGE',
    numFaces: 2,
  });
  return landmarker;
}

let current; // { file, img }
fileIn.addEventListener('change', async () => {
  const file = fileIn.files[0];
  if (!file) return;
  status.textContent = 'Reading photo…';
  try {
    const img = await loadImage(file);
    current = { file, img };
    await run();
  } catch {
    status.textContent = 'This browser can’t open that file. If it’s an iPhone HEIC photo, export it as JPEG first.';
  }
});
docSel.addEventListener('change', () => {
  history.replaceState(null, '', `?doc=${docSel.value}`);
  updateCta();
  if (current) run();
});
updateCta();

function updateCta() {
  const spec = SPECS.find((s) => s.id === docSel.value);
  $('cta-text').textContent = `visaphotos.app crops and sizes your photo to the ${spec.name} rules, with a free preview.`;
  $('cta-link').href = makerUrl(spec, 'checker-top');
  $('cta-link').textContent = `Make ${/^[AEIOU]/i.test(spec.name) ? 'an' : 'a'} ${spec.name} photo`;
}

function loadImage(file) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = URL.createObjectURL(file);
  });
}

async function run() {
  const spec = SPECS.find((s) => s.id === docSel.value);
  const { file, img } = current;
  const W = img.naturalWidth, H = img.naturalHeight;
  const checks = [];
  const add = (level, title, detail = '') => checks.push({ level, title, detail });

  // Format
  if (file.type === 'image/jpeg') add('ok', 'JPEG file');
  else add('bad', `${file.type.replace('image/', '').toUpperCase() || 'Unknown'} file, not JPEG`, 'Most upload forms only accept JPEG. Export or convert it to JPEG.');

  // Shape
  const want = spec.w / spec.h, got = W / H;
  if (Math.abs(got - want) / want <= 0.01) add('ok', `Shape matches (${W} x ${H} px)`);
  else add('bad', `Wrong shape: ${W} x ${H} px`, `${spec.name} photos are ${spec.w === spec.h ? 'square' : `${spec.w} x ${spec.h} in proportion`}. Crop it to that shape.`);

  // Pixels
  const minPx = spec.minPx ?? Math.min(spec.w, spec.h);
  const short = Math.min(W, H);
  if (short < minPx) add('bad', `Too small: ${W} x ${H} px`, `Needs at least ${spec.minPx ?? spec.w} x ${spec.minPx ?? spec.h} px.`);
  else if (spec.maxPx && Math.max(W, H) > spec.maxPx) add('bad', `Too large: ${W} x ${H} px`, `Must be at most ${spec.maxPx} x ${spec.maxPx} px. Resize it down.`);
  else add('ok', 'Enough pixels');

  // File size
  const kb = file.size / 1024;
  const kbText = kb >= 1000 ? `${(kb / 1024).toFixed(1)} MB` : `${Math.round(kb)} KB`;
  if (spec.maxKb && kb > spec.maxKb) add('bad', `File too big: ${kbText}`, `The limit is ${fmtKb(spec.maxKb)}. Compress it (try the free compressor on this site).`);
  else if (spec.minKb && kb < spec.minKb) add('bad', `File too small: ${kbText}`, `Must be at least ${fmtKb(spec.minKb)}. Save it at higher quality.`);
  else add('ok', `File size ${kbText}${spec.maxKb ? ` (limit ${fmtKb(spec.maxKb)})` : ''}`);

  // Draw + face
  const canvas = $('canvas');
  const scale = Math.min(1, 900 / Math.max(W, H));
  canvas.width = Math.round(W * scale);
  canvas.height = Math.round(H * scale);
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

  status.textContent = 'Finding your face…';
  let face = null;
  try {
    const lm = await getLandmarker();
    const res = lm.detect(canvas);
    const faces = res.faceLandmarks || [];
    if (faces.length === 0) add('bad', 'No face found', 'Use a front-facing photo with your whole face visible.');
    else if (faces.length > 1) add('bad', 'More than one face', 'Only you should be in the photo.');
    else face = faces[0];
  } catch {
    add('warn', 'Face check unavailable', 'The face model could not load. The other checks still apply.');
  }

  let faceBox = null;
  if (face) {
    const px = (p) => ({ x: p.x * canvas.width, y: p.y * canvas.height });
    const chin = px(face[152]), top10 = px(face[10]);
    const crown = chin.y - (chin.y - top10.y) * HEAD_TOP_FACTOR;
    const headPct = ((chin.y - crown) / canvas.height) * 100;
    const xs = face.map((p) => p.x * canvas.width);
    faceBox = { left: Math.min(...xs), right: Math.max(...xs), top: Math.max(0, crown), bottom: chin.y };

    // The crown is an estimate (the 1.47 factor is a median), so only call it cut off when clearly above the frame.
    const headroom = crown / canvas.height;
    if (headroom < -0.04) add('bad', 'Top of head looks cut off', 'Leave space above your hair.');
    else if (headroom < 0.03) add('warn', 'Very little space above the head', 'Most documents want a small gap between the top of your hair and the edge.');
    if (spec.head) {
      const [lo, hi] = spec.head;
      const r = `${lo}–${hi}%`;
      if (headPct < lo - 2) add('bad', `Head too small (about ${Math.round(headPct)}% of the height)`, `${spec.name} needs ${r}. Crop closer.`);
      else if (headPct > hi + 2) add('bad', `Head too large (about ${Math.round(headPct)}% of the height)`, `${spec.name} needs ${r}. Leave more space around your head.`);
      else add('ok', `Head size about ${Math.round(headPct)}% (needs ${r})`);
    }
    const cx = ((faceBox.left + faceBox.right) / 2) / canvas.width;
    if (Math.abs(cx - 0.5) > 0.08) add('warn', 'Face not centred', 'Centre your face horizontally.');
    else add('ok', 'Face centred');
    const le = px(face[33]), re = px(face[263]);
    const tilt = Math.abs((Math.atan2(re.y - le.y, re.x - le.x) * 180) / Math.PI);
    if (tilt > 5) add('warn', `Head tilted about ${Math.round(tilt)}°`, 'Keep your head level.');
    else add('ok', 'Head level');

    ctx.strokeStyle = '#ff8a00';
    ctx.lineWidth = Math.max(2, canvas.width / 300);
    for (const y of [crown, chin.y]) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(canvas.width, y); ctx.stroke(); }
  }

  // Background: sample the strips beside the head, above the shoulders.
  const bgCheck = background(ctx, canvas.width, canvas.height, faceBox);
  if (bgCheck) {
    const { mean, std, chroma } = bgCheck;
    if (std > 28) add('warn', 'Background not plain', 'Use a plain wall with nothing behind you.');
    if (spec.bg === 'white' && (mean < 200 || chroma > 25)) add('bad', 'Background not white enough', `${spec.name} needs a white or off-white background.`);
    else if (spec.bg === 'notWhite' && mean > 245 && chroma < 10) add('bad', 'Background is white', `${spec.name} needs a light background that is not white, such as light grey or cream.`);
    else if (spec.bg === 'light' && mean < 160) add('bad', 'Background too dark', 'Use a plain light-coloured background.');
    else if (std <= 28) add('ok', 'Background plain and light enough');
  }

  const list = $('checks');
  list.replaceChildren(...checks.map((c) => {
    const li = document.createElement('li');
    li.className = c.level;
    li.innerHTML = `<span class="mark">${c.level === 'ok' ? '✓' : c.level === 'warn' ? '!' : '✗'}</span><span><span></span><br><span class="detail"></span></span>`;
    li.querySelector('span > span').textContent = c.title;
    li.querySelector('.detail').textContent = c.detail;
    return li;
  }));
  $('result').hidden = false;
  const bad = checks.filter((c) => c.level === 'bad').length;
  status.textContent = bad ? `${bad} problem${bad > 1 ? 's' : ''} found.` : 'No problems found by these checks.';
}

function background(ctx, w, h, faceBox) {
  // Left and right strips from the top down to the chin, outside the face.
  const top = Math.round(h * 0.02);
  const bottom = Math.round(faceBox ? Math.min(faceBox.bottom, h * 0.6) : h * 0.35);
  const strips = faceBox
    ? [[2, Math.max(4, faceBox.left - w * 0.08)], [Math.min(w - 4, faceBox.right + w * 0.08), w - 2]]
    : [[2, w * 0.15], [w * 0.85, w - 2]];
  const lum = [], chr = [];
  for (const [x0, x1] of strips) {
    const sw = Math.round(x1 - x0);
    if (sw < 3 || bottom - top < 3) continue;
    const d = ctx.getImageData(Math.round(x0), top, sw, bottom - top).data;
    for (let i = 0; i < d.length; i += 16) {
      const r = d[i], g = d[i + 1], b = d[i + 2];
      lum.push(0.2126 * r + 0.7152 * g + 0.0722 * b);
      chr.push(Math.max(r, g, b) - Math.min(r, g, b));
    }
  }
  if (lum.length < 50) return null;
  const mean = lum.reduce((a, b) => a + b, 0) / lum.length;
  const std = Math.sqrt(lum.reduce((a, b) => a + (b - mean) ** 2, 0) / lum.length);
  const chroma = chr.reduce((a, b) => a + b, 0) / chr.length;
  return { mean, std, chroma };
}

function fmtKb(kb) {
  return kb >= 1000 ? `${Number((kb / 1000).toFixed(1))} MB` : `${kb} KB`;
}
