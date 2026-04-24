import { Redis } from "ioredis";
import { config } from "./config.js";
import { logger } from "./logger.js";

export type DashboardEvent =
  | { type: "payment.approved"; payload: Record<string, unknown> }
  | { type: "payment.blocked"; payload: Record<string, unknown> }
  | { type: "payment.escalated"; payload: Record<string, unknown> }
  | { type: "incident.new"; payload: Record<string, unknown> }
  | { type: "agent.paused"; payload: { agent_id: string } }
  | { type: "agent.unpaused"; payload: { agent_id: string } };

const CHANNEL = "agentguard:events";

class PubSub {
  private pub: Redis | null = null;
  private sub: Redis | null = null;
  private readonly local = new Set<(ev: DashboardEvent) => void>();
  private redisAnnouncedDown = false;

  constructor() {
    const disabled =
      process.env.AGENTGUARD_DISABLE_REDIS === "1" ||
      process.env.AGENTGUARD_DISABLE_REDIS === "true";
    if (disabled || !config.redis.url) {
      logger.info("pubsub: in-memory only (Redis disabled)");
      return;
    }
    this.tryConnect();
  }

  private tryConnect(): void {
    const opts = {
      lazyConnect: true,
      maxRetriesPerRequest: 1,
      // One attempt per connection — if Redis is down, stay local and shut up.
      retryStrategy: () => null,
      reconnectOnError: () => false,
      enableOfflineQueue: false,
    } as const;

    this.pub = new Redis(config.redis.url, opts);
    this.sub = new Redis(config.redis.url, opts);

    // Attach noop error handlers so ioredis doesn't emit "unhandled error event".
    this.pub.on("error", () => this.announceRedisDown());
    this.sub.on("error", () => this.announceRedisDown());

    this.pub.connect().catch(() => this.announceRedisDown());
    this.sub
      .connect()
      .then(async () => {
        if (!this.sub) return;
        await this.sub.subscribe(CHANNEL);
        this.sub.on("message", (_channel: string, msg: string) => {
          try {
            const ev = JSON.parse(msg) as DashboardEvent;
            for (const listener of this.local) listener(ev);
          } catch {
            // ignore malformed
          }
        });
      })
      .catch(() => this.announceRedisDown());
  }

  private announceRedisDown(): void {
    if (this.redisAnnouncedDown) return;
    this.redisAnnouncedDown = true;
    logger.warn("pubsub: Redis unreachable — running in-memory only");
    try {
      this.pub?.disconnect();
      this.sub?.disconnect();
    } catch {
      /* ignore */
    }
    this.pub = null;
    this.sub = null;
  }

  publish(ev: DashboardEvent): void {
    for (const listener of this.local) listener(ev);
    if (this.pub && this.pub.status === "ready") {
      this.pub.publish(CHANNEL, JSON.stringify(ev)).catch(() => {});
    }
  }

  subscribe(listener: (ev: DashboardEvent) => void): () => void {
    this.local.add(listener);
    return () => this.local.delete(listener);
  }
}

export const pubsub = new PubSub();
