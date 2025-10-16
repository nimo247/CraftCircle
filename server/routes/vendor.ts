import express from "express";
import multer from "multer";
import { createClient } from "@supabase/supabase-js";

const router = express.Router();
const upload = multer({ storage: multer.memoryStorage() });

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
  supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    auth: { persistSession: false },
  });
  console.warn(
    "Supabase service role not set; vendor upload will be disabled (requires service role).",
  );
} else {
  console.warn(
    "Supabase URL and keys not set. Vendor upload route will return 503.",
  );
}

// POST /api/vendor/apply
// Expects multipart/form-data with fields: business_name, contact_email, primary_category, location, your_story, sustainability_practices (JSON array or comma separated), and file field 'document'
router.post("/apply", upload.single("document"), async (req, res) => {
  if (!supabaseAdmin)
    return res.status(503).json({ message: "Supabase not configured" });
  if (!supabaseIsServiceRole)
    return res
      .status(403)
      .json({ message: "Vendor uploads require Supabase service role" });
  try {
    const file = req.file as Express.Multer.File | undefined;
    const {
      business_name,
      contact_email,
      primary_category,
      location,
      your_story,
      sustainability_practices,
    } = req.body as Record<string, any>;

    if (!file) return res.status(400).json({ message: "No file uploaded" });

    // Validate PDF
    if (
      file.mimetype !== "application/pdf" &&
      !file.originalname.toLowerCase().endsWith(".pdf")
    ) {
      return res.status(400).json({ message: "Only PDF files are allowed" });
    }

    const bucket = "vendor-documents";
    const filePath = `vendor_docs/${Date.now()}_${file.originalname}`;

    // Upload using service role key
    const { error: uploadError } = await supabaseAdmin.storage
      .from(bucket)
      .upload(filePath, file.buffer, {
        contentType: file.mimetype,
        upsert: false,
      });

    if (uploadError) {
      console.error("Supabase upload error:", uploadError);
      return res
        .status(500)
        .json({ message: "File upload failed", detail: uploadError });
    }

    const { data: publicData, error: publicErr } = supabaseAdmin.storage
      .from(bucket)
      .getPublicUrl(filePath);
    if (publicErr) {
      console.warn("getPublicUrl error", publicErr);
    }
    const publicUrl = publicData?.publicUrl ?? null;

    const practices =
      typeof sustainability_practices === "string"
        ? sustainability_practices?.startsWith("[")
          ? JSON.parse(sustainability_practices)
          : sustainability_practices.split(",").map((s: string) => s.trim())
        : sustainability_practices || [];

    // Normalize primary_category to values expected by the DB
    const categoryMap: Record<string, string> = {
      home: "Home & Living",
      fashion: "Fashion & Accessories",
      art: "Art & Collectibles",
      wellness: "Wellness",
    };
    const normalizedCategory =
      categoryMap[primary_category] || primary_category;

    const { error: insertError } = await supabaseAdmin.from("vendors").insert([
      {
        business_name,
        contact_email,
        primary_category: normalizedCategory,
        location,
        your_story,
        sustainability_practices: practices,
        verification_document_url: publicUrl,
        status: "pending",
      },
    ]);

    if (insertError) {
      console.error("Insert error:", insertError);
      return res.status(500).json({
        message: "Failed to save vendor application",
        detail: insertError,
      });
    }

    return res.json({ message: "Application submitted", status: "pending" });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: "Unexpected server error" });
  }
});

export default router;
