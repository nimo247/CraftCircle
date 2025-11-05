import express__default from "express";
import { createClient } from "@supabase/supabase-js";
const router = express__default.Router();
const SUPABASE_URL = process.env.SUPABASE_URL || "";
const SUPABASE_SERVICE_ROLE = process.env.SUPABASE_SERVICE_ROLE || "";
if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE) {
  console.warn("Supabase service role or URL not set. Admin vendor list route will fail if used.");
}
const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE, {
  auth: { persistSession: false }
});
router.get("/vendors", async (req, res) => {
  try {
    const email = req.query.email;
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
router.post("/vendors/verify", async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) return res.status(400).json({ message: "email is required" });
    const { data, error } = await supabaseAdmin.from("vendors").select("*").eq("contact_email", email).limit(1);
    if (error) {
      console.error("Supabase fetch error:", error);
      return res.status(500).json({ message: "Failed to fetch vendor", detail: error });
    }
    const vendor = data && data.length > 0 ? data[0] : null;
    return res.json({ vendor });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: "Unexpected server error" });
  }
});
router.patch("/vendors/:id", async (req, res) => {
  try {
    const id = req.params.id;
    console.log("ADMIN PATCH /vendors/:id called", { id, method: req.method });
    console.log("Headers:", req.headers);
    console.log("Query:", req.query);
    console.log("Raw body type:", typeof req.body);
    console.log("Body (truncated):", JSON.stringify(req.body).slice(0, 2e3));
    let status = void 0;
    if (typeof req.body === "string") {
      try {
        const parsed = JSON.parse(req.body);
        status = parsed?.status;
      } catch (e) {
      }
    }
    status = status || req.body && req.body.status || req.query && req.query.status || req.headers["x-status"];
    if (typeof status === "string") status = status.trim();
    if (!status) {
      console.warn("Missing status on request", { id });
      return res.status(400).json({ message: "status is required", debug: { headers: req.headers, query: req.query, body: req.body } });
    }
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
router.delete("/reviews/:id", async (req, res) => {
  try {
    const id = req.params.id;
    if (!id) return res.status(400).json({ message: "id is required" });
    const ADMIN_KEY = process.env.ADMIN_KEY || "NLRM1103";
    const provided = req.headers["x-admin-key"] || "";
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
router.post("/reviews/delete", async (req, res) => {
  try {
    const ids = req.body && req.body.ids || [];
    if (!Array.isArray(ids) || ids.length === 0) return res.status(400).json({ message: "ids array required" });
    const ADMIN_KEY = process.env.ADMIN_KEY || "NLRM1103";
    const provided = req.headers["x-admin-key"] || "";
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
router.post("/vendors/:id/approve", async (req, res) => {
  try {
    const id = req.params.id;
    console.log("ADMIN POST approve called", { id, headers: req.headers, query: req.query });
    if (!id) return res.status(400).json({ message: "id is required" });
    const { data, error } = await supabaseAdmin.from("vendors").update({ status: "approved" }).eq("id", id).select();
    if (error) {
      console.error("Supabase update error (approve):", error);
      return res.status(500).json({ message: "Failed to approve vendor", detail: error });
    }
    return res.json({ vendor: data && data[0] });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: "Unexpected server error" });
  }
});
router.post("/vendors/:id/reject", async (req, res) => {
  try {
    const id = req.params.id;
    console.log("ADMIN POST reject called", { id, headers: req.headers, query: req.query });
    if (!id) return res.status(400).json({ message: "id is required" });
    const { data, error } = await supabaseAdmin.from("vendors").update({ status: "rejected" }).eq("id", id).select();
    if (error) {
      console.error("Supabase update error (reject):", error);
      return res.status(500).json({ message: "Failed to reject vendor", detail: error });
    }
    return res.json({ vendor: data && data[0] });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: "Unexpected server error" });
  }
});
export {
  router as default
};
//# sourceMappingURL=admin-BdRFiXOd.js.map
