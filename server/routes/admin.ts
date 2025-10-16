import express from "express";
import { createClient } from "@supabase/supabase-js";

const router = express.Router();

const SUPABASE_URL = process.env.SUPABASE_URL || "";
const SUPABASE_SERVICE_ROLE = process.env.SUPABASE_SERVICE_ROLE || "";

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE) {
  console.warn("Supabase service role or URL not set. Admin vendor list route will fail if used.");
}

const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE, {
  auth: { persistSession: false },
});

// GET /api/admin/vendors - returns list of vendors (admin use)
router.get("/vendors", async (req, res) => {
  try {
    const email = req.query.email as string | undefined;
    let query = supabaseAdmin.from("vendors").select("*").order("id", { ascending: false }).limit(200);
    if (email) {
      query = supabaseAdmin.from("vendors").select("*").eq("contact_email", email).limit(1);
    }
    const { data, error } = await query;
    if (error) {
      console.error("Supabase fetch error:", error);
      return res.status(500).json({ message: "Failed to fetch vendors", detail: error });
    }
    return res.json({ vendors: data });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: "Unexpected server error" });
  }
});

// POST /api/admin/vendors/verify - check vendor status by email
router.post("/vendors/verify", async (req, res) => {
  try {
    const { email } = req.body as { email?: string };
    if (!email) return res.status(400).json({ message: "email is required" });
    const { data, error } = await supabaseAdmin.from("vendors").select("*").eq("contact_email", email).limit(1);
    if (error) {
      console.error("Supabase fetch error:", error);
      return res.status(500).json({ message: "Failed to fetch vendor", detail: error });
    }
    const vendor = (data && data.length > 0) ? data[0] : null;
    return res.json({ vendor });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: "Unexpected server error" });
  }
});

// PATCH /api/admin/vendors/:id - update vendor status
router.patch("/vendors/:id", async (req, res) => {
  try {
    const id = req.params.id;
    // Support status in JSON body, query param, or x-status header to be robust against proxies
    let status = (req.body && (req.body.status as string)) || (req.query && (req.query.status as string)) || (req.headers['x-status'] as string);
    if (typeof status === 'string') status = status.trim();
    if (!status) return res.status(400).json({ message: "status is required" });
    const { data, error } = await supabaseAdmin.from("vendors").update({ status }).eq("id", id).select();
    if (error) {
      console.error("Supabase update error:", error);
      return res.status(500).json({ message: "Failed to update vendor", detail: error });
    }
    return res.json({ vendor: data && data[0] });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: "Unexpected server error" });
  }
});

// DELETE /api/admin/reviews/:id - delete review by id (admin only)
router.delete("/reviews/:id", async (req, res) => {
  try {
    const id = req.params.id;
    if (!id) return res.status(400).json({ message: "id is required" });

    // Admin key check
    const ADMIN_KEY = process.env.ADMIN_KEY || "NLRM1103";
    const provided = (req.headers["x-admin-key"] as string) || "";
    if (!provided || provided !== ADMIN_KEY) {
      return res.status(403).json({ message: "Forbidden" });
    }

    const { data, error } = await supabaseAdmin.from("reviews").delete().eq("id", id).select();
    if (error) {
      console.error("Supabase delete error:", error);
      return res.status(500).json({ message: "Failed to delete review", detail: error });
    }
    return res.json({ deleted: data && data[0] ? data[0] : null });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: "Unexpected server error" });
  }
});

// POST /api/admin/reviews/delete - bulk delete reviews by id (admin only)
router.post("/reviews/delete", async (req, res) => {
  try {
    const ids = (req.body && req.body.ids) || [];
    if (!Array.isArray(ids) || ids.length === 0) return res.status(400).json({ message: "ids array required" });

    const ADMIN_KEY = process.env.ADMIN_KEY || "NLRM1103";
    const provided = (req.headers["x-admin-key"] as string) || "";
    if (!provided || provided !== ADMIN_KEY) {
      return res.status(403).json({ message: "Forbidden" });
    }

    const { data, error } = await supabaseAdmin.from("reviews").delete().in("id", ids).select();
    if (error) {
      console.error("Supabase bulk delete error:", error);
      return res.status(500).json({ message: "Failed to bulk delete reviews", detail: error });
    }

    return res.json({ deleted: data || [] });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: "Unexpected server error" });
  }
});

export default router;
