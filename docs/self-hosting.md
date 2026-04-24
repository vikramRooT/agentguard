# Self-hosting AgentGuard

The SDK (`pip install agentguard-protocol`) is just a client. To actually
govern payments, you run the AgentGuard **governance API** somewhere the
SDK can reach over HTTP. This guide covers three options, easiest first.

---

## Option 1 — local dev (the hackathon path)

Ten-second bring-up once the repo is cloned:

```bash
cp .env.example .env           # fill in CIRCLE_API_KEY + ANTHROPIC_API_KEY
pnpm install
pnpm infra:up                  # postgres + redis via docker compose
pnpm dev:api                   # API on http://localhost:4000
pnpm seed                      # register demo agents + fund wallets
```

Then from any Python process:

```python
from agentguard import AgentGuard
guard = AgentGuard(
    agent_id="research-agent-v1",
    policy_file="policies/research-agent-v1.yaml",
    api_base_url="http://localhost:4000",
)
```

## Option 2 — one-command Docker (for anyone trying the repo)

Bring up the whole stack — Postgres, Redis, and the governance API — in a
single Docker network:

```bash
cp .env.example .env           # fill in CIRCLE_API_KEY + ANTHROPIC_API_KEY
docker compose --profile full up -d --build
```

This uses the `full` profile defined in `docker-compose.yml`, which adds
the `api` service. `docker compose up` (no profile) still starts only
infra, so local dev using `pnpm dev:api` keeps working unchanged.

Check it's alive:

```bash
curl http://localhost:4000/health
# {"status":"ok","commit":"...","uptime_s":4.1}
```

Tear down:

```bash
docker compose --profile full down
```

## Option 3 — deploy the API to a VM or PaaS

The `apps/api/Dockerfile` is a self-contained multi-stage build that
outputs a ~180 MB Alpine image. Deploy it anywhere that runs containers.
Minimum requirements:

- **Postgres 16** (managed: Neon, Supabase, RDS). Run `apps/api/src/db/schema.sql`
  once on the fresh DB.
- **Redis 7** (managed: Upstash, Redis Cloud, ElastiCache).
- **Egress** to `api.circle.com` and `api.anthropic.com`.
- One container per AZ if you care about availability.

Point the SDK at the deployed URL:

```python
guard = AgentGuard(
    agent_id="my-agent",
    policy_file="policy.yaml",
    api_base_url="https://agentguard.my-company.internal",
    api_key="sk_...",   # served as Bearer token
)
```

## Environment variables

See [`.env.example`](../.env.example) for the complete list. The
non-negotiable ones:

| Variable | Purpose |
| --- | --- |
| `CIRCLE_API_KEY` | Circle Developer API key. Get at <https://developers.circle.com>. |
| `CIRCLE_ENTITY_SECRET` | Generated alongside the API key. Signs Developer-Controlled Wallet calls. |
| `ANTHROPIC_API_KEY` | Claude Haiku 4.5 for the intent layer. |
| `DATABASE_URL` | Postgres connection string. |
| `REDIS_URL` | Redis connection string. |
| `ARC_RPC_URL` | Default `https://rpc.testnet.arc.network`. |

Optional but load-bearing at scale:

| Variable | Purpose |
| --- | --- |
| `USE_MOCK_CIRCLE` | `true` during dev to skip real Circle calls. |
| `USE_MOCK_CLASSIFIER` | `true` to stub the intent layer. |
| `AGENTGUARD_TREASURY_WALLET_ID` | Wallet that writes audit receipts. |
| `LOG_LEVEL` | `info` by default; set `debug` to see full per-payment traces. |

## Upgrade path

- The SDK's wire format is versioned via pydantic-model schemas; API
  additions are backwards-compatible until a `v2` prefix appears.
- Policies are forwarded to the API as raw dicts (`policy.raw`), so the
  policy engine can evolve without bumping the SDK.
- Breaking API changes will be announced in
  [CHANGELOG.md](../CHANGELOG.md) with a migration note.

## Debug checklist

If `guard.pay()` hangs or 500s:

1. `curl http://localhost:4000/health` — API reachable?
2. `docker compose logs api` — look for Circle or Anthropic auth failures.
3. `psql $DATABASE_URL -c 'select count(*) from payments'` — schema applied?
4. Check the operator dashboard at `http://localhost:3000/dashboard` —
   recent decisions + their failure modes are visible there.
