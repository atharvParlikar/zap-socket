import { WebSocketServer, WebSocket } from "ws";
import { generateId } from "./utils";
import type { EventMap } from "./events";

interface ZapServerConstructorT {
  port: number;
}

export class ZapServer {
  private wss: WebSocketServer;
  private wsToId: Map<WebSocket, string>;
  private idToWs: Map<string, WebSocket>;
  private events: EventMap = {};

  constructor({ port }: ZapServerConstructorT) {
    this.wss = new WebSocketServer({ port });
    this.wsToId = new Map();
    this.idToWs = new Map();

    this.wss.on("connection", (ws) => {
      const clientId = generateId();
      console.log(`client ${clientId} connected`);
      this.wsToId.set(ws, clientId);
      this.idToWs.set(clientId, ws);

      ws.on("message", (message) => {
        for (const [event, { process }] of Object.entries(this.events)) {
          const parsedMessage = JSON.parse(message.toString());
          if (parsedMessage["type"] === event) {
            const { input } = parsedMessage
            process(input);
          }
        }
      });

      ws.on("close", () => {
        this.removeClient(ws);
      });

      ws.on("error", (err) => {
        console.error(`WebSocket error for ${clientId}:`, err);
      });
    });
  }

  private removeClient(ws: WebSocket) {
    const clientId = this.wsToId.get(ws);
    if (clientId) {
      this.wsToId.delete(ws);
      this.idToWs.delete(clientId);
    }
  }

  public attachEvents<T extends EventMap>(events: T) {
    this.events = events;
  }
}

export const createZapServer = ({ port }: { port: number }) => {
  return new ZapServer({ port });
}
