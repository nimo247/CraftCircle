import express__default from "express";
import "./firebaseAdmin-DwNDS1Qg.js";
import admin from "firebase-admin";
const router = express__default.Router();
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
export {
  router as default
};
//# sourceMappingURL=auth-CRzt4S5B.js.map
