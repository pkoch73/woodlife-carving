const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

function corsResponse() {
  return new Response(null, { status: 204, headers: CORS_HEADERS });
}

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
  });
}

export default {
  async fetch(request, env) {
    if (request.method === 'OPTIONS') return corsResponse();
    if (request.method !== 'POST') return json({ error: 'Method not allowed' }, 405);

    let body;
    try {
      body = await request.json();
    } catch {
      return json({ error: 'Invalid JSON body' }, 400);
    }

    const { token, total, items } = body;

    if (!token || typeof total !== 'number' || !Array.isArray(items)) {
      return json({ error: 'Missing required fields: token, total, items' }, 400);
    }

    const amountMoney = { amount: Math.round(total * 100), currency: 'USD' };
    const note = items.map((i) => `${i.title} x${i.quantity}`).join(', ');

    const squareRes = await fetch('https://connect.squareupsandbox.com/v2/payments', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${env.SQUARE_ACCESS_TOKEN}`,
        'Content-Type': 'application/json',
        'Square-Version': '2024-01-17',
      },
      body: JSON.stringify({
        source_id: token,
        amount_money: amountMoney,
        location_id: env.SQUARE_LOCATION_ID,
        idempotency_key: crypto.randomUUID(),
        note,
      }),
    });

    const data = await squareRes.json();

    if (!squareRes.ok) {
      return json({ error: data.errors }, 400);
    }

    return json({ orderId: data.payment.id, status: data.payment.status });
  },
};
