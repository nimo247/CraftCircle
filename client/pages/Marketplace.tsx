import React, { useEffect, useState, useMemo } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { AlertTriangle, Heart, ShoppingCart, CreditCard } from "lucide-react";
import {
  addToWishlist,
  removeFromWishlist,
  isInWishlist,
  toggleWishlist,
  toggleWishlistRemote,
  fetchWishlistRemote,
} from "@/lib/wishlist";
import { addToCart, isInCart } from "@/lib/cart";
import { addOrder, addOrderRemote } from "@/lib/orders";
import { auth } from "@/firebase";

function AddToCartButton({
  productId,
  disabled,
}: {
  productId: any;
  disabled?: boolean;
}) {
  const sid = productId != null ? String(productId) : "";
  const valid = sid.length > 0 && !disabled;
  const [added, setAdded] = useState(false);

  useEffect(() => {
    if (!sid) return;
    setAdded(isInCart(sid));

    const onStorage = () => setAdded(isInCart(sid));
    window.addEventListener("storage", onStorage);
    window.addEventListener("cart:update", onStorage);
    return () => {
      window.removeEventListener("storage", onStorage);
      window.removeEventListener("cart:update", onStorage);
    };
  }, [sid]);

  const onClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!sid || disabled) return;
    addToCart(sid);
    setAdded(true);
    setTimeout(() => setAdded(false), 1200);
  };

  return (
    <button
      type="button"
      onClick={(e) => {
        console.debug("AddToCart clicked", productId);
        onClick(e);
      }}
      data-product-id={String(productId)}
      aria-label={added ? "Added to cart" : "Add to cart"}
      aria-disabled={disabled ? true : undefined}
      title={
        disabled
          ? "Out of stock"
          : !sid
            ? "Product id unavailable"
            : added
              ? "Added"
              : "Add to cart"
      }
      className={`bg-white/90 p-2 rounded-full shadow transition-transform z-50 pointer-events-auto ${
        added
          ? "text-green-600 hover:scale-105"
          : "text-gray-400 hover:scale-105"
      } ${!sid || disabled ? "opacity-60" : ""}`}
    >
      <ShoppingCart className="w-5 h-5 stroke-current" />
    </button>
  );
}

function WishlistButton({ productId }: { productId: any }) {
  const sid = productId != null ? String(productId) : "";
  const valid = sid.length > 0;
  const [active, setActive] = useState(false);

  useEffect(() => {
    let mounted = true;
    async function init() {
      if (!valid) return;
      const uid = auth?.currentUser?.uid;
      if (uid) {
        try {
          const list = await fetchWishlistRemote(uid);
          if (!mounted) return;
          setActive(list.includes(sid));
        } catch (e) {
          setActive(isInWishlist(sid));
        }
      } else {
        setActive(isInWishlist(sid));
      }
    }
    init();

    const onStorage = () => setActive(isInWishlist(sid));
    window.addEventListener("storage", onStorage);
    return () => {
      mounted = false;
      window.removeEventListener("storage", onStorage);
    };
  }, [sid, valid]);

  const onClick = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!valid) return;
    const uid = auth?.currentUser?.uid;
    if (uid) {
      try {
        const result = await toggleWishlistRemote(uid, sid);
        setActive(Boolean(result));
      } catch (e) {
        console.error("toggleWishlistRemote failed", e);
        // fallback to local toggle
        toggleWishlist(sid);
        setActive(isInWishlist(sid));
      }
    } else {
      toggleWishlist(sid);
      setActive(isInWishlist(sid));
    }
  };

  return (
    <button
      type="button"
      onClick={(e) => {
        console.debug("Wishlist clicked", productId);
        onClick(e);
      }}
      data-product-id={String(productId)}
      aria-label={active ? "Remove from wishlist" : "Add to wishlist"}
      title={
        !valid
          ? "Product id unavailable"
          : active
            ? "Remove from wishlist"
            : "Add to wishlist"
      }
      className={`bg-white/90 p-2 rounded-full shadow transition-transform z-50 pointer-events-auto ${
        active
          ? "text-red-600 hover:scale-105"
          : "text-gray-400 hover:scale-105"
      } ${!valid ? "opacity-60" : ""}`}
    >
      <Heart
        className="w-5 h-5 stroke-current"
        fill={active ? "currentColor" : "none"}
      />
    </button>
  );
}

