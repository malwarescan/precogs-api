.PHONY: help deploy-service migrate setup-neo4j backfill start-indexer smoke test-health test-feeds test-api test-neo4j test-dashboard monitor-indexer

# Default target
help:
	@echo "Graph-Service + Graph-Indexer Deployment Makefile"
	@echo ""
	@echo "Available targets:"
	@echo "  deploy-service    - Deploy graph-service (assumes Railway deployment)"
	@echo "  migrate          - Run database migrations"
	@echo "  setup-neo4j      - Setup Neo4j constraints"
	@echo "  backfill         - Backfill historical data to outbox"
	@echo "  start-indexer    - Start graph-indexer (local dev)"
	@echo "  smoke            - Run all smoke tests"
	@echo "  test-health      - Test graph-service health endpoint"
	@echo "  test-feeds       - Test graph-service feeds"
	@echo "  test-api         - Test graph-service API endpoints"
	@echo "  test-neo4j       - Test Neo4j (requires cypher-shell)"
	@echo "  test-dashboard   - Open dashboard URL"
	@echo "  monitor-indexer  - Monitor indexer backlog and status"

# Configuration (override with environment variables)
GRAPH_SERVICE_URL ?= https://graph.croutons.ai
DATABASE_URL ?= $(shell echo $$DATABASE_URL)
NEO4J_URI ?= $(shell echo $$NEO4J_URI)
NEO4J_USER ?= $(shell echo $$NEO4J_USER)
NEO4J_PASSWORD ?= $(shell echo $$NEO4J_PASSWORD)

# Deploy graph-service (placeholder - actual deployment happens in Railway)
deploy-service:
	@echo "⚠️  Deploy graph-service via Railway dashboard"
	@echo "   Then run: make migrate"

# Run database migrations
migrate:
	@echo "📦 Running database migrations..."
	@cd graph-service && node migrate.js

# Setup Neo4j constraints
setup-neo4j:
	@echo "🔧 Setting up Neo4j constraints..."
	@cd graph-indexer && node scripts/setup-neo4j-constraints.js

# Backfill historical data
backfill:
	@echo "📥 Backfilling historical data to outbox..."
	@cd graph-indexer && node scripts/backfill-outbox.js

# Start indexer (local dev)
start-indexer:
	@echo "🚀 Starting graph-indexer..."
	@cd graph-indexer && npm start

# Smoke tests
smoke: test-health test-feeds test-api
	@echo "✅ All smoke tests passed"

# Test health endpoint
test-health:
	@echo "🏥 Testing health endpoint..."
	@curl -s $(GRAPH_SERVICE_URL)/healthz || (echo "❌ Health check failed" && exit 1)
	@echo "✅ Health check passed"

# Test feeds
test-feeds:
	@echo "📡 Testing feeds..."
	@curl -s $(GRAPH_SERVICE_URL)/feeds/graph.json | jq -e '.triples | length' > /dev/null || (echo "❌ Graph feed test failed" && exit 1)
	@curl -s $(GRAPH_SERVICE_URL)/feeds/corpus.json | jq -e '.pages' > /dev/null || (echo "❌ Corpus feed test failed" && exit 1)
	@echo "✅ Feed tests passed"

# Test API endpoints
test-api:
	@echo "🔌 Testing API endpoints..."
	@curl -s $(GRAPH_SERVICE_URL)/api/triples?limit=5 | jq -e '.triples' > /dev/null || (echo "❌ Triples API test failed" && exit 1)
	@curl -s $(GRAPH_SERVICE_URL)/api/facts?limit=5 | jq -e '.facts' > /dev/null || (echo "❌ Facts API test failed" && exit 1)
	@curl -s $(GRAPH_SERVICE_URL)/api/pages?limit=5 | jq -e '.pages' > /dev/null || (echo "❌ Pages API test failed" && exit 1)
	@curl -s $(GRAPH_SERVICE_URL)/api/graph | jq -e '.nodes' > /dev/null || (echo "❌ Graph API test failed" && exit 1)
	@curl -s $(GRAPH_SERVICE_URL)/diag/stats | jq -e '.counts' > /dev/null || (echo "❌ Stats API test failed" && exit 1)
	@echo "✅ API tests passed"

# Test Neo4j (requires cypher-shell)
test-neo4j:
	@echo "🕸️  Testing Neo4j..."
	@if ! command -v cypher-shell > /dev/null; then \
		echo "⚠️  cypher-shell not found. Install Neo4j client tools."; \
		exit 1; \
	fi
	@echo "MATCH (e:Entity) RETURN count(e) AS entity_count;" | \
		cypher-shell -a $(NEO4J_URI) -u $(NEO4J_USER) -p $(NEO4J_PASSWORD) || \
		(echo "❌ Neo4j test failed" && exit 1)
	@echo "✅ Neo4j test passed"

# Open dashboard
test-dashboard:
	@echo "🌐 Opening dashboard..."
	@echo "Dashboard URL: $(GRAPH_SERVICE_URL)/dashboard"
	@if command -v open > /dev/null; then \
		open $(GRAPH_SERVICE_URL)/dashboard; \
	elif command -v xdg-open > /dev/null; then \
		xdg-open $(GRAPH_SERVICE_URL)/dashboard; \
	else \
		echo "Please open: $(GRAPH_SERVICE_URL)/dashboard"; \
	fi

# Monitor indexer status
monitor-indexer:
	@echo "📊 Indexer Status:"
	@if [ -z "$(DATABASE_URL)" ]; then \
		echo "❌ DATABASE_URL not set"; \
		exit 1; \
	fi
	@psql $(DATABASE_URL) -c "SELECT status, COUNT(*) as count FROM outbox_graph_events GROUP BY status ORDER BY status;" || \
		(echo "❌ Failed to query outbox" && exit 1)
	@echo ""
	@echo "Oldest pending event:"
	@psql $(DATABASE_URL) -c "SELECT now() - min(occurred_at) AS oldest_pending_age FROM outbox_graph_events WHERE status='pending';" || true
	@echo ""
	@echo "Failed events (last 5):"
	@psql $(DATABASE_URL) -c "SELECT id, event_type, error, attempts FROM outbox_graph_events WHERE status='failed' ORDER BY occurred_at DESC LIMIT 5;" || true

# Full deployment sequence (interactive)
deploy-full: migrate setup-neo4j backfill
	@echo ""
	@echo "✅ Deployment preparation complete!"
	@echo ""
	@echo "Next steps:"
	@echo "  1. Deploy graph-indexer to Railway"
	@echo "  2. Set environment variables"
	@echo "  3. Run: make smoke"
	@echo "  4. Run: make monitor-indexer"

