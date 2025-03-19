import { WebSocketServer, WebSocket } from "ws";
import { generateId } from "./utils";

interface CreateZapConstructorT {
  port: number;
}

export class CreateZapSocket {
  private wss: WebSocketServer;
  private wsToId: Map<WebSocket, string>;
  private idToWs: Map<string, WebSocket>;

  constructor({ port }: CreateZapConstructorT) {
    this.wss = new WebSocketServer({ port });
    this.wsToId = new Map();
    this.idToWs = new Map();

    this.wss.on("connection", (ws) => {
      const clientId = generateId();
      this.wsToId.set(ws, clientId);
      this.idToWs.set(clientId, ws);

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
}
