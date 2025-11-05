import express__default from "express";
import { createClient } from "@supabase/supabase-js";
const router = express__default.Router();
const SUPABASE_URL = process.env.SUPABASE_URL || "";
const SUPABASE_SERVICE_ROLE = process.env.SUPABASE_SERVICE_ROLE || "";
const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE, {
  auth: { persistSession: false }
});
router.get("/products", async (req, res) => {
  try {
    const idsRaw = req.query.ids;
    const q = (req.query.q || "").trim();
    const category = (req.query.category || "").trim();
    const page = Math.max(1, Number(req.query.page || 1));
    const per_page = Math.max(
      1,
      Math.min(100, Number(req.query.per_page || 20))
    );
    if (idsRaw) {
      const ids = idsRaw.split(",").map((s) => s.trim()).filter((s) => s && s !== "null" && s !== "undefined" && s !== "0");
      if (ids.length === 0) return res.json({ products: [] });
      const { data: data2, error: error2 } = await supabaseAdmin.from("products").select(
        "id, title, price, images, vendor_email, vendor_id, status, stock, low_stock_threshold, categories"
      ).in("id", ids);
      if (error2)
        return res.status(500).json({ message: "Failed to fetch products", detail: error2 });
      const toPublic = (p) => {
        const encodePath2 = (pp) => (pp || "").split("/").map(encodeURIComponent).join("/");
        const toPublicUrl2 = (key) => {
          if (!key) return key;
          const trimmed = String(key).trim();
          if (!trimmed) return trimmed;
          if (/^https?:\/\//i.test(trimmed) || trimmed.includes("/storage/v1/object/public/"))
            return trimmed;
          const base = SUPABASE_URL.replace(/\/$/, "");
          return `${base}/storage/v1/object/public/product-images/${encodePath2(trimmed)}`;
        };
        const imgs = p?.images;
        let mapped = void 0;
        if (Array.isArray(imgs)) mapped = imgs.map((i) => toPublicUrl2(i));
        else if (typeof imgs === "string" && imgs.trim()) {
          try {
            const parsed = JSON.parse(imgs);
            if (Array.isArray(parsed))
              mapped = parsed.map((i) => toPublicUrl2(String(i)));
          } catch (_) {
            mapped = [toPublicUrl2(imgs)];
          }
        }
        return { ...p, images: mapped || [] };
      };
      return res.json({ products: (data2 || []).map(toPublic) });
    }
    let baseQuery = supabaseAdmin.from("products").select(
      "id, title, price, images, vendor_email, vendor_id, status, stock, low_stock_threshold, categories",
      { count: "exact" }
    ).order("id", { ascending: false }).eq("status", "active");
    if (category) {
      try {
        baseQuery = baseQuery.contains("categories", [category]);
      } catch (_) {
      }
    }
    if (q) {
      baseQuery = baseQuery.or(`title.ilike.%${q}%,vendor_email.ilike.%${q}%`);
    }
    const from = (page - 1) * per_page;
    const to = from + per_page - 1;
    const { data, count, error } = await baseQuery.range(from, to);
    if (error) {
      console.error("Failed to fetch public products:", error);
      return res.status(500).json({ message: "Failed to fetch products", detail: error });
    }
    const encodePath = (p) => (p || "").split("/").map(encodeURIComponent).join("/");
    const toPublicUrl = (key) => {
      if (!key) return key;
      const trimmed = String(key).trim();
      if (!trimmed) return trimmed;
      if (/^https?:\/\//i.test(trimmed) || trimmed.includes("/storage/v1/object/public/"))
        return trimmed;
      const base = SUPABASE_URL.replace(/\/$/, "");
      return `${base}/storage/v1/object/public/product-images/${encodePath(trimmed)}`;
    };
    const products = (data || []).map((p) => {
      const imgs = p?.images;
      let mapped = void 0;
      if (Array.isArray(imgs)) mapped = imgs.map((i) => toPublicUrl(i));
      else if (typeof imgs === "string" && imgs.trim()) {
        try {
          const parsed = JSON.parse(imgs);
          if (Array.isArray(parsed))
            mapped = parsed.map((i) => toPublicUrl(String(i)));
        } catch (e) {
          mapped = [toPublicUrl(imgs)];
        }
      }
      return { ...p, images: mapped || [] };
    });
    const total = typeof count === "number" ? count : products.length + from;
    return res.json({ products, total, page, per_page });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: "Unexpected server error" });
  }
});
export {
  router as default
};
//# sourceMappingURL=products-BNAd8aPh.js.map
