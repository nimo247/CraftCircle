import express__default from "express";
import { createClient } from "@supabase/supabase-js";
const router = express__default.Router();
const SUPABASE_URL = process.env.SUPABASE_URL || "";
const SUPABASE_SERVICE_ROLE = process.env.SUPABASE_SERVICE_ROLE || "";
const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE, {
  auth: { persistSession: false }
});
router.get("/", async (req, res) => {
  try {
    const user_id = String(req.query.user_id || "").trim();
    if (!user_id) return res.status(400).json({ error: "user_id required" });
    const { data, error } = await supabaseAdmin.from("orders").select("id, product_id, quantity, status, created_at").eq("user_id", user_id).order("created_at", { ascending: false });
    if (error) return res.status(500).json({ error: error.message });
    res.json(data || []);
  } catch (e) {
    console.error("GET /api/orders error", e);
    res.status(500).json({ error: String(e?.message || e) });
  }
});
router.post("/", async (req, res) => {
  try {
    const {
      user_id,
      product_id,
      quantity = 1,
      status = "completed"
    } = req.body || {};
    console.log("POST /api/orders body:", req.body);
    if (!user_id || !product_id)
      return res.status(400).json({ error: "user_id and product_id required" });
    const resp = await supabaseAdmin.from("orders").insert([
      {
        user_id: String(user_id),
        product_id: String(product_id),
        quantity: Number(quantity),
        status: String(status)
      }
    ]);
    console.log("supabase insert response:", resp);
    const { data, error } = resp;
    if (error) {
      console.error("Supabase insert error:", error);
      return res.status(500).json({ error: error.message || error });
    }
    res.status(201).json(data && data[0] || null);
  } catch (e) {
    console.error("POST /api/orders error", e);
    res.status(500).json({ error: String(e?.message || e) });
  }
});
router.delete("/", async (req, res) => {
  try {
    const { user_id, order_id, product_id } = req.body || {};
    if (!user_id) return res.status(400).json({ error: "user_id required" });
    if (order_id) {
      const { data, error } = await supabaseAdmin.from("orders").delete().eq("id", order_id).eq("user_id", user_id);
      if (error) return res.status(500).json({ error: error.message });
      return res.json({ deleted: data?.length || 0 });
    }
    if (product_id) {
      const { data, error } = await supabaseAdmin.from("orders").delete().eq("user_id", user_id).eq("product_id", product_id);
      if (error) return res.status(500).json({ error: error.message });
      return res.json({ deleted: data?.length || 0 });
    }
    return res.status(400).json({ error: "order_id or product_id required" });
  } catch (e) {
    console.error("DELETE /api/orders error", e);
    res.status(500).json({ error: String(e?.message || e) });
  }
});
export {
  router as default
};
//# sourceMappingURL=orders-g2OfWGcy.js.map
