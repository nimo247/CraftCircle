export const WISHLIST_KEY = "wishlist_v1";

// Helper to guard against invalid ids being stored (e.g. String(null) -> "null", "0", "undefined")
function isValidId(s: string | null | undefined) {
  if (s == null) return false;
  const v = String(s).trim();
  if (!v) return false;
  // Reject common invalid stringified values
  if (v === "null" || v === "undefined" || v === "0") return false;
  return true;
}

// Use string IDs to support UUIDs and numeric ids
export function getWishlist(): string[] {
  try {
    const raw = localStorage.getItem(WISHLIST_KEY);
    if (!raw) return [];
    const arr = JSON.parse(raw);
    if (!Array.isArray(arr)) return [];
    return arr.map((v) => String(v).trim()).filter((s) => isValidId(s));
  } catch (e) {
    console.warn("Failed to parse wishlist from localStorage", e);
    return [];
  }
}

export function setWishlist(ids: string[]) {
  try {
    const normalized = Array.from(
      new Set(ids.map((s) => String(s).trim()).filter((s) => isValidId(s))),
    );
    localStorage.setItem(WISHLIST_KEY, JSON.stringify(normalized));
  } catch (e) {
    console.error("Failed to set wishlist", e);
  }
}

export function addToWishlist(id: string) {
  if (!isValidId(id)) return;
  const sid = String(id).trim();
  const list = getWishlist();
  if (!list.includes(sid)) {
    list.unshift(sid);
    setWishlist(list);
  }
}

export function removeFromWishlist(id: string) {
  if (!isValidId(id)) return;
  const sid = String(id).trim();
  const list = getWishlist().filter((s) => s !== sid);
  setWishlist(list);
}

export function toggleWishlist(id: string) {
  if (!isValidId(id)) return;
  const sid = String(id).trim();
  const list = getWishlist();
  if (list.includes(sid)) removeFromWishlist(sid);
  else addToWishlist(sid);
}

export function isInWishlist(id: string) {
  if (!isValidId(id)) return false;
  const sid = String(id).trim();
  return getWishlist().includes(sid);
}

// Remote helpers using server endpoints (use service role on server)

export async function fetchWishlistRemote(userId: string) {
  try {
    const res = await fetch(`/api/wishlist?user_id=${encodeURIComponent(userId)}`);
    if (!res.ok) throw new Error(`Failed to fetch remote wishlist: ${res.status}`);
    const data = await res.json();
    return (data || []).map((r: any) => String(r.product_id));
  } catch (e) {
    console.error("Failed to fetch remote wishlist", e);
    return [];
  }
}

export async function addWishlistRemote(userId: string, productId: string) {
  try {
    const res = await fetch(`/api/wishlist`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ user_id: userId, product_id: productId }),
    });
    if (!res.ok) throw new Error(`Failed to add remote wishlist: ${res.status}`);
    const data = await res.json();
    return !!data;
  } catch (e) {
    console.error("Failed to add remote wishlist", e);
    return false;
  }
}

export async function removeWishlistRemote(userId: string, productId: string) {
  try {
    const res = await fetch(`/api/wishlist`, {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ user_id: userId, product_id: productId }),
    });
    if (!res.ok) throw new Error(`Failed to remove remote wishlist: ${res.status}`);
    return true;
  } catch (e) {
    console.error("Failed to remove remote wishlist", e);
    return false;
  }
}

export async function toggleWishlistRemote(userId: string, productId: string) {
  try {
    // check current state via GET
    const current = await fetchWishlistRemote(userId);
    const exists = current.includes(String(productId));
    if (exists) {
      const ok = await removeWishlistRemote(userId, productId);
      return !ok ? exists : false;
    }
    const added = await addWishlistRemote(userId, productId);
    return added;
  } catch (e) {
    console.error("Failed to toggle remote wishlist", e);
    return false;
  }
}
