// server.js
import express from "express";
import cors from "cors";
import path from "path";
import { fileURLToPath } from "url";
import { insertJob, getJob, getJobEvents, pool, getCrouton, getAllCroutons, getCroutonWithSourceTracking, upsertSourceParticipation, getSourceDomainStats } from "./src/db.js";
import { enqueueJob } from "./src/redis.js";
import { initiateVerification, checkVerification, requireVerifiedDomain } from "./src/routes/verify.js";
import { ingestUrl } from "./src/routes/ingest.js";
import { renderMarkdown } from "./src/routes/render.js";

const app = express();

// Simple in-memory rate limiter (per IP)
const rateLimitStore = new Map();
const RATE_LIMIT_WINDOW = 60000; // 1 minute
const RATE_LIMIT_MAX = 60; // 60 requests per minute

function rateLimit(req, res, next) {
  // Exempt .md endpoints and feeds from rate limiting for AI agents
  if (req.path.endsWith('.md') || req.path.startsWith('/feeds/')) {
    return next();
  }

  const ip = req.ip || req.connection.remoteAddress;
  const now = Date.now();
  
  if (!rateLimitStore.has(ip)) {
    rateLimitStore.set(ip, { count: 1, resetAt: now + RATE_LIMIT_WINDOW });
    return next();
  }

  const record = rateLimitStore.get(ip);
  
  if (now > record.resetAt) {
    record.count = 1;
    record.resetAt = now + RATE_LIMIT_WINDOW;
    return next();
  }

  if (record.count >= RATE_LIMIT_MAX) {
    return res.status(429).json({
      ok: false,
      error: "Rate limit exceeded",
      retryAfter: Math.ceil((record.resetAt - now) / 1000),
    });
  }

  record.count++;
  next();
}

// Cleanup old rate limit entries periodically
setInterval(() => {
  const now = Date.now();
  for (const [ip, record] of rateLimitStore.entries()) {
    if (now > record.resetAt) {
      rateLimitStore.delete(ip);
    }
  }
}, RATE_LIMIT_WINDOW * 2);

// CORS: restrict in production, permissive in dev
const corsOptions = process.env.NODE_ENV === "production"
  ? {
      origin: process.env.CORS_ORIGIN
        ? process.env.CORS_ORIGIN.split(",")
        : ["https://precogs.croutons.ai"],
      credentials: true,
    }
  : { origin: true, credentials: true };
app.use(cors(corsOptions));
app.use(express.json({ limit: "1mb" }));

// Verification routes
app.post('/v1/verify/initiate', initiateVerification);
app.post('/v1/verify/check', checkVerification);

// Ingestion routes (require verified domain)
app.post('/v1/ingest', requireVerifiedDomain, ingestUrl);

// Render routes (internal, no auth)
app.post('/v1/render', renderMarkdown);

// Bearer token authentication middleware (optional, enabled via API_KEY env var)
function requireAuth(req, res, next) {
  const apiKey = process.env.API_KEY;
  if (!apiKey) {
    // No API key set, skip auth
    return next();
  }

  const authHeader = req.get("Authorization");
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({ ok: false, error: "Authorization required" });
  }

  const token = authHeader.slice(7);
  if (token !== apiKey) {
    return res.status(403).json({ ok: false, error: "Invalid token" });
  }

  next();
}

app.get("/health", (_req, res) => res.json({ ok: true, ts: new Date().toISOString() }));

// Optional Redis test endpoint
app.get("/health/redis", async (_req, res) => {
  try {
    if (!process.env.REDIS_URL) {
      return res.json({ ok: false, error: "REDIS_URL not set" });
    }
    const { testRedis } = await import("./src/redis.js");
    const result = await testRedis();
    res.json({ ok: result, redis: process.env.REDIS_URL ? "configured" : "not configured" });
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message });
  }
});

// Logging function for AI crawler monitoring
function logRequest(req, responseType) {
  console.log("[croutons]", {
    timestamp: new Date().toISOString(),
    path: req.path,
    method: req.method,
    accept: req.get("Accept"),
    userAgent: req.get("User-Agent"),
    responseType,
    ip: req.ip || req.connection.remoteAddress
  });
}

