import { addItem } from '../../scripts/cart.js';

const VARIANT_RE = /^([^:]+):\s*(.+\|.+)$/;

function parseDetails(detailsCell) {
  const title = detailsCell.querySelector('h1, h2, h3');
  const paragraphs = [...detailsCell.querySelectorAll('p')];

  let sku = '';
  let priceFormatted = '';
  let price = 0;
  const variantDefs = [];
  const descParagraphs = [];

  paragraphs.forEach((p) => {
    const text = p.textContent.trim();
    if (text.startsWith('SKU:')) {
      sku = text.replace('SKU:', '').trim();
    } else if (text.startsWith('$')) {
      priceFormatted = text;
      price = parseFloat(text.replace(/[^0-9.]/g, ''));
    } else if (VARIANT_RE.test(text)) {
      const [, label, rest] = text.match(VARIANT_RE);
      const options = rest.split('|').map((o) => o.trim()).filter(Boolean);
      variantDefs.push({ label: label.trim(), options });
    } else {
      descParagraphs.push(p.cloneNode(true));
    }
  });

  return {
    title, sku, price, priceFormatted, variantDefs, descParagraphs,
  };
}

function buildVariantSelect({ label, options }) {
  const id = `variant-${label.toLowerCase().replace(/\s+/g, '-')}`;
  const group = document.createElement('div');
  group.className = 'product-variant-group';
  group.innerHTML = `<label for="${id}">${label}</label>`;
  const select = document.createElement('select');
  select.className = 'product-variant-select';
  select.id = id;
  select.dataset.label = label;
  options.forEach((opt) => {
    const option = document.createElement('option');
    option.value = opt;
    option.textContent = opt;
    select.append(option);
  });
  group.append(select);
  return group;
}

export default function decorate(block) {
  const [imageCell, detailsCell] = [...block.firstElementChild.children];
  const picture = imageCell.querySelector('picture');
  const img = imageCell.querySelector('img');

  const {
    title, sku, price, priceFormatted, variantDefs, descParagraphs,
  } = parseDetails(detailsCell);

  block.innerHTML = '';

  const figure = document.createElement('figure');
  figure.className = 'product-image';
  if (picture) {
    figure.append(picture);
  } else if (img) {
    figure.append(img);
  }

  const details = document.createElement('div');
  details.className = 'product-details';

  if (title) details.append(title);

  if (priceFormatted) {
    const priceEl = document.createElement('p');
    priceEl.className = 'product-price';
    priceEl.textContent = priceFormatted;
    details.append(priceEl);
  }

  if (variantDefs.length) {
    const variantsWrap = document.createElement('div');
    variantsWrap.className = 'product-variants';
    variantDefs.forEach((def) => variantsWrap.append(buildVariantSelect(def)));
    details.append(variantsWrap);
  }

  const addBtn = document.createElement('button');
  addBtn.className = 'button primary product-add-btn';
  addBtn.type = 'button';
  addBtn.textContent = 'Add to Cart';
  details.append(addBtn);

  if (descParagraphs.length) {
    const desc = document.createElement('div');
    desc.className = 'product-description';
    descParagraphs.forEach((p) => desc.append(p));
    details.append(desc);
  }

  block.append(figure, details);

  addBtn.addEventListener('click', () => {
    const variants = {};
    block.querySelectorAll('.product-variant-select').forEach((sel) => {
      variants[sel.dataset.label] = sel.value;
    });

    const imageEl = block.querySelector('img');
    addItem({
      sku: sku || title?.textContent?.trim() || 'product',
      title: title?.textContent?.trim() || '',
      price,
      priceFormatted,
      image: imageEl?.src || '',
      variants,
    });

    addBtn.textContent = 'Added!';
    addBtn.disabled = true;
    setTimeout(() => {
      addBtn.textContent = 'Add to Cart';
      addBtn.disabled = false;
    }, 1500);
  });
}
