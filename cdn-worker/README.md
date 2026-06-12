# woodlife-cdn worker

Cloudflare Worker that serves `woodlifecarving.com` by proxying requests to the
AEM Edge Delivery Services origin (`main--woodlife-carving--pkoch73.aem.live`).

`src/index.mjs` is Adobe's official BYO-CDN worker, copied verbatim from
[adobe/aem-cloudflare-prod-worker](https://github.com/adobe/aem-cloudflare-prod-worker)
per the [setup guide](https://www.aem.live/docs/byo-cdn-cloudflare-worker-setup).
Don't edit it locally — pull updates from upstream instead. It is excluded from
ESLint for that reason.

This worker is separate from `../worker` (the checkout API): site traffic is
cached and proxied here, while checkout keeps its own routes and logic.

## Deploy

Prerequisite: the `woodlifecarving.com` zone must be active in Cloudflare
(nameservers switched from Hover), otherwise the routes in `wrangler.toml`
fail to attach.

```sh
cd cdn-worker
npm install
npx wrangler deploy
```

## Cloudflare dashboard settings (one-time)

- DNS: `www` CNAME → `main--woodlife-carving--pkoch73.aem.live`, **Proxied** (orange cloud);
  apex `@` CNAME → `www.woodlifecarving.com`, **Proxied** (Cloudflare flattens it)
- SSL/TLS → Edge Certificates: enable **Always Use HTTPS**
- Caching → Configuration: cache level **Standard**, browser cache TTL **Respect Existing Headers**

## Verify

```sh
curl -I https://www.woodlifecarving.com/   # expect 200 with via: 1.1 varnish / x-served-by headers from AEM
```