// Markdown serializer function with source tracking
function serializeCroutonToMarkdown(crouton) {
  const frontmatter = [
    '---',
    `id: ${crouton.id}`,
    crouton.confidence ? `confidence: ${crouton.confidence}` : '',
    crouton.sources && crouton.sources.length > 0 ? `sources:\n${crouton.sources.map(s => `  - ${s}`).join('\n')}` : '',
    `updated: ${crouton.updated_at}`
  ];

  // Add source tracking metadata if available
  if (crouton.source_tracking && crouton.source_tracking.length > 0) {
    const primarySource = crouton.source_tracking[0]; // Use first source as primary
    frontmatter.push(
      `source_domain: ${primarySource.source_domain}`,
      `source_url: ${primarySource.source_url}`,
      `ai_readable_source: ${primarySource.ai_readable_source}`,
      `markdown_discovery: ${primarySource.discovery_method}`,
      `first_observed: ${primarySource.first_observed}`,
      `last_verified: ${primarySource.last_verified}`
    );
  }

  frontmatter.push('---', '');

  return frontmatter.filter(Boolean).join('\n') + crouton.claim;
}

// GET /v1/croutons/:id - Deterministic read endpoint (JSON)
// GET /v1/croutons/:id.md - Markdown endpoint
// Content negotiation: Accept: text/markdown returns Markdown
app.get(["/v1/croutons/:id", "/v1/croutons/:id.md"], async (req, res) => {
  try {
    const id = req.params.id;
    const isMarkdownRequest = req.path.endsWith('.md') || req.get("Accept") === "text/markdown";
    
    // For Markdown requests, get full source tracking data
    const crouton = isMarkdownRequest ? await getCroutonWithSourceTracking(id) : await getCrouton(id);

    if (!crouton) {
      return res.status(404).json({ ok: false, error: "Crouton not found" });
    }

    // Auto-discovery detection: if this is a Markdown request, track it
    if (isMarkdownRequest && crouton.sources && crouton.sources.length > 0) {
      const userAgent = req.get("User-Agent") || '';
      const referer = req.get("Referer") || '';
      
      // Determine discovery method
      let discoveryMethod = 'direct_md';
      if (referer && referer.includes('/crouton/')) {
        discoveryMethod = 'alternate_link';
      } else if (userAgent.includes('bot') || userAgent.includes('crawler') || userAgent.includes('spider')) {
        discoveryMethod = 'api';
      }
      
      // Update source participation for each source
      for (const sourceUrl of crouton.sources) {
        try {
          await upsertSourceParticipation(
            id, 
            sourceUrl, 
            discoveryMethod, 
            true, // ai_readable_source = true for confirmed Markdown access
            true  // markdown_discovered = true
          );
        } catch (err) {
          console.error('[source_tracking] Error updating participation:', err.message);
        }
      }
    }
    
    if (isMarkdownRequest) {
      logRequest(req, "markdown");
      res.set("Content-Type", "text/markdown; charset=utf-8");
      res.send(serializeCroutonToMarkdown(crouton));
    } else {
      logRequest(req, "json");
      res.json({ ok: true, data: crouton });
    }
  } catch (e) {
    console.error("[croutons] Error:", e);
    res.status(500).json({ ok: false, error: e.message });
  }
});

// GET /feeds/croutons.ndjson - NDJSON feed for AI agents
app.get("/feeds/croutons.ndjson", async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 1000;
    const croutons = await getAllCroutons(limit);

    logRequest(req, "ndjson");
    
    res.set({
      "Content-Type": "application/x-ndjson; charset=utf-8",
      "Cache-Control": "no-cache",
      "Transfer-Encoding": "chunked"
    });

    // Stream each crouton as NDJSON line
    for (const crouton of croutons) {
      if (res.writableEnded) break;
      res.write(JSON.stringify(crouton) + "\n");
    }
    
    res.end();
  } catch (e) {
    console.error("[feeds] Error:", e);
    if (!res.headersSent) {
      res.status(500).json({ ok: false, error: e.message });
    }
  }
});

// GET /api/source-stats - Derived dataset for Graph dashboard
app.get("/api/source-stats", async (req, res) => {
  try {
    const stats = await getSourceDomainStats();
    logRequest(req, "source-stats");
    res.json({ ok: true, data: stats });
  } catch (e) {
    console.error("[source-stats] Error:", e);
    res.status(500).json({ ok: false, error: e.message });
  }
});

