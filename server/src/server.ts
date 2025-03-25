import { WebSocketServer, WebSocket } from "ws";
import { serialize, deserialize, generateId } from "./utils";
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
      ws.on("message", (message) => {
        const parsedMessage = deserialize(message.toString());
        console.log("got message: ", parsedMessage);

        if (!this.wsToId.get(ws)) {
          const id = generateId();
          this.wsToId.set(ws, id);
          this.idToWs.set(id, ws);
          ws.send("ID " + id);
          console.log(`client ${id} connected.`);
          return;
        }


        for (const [event, { process }] of Object.entries(this.events)) {
          const parsedMessage = deserialize<{
            requestId: string;
            event: string;
            data: any;
          }>(message.toString());
          if (
            parsedMessage &&
            parsedMessage["event"] === event
          ) {
            const { data, requestId } = parsedMessage
            const result = process(data);
            const serialized = serialize({ requestId, event, data: result });
            //  TODO: throw some nice error: only return stuff that is serializable
            // i.e. primary data types and objects
            if (!serialized) return;
            ws.send(serialized);
          }
        }
      });

      ws.on("close", () => {
        this.removeClient(ws);
      });

      ws.on("error", (err) => {
        console.error(`WebSocket error for ${this.wsToId.get(ws)}:`, err);
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