export default function Marketplace({ limit }: { limit?: number }) {
  const [products, setProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState<number | null>(null);

  const location = useLocation();
  const navigate = useNavigate();

  const params = useMemo(
    () => new URLSearchParams(location.search),
    [location.search],
  );
  const qParam = params.get("q") || "";
  const pageParam = Math.max(1, Number(params.get("page") || 1));
  const perPageParam = Math.max(
    1,
    Math.min(100, Number(params.get("per_page") || 12)),
  );
  const totalPages =
    total && total > 0 ? Math.ceil(total / (limit || perPageParam)) : null;

  useEffect(() => {
    fetchProducts();
  }, [location.search, limit]);

  const isEmbedded = typeof limit === "number" && limit > 0;
  const gridClass = isEmbedded
    ? "grid grid-cols-1 sm:grid-cols-1 md:grid-cols-2 lg:grid-cols-2 xl:grid-cols-3 gap-6 p-6"
    : "grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4 p-4";
  const cardClass = isEmbedded
    ? "relative border rounded-2xl shadow-md p-5 bg-white hover:shadow-xl transform hover:-translate-y-2 transition-all duration-200 flex flex-col"
    : "relative border rounded-xl shadow-sm p-3 bg-white hover:shadow-md transform hover:-translate-y-1 transition-all duration-150 flex flex-col";
  const imageWrapperClass = isEmbedded
    ? "relative w-full rounded-lg mb-6 overflow-hidden bg-gray-50"
    : "relative w-full rounded-md mb-4 overflow-hidden bg-gray-50";
  const imageAspect = isEmbedded ? "1 / 1" : "4 / 3";
  const titleClass = isEmbedded
    ? "text-lg font-semibold truncate mb-2"
    : "text-sm font-medium leading-snug truncate mb-1";
  const priceClass = isEmbedded
    ? "text-lg font-bold text-primary truncate"
    : "text-base font-semibold text-primary truncate";

  async function fetchProducts() {
    setLoading(true);
    try {
      const qs = new URLSearchParams();
      if (qParam) qs.set("q", qParam);
      if (limit) qs.set("per_page", String(limit));
      else qs.set("per_page", String(perPageParam));
      if (pageParam) qs.set("page", String(pageParam));
      const url = `/api/products?${qs.toString()}`;
      const res = await fetch(url);
      if (!res.ok) {
        const txt = await res.text().catch(() => null);
        console.error("Failed to load products:", txt);
        throw new Error("Failed to load products");
      }
      let json: any;
      try {
        json = await res.json();
      } catch (e) {
        const txt = await res.text().catch(() => null);
        console.error("Invalid JSON from /api/products:", txt);
        throw new Error("Invalid JSON response from server");
      }
      setProducts(json.products || []);
      setTotal(typeof json.total === "number" ? json.total : null);
    } catch (error) {
      console.error("Error fetching products:", error);
      setProducts([]);
      setTotal(null);
    } finally {
      setLoading(false);
    }
  }

  function changePage(nextPage: number) {
    const p = new URLSearchParams(location.search);
    p.set("page", String(nextPage));
    navigate({ search: p.toString() });
  }

  if (loading) return <p>Loading...</p>;
  if (products.length === 0) return <p>No products yet — check back soon.</p>;

  return (
    <div>
      <div className={gridClass}>
        {products.map((product) => {
          const numericStock = Number(product.stock) || 0;
          const numericThreshold = Number(product.low_stock_threshold) || 5;
          const outOfStock = numericStock <= 0;

          return (
            <div key={product.id} className={cardClass}>
              {/* Image section with fixed icons */}
              <div
                className={imageWrapperClass}
                style={{ aspectRatio: imageAspect }}
              >
                {product.images?.[0] ? (
                  <img
                    src={product.images[0]}
                    alt={product.title}
                    className="w-full h-full object-contain"
                    onError={(e: any) => {
                      e.currentTarget.src =
                        "/placeholder.svg?height=300&width=300";
                      e.currentTarget.className =
                        "w-full h-full object-contain opacity-80";
                    }}
                  />
                ) : (
                  <img
                    src="/placeholder.svg?height=300&width=300"
                    alt="placeholder"
                    className="w-full h-full object-contain"
                  />
                )}

                {/* Out of stock overlay */}
                {outOfStock && (
                  <div className="absolute inset-0 flex items-center justify-center bg-black/60 text-white rounded-lg p-4 z-10">
                    <div className="text-center">
                      <div className="text-xl font-extrabold">Out of stock</div>
                      <div className="text-sm text-gray-300 mt-1">
                        This item is currently unavailable.
                      </div>
                    </div>
                  </div>
                )}

                {/* Low stock badge */}
                {numericStock > 0 && numericStock <= numericThreshold && (
                  <div className="absolute left-2 top-2 bg-red-600 text-white rounded-full p-2 shadow">
                    <AlertTriangle className="size-4" />
                  </div>
                )}

                {/* Icons: wishlist + cart stacked in top-right */}
                <div className="absolute top-3 right-3 flex flex-col gap-2 z-20">
                  <WishlistButton productId={product.id} />
                  <AddToCartButton
                    productId={product.id}
                    disabled={outOfStock}
                  />
                </div>
              </div>

              {/* Product content */}
              <div className="flex-1 flex flex-col justify-between min-h-[120px]">
                <div className="mb-2">
                  <h3 className={titleClass}>{product.title}</h3>
                  <div className="text-sm text-gray-500 mb-1">
                    {product.categories?.slice(0, 2).join(", ") ||
                      "Uncategorized"}
                  </div>
                  <div className="text-sm text-muted-foreground">
                    {product.vendor_email
                      ? product.vendor_email.split("@")[0]
                      : ""}
                  </div>
                </div>

                {/* Price + Buy button */}
                <div className="mt-3 flex items-center justify-between">
                  <div className={priceClass}>₹{product.price}</div>
                  <button
                    type="button"
                    onClick={async (e) => {
                      console.debug("Buy clicked", product.id);
                      e.preventDefault();
                      e.stopPropagation();
                      if (outOfStock) return;
                      const uid = auth?.currentUser?.uid;
                      let publishedOrder: any = null;
                      if (uid) {
                        try {
                          const remoteOrder = await addOrderRemote(uid, {
                            id: String(product.id),
                            title: product.title,
                            price: Number(product.price || 0),
                            image: product.images?.[0],
                          });
                          if (remoteOrder) {
                            // also add locally for immediate UX
                            addOrder({
                              id: String(product.id),
                              title: product.title,
                              price: Number(product.price || 0),
                              image: product.images?.[0],
                            });
                            publishedOrder = remoteOrder;
                          } else {
                            // remote failed but still add locally
                            const o = addOrder({
                              id: String(product.id),
                              title: product.title,
                              price: Number(product.price || 0),
                              image: product.images?.[0],
                            });
                            publishedOrder = o;
                          }
                        } catch (e) {
                          console.error("Remote order failed", e);
                          const o = addOrder({
                            id: String(product.id),
                            title: product.title,
                            price: Number(product.price || 0),
                            image: product.images?.[0],
                          });
                          publishedOrder = o;
                        }
                      } else {
                        // require sign-in to purchase
                        alert("Please sign in to purchase this product.");
                        return;
                      }
                      window.dispatchEvent(
                        new CustomEvent("orders:update", {
                          detail: publishedOrder,
                        }),
                      );
                      alert("Purchase recorded — view in Order history");
                    }}
                    aria-label="Buy now"
                    title={outOfStock ? "Out of stock" : "Buy now"}
                    className={`bg-white/90 px-3 py-2 rounded-md shadow text-emerald-600 hover:scale-105 ${
                      outOfStock ? "opacity-60 pointer-events-none" : ""
                    }`}
                  >
                    <CreditCard className="w-4 h-4 stroke-current" />
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Pagination */}
      {totalPages && totalPages > 1 && (
        <div className="flex items-center justify-center gap-2 p-4">
          <button
            className="px-3 py-1 rounded border"
            onClick={() => changePage(Math.max(1, pageParam - 1))}
            disabled={pageParam <= 1}
          >
            Previous
          </button>
          <div className="text-sm text-muted-foreground">
            Page {pageParam} of {totalPages}
          </div>
          <button
            className="px-3 py-1 rounded border"
            onClick={() => changePage(pageParam + 1)}
            disabled={pageParam >= totalPages}
          >
            Next
          </button>
        </div>
      )}
    </div>
  );
}