// POST /v1/invoke - Create job and enqueue (requires auth if API_KEY is set, rate limited)
app.post("/v1/invoke", requireAuth, rateLimit, async (req, res) => {
  try {
    const { precog, prompt, context, stream } = req.body || {};
    if (!precog) {
      return res.status(400).json({ ok: false, error: "precog required" });
    }

    // Default prompt if not provided
    const jobPrompt = prompt || `Run ${precog}`;

    // Insert job into database (status=pending)
    const job = await insertJob(precog, jobPrompt, context || {});

    // Enqueue job to Redis Stream
    if (process.env.REDIS_URL) {
      try {
        await enqueueJob(job.id, precog, jobPrompt, context || {});
      } catch (redisErr) {
        console.error("[invoke] Redis enqueue failed:", redisErr.message);
        // Continue anyway - job is in DB, worker can poll DB if needed
      }
    }

    res.json({ ok: true, job_id: job.id, stream: !!stream });
  } catch (e) {
    console.error("[invoke] Error:", e);
    res.status(500).json({ ok: false, error: e.message });
  }
});

// GET /v1/jobs/:id/events - Stream events as SSE
app.get("/v1/jobs/:id/events", async (req, res) => {
  try {
    // If auth is required, allow token in query param for EventSource (can't set headers)
    if (process.env.API_KEY) {
      const hdr = req.headers.authorization || "";
      const qtk = req.query.token ? `Bearer ${req.query.token}` : "";
      const expected = `Bearer ${process.env.API_KEY}`;
      
      if (hdr !== expected && qtk !== expected) {
        return res.status(401).json({ ok: false, error: "Authorization required" });
      }
    }

    const jobId = req.params.id;
    const job = await getJob(jobId);

    if (!job) {
      return res.status(404).json({ ok: false, error: "Job not found" });
    }

    res.set({
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no", // Disable nginx buffering
    });

    let lastEventId = null;
    const pollInterval = 500; // Poll every 500ms
    const maxPollTime = 300000; // Max 5 minutes
    const startTime = Date.now();
    let isActive = true;

    // SSE keep-alive heartbeat (prevents Cloudflare/edge idle timeout)
    const keepAliveInterval = setInterval(() => {
      if (isActive) {
        res.write(":keepalive\n\n");
      }
    }, 15000); // Every 15 seconds

    const pollEvents = async () => {
      try {
        const events = await getJobEvents(jobId, 1000);
        
        // Send only new events (after lastEventId)
        let sentAny = false;
        for (const event of events) {
          // Skip events we've already sent
          if (lastEventId !== null && event.id <= lastEventId) {
            continue;
          }
          
          // Parse JSONB data
          const data = typeof event.data === "string" ? JSON.parse(event.data) : event.data;
          sse(res, event.type, data);
          lastEventId = event.id;
          sentAny = true;
        }

        // Check if job is complete
        const currentJob = await getJob(jobId);
        if (currentJob && (currentJob.status === "done" || currentJob.status === "error")) {
          if (currentJob.status === "error" && currentJob.error) {
            sse(res, "error", { message: currentJob.error });
          }
          isActive = false;
          clearInterval(keepAliveInterval);
          res.end();
          return;
        }

        // Continue polling if not done and within time limit
        if (Date.now() - startTime < maxPollTime) {
          setTimeout(pollEvents, pollInterval);
        } else {
          sse(res, "timeout", { message: "Polling timeout reached" });
          isActive = false;
          clearInterval(keepAliveInterval);
          res.end();
        }
      } catch (err) {
        console.error("[events] Poll error:", err);
        sse(res, "error", { message: err.message });
        isActive = false;
        clearInterval(keepAliveInterval);
        res.end();
      }
    };

    // Cleanup on client disconnect
    req.on("close", () => {
      isActive = false;
      clearInterval(keepAliveInterval);
    });

    // Start polling
    pollEvents();
  } catch (e) {
    console.error("[events] Error:", e);
    res.status(500).json({ ok: false, error: e.message });
  }
});

function sse(res, event, data) {
  res.write(`event: ${event}\n`);
  res.write(`data: ${JSON.stringify(data)}\n\n`);
}

