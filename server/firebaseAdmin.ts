import admin from "firebase-admin";
import fs from "fs";

let serviceAccount: any = undefined;
console.log(
  "SERVER: SERVICE_ACCOUNT_JSON present =",
  !!process.env.SERVICE_ACCOUNT_JSON,
);

// If a URL is provided that returns the service account JSON, fetch it at runtime
// This allows keeping only a short URL in environment variables (avoids Lambda 4KB limit)
if (process.env.SERVICE_ACCOUNT_SECRET_URL) {
  try {
    console.log("Fetching service account from SERVICE_ACCOUNT_SECRET_URL");
    const res = await fetch(process.env.SERVICE_ACCOUNT_SECRET_URL);
    if (res.ok) {
      const text = await res.text();
      try {
        serviceAccount = JSON.parse(text);
        console.log("SERVER: parsed SERVICE_ACCOUNT_SECRET_URL successfully");
      } catch (err) {
        console.error("Failed to parse JSON from SERVICE_ACCOUNT_SECRET_URL response:", err);
      }
    } else {
      console.error(
        "Failed to fetch SERVICE_ACCOUNT_SECRET_URL, status:",
        res.status,
        res.statusText,
      );
    }
  } catch (err) {
    console.error("Error fetching SERVICE_ACCOUNT_SECRET_URL:", err);
  }
}

// Support base64-encoded service account JSON for safer env transport
if (!serviceAccount && process.env.SERVICE_ACCOUNT_JSON_B64) {
  try {
    const decoded = Buffer.from(
      process.env.SERVICE_ACCOUNT_JSON_B64,
      "base64",
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
      err,
    );
    try {
      // Try to extract JSON substring between first { and last }
      const start = rawEnv.indexOf("{");
      const end = rawEnv.lastIndexOf("}");
      if (start !== -1 && end !== -1) {
        let candidate = rawEnv.slice(start, end + 1);
        // If private_key contains actual newlines, replace them with \n so JSON is valid
        candidate = candidate.replace(
          /"private_key"\s*:\s*"([\s\S]*?)"/m,
          (m, p1) => {
            const fixed = p1.replace(/\n/g, "\\n");
            return `"private_key":"${fixed}"`;
          },
        );
        serviceAccount = JSON.parse(candidate);
      }
    } catch (err2) {
      console.error("Recovery parse of SERVICE_ACCOUNT_JSON failed:", err2);
    }
  }
}

// If SERVICE_ACCOUNT_JSON parse failed or wasn't provided, try server/serviceAccountKey.json then root serviceAccountKey.json
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
        err2,
      );
    }
  }
}

console.log("SERVER: serviceAccount loaded =", !!serviceAccount);

if (!admin.apps.length) {
  if (!serviceAccount) {
    console.warn(
      "No service account available for Firebase Admin initialization",
    );
  }

  try {
    admin.initializeApp({
      credential: serviceAccount ? admin.credential.cert(serviceAccount as any) : undefined,
    });
  } catch (err) {
    console.error("Failed to initialize firebase-admin:", err);
  }
}

export default admin;
