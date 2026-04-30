export default function decorate(block) {
  const orderId = new URL(window.location.href).searchParams.get('order');

  block.innerHTML = `
    <div class="order-confirmation-inner">
      <div class="order-confirmation-icon" aria-hidden="true">&#10003;</div>
      <h1 class="order-confirmation-title">Thank you for your order!</h1>
      <p class="order-confirmation-message">
        Your payment was successful and your order is being processed.
        You will receive a confirmation email shortly.
      </p>
      ${orderId ? `<p class="order-confirmation-id">Order ID: <strong>${orderId}</strong></p>` : ''}
      <a class="button primary" href="/shop/">Continue Shopping</a>
    </div>
  `;
}
