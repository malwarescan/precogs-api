/* jshint node: true, esversion: 11 */
/**
 * invoke_bkk_merge Function Definition
 * Calls the Croutons Merge API to retrieve verified, district-aware massage intelligence for Bangkok
 */

export const invokeBkkMergeFunction = {
  name: "invoke_bkk_merge",
  description: "Call the Croutons Merge API to retrieve verified, district-aware massage intelligence for Bangkok. Returns merged data from Google Maps and verified corpus sources.",
  parameters: {
    type: "object",
    properties: {
      content: {
        type: "string",
        description: "User's Bangkok massage query (e.g., 'Find a safe massage in Asok', 'What are the prices in Nana?', 'Show me shops with prettiest women')",
      },
      task: {
        type: "string",
        enum: ["legitimacy_scoring", "district_aware_ranking", "safety_pattern_recognition", "price_sanity_checking"],
        description: "Inferred analysis task type. Use 'district_aware_ranking' for general recommendations, 'legitimacy_scoring' for safety checks, 'safety_pattern_recognition' for safety patterns, 'price_sanity_checking' for pricing queries.",
      },
      region: {
        type: "string",
        enum: ["Asok", "Nana", "Phrom Phong", "Thonglor", "Ekkamai", "Silom", "Ari", "Victory Monument", "Ratchada", "Old City"],
        description: "Extracted Bangkok district from user query. Leave empty if not specified.",
      },
    },
    required: ["content"],
  },
};

/**
 * Execute the invoke_bkk_merge function
 * Calls the Croutons Merge API and returns the merged shop data
 */
export async function executeInvokeBkkMerge(args, baseUrl = null) {
  const { content, task, region } = args;

  // Validate required parameters
  if (!content) {
    throw new Error("content is required");
  }

  // Get merge API URL from environment or use default
  const mergeApiUrl = baseUrl || process.env.BKK_MERGE_API_URL || "https://croutons-merge-service.up.railway.app/v1/merge/bkk_massage";

  const requestBody = {
    content,
    task: task || "district_aware_ranking",
    region: region || "",
  };

  try {
    const response = await fetch(mergeApiUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(
        `Merge API error ${response.status}: ${response.statusText}. ${errorText}`
      );
    }

    const data = await response.json();
    return data;
  } catch (error) {
    // Re-throw with more context
    if (error.message.includes("Merge API error")) {
      throw error;
    }
    throw new Error(`Failed to call merge API: ${error.message}`);
  }
}

