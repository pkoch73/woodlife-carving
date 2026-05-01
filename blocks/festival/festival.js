const PHONE_RE = /\d{3}[-.\s]\d{3}[-.\s]\d{4}/;
const YEAR_RE = /20\d{2}/;

function featureIcon(text) {
  const t = text.toLowerCase();
  if (t.includes('carver') || t.includes('art')) return '🪵';
  if (t.includes('carve') || t.includes('auction')) return '⏱';
  if (t.includes('food') || t.includes('vendor')) return '🍔';
  if (t.includes('$') || t.includes('per person') || t.includes('kid')) return '🎟';
  return '✦';
}

function parseScheduleEntries(cells) {
  const entries = [];
  const parseText = (text) => {
    const colonIdx = text.indexOf(':');
    if (colonIdx > -1) {
      entries.push({
        day: text.slice(0, colonIdx).trim(),
        time: text.slice(colonIdx + 1).trim(),
      });
    }
  };
  cells.forEach((cell) => {
    const paragraphs = [...cell.querySelectorAll('p')];
    if (paragraphs.length) {
      paragraphs.forEach((p) => parseText(p.textContent.trim()));
    } else {
      parseText(cell.textContent.trim());
    }
  });
  return entries;
}

function buildHero(imageEl, dateText, locationText) {
  const hero = document.createElement('div');
  hero.className = 'festival-hero';

  const imgWrap = document.createElement('div');
  imgWrap.className = 'festival-hero-image';
  if (imageEl) imgWrap.append(imageEl);

  const text = document.createElement('div');
  text.className = 'festival-hero-text';
  text.innerHTML = `
    <p class="festival-eyebrow">The</p>
    <h1 class="festival-title">Woodlife Carving Festival</h1>
    ${dateText ? `<p class="festival-date">${dateText}</p>` : ''}
    ${locationText ? `
      <p class="festival-location">
        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
          <path d="M21 10c0 7-9 13-9 13S3 17 3 10a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/>
        </svg>
        ${locationText}
      </p>` : ''}
  `;

  hero.append(imgWrap, text);
  return hero;
}

function buildFeatures(cells) {
  const ul = document.createElement('ul');
  ul.className = 'festival-features';
  cells.forEach((cell) => {
    const text = cell.textContent.trim();
    const li = document.createElement('li');
    li.className = 'festival-feature';
    li.innerHTML = `
      <span class="festival-feature-icon" aria-hidden="true">${featureIcon(text)}</span>
      <span>${text}</span>
    `;
    ul.append(li);
  });
  return ul;
}

function buildScheduleBlock(label, entries) {
  const div = document.createElement('div');
  div.className = 'festival-schedule-block';
  const h2 = document.createElement('h2');
  h2.textContent = label;
  const table = document.createElement('div');
  table.className = 'festival-schedule-entries';
  entries.forEach(({ day, time }) => {
    const row = document.createElement('div');
    row.className = 'festival-schedule-entry';
    const dayEl = document.createElement('span');
    dayEl.className = 'festival-schedule-day';
    dayEl.textContent = day;
    const timeEl = document.createElement('span');
    timeEl.className = 'festival-schedule-time';
    timeEl.textContent = time;
    row.append(dayEl, timeEl);
    table.append(row);
  });
  div.append(h2, table);
  return div;
}

export default function decorate(block) {
  const rows = [...block.children];

  let imageEl = null;
  let dateText = '';
  let locationText = '';
  const scheduleBlocks = [];
  let phoneText = '';
  let featureCells = [];

  rows.forEach((row) => {
    const cells = [...row.children];
    const firstText = cells[0]?.textContent.trim() || '';

    if (cells[0]?.querySelector('picture, img')) {
      const pic = cells[0].querySelector('picture') || cells[0].querySelector('img');
      imageEl = pic;
    } else if (cells.length === 2 && YEAR_RE.test(firstText)) {
      dateText = firstText;
      locationText = cells[1]?.textContent.trim() || '';
    } else if (firstText.endsWith('Times')) {
      scheduleBlocks.push({
        label: firstText,
        entries: parseScheduleEntries(cells.slice(1)),
      });
    } else if (cells.length >= 2 && !PHONE_RE.test(firstText)) {
      featureCells = [...featureCells, ...cells];
    } else if (PHONE_RE.test(firstText)) {
      [phoneText] = firstText.match(PHONE_RE);
    }
  });

  block.innerHTML = '';

  block.append(buildHero(imageEl, dateText, locationText));

  if (featureCells.length) {
    block.append(buildFeatures(featureCells));
  }

  if (scheduleBlocks.length) {
    const scheduleWrap = document.createElement('div');
    scheduleWrap.className = 'festival-schedule';
    scheduleBlocks.forEach(({ label, entries }) => {
      scheduleWrap.append(buildScheduleBlock(label, entries));
    });
    block.append(scheduleWrap);
  }

  if (phoneText) {
    const contact = document.createElement('div');
    contact.className = 'festival-contact';
    const digits = phoneText.replace(/\D/g, '');
    contact.innerHTML = `
      <a class="button festival-phone" href="tel:${digits}">
        📞 Call ${phoneText}
      </a>
      <p class="festival-tagline">www.WoodLifeCarving.com</p>
    `;
    block.append(contact);
  }
}
