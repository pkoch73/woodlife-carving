# Domain Migration: woodlifecarving.com → AEM EDS

## Overview

The current `woodlifecarving.com` domain points to an Etsy-hosted storefront via a CNAME to `patternbyetsy.com`. This guide covers moving it to the AEM Edge Delivery Services site, using Cloudflare as the CDN (already in the stack via the `woodlife-checkout` Worker).

The EDS site is already live and ready at:
- Preview: `https://main--woodlife-carving--pkoch73.aem.page/`
- Production: `https://main--woodlife-carving--pkoch73.aem.live/`

---

## Pre-flight Checklist

Before touching DNS, confirm:

- [ ] PageSpeed Insights score of 100 on `https://main--woodlife-carving--pkoch73.aem.page/`
- [ ] All pages, product listings, and checkout flows work on the `.aem.page` preview URL
- [ ] 301 redirects set up for any Etsy-specific URLs indexed by Google
- [ ] `sitemap.xml` and `robots.txt` are in place

---

## Step 1 — Lower TTL in Hover (do this first, 15 min before Step 2)

The domain is registered and DNS is managed at **hover.com** (nameservers: `ns1.hover.com` / `ns2.hover.com`).

1. Log in to [hover.com](https://hover.com) → **Domains** → `woodlifecarving.com` → **DNS**
2. Edit every record and change TTL to **5 minutes** (or lowest available)
3. Wait 15 minutes for the old TTL to expire

---

## Step 2 — Add the Domain to Cloudflare

1. Log in to [cloudflare.com](https://cloudflare.com) → **Add a Site** → enter `woodlifecarving.com`
2. Choose the **Free plan**
3. Cloudflare will scan and auto-import DNS records — verify these 4 are present:

| Type  | Name  | Value                                          | Notes                    |
|-------|-------|------------------------------------------------|--------------------------|
| A     | `@`   | `130.211.40.170`                               | Keep for now             |
| CNAME | `www` | `patternbyetsy.com`                            | Keep for now             |
| MX    | `@`   | `mx.hover.com.cust.hostedemail.com` (pri. 10)  | **Keep — Hover email**   |
| TXT   | `@`   | `v=spf1 include:_spf.hostedemail.com ~all`     | **Keep — Hover email**   |

4. Set the A and CNAME records to **DNS only** (grey cloud, not proxied) for now

> The MX and SPF records ensure `@woodlifecarving.com` email continues to work throughout the migration.

---

## Step 3 — Change Nameservers in Hover

Cloudflare will provide two nameservers (e.g., `xxx.ns.cloudflare.com`). Copy them, then:

1. In Hover → **Domains** → `woodlifecarving.com` → **Edit Nameservers**
2. Replace `ns1.hover.com` and `ns2.hover.com` with the two Cloudflare nameservers
3. Save — Cloudflare will email you when propagation is confirmed (typically 30 min–2 hours)

> The site still points to Etsy at this point — no downtime for visitors.

---

## Step 4 — Configure the Cloudflare Worker for AEM EDS

Once Cloudflare confirms the domain is active, update the Worker to proxy main site traffic to AEM EDS. The Worker must:

- Route `woodlifecarving.com/*` → `https://main--woodlife-carving--pkoch73.aem.live`
- Forward header `X-Forwarded-Host: www.woodlifecarving.com`
- Forward header `X-Push-Invalidation: enabled` (allows AEM to bust the CDN cache on content updates)
- Respect origin `Cache-Control` headers

Reference: https://www.aem.live/docs/byo-cdn-cloudflare-worker-setup

Files to update:
- `worker/wrangler.toml` — add route for `woodlifecarving.com/*`
- `worker/src/index.js` — add proxy logic for main site requests

---

## Step 5 — Update DNS Records to Point to AEM EDS

In Cloudflare DNS:

1. Delete the `www` CNAME pointing to `patternbyetsy.com`
2. Add a new CNAME: `www` → `main--woodlife-carving--pkoch73.aem.live` (or your Worker route)
3. Replace the apex A record with a CNAME: `@` → `www.woodlifecarving.com` (Cloudflare flattens this automatically)
4. Enable the **orange cloud (Proxied)** on both records

---

## Step 6 — Verify

```bash
# Should return 200 with AEM headers, not Etsy
curl -I https://www.woodlifecarving.com

# Should redirect to www or also load AEM
curl -I https://woodlifecarving.com
```

Additional checks:
- [ ] `https://www.woodlifecarving.com` loads the EDS site
- [ ] HTTPS works (no certificate errors)
- [ ] Checkout flow works end-to-end
- [ ] Google Search Console shows no unexpected 404s from old Etsy URLs
- [ ] Restore DNS TTL to 3600s
- [ ] Run PageSpeed Insights on the live custom domain — confirm score of 100
