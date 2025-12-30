# Deployment Quick Reference

## One-Liner Deployment Sequence

```bash
# Full deployment prep
make deploy-full

# Then deploy graph-indexer to Railway and run:
make smoke
make monitor-indexer
```

## Individual Commands

```bash
# Graph-Service
make migrate              # Run DB migrations
make test-health          # Test health endpoint
make test-feeds           # Test feeds
make test-api             # Test API endpoints

# Graph-Indexer
make setup-neo4j          # Setup Neo4j constraints
make backfill             # Backfill historical data
make start-indexer        # Start indexer (local)
make monitor-indexer       # Monitor indexer status

# Testing
make smoke                # Run all smoke tests
make test-dashboard       # Open dashboard
```

## Environment Variables Checklist

### Graph-Service (Railway)
- [ ] `DATABASE_URL`
- [ ] `PORT=8080`
- [ ] `NODE_ENV=production`
- [ ] `PUBLISH_HMAC_KEY`

### Graph-Indexer (Railway)
- [ ] `DATABASE_URL`
- [ ] `NEO4J_URI`
- [ ] `NEO4J_USER`
- [ ] `NEO4J_PASSWORD`
- [ ] `BATCH_SIZE=500` (optional)
- [ ] `POLL_INTERVAL_MS=2000` (optional)

## Verification Checklist

- [ ] Graph-service health: `curl https://graph.croutons.ai/healthz`
- [ ] API endpoints returning data
- [ ] Dashboard loads and shows graph
- [ ] Neo4j has entities: `MATCH (e:Entity) RETURN count(e)`
- [ ] Outbox draining: `SELECT status, COUNT(*) FROM outbox_graph_events GROUP BY status`
- [ ] Live ingestion works (HoosierCladding satellite)

## Troubleshooting

```bash
# Check outbox backlog
make monitor-indexer

# Reset failed events
psql $DATABASE_URL -c "UPDATE outbox_graph_events SET status='pending', attempts=0, error=null WHERE status='failed';"

# Test Neo4j connection
cd graph-indexer && node scripts/setup-neo4j-constraints.js
```

## Full Documentation

- Main runbook: `graph-service/docs/DEPLOYMENT_RUNBOOK.md`
- Indexer docs: `graph-indexer/docs/GRAPH_INDEXER.md`

