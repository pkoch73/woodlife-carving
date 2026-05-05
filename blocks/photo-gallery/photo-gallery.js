import {
  button, div, img, a,
} from '../../scripts/dom-helpers.js';

const SVG = {
  prev: '<svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polyline points="15 18 9 12 15 6"/></svg>',
  next: '<svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polyline points="9 18 15 12 9 6"/></svg>',
  close: '<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" aria-hidden="true"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>',
  play: '<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><polygon points="5 3 19 12 5 21 5 3"/></svg>',
  pause: '<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><rect x="6" y="4" width="4" height="16"/><rect x="14" y="4" width="4" height="16"/></svg>',
  expand: '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><path d="M8 3H5a2 2 0 0 0-2 2v3m18 0V5a2 2 0 0 0-2-2h-3m0 18h3a2 2 0 0 0 2-2v-3M3 16v3a2 2 0 0 0 2 2h3"/></svg>',
  contract: '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><path d="M8 3v3a2 2 0 0 1-2 2H3m18 0h-3a2 2 0 0 1-2-2V3m0 18v-3a2 2 0 0 1 2-2h3M3 16h3a2 2 0 0 1 2 2v3"/></svg>',
  zoom: '<svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" stroke-linecap="round" aria-hidden="true"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/><line x1="11" y1="8" x2="11" y2="14"/><line x1="8" y1="11" x2="14" y2="11"/></svg>',
};

