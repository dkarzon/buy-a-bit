# 🦞 **Product Concept: “Pinch Buy-a-bit”**  
**NFC‑triggered instant checkout for real‑world products.**

Merchants create a small product catalogue.  
Each product gets a **unique QR/NFC landing page**.  
Customers tap/scan → enter contact details → get forwarded to a **Pinch Payment Link** → return to your app with payment confirmation → product is marked as purchased.

This is perfect for cafés, markets, creators, events, clubs, and pop‑ups.

---

## 🧭 **High‑Level User Flow**

### **1. Merchant Setup**
- Merchant signs in with Pinch OAuth or API key.
- Creates a product list:
  - Name  
  - Price  
  - Description  
  - Optional image  
  - Optional stock count  
  - Optional variants (size, colour, etc.)
- For each product, your app:
  - Generates a **unique landing page URL** (e.g., `/p/{productId}`)
  - Creates a **Pinch Payment Link template** (or generates on demand)
  - Generates a **QR code** and optionally writes the URL to an **NFC tag**

### **2. Customer Experience**
- Customer taps NFC tag or scans QR code.
- They land on your **product landing page**:
  - Product details  
  - Price  
  - Contact form (name, email, phone)  
  - “Continue to Payment” button  

### **3. Payment Flow**
- Your backend:
  - Creates a **Payment Link** via Pinch API with:
    - amount  
    - metadata (productId, customer info, merchantId)  
    - returnUrl → `/payment/complete?session={id}`  
- Customer is redirected to the Pinch‑hosted checkout.
- After payment, Pinch redirects back to your app.

### **4. Post‑Payment**
- Your app:
  - Calls Pinch API to retrieve payment details.
  - Marks the product as purchased.
  - Shows a “Success” page.
  - Sends merchant + customer a receipt/notification.

---

# 🧱 **Technical Architecture**

### **Frontend**
- React / Next.js / Expo (if you want mobile)
- Pages:
  - Merchant dashboard  
  - Product creation  
  - Product landing pages  
  - Payment confirmation page  

### **Backend**
- Node/Go/Python — whatever you like
- Responsibilities:
  - Merchant auth  
  - Product CRUD  
  - Payment Link creation  
  - Webhook listener  
  - NFC/QR generation  
  - Payment verification  

### **Pinch API Usage**
You’ll use:
- **POST /payment-links**  
- **GET /payments/{id}**  
- **Webhooks** for:
  - payment.succeeded  
  - payment.failed  

Metadata you’ll attach:
```json
{
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
- pinchAccountId  
- businessName  

### **Product**
- id  
- merchantId  
- name  
- price  
- description  
- imageUrl  
- landingPageUrl  
- stockCount (optional)  

### **Order**
- id  
- productId  
- merchantId  
- customerName  
- customerEmail  
- paymentLinkId  
- paymentId  
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
- Product creation UI  
- Landing page template  
- QR code generation  
- Payment Link creation  
- Redirect to Pinch checkout  

### **Day 2**
- Return URL handling  
- Payment verification  
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

5. **Redirect to Pinch checkout**  
   “This is a secure Pinch‑hosted payment page.”

6. **Complete payment**  
   “After paying, I’m redirected back to the app.”

7. **Merchant dashboard updates**  
   “The order appears instantly with customer details.”

Judges love this because it’s tactile, fast, and real.