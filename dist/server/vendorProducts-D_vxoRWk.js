import express__default from "express";
import multer from "multer";
import { createClient } from "@supabase/supabase-js";
const router = express__default.Router();
const maxFileSize = Number(process.env.UPLOAD_MAX_FILE_SIZE || 5 * 1024 * 1024);
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: maxFileSize } });
const SUPABASE_URL = process.env.SUPABASE_URL || "";
const SUPABASE_SERVICE_ROLE = process.env.SUPABASE_SERVICE_ROLE || "";
if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE) {
  console.warn(
    "Supabase service role or URL not set. Vendor products route will fail if used."
  );
}
const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE, {
  auth: { persistSession: false }
});
router.get("/products", async (req, res) => {
  try {
    const email = req.query.email;
    let query = supabaseAdmin.from("products").select("*").order("id", { ascending: false }).limit(100);
    if (email) {
      query = supabaseAdmin.from("products").select("*").eq("vendor_email", email).order("id", { ascending: false });
    }
    const { data, error } = await query;
    if (error) {
      console.error("Supabase fetch error:", error);
      return res.status(500).json({ message: "Failed to fetch products", detail: error });
    }
    return res.json({ products: data });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: "Unexpected server error" });
  }
});
router.post(
  "/products/upload-image",
  upload.array("images"),
  async (req, res) => {
    try {
      const files = req.files;
      const vendor_email = req.body.vendor_email;
      if (!files || files.length === 0) {
        return res.status(400).json({ message: "No files uploaded" });
      }
      const bucket = "product-images";
      const urls = [];
      const vendorFolder = vendor_email ? `${vendor_email.replace(/[^a-z0-9-_\.]/gi, "_")}` : "anonymous";
      for (const file of files) {
        const filePath = `${vendorFolder}/${Date.now()}_${file.originalname}`;
        const { error: uploadError } = await supabaseAdmin.storage.from(bucket).upload(filePath, file.buffer, {
          contentType: file.mimetype,
          upsert: false
        });
        if (uploadError) {
          console.error("Upload error:", uploadError);
          continue;
        }
        const { data: publicData, error: publicErr } = supabaseAdmin.storage.from(bucket).getPublicUrl(filePath);
        if (publicErr) {
          console.warn("getPublicUrl error", publicErr);
        }
        const publicUrl = publicData?.publicUrl ?? null;
        if (publicUrl) urls.push(publicUrl);
      }
      return res.json({ urls });
    } catch (err) {
      console.error(err);
      return res.status(500).json({ message: "Upload failed" });
    }
  }
);
router.post("/products", async (req, res) => {
  try {
    const {
      vendor_email,
      vendor_id,
      title,
      description,
      price,
      stock,
      status,
      images,
      categories,
      tags,
      low_stock_threshold
    } = req.body;
    if (!vendor_email && !vendor_id || !title)
      return res.status(400).json({ message: "vendor_email/vendor_id and title are required" });
    const normalizeArrayField = (v) => {
      if (v == null) return null;
      if (Array.isArray(v)) return v.filter(Boolean);
      if (typeof v === "string") return v.split(",").map((s) => s.trim()).filter(Boolean);
      return null;
    };
    const payload = {
      // store whichever vendor identifier the client provided; keep both null if not provided
      vendor_email: vendor_email || null,
      vendor_id: vendor_id || null,
      title,
      description: description || null,
      price: price != null ? Number(price) : 0,
      stock: stock != null ? Number(stock) : 0,
      // default new vendor-submitted products to pending for review unless explicitly set
      status: status || "pending",
      images: images || null,
      categories: normalizeArrayField(categories),
      tags: normalizeArrayField(tags),
      low_stock_threshold: low_stock_threshold != null ? Number(low_stock_threshold) : null,
      created_at: (/* @__PURE__ */ new Date()).toISOString()
    };
    const { data, error } = await supabaseAdmin.from("products").insert([payload]).select();
    if (error) {
      console.error("Insert error:", error);
      return res.status(500).json({ message: "Failed to create product", detail: error });
    }
    return res.json({ product: data && data[0] });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: "Unexpected server error", detail: err?.message });
  }
});
router.post("/products/bulk", async (req, res) => {
  try {
    const { vendor_email, products } = req.body;
    if (!vendor_email || !Array.isArray(products))
      return res.status(400).json({ message: "vendor_email and products array required" });
    const payloads = products.map((p) => ({
      vendor_email,
      title: p.title,
      description: p.description || null,
      price: p.price ?? 0,
      stock: p.stock ?? 0,
      status: p.status || "draft",
      images: p.images || null,
      categories: p.categories || null,
      tags: p.tags || null,
      low_stock_threshold: p.low_stock_threshold ?? null,
      created_at: (/* @__PURE__ */ new Date()).toISOString()
    }));
    const { data, error } = await supabaseAdmin.from("products").insert(payloads).select();
    if (error) {
      console.error("Bulk insert error:", error);
      return res.status(500).json({ message: "Failed to insert products", detail: error });
    }
    return res.json({ products: data });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: "Unexpected server error" });
  }
});
router.patch("/products/:id", async (req, res) => {
  try {
    const id = req.params.id;
    const updates = req.body;
    const { data, error } = await supabaseAdmin.from("products").update(updates).eq("id", id).select();
    if (error) {
      console.error("Update error:", error);
      return res.status(500).json({ message: "Failed to update product", detail: error });
    }
    return res.json({ product: data && data[0] });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: "Unexpected server error" });
  }
});
router.delete("/products/:id", async (req, res) => {
  try {
    const id = req.params.id;
    const { error } = await supabaseAdmin.from("products").delete().eq("id", id);
    if (error) {
      console.error("Delete error:", error);
      return res.status(500).json({ message: "Failed to delete product", detail: error });
    }
    return res.json({ success: true });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: "Unexpected server error" });
  }
});
export {
  router as default
};
//# sourceMappingURL=vendorProducts-D_vxoRWk.js.map
