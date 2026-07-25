export type Product = {
  id: string;
  name: string;
  slug: string;
  description: string;
  price: number;
  currency: "AUD";
  inventory: number;
  image: string;
  status: "Active" | "Low stock";
};

export type Order = {
  id: string;
  customer: string;
  initials: string;
  amount: number;
  time: string;
  status: "Paid" | "Pending" | "Refunded";
};

export const merchant = {
  name: "James",
  business: "Apex Commerce",
  email: "james@apexcommerce.com",
};

export const products: Product[] = [
  {
    id: "prod_1",
    name: "Vanguard Watch v2",
    slug: "vanguard-watch-v2",
    description: "A precision everyday watch with a sapphire face and brushed steel case.",
    price: 299,
    currency: "AUD",
    inventory: 8,
    image:
      "https://images.unsplash.com/photo-1523275335684-37898b6baf30?auto=format&fit=crop&w=600&q=85",
    status: "Active",
  },
  {
    id: "prod_2",
    name: "Artisan Ceramic Mug",
    slug: "artisan-ceramic-mug",
    description: "Hand-finished ceramic with a balanced shape and satin glaze.",
    price: 45.5,
    currency: "AUD",
    inventory: 26,
    image:
      "https://images.unsplash.com/photo-1514228742587-6b1558fcca3d?auto=format&fit=crop&w=600&q=85",
    status: "Low stock",
  },
  {
    id: "prod_3",
    name: "Executive Slim Wallet",
    slug: "executive-slim-wallet",
    description:
      "Designed for the modern professional, the Executive Slim Wallet combines high-quality RFID blocking with premium full-grain leather in a minimal profile.",
    price: 129,
    currency: "AUD",
    inventory: 14,
    image:
      "https://images.unsplash.com/photo-1627123424574-724758594e93?auto=format&fit=crop&w=900&q=90",
    status: "Active",
  },
  {
    id: "prod_4",
    name: "Signature Bottle",
    slug: "signature-bottle",
    description: "Double-wall stainless steel bottle for all-day temperature control.",
    price: 120,
    currency: "AUD",
    inventory: 3,
    image:
      "https://images.unsplash.com/photo-1602143407151-7111542de6e8?auto=format&fit=crop&w=600&q=85",
    status: "Low stock",
  },
];

export const orders: Order[] = [
  { id: "ORD-8294", customer: "John Smith", initials: "JS", amount: 349, time: "2m ago", status: "Paid" },
  { id: "ORD-8293", customer: "Alice Miller", initials: "AM", amount: 129.5, time: "15m ago", status: "Pending" },
  { id: "ORD-8290", customer: "Robert King", initials: "RK", amount: 95, time: "1h ago", status: "Paid" },
  { id: "ORD-8288", customer: "Linda Wright", initials: "LW", amount: 240, time: "3h ago", status: "Paid" },
];

export const dashboardStats = [
  { label: "Total sales", value: "$42,850.20", change: "+12.5%" },
  { label: "Active products", value: "128", change: "+6 this month" },
  { label: "Recent orders", value: "24", change: "Today" },
];

export const paymentMethods = [
  { id: "card", brand: "Visa", detail: "Visa ending in 4242", subline: "Expires 12/26", default: false },
  { id: "apple", brand: "Apple Pay", detail: "Apple Pay", subline: "Default method", default: true },
  { id: "google", brand: "Google Pay", detail: "Google Pay", subline: "alex.m@gmail.com", default: false },
];
