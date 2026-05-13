# Woodlife Carving

Website for Woodlife Carving — a hand-crafted wood art shop. Built on [Adobe Experience Manager Edge Delivery Services](https://www.aem.live/) with a Cloudflare Worker backend for payments and fulfillment.

## Environments

| Environment | URL |
|---|---|
| Production | https://main--woodlife-carving--pkoch73.aem.live/ |
| Preview | https://main--woodlife-carving--pkoch73.aem.page/ |
| Local dev | http://localhost:3000 (or port shown by `aem up` in a worktree) |

---

## Quick Start

```sh
npm install
npx @adobe/aem-cli up          # starts dev server at http://localhost:3000
npm run lint                   # ESLint + Stylelint
npm run lint:fix               # auto-fix lint issues
```

To serve local HTML drafts alongside live CMS content:

```sh
npx @adobe/aem-cli up --html-folder drafts
# test page available at http://localhost:<port>/product-test
```

---

## Architecture

```
Browser
  └── AEM Edge Delivery (CDN + CMS content)
        └── Vanilla JS blocks (no build step)
              └── scripts/cart.js      — localStorage shopping cart
              └── blocks/checkout/     — Square Web Payments SDK
                    └── POST /checkout
                          └── Cloudflare Worker (woodlife-checkout)
                                ├── Square Catalog API  — SKU → catalog ID lookup
                                ├── Square Orders API   — create order with fulfillment
                                ├── Square Payments API — charge card token
                                ├── Printify Orders API — create fulfillment order (POD items)
                                └── Google Places API   — reviews proxy (/reviews)
```

### Commerce flow

1. Customer browses products, selects variants, clicks **Add to Cart**
2. Cart persists in `localStorage`; header badge updates via `cart:updated` event
3. Customer opens cart → clicks **Checkout** → `/checkout` page
4. Checkout form collects name + email (always) and shipping address (when any cart item has `Fulfillment: Shipment`)
5. Square Web Payments SDK tokenises the card on the client — card data never touches our servers
6. Worker receives `{ token, total, items, customer }`:
   - Looks up Square Catalog IDs for each SKU (in parallel)
   - Creates a Square Order with line items + fulfillment record
   - Charges the card, attaching it to the order
   - If any item has a `printifySku`: creates a Printify fulfillment order (print-on-demand shipping)
7. Customer is redirected to `/order-confirmation?order=<squareOrderId>`

### Mixed-cart support

A single checkout can contain both **Printify** (print-on-demand, shipped by Printify) and **non-Printify** items (e.g. hand-carved pieces for pickup or manual shipment). The worker:
- Sends all items to Square (full order record, address on every payment)
- Sends only Printify-tagged items to Printify
- Pickup items require no address; shipment items always collect one

---

## Blocks

| Block | Purpose |
|---|---|
| `header` | Navigation, cart icon with item-count badge |
| `footer` | Site footer |
| `hero` | Full-width hero image/text |
| `carousel` | Auto-playing image slideshow |
| `cards` | Card grid for product or content listings |
| `columns` | Multi-column layout |
| `photo-gallery` | Masonry/grid photo gallery |
| `festival` | Festival/event feature page layout |
| `product` | Product detail — image, price, variants, add-to-cart |
| `cart` | Slide-in cart modal with quantity controls |
| `checkout` | Checkout form (customer info + Square card payment) |
| `order-confirmation` | Post-purchase success page |
| `fragment` | Embeds reusable CMS content fragments |

---

## Product Block — Content Authoring

Products are authored as two-cell rows in the CMS (image | details). The details cell supports these special lines:

```
<h1>Product Title</h1>
SKU: MY-SKU-001
$29.99
Size: S|M|L|XL                       ← variant dropdown (requires ≥2 options)
Color: White|Black                    ← additional variant dimension
Fields: Name|Email                    ← custom input fields collected at add-to-cart
Fulfillment: Shipment                 ← or "Pickup" — controls whether address is collected
Printify SKUs: S=<sku>|M=<sku>|...   ← enables Printify fulfillment (auto-sets Shipment)
Any remaining paragraphs become the product description.
```

### Printify SKU mapping

`Printify SKUs:` maps the selected variant combination to a Printify variant SKU. The combo key is the selected option values sorted alphabetically by their **label name**, joined with `+`.

**Single variant (Size only):**
```
Size: S|M|L
Printify SKUs: S=111|M=222|L=333
```

**Two variants (Color label sorts before Size label):**
```
Color: White|Black
Size: S|M|L
Printify SKUs: White+S=111|White+M=222|Black+S=333|Black+M=444
```

**No variants (single SKU):**
```
Printify SKUs: =<printify-variant-sku>
```

> Printify variant SKUs are found in **Printify → product → Variants tab** for each variant row.

---

## Cloudflare Worker

The worker (`worker/src/index.js`) is deployed to Cloudflare Workers at:

```
https://woodlife-checkout.philipp-koch.workers.dev
```

**Endpoints:**

| Method | Path | Purpose |
|---|---|---|
| `POST` | `/checkout` | Process payment + create Printify order |
| `GET` | `/reviews` | Proxy Google Places reviews (1-hour CDN cache) |

**Environment variables** (`wrangler.toml`):

```toml
SQUARE_APP_ID = "..."
GOOGLE_PLACE_ID = "..."
```

**Secrets** (set via CLI, never committed):

```sh
npx wrangler secret put SQUARE_ACCESS_TOKEN     # Square sandbox/production access token
npx wrangler secret put SQUARE_LOCATION_ID      # Square location ID
npx wrangler secret put GOOGLE_PLACES_API_KEY   # Google Places API key (reviews)
npx wrangler secret put PRINTIFY_API_TOKEN      # Printify personal access token
npx wrangler secret put PRINTIFY_SHOP_ID        # Printify shop ID (numeric)
```

**Deploy:**

```sh
cd worker
npx wrangler deploy
```

> The worker currently uses Square **sandbox** endpoints. To go live, update `SQUARE_BASE` in `worker/src/index.js` from `connect.squareupsandbox.com` to `connect.squareup.com` and update the Square App ID and SDK URL in `blocks/checkout/checkout.js`.

---

## Deployment

1. Push changes to a feature branch
2. Preview is available at `https://<branch>--woodlife-carving--pkoch73.aem.page/`
3. Run a [PageSpeed Insights](https://pagespeed.web.dev/) check against the preview URL — target 100
4. Open a PR; include a preview link in the description
5. Check CI: `gh pr checks`
6. Merge to `main` → AEM Code Sync deploys to production automatically