// GET /metrics - Prometheus-style metrics
app.get("/metrics", async (_req, res) => {
  try {
    res.set("Cache-Control", "no-cache"); // Don't cache metrics

    const metrics = {
      processed_total: 0,
      failed_total: 0,
      inflight_jobs: 0,
      oldest_pending_age_seconds: null,
      redis_lag_ms: null,
      build_sha: process.env.RAILWAY_GIT_COMMIT_SHA || process.env.GIT_SHA || "unknown",
    };

    // Count processed jobs (done status)
    const processedRes = await pool.query(
      `SELECT COUNT(*) as count FROM precogs.jobs WHERE status = 'done'`
    );
    metrics.processed_total = parseInt(processedRes.rows[0].count, 10);

    // Count failed jobs (error status)
    const failedRes = await pool.query(
      `SELECT COUNT(*) as count FROM precogs.jobs WHERE status = 'error'`
    );
    metrics.failed_total = parseInt(failedRes.rows[0].count, 10);

    // Count inflight jobs (running status)
    const inflightRes = await pool.query(
      `SELECT COUNT(*) as count FROM precogs.jobs WHERE status = 'running'`
    );
    metrics.inflight_jobs = parseInt(inflightRes.rows[0].count, 10);

    // Find oldest pending job age
    const oldestRes = await pool.query(
      `SELECT EXTRACT(EPOCH FROM (NOW() - created_at)) as age_seconds
       FROM precogs.jobs
       WHERE status = 'pending'
       ORDER BY created_at ASC
       LIMIT 1`
    );
    if (oldestRes.rows.length > 0 && oldestRes.rows[0].age_seconds) {
      metrics.oldest_pending_age_seconds = parseFloat(oldestRes.rows[0].age_seconds);
    }

    // Redis lag: time since last processed event
    try {
      const lastEventRes = await pool.query(
        `SELECT EXTRACT(EPOCH FROM (NOW() - MAX(ts))) * 1000 as lag_ms
         FROM precogs.events`
      );
      if (lastEventRes.rows.length > 0 && lastEventRes.rows[0].lag_ms !== null) {
        metrics.redis_lag_ms = parseFloat(lastEventRes.rows[0].lag_ms);
      }
    } catch (e) {
      // Ignore redis lag errors
    }

    res.json(metrics);
  } catch (e) {
    console.error("[metrics] Error:", e);
    res.status(500).json({ 
      ok: false, 
      error: e.message || String(e),
      details: process.env.DATABASE_URL ? "Database connection failed" : "DATABASE_URL not set"
    });
  }
});

// GET/POST /v1/run.ndjson - Create job and stream events as NDJSON
// GET: legacy URL-based mode (?precog=...&url=...)
// POST: inline content mode ({precog, kb, content_source, content, type, task})
app.get("/v1/run.ndjson", async (req, res) => {
  try {
    // Public endpoint - no auth required for GPT function calling
    // Auth is completely optional - allow all requests

    const precog = req.query.precog || "schema";
    const task = req.query.task || (precog === "schema" ? "validate" : `Run ${precog}`);
    const ctx = {
      kb: req.query.kb || (precog === "schema" ? "schema-foundation" : "general"),
      content_source: "url",
    };
    if (req.query.url) ctx.url = req.query.url;
    if (req.query.type) ctx.type = req.query.type;

    // Create job
    const job = await insertJob(precog, task, ctx);
    
    // Enqueue job to Redis Stream
    if (process.env.REDIS_URL) {
      try {
        await enqueueJob(job.id, precog, task, ctx);
      } catch (redisErr) {
        console.error("[run.ndjson] Redis enqueue failed:", redisErr.message);
        // Continue anyway - job is in DB
      }
    }

    // NDJSON stream headers
    res.set({
      "Content-Type": "application/x-ndjson; charset=utf-8",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
      "Transfer-Encoding": "chunked",
      "X-Accel-Buffering": "no", // Disable nginx buffering
    });

    // Helper to write one NDJSON line
    const line = (obj) => {
      try {
        res.write(JSON.stringify(obj) + "\n");
      } catch (e) {
        // Client disconnected
        return false;
      }
      return true;
    };

    // Send initial ack
    if (!line({ type: "ack", job_id: job.id })) return;

    // Poll DB events and write each as NDJSON
    let lastId = 0;
    let open = true;
    req.on("close", () => {
      open = false;
    });

    // Heartbeat keeps proxies from closing idle streams
    const hb = setInterval(() => {
      if (open) line({ type: "heartbeat" });
    }, 15000);

    try {
      while (open) {
        const rows = await getJobEvents(job.id, 1000);
        
        for (const r of rows) {
          if (!open) break;
          
          const eventId = Number(r.id);
          if (eventId > lastId) {
            lastId = eventId;
            
            // Parse JSONB data if it's a string
            const data = typeof r.data === "string" ? JSON.parse(r.data) : r.data;
            
            if (!line({ type: r.type, data: data, ts: r.ts })) {
              open = false;
              break;
            }
          }
        }

        const j = await getJob(job.id);
        if (j && (j.status === "done" || j.status === "error" || j.status === "cancelled")) {
          line({ type: "complete", status: j.status, error: j.error || null });
          break;
        }

        await new Promise((r) => setTimeout(r, 500));
      }
    } catch (e) {
      line({ type: "error", message: String(e?.message || e) });
    } finally {
      clearInterval(hb);
      res.end();
    }
  } catch (e) {
    console.error("[run.ndjson] Error:", e);
    res.status(500).json({ ok: false, error: e.message });
  }
});

