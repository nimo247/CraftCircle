import express from "express";
import admin from "../firebaseAdmin";

const router = express.Router();

router.post("/verify", async (req, res) => {
  const { idToken } = req.body;
  if (!idToken) {
    return res.status(400).json({ message: "idToken is required" });
  }

  try {
    const decoded = await admin.auth().verifyIdToken(idToken);
    const user = await admin.auth().getUser(decoded.uid);
    return res.json({ decoded, user });
  } catch (err) {
    console.error("Error verifying id token:", err);
    return res.status(401).json({ message: "Invalid or expired token" });
  }
});

export default router;
