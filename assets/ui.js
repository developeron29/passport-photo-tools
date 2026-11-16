// Small UI layer shared by every page: marks the current nav link and turns file inputs into drop zones.

const here = location.pathname.replace(/index\.html$/, '');
for (const a of document.querySelectorAll('header.site a:not(.home)')) {
  if (new URL(a.href).pathname === here) a.setAttribute('aria-current', 'page');
}

const ICON = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 8V5a1 1 0 0 1 1-1h3M16 4h3a1 1 0 0 1 1 1v3M20 16v3a1 1 0 0 1-1 1h-3M8 20H5a1 1 0 0 1-1-1v-3"/><circle cx="12" cy="10" r="3"/><path d="M7 17c1-2.5 3-3.5 5-3.5s4 1 5 3.5"/></svg>';

for (const input of document.querySelectorAll('input[type="file"]')) {
  const zone = document.createElement('div');
  zone.className = 'drop';
  const many = input.multiple;
  zone.innerHTML = `${ICON}<strong>${many ? 'Drop photos here' : 'Drop a photo here'}</strong><span>or click to choose · stays on your device</span><span class="file" hidden></span>`;
  input.replaceWith(zone);
  zone.prepend(input);
  const label = zone.querySelector('.file');
  input.addEventListener('change', () => {
    const n = input.files.length;
    label.hidden = !n;
    label.textContent = n > 1 ? `${n} files selected` : n ? `✓ ${input.files[0].name}` : '';
  });
  zone.addEventListener('dragover', (e) => { e.preventDefault(); zone.classList.add('over'); });
  zone.addEventListener('dragleave', () => zone.classList.remove('over'));
  zone.addEventListener('drop', (e) => {
    e.preventDefault();
    zone.classList.remove('over');
    if (!e.dataTransfer.files.length) return;
    input.files = e.dataTransfer.files;
    input.dispatchEvent(new Event('change'));
  });
}

/** Point the top call-to-action at a specific visaphotos.app page. */
window.setCta = ({ title, text, path, label }) => {
  const link = document.getElementById('cta-link');
  if (!link) return;
  if (title) document.getElementById('cta-title').textContent = title;
  if (text) document.getElementById('cta-text').textContent = text;
  link.href = `https://visaphotos.app${path}?utm_source=github&utm_medium=referral&utm_campaign=${link.dataset.camp}`;
  link.textContent = label;
};
