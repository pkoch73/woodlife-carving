const SLIDE_DURATION = 3000;

function buildSlide(row) {
  const cells = [...row.children];
  const slide = document.createElement('li');
  slide.className = 'carousel-slide';

  const pic = cells[0]?.querySelector('picture') || cells[0]?.querySelector('img');
  if (pic) {
    const imgWrap = document.createElement('div');
    imgWrap.className = 'carousel-slide-image';
    imgWrap.append(pic);
    slide.append(imgWrap);
  }

  const textCell = cells[1];
  if (textCell && textCell.textContent.trim()) {
    const overlay = document.createElement('div');
    overlay.className = 'carousel-slide-text';
    overlay.append(...textCell.childNodes);
    overlay.querySelectorAll('a').forEach((a) => a.classList.add('button', 'primary'));
    slide.append(overlay);
  }

  return slide;
}

function buildNav(count) {
  const nav = document.createElement('div');
  nav.className = 'carousel-nav';

  const chevronL = '<svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polyline points="15 18 9 12 15 6"/></svg>';
  const chevronR = '<svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polyline points="9 18 15 12 9 6"/></svg>';

  const prev = document.createElement('button');
  prev.className = 'carousel-btn carousel-prev';
  prev.setAttribute('aria-label', 'Previous slide');
  prev.innerHTML = chevronL;

  const next = document.createElement('button');
  next.className = 'carousel-btn carousel-next';
  next.setAttribute('aria-label', 'Next slide');
  next.innerHTML = chevronR;

  const dots = document.createElement('div');
  dots.className = 'carousel-dots';
  for (let i = 0; i < count; i += 1) {
    const dot = document.createElement('button');
    dot.className = 'carousel-dot';
    dot.setAttribute('aria-label', `Go to slide ${i + 1}`);
    dots.append(dot);
  }

  nav.append(prev, dots, next);
  return {
    nav, prev, next, dots,
  };
}

export default function decorate(block) {
  const rows = [...block.children];

  const track = document.createElement('ul');
  track.className = 'carousel-track';
  rows.forEach((row) => track.append(buildSlide(row)));

  const slides = [...track.children];
  const {
    nav, prev, next, dots,
  } = buildNav(slides.length);
  const dotBtns = [...dots.children];

  block.innerHTML = '';
  block.append(track, nav);

  let current = 0;
  let timer;

  function goTo(index) {
    slides[current].classList.remove('is-active');
    dotBtns[current].classList.remove('is-active');
    current = (index + slides.length) % slides.length;
    slides[current].classList.add('is-active');
    dotBtns[current].classList.add('is-active');
    track.style.transform = `translateX(-${current * 100}%)`;
  }

  function startTimer() {
    clearInterval(timer);
    timer = setInterval(() => goTo(current + 1), SLIDE_DURATION);
  }

  prev.addEventListener('click', () => { goTo(current - 1); startTimer(); });
  next.addEventListener('click', () => { goTo(current + 1); startTimer(); });
  dotBtns.forEach((dot, i) => dot.addEventListener('click', () => { goTo(i); startTimer(); }));

  block.addEventListener('mouseenter', () => clearInterval(timer));
  block.addEventListener('mouseleave', startTimer);
  block.addEventListener('focusin', () => clearInterval(timer));
  block.addEventListener('focusout', startTimer);

  let touchStartX = 0;
  track.addEventListener('touchstart', (e) => { touchStartX = e.touches[0].clientX; }, { passive: true });
  track.addEventListener('touchend', (e) => {
    const diff = touchStartX - e.changedTouches[0].clientX;
    if (Math.abs(diff) > 50) { goTo(current + (diff > 0 ? 1 : -1)); startTimer(); }
  }, { passive: true });

  goTo(0);
  startTimer();
}