// POST /v1/run.ndjson - Create job with inline content and stream events as NDJSON
app.post("/v1/run.ndjson", async (req, res) => {
  try {
    // Public endpoint - no auth required for GPT function calling
    // Auth is completely optional - allow all requests

    const {
      precog = "schema",
      kb = precog === "schema" ? "schema-foundation" : "general",
      content_source = "inline",
      content,
      url,
      type,
      task,
    } = req.body;

    // Validate content source requirements
    if (content_source === "inline" && !content) {
      return res.status(400).json({ ok: false, error: "content is required when content_source is 'inline'" });
    }
    if (content_source === "url" && !url) {
      return res.status(400).json({ ok: false, error: "url is required when content_source is 'url'" });
    }

    const ctx = {
      kb: kb || (precog === "schema" ? "schema-foundation" : precog.startsWith("home") ? "home-foundation" : "general"),
      content_source,
    };
    if (type) ctx.type = type;
    if (content_source === "inline" && content) {
      ctx.content = content;
    }
    if (content_source === "url" && url) {
      ctx.url = url;
    }
    // Home precog specific context
    if (precog.startsWith("home")) {
      if (req.body.region) ctx.region = req.body.region;
      if (req.body.domain) ctx.domain = req.body.domain;
      if (req.body.vertical) ctx.vertical = req.body.vertical;
    }
    // Bangkok Massage precog specific context
    if (precog === "bkk_massage") {
      if (req.body.region) ctx.region = req.body.region; // District name
    }

    const jobTask = task || (precog === "schema" ? "validate" : `Run ${precog}`);

    // Create job
    const job = await insertJob(precog, jobTask, ctx);
    
    // Enqueue job to Redis Stream
    if (process.env.REDIS_URL) {
      try {
        await enqueueJob(job.id, precog, jobTask, ctx);
      } catch (redisErr) {
        console.error("[run.ndjson] Redis enqueue failed:", redisErr.message);
        // Continue anyway - job is in DB
      }
    }

    // NDJSON stream headers
    res.set({
      "Content-Type": "application/x-ndjson; charset=utf-8",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
      "Transfer-Encoding": "chunked",
      "X-Accel-Buffering": "no",
    });

    // Helper to write one NDJSON line
    const line = (obj) => {
      try {
        res.write(JSON.stringify(obj) + "\n");
      } catch (e) {
        return false;
      }
      return true;
    };

    // Send initial ack
    if (!line({ type: "ack", job_id: job.id })) return;

    // Poll DB events and write each as NDJSON
    let lastId = 0;
    let open = true;
    req.on("close", () => {
      open = false;
    });

    // Heartbeat keeps proxies from closing idle streams
    const hb = setInterval(() => {
      if (open) line({ type: "heartbeat" });
    }, 15000);

    try {
      while (open) {
        const rows = await getJobEvents(job.id, 1000);
        
        for (const r of rows) {
          if (!open) break;
          
          const eventId = Number(r.id);
          if (eventId > lastId) {
            lastId = eventId;
            
            const data = typeof r.data === "string" ? JSON.parse(r.data) : r.data;
            
            if (!line({ type: r.type, data: data, ts: r.ts })) {
              open = false;
              break;
            }
          }
        }

        const j = await getJob(job.id);
        if (j && (j.status === "done" || j.status === "error" || j.status === "cancelled")) {
          line({ type: "complete", status: j.status, error: j.error || null });
          break;
        }

        await new Promise((r) => setTimeout(r, 500));
      }
    } catch (e) {
      line({ type: "error", message: String(e?.message || e) });
    } finally {
      clearInterval(hb);
      res.end();
    }
  } catch (e) {
    console.error("[run.ndjson POST] Error:", e);
    if (!res.headersSent) {
      res.status(500).json({ ok: false, error: e.message });
    }
  }
});

