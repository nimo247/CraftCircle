import React, { useEffect, useState } from "react";
import {
  getWishlist,
  removeFromWishlist,
  fetchWishlistRemote,
  removeWishlistRemote,
} from "@/lib/wishlist";
import { addToCart } from "@/lib/cart";
import { addOrder, addOrderRemote } from "@/lib/orders";
import { auth } from "@/firebase";
import { onAuthStateChanged } from "firebase/auth";

export default function WishlistPage() {
  const [ids, setIds] = useState<string[]>([]);

  useEffect(() => {
    let mounted = true;
    async function update() {
      try {
        const uid = auth?.currentUser?.uid;
        if (uid) {
          const remote = await fetchWishlistRemote(uid);
          if (!mounted) return;
          setIds(remote);
          return;
        }
      } catch (e) {
        // ignore
      }
      setIds(getWishlist());
    }
    update();

    const onStorage = (e: StorageEvent) => {
      if (e.key === null || e.key === "wishlist_v1") update();
    };

    window.addEventListener("storage", onStorage);
    window.addEventListener("focus", update);

    const unsub = onAuthStateChanged(auth, () => update());

    return () => {
      mounted = false;
      window.removeEventListener("storage", onStorage);
      window.removeEventListener("focus", update);
      unsub();
    };
  }, []);

  if (!ids || ids.length === 0)
    return (
      <div className="container py-12">
        <h2 className="text-2xl font-semibold mb-4">Your wishlist</h2>
        <p className="text-muted-foreground">Your wishlist is empty.</p>
      </div>
    );

  return (
    <div className="container py-12">
      <h2 className="text-2xl font-semibold mb-6">Your wishlist</h2>
      <WishlistProducts ids={ids} />
    </div>
  );
}

function WishlistProducts({ ids }: { ids: string[] }) {
  const [products, setProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchByIds() {
      setLoading(true);
      try {
        const q = ids.length ? `?ids=${ids.join(",")}` : "";
        const res = await fetch(`/api/products${q}`);
        if (!res.ok) throw new Error("Failed to load wishlist products");
        const json = await res.json();
        setProducts(json.products || []);
      } catch (err) {
        console.error(err);
        setProducts([]);
      } finally {
        setLoading(false);
      }
    }
    fetchByIds();
  }, [ids]);

  if (loading) return <p>Loading...</p>;
  if (products.length === 0) return <p>No products found.</p>;

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
      {products.map((p) => {
        const outOfStock =
          Number.isFinite(Number(p.stock)) && Number(p.stock) <= 0;
        return (
          <div key={p.id} className="relative border rounded-lg p-4">
            <img
              src={
                (p.images && p.images[0]) ||
                "/placeholder.svg?height=300&width=300"
              }
              className="w-full h-48 object-contain mb-3"
            />
            <div className="font-semibold">{p.title}</div>
            <div className="text-sm text-muted-foreground mb-3">₹{p.price}</div>

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <button
                  onClick={async () => {
                    if (outOfStock) return;
                    const uid = auth?.currentUser?.uid;
                    if (uid) {
                      const remoteOrder = await addOrderRemote(uid, {
                        id: String(p.id),
                        title: p.title,
                        price: Number(p.price || 0),
                        image: p.images && p.images[0],
                      });
                      if (remoteOrder) {
                        try {
                          window.dispatchEvent(
                            new CustomEvent("orders:update", {
                              detail: remoteOrder,
                            }),
                          );
                        } catch (_) {}
                        alert("Purchase recorded — view in Order history");
                        return;
                      }
                    }
                    const order = addOrder({
                      id: String(p.id),
                      title: p.title,
                      price: Number(p.price || 0),
                      image: p.images && p.images[0],
                    });
                    try {
                      window.dispatchEvent(
                        new CustomEvent("orders:update", { detail: order }),
                      );
                    } catch (_) {}
                    alert("Purchase recorded — view in Order history");
                  }}
                  className={`bg-emerald-600 text-white px-3 py-1 rounded ${outOfStock ? "opacity-60 pointer-events-none" : ""}`}
                >
                  Buy
                </button>

                <button
                  onClick={() => {
                    if (outOfStock) return;
                    addToCart(String(p.id));
                    try {
                      window.dispatchEvent(new Event("cart:update"));
                    } catch (_) {}
                    alert("Added to cart");
                  }}
                  className={`bg-white border px-3 py-1 rounded ${outOfStock ? "opacity-60 pointer-events-none" : ""}`}
                >
                  Add to cart
                </button>
              </div>

              <div>
                <button
                  onClick={async () => {
                    const uid = auth?.currentUser?.uid;
                    if (uid) {
                      await removeWishlistRemote(uid, String(p.id));
                    } else {
                      removeFromWishlist(String(p.id));
                    }
                    // update local state to remove item immediately
                    setProducts((prev) =>
                      prev.filter((x) => String(x.id) !== String(p.id)),
                    );
                    // also update parent ids by dispatching focus/storage event
                    try {
                      window.dispatchEvent(new Event("storage"));
                    } catch (_) {}
                  }}
                  className="text-sm text-red-600 underline"
                >
                  Remove
                </button>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
