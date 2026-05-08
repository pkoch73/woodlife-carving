import { addItem } from '../../scripts/cart.js';

const VARIANT_RE = /^([^:]+):\s*(.+\|.+)$/;
const FIELDS_RE = /^fields:\s*/i;

function fieldType(name) {
  const n = name.toLowerCase();
  if (n === 'email') return 'email';
  if (n === 'phone' || n === 'tel') return 'tel';
  return 'text';
}

function parseDetails(detailsCell) {
  const title = detailsCell.querySelector('h1, h2, h3');
  const paragraphs = [...detailsCell.querySelectorAll('p')];

  let sku = '';
  let priceFormatted = '';
  let price = 0;
  const variantDefs = [];
  let customFieldDefs = [];
  const descParagraphs = [];

  paragraphs.forEach((p) => {
    const text = p.textContent.trim();
    if (text.startsWith('SKU:')) {
      sku = text.replace('SKU:', '').trim();
    } else if (text.startsWith('$')) {
      priceFormatted = text;
      price = parseFloat(text.replace(/[^0-9.]/g, ''));
    } else if (FIELDS_RE.test(text)) {
      customFieldDefs = text.replace(FIELDS_RE, '').split('|').map((f) => f.trim()).filter(Boolean);
    } else if (VARIANT_RE.test(text)) {
      const [, label, rest] = text.match(VARIANT_RE);
      const options = rest.split('|').map((o) => o.trim()).filter(Boolean);
      variantDefs.push({ label: label.trim(), options });
    } else {
      descParagraphs.push(p.cloneNode(true));
    }
  });

  return {
    title, sku, price, priceFormatted, variantDefs, customFieldDefs, descParagraphs,
  };
}

function buildCustomFieldsSection(fieldDefs) {
  const wrap = document.createElement('div');
  wrap.className = 'product-custom-fields';
  fieldDefs.forEach((name) => {
    const id = `field-${name.toLowerCase().replace(/\s+/g, '-')}`;
    const label = document.createElement('label');
    label.htmlFor = id;
    label.textContent = name;
    const input = document.createElement('input');
    input.type = fieldType(name);
    input.id = id;
    input.name = name;
    input.className = 'product-custom-field-input';
    input.required = true;
    input.placeholder = name;
    wrap.append(label, input);
  });
  return wrap;
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
    title, sku, price, priceFormatted, variantDefs, customFieldDefs, descParagraphs,
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

  if (customFieldDefs.length) {
    details.append(buildCustomFieldsSection(customFieldDefs));
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
    const fieldInputs = [...block.querySelectorAll('.product-custom-field-input')];
    if (fieldInputs.some((inp) => !inp.reportValidity())) return;

    const variants = {};
    block.querySelectorAll('.product-variant-select').forEach((sel) => {
      variants[sel.dataset.label] = sel.value;
    });

    const customFields = {};
    block.querySelectorAll('.product-custom-field-input').forEach((inp) => {
      customFields[inp.name] = inp.value.trim();
    });

    const imageEl = block.querySelector('img');
    addItem({
      sku: sku || title?.textContent?.trim() || 'product',
      title: title?.textContent?.trim() || '',
      price,
      priceFormatted,
      image: imageEl?.src || '',
      variants,
      customFields,
    });

    addBtn.textContent = 'Added!';
    addBtn.disabled = true;
    setTimeout(() => {
      addBtn.textContent = 'Add to Cart';
      addBtn.disabled = false;
    }, 1500);
  });
}
