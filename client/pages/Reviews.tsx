import React, { useEffect, useState } from "react";
import { getOrders } from "@/lib/orders";
import {
  getReviewForOrder,
  addReview,
  getReviewsForProduct,
  getReviews,
} from "@/lib/reviews";
import { auth } from "@/firebase";
import { onAuthStateChanged } from "firebase/auth";
import { supabase } from "@/supabaseClient";

export default function ReviewsPage() {
  const [orders, setOrders] = useState<any[]>([]);
  const [reviewsUpdated, setReviewsUpdated] = useState(0);
  const [currentUserName, setCurrentUserName] = useState<string | null>(null);

  useEffect(() => {
    // subscribe to auth state to keep the current user's name available
    const unsubscribe = onAuthStateChanged(auth, (u: any) => {
      if (u) setCurrentUserName(u.displayName || u.email || null);
      else setCurrentUserName(null);
    });
    return () => unsubscribe();
  }, []);

  const [publicReviews, setPublicReviews] = useState<any[]>([]);

  useEffect(() => {
    async function update() {
      // Only show local orders when user is signed in
      if (!auth?.currentUser) {
        setOrders([]);
      } else {
        setOrders(getOrders());
      }
      // Try Supabase first (public reviews)
      try {
        const res = await fetch("/api/reviews");
        if (res.ok) {
          const data = await res.json();
          let mapped = (Array.isArray(data) ? data : []).map((r: any) => ({
            id: String(r.id),
            orderId: String(r.order_id || r.orderId || ""),
            productId: String(r.product_id || r.productId || ""),
            rating: Number(r.rating || 0),
            text: r.comment || r.text || "",
            reviewerName: r.reviewer_name || r.reviewerName || "",
            attachments: Array.isArray(r.attachments) ? r.attachments : [],
            createdAt: r.created_at || r.createdAt || new Date().toISOString(),
            product: null as any,
          }));

          // Merge product metadata for reviewed products
          try {
            const ids = Array.from(
              new Set(mapped.map((m) => m.productId).filter(Boolean)),
            );
            if (ids.length > 0) {
              const q = `?ids=${encodeURIComponent(ids.join(","))}`;
              const pres = await fetch(`/api/products${q}`);
              if (pres.ok) {
                let pjson: any;
                try {
                  pjson = await pres.json();
                } catch (e) {
                  const txt = await pres.text().catch(() => null);
                  console.error("Invalid JSON from /api/products:", txt);
                  throw new Error("Invalid JSON response from server");
                }
                const products = pjson.products || [];
                const byId: Record<string, any> = {};
                for (const p of products) byId[String(p.id)] = p;
                mapped = mapped.map((m) => ({
                  ...m,
                  product: byId[m.productId] || null,
                }));
              }
            }
          } catch (e) {
            console.warn("Failed to fetch product metadata for reviews", e);
          }

          setPublicReviews(mapped);
          return;
        }
      } catch (e) {
        // ignore and fall back
      }
      // fallback to localStorage
      setPublicReviews(getReviews());
    }
    update();
    const onStorage = (e: StorageEvent) => {
      if (e.key === null || e.key === "orders_v1") update();
    };
    const onCustom = (e: any) => update();
    window.addEventListener("storage", onStorage);
    window.addEventListener("orders:update", onCustom);
    window.addEventListener("focus", update);
    const onReviews = () => update();
    window.addEventListener("reviews:update", onReviews);
    return () => {
      window.removeEventListener("storage", onStorage);
      window.removeEventListener("orders:update", onCustom);
      window.removeEventListener("focus", update);
      window.removeEventListener("reviews:update", onReviews);
    };
  }, []);

  // admin bulk selection state
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  const toggleSelect = (id: string) => {
    setSelectedIds((s) =>
      s.includes(id) ? s.filter((x) => x !== id) : [...s, id],
    );
  };

  const selectAll = () => {
    if (selectedIds.length === publicReviews.length) setSelectedIds([]);
    else setSelectedIds(publicReviews.map((r) => r.id));
  };

  const bulkDelete = async () => {
    if (selectedIds.length === 0) return alert("No reviews selected");
    if (
      !confirm(`Delete ${selectedIds.length} reviews? This cannot be undone.`)
    )
      return;
    try {
      const adminKey =
        (typeof window !== "undefined" && sessionStorage.getItem("adminKey")) ||
        "";
      const res = await fetch(`/api/admin/reviews/delete`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-admin-key": adminKey,
        },
        body: JSON.stringify({ ids: selectedIds }),
      });
      if (!res.ok) {
        const txt = await res.text().catch(() => null);
        alert("Failed to bulk delete reviews: " + txt);
        return;
      }
      // remove from UI
      setPublicReviews((prev) =>
        prev.filter((p) => !selectedIds.includes(p.id)),
      );
      setSelectedIds([]);
      alert(`Deleted ${selectedIds.length} reviews`);
    } catch (e) {
      console.error(e);
      alert("Failed to bulk delete reviews");
    }
  };

  return (
    <div className="container py-12">
      <h2 className="text-2xl font-semibold mb-6">Reviews</h2>
      <div className="text-sm text-muted-foreground mb-2">
        Signed in as: {currentUserName ?? "(not signed in)"}
      </div>

      {/* Public reviews visible to everyone */}
      <section className="mb-6">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold">All Reviews</h3>
          {typeof window !== "undefined" &&
            sessionStorage.getItem("isAdmin") === "true" && (
              <div className="flex items-center gap-2">
                <button
                  onClick={selectAll}
                  className="px-3 py-1 rounded border"
                >
                  {selectedIds.length === publicReviews.length
                    ? "Unselect all"
                    : "Select all"}
                </button>
                <button
                  onClick={bulkDelete}
                  className="px-3 py-1 rounded bg-red-600 text-white"
                >
                  Delete selected ({selectedIds.length})
                </button>
              </div>
            )}
        </div>
        <div className="mt-3 space-y-3">
          {publicReviews.length === 0 ? (
            <div className="text-muted-foreground">No reviews yet.</div>
          ) : (
            publicReviews.map((r) => (
              <div key={r.id} className="border rounded p-3">
                <div className="flex items-start gap-3">
                  {typeof window !== "undefined" &&
                    sessionStorage.getItem("isAdmin") === "true" && (
                      <div className="pt-2">
                        <input
                          type="checkbox"
                          checked={selectedIds.includes(r.id)}
                          onChange={() => toggleSelect(r.id)}
                        />
                      </div>
                    )}
                  <img
                    src={
                      r.product?.images?.[0] ||
                      "/placeholder.svg?height=48&width=48"
                    }
                    alt={r.product?.title || "product"}
                    className="w-12 h-12 object-contain rounded"
                  />
                  <div className="flex-1">
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="font-medium">
                          {r.product?.title || r.reviewerName || "Anonymous"}
                        </div>
                        {r.product?.title && (
                          <div className="text-sm text-muted-foreground">
                            Reviewed product
                          </div>
                        )}
                      </div>
                      <div className="text-sm text-muted-foreground">
                        {new Date(r.createdAt).toLocaleString()}
                      </div>
                    </div>
                    <div className="mt-2">{r.text}</div>
                    <div className="mt-2 flex gap-2">
                      {(r.attachments || []).map((a: string, i: number) => (
                        <div
                          key={i}
                          className="w-20 h-20 rounded overflow-hidden border"
                        >
                          {a.startsWith("data:video") ? (
                            <video
                              src={a}
                              className="w-full h-full object-cover"
                              controls
                            />
                          ) : (
                            <img
                              src={a}
                              className="w-full h-full object-cover"
                            />
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
                {/* Admin controls */}
                {typeof window !== "undefined" &&
                  sessionStorage.getItem("isAdmin") === "true" && (
                    <div className="mt-3 flex justify-end">
                      <button
                        className="px-3 py-1 text-sm rounded bg-red-600 text-white"
                        onClick={async () => {
                          if (
                            !confirm(
                              "Delete this review? This action cannot be undone.",
                            )
                          )
                            return;
                          try {
                            const adminKey =
                              sessionStorage.getItem("adminKey") || "";
                            const res = await fetch(
                              `/api/admin/reviews/${encodeURIComponent(r.id)}`,
                              {
                                method: "DELETE",
                                headers: { "x-admin-key": adminKey },
                              },
                            );
                            if (!res.ok) {
                              const txt = await res.text().catch(() => null);
                              alert("Failed to delete review: " + txt);
                              return;
                            }
                            // remove from UI
                            setPublicReviews((prev) =>
                              prev.filter((p) => p.id !== r.id),
                            );
                            alert("Review deleted");
                          } catch (e) {
                            console.error(e);
                            alert("Failed to delete review");
                          }
                        }}
                      >
                        Delete review
                      </button>
                    </div>
                  )}
              </div>
            ))
          )}
        </div>
      </section>

      {/* Orders - only users with orders can submit reviews for their orders */}
      <section>
        <h3 className="text-lg font-semibold mb-3">
          Your Purchases (you can review these)
        </h3>
        {orders.length === 0 ? (
          <p className="text-muted-foreground">
            You have no purchases to review yet.
          </p>
        ) : (
          <div className="space-y-4">
            {orders.map((o) => (
              <OrderReview
                key={o.id}
                order={o}
                currentUserName={currentUserName}
                onReviewed={() => setPublicReviews(getReviews())}
              />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

function OrderReview({
  order,
  onReviewed,
  currentUserName,
}: {
  order: any;
  onReviewed: () => void;
  currentUserName?: string | null;
}) {
  const [existing, setExisting] = useState<any | null>(null);
  const [rating, setRating] = useState(5);
  const [text, setText] = useState("");
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [previews, setPreviews] = useState<string[]>([]);

  useEffect(() => {
    const ex = getReviewForOrder(String(order.id));
    setExisting(ex);
    if (ex) {
      setRating(ex.rating || 5);
      setText(ex.text || "");
    }
  }, [order]);

  const filesToDataUrls = (files: File[]) => {
    return Promise.all(
      files.map(
        (f) =>
          new Promise<string>((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => resolve(String(reader.result));
            reader.onerror = (e) => reject(e);
            reader.readAsDataURL(f);
          }),
      ),
    );
  };

  const submit = async () => {
    if (existing) return;
    // require signed in user
    if (!auth?.currentUser) {
      alert("Please sign in to submit a review.");
      return;
    }

    const productId = String(
      order.productId ||
        order.productId ||
        order.productId ||
        order.productId ||
        "",
    );
    let attachments: string[] = [];
    if (selectedFiles.length > 0) {
      try {
        attachments = await filesToDataUrls(selectedFiles);
      } catch (e) {
        console.error("Failed to read files", e);
      }
    }

    const reviewBody = {
      orderId: String(order.id),
      productId,
      rating,
      text,
      attachments,
      reviewerName:
        currentUserName ||
        auth?.currentUser?.displayName ||
        auth?.currentUser?.email ||
        "",
    };

    // Persist to server (must be authenticated)
    try {
      const token = await auth.currentUser.getIdToken();
      const res = await fetch("/api/reviews", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(reviewBody),
      });
      if (!res.ok) {
        const text = await res.text();
        console.error("Server review POST failed", text);
        alert("Failed to submit review: " + text);
        return;
      }
      const json = await res.json();
      const finalReview = json;
      try {
        window.dispatchEvent(
          new CustomEvent("reviews:update", { detail: finalReview }),
        );
      } catch (_) {}
      setExisting(finalReview);
      onReviewed();
      setSelectedFiles([]);
      setPreviews([]);
      alert("Thanks for your review!");
    } catch (e) {
      console.error("Server POST /api/reviews failed", e);
      alert("Failed to submit review. Please try again.");
    }
  };

  return (
    <div className="flex items-start gap-4 border rounded-lg p-4">
      <img
        src={order.image || "/placeholder.svg?height=80&width=80"}
        className="w-20 h-20 object-contain rounded"
      />
      <div className="flex-1">
        <div className="flex items-center justify-between">
          <div>
            <div className="font-semibold">{order.title}</div>
            <div className="text-sm text-muted-foreground">
              Order ID: {order.id}
            </div>
          </div>
          <div className="text-sm text-muted-foreground">
            Purchased: {new Date(order.createdAt).toLocaleString()}
          </div>
        </div>

        {existing ? (
          <div className="mt-4">
            <div className="flex items-center gap-2">
              {Array.from({ length: 5 }).map((_, i) => (
                <svg
                  key={i}
                  className={`w-5 h-5 ${i < existing.rating ? "text-amber-400" : "text-gray-300"}`}
                  viewBox="0 0 24 24"
                  fill="currentColor"
                >
                  <path d="M12 .587l3.668 7.431L24 9.748l-6 5.847L19.335 24 12 20.201 4.665 24 6 15.595 0 9.748l8.332-1.73z" />
                </svg>
              ))}
            </div>
            <div className="mt-2 text-sm">{existing.text}</div>
            <div className="mt-2 text-sm text-muted-foreground">
              Reviewer: {existing.reviewerName || "Anonymous"}
            </div>
            <div className="mt-2 flex gap-2 mt-3">
              {(existing.attachments || []).map((a: string, i: number) => (
                <div
                  key={i}
                  className="w-24 h-24 rounded overflow-hidden border"
                >
                  {a.startsWith("data:video") ? (
                    <video
                      src={a}
                      className="w-full h-full object-cover"
                      controls
                    />
                  ) : (
                    <img src={a} className="w-full h-full object-cover" />
                  )}
                </div>
              ))}
            </div>
            <div className="mt-2 text-xs text-muted-foreground">
              Reviewed: {new Date(existing.createdAt).toLocaleString()}
            </div>
          </div>
        ) : (
          <div className="mt-4">
            <div className="flex items-center gap-2">
              {Array.from({ length: 5 }).map((_, i) => (
                <button
                  key={i}
                  onClick={() => setRating(i + 1)}
                  aria-label={`Rate ${i + 1} stars`}
                >
                  <svg
                    className={`w-6 h-6 ${i < rating ? "text-amber-400" : "text-gray-300"}`}
                    viewBox="0 0 24 24"
                    fill="currentColor"
                  >
                    <path d="M12 .587l3.668 7.431L24 9.748l-6 5.847L19.335 24 12 20.201 4.665 24 6 15.595 0 9.748l8.332-1.73z" />
                  </svg>
                </button>
              ))}
            </div>
            <textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="Write your review..."
              className="mt-2 w-full rounded border p-2"
            />
            <div className="mt-2">
              <label className="text-sm">Add photos or a short video</label>
              <input
                type="file"
                accept="image/*,video/*"
                multiple
                onChange={(e) => {
                  const files = e.target.files
                    ? Array.from(e.target.files)
                    : [];
                  setSelectedFiles(files);
                  const urls = files.map((f) => URL.createObjectURL(f));
                  setPreviews(urls);
                }}
                className="mt-2"
              />
              <div className="mt-2 flex gap-2 flex-wrap">
                {previews.map((src, i) => (
                  <div
                    key={i}
                    className="w-20 h-20 rounded overflow-hidden border"
                  >
                    {selectedFiles[i] &&
                    selectedFiles[i].type.startsWith("video") ? (
                      <video
                        src={src}
                        className="w-full h-full object-cover"
                        controls
                      />
                    ) : (
                      <img src={src} className="w-full h-full object-cover" />
                    )}
                  </div>
                ))}
              </div>
            </div>
            <div className="mt-2 flex items-center gap-2">
              <button
                onClick={submit}
                className="px-3 py-2 rounded bg-primary text-white"
              >
                Submit review
              </button>
              <button
                onClick={() => {
                  setText("");
                  setRating(5);
                  setSelectedFiles([]);
                  setPreviews([]);
                }}
                className="px-3 py-2 rounded border"
              >
                Reset
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
