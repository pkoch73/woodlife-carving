const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
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

async function handleReviews(request, env) {
  const cache = caches.default;
  const cacheKey = new Request(request.url);
  const cached = await cache.match(cacheKey);
  if (cached) return cached;

  const url = new URL(
    'https://maps.googleapis.com/maps/api/place/details/json'
    + `?place_id=${env.GOOGLE_PLACE_ID}`
    + '&fields=rating,user_ratings_total,reviews,url'
    + '&reviews_sort=newest'
    + `&key=${env.GOOGLE_PLACES_API_KEY}`,
  );

  const placeRes = await fetch(url.toString());
  const data = await placeRes.json();
  const result = data.result || {};

  const payload = {
    rating: result.rating ?? null,
    totalRatings: result.user_ratings_total ?? 0,
    googleUrl: result.url ?? null,
    reviews: (result.reviews || []).map((r) => ({
      author: r.author_name,
      avatar: r.profile_photo_url,
      rating: r.rating,
      text: r.text,
      time: r.relative_time_description,
    })),
  };

  const response = new Response(JSON.stringify(payload), {
    headers: {
      ...CORS_HEADERS,
      'Content-Type': 'application/json',
      'Cache-Control': 'public, max-age=3600',
    },
  });
  await cache.put(cacheKey, response.clone());
  return response;
}

const SQUARE_BASE = 'https://connect.squareupsandbox.com/v2';
const SQUARE_VERSION = '2024-01-17';

function squareHeaders(env) {
  return {
    Authorization: `Bearer ${env.SQUARE_ACCESS_TOKEN}`,
    'Content-Type': 'application/json',
    'Square-Version': SQUARE_VERSION,
  };
}

// Returns the catalog variation ID for a SKU, or null if not found.
async function catalogIdBySku(sku, env) {
  const res = await fetch(`${SQUARE_BASE}/catalog/search`, {
    method: 'POST',
    headers: squareHeaders(env),
    body: JSON.stringify({
      object_types: ['ITEM_VARIATION'],
      query: { exact_query: { attribute_name: 'sku', attribute_value: sku } },
    }),
  });
  const data = await res.json();
  return data.objects?.[0]?.id ?? null;
}

// Creates a Square Order and returns the full order object.
async function createOrder(items, catalogMap, env) {
  const lineItems = items.map((item) => {
    const catalogObjectId = catalogMap[item.sku];
    const customNote = Object.keys(item.customFields || {}).length
      ? Object.entries(item.customFields).map(([k, v]) => `${k}: ${v}`).join(', ')
      : undefined;

    if (catalogObjectId) {
      return {
        catalog_object_id: catalogObjectId,
        quantity: String(item.quantity),
        ...(customNote ? { note: customNote } : {}),
      };
    }

    // Fallback: ad-hoc line item for products not in the Square catalog
    return {
      name: item.title,
      quantity: String(item.quantity),
      base_price_money: { amount: Math.round(item.price * 100), currency: 'USD' },
      ...(customNote ? { note: customNote } : {}),
    };
  });

  const res = await fetch(`${SQUARE_BASE}/orders`, {
    method: 'POST',
    headers: squareHeaders(env),
    body: JSON.stringify({
      idempotency_key: crypto.randomUUID(),
      order: { location_id: env.SQUARE_LOCATION_ID, line_items: lineItems },
    }),
  });
  return res.json();
}

export default {
  async fetch(request, env) {
    if (request.method === 'OPTIONS') return corsResponse();

    const { pathname } = new URL(request.url);
    if (pathname === '/reviews' && request.method === 'GET') {
      return handleReviews(request, env);
    }

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

    // Look up Square catalog IDs for all unique SKUs in parallel
    const uniqueSkus = [...new Set(items.map((i) => i.sku))];
    const catalogMap = Object.fromEntries(
      await Promise.all(uniqueSkus.map(async (sku) => [sku, await catalogIdBySku(sku, env)])),
    );

    // Create a Square Order with proper line items
    const orderData = await createOrder(items, catalogMap, env);
    if (!orderData.order) {
      return json({ error: orderData.errors ?? 'Failed to create order' }, 500);
    }

    // Use the order's calculated total so Square can reconcile the payment
    const amountMoney = orderData.order.total_money
      ?? { amount: Math.round(total * 100), currency: 'USD' };

    const buyerEmail = items.flatMap((i) => Object.entries(i.customFields || {})
      .filter(([k]) => k.toLowerCase() === 'email')
      .map(([, v]) => v))[0];

    const squareRes = await fetch(`${SQUARE_BASE}/payments`, {
      method: 'POST',
      headers: squareHeaders(env),
      body: JSON.stringify({
        source_id: token,
        amount_money: amountMoney,
        location_id: env.SQUARE_LOCATION_ID,
        order_id: orderData.order.id,
        idempotency_key: crypto.randomUUID(),
        ...(buyerEmail ? { buyer_email_address: buyerEmail } : {}),
      }),
    });

    const data = await squareRes.json();

    if (!squareRes.ok) {
      return json({ error: data.errors }, 400);
    }

    return json({ orderId: data.payment.order_id, status: data.payment.status });
  },
};
