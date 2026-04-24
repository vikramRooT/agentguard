import type { Server } from "node:http";
import { WebSocketServer, type WebSocket } from "ws";
import { logger } from "./logger.js";
import { pubsub } from "./pubsub.js";

export function attachWebSocket(server: Server): WebSocketServer {
  const wss = new WebSocketServer({ server, path: "/ws" });

  const clients = new Set<WebSocket>();

  wss.on("connection", (ws) => {
    clients.add(ws);
    ws.send(JSON.stringify({ type: "hello", payload: { ts: Date.now() } }));
    ws.on("close", () => clients.delete(ws));
    ws.on("error", () => clients.delete(ws));
  });

  const unsubscribe = pubsub.subscribe((ev) => {
    const msg = JSON.stringify(ev);
    for (const client of clients) {
      if (client.readyState === client.OPEN) {
        client.send(msg);
      }
    }
  });

  wss.on("close", () => unsubscribe());
  logger.info({ path: "/ws" }, "websocket attached");
  return wss;
}
