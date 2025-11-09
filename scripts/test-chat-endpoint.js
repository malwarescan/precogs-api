/* jshint node: true, esversion: 11 */
/**
 * Integration test script for /v1/chat endpoint
 * 
 * Tests the complete flow:
 * 1. Send message to /v1/chat
 * 2. Detect function call
 * 3. Verify job creation
 * 4. Verify URLs returned
 * 5. Test streaming from returned URL
 */

import "dotenv/config";

const API_BASE = process.env.PRECOGS_API_BASE || "http://localhost:8080";
const API_KEY = process.env.API_KEY || "";

async function testChatEndpoint() {
  console.log("=".repeat(60));
  console.log("Testing /v1/chat endpoint");
  console.log("=".repeat(60));
  console.log(`API Base: ${API_BASE}`);
  console.log(`API Key: ${API_KEY ? "Set" : "Not set"}`);
  console.log("");

  // Test 1: Simple function call request
  console.log("Test 1: Function call request");
  console.log("-".repeat(60));

  const testMessage = "Run schema audit on https://example.com/service";
  console.log(`Message: "${testMessage}"`);
  console.log("");

  try {
    const response = await fetch(`${API_BASE}/v1/chat`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(API_KEY ? { Authorization: `Bearer ${API_KEY}` } : {}),
      },
      body: JSON.stringify({
        message: testMessage,
      }),
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    if (!response.body) {
      throw new Error("No response body");
    }

    console.log("Response status: OK");
    console.log("Streaming events:");
    console.log("");

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = "";
    let functionCallDetected = false;
    let functionResult = null;
    let contentChunks = [];

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });

      // Parse SSE lines
      let lineEnd;
      while ((lineEnd = buffer.indexOf("\n\n")) >= 0) {
        const line = buffer.slice(0, lineEnd).trim();
        buffer = buffer.slice(lineEnd + 2);

        if (line.startsWith("data: ")) {
          try {
            const data = JSON.parse(line.slice(6));
            console.log(`  [${data.type}]`, JSON.stringify(data).substring(0, 100));

            if (data.type === "function_call") {
              functionCallDetected = true;
              console.log(`    ✓ Function call detected: ${data.name}`);
              console.log(`    Arguments:`, JSON.stringify(data.arguments, null, 2));
            }

            if (data.type === "function_result") {
              functionResult = data.result;
              console.log(`    ✓ Function result received`);
              console.log(`    Job ID: ${data.result.job_id}`);
              console.log(`    CLI URL: ${data.result.cli_url}`);
            }

            if (data.type === "content") {
              contentChunks.push(data.content);
            }

            if (data.type === "error") {
              console.log(`    ✗ Error: ${data.error}`);
            }

            if (data.type === "complete") {
              console.log(`    ✓ Stream complete`);
            }
          } catch (e) {
            console.log(`  [parse error]`, line.substring(0, 100));
          }
        }
      }
    }

    console.log("");
    console.log("Test 1 Results:");
    console.log(`  Function call detected: ${functionCallDetected ? "✓" : "✗"}`);
    console.log(`  Function result received: ${functionResult ? "✓" : "✗"}`);
    console.log(`  Content chunks: ${contentChunks.length}`);

    // Test 2: Verify job was created
    if (functionResult?.job_id) {
      console.log("");
      console.log("Test 2: Verify job exists");
      console.log("-".repeat(60));

      const jobResponse = await fetch(`${API_BASE}/v1/jobs/${functionResult.job_id}/events`, {
        headers: {
          ...(API_KEY ? { Authorization: `Bearer ${API_KEY}` } : {}),
        },
      });

      if (jobResponse.ok) {
        console.log(`  ✓ Job ${functionResult.job_id} exists and is accessible`);
      } else {
        console.log(`  ✗ Job ${functionResult.job_id} not accessible: ${jobResponse.status}`);
      }

      // Test 3: Verify CLI URL works
      console.log("");
      console.log("Test 3: Verify CLI URL");
      console.log("-".repeat(60));

      if (functionResult.cli_url) {
        const cliUrl = functionResult.cli_url.startsWith("http")
          ? functionResult.cli_url
          : `${API_BASE}${functionResult.cli_url}`;

        console.log(`  CLI URL: ${cliUrl}`);
        console.log(`  ✓ CLI URL provided (manual verification needed)`);
      } else {
        console.log(`  ✗ CLI URL missing`);
      }
    }

    console.log("");
    console.log("=".repeat(60));
    console.log("Integration test complete");
    console.log("=".repeat(60));
  } catch (error) {
    console.error("Test failed:", error);
    process.exit(1);
  }
}

// Run test
testChatEndpoint().catch((error) => {
  console.error("Fatal error:", error);
  process.exit(1);
});

