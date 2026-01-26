#!/bin/bash
# Test script for nrlc.ai discovery flow

API_BASE="https://precogs.croutons.ai"
DOMAIN="nrlc.ai"
PAGE="https://nrlc.ai"

echo "=== Testing Croutons Protocol Discovery for ${DOMAIN} ==="
echo ""

# Step 1: Initiate verification
echo "1. Initiating domain verification..."
VERIFY_INIT=$(curl -s -X POST "${API_BASE}/v1/verify/initiate" \
  -H "Content-Type: application/json" \
  -d "{\"domain\":\"${DOMAIN}\"}")

echo "$VERIFY_INIT" | jq .

TOKEN=$(echo "$VERIFY_INIT" | jq -r '.verification_token // empty')
if [ -z "$TOKEN" ]; then
  echo "❌ Failed to get verification token"
  exit 1
fi

echo ""
echo "✅ Verification token: ${TOKEN}"
echo ""
echo "📋 Next steps:"
echo "   Option A (DNS): Add DNS TXT record: croutons-verification=${TOKEN}"
echo "   Option B (HTTP): Create file at https://${DOMAIN}/.well-known/croutons-verification.txt"
echo ""
read -p "Press Enter after you've added DNS/HTTP verification..."

# Step 2: Check verification
echo ""
echo "2. Checking verification..."
VERIFY_CHECK=$(curl -s -X POST "${API_BASE}/v1/verify/check" \
  -H "Content-Type: application/json" \
  -d "{\"domain\":\"${DOMAIN}\"}")

echo "$VERIFY_CHECK" | jq .

STATUS=$(echo "$VERIFY_CHECK" | jq -r '.status // empty')
if [ "$STATUS" != "verified" ] && [ "$STATUS" != "already_verified" ]; then
  echo "❌ Domain not verified. Status: ${STATUS}"
  exit 1
fi

echo ""
echo "✅ Domain verified!"
echo ""

# Step 3: Check if page has alternate link
echo "3. Checking for <link rel=\"alternate\"> tag..."
HTML=$(curl -s "$PAGE")
if echo "$HTML" | grep -qi 'rel="alternate".*type="text/markdown"'; then
  echo "✅ Alternate link found on page"
else
  echo "⚠️  No alternate link found. You need to add:"
  echo "   <link rel=\"alternate\" type=\"text/markdown\" href=\"https://md.croutons.ai/${DOMAIN}/index.md\">"
  echo ""
  read -p "Press Enter after you've added the alternate link..."
fi

# Step 4: Discover page
echo ""
echo "4. Discovering page (webhook trigger)..."
DISCOVER=$(curl -s -X POST "${API_BASE}/v1/discover" \
  -H "Content-Type: application/json" \
  -d "{
    \"domain\":\"${DOMAIN}\",
    \"page\":\"${PAGE}\"
  }")

echo "$DISCOVER" | jq .

OK=$(echo "$DISCOVER" | jq -r '.ok // false')
if [ "$OK" = "true" ]; then
  echo ""
  echo "✅ Discovery successful!"
  echo ""
  echo "📊 Results:"
  echo "$DISCOVER" | jq '{
    units_extracted: .ingestion.units_extracted,
    schema_coverage: .ingestion.schema_coverage,
    hop_density: .ingestion.hop_density,
    markdown_url: .markdown_url
  }'
else
  echo ""
  echo "❌ Discovery failed"
  echo "$DISCOVER" | jq '.error, .details'
fi

echo ""
echo "=== Test Complete ==="
