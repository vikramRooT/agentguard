-- AgentGuard Postgres schema.
-- Re-runs are safe (IF NOT EXISTS) so docker-entrypoint-initdb.d can seed
-- an empty DB and `pnpm db:migrate` can be re-applied during development.

CREATE TABLE IF NOT EXISTS agents (
  agent_id            TEXT PRIMARY KEY,
  owner_wallet_id     TEXT,
  circle_wallet_id    TEXT,
  erc8004_identity    TEXT,
  paused              BOOLEAN NOT NULL DEFAULT FALSE,
  policy              JSONB   NOT NULL DEFAULT '{}'::jsonb,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS payments (
  request_id          UUID PRIMARY KEY,
  agent_id            TEXT NOT NULL REFERENCES agents(agent_id) ON DELETE CASCADE,
  to_agent_id         TEXT,
  to_wallet_address   TEXT,
  amount_usdc         NUMERIC(18, 6) NOT NULL,
  asset               TEXT NOT NULL DEFAULT 'USDC',
  intent              TEXT NOT NULL,
  original_task_id    TEXT,
  decision            TEXT NOT NULL CHECK (decision IN ('approved','blocked','escalated')),
  reason              TEXT NOT NULL DEFAULT '',
  trace               JSONB NOT NULL DEFAULT '[]'::jsonb,
  evidence            JSONB NOT NULL DEFAULT '{}'::jsonb,
  arc_tx_hash         TEXT,
  audit_tx_hash       TEXT,
  latency_ms          NUMERIC(10, 2) NOT NULL DEFAULT 0,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS payments_agent_created_idx ON payments (agent_id, created_at DESC);
CREATE INDEX IF NOT EXISTS payments_decision_idx ON payments (decision, created_at DESC);

CREATE TABLE IF NOT EXISTS incidents (
  incident_id         UUID PRIMARY KEY,
  request_id          UUID REFERENCES payments(request_id) ON DELETE SET NULL,
  agent_id            TEXT NOT NULL REFERENCES agents(agent_id) ON DELETE CASCADE,
  decision            TEXT NOT NULL,
  reason              TEXT NOT NULL,
  trace               JSONB NOT NULL DEFAULT '[]'::jsonb,
  evidence            JSONB NOT NULL DEFAULT '{}'::jsonb,
  arc_audit_tx_hash   TEXT,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS incidents_agent_idx ON incidents (agent_id, created_at DESC);

-- Anomaly baseline: per (agent, recipient) statistics kept rolling.
CREATE TABLE IF NOT EXISTS anomaly_baseline (
  agent_id            TEXT NOT NULL,
  recipient           TEXT NOT NULL,
  sample_count        INTEGER NOT NULL DEFAULT 0,
  amount_mean         NUMERIC(18, 6) NOT NULL DEFAULT 0,
  amount_m2           NUMERIC(36, 12) NOT NULL DEFAULT 0, -- Welford running variance
  first_seen          TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_seen           TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (agent_id, recipient)
);

CREATE TABLE IF NOT EXISTS audit_log (
  log_id              UUID PRIMARY KEY,
  agent_id            TEXT NOT NULL,
  request_id          UUID,
  decision            TEXT NOT NULL,
  arc_tx_hash         TEXT,
  metadata            JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);
