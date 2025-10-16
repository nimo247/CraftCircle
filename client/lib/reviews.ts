export const REVIEWS_KEY = "reviews_v1";

type StoredReview = {
  id: string; // review id
  orderId: string;
  productId: string;
  rating: number; // 1-5
  text?: string;
  reviewerName?: string;
  attachments?: string[]; // data URLs for images/videos
  createdAt: string;
};

function isValid(s: string | null | undefined) {
  if (s == null) return false;
  const v = String(s).trim();
  return v.length > 0 && v !== "null" && v !== "undefined";
}

export function getReviews(): StoredReview[] {
  try {
    const raw = localStorage.getItem(REVIEWS_KEY);
    if (!raw) return [];
    const arr = JSON.parse(raw);
    if (!Array.isArray(arr)) return [];
    // Cleanup: remove any reviews without a reviewerName (anonymous) to enforce auth requirement
    const cleaned = arr
      .map((r: any) => ({
        id: String(r.id),
        orderId: String(r.orderId),
        productId: String(r.productId),
        rating: Number(r.rating || 0),
        text: r.text,
        reviewerName: r.reviewerName || "",
        attachments: Array.isArray(r.attachments) ? r.attachments.map((a: any) => String(a)) : [],
        createdAt: String(r.createdAt),
      }))
      .filter((r: StoredReview) => Boolean(r.reviewerName && r.reviewerName.trim()));

    // Persist cleaned list back to localStorage to remove anonymous entries
    try {
      localStorage.setItem(REVIEWS_KEY, JSON.stringify(cleaned));
    } catch (e) {
      // ignore write errors
    }

    return cleaned;
  } catch (e) {
    console.warn("Failed to parse reviews", e);
    return [];
  }
}

export function setReviews(items: StoredReview[]) {
  try {
    const json = JSON.stringify(
      items.map((r) => ({
        id: String(r.id),
        orderId: String(r.orderId),
        productId: String(r.productId),
        rating: Number(r.rating || 0),
        text: r.text,
        reviewerName: (r as any).reviewerName || "",
        attachments: Array.isArray((r as any).attachments)
          ? (r as any).attachments
          : [],
        createdAt: r.createdAt,
      })),
    );
    localStorage.setItem(REVIEWS_KEY, json);
    try {
      window.dispatchEvent(
        new CustomEvent("reviews:update", { detail: items }),
      );
    } catch (_) {}
  } catch (e) {
    console.error("Failed to set reviews", e);
  }
}

export function addReview(review: {
  orderId: string;
  productId: string;
  rating: number;
  text?: string;
  attachments?: string[];
  reviewerName?: string;
}) {
  if (!isValid(review.orderId) || !isValid(review.productId)) return null;
  const now = new Date();
  const id = `${review.orderId}-${now.getTime()}`;
  const r: StoredReview = {
    id,
    orderId: String(review.orderId),
    productId: String(review.productId),
    rating: Number(review.rating || 0),
    text: review.text || "",
    reviewerName: review.reviewerName || "",
    attachments: Array.isArray(review.attachments) ? review.attachments : [],
    createdAt: now.toISOString(),
  };
  const list = getReviews();
  list.unshift(r);
  setReviews(list);
  return r;
}

export function getReviewsForProduct(productId: string) {
  if (!isValid(productId)) return [];
  return getReviews().filter((r) => String(r.productId) === String(productId));
}

export function getReviewForOrder(orderId: string) {
  if (!isValid(orderId)) return null;
  return (
    getReviews().find((r) => String(r.orderId) === String(orderId)) || null
  );
}

export function removeReview(id: string) {
  if (!isValid(id)) return;
  const list = getReviews().filter((r) => r.id !== id);
  setReviews(list);
}
