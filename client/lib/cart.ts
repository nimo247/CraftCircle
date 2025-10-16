export const CART_KEY = 'cart';

function isValidId(s: string | null | undefined) {
  if (s == null) return false;
  const v = String(s).trim();
  if (!v) return false;
  if (v === 'null' || v === 'undefined' || v === '0') return false;
  return true;
}

export function getCart(): string[] {
  try {
    const raw = localStorage.getItem(CART_KEY);
    if (!raw) return [];
    const arr = JSON.parse(raw);
    if (!Array.isArray(arr)) return [];
    return arr.map((v) => String(v).trim()).filter((s) => isValidId(s));
  } catch (e) {
    console.warn('Failed to parse cart from localStorage', e);
    return [];
  }
}

export function setCart(ids: string[]) {
  try {
    const normalized = Array.from(new Set(ids.map((s) => String(s).trim()).filter((s) => isValidId(s))));
    const json = JSON.stringify(normalized);
    localStorage.setItem(CART_KEY, json);
    try {
      // dispatch storage event so other listeners in same tab update
      const ev = new StorageEvent('storage', { key: CART_KEY, newValue: json });
      window.dispatchEvent(ev);
    } catch (e) {
      // fallback: dispatch a custom event
      try {
        const ev2 = new CustomEvent('cart:update', { detail: normalized });
        window.dispatchEvent(ev2);
      } catch (_) {
        // ignore
      }
    }
  } catch (e) {
    console.error('Failed to set cart', e);
  }
}

export function addToCart(id: string) {
  if (!isValidId(id)) return;
  const sid = String(id).trim();
  const list = getCart();
  // simple behavior: push to end
  list.push(sid);
  setCart(list);
}

export function removeFromCart(id: string) {
  if (!isValidId(id)) return;
  const sid = String(id).trim();
  const list = getCart().filter((s) => s !== sid);
  setCart(list);
}

export function clearCart() {
  setCart([]);
}

export function isInCart(id: string) {
  if (!isValidId(id)) return false;
  return getCart().includes(String(id).trim());
}
