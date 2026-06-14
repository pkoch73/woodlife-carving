export default function decorate(block) {
  // Get URL from block content (supports both table cell and plain text)
  const link = block.querySelector('a');
  const url = link ? link.href : block.textContent.trim();

  if (!url) {
    block.innerHTML = '<p style="color:red;">Google Form URL missing</p>';
    return;
  }

  // Clear block
  block.innerHTML = '';

  const wrapper = document.createElement('div');
  wrapper.className = 'google-form-wrapper';

  const iframe = document.createElement('iframe');
  iframe.src = url;
  iframe.width = '100%';
  iframe.height = '900';
  iframe.frameBorder = '0';
  iframe.loading = 'lazy';

  wrapper.appendChild(iframe);
  block.appendChild(wrapper);
}
