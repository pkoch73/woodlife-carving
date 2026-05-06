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
