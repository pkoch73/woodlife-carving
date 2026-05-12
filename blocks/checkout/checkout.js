import { loadScript } from '../../scripts/aem.js';
import { getCart, clearCart } from '../../scripts/cart.js';

const SQUARE_APP_ID = 'sandbox-sq0idb-G8c8TW-ynbHuCMLTXNKo2Q';
// Set this to your deployed Cloudflare Worker URL after running `wrangler deploy`
const CHECKOUT_API_URL = 'https://woodlife-checkout.philipp-koch.workers.dev/checkout';
// Set this to your Square Location ID (from Square Developer Dashboard)
const SQUARE_LOCATION_ID = 'LA6FH63DPZ4QG';

function renderOrderSummary(container, items) {
  const subtotal = items.reduce((sum, i) => sum + i.price * i.quantity, 0);
  container.innerHTML = `
    <h2 class="checkout-summary-title">Order Summary</h2>
    <ul class="checkout-items">
      ${items.map((item) => `
        <li class="checkout-item">
          <img src="${item.image}" alt="${item.title}" width="60" height="60" loading="lazy">
          <div class="checkout-item-details">
            <p class="checkout-item-title">${item.title}</p>
            ${Object.keys(item.variants || {}).length ? `<p class="checkout-item-variants">${Object.entries(item.variants).map(([k, v]) => `${k}: ${v}`).join(', ')}</p>` : ''}
            ${Object.keys(item.customFields || {}).length ? `<p class="checkout-item-custom-fields">${Object.entries(item.customFields).map(([k, v]) => `${k}: ${v}`).join(' · ')}</p>` : ''}
            <p class="checkout-item-meta">Qty: ${item.quantity} &times; ${item.priceFormatted}</p>
          </div>
        </li>
      `).join('')}
    </ul>
    <div class="checkout-totals">
      <p class="checkout-subtotal">Total: <strong>$${subtotal.toFixed(2)}</strong></p>
    </div>
  `;
  return subtotal;
}

async function initSquare(formEl) {
  if (!window.Square) {
    throw new Error('Square SDK not loaded');
  }
  const payments = window.Square.payments(SQUARE_APP_ID, SQUARE_LOCATION_ID);
  const card = await payments.card();
  await card.attach(formEl.querySelector('#square-card-container'));
  return { payments, card };
}

export default async function decorate(block) {
  const cart = getCart();

  if (!cart.items.length) {
    block.innerHTML = `
      <div class="checkout-empty">
        <p>Your cart is empty.</p>
        <a class="button primary" href="/">Continue Shopping</a>
      </div>
    `;
    return;
  }

  const needsShipping = cart.items.some((i) => i.fulfillment === 'SHIPMENT');

  block.innerHTML = `
    <div class="checkout-layout">
      <div class="checkout-summary"></div>
      <div class="checkout-form-wrap">
        <h2 class="checkout-form-title">Your Details</h2>
        <form class="checkout-form" novalidate>
          <div class="checkout-customer">
            <div class="checkout-field-row">
              <div class="checkout-field">
                <label for="co-name">Full name</label>
                <input id="co-name" name="name" type="text" autocomplete="name" required placeholder="Jane Smith">
              </div>
              <div class="checkout-field">
                <label for="co-email">Email</label>
                <input id="co-email" name="email" type="email" autocomplete="email" required placeholder="jane@example.com">
              </div>
            </div>
            ${needsShipping ? `
            <p class="checkout-section-label">Shipping address</p>
            <div class="checkout-field">
              <label for="co-addr1">Address</label>
              <input id="co-addr1" name="addr1" type="text" autocomplete="address-line1" required placeholder="123 Main St">
            </div>
            <div class="checkout-field">
              <label for="co-addr2">Apt / Suite <span class="checkout-optional">(optional)</span></label>
              <input id="co-addr2" name="addr2" type="text" autocomplete="address-line2" placeholder="Apt 4B">
            </div>
            <div class="checkout-field-row">
              <div class="checkout-field">
                <label for="co-city">City</label>
                <input id="co-city" name="city" type="text" autocomplete="address-level2" required placeholder="Chester">
              </div>
              <div class="checkout-field checkout-field-narrow">
                <label for="co-state">State</label>
                <input id="co-state" name="state" type="text" autocomplete="address-level1" required placeholder="VT" maxlength="2">
              </div>
              <div class="checkout-field checkout-field-narrow">
                <label for="co-zip">ZIP</label>
                <input id="co-zip" name="zip" type="text" autocomplete="postal-code" required placeholder="05143" maxlength="10">
              </div>
            </div>` : ''}
          </div>
          <p class="checkout-section-label">Payment</p>
          <div id="square-card-container" class="checkout-card-field"></div>
          <div class="checkout-error" aria-live="polite" hidden></div>
          <button class="button primary checkout-submit-btn" type="submit">
            Pay Now
          </button>
        </form>
        <p class="checkout-secure-note">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
          Secured by Square
        </p>
      </div>
    </div>
  `;

  const summaryEl = block.querySelector('.checkout-summary');
  const form = block.querySelector('.checkout-form');
  const errorEl = block.querySelector('.checkout-error');
  const submitBtn = block.querySelector('.checkout-submit-btn');

  const subtotal = renderOrderSummary(summaryEl, cart.items);

  let squareContext;
  try {
    await loadScript('https://sandbox.web.squarecdn.com/v1/square.js');
    squareContext = await initSquare(form);
  } catch (err) {
    errorEl.textContent = 'Payment system failed to load. Please refresh the page.';
    errorEl.hidden = false;
    submitBtn.disabled = true;
    return;
  }

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    if (!form.reportValidity()) return;
    errorEl.hidden = true;
    submitBtn.disabled = true;
    submitBtn.textContent = 'Processing…';

    try {
      const result = await squareContext.card.tokenize();
      if (result.status !== 'OK') {
        throw new Error(result.errors?.[0]?.message || 'Card tokenization failed');
      }

      const val = (name) => form.elements[name]?.value.trim() || undefined;
      const customer = {
        name: val('name'),
        email: val('email'),
        address: needsShipping ? {
          line1: val('addr1'),
          line2: val('addr2'),
          city: val('city'),
          state: val('state'),
          zip: val('zip'),
          country: 'US',
        } : undefined,
      };

      const response = await fetch(CHECKOUT_API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          token: result.token,
          total: subtotal,
          items: cart.items,
          customer,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error?.[0]?.detail || 'Payment failed. Please try again.');
      }

      clearCart();
      window.location.href = `/order-confirmation?order=${data.orderId}`;
    } catch (err) {
      errorEl.textContent = err.message;
      errorEl.hidden = false;
      submitBtn.disabled = false;
      submitBtn.textContent = 'Pay Now';
    }
  });
}
