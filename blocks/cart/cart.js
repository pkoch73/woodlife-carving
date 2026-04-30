import {
  getCart, getCartItems, removeItem, updateQuantity,
} from '../../scripts/cart.js';

function formatVariants(variants) {
  return Object.entries(variants)
    .map(([k, v]) => `${k}: ${v}`)
    .join(', ');
}

function calcSubtotal(items) {
  return items.reduce((sum, item) => sum + item.price * item.quantity, 0);
}

function renderItems(list, items) {
  list.innerHTML = '';
  items.forEach((item) => {
    const li = document.createElement('li');
    li.className = 'cart-item';
    li.dataset.id = item.id;

    const variantText = formatVariants(item.variants);
    const safeId = CSS.escape(item.id);

    li.innerHTML = `
      <img class="cart-item-image" src="${item.image}" alt="${item.title}" width="80" height="80" loading="lazy">
      <div class="cart-item-details">
        <p class="cart-item-title">${item.title}</p>
        ${variantText ? `<p class="cart-item-variants">${variantText}</p>` : ''}
        <p class="cart-item-price">${item.priceFormatted}</p>
      </div>
      <div class="cart-item-actions">
        <label class="visually-hidden" for="qty-${safeId}">Quantity</label>
        <input class="cart-item-qty" type="number" id="qty-${safeId}" min="1" max="99" value="${item.quantity}">
        <button class="cart-item-remove" aria-label="Remove ${item.title} from cart">Remove</button>
      </div>
    `;

    li.querySelector('.cart-item-qty').addEventListener('change', (e) => {
      updateQuantity(item.id, parseInt(e.target.value, 10));
    });
    li.querySelector('.cart-item-remove').addEventListener('click', () => {
      removeItem(item.id);
    });

    list.append(li);
  });
}

function renderCart(dialog) {
  const items = getCartItems();
  const list = dialog.querySelector('.cart-items-list');
  const empty = dialog.querySelector('.cart-empty');
  const subtotalEl = dialog.querySelector('.cart-subtotal strong');
  const checkoutBtn = dialog.querySelector('.cart-checkout-btn');

  renderItems(list, items);

  const hasItems = items.length > 0;
  empty.hidden = hasItems;
  list.hidden = !hasItems;

  const subtotal = calcSubtotal(items);
  subtotalEl.textContent = `$${subtotal.toFixed(2)}`;

  checkoutBtn.disabled = !hasItems;
  checkoutBtn.setAttribute('aria-disabled', String(!hasItems));
}

export default function decorate(block) {
  const dialog = document.createElement('dialog');
  dialog.className = 'cart-dialog';
  dialog.setAttribute('aria-label', 'Shopping cart');
  dialog.innerHTML = `
    <div class="cart-inner">
      <div class="cart-header">
        <h2 class="cart-title">Your Cart</h2>
        <button class="cart-close-btn" aria-label="Close cart">&#x2715;</button>
      </div>
      <div class="cart-body">
        <div class="cart-empty" hidden>
          <p>Your cart is empty.</p>
          <a class="button secondary" href="/">Continue Shopping</a>
        </div>
        <ul class="cart-items-list" aria-label="Cart items"></ul>
      </div>
      <div class="cart-footer">
        <p class="cart-subtotal">Subtotal: <strong>$0.00</strong></p>
        <a class="button primary cart-checkout-btn" href="/checkout">Checkout</a>
      </div>
    </div>
  `;

  document.body.append(dialog);
  block.hidden = true;

  dialog.querySelector('.cart-close-btn').addEventListener('click', () => dialog.close());

  dialog.addEventListener('click', (e) => {
    if (e.target === dialog) dialog.close();
  });

  document.addEventListener('cart:open', () => {
    renderCart(dialog);
    dialog.showModal();
  });

  document.addEventListener('cart:updated', () => {
    if (dialog.open) renderCart(dialog);
  });

  // initialise cart count already in storage on page load
  const initialCart = getCart();
  if (initialCart.items.length > 0) {
    document.dispatchEvent(new CustomEvent('cart:updated', { detail: { cart: initialCart } }));
  }
}
