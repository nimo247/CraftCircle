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
  // allow read-only access via anon key but mark not service role
  supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    auth: { persistSession: false },
  });
  console.warn("Supabase service role not set; admin routes will be limited and may return 403 for protected actions.");
} else {
  console.warn(
    "Supabase URL and keys not set. Admin routes will return 503.",
  );
}

// GET /api/admin/vendors - returns list of vendors (admin use)
router.get("/vendors", async (req, res) => {
  if (!supabaseAdmin)
    return res.status(503).json({ message: "Supabase not configured" });
  try {
    const email = req.query.email as string | undefined;
    let query = supabaseAdmin
      .from("vendors")
      .select("*")
      .order("id", { ascending: false })
      .limit(200);
    if (email) {
      query = supabaseAdmin
        .from("vendors")
        .select("*")
        .eq("contact_email", email)
        .limit(1);
    }
    const { data, error } = await query;
    if (error) {
      console.error("Supabase fetch error:", error);
      return res
        .status(500)
        .json({ message: "Failed to fetch vendors", detail: error });
    }
    return res.json({ vendors: data });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: "Unexpected server error" });
  }
});

// POST /api/admin/vendors/verify - check vendor status by email
router.post("/vendors/verify", async (req, res) => {
  if (!supabaseAdmin)
    return res.status(503).json({ message: "Supabase not configured" });
  try {
    const { email } = req.body as { email?: string };
    if (!email) return res.status(400).json({ message: "email is required" });
    const { data, error } = await supabaseAdmin
      .from("vendors")
      .select("*")
      .eq("contact_email", email)
      .limit(1);
    if (error) {
      console.error("Supabase fetch error:", error);
      return res
        .status(500)
        .json({ message: "Failed to fetch vendor", detail: error });
    }
    const vendor = data && data.length > 0 ? data[0] : null;
    return res.json({ vendor });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: "Unexpected server error" });
  }
});

// PATCH /api/admin/vendors/:id - update vendor status
router.patch("/vendors/:id", async (req, res) => {
  if (!supabaseAdmin)
    return res.status(503).json({ message: "Supabase not configured" });
  try {
    const id = req.params.id;
    console.log("ADMIN PATCH /vendors/:id called", { id, method: req.method });
    console.log("Headers:", req.headers);
    console.log("Query:", req.query);
    console.log("Raw body type:", typeof req.body);
    console.log("Body (truncated):", JSON.stringify(req.body).slice(0, 2000));

    // Support status from multiple sources and handle stringified bodies (some proxies send raw JSON strings)
    let status: any = undefined;
    // If body is a raw JSON string, try parsing
    if (typeof req.body === "string") {
      try {
        const parsed = JSON.parse(req.body);
        status = parsed?.status;
      } catch (e) {
        // ignore parse error
      }
    }
    // Then check common places
    status =
      status ||
      (req.body && (req.body.status as any)) ||
      (req.query && (req.query.status as any)) ||
      (req.headers["x-status"] as any);
    if (typeof status === "string") status = status.trim();
    if (!status) {
      console.warn("Missing status on request", { id });
      return res
        .status(400)
        .json({
          message: "status is required",
          debug: { headers: req.headers, query: req.query, body: req.body },
        });
    }
    const { data, error } = await supabaseAdmin
      .from("vendors")
      .update({ status })
      .eq("id", id)
      .select();
    if (error) {
      console.error("Supabase update error:", error);
      return res
        .status(500)
        .json({ message: "Failed to update vendor", detail: error });
    }
    return res.json({ vendor: data && data[0] });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: "Unexpected server error" });
  }
});

// DELETE /api/admin/reviews/:id - delete review by id (admin only)
router.delete("/reviews/:id", async (req, res) => {
  if (!supabaseAdmin)
    return res.status(503).json({ message: "Supabase not configured" });
  try {
    const id = req.params.id;
    if (!id) return res.status(400).json({ message: "id is required" });

    // Admin key check
    const ADMIN_KEY = process.env.ADMIN_KEY || "NLRM1103";
    const provided = (req.headers["x-admin-key"] as string) || "";
    if (!provided || provided !== ADMIN_KEY) {
      return res.status(403).json({ message: "Forbidden" });
    }

    const { data, error } = await supabaseAdmin
      .from("reviews")
      .delete()
      .eq("id", id)
      .select();
    if (error) {
      console.error("Supabase delete error:", error);
      return res
        .status(500)
        .json({ message: "Failed to delete review", detail: error });
    }
    return res.json({ deleted: data && data[0] ? data[0] : null });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: "Unexpected server error" });
  }
});

// POST /api/admin/reviews/delete - bulk delete reviews by id (admin only)
router.post("/reviews/delete", async (req, res) => {
  if (!supabaseAdmin)
    return res.status(503).json({ message: "Supabase not configured" });
  try {
    const ids = (req.body && req.body.ids) || [];
    if (!Array.isArray(ids) || ids.length === 0)
      return res.status(400).json({ message: "ids array required" });

    const ADMIN_KEY = process.env.ADMIN_KEY || "NLRM1103";
    const provided = (req.headers["x-admin-key"] as string) || "";
    if (!provided || provided !== ADMIN_KEY) {
      return res.status(403).json({ message: "Forbidden" });
    }

    const { data, error } = await supabaseAdmin
      .from("reviews")
      .delete()
      .in("id", ids)
      .select();
    if (error) {
      console.error("Supabase bulk delete error:", error);
      return res
        .status(500)
        .json({ message: "Failed to bulk delete reviews", detail: error });
    }

    return res.json({ deleted: data || [] });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: "Unexpected server error" });
  }
});

// POST /api/admin/vendors/:id/approve - set vendor status to approved
router.post("/vendors/:id/approve", async (req, res) => {
  if (!supabaseAdmin)
    return res.status(503).json({ message: "Supabase not configured" });
  try {
    const id = req.params.id;
    console.log("ADMIN POST approve called", {
      id,
      headers: req.headers,
      query: req.query,
    });
    if (!id) return res.status(400).json({ message: "id is required" });
    const { data, error } = await supabaseAdmin
      .from("vendors")
      .update({ status: "approved" })
      .eq("id", id)
      .select();
    if (error) {
      console.error("Supabase update error (approve):", error);
      return res
        .status(500)
        .json({ message: "Failed to approve vendor", detail: error });
    }
    return res.json({ vendor: data && data[0] });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: "Unexpected server error" });
  }
});

// POST /api/admin/vendors/:id/reject - set vendor status to rejected
router.post("/vendors/:id/reject", async (req, res) => {
  if (!supabaseAdmin)
    return res.status(503).json({ message: "Supabase not configured" });
  try {
    const id = req.params.id;
    console.log("ADMIN POST reject called", {
      id,
      headers: req.headers,
      query: req.query,
    });
    if (!id) return res.status(400).json({ message: "id is required" });
    const { data, error } = await supabaseAdmin
      .from("vendors")
      .update({ status: "rejected" })
      .eq("id", id)
      .select();
    if (error) {
      console.error("Supabase update error (reject):", error);
      return res
        .status(500)
        .json({ message: "Failed to reject vendor", detail: error });
    }
    return res.json({ vendor: data && data[0] });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: "Unexpected server error" });
  }
});

export default router;
