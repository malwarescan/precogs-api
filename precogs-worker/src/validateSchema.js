/* jshint node: true, esversion: 11 */
/**
 * Schema Validator
 * Validates JSON-LD documents against KB rules
 */

/**
 * Validate JSON-LD document against KB rules
 * @param {Object} doc - JSON-LD document
 * @param {Object} rules - Type rules from KB
 * @returns {Array} Array of issues found
 */
export function validateJsonLdAgainstRules(doc, rules) {
  const issues = [];

  if (!rules) {
    return issues;
  }

  // 1) Required fields
  for (const key of rules.required || []) {
    if (!hasPath(doc, key)) {
      issues.push({
        level: "error",
        code: "missing",
        path: key,
        message: `Missing required field: ${key}`,
      });
    }
  }

  // 2) Disallowed fields
  for (const key of rules.disallowed || []) {
    if (hasPath(doc, key)) {
      issues.push({
        level: "warn",
        code: "disallowed",
        path: key,
        message: `Disallowed field: ${key}`,
      });
    }
  }

  // 3) Constraints
  for (const c of rules.constraints || []) {
    const val = getPath(doc, c.path);
    if (val === undefined) continue;

    // oneOf constraint
    if (c.oneOf && !c.oneOf.includes(val)) {
      issues.push({
        level: "warn",
        code: "oneOf",
        path: c.path,
        expected: c.oneOf,
        got: val,
        message: `${c.path} must be one of: ${c.oneOf.join(", ")}. Got: ${val}`,
      });
    }

    // String type constraint
    if (c.type === "string" && typeof val !== "string") {
      issues.push({
        level: "warn",
        code: "type",
        path: c.path,
        expected: "string",
        got: typeof val,
        message: `${c.path} must be a string`,
      });
    } else if (c.type === "string" && c.minLength && val.length < c.minLength) {
      issues.push({
        level: "warn",
        code: "minLength",
        path: c.path,
        min: c.minLength,
        got: val.length,
        message: `${c.path} must be at least ${c.minLength} characters`,
      });
    }

    // stringOrPlace constraint
    if (
      c.type === "stringOrPlace" &&
      !(
        typeof val === "string" ||
        (typeof val === "object" && val && val["@type"] === "Place")
      )
    ) {
      issues.push({
        level: "warn",
        code: "stringOrPlace",
        path: c.path,
        message: `${c.path} must be a string or Place object`,
      });
    }

    // maxCount constraint
    if (c.maxCount && Array.isArray(val) && val.length > c.maxCount) {
      issues.push({
        level: "info",
        code: "maxCount",
        path: c.path,
        max: c.maxCount,
        got: val.length,
        message: `${c.path} should have at most ${c.maxCount} items (got ${val.length})`,
      });
    }
  }

  return issues;
}

/**
 * Build recommendations based on missing recommended fields
 * @param {Object} doc - JSON-LD document
 * @param {Object} rules - Type rules from KB
 * @returns {Array} Array of recommendation strings
 */
export function buildRecommendations(doc, rules) {
  const recommendations = [];
  const recommended = rules.recommended || [];

  for (const key of recommended) {
    if (!hasPath(doc, key)) {
      const guidance = rules.fieldGuidance?.[key] || "";
      recommendations.push({
        field: key,
        message: `Consider adding: ${key}${guidance ? ` (${guidance})` : ""}`,
      });
    }
  }

  return recommendations;
}

/**
 * Pretty print validation results
 * @param {string} type - Schema type
 * @param {Array} issues - Validation issues
 * @param {Array} recommendations - Recommendations
 * @param {Object} doc - Original document
 * @returns {string} Formatted output
 */
export function prettyPrintResult(type, issues, recommendations, doc) {
  const errors = issues.filter((i) => i.level === "error");
  const warnings = issues.filter((i) => i.level === "warn");
  const info = issues.filter((i) => i.level === "info");

  let output = `\n📋 Schema Validation Results for @type: ${type}\n`;

  if (errors.length === 0 && warnings.length === 0) {
    output += `✅ Schema is valid!\n`;
  } else {
    if (errors.length > 0) {
      output += `❌ Validation Issues Found:\n`;
      for (const issue of errors) {
        output += `  • ${issue.message}\n`;
      }
    }
    if (warnings.length > 0) {
      output += `\n⚠️  Warnings:\n`;
      for (const issue of warnings) {
        output += `  • ${issue.message}\n`;
      }
    }
    if (info.length > 0) {
      output += `\nℹ️  Suggestions:\n`;
      for (const issue of info) {
        output += `  • ${issue.message}\n`;
      }
    }
  }

  if (recommendations.length > 0) {
    output += `\n💡 Recommendations:\n`;
    for (const rec of recommendations) {
      output += `  • ${rec.message}\n`;
    }
  }

  // Output validated JSON-LD
  output += `\n📦 Validated JSON-LD:\n\`\`\`json\n${JSON.stringify(doc, null, 2)}\n\`\`\`\n`;

  return output;
}

// Helper functions
function hasPath(o, p) {
  return getPath(o, p) !== undefined;
}

function getPath(o, p) {
  const segs = p.split(".");
  let cur = o;
  for (const s of segs) {
    if (cur == null) return undefined;
    cur = cur[s];
  }
  return cur;
}

