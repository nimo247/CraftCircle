import express from "express";
import { createClient } from "@supabase/supabase-js";

const router = express.Router();

const SUPABASE_URL = process.env.SUPABASE_URL || "";
const SUPABASE_SERVICE_ROLE = process.env.SUPABASE_SERVICE_ROLE || "";
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY || "";

let supabaseAdmin: any = null;
let supabaseIsServiceRole = false;
if (SUPABASE_URL && SUPABASE_SERVICE_ROLE) {
  supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE, {
    auth: { persistSession: false },
  });
  supabaseIsServiceRole = true;
} else if (SUPABASE_URL && SUPABASE_ANON_KEY) {
  // fallback to anon key for public read-only routes
  supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    auth: { persistSession: false },
  });
  console.warn("Supabase service role not set; falling back to anon key for public reads (read-only).");
} else {
  console.warn(
    "Supabase URL and keys not set. Products route will return 503.",
  );
}

// GET /api/products - public listing of active products, search, filtering and pagination
router.get("/products", async (req, res) => {
  if (!supabaseAdmin)
    return res.status(503).json({ message: "Supabase not configured" });
  try {
    const idsRaw = req.query.ids as string | undefined;
    const q = ((req.query.q as string | undefined) || "").trim();
    const category = ((req.query.category as string | undefined) || "").trim();
    const page = Math.max(1, Number(req.query.page || 1));
    const per_page = Math.max(
      1,
      Math.min(100, Number(req.query.per_page || 20)),
    );

    // If ids provided, return those exact items (no pagination needed)
    if (idsRaw) {
      const ids = idsRaw
        .split(",")
        .map((s) => s.trim())
        .filter((s) => s && s !== "null" && s !== "undefined" && s !== "0");
      if (ids.length === 0) return res.json({ products: [] });

      const { data, error } = await supabaseAdmin
        .from("products")
        .select(
          "id, title, price, images, vendor_email, vendor_id, status, stock, low_stock_threshold, categories",
        )
        .in("id", ids);

      if (error)
        return res
          .status(500)
          .json({ message: "Failed to fetch products", detail: error });

      const toPublic = (p: any) => {
        const encodePath = (pp: string) =>
          (pp || "").split("/").map(encodeURIComponent).join("/");
        const toPublicUrl = (key: string) => {
          if (!key) return key;
          const trimmed = String(key).trim();
          if (!trimmed) return trimmed;
          if (
            /^https?:\/\//i.test(trimmed) ||
            trimmed.includes("/storage/v1/object/public/")
          )
            return trimmed;
          const base = SUPABASE_URL.replace(/\/$/, "");
          return `${base}/storage/v1/object/public/product-images/${encodePath(trimmed)}`;
        };
        const imgs = p?.images;
        let mapped: string[] | undefined = undefined;
        if (Array.isArray(imgs)) mapped = imgs.map((i) => toPublicUrl(i));
        else if (typeof imgs === "string" && imgs.trim()) {
          try {
            const parsed = JSON.parse(imgs);
            if (Array.isArray(parsed))
              mapped = parsed.map((i: any) => toPublicUrl(String(i)));
          } catch (_) {
            mapped = [toPublicUrl(imgs)];
          }
        }
        return { ...p, images: mapped || [] };
      };

      return res.json({ products: (data || []).map(toPublic) });
    }

    // Build base query for active products
    let baseQuery = supabaseAdmin
      .from("products")
      .select(
        "id, title, price, images, vendor_email, vendor_id, status, stock, low_stock_threshold, categories",
        { count: "exact" },
      )
      .order("id", { ascending: false })
      .eq("status", "active");

    // Apply category filter if provided
    if (category) {
      // Prefer array contains (for text[] columns). If categories is a string this will be ignored by the DB.
      try {
        baseQuery = baseQuery.contains("categories", [category]);
      } catch (_) {
        // fallback: no-op here; we avoid using ilike on potential text[] columns
      }
    }

    // Apply full-text like search across title and vendor_email (avoid ilike on array columns)
    if (q) {
      // use case-insensitive partial match on title and vendor_email
      baseQuery = baseQuery.or(`title.ilike.%${q}%,vendor_email.ilike.%${q}%`);
    }

    // Pagination using range
    const from = (page - 1) * per_page;
    const to = from + per_page - 1;

    const { data, count, error } = await baseQuery.range(from, to);

    if (error) {
      console.error("Failed to fetch public products:", error);
      return res
        .status(500)
        .json({ message: "Failed to fetch products", detail: error });
    }

    // Map storage keys in images to public URLs so clients can directly display thumbnails.
    const encodePath = (p: string) =>
      (p || "").split("/").map(encodeURIComponent).join("/");
    const toPublicUrl = (key: string) => {
      if (!key) return key;
      const trimmed = String(key).trim();
      if (!trimmed) return trimmed;
      if (
        /^https?:\/\//i.test(trimmed) ||
        trimmed.includes("/storage/v1/object/public/")
      )
        return trimmed;
      const base = SUPABASE_URL.replace(/\/$/, "");
      return `${base}/storage/v1/object/public/product-images/${encodePath(trimmed)}`;
    };

    const products = (data || []).map((p: any) => {
      const imgs = p?.images;
      let mapped: string[] | undefined = undefined;
      if (Array.isArray(imgs)) mapped = imgs.map((i) => toPublicUrl(i));
      else if (typeof imgs === "string" && imgs.trim()) {
        try {
          const parsed = JSON.parse(imgs);
          if (Array.isArray(parsed))
            mapped = parsed.map((i: any) => toPublicUrl(String(i)));
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

export default router;
