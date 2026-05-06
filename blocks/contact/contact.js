function buildForm(action) {
  const form = document.createElement('form');
  form.className = 'contact-form';
  form.setAttribute('novalidate', '');

  form.innerHTML = `
    <div class="contact-field">
      <label for="contact-name">Name <span aria-hidden="true">*</span></label>
      <input id="contact-name" name="name" type="text" autocomplete="name" required>
    </div>
    <div class="contact-field">
      <label for="contact-email">Email <span aria-hidden="true">*</span></label>
      <input id="contact-email" name="email" type="email" autocomplete="email" required>
    </div>
    <div class="contact-field">
      <label for="contact-message">Message <span aria-hidden="true">*</span></label>
      <textarea id="contact-message" name="message" rows="6" required></textarea>
    </div>
    <div class="contact-error" role="alert" hidden></div>
    <button class="button primary contact-submit" type="submit">Send Message</button>
  `;

  const errorEl = form.querySelector('.contact-error');
  const submitBtn = form.querySelector('.contact-submit');

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    errorEl.hidden = true;

    const name = form.querySelector('#contact-name').value.trim();
    const email = form.querySelector('#contact-email').value.trim();
    const message = form.querySelector('#contact-message').value.trim();

    if (!name || !email || !message) {
      errorEl.textContent = 'Please fill in all fields.';
      errorEl.hidden = false;
      return;
    }

    submitBtn.disabled = true;
    submitBtn.textContent = 'Sending…';

    try {
      const res = await fetch(action, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify({ name, email, message }),
      });

      if (res.ok) {
        form.innerHTML = `
          <div class="contact-success">
            <p class="contact-success-icon" aria-hidden="true">✓</p>
            <h2>Thanks for reaching out!</h2>
            <p>We'll get back to you as soon as we can.</p>
          </div>
        `;
      } else {
        throw new Error('Submission failed');
      }
    } catch {
      errorEl.textContent = 'Something went wrong. Please try again or call us directly.';
      errorEl.hidden = false;
      submitBtn.disabled = false;
      submitBtn.textContent = 'Send Message';
    }
  });

  if (action) {
    return form;
  }

  // No endpoint configured — show a friendly fallback
  const fallback = document.createElement('div');
  fallback.className = 'contact-fallback';
  fallback.innerHTML = '<p>To get in touch, please call or email us directly using the contact details on this page.</p>';
  return fallback;
}

function buildInfo(infoCell) {
  const info = document.createElement('div');
  info.className = 'contact-info';

  [...infoCell.children].forEach((child) => {
    if (/^H[1-6]$/.test(child.tagName)) {
      info.append(child.cloneNode(true));
      return;
    }

    // Split paragraph content on <strong> labels → h3 + p chunks
    let buffer = [];

    const flushBuffer = () => {
      const text = buffer.map((n) => n.textContent || '').join('').trim();
      if (text) {
        const p = document.createElement('p');
        buffer.forEach((n) => {
          p.append(n.cloneNode ? n.cloneNode(true) : document.createTextNode(n.textContent));
        });
        info.append(p);
      }
      buffer = [];
    };

    [...child.childNodes].forEach((node) => {
      if (node.nodeName === 'STRONG') {
        flushBuffer();
        const h3 = document.createElement('h3');
        h3.textContent = node.textContent.trim();
        info.append(h3);
      } else if (node.nodeName !== 'BR') {
        buffer.push(node);
      }
    });
    flushBuffer();
  });

  // Linkify phone numbers
  info.querySelectorAll('p').forEach((el) => {
    const PHONE_RE = /(\d{3}[-.\s]\d{3}[-.\s]\d{4})/g;
    if (PHONE_RE.test(el.textContent) && !el.querySelector('a')) {
      el.innerHTML = el.innerHTML.replace(
        /(\d{3}[-.\s]\d{3}[-.\s]\d{4})/g,
        (m) => `<a href="tel:${m.replace(/\D/g, '')}">${m}</a>`,
      );
    }
  });

  return info;
}

export default function decorate(block) {
  const rows = [...block.children];

  let introText = '';
  let infoCell = null;
  let formAction = '';

  rows.forEach((row) => {
    const cells = [...row.children];
    const firstText = cells[0]?.textContent.trim() || '';

    if (firstText.startsWith('https://')) {
      formAction = firstText;
    } else if (cells.length >= 2 && cells[1]?.textContent.trim()) {
      introText = cells[0]?.innerHTML || '';
      [, infoCell] = cells;
    } else {
      introText = cells[0]?.innerHTML || '';
    }
  });

  block.innerHTML = '';

  const layout = document.createElement('div');
  layout.className = 'contact-layout';

  const formSide = document.createElement('div');
  formSide.className = 'contact-form-side';
  if (introText) {
    const intro = document.createElement('div');
    intro.className = 'contact-intro';
    intro.innerHTML = introText;
    formSide.append(intro);
  }
  formSide.append(buildForm(formAction));

  layout.append(formSide);

  if (infoCell) {
    const infoSide = document.createElement('div');
    infoSide.className = 'contact-info-side';
    infoSide.append(buildInfo(infoCell));
    layout.append(infoSide);
  }

  block.append(layout);
}
