import express from "express";
import { createClient } from "@supabase/supabase-js";

const router = express.Router();

const SUPABASE_URL = process.env.SUPABASE_URL || "";
const SUPABASE_SERVICE_ROLE = process.env.SUPABASE_SERVICE_ROLE || "";
let supabaseAdmin: any = null;
if (SUPABASE_URL && SUPABASE_SERVICE_ROLE) {
  supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE, {
    auth: { persistSession: false },
  });
} else {
  console.warn("Supabase service role or URL not set. Wishlist routes will return 503.");
}

// GET /api/wishlist?user_id=...
router.get("/", async (req, res) => {
  if (!supabaseAdmin) return res.status(503).json({ message: "Supabase not configured" });
  try {
    const user_id = String(req.query.user_id || "").trim();
    if (!user_id) return res.status(400).json({ error: "user_id required" });
    const { data, error } = await supabaseAdmin
      .from("wishlist")
      .select("product_id,created_at")
      .eq("user_id", user_id)
      .order("created_at", { ascending: false });
    if (error) return res.status(500).json({ error: error.message });
    res.json(data || []);
  } catch (e: any) {
    console.error("GET /api/wishlist error", e);
    res.status(500).json({ error: String(e?.message || e) });
  }
});

// POST /api/wishlist { user_id, product_id }
router.post("/", async (req, res) => {
  try {
    const { user_id, product_id } = req.body || {};
    console.debug("POST /api/wishlist body:", req.body);
    if (!user_id || !product_id)
      return res.status(400).json({ error: "user_id and product_id required" });
    const payload = {
      user_id: String(user_id),
      product_id: String(product_id),
    };
    const { data, error } = await supabaseAdmin
      .from("wishlist")
      .insert([payload])
      .select();
    console.debug("Supabase insert result:", { data, error });
    if (error)
      return res.status(500).json({ error: error.message, details: error });
    res.status(201).json((data && data[0]) || null);
  } catch (e: any) {
    console.error("POST /api/wishlist error", e);
    res.status(500).json({ error: String(e?.message || e), details: e });
  }
});

// DELETE /api/wishlist { user_id, product_id }
router.delete("/", async (req, res) => {
  try {
    const { user_id, product_id } = req.body || {};
    console.debug("DELETE /api/wishlist body:", req.body);
    if (!user_id || !product_id)
      return res.status(400).json({ error: "user_id and product_id required" });
    const { error, data } = await supabaseAdmin
      .from("wishlist")
      .delete()
      .match({ user_id: String(user_id), product_id: String(product_id) })
      .select();
    console.debug("Supabase delete result:", { data, error });
    if (error)
      return res.status(500).json({ error: error.message, details: error });
    res.json({ deleted: true });
  } catch (e: any) {
    console.error("DELETE /api/wishlist error", e);
    res.status(500).json({ error: String(e?.message || e), details: e });
  }
});

export default router;
