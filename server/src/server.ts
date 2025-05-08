import { WebSocketServer, WebSocket, RawData } from "ws";
import { IncomingMessage } from "http";
import { serialize, deserialize, generateId } from "./utils";
import type { EventMap, MiddlewareMetadata, MiddlwareContext, MiddlwareMsg, ZapEvent, ZapServerEvent } from "@zap-socket/types";
import { ZodType, z } from "zod";

type CorsOptions = {
  origin: string[];
  methods: string[];
  headers: string[];
  credentials: boolean;
}

type ZapServerConstructorT = {
  port: number;
  events?: EventMap;
  cors?: CorsOptions;
  options?: {
    heartbeatPingFrequency: number
  }
}

const isClientEvent = (event: any): event is ZapEvent<any, any> => {
  return "process" in event; // both zapEvent and zapStream have process in them.
}

type ExtractSendData<T, K extends keyof T> =
  T[K] extends ZapServerEvent<any>
  ? T[K]['data']
  : T[K] extends ZapEvent<any, any>
  ? T[K]['emitType'] extends ZodType<any, any, any>
  ? z.infer<T[K]['emitType']>
  : ReturnType<T[K]['process']> extends undefined
  ? undefined
  : ReturnType<T[K]['process']>
  : never;


export class ZapServer<T extends EventMap> {
  // public server: http.Server;
  public wss: WebSocketServer;
  public onconnect: (handler: (ctx: { id: string, ws: WebSocket }) => void) => void;
  private onconnectHandler: (ctx: { id: string, ws: WebSocket }) => void;
  private wsToId: Map<WebSocket, string>;
  private idToWs: Map<string, WebSocket>;
  private _events: T = {} as T;
  private heartbeatMiss = new Map<string, number>();

  constructor({ port, events = {} as T, options }: ZapServerConstructorT, callback?: () => void) {
    // this.server = http.createServer((req, res) => {
    //
    //   if (cors) {
    //     const origin = req.headers.origin;
    //
    //     if (origin && cors.origin && (cors.origin.includes(origin) || cors.origin.includes("*"))) {
    //       res.setHeader('Access-Control-Allow-Origin', origin);
    //     }
    //     if (cors.methods) {
    //       res.setHeader("Access-Control-Allow-Methods", cors.methods.join(", "));
    //     }
    //     if (cors.headers) {
    //       res.setHeader("Access-Control-Allow-Headers", cors.headers.join(", "));
    //     }
    //     if (cors.credentials !== undefined) {
    //       res.setHeader("Access-Control-Allow-Credentials", cors.credentials ? "true" : "false");
    //     }
    //   }
    //
    //   // pre-flight response
    //   if (req.method === "OPTIONS") {
    //     res.writeHead(204);
    //     res.end();
    //     return;
    //   }
    //
    //   res.writeHead(404);
    //   res.end();
    // });

    this.wss = new WebSocketServer({ port });
    this.wsToId = new Map();
    this.idToWs = new Map();
    this._events = events as T;
    this.onconnectHandler = () => { };
    this.onconnect = (handler) => {
      this.onconnectHandler = handler;
    }

    const seconds = options?.heartbeatPingFrequency ?? 5;
    const frequency = (Number.isFinite(seconds) && seconds > 0 ? seconds : 5) * 1000;
    setInterval(() => this.heartbeat(), frequency);

    this.wss.on("listening", () => {
      if (callback) callback();
    });

    this.wss.on("connection", (ws, req) => {

      ws.on("message", (message) => {
        this.handleMessage(ws, req, message);
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

  private heartbeat() {
    this.idToWs.forEach((ws, id) => {
      const misses = this.heartbeatMiss.get(id) ?? 0;

      if (misses > 2) {
        if (ws) ws.close();
        this.idToWs.delete(id);
        this.heartbeatMiss.delete(id);
      } else {
        this.heartbeatMiss.set(id, misses + 1);
      }
    });

    this.broadcastRaw("heartbeat");
  }

  private async handleMessage(ws: WebSocket, req: IncomingMessage, message: RawData) {
    const id = this.wsToId.get(ws);
    // setting up socket id
    if (!id && message.toString() === "OPEN") {
      const id = generateId();
      this.wsToId.set(ws, id);
      this.idToWs.set(id, ws);
      ws.send("ID " + id);
      this.onconnectHandler({
        id,
        ws
      });
      return;
    } else if (id && message.toString() === "heartbeat") {
      this.heartbeatMiss.set(id, 0);
    }

    const clientId = this.wsToId.get(ws)!;

    const parsedMessage = deserialize<{
      requestId: string;
      streamId: string;
      event: string;
      stream: string;
      data: any;
      batch: boolean;
    }>(message.toString());

    if (!parsedMessage) return;

    const { event, stream, data, requestId, streamId, batch } = parsedMessage;
    const key = event || stream;
    const eventObj = this._events[key];

    if (!eventObj || !isClientEvent(eventObj)) return;

    // Type validation.
    const inputType = eventObj.input as z.ZodTypeAny;

    const { success, error } = inputType.safeParse(data);

    if (!success && error) {
      // check if the message is of req-res
      if (requestId) {

      }
      return;
    }

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

        let shouldPass = m(ctx, msg);
        shouldPass = shouldPass instanceof Promise ? await shouldPass : shouldPass;

        if (!shouldPass) return;
      }
    }

    // All middleware passed
    const context = { server: this, id: this.wsToId.get(ws)!, buffer: ctx };

    if (requestId) { // req-res premitive
      let result;

      if (batch) {
        result = data.map((part: any) => process(part, context));
      } else {
        result = process(data, context);
        if (result instanceof Promise) {
          result = await result;
        }
      }

      if (result === undefined) { // just ACK the request process returns nothing
        ws.send("ACK " + requestId);
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

  get events() {
    return Object.fromEntries(
      Object.keys(this._events).map((eventName) => {
        return [
          eventName,
          {
            send: (clientId: string, data?: any) => {
              const packet = {
                event: eventName,
                data
              };
              this.sendMessageRaw(clientId, packet);
            },
            broadcast: (data?: any) => {
              const packet = {
                event: eventName,
                data
              };
              this.broadcastRaw(packet);
            }
          }
        ];
      })
    ) as {
        [K in keyof T as T[K] extends ZapServerEvent<any> | ZapEvent<any, any> ? K : never]: {
          send: (
            clientId: string,
            data?: ExtractSendData<T, K>
          ) => void;
          broadcast: (data?: ExtractSendData<T, K>) => void;
        }
      }
  }

  get clients() {
    return this.idToWs.keys().toArray();
  }

  get socketMap() {
    return this.idToWs;
  }
}

export const createZapServer = <T extends EventMap>({ port, events, cors, options }: ZapServerConstructorT, callback?: () => void) => {
  const server = new ZapServer<T>({ port, events, cors, options }, callback);
  return server;
}
