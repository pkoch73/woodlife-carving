export default function decorate(block) {
  const url = block.textContent.trim();
  if (!url) return;

  block.innerHTML = '';

  const iframe = document.createElement('iframe');
  iframe.src = url;
  iframe.style.width = '100%';
  iframe.style.border = '0';

  // 🔥 Responsive height logic
  function setHeight() {
    const vh = window.innerHeight;

    // mobile vs desktop scaling
    if (window.innerWidth < 768) {
      iframe.style.height = `${vh * 1.2}px`;
    } else {
      iframe.style.height = `${vh * 0.9}px`;
    }
  }

  setHeight();
  window.addEventListener('resize', setHeight);

  block.appendChild(iframe);
}
