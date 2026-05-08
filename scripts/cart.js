const STORAGE_KEY = 'woodlife-cart';

const defaultCart = () => ({ version: 1, items: [], updatedAt: Date.now() });

function loadCart() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : defaultCart();
  } catch {
    return defaultCart();
  }
}

function saveCart(state) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    // storage full or unavailable — fail silently
  }
}

function dispatch(state) {
  document.dispatchEvent(new CustomEvent('cart:updated', { detail: { cart: state } }));
}

function buildItemId(sku, variants, customFields = {}) {
  const variantPart = Object.entries(variants)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([k, v]) => `${k}:${v}`)
    .join('__');
  const fieldPart = Object.entries(customFields)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([k, v]) => `${k}:${v}`)
    .join('__');
  return [sku, variantPart, fieldPart].filter(Boolean).join('__');
}

export function getCart() {
  return loadCart();
}

export function getCartItems() {
  return loadCart().items;
}

export function getItemCount() {
  return loadCart().items.reduce((sum, item) => sum + item.quantity, 0);
}

export function addItem({
  sku, title, price, priceFormatted, image, variants = {}, customFields = {},
}) {
  const state = loadCart();
  const id = buildItemId(sku, variants, customFields);
  const existing = state.items.find((i) => i.id === id);
  if (existing) {
    existing.quantity += 1;
  } else {
    state.items.push({
      id, sku, title, price, priceFormatted, image, variants, customFields, quantity: 1,
    });
  }
  state.updatedAt = Date.now();
  saveCart(state);
  dispatch(state);
}

export function removeItem(id) {
  const state = loadCart();
  state.items = state.items.filter((i) => i.id !== id);
  state.updatedAt = Date.now();
  saveCart(state);
  dispatch(state);
}

export function updateQuantity(id, qty) {
  if (qty < 1) {
    removeItem(id);
    return;
  }
  const state = loadCart();
  const item = state.items.find((i) => i.id === id);
  if (item) {
    item.quantity = qty;
    state.updatedAt = Date.now();
    saveCart(state);
    dispatch(state);
  }
}

export function clearCart() {
  const state = defaultCart();
  saveCart(state);
  dispatch(state);
}
