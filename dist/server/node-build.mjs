import path from "path";
import { fileURLToPath } from "url";
import "dotenv/config";
import * as express from "express";
import express__default from "express";
import cors from "cors";
const handleDemo = (req, res) => {
  const response = {
    message: "Hello from Express server"
  };
  res.status(200).json(response);
};
function createServer() {
  const app2 = express__default();
  app2.use(cors());
  const bodyLimit = process.env.BODY_LIMIT || "10mb";
  app2.use(express__default.json({ limit: bodyLimit }));
  app2.use(express__default.urlencoded({ extended: true, limit: bodyLimit }));
  app2.get("/api/ping", (_req, res) => {
    const ping = process.env.PING_MESSAGE ?? "ping";
    res.json({ message: ping });
  });
  app2.get("/api/demo", handleDemo);
  import("./auth-CRzt4S5B.js").then((authRoutes) => {
    app2.use("/api/auth", authRoutes.default);
  }).catch((err) => {
    console.warn("Auth routes not loaded:", err);
  });
  import("./vendor-Dh9YR0ZK.js").then((vendorRoutes) => {
    app2.use("/api/vendor", vendorRoutes.default);
  }).catch((err) => {
    console.warn("Vendor routes not loaded:", err);
  });
  import("./admin-BdRFiXOd.js").then((adminRoutes) => {
    app2.use("/api/admin", adminRoutes.default);
  }).catch((err) => {
    console.warn("Admin routes not loaded:", err);
  });
  import("./vendorProducts-D_vxoRWk.js").then((vendorProductRoutes) => {
    app2.use("/api/vendor", vendorProductRoutes.default);
  }).catch((err) => {
    console.warn("Vendor products routes not loaded:", err);
  });
  import("./products-BNAd8aPh.js").then((productsRoutes) => {
    app2.use("/api", productsRoutes.default);
  }).catch((err) => {
    console.warn("Public products routes not loaded:", err);
  });
  import("./reviews-DNekrDuN.js").then((reviewsRoutes) => {
    app2.use("/api/reviews", reviewsRoutes.default);
  }).catch((err) => {
    console.warn("Reviews routes not loaded:", err);
  });
  import("./shipping-CkMMzg25.js").then((shippingRoutes) => {
    app2.use("/api/shipping", shippingRoutes.default);
  }).catch((err) => {
    console.warn("Shipping routes not loaded:", err);
  });
  import("./wishlist-CyzUlEdG.js").then((wishlistRoutes) => {
    app2.use("/api/wishlist", wishlistRoutes.default);
  }).catch((err) => {
    console.warn("Wishlist routes not loaded:", err);
  });
  import("./orders-g2OfWGcy.js").then((ordersRoutes) => {
    app2.use("/api/orders", ordersRoutes.default);
  }).catch((err) => {
    console.warn("Orders routes not loaded:", err);
  });
  return app2;
}
const app = createServer();
const port = process.env.PORT || 3e3;
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const distPath = path.join(__dirname, "../spa");
app.use(express.static(distPath));
app.get("*", (req, res) => {
  if (req.path.startsWith("/api/") || req.path.startsWith("/health")) {
    return res.status(404).json({ error: "API endpoint not found" });
  }
  res.sendFile(path.join(distPath, "index.html"));
});
console.log("ENV vars with placeholders:", Object.entries(process.env).filter(([, v]) => typeof v === "string" && v.includes("${")));
console.log("Registered routes:");
app._router?.stack?.forEach((layer) => {
  if (layer.route) console.log(Object.keys(layer.route.methods).join(","), layer.route.path);
});
app.listen(port, () => {
  console.log(`🚀 Fusion Starter server running on port ${port}`);
  console.log(`📱 Frontend: http://localhost:${port}`);
  console.log(`🔧 API: http://localhost:${port}/api`);
});
process.on("SIGTERM", () => {
  console.log("🛑 Received SIGTERM, shutting down gracefully");
  process.exit(0);
});
process.on("SIGINT", () => {
  console.log("🛑 Received SIGINT, shutting down gracefully");
  process.exit(0);
});
//# sourceMappingURL=node-build.mjs.map