// GET /run - Convenience redirect to NDJSON endpoint
app.get("/run", (req, res) => {
  const target = "/v1/run.ndjson";
  const q = new URLSearchParams(req.query).toString();
  res.redirect(`${target}?${q}`);
});

// GET /cli - Convenience redirect to CLI viewer
app.get("/cli", (req, res) => {
  const q = new URLSearchParams(req.query).toString();
  res.redirect(`/runtime/cli.html?${q}`);
});

// POST /v1/chat - OpenAI function calling with streaming
app.post("/v1/chat", requireAuth, rateLimit, async (req, res) => {
  try {
    // Log request for monitoring
    const startTime = Date.now();
    console.log("[chat] Request received:", {
      message: req.body.message?.substring(0, 100),
      hasHistory: !!req.body.history?.length,
    });

    const { message, history = [], model, temperature, max_tokens } = req.body;

    if (!message) {
      return res.status(400).json({ ok: false, error: "message is required" });
    }

    if (!process.env.OPENAI_API_KEY) {
      return res.status(503).json({ 
        ok: false, 
        error: "OpenAI integration not configured. OPENAI_API_KEY not set." 
      });
    }

    // Set up SSE headers
    res.set({
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
    });

    // Import dynamically (only if OPENAI_API_KEY is set)
    const { callWithFunctionCalling } = await import("./src/integrations/openai-chat.js");

    // Stream responses
    let functionCalled = false;
    let jobCreated = false;
    let firstChunkTime = null;
    
    try {
      for await (const chunk of callWithFunctionCalling(message, history, {
        model: model || "gpt-4",
        temperature: temperature || 0.7,
        maxTokens: max_tokens || 2000,
      })) {
        // Track first chunk time for latency monitoring
        if (!firstChunkTime) {
          firstChunkTime = Date.now();
          console.log("[chat] First chunk:", firstChunkTime - startTime, "ms");
        }
        
        // Track function calls for monitoring
        if (chunk.type === "function_call") {
          functionCalled = true;
          console.log("[chat] Function called:", chunk.name);
        }
        if (chunk.type === "function_result") {
          jobCreated = true;
          console.log("[chat] Job created:", chunk.result.job_id, "in", Date.now() - startTime, "ms");
        }
        
        // Send chunk as SSE
        res.write(`data: ${JSON.stringify(chunk)}\n\n`);

        // Handle client disconnect
        if (req.aborted) {
          console.log("[chat] Client disconnected");
          break;
        }
      }
      
      // Log completion metrics
      const totalTime = Date.now() - startTime;
      console.log("[chat] Completed:", {
        functionCalled,
        jobCreated,
        totalTime: totalTime + "ms",
        firstChunkTime: firstChunkTime ? firstChunkTime - startTime + "ms" : "N/A",
      });
    } catch (streamError) {
      console.error("[chat] Stream error:", streamError);
      res.write(`data: ${JSON.stringify({ type: "error", error: streamError.message })}\n\n`);
    }

    res.end();
  } catch (e) {
    console.error("[chat] Error:", e);
    if (!res.headersSent) {
      res.status(500).json({ ok: false, error: e.message });
    } else {
      res.write(`data: ${JSON.stringify({ type: "error", error: e.message })}\n\n`);
      res.end();
    }
  }
});

// Serve /runtime (static UI to run directives later)
const __dirname = path.dirname(fileURLToPath(import.meta.url));
app.use("/runtime", express.static(path.join(__dirname, "runtime")));

const port = process.env.PORT || 8080;
app.listen(port, "0.0.0.0", () => console.log("precogs-api listening on", port));
