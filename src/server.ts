import { WebSocketServer, WebSocket } from "ws";
import { generateId } from "./utils";

interface ZapServerConstructorT {
  port: number;
}

type EventMap = {
  [event: string]: {
    input: any;
    process: (args: { input: any }) => any;
  };
};

// 1. connect to websocket first
// 2. add events later

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
            process({ input: null });
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

export const createEvents = <T extends EventMap>(events: T) => {
  return events;
}

const server = createZapServer({ port: 8000 });
const events = createEvents({
  ping: {
    input: {},
    process: ({ }) => console.log("Got a ping")
  }
});

server.attachEvents(events);
