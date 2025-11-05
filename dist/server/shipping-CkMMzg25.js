import express__default from "express";
import crypto from "crypto";
const router = express__default.Router();
function easyshipHeaders(key) {
  return {
    "Content-Type": "application/json",
    Authorization: `Bearer ${key}`
  };
}
function getProvider() {
  return process.env.SHIPPING_PROVIDER || (process.env.EASYSHIP_API_KEY ? "easyship" : "");
}
router.post("/estimate", async (req, res) => {
  const PROVIDER2 = getProvider();
  const EASYSHIP_BASE2 = process.env.EASYSHIP_BASE_URL;
  const EASYSHIP_KEY2 = process.env.EASYSHIP_API_KEY;
  const HARDCODE = (process.env.SHIPPING_HARDCODE || process.env.SHIPPING_HARDCODED || "").toLowerCase() === "true" || (process.env.SHIPPING_HARDCODE || "") === "1";
  const body = req.body || {};
  const { origin, destination, parcels, items } = body;
  const rawPincode = body.to_pincode || body.pincode || body.postalCode || body.postal_code;
  if (!origin && !destination && rawPincode) {
    const pc = String(rawPincode).trim();
    if (!/^\d{6}$/.test(pc)) {
      return res.status(400).json({
        error: "invalid_postal_code",
        message: "Postal code must be exactly 6 digits (0-9)"
      });
    }
  }
  if (HARDCODE) {
    let seededFare = function(seed, min = 20, max = 200) {
      try {
        const h = crypto.createHash("sha256").update(String(seed) + salt).digest();
        const v = h.readUInt32BE(0);
        const t = v / 4294967295;
        const fare = min + t * (max - min);
        return Math.round(fare * 100) / 100;
      } catch (e) {
        return Math.round((Math.random() * (max - min) + min) * 100) / 100;
      }
    };
    const srcItems = Array.isArray(items) && items.length > 0 ? items : Array.isArray(parcels) && parcels.length > 0 ? parcels.map((p, idx) => ({
      id: p.productId || p.sku || `parcel_${idx}`,
      weight: p.actual_weight || p.weight || 0.5
    })) : (
      // fallback single item
      [
        {
          id: body.productId || body.sku || "default",
          weight: Number(body.weight || 0.5)
        }
      ]
    );
    const currency = process.env.SHIPPING_CURRENCY || "INR";
    const salt = process.env.SHIPPING_HARDCODE_SALT || "";
    const rates = srcItems.map((it, idx) => {
      const idStr = String(it.id || it.sku || `item_${idx}`);
      const fare = seededFare(idStr);
      return {
        productId: idStr,
        weight: it.weight || null,
        currency,
        shipping_cost: fare,
        label: `Hardcoded seeded rate for ${idStr}`
      };
    });
    return res.json({
      generatedAt: Date.now(),
      hardcoded: true,
      seed: process.env.SHIPPING_HARDCODE_SALT || null,
      rates
    });
  }
  if (PROVIDER2 !== "easyship") {
    return res.status(501).json({ error: "no_provider", provider: PROVIDER2 || null });
  }
  if (!EASYSHIP_KEY2 || !EASYSHIP_BASE2) {
    return res.status(500).json({ error: "missing_credentials" });
  }
  let payloadOrigin = origin;
  let payloadDestination = destination;
  let payloadParcels = parcels;
  if (!payloadOrigin || !payloadDestination || !payloadParcels) {
    const to_pincode = (body.to_pincode || body.pincode || body.postalCode || body.postal_code) && String(
      body.to_pincode || body.pincode || body.postalCode || body.postal_code
    );
    const weight = Number(body.weight || body.actual_weight || 0.5) || 0.5;
    const length = Number(body.length || 10) || 10;
    const width = Number(body.width || 10) || 10;
    const height = Number(body.height || 5) || 5;
    if (to_pincode) {
      const EASYSHIP_PICKUP = process.env.EASYSHIP_PICKUP_PINCODE || process.env.SHIPPING_PICKUP_PINCODE || process.env.SHIPROCKET_PICKUP_PINCODE || process.env.SHIP_PICKUP_PINCODE || "110064";
      const pickup_country = process.env.EASYSHIP_PICKUP_COUNTRY || process.env.SHIPPING_PICKUP_COUNTRY || "IN";
      const dest_country = body.country_code || body.country || "IN";
      if (!/^\d{6}$/.test(String(to_pincode))) {
        return res.status(400).json({
          error: "invalid_postal_code",
          message: "Postal code must be exactly 6 digits (0-9)"
        });
      }
      payloadOrigin = payloadOrigin || {
        postal_code: String(EASYSHIP_PICKUP),
        country_code: pickup_country
      };
      payloadDestination = payloadDestination || {
        postal_code: to_pincode,
        country_code: dest_country
      };
      payloadParcels = payloadParcels || [
        {
          actual_weight: weight,
          length,
          width,
          height,
          items: [
            {
              description: body.item_description || "item",
              quantity: Number(body.qty || 1) || 1,
              value: Number(body.value || 0) || 0
            }
          ]
        }
      ];
    }
  }
  if (!payloadOrigin || !payloadDestination || !payloadParcels || payloadParcels.length === 0) {
    return res.status(400).json({
      error: "invalid_payload",
      message: "Provide origin/destination/parcels or to_pincode+weight"
    });
  }
  const payload = {
    origin_address: payloadOrigin,
    destination_address: payloadDestination,
    parcels: payloadParcels
  };
  try {
    try {
      console.log("EASYSHIP OUTGOING PAYLOAD:", JSON.stringify(payload));
    } catch (_) {
    }
    const resp = await fetch(
      `${EASYSHIP_BASE2.replace(/\/$/, "")}/rate/v1/rates`,
      {
        method: "POST",
        headers: easyshipHeaders(EASYSHIP_KEY2),
        body: JSON.stringify(payload)
      }
    );
    const text = await resp.text();
    try {
      console.log("EASYSHIP RESPONSE STATUS:", resp.status);
      console.log("EASYSHIP RESPONSE BODY:", text);
    } catch (_) {
    }
    try {
      const json = JSON.parse(text);
      return res.status(resp.status).json(json);
    } catch (_) {
      return res.status(resp.status).send(text);
    }
  } catch (err) {
    console.error("Easyship rate error:", err);
    return res.status(500).json({ error: String(err?.message || err) });
  }
});
router.post("/shipment", async (req, res) => {
  const PROVIDER2 = getProvider();
  const EASYSHIP_BASE2 = process.env.EASYSHIP_BASE_URL;
  const EASYSHIP_KEY2 = process.env.EASYSHIP_API_KEY;
  if (PROVIDER2 !== "easyship") {
    return res.status(501).json({ error: "no_provider", provider: PROVIDER2 || null });
  }
  if (!EASYSHIP_KEY2 || !EASYSHIP_BASE2) {
    return res.status(500).json({ error: "missing_credentials" });
  }
  const { origin, destination, parcel, courier_id, order_id } = req.body || {};
  const payload = {
    origin_address: origin,
    destination_address: destination,
    parcels: Array.isArray(parcel) ? parcel : [parcel],
    courier_selection: courier_id ? { id: courier_id } : void 0,
    platform_order_number: order_id
  };
  try {
    const resp = await fetch(
      `${EASYSHIP_BASE2.replace(/\/$/, "")}/shipment/v1/shipments`,
      {
        method: "POST",
        headers: easyshipHeaders(EASYSHIP_KEY2),
        body: JSON.stringify(payload)
      }
    );
    const data = await resp.json().catch(() => null);
    if (data !== null) return res.status(resp.status).json(data);
    const text = await resp.text();
    return res.status(resp.status).send(text);
  } catch (err) {
    console.error("Easyship create-shipment error:", err);
    return res.status(500).json({ error: String(err?.message || err) });
  }
});
router.post("/track", async (req, res) => {
  const PROVIDER2 = getProvider();
  const EASYSHIP_BASE2 = process.env.EASYSHIP_BASE_URL;
  const EASYSHIP_KEY2 = process.env.EASYSHIP_API_KEY;
  if (PROVIDER2 !== "easyship") {
    return res.status(501).json({ error: "no_provider", provider: PROVIDER2 || null });
  }
  if (!EASYSHIP_KEY2 || !EASYSHIP_BASE2) {
    return res.status(500).json({ error: "missing_credentials" });
  }
  const { shipment_id, tracking_number } = req.body || {};
  try {
    if (shipment_id) {
      const base = EASYSHIP_BASE2.replace(/\/$/, "");
      const tries = [
        `${base}/shipment/v1/shipments/${encodeURIComponent(shipment_id)}/tracking`,
        `${base}/shipment/v1/shipments/${encodeURIComponent(shipment_id)}`
      ];
      for (const url of tries) {
        const resp = await fetch(url, {
          method: "GET",
          headers: easyshipHeaders(EASYSHIP_KEY2)
        });
        const text = await resp.text();
        try {
          const json = JSON.parse(text);
          return res.status(resp.status).json(json);
        } catch (_) {
          if (resp.ok) return res.status(resp.status).send(text);
        }
      }
      return res.status(404).json({ error: "not_found" });
    }
    if (tracking_number) {
      const url = `${EASYSHIP_BASE2.replace(/\/$/, "")}/tracking/v1/trackings/${encodeURIComponent(tracking_number)}`;
      const resp = await fetch(url, {
        method: "GET",
        headers: easyshipHeaders(EASYSHIP_KEY2)
      });
      const data = await resp.json().catch(() => null);
      if (data !== null) return res.status(resp.status).json(data);
      const text = await resp.text();
      return res.status(resp.status).send(text);
    }
    return res.status(400).json({
      error: "missing_parameters",
      message: "Provide shipment_id or tracking_number in body"
    });
  } catch (err) {
    console.error("Easyship track error:", err);
    return res.status(500).json({ error: String(err?.message || err) });
  }
});
router.get("/debug", (_req, res) => {
  res.json({
    configured: Boolean(PROVIDER),
    provider: PROVIDER || null,
    easyship: { base: Boolean(EASYSHIP_BASE), key: Boolean(EASYSHIP_KEY) }
  });
});
export {
  router as default
};
//# sourceMappingURL=shipping-CkMMzg25.js.map
