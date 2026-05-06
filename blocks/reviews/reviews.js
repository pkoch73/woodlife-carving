const REVIEWS_API = 'https://woodlife-checkout.philipp-koch.workers.dev/reviews';
const TRUNCATE_LEN = 220;

function stars(rating, large = false) {
  const el = document.createElement('span');
  el.className = large ? 'reviews-stars reviews-stars-large' : 'reviews-stars';
  el.setAttribute('aria-label', `${rating} out of 5 stars`);
  for (let i = 1; i <= 5; i += 1) {
    const s = document.createElement('span');
    s.className = i <= Math.round(rating) ? 'reviews-star filled' : 'reviews-star';
    s.setAttribute('aria-hidden', 'true');
    s.textContent = '★';
    el.append(s);
  }
  return el;
}

function avatar(review) {
  const wrap = document.createElement('div');
  wrap.className = 'reviews-avatar';
  if (review.avatar) {
    const img = document.createElement('img');
    img.src = review.avatar;
    img.alt = review.author;
    img.width = 40;
    img.height = 40;
    img.loading = 'lazy';
    wrap.append(img);
  } else {
    wrap.textContent = review.author.charAt(0).toUpperCase();
  }
  return wrap;
}

function reviewCard(review) {
  const card = document.createElement('div');
  card.className = 'reviews-card';

  const header = document.createElement('div');
  header.className = 'reviews-card-header';

  const info = document.createElement('div');
  info.className = 'reviews-card-info';

  const name = document.createElement('span');
  name.className = 'reviews-card-name';
  name.textContent = review.author;

  const meta = document.createElement('div');
  meta.className = 'reviews-card-meta';
  meta.append(stars(review.rating));

  const time = document.createElement('span');
  time.className = 'reviews-card-time';
  time.textContent = review.time;
  meta.append(time);

  info.append(name, meta);
  header.append(avatar(review), info);

  const body = document.createElement('p');
  body.className = 'reviews-card-text';

  if (review.text.length > TRUNCATE_LEN) {
    const short = review.text.slice(0, TRUNCATE_LEN).trimEnd();
    const rest = review.text.slice(short.length);
    body.innerHTML = `${short}<span class="reviews-ellipsis">… </span><span class="reviews-rest" hidden>${rest}</span>`;
    const toggle = document.createElement('button');
    toggle.className = 'reviews-read-more';
    toggle.textContent = 'read more';
    toggle.addEventListener('click', () => {
      const ellipsis = body.querySelector('.reviews-ellipsis');
      const restEl = body.querySelector('.reviews-rest');
      const isHidden = restEl.hidden;
      restEl.hidden = !isHidden;
      ellipsis.hidden = isHidden;
      toggle.textContent = isHidden ? 'read less' : 'read more';
    });
    body.append(toggle);
  } else {
    body.textContent = review.text;
  }

  card.append(header, body);
  return card;
}

function skeleton(count) {
  const wrap = document.createElement('div');
  wrap.className = 'reviews-skeleton';
  for (let i = 0; i < count; i += 1) {
    const card = document.createElement('div');
    card.className = 'reviews-card reviews-card-loading';
    card.innerHTML = `
      <div class="reviews-card-header">
        <div class="reviews-skeleton-circle"></div>
        <div class="reviews-card-info">
          <div class="reviews-skeleton-line reviews-skeleton-line-short"></div>
          <div class="reviews-skeleton-line reviews-skeleton-line-xs"></div>
        </div>
      </div>
      <div class="reviews-skeleton-line"></div>
      <div class="reviews-skeleton-line reviews-skeleton-line-medium"></div>
    `;
    wrap.append(card);
  }
  return wrap;
}

export default async function decorate(block) {
  const cells = [...(block.firstElementChild?.children || [])];
  const max = parseInt(cells[1]?.textContent.trim(), 10) || 5;

  block.innerHTML = '';

  const skeletonEl = skeleton(Math.min(max, 3));
  block.append(skeletonEl);

  let data;
  try {
    const res = await fetch(REVIEWS_API);
    if (!res.ok) throw new Error('fetch failed');
    data = await res.json();
  } catch {
    block.innerHTML = `
      <div class="reviews-error">
        <p>Reviews are temporarily unavailable.</p>
        <a class="button" href="https://www.google.com/maps/search/WoodLife+Carving+Chester+VT" target="_blank" rel="noopener">See reviews on Google</a>
      </div>
    `;
    return;
  }

  block.innerHTML = '';

  // Summary bar
  const summary = document.createElement('div');
  summary.className = 'reviews-summary';

  const ratingNum = document.createElement('span');
  ratingNum.className = 'reviews-rating-number';
  ratingNum.textContent = data.rating?.toFixed(1) ?? '—';

  const count = document.createElement('span');
  count.className = 'reviews-count';
  count.textContent = `${data.totalRatings} Google Reviews`;

  const writeLink = document.createElement('a');
  writeLink.className = 'reviews-write-link';
  writeLink.href = data.googleUrl ?? 'https://g.page/r/write-review';
  writeLink.target = '_blank';
  writeLink.rel = 'noopener';
  writeLink.textContent = 'Write a review';

  const summaryLeft = document.createElement('div');
  summaryLeft.className = 'reviews-summary-left';
  summaryLeft.append(ratingNum, stars(data.rating ?? 5, true), count);
  summary.append(summaryLeft, writeLink);
  block.append(summary);

  // Review cards
  const list = document.createElement('div');
  list.className = 'reviews-list';
  data.reviews.slice(0, max).forEach((r) => list.append(reviewCard(r)));
  block.append(list);

  // Footer link
  if (data.googleUrl) {
    const footer = document.createElement('div');
    footer.className = 'reviews-footer';
    footer.innerHTML = `<a href="${data.googleUrl}" target="_blank" rel="noopener">See all ${data.totalRatings} reviews on Google →</a>`;
    block.append(footer);
  }
}
