import express__default from "express";
import multer from "multer";
import { createClient } from "@supabase/supabase-js";
const router = express__default.Router();
const upload = multer({ storage: multer.memoryStorage() });
const SUPABASE_URL = process.env.SUPABASE_URL || "";
const SUPABASE_SERVICE_ROLE = process.env.SUPABASE_SERVICE_ROLE || "";
if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE) {
  console.warn("Supabase service role or URL not set. Vendor upload route will fail if used.");
}
const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE, {
  auth: { persistSession: false }
});
router.post("/apply", upload.single("document"), async (req, res) => {
  try {
    const file = req.file;
    const {
      business_name,
      contact_email,
      primary_category,
      location,
      your_story,
      sustainability_practices
    } = req.body;
    if (!file) return res.status(400).json({ message: "No file uploaded" });
    if (file.mimetype !== "application/pdf" && !file.originalname.toLowerCase().endsWith(".pdf")) {
      return res.status(400).json({ message: "Only PDF files are allowed" });
    }
    const bucket = "vendor-documents";
    const filePath = `vendor_docs/${Date.now()}_${file.originalname}`;
    const { error: uploadError } = await supabaseAdmin.storage.from(bucket).upload(filePath, file.buffer, {
      contentType: file.mimetype,
      upsert: false
    });
    if (uploadError) {
      console.error("Supabase upload error:", uploadError);
      return res.status(500).json({ message: "File upload failed", detail: uploadError });
    }
    const { data: publicData, error: publicErr } = supabaseAdmin.storage.from(bucket).getPublicUrl(filePath);
    if (publicErr) {
      console.warn("getPublicUrl error", publicErr);
    }
    const publicUrl = publicData?.publicUrl ?? null;
    const practices = typeof sustainability_practices === "string" ? sustainability_practices?.startsWith("[") ? JSON.parse(sustainability_practices) : sustainability_practices.split(",").map((s) => s.trim()) : sustainability_practices || [];
    const categoryMap = {
      home: "Home & Living",
      fashion: "Fashion & Accessories",
      art: "Art & Collectibles",
      wellness: "Wellness"
    };
    const normalizedCategory = categoryMap[primary_category] || primary_category;
    const { error: insertError } = await supabaseAdmin.from("vendors").insert([
      {
        business_name,
        contact_email,
        primary_category: normalizedCategory,
        location,
        your_story,
        sustainability_practices: practices,
        verification_document_url: publicUrl,
        status: "pending"
      }
    ]);
    if (insertError) {
      console.error("Insert error:", insertError);
      return res.status(500).json({ message: "Failed to save vendor application", detail: insertError });
    }
    return res.json({ message: "Application submitted", status: "pending" });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: "Unexpected server error" });
  }
});
export {
  router as default
};
//# sourceMappingURL=vendor-Dh9YR0ZK.js.map
