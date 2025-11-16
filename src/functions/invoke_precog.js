/* jshint node: true, esversion: 11 */
/**
 * OpenAI function definition for invoke_precog
 * Used in Phase 3: Dev Tooling Integration
 */

export const invokePrecogFunction = {
  name: "invoke_precog",
  description: "Invoke a Precogs oracle to analyze schema, HTML content, or home issues using domain-specific knowledge. Returns a job_id and stream URL for real-time results. For home domain precogs, use content_source='inline' with the user's problem description, and include region/domain/vertical for location-specific context. For Bangkok massage queries, use precog='bkk_massage' to get safety-verified shop recommendations, district information, pricing, and risk assessments.",
  parameters: {
    type: "object",
    properties: {
      kb: {
        type: "string",
        description: "Knowledge base identifier. Defaults to 'schema-foundation' for schema precog, 'home-foundation' for home precogs, 'general' otherwise.",
        enum: ["general", "schema-foundation", "home-foundation", "siding-services", "cladding"],
        default: "schema-foundation",
      },
      precog: {
        type: "string",
        description: "Precog type to invoke",
        enum: ["schema", "faq", "pricing", "home", "home.hvac", "home.plumbing", "home.electrical", "home.safety", "home.safety.mold", "home.flood", "bkk_massage"],
      },
      content_source: {
        type: "string",
        description: "Source of content: 'inline' for pasted HTML/JSON-LD snippets, 'url' for web page URLs. Defaults to 'inline'.",
        enum: ["inline", "url"],
        default: "inline",
      },
      content: {
        type: "string",
        description: "Inline content (HTML or JSON-LD snippet) when content_source is 'inline'. Preferred when user provides schema or HTML in chat.",
      },
      url: {
        type: "string",
        description: "Target URL to analyze. Only use when content_source is 'url' or user explicitly provides a URL.",
      },
      type: {
        type: "string",
        description: "Context type (e.g., 'Service', 'Product', 'Article')",
      },
      task: {
        type: "string",
        description: "Task description or prompt. Defaults to 'validate' for schema precog, 'Run {precog}' otherwise. For home precogs, use: 'diagnose', 'assess_risk', 'recommend_fixes', 'local_context', 'timing', 'cost_band', 'risk_projection'.",
      },
      region: {
        type: "string",
        description: "Geographic region (city, state, ZIP code, or location name). Required for home domain precogs to provide location-specific context and cost/timing data. Example: 'Naples, FL', '34102', 'Fort Myers'.",
      },
      domain: {
        type: "string",
        description: "Partner domain name (e.g., 'floodbarrierpros.com'). Used to filter and boost relevant factlets from specific partners. Optional but recommended for home domain precogs.",
      },
      vertical: {
        type: "string",
        description: "Service vertical (e.g., 'flood_protection', 'hvac', 'plumbing', 'electrical', 'roofing'). Used to filter relevant knowledge and factlets. Optional but recommended for home domain precogs.",
      },
    },
    required: ["precog"],
  },
};

/**
 * Execute the invoke_precog function
 * Creates a job and returns job_id + stream URL
 */
export async function executeInvokePrecog(args, baseUrl = "https://precogs.croutons.ai") {
  const { insertJob } = await import("../db.js");
  const { enqueueJob } = await import("../redis.js");

  // Extract parameters with defaults
  const {
    kb = args.precog === "schema" ? "schema-foundation" : args.precog?.startsWith("home") ? "home-foundation" : "general",
    precog,
    content_source = "inline",
    content,
    url,
    type,
    task,
    region,
    domain,
    vertical,
  } = args;
  
  // Validate kb is a known value
  const validKBs = ["general", "schema-foundation", "home-foundation", "siding-services", "cladding"];
  const kbValue = validKBs.includes(kb) ? kb : (precog === "schema" ? "schema-foundation" : precog?.startsWith("home") ? "home-foundation" : "general");

  // Validate required parameters
  if (!precog) {
    throw new Error("precog is required");
  }

  // Validate content source requirements
  if (content_source === "inline" && !content) {
    throw new Error("content is required when content_source is 'inline'");
  }
  if (content_source === "url" && !url) {
    throw new Error("url is required when content_source is 'url'");
  }

  const context = {
    kb: kbValue,
    content_source,
  };
  if (type) context.type = type;
  if (content_source === "inline" && content) {
    context.content = content;
  }
  if (content_source === "url" && url) {
    context.url = url;
  }
  // Home domain specific context
  if (precog?.startsWith("home")) {
    if (region) context.region = region;
    if (domain) context.domain = domain;
    if (vertical) context.vertical = vertical;
  }

  // Default task based on precog type
  const jobTask = task || (precog === "schema" ? "validate" : `Run ${precog}`);

  // Create job
  const job = await insertJob(precog, jobTask, context);

  // Enqueue job to Redis Stream
  if (process.env.REDIS_URL) {
    try {
      await enqueueJob(job.id, precog, jobTask, context);
    } catch (redisErr) {
      console.error("[invoke_precog] Redis enqueue failed:", redisErr.message);
      // Continue anyway - job is in DB
    }
  }

  // Build URLs (prefer POST for inline, GET for URL)
  const params = new URLSearchParams({ precog, kb: kbValue });
  if (type) params.set("type", type);
  if (jobTask !== `Run ${precog}`) params.set("task", jobTask);

  // Return structured result for LLM
  return {
    job_id: job.id,
    status: "pending",
    stream_url: `${baseUrl}/v1/jobs/${job.id}/events`,
    ndjson_url: content_source === "inline" 
      ? `${baseUrl}/v1/run.ndjson` // POST endpoint
      : `${baseUrl}/v1/run.ndjson?${params.toString()}&url=${encodeURIComponent(url)}`,
    cli_url: `${baseUrl}/cli?${params.toString()}${url ? `&url=${encodeURIComponent(url)}` : ""}`,
    message: `Precog job created. Job ID: ${job.id}. Stream results at: ${baseUrl}/cli?${params.toString()}`,
  };
}

