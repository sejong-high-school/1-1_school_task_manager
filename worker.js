export default {
  async fetch(request, env, ctx) {
    const upstream = env.UPSTREAM_URL; // e.g. https://your-subdomain.ngrok-free.app
    if (!upstream) {
      return new Response('UPSTREAM_URL not configured', { status: 500 });
    }

    // Build upstream URL by preserving path and query
    const url = new URL(request.url);
    const target = new URL(url.pathname + url.search, upstream);

    // Clone request, forward body when needed
    const init = {
      method: request.method,
      headers: new Headers(request.headers),
      body: request.method === 'GET' || request.method === 'HEAD' ? undefined : await request.clone().arrayBuffer(),
    };

    // Remove hop-by-hop and forbidden headers; add Authorization if configured
    const removed = ['host', 'cf-connecting-ip', 'x-forwarded-for', 'x-real-ip', 'content-length', 'origin'];
    removed.forEach(h => init.headers.delete(h));

    // Optional: Inject Authorization header for Traccar if provided via secret
    if (env.GATEWAY_TOKEN && !init.headers.get('Authorization')) {
      init.headers.set('Authorization', env.GATEWAY_TOKEN);
    }

    // Do upstream request
    let upstreamResp = await fetch(target.toString(), init);

    // Create a new response and set liberal CORS
    const respHeaders = new Headers(upstreamResp.headers);
    respHeaders.set('Access-Control-Allow-Origin', '*');
    respHeaders.set('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
    respHeaders.set('Access-Control-Allow-Headers', 'Content-Type,Authorization');

    // Handle preflight
    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: respHeaders });
    }

    return new Response(upstreamResp.body, {
      status: upstreamResp.status,
      statusText: upstreamResp.statusText,
      headers: respHeaders,
    });
  }
};

