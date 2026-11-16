// MediaPipe Face Landmarker (pinned), loaded on first use and shared by the tools.
const MP_VERSION = '1.0.1';
const MP_BASE = `https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@${MP_VERSION}`;
const FACE_MODEL = 'https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task';

// MediaPipe has no crown landmark. The top of the head is estimated from the chin (152) and the
// hairline landmark (10): top = chin - (chin - lm10) * 1.47, the factor visaphotos.app uses.
export const HEAD_TOP_FACTOR = 1.47;

let landmarker;
export async function getLandmarker() {
  if (landmarker) return landmarker;
  const { FilesetResolver, FaceLandmarker } = await import(`${MP_BASE}/vision_bundle.mjs`);
  const fileset = await FilesetResolver.forVisionTasks(`${MP_BASE}/wasm`);
  landmarker = await FaceLandmarker.createFromOptions(fileset, {
    baseOptions: { modelAssetPath: FACE_MODEL },
    runningMode: 'IMAGE',
    numFaces: 3,
    outputFaceBlendshapes: true,
  });
  return landmarker;
}

/**
 * Detect faces on a canvas or image. Returns pixel geometry for each face:
 * { crownY, chinY, centerX, left, right, eyeTilt, yaw, blink: {l, r} }.
 */
export async function detectFaces(source, w, h) {
  const lm = await getLandmarker();
  const res = lm.detect(source);
  return (res.faceLandmarks || []).map((f, i) => {
    const px = (p) => ({ x: p.x * w, y: p.y * h });
    const chin = px(f[152]), top = px(f[10]);
    const le = px(f[33]), re = px(f[263]), nose = px(f[1]);
    const xs = f.map((p) => p.x * w);
    const left = Math.min(...xs), right = Math.max(...xs);
    const eyeMidX = (le.x + re.x) / 2;
    const eyeSpan = Math.abs(re.x - le.x) || 1;
    const shapes = res.faceBlendshapes?.[i]?.categories || [];
    const score = (name) => shapes.find((c) => c.categoryName === name)?.score ?? 0;
    return {
      chinY: chin.y,
      crownY: chin.y - (chin.y - top.y) * HEAD_TOP_FACTOR,
      centerX: (left + right) / 2,
      left, right,
      eyeY: (le.y + re.y) / 2,
      eyeTilt: Math.abs((Math.atan2(re.y - le.y, re.x - le.x) * 180) / Math.PI),
      // Nose offset from the eye midpoint, relative to eye span: about 0 when facing the camera.
      yaw: (nose.x - eyeMidX) / eyeSpan,
      blink: { l: score('eyeBlinkLeft'), r: score('eyeBlinkRight') },
      smile: Math.max(score('mouthSmileLeft'), score('mouthSmileRight')),
      jawOpen: score('jawOpen'),
      // Mid-cheek points (left/right in the image), for comparing light on each side of the face.
      cheekL: px(f[205]),
      cheekR: px(f[425]),
      faceW: right - left,
    };
  });
}
