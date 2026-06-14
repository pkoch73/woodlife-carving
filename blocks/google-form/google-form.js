export default function decorate(block) {
  const url = block.textContent.trim();

  if (!url) return;

  block.innerHTML = '';

  const iframe = document.createElement('iframe');
  iframe.src = url;
  iframe.width = '100%';
  iframe.height = '900';
  iframe.style.border = '0';

  block.appendChild(iframe);
}
