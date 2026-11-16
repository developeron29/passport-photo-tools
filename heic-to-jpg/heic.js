import { kbText } from '../assets/jpeg.js';

const $ = (id) => document.getElementById(id);

$('file').addEventListener('change', async () => {
  const files = [...$('file').files];
  if (!files.length) return;
  $('out').replaceChildren();
  let done = 0;
  for (const f of files) {
    $('status').textContent = `Converting ${done + 1} of ${files.length}…`;
    const card = document.createElement('div');
    card.className = 'card';
    $('out').append(card);
    try {
      // heic2any (global from the CDN script) decodes HEIC with libheif compiled to JavaScript.
      let jpg = await window.heic2any({ blob: f, toType: 'image/jpeg', quality: 0.92 });
      if (Array.isArray(jpg)) jpg = jpg[0]; // multi-image HEIC: keep the first
      const url = URL.createObjectURL(jpg);
      const name = f.name.replace(/\.(heic|heif)$/i, '') + '.jpg';
      card.innerHTML = '<img class="preview" alt=""><p></p><a class="button">Download JPG</a>';
      card.querySelector('img').src = url;
      card.querySelector('p').textContent = `${name} · ${kbText(jpg.size)}`;
      const a = card.querySelector('a');
      a.href = url;
      a.download = name;
    } catch (e) {
      const isJpeg = /jpe?g$/i.test(f.name) || f.type === 'image/jpeg';
      card.textContent = `${f.name}: ${isJpeg ? 'already a JPEG, nothing to convert.' : 'could not convert this file. Is it a HEIC photo?'}`;
    }
    done++;
  }
  $('status').textContent = `Converted ${done} file${done > 1 ? 's' : ''}.`;
});