function createModal(images, startIndex) {
  let slideshowInterval = null;

  const modal = div(
    { class: 'image-modal-overlay' },
    div(
      { class: 'image-modal-content' },
      div(
        { class: 'modal-main' },
        div(
          { class: 'image-container' },
          img({ src: images[startIndex].src, alt: images[startIndex].alt }),
          button({ class: 'nav-button prev', 'aria-label': 'Previous image' }),
          button({ class: 'nav-button next', 'aria-label': 'Next image' }),
          button({ class: 'expand-button', 'aria-label': 'Expand' }),
        ),
        div(
          { class: 'thumbnails-container' },
          button({ class: 'thumb-nav prev', 'aria-label': 'Scroll thumbnails left' }),
          div(
            { class: 'thumbnails-wrapper' },
            ...images.map((imgEl, idx) => div(
              { class: `thumbnail${idx === startIndex ? ' active' : ''}`, 'data-index': idx },
              img({ src: imgEl.src, alt: imgEl.alt }),
            )),
          ),
          button({ class: 'thumb-nav next', 'aria-label': 'Scroll thumbnails right' }),
        ),
        div(
          { class: 'modal-controls' },
          div(
            { class: 'slideshow-controls' },
            a({ class: 'play-button', 'aria-label': 'Play slideshow' }),
            a({ class: 'slide-nav prev', 'aria-label': 'Previous' }),
            a({ class: 'slide-nav next', 'aria-label': 'Next' }),
          ),
          div({ class: 'image-counter' }, `${startIndex + 1}/${images.length}`),
          div({ class: 'modal-title' }, images[startIndex].getAttribute('data-display')),
          button({ class: 'close-button', 'aria-label': 'Close' }),
        ),
      ),
    ),
  );

  // Inject SVG icons
  modal.querySelector('.nav-button.prev').innerHTML = SVG.prev;
  modal.querySelector('.nav-button.next').innerHTML = SVG.next;
  modal.querySelector('.close-button').innerHTML = SVG.close;
  modal.querySelector('.play-button').innerHTML = SVG.play;
  modal.querySelector('.slide-nav.prev').innerHTML = SVG.prev;
  modal.querySelector('.slide-nav.next').innerHTML = SVG.next;
  modal.querySelector('.thumb-nav.prev').innerHTML = SVG.prev;
  modal.querySelector('.thumb-nav.next').innerHTML = SVG.next;
  modal.querySelector('.expand-button').innerHTML = SVG.expand;

  const mainPrevButton = modal.querySelector('.nav-button.prev');
  const mainNextButton = modal.querySelector('.nav-button.next');
  const modalImage = modal.querySelector('.modal-main > .image-container img');
  const imageCounter = modal.querySelector('.image-counter');
  const modalTitle = modal.querySelector('.modal-title');
  const thumbnails = modal.querySelectorAll('.thumbnail');
  let currentIndex = startIndex;

  function updateModalImage() {
    modalImage.src = images[currentIndex].src;
    modalImage.alt = images[currentIndex].alt;
    imageCounter.textContent = `${currentIndex + 1}/${images.length}`;
    modalTitle.textContent = images[currentIndex].getAttribute('data-display');

    thumbnails.forEach((thumb, idx) => {
      const isActive = idx === currentIndex;
      thumb.classList.toggle('active', isActive);
      if (isActive) {
        const thumbsWrapper = thumb.parentElement;
        const thumbRect = thumb.getBoundingClientRect();
        const wrapperRect = thumbsWrapper.getBoundingClientRect();
        if (thumbRect.left < wrapperRect.left || thumbRect.right > wrapperRect.right) {
          thumb.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
        }
      }
    });
  }

  thumbnails.forEach((thumb) => {
    thumb.addEventListener('click', () => {
      currentIndex = parseInt(thumb.dataset.index, 10);
      updateModalImage();
    });
  });

  modal.addEventListener('click', (e) => { if (e.target === modal) modal.remove(); });

  modal.querySelector('.close-button').addEventListener('click', () => modal.remove());

  document.addEventListener('keydown', function handleKeydown(e) {
    if (e.key === 'ArrowLeft') mainPrevButton.click();
    else if (e.key === 'ArrowRight') mainNextButton.click();
    else if (e.key === 'Escape') {
      modal.remove();
      document.removeEventListener('keydown', handleKeydown);
    }
  });

  mainPrevButton.addEventListener('click', (e) => {
    e.stopPropagation();
    currentIndex = (currentIndex - 1 + images.length) % images.length;
    updateModalImage();
  });

  mainNextButton.addEventListener('click', (e) => {
    e.stopPropagation();
    currentIndex = (currentIndex + 1) % images.length;
    updateModalImage();
  });

  const thumbsWrapper = modal.querySelector('.thumbnails-wrapper');
  modal.querySelector('.thumb-nav.prev').addEventListener('click', (e) => {
    e.stopPropagation();
    thumbsWrapper.scrollBy({ left: -200, behavior: 'smooth' });
  });
  modal.querySelector('.thumb-nav.next').addEventListener('click', (e) => {
    e.stopPropagation();
    thumbsWrapper.scrollBy({ left: 200, behavior: 'smooth' });
  });

  const slideNavPrev = modal.querySelector('.slide-nav.prev');
  const slideNavNext = modal.querySelector('.slide-nav.next');
  slideNavPrev.addEventListener('click', (e) => {
    e.stopPropagation();
    currentIndex = (currentIndex - 1 + images.length) % images.length;
    updateModalImage();
  });
  slideNavNext.addEventListener('click', (e) => {
    e.stopPropagation();
    currentIndex = (currentIndex + 1) % images.length;
    updateModalImage();
  });

  const playButton = modal.querySelector('.play-button');

  function startSlideshow() {
    playButton.classList.add('playing');
    playButton.innerHTML = SVG.pause;
    slideshowInterval = setInterval(() => mainNextButton.click(), 3000);
  }

  function stopSlideshow() {
    playButton.classList.remove('playing');
    playButton.innerHTML = SVG.play;
    if (slideshowInterval) { clearInterval(slideshowInterval); slideshowInterval = null; }
  }

  playButton.addEventListener('click', (e) => {
    e.stopPropagation();
    if (slideshowInterval) stopSlideshow(); else startSlideshow();
  });

  [mainPrevButton, mainNextButton, slideNavPrev, slideNavNext, ...thumbnails].forEach((el) => {
    el.addEventListener('click', (e) => { if (slideshowInterval && e.isTrusted) stopSlideshow(); });
  });

  const imageContainer = modal.querySelector('.image-container');
  imageContainer.addEventListener('click', (e) => {
    if (e.target.classList.contains('nav-button') || e.target.closest('.nav-button')) return;
    const rect = imageContainer.getBoundingClientRect();
    const isLeftHalf = e.clientX - rect.left < rect.width / 2;
    if (isLeftHalf) mainPrevButton.click(); else mainNextButton.click();
  });

  const expandButton = modal.querySelector('.expand-button');
  let isExpanded = false;
  expandButton.addEventListener('click', (e) => {
    e.stopPropagation();
    isExpanded = !isExpanded;
    modal.querySelector('.image-modal-content').classList.toggle('expanded', isExpanded);
    modal.querySelector('.modal-main').classList.toggle('expanded', isExpanded);
    expandButton.innerHTML = isExpanded ? SVG.contract : SVG.expand;
    expandButton.setAttribute('aria-label', isExpanded ? 'Collapse' : 'Expand');
  });

  document.body.appendChild(modal);
}

export default function decorate(block) {
  const images = [];
  [...block.children].forEach((row) => {
    const image = row.querySelector('img');
    if (!image) return;
    const caption = row.querySelector('p');
    image.setAttribute('data-display', caption?.textContent.trim() || '');
    image.setAttribute('alt', caption?.textContent.trim() || image.src.split('/').pop().split('.')[0]);
    images.push(image);
  });

  const galleryGrid = div({ class: 'photo-grid' });

  images.forEach((imgEl, index) => {
    const photoItem = div(
      { class: 'photo-item' },
      imgEl.cloneNode(true),
      div({ class: 'hover-circle' }),
    );
    photoItem.querySelector('.hover-circle').innerHTML = SVG.zoom;
    galleryGrid.appendChild(photoItem);
    photoItem.addEventListener('click', () => createModal(images, index));
  });

  block.textContent = '';
  block.appendChild(galleryGrid);
}
