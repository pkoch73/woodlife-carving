export default function decorate(block) {
  const url = block.textContent.trim();
  if (!url) return;

  block.innerHTML = '';

  const wrapper = document.createElement('div');
  wrapper.className = 'google-form-wrapper';

  const iframe = document.createElement('iframe');
  iframe.src = url;
  iframe.style.width = '100%';
  iframe.style.border = '0';
  iframe.style.display = 'block';

  // key fix: let CSS control height
  iframe.className = 'google-form-iframe';

  wrapper.appendChild(iframe);
  block.appendChild(wrapper);
}
