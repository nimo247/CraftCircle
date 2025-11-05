import express__default from "express";
import { createClient } from "@supabase/supabase-js";
import "./firebaseAdmin-DwNDS1Qg.js";
import admin from "firebase-admin";
const router = express__default.Router();
const SUPABASE_URL = process.env.SUPABASE_URL || "";
const SUPABASE_SERVICE_ROLE = process.env.SUPABASE_SERVICE_ROLE || "";
const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE, {
  auth: { persistSession: false }
});
router.get("/", async (_req, res) => {
  try {
    const { data, error } = await supabaseAdmin.from("reviews").select("*").not("user_name", "is", null).order("created_at", { ascending: false });
    if (error) return res.status(500).json({ error: error.message });
    const reviews = data || [];
    const ids = Array.from(new Set((reviews || []).map((r) => r.product_id).filter(Boolean)));
    if (ids.length === 0) return res.json(reviews);
    try {
      const { data: products } = await supabaseAdmin.from("products").select("id, title, images").in("id", ids);
      const encodePath = (p) => (p || "").split("/").map(encodeURIComponent).join("/");
      const toPublicUrl = (key) => {
        if (!key) return key;
        const trimmed = String(key).trim();
        if (!trimmed) return trimmed;
        if (/^https?:\/\//i.test(trimmed) || trimmed.includes("/storage/v1/object/public/")) return trimmed;
        const base = SUPABASE_URL.replace(/\/$/, "");
        return `${base}/storage/v1/object/public/product-images/${encodePath(trimmed)}`;
      };
      const byId = {};
      for (const p of products || []) {
        let imgs = [];
        if (Array.isArray(p.images)) imgs = p.images.map((i) => toPublicUrl(i));
        else if (typeof p.images === "string") {
          try {
            const parsed = JSON.parse(p.images);
            if (Array.isArray(parsed)) imgs = parsed.map((i) => toPublicUrl(String(i)));
            else imgs = [toPublicUrl(p.images)];
          } catch (e) {
            imgs = [toPublicUrl(p.images)];
          }
        }
        byId[String(p.id)] = { id: p.id, title: p.title, images: imgs };
      }
      const withProduct = reviews.map((r) => ({
        ...r,
        // normalize name for older clients
        reviewer_name: r.user_name || r.reviewer_name || r.reviewerName || "",
        product: byId[String(r.product_id)] || null
      }));
      const filtered = withProduct.filter((rv) => (rv.user_id || rv.external_user_id) && rv.reviewer_name);
      return res.json(filtered);
    } catch (e) {
      console.warn("Failed to fetch product metadata for reviews", e);
      return res.json(reviews);
    }
  } catch (e) {
    console.error("GET /api/reviews error", e);
    res.status(500).json({ error: String(e?.message || e) });
  }
});
router.post("/", async (req, res) => {
  try {
    const token = (req.headers.authorization || "").replace(/^Bearer\s+/i, "").trim();
    let uid = null;
    let reviewerName = "";
    if (!token) {
      return res.status(401).json({ error: "Authentication required" });
    }
    try {
      const decoded = await admin.auth().verifyIdToken(token);
      uid = decoded.uid;
      try {
        const user = await admin.auth().getUser(uid);
        reviewerName = user.displayName || user.email || "";
      } catch (e) {
        console.warn("Failed to fetch firebase user for review", e);
      }
    } catch (e) {
      console.warn("Invalid Firebase token for /api/reviews POST", e);
      return res.status(401).json({ error: "Invalid authentication token" });
    }
    const body = req.body || {};
    if (!body.productId || !body.orderId || typeof body.rating === "undefined") {
      return res.status(400).json({ error: "productId, orderId and rating required" });
    }
    const insertRow = {
      // store Firebase uid in external_user_id (text) — do NOT set user_id because the column expects a UUID
      external_user_id: uid,
      product_id: String(body.productId),
      user_name: reviewerName || body.reviewerName || "",
      rating: Number(body.rating || 0),
      comment: body.text || body.comment || ""
    };
    const resp = await supabaseAdmin.from("reviews").insert([insertRow]);
    if (resp.error) {
      console.error("Supabase insert error:", resp.error);
      return res.status(500).json({ error: resp.error.message || resp });
    }
    const inserted = resp.data && resp.data[0];
    res.status(201).json(inserted || null);
  } catch (e) {
    console.error("POST /api/reviews error", e);
    res.status(500).json({ error: String(e?.message || e) });
  }
});
export {
  router as default
};
//# sourceMappingURL=reviews-DNekrDuN.js.map
