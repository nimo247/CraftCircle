import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { getCart, removeFromCart, clearCart } from "@/lib/cart";
import { addOrder, addOrderRemote } from "@/lib/orders";
import { auth } from "@/firebase";

export default function CartPage() {
  const [ids, setIds] = useState<string[]>([]);

  useEffect(() => {
    function update() {
      setIds(getCart());
    }
    update();

    const onStorage = (e: StorageEvent) => {
      if (e.key === null || e.key === "cart") update();
    };

    const onCustom = (e: any) => update();

    window.addEventListener("storage", onStorage);
    window.addEventListener("cart:update", onCustom);
    window.addEventListener("focus", update);

    return () => {
      window.removeEventListener("storage", onStorage);
      window.removeEventListener("cart:update", onCustom);
      window.removeEventListener("focus", update);
    };
  }, []);

  if (!ids || ids.length === 0)
    return (
      <div className="container py-12">
        <h2 className="text-2xl font-semibold mb-4">Your Cart</h2>
        <p className="text-muted-foreground">Your cart is empty.</p>
      </div>
    );

  return (
    <div className="container py-12">
      <h2 className="text-2xl font-semibold mb-6">Your Cart</h2>
      <CartProducts ids={ids} onRemove={(id: string) => setIds(getCart())} />
    </div>
  );
}

function CartProducts({
  ids,
  onRemove,
}: {
  ids: string[];
  onRemove: (id: string) => void;
}) {
  const [products, setProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    async function fetchByIds() {
      setLoading(true);
      try {
        const q = ids.length ? `?ids=${ids.join(",")}` : "";
        const res = await fetch(`/api/products${q}`);
        if (!res.ok) {
          const txt = await res.text().catch(() => null);
          console.error("Failed to load cart products:", txt);
          throw new Error("Failed to load cart products");
        }
        let json: any;
        try {
          json = await res.json();
        } catch (e) {
          const txt = await res.text().catch(() => null);
          console.error("Invalid JSON from /api/products:", txt);
          throw new Error("Invalid JSON response from server");
        }
        // preserve order matching ids
        const byId: Record<string, any> = {};
        (json.products || []).forEach((p: any) => (byId[String(p.id)] = p));
        const ordered = ids.map((id) => byId[id]).filter(Boolean);
        setProducts(ordered);
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

  async function handleCheckout() {
    const uid = auth?.currentUser?.uid;
    if (!uid) {
      // redirect to sign in page
      navigate("/auth");
      return;
    }

    try {
      const publishedOrders: any[] = [];
      for (const p of products) {
        if (!p) continue;
        let published: any = null;
        try {
          const remote = await addOrderRemote(uid, {
            id: String(p.id),
            title: p.title,
            price: Number(p.price || 0),
            image: p.images?.[0],
          });
          if (remote) {
            // also add locally for immediate UX
            addOrder({
              id: String(p.id),
              title: p.title,
              price: Number(p.price || 0),
              image: p.images?.[0],
            });
            published = remote;
          } else {
            published = addOrder({
              id: String(p.id),
              title: p.title,
              price: Number(p.price || 0),
              image: p.images?.[0],
            });
          }
        } catch (e) {
          console.error("Remote order failed", e);
          published = addOrder({
            id: String(p.id),
            title: p.title,
            price: Number(p.price || 0),
            image: p.images?.[0],
          });
        }
        if (published) publishedOrders.push(published);
      }

      // clear cart and emit update
      clearCart();
      setTimeout(() => window.dispatchEvent(new Event("cart:update")), 50);

      try {
        window.dispatchEvent(
          new CustomEvent("orders:update", { detail: publishedOrders }),
        );
      } catch (_) {}

      alert("Purchase recorded — view in Order history");
      navigate("/orders");
    } catch (e) {
      console.error("Checkout failed", e);
      alert("Checkout failed, please try again.");
    }
  }

  return (
    <div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="md:col-span-2">
          {products.map((p) => (
            <div
              key={p.id}
              className="flex gap-4 items-center border rounded-lg p-4 mb-4"
            >
              <img
                src={
                  (p.images && p.images[0]) ||
                  "/placeholder.svg?height=300&width=300"
                }
                className="w-28 h-28 object-contain"
              />
              <div className="flex-1">
                <div className="font-semibold">{p.title}</div>
                <div className="text-sm text-muted-foreground">₹{p.price}</div>
              </div>
              <div className="flex flex-col gap-2">
                <button
                  onClick={() => {
                    removeFromCart(String(p.id));
                    onRemove(String(p.id));
                  }}
                  className="px-3 py-2 rounded bg-red-600 text-white"
                >
                  Remove
                </button>
              </div>
            </div>
          ))}
        </div>

        <aside className="border rounded-lg p-4">
          <h3 className="font-semibold mb-4">Order summary</h3>
          <div className="flex justify-between mb-2">
            <div className="text-muted-foreground">Items</div>
            <div>{products.length}</div>
          </div>
          <div className="flex justify-between mb-4">
            <div className="text-muted-foreground">Subtotal</div>
            <div className="font-semibold">
              $
              {products
                .reduce((s, p) => s + Number(p.price || 0), 0)
                .toFixed(2)}
            </div>
          </div>
          <div className="flex gap-2">
            <button
              onClick={handleCheckout}
              className="flex-1 px-3 py-2 rounded bg-primary text-white"
            >
              Checkout
            </button>
            <button
              onClick={() => {
                clearCart();
                // small delay to allow storage event
                setTimeout(
                  () => window.dispatchEvent(new Event("cart:update")),
                  50,
                );
              }}
              className="px-3 py-2 rounded border"
            >
              Clear
            </button>
          </div>
        </aside>
      </div>
    </div>
  );
}
