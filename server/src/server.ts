import { WebSocketServer, WebSocket } from "ws";
import { serialize, deserialize, generateId } from "./utils";
import type { EventMap, MiddlewareMetadata, MiddlwareContext, MiddlwareMsg, ZapEvent, ZapServerEvent, ZapStream } from "@zap-socket/types";

interface ZapServerConstructorT {
  port: number;
  events?: EventMap
}

const isClientEvent = (event: any): event is ZapEvent<any, any> => {
  return "process" in event; // both zapEvent and zapStream have process in them.
}

export class ZapServer<T extends EventMap> {
  public wss: WebSocketServer;
  private wsToId: Map<WebSocket, string>;
  private idToWs: Map<string, WebSocket>;
  private _events: T = {} as T;

  constructor({ port, events = {} as T }: ZapServerConstructorT, callback?: () => void) {
    this.wss = new WebSocketServer({ port });
    this.wsToId = new Map();
    this.idToWs = new Map();
    this._events = events as T;

    this.wss.on("listening", () => {
      if (callback) callback();
    })

    this.wss.on("connection", (ws, req) => {
      ws.on("message", (message) => {
        if (!this.wsToId.get(ws) && message.toString() === "OPEN") {
          const id = generateId();
          this.wsToId.set(ws, id);
          this.idToWs.set(id, ws);
          ws.send("ID " + id);
          console.log(`client ${id} connected.`);
          return;
        }

        const clientId = this.wsToId.get(ws)!;

        const parsedMessage = deserialize<{
          requestId: string;
          streamId: string;
          event: string;
          stream: string;
          data: any;
        }>(message.toString());

        if (!parsedMessage) return;

        const { event, stream, data, requestId, streamId } = parsedMessage;
        const key = event || stream;
        const eventObj = this._events[key];

        if (!eventObj || !isClientEvent(eventObj)) return;

        const { process, middleware } = eventObj;

        // Setup middleware context
        const ctx: MiddlwareContext = {};
        if (middleware) {
          for (const m of middleware) {
            const metadata: MiddlewareMetadata = {
              id: clientId,
              ip: req.socket.remoteAddress!,
              timestamp: Date.now(),
              size: message.toString().length,
            };

            const msg: MiddlwareMsg = {
              event: key,
              data: parsedMessage,
              metadata,
            };

            if (!m(ctx, msg)) return;
          }
        }

        // All middleware passed
        const context = { server: this, id: this.wsToId.get(ws)!, buffer: ctx };

        if (requestId) { // req-res premitive
          const result = process(data, context);
          if (!result) {
            ws.send("ACK");
            return;
          }
          const serialized = serialize({ requestId, event: key, data: result });
          if (!serialized) return;
          ws.send(serialized);
        } else if (streamId) { // stream premitive
          const consumeStream = async () => {
            const result: AsyncGenerator<any, void, unknown> = process(data, context);
            for await (const fragment of result) {
              this.sendMessageRaw(clientId, { streamId, fragment });
            }
            this.sendMessageRaw(clientId, { streamId, done: true });
          };
          consumeStream();
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

  public sendMessageRaw(clientId: string, data: any) {
    const ws = this.idToWs.get(clientId as string);
    //  TODO: throw a nice error
    if (!ws) return;
    const serializedData = serialize(data);
    //  TODO: throw a nice error
    if (!serializedData) return;
    ws.send(serializedData);
  }

  public sendMessage(event: keyof T, clientId: string, data: any) {
    const ws = this.idToWs.get(clientId);
    //  TODO: throw a nice error
    if (!ws) return;
    const packet = {
      event,
      data
    }
    const serializedPacket = serialize(packet);

    //  TODO: throw a nice error
    if (!serializedPacket) return;

    ws.send(serializedPacket);
  }

  public broadcastRaw(data: any) {
    const serializedData = serialize(data);
    if (!serializedData) {
      //  TODO: throw a nice error
      return;
    }
    this.idToWs.forEach((ws) => {
      ws.send(serializedData);
    })
  }

  public broadcast(event: keyof T, data: any) {
    const packet = {
      event,
      data
    };

    const serializedPacket = serialize(packet)!;

    if (!serializedPacket) return;

    this.idToWs.forEach((ws) => {
      ws.send(serializedPacket);
    });
  }

  public selectiveBroascast(event: string, data: any, connections: string[]) {
    const serialized = serialize(data);
    if (!serialized) {
      //  TODO: throw a nice error
      return;
    }
    const packet = {
      event,
      data
    };

    const serializedPacket = serialize(packet)!; // if data is serializable then packet is too, so no need to check

    connections
      .flatMap(x => this.idToWs.get(x) ?? [])
      .forEach((ws) => {
        ws.send(serializedPacket);
      });
  }

  get event() {
    return Object.fromEntries(Object.keys(this._events).map((eventName) => {
      //  HACK: use a better method to determine the type of event.
      if ("data" in this._events[eventName]) {
        // event is server event
        return [eventName, {
          send: (clientId: string, data?: any) => {
            const packet = {
              event: eventName,
              data
            }
            this.sendMessageRaw(clientId, packet);
          },
          broadcast: (data?: any) => {
            const packet = {
              event: eventName,
              data
            }
            this.broadcastRaw(packet);
          }
        }]
      }
      return null;
    }).filter(entry => entry !== null)) as { [K in keyof T as T[K] extends ZapServerEvent<any> ? K : never]: {
      send: (clientId: string, data?: (T[K] extends ZapServerEvent<any> ? T[K]["data"] : never)) => void;
      broadcast: (data?: (T[K] extends ZapServerEvent<any> ? T[K]["data"] : never)) => void;
    }
      }
  }

  get clients() {
    return new Set(this.idToWs.keys())
  }

  get socketMap() {
    return this.idToWs;
  }
}

export const createZapServer = <T extends EventMap>({ port, events }: ZapServerConstructorT, callback?: () => void) => {
  const server = new ZapServer<T>({ port, events }, callback);
  return server;
}
