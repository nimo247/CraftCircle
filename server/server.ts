import express from "express";
import adminRoutes from "./routes/admin"; // adjust path if needed

export function createServer() {
  const app = express();
  app.use(express.json());

  // Mount admin routes
  app.use("/api/admin", adminRoutes);

  return app;
}
