import admin from "firebase-admin";
import fs from "fs";
let serviceAccount = void 0;
console.log(
  "SERVER: SERVICE_ACCOUNT_JSON present =",
  !!process.env.SERVICE_ACCOUNT_JSON
);
if (process.env.SERVICE_ACCOUNT_SECRET_URL) {
  console.log("Attempting background fetch of SERVICE_ACCOUNT_SECRET_URL");
  fetch(process.env.SERVICE_ACCOUNT_SECRET_URL).then((res) => {
    if (!res.ok) {
      console.error(
        "Failed to fetch SERVICE_ACCOUNT_SECRET_URL, status:",
        res.status,
        res.statusText
      );
      return null;
    }
    return res.text();
  }).then((text) => {
    if (!text) return;
    try {
      serviceAccount = JSON.parse(text);
      console.log("SERVER: parsed SERVICE_ACCOUNT_SECRET_URL successfully");
      if (!admin.apps.length && serviceAccount) {
        try {
          admin.initializeApp({
            credential: admin.credential.cert(serviceAccount)
          });
          console.log("SERVER: firebase-admin initialized after secret fetch");
        } catch (err) {
          console.error("Failed to initialize firebase-admin after fetch:", err);
        }
      }
    } catch (err) {
      console.error("Failed to parse JSON from SERVICE_ACCOUNT_SECRET_URL response:", err);
    }
  }).catch((err) => {
    console.error("Error fetching SERVICE_ACCOUNT_SECRET_URL:", err);
  });
}
if (!serviceAccount && process.env.SERVICE_ACCOUNT_JSON_B64) {
  try {
    const decoded = Buffer.from(
      process.env.SERVICE_ACCOUNT_JSON_B64,
      "base64"
    ).toString("utf8");
    serviceAccount = JSON.parse(decoded);
    console.log("SERVER: parsed SERVICE_ACCOUNT_JSON_B64 successfully");
  } catch (err) {
    console.error("Failed to parse SERVICE_ACCOUNT_JSON_B64:", err);
  }
}
if (!serviceAccount && process.env.SERVICE_ACCOUNT_JSON) {
  const rawEnv = process.env.SERVICE_ACCOUNT_JSON;
  try {
    serviceAccount = JSON.parse(rawEnv);
  } catch (err) {
    console.error(
      "Failed to parse SERVICE_ACCOUNT_JSON, attempting recovery:",
      err
    );
    try {
      const start = rawEnv.indexOf("{");
      const end = rawEnv.lastIndexOf("}");
      if (start !== -1 && end !== -1) {
        let candidate = rawEnv.slice(start, end + 1);
        candidate = candidate.replace(
          /"private_key"\s*:\s*"([\s\S]*?)"/m,
          (m, p1) => {
            const fixed = p1.replace(/\n/g, "\\n");
            return `"private_key":"${fixed}"`;
          }
        );
        serviceAccount = JSON.parse(candidate);
      }
    } catch (err2) {
      console.error("Recovery parse of SERVICE_ACCOUNT_JSON failed:", err2);
    }
  }
}
if (!serviceAccount) {
  try {
    const raw = fs.readFileSync("./server/serviceAccountKey.json", "utf-8");
    serviceAccount = JSON.parse(raw);
  } catch (err) {
    try {
      const rawRoot = fs.readFileSync("./serviceAccountKey.json", "utf-8");
      serviceAccount = JSON.parse(rawRoot);
    } catch (err2) {
      console.warn(
        "serviceAccountKey.json not found in server/ or root and SERVICE_ACCOUNT_JSON env var not set or invalid",
        err2
      );
    }
  }
}
console.log("SERVER: serviceAccount loaded =", !!serviceAccount);
if (!admin.apps.length) {
  if (!serviceAccount) {
    console.warn(
      "No service account available for Firebase Admin initialization"
    );
  }
  try {
    admin.initializeApp({
      credential: serviceAccount ? admin.credential.cert(serviceAccount) : void 0
    });
  } catch (err) {
    console.error("Failed to initialize firebase-admin:", err);
  }
}
//# sourceMappingURL=firebaseAdmin-DwNDS1Qg.js.map
