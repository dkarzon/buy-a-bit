# 🦞 **Product Concept: “Pinch Buy-a-bit”**  
**NFC‑triggered instant checkout for real‑world products.**

Merchants create a small product catalogue.  
Each product gets a **unique QR/NFC landing page**.  
Customers tap/scan → enter contact details → pay on **Buy-a-bit’s custom payment page** (Pinch CaptureJS tokenisation + realtime charge) → confirmation → product is marked as purchased.

This is perfect for cafés, markets, creators, events, clubs, and pop‑ups.

Card data never hits Buy-a-bit servers — CaptureJS tokenises in the browser ([docs](https://docs.getpinch.com.au/docs/capturejs-tokenisation)); the API charges via `POST /payments/realtime` ([credit card guide](https://docs.getpinch.com.au/docs/credit-card-payments)).

---

## 🧭 **High‑Level User Flow**

### **1. Merchant Setup**
- Merchant signs in (email/password or Pinch OAuth).
- On first onboarding, chooses how they connect to Pinch (see **Pinch Connection Modes** below):
  - **Managed** — platform creates a Pinch sub-merchant under Buy-a-bit’s credentials.
  - **Bring your own keys (BYOK)** — existing Pinch merchant pastes Application ID, Secret, and **Publishable Key**.
- Creates a product list:
  - Name  
  - Price  
  - Description  
  - Optional image  
  - Optional stock count  
  - Optional variants (size, colour, etc.)
- For each product, your app:
  - Generates a **unique landing page URL** (e.g., `/p/{slug}`)
  - Generates a **QR code** and optionally writes the URL to an **NFC tag**

### **2. Customer Experience**
- Customer taps NFC tag or scans QR code.
- They land on your **product landing page**:
  - Product details  
  - Price  
  - Contact form (name, email, phone)  
  - “Continue to Payment” → navigates to **custom payment page** (`/pay/:orderId`)

### **3. Payment Flow (custom page — no Pinch Payment Links)**
1. Backend creates a **pending order** (amount from DB; never trust client price).
2. Payment page loads the merchant’s **publishable key** (`pk_test_…` / `pk_live_…`) and initialises CaptureJS.
3. Customer enters card details in your UI; browser calls `capture.createToken({ sourceType: "credit-card", … })`.
4. Frontend sends only the short-lived **token** to `payment.charge` (never PAN/CVC).
5. Backend resolves a **merchant-scoped Pinch client**:
   - Managed → platform Application credentials + `Current-Merchant: mch_…`
   - BYOK → that merchant’s stored Application credentials
6. Backend: create/update **Payer** → `POST /payments/realtime` with `payerId`, `amount` (cents from order), `creditCardToken`, metadata.
7. Immediate response drives success/failure UX; navigate to `/payment/complete?session={orderId}`.

### **4. Post‑Payment**
- Your app:
  - Uses the realtime API response for instant UX.
  - Accepts Pinch webhooks (`realtime-payment`, etc.) as source of truth / reconciliation for `paid` / `failed`.
  - Shows a “Success” (or failure) page.
  - Sends merchant + customer a receipt/notification (stretch).

---

# 🔗 **Pinch Connection Modes**

Buy-a-bit supports two ways for a store to take Pinch payments. Both use the same product/checkout UX; only credential resolution and onboarding differ.

Pinch docs: [Managed Merchants](https://docs.getpinch.com.au/docs/managed-merchants), [Managed Merchants Payments](https://docs.getpinch.com.au/docs/managed-merchants-payments-guide), [Managed Merchant Onboarding](https://docs.getpinch.com.au/docs/managed-merchant-onboarding), [Application Authentication](https://docs.getpinch.com.au/docs/application-authentication).

```
┌─────────────────────────────────────────────────────────────┐
│                     Buy-a-bit API                           │
│  resolvePinchClient(merchant)                               │
│       │                                                     │
│       ├── mode = managed ──► platform App ID + Secret       │
│       │                      + header Current-Merchant      │
│       │                                                     │
│       └── mode = byok ──────► merchant App ID + Secret      │
│                              (no Current-Merchant)          │
└─────────────────────────────────────────────────────────────┘
```

### Mode A — Managed Merchants (platform impersonation)

**Who it’s for:** New merchants who don’t already have Pinch. Buy-a-bit is the marketplace / SaaS operator.

**How auth works**
- One set of **platform** Pinch Application credentials in server env (`PINCH_APPLICATION_ID` + `PINCH_SECRET_KEY`).
- Onboarding calls `POST /merchants/managed` with those credentials (no `Current-Merchant` on create).
- Persist the returned Pinch merchant id (`mch_…`) on our `merchants.pinchMerchantId`.
- Every subsequent Pinch call for that store uses the **same platform token** plus:

```http
Authorization: Bearer <platform_access_token>
Current-Merchant: mch_XXXXXXXXXXXXXXXX
```

**Onboarding sequence (managed)**
1. Merchant signs up in Buy-a-bit and chooses “Create Pinch account with Buy-a-bit”.
2. Collect company/contact details (and settlement bank details when going live).
3. API creates the managed merchant → store `mch_…`.
4. Subscribe webhooks for that sub-merchant (`POST /webhooks` with `Current-Merchant`).
5. Compliance: upload identity / financial / business-registration docs via `POST /merchants/upload-document` with `Current-Merchant`, or complete manually in Pinch Glassbox for hackathon speed.
6. Listen for `compliance-updated`. Live payments only when `MerchantStatus` is `active` (test/sandbox can proceed earlier for demos).

**Pros:** Single credential set; platform can onboard many stores; no merchant key management.  
**Cons:** Requires Managed Merchants enabled on the master account; compliance owned by the platform flow.

### Mode B — Bring Your Own Keys (existing Pinch merchants)

**Who it’s for:** Merchants who already have a Pinch account and Application keys.

**How auth works**
- Merchant pastes **Application ID** + **Secret Key** + **Publishable Key** during onboarding (from [Pinch API Keys](https://web.getpinch.com.au/api-keys)).
- Prefer Application auth over deprecated Merchant-ID-as-client_id ([docs](https://docs.getpinch.com.au/docs/application-authentication)).
- Store secret credentials **encrypted at rest** on the merchant row (never `VITE_` / never return secrets to the client).
- Publishable key (`pk_…`) is safe for the browser; return it from public payment-page APIs only for that order’s merchant.
- Pinch server calls for that store use **their** Bearer token only — no `Current-Merchant` header.
- Optionally store their Pinch merchant id (`mch_…`) if available for display/reconciliation.

**Onboarding sequence (BYOK)**
1. Merchant signs up and chooses “I already use Pinch”.
2. Paste Application ID + Secret + Publishable Key; API exchanges secret creds for a token (`POST …/connect/token`) to validate.
3. Persist encrypted secrets + publishable key + connection mode `byok`.
4. Webhooks: either (a) create a webhook subscription with their credentials pointing at `{API_URL}/webhooks/pinch`, or (b) instruct them to register that URL in the Pinch portal and store their webhook signing secret for verification.

**Pros:** Existing Pinch merchants keep their own settlements and portal; no managed-merchant enablement needed.  
**Cons:** Per-merchant secret storage and rotation; webhook verification may be per-merchant.

### Shared rules (both modes)

| Concern | Rule |
|--------|------|
| Token cache | Cache OAuth client-credentials tokens (~1h); refresh before expiry |
| Checkout | Always load product/price from DB; never trust client amount |
| Card data | Tokenise client-side with CaptureJS only; server accepts `creditCardToken` |
| Charge | `POST /payers` + `POST /payments/realtime` via the resolved client |
| Publishable key | Managed → platform `PINCH_PUBLISHABLE_KEY`; BYOK → merchant’s stored `pk_…` |
| Webhooks | Reconcile / confirm order status; verify signature before mutating |
| Secrets | Server-only Application secrets; BYOK secrets encrypted; never log raw keys |
| Routing | `payment.charge` picks credentials from the **order’s merchant**, not the session (customers are anonymous) |

### Hackathon default

- Prefer **Managed** if the hackathon Pinch master account has Managed Merchants enabled — demo one platform key, many stores.
- Otherwise ship **BYOK** first (paste keys on onboarding) — zero dependency on managed-merchant entitlement.
- Compliance UI can be stubbed: create managed merchant in test mode + complete verification in Glassbox manually.

---

# 🧱 **Technical Architecture**

### **Frontend**
- React / Next.js / Expo (if you want mobile)
- Pages:
  - Merchant dashboard  
  - Product creation  
  - Product landing pages (`/p/:slug`)  
  - **Custom payment page** (`/pay/:orderId`) — CaptureJS card form  
  - Payment confirmation page (`/payment/complete`)  

### **Backend**
- Node/Go/Python — whatever you like
- Responsibilities:
  - Merchant auth  
  - Product CRUD  
  - Order create + realtime charge (payer + payment)  
  - Webhook listener  
  - NFC/QR generation  
  - Publishable-key resolution for the payment page  

### **Pinch API Usage**

Auth (both modes): OAuth2 client credentials → Bearer token  
([Application Authentication](https://docs.getpinch.com.au/docs/application-authentication)).

Client-side: [CaptureJS](https://docs.getpinch.com.au/docs/capturejs-tokenisation) with the merchant’s publishable key → `creditCardToken`.

| Call | Managed | BYOK |
|------|---------|------|
| `POST /merchants/managed` | Platform creds, no `Current-Merchant` | n/a |
| `POST /merchants/upload-document` | Platform + `Current-Merchant` | n/a (merchant already verified) |
| `POST /webhooks` | Platform + `Current-Merchant` | Merchant’s own creds |
| `POST /payers` | Platform + `Current-Merchant` | Merchant’s own creds |
| `POST /payments/realtime` | Platform + `Current-Merchant` | Merchant’s own creds |
| `GET /payments/{id}` | Platform + `Current-Merchant` | Merchant’s own creds |

**Do not use** Pinch Payment Links (`POST /payment-links`) for MVP — checkout is first-party.

**Webhooks:** `realtime-payment` (and related payment events) → update `orders.status`.  
Also `compliance-updated` for managed merchants.

Metadata you’ll attach on the realtime payment:
```json
{
  "orderId": "…",
  "productId": "abc123",
  "merchantId": "xyz789",
  "customerName": "Jane Doe",
  "customerEmail": "jane@example.com"
}
```

---

# 🧩 **Data Model (MVP‑friendly)**

### **Merchant**
- id  
- userId (Better Auth)  
- businessName  
- **pinchConnectionMode** — `managed` \| `byok`  
- **pinchMerchantId** — Pinch `mch_…` (required for managed; optional for BYOK)  
- **pinchApplicationId** — BYOK only (nullable for managed)  
- **pinchSecretKeyEncrypted** — BYOK only; never expose to client  
- **pinchPublishableKey** — BYOK: merchant `pk_…`; managed: use platform env (nullable on row)  
- **pinchWebhookSecretEncrypted** — optional; per-merchant verify for BYOK  
- **pinchComplianceStatus** — managed: `pending` \| `in_review` \| `approved` \| `rejected`  
- **pinchMerchantStatus** — e.g. `unverified` \| `active` (gate live payments)  

### **Product**
- id  
- merchantId  
- slug (public URL key)  
- name  
- priceCents  
- description  
- imageUrl  
- stockCount (optional)  

### **Order**
- id  
- productId  
- merchantId  
- customerName  
- customerEmail  
- payerId (Pinch `pyr_…`, set at charge)  
- paymentId (Pinch `pmt_…`)  
- status (pending, paid, failed)  

---

# 🎯 **Why This Works (Commercially)**

### **1. Solves a real problem**
Small merchants want:
- frictionless payments  
- no POS hardware  
- no app downloads  
- no staff involvement  

This gives them:
- “Tap to buy”  
- “Scan to buy”  
- Works offline  
- Works at markets, events, pop‑ups, cafés, gyms, clubs  

### **2. Easy to monetise**
You can charge:
- **$9–$29/mo** for unlimited products  
- **$1 per product** for NFC tags  
- **2% fee** on top of Pinch (optional)  
- **White‑label** for events  

### **3. Viral demo factor**
People love tapping NFC tags.  
It feels magical.  
Perfect hackathon energy.

---

# 🚀 **What You Can Build in a Weekend (Hackathon Scope)**

### **Day 1**
- Merchant login  
- Onboarding: choose **managed** vs **BYOK**; create managed merchant *or* validate pasted Application + publishable keys  
- Product creation UI  
- Landing page template  
- QR code generation  
- Merchant-scoped Pinch client (`Current-Merchant` or BYOK token)  
- Custom payment page + CaptureJS tokenisation + `payment.charge` (realtime)  

### **Day 2**
- Confirmation page + status polling/`payment.getStatus`  
- Webhook handler (verify signature; map events → order status)  
- Managed: webhook subscribe on create; optional compliance stub / Glassbox  
- Simple merchant dashboard  
- NFC writing (optional but cool)  
- Live demo:  
  - Tap tag → buy product → success screen  

---

# 🎬 **Demo Script (for judges)**

1. **Show merchant dashboard**  
   “Here’s a café owner adding a new product — a $5 cookie.”

2. **Generate NFC tag**  
   “We tap ‘Generate NFC Tag’ and write the product URL.”

3. **Switch to phone**  
   “Now imagine I’m a customer at the café.”  
   Tap phone → product page opens.

4. **Enter contact details**  
   “I enter my name and email.”

5. **Custom payment page**  
   “Card details stay in the browser — CaptureJS tokenises them; we never see the card number.”

6. **Complete payment**  
   “We charge via Pinch realtime API and show success immediately.”

7. **Merchant dashboard updates**  
   “The order appears instantly with customer details.”

Judges love this because it’s tactile, fast, and real.