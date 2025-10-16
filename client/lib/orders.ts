export const ORDERS_KEY = "orders_v1";

function isValidId(s: string | null | undefined) {
  if (s == null) return false;
  const v = String(s).trim();
  if (!v) return false;
  if (v === "null" || v === "undefined" || v === "0") return false;
  return true;
}

export type OrderItem = {
  id: string; // order id
  productId: string;
  title?: string;
  price?: number;
  image?: string;
  createdAt: string; // ISO
  deliveryAt: string; // ISO
};

export function getOrders(): OrderItem[] {
  try {
    const raw = localStorage.getItem(ORDERS_KEY);
    if (!raw) return [];
    const arr = JSON.parse(raw);
    if (!Array.isArray(arr)) return [];
    return arr.map((o) => ({
      ...o,
      id: String(o.id),
      productId: String(o.productId),
      title: o.title,
      price: Number(o.price || 0),
      image: o.image,
      createdAt: String(o.createdAt),
      deliveryAt: String(o.deliveryAt),
    }));
  } catch (e) {
    console.warn("Failed to parse orders from localStorage", e);
    return [];
  }
}

export function setOrders(items: OrderItem[]) {
  try {
    const normalized = items.map((o) => ({
      id: String(o.id),
      productId: String(o.productId),
      title: o.title,
      price: o.price,
      image: o.image,
      createdAt: o.createdAt,
      deliveryAt: o.deliveryAt,
    }));
    const json = JSON.stringify(normalized);
    localStorage.setItem(ORDERS_KEY, json);
    try {
      const ev = new StorageEvent("storage", {
        key: ORDERS_KEY,
        newValue: json,
      });
      window.dispatchEvent(ev);
    } catch (e) {
      // fallback
      try {
        window.dispatchEvent(
          new CustomEvent("orders:update", { detail: normalized }),
        );
      } catch (_) {}
    }
  } catch (e) {
    console.error("Failed to set orders", e);
  }
}

export function addOrder(product: {
  id: string;
  title?: string;
  price?: number;
  image?: string;
}) {
  if (!isValidId(product?.id)) return null;
  const now = new Date();
  // set delivery date 5 days later by default
  const delivery = new Date(now.getTime() + 5 * 24 * 60 * 60 * 1000);
  const order = {
    id: `${product.id}-${now.getTime()}`,
    productId: String(product.id),
    title: product.title,
    price: product.price || 0,
    image: product.image,
    createdAt: now.toISOString(),
    deliveryAt: delivery.toISOString(),
  };
  const list = getOrders();
  list.unshift(order);
  setOrders(list);
  return order;
}

export function removeOrder(id: string) {
  if (!isValidId(id)) return;
  const list = getOrders().filter((o) => o.id !== id);
  setOrders(list);
}

export function clearOrders() {
  setOrders([]);
}

// Remote helpers using server endpoints (use service role)

export async function fetchOrdersRemote(userId: string) {
  try {
    const res = await fetch(`/api/orders?user_id=${encodeURIComponent(userId)}`);
    if (!res.ok) throw new Error(`Failed to fetch remote orders: ${res.status}`);
    const data = await res.json();
    const orders = (data || []).map((o: any) => ({
      id: String(o.id),
      productId: String(o.product_id),
      title: undefined as string | undefined,
      price: undefined as number | undefined,
      image: undefined as string | undefined,
      createdAt: o.created_at || new Date().toISOString(),
      deliveryAt: o.created_at || new Date().toISOString(),
    }));

    // Fetch product metadata for all productIds to populate title/image/price
    const ids = Array.from(new Set(orders.map((o) => o.productId).filter(Boolean)));
    if (ids.length > 0) {
      try {
        const q = ids.length ? `?ids=${ids.join(",")}` : "";
        const pres = await fetch(`/api/products${q}`);
        if (pres.ok) {
          const pjson = await pres.json();
          const products = pjson.products || [];
          const byId: Record<string, any> = {};
          for (const p of products) byId[String(p.id)] = p;
          return orders.map((o) => {
            const p = byId[o.productId];
            return {
              ...o,
              title: p?.title || o.title,
              price: p?.price ?? o.price,
              image: (p?.images && p.images[0]) || o.image,
            };
          });
        }
      } catch (e) {
        console.warn("Failed to fetch product metadata for orders", e);
      }
    }

    return orders;
  } catch (e) {
    console.error("Failed to fetch remote orders", e);
    return [];
  }
}

export async function addOrderRemote(userId: string, product: { id: string; title?: string; price?: number; image?: string; }, quantity = 1) {
  try {
    const res = await fetch(`/api/orders`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ user_id: userId, product_id: product.id, quantity, status: "completed" }),
    });
    if (!res.ok) throw new Error(`Failed to add remote order: ${res.status}`);
    const o = await res.json();
    if (!o) return null;
    return {
      id: String(o.id),
      productId: String(o.product_id),
      title: product.title,
      price: product.price,
      image: product.image,
      createdAt: o.created_at || new Date().toISOString(),
      deliveryAt: o.created_at || new Date().toISOString(),
    } as OrderItem;
  } catch (e) {
    console.error("Failed to add remote order", e);
    return null;
  }
}
