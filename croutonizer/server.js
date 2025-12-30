import express from "express";
import fetch from "node-fetch";
import crypto from "crypto";

const app = express();
app.use(express.json());
const PORT = process.env.PORT || 8081;

const GRAPH_IMPORT_URL = process.env.GRAPH_IMPORT_URL || "https://graph.croutons.ai/import";
const HMAC_SECRET = process.env.PUBLISH_HMAC_KEY || "dev-secret";

// helper: HMAC sign
function signHmac(payload) {
  const sig = crypto.createHmac("sha256", HMAC_SECRET).update(payload).digest("hex");
  return `sha256=${sig}`;
}

// helper: fetch + hash + extract minimal facts
async function createCroutonFromURL(url) {
  const res = await fetch(url);
  const html = await res.text();

  // normalize: remove whitespace, strip script tags
  const canonical = html.replace(/<script[\s\S]*?<\/script>/gi, "").replace(/\s+/g, " ");
  const hash = crypto.createHash("sha256").update(canonical).digest("hex");

  // make one “fact” for now — demo structure
  return {
    crouton_id: crypto.randomUUID(),
    source_url: url,
    source_hash: hash,
    text: `Verified source: ${url}`,
    confidence: 0.99,
    verified_at: new Date().toISOString(),
    status: "verified"
  };
}

// POST /verify
// Body: { url: "https://example.com" }
app.post("/verify", async (req, res) => {
  const { url } = req.body;
  if (!url) return res.status(400).json({ error: "missing url" });

  try {
    const crouton = await createCroutonFromURL(url);
    const ndjson = JSON.stringify(crouton) + "\n";
    const sig = signHmac(ndjson);

    // send to your live graph service
    const r = await fetch(GRAPH_IMPORT_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-ndjson",
        "X-Signature": sig
      },
      body: ndjson
    });

    const j = await r.json();
    return res.json({ published: j, crouton });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: err.message });
  }
});

app.listen(PORT, () => console.log(`croutonizer running on port ${PORT}`));
