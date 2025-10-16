import "dotenv/config";
import express from "express";
import cors from "cors";
import { handleDemo } from "./routes/demo";

import path from "path";

export function createServer() {
  const app = express();

  // Middleware
  app.use(cors());
  // Increase JSON and URL-encoded body size limits to support large bulk payloads and form submissions
  const bodyLimit = process.env.BODY_LIMIT || "10mb";
  app.use(express.json({ limit: bodyLimit }));
  app.use(express.urlencoded({ extended: true, limit: bodyLimit }));

  // Serve uploaded vendor documents locally in development
  try {
    const vendorDocsDir = path.join(process.cwd(), "public", "vendor-docs");
    app.use("/vendor-docs", express.static(vendorDocsDir));
  } catch (err) {
    console.warn("Could not set up static vendor-docs serving:", err);
  }

  // Example API routes
  app.get("/api/ping", (_req, res) => {
    const ping = process.env.PING_MESSAGE ?? "ping";
    res.json({ message: ping });
  });

  app.get("/api/demo", handleDemo);

  // Auth routes (Firebase token verification)
  import("./routes/auth")
    .then((authRoutes) => {
      app.use("/api/auth", authRoutes.default);
    })
    .catch((err) => {
      console.warn("Auth routes not loaded:", err);
    });

  // Vendor routes (Supabase server-side uploads)
  import("./routes/vendor")
    .then((vendorRoutes) => {
      app.use("/api/vendor", vendorRoutes.default);
    })
    .catch((err) => {
      console.warn("Vendor routes not loaded:", err);
    });

  // Admin routes (server-side read access using service role)
  import("./routes/admin")
    .then((adminRoutes) => {
      app.use("/api/admin", adminRoutes.default);
    })
    .catch((err) => {
      console.warn("Admin routes not loaded:", err);
    });

  // Vendor products routes (product CRUD for vendors)
  import("./routes/vendorProducts")
    .then((vendorProductRoutes) => {
      app.use("/api/vendor", vendorProductRoutes.default);
    })
    .catch((err) => {
      console.warn("Vendor products routes not loaded:", err);
    });

  // Public products routes
  import("./routes/products")
    .then((productsRoutes) => {
      app.use("/api", productsRoutes.default);
    })
    .catch((err) => {
      console.warn("Public products routes not loaded:", err);
    });

  // Public reviews routes (stores reviews server-side so everyone can view them)
  import("./routes/reviews")
    .then((reviewsRoutes) => {
      app.use("/api/reviews", reviewsRoutes.default);
    })
    .catch((err) => {
      console.warn("Reviews routes not loaded:", err);
    });

  // Shipping routes (abstracted provider)
  import("./routes/shipping")
    .then((shippingRoutes) => {
      app.use("/api/shipping", shippingRoutes.default);
    })
    .catch((err) => {
      console.warn("Shipping routes not loaded:", err);
    });

  // Server-side wishlist routes (use SUPABASE_SERVICE_ROLE)
  import("./routes/wishlist")
    .then((wishlistRoutes) => {
      app.use("/api/wishlist", wishlistRoutes.default);
    })
    .catch((err) => {
      console.warn("Wishlist routes not loaded:", err);
    });

  // Server-side orders routes (use SUPABASE_SERVICE_ROLE)
  import("./routes/orders")
    .then((ordersRoutes) => {
      app.use("/api/orders", ordersRoutes.default);
    })
    .catch((err) => {
      console.warn("Orders routes not loaded:", err);
    });

  return app;
}
