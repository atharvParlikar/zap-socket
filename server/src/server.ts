import { WebSocketServer, WebSocket } from "ws";
import { serialize, deserialize, generateId } from "./utils";
import type { EventMap, ZapEvent, ZapServerEvent } from "@zap-socket/types";

interface ZapServerConstructorT {
  port: number;
  events?: EventMap
}

const isZapEvent = (event: any): event is ZapEvent<any, any> => {
  return "process" in event;
}

export class ZapServer<T extends EventMap> {
  private wss: WebSocketServer;
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

    this.wss.on("connection", (ws) => {
      ws.on("message", (message) => {
        if (!this.wsToId.get(ws)) {
          const id = generateId();
          this.wsToId.set(ws, id);
          this.idToWs.set(id, ws);
          ws.send("ID " + id);
          console.log(`client ${id} connected.`);
          return;
        }


        for (const [event, eventObj] of Object.entries(this._events)) {
          if (!isZapEvent(eventObj)) continue; // skip server events

          const { process } = eventObj;
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
            const result = process(data, { server: this });
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

  public sendMessageRaw(clientId: string, data: any) {
    const ws = this.idToWs.get(clientId);
    //  TODO: throw a nice error
    if (!ws) return;
    const serializedData = serialize(data);
    //  TODO: throw a nice error
    if (!serializedData) return;
    ws.send(serializedData);
  }

  get event() {
    return Object.fromEntries(Object.keys(this._events).map((eventName) => {
      //  HACK: use a better method to determine the type of event.
      if ("data" in this._events[eventName]) {
        // event is server event
        return [eventName, {
          send: (clientId: string, data: any) => {
            const packet = {
              event: eventName,
              data
            }
            this.sendMessageRaw(clientId, packet);
          }
        }]
      }
      return null;
    }).filter(entry => entry !== null)) as { [K in keyof T as T[K] extends ZapServerEvent<any> ? K : never]: {
      send: (data: (T[K] extends ZapServerEvent<any> ? T[K]["data"] : never)) => void;
    }
      }
  }
}

export const createZapServer = <T extends EventMap>({ port, events }: ZapServerConstructorT, callback?: () => void) => {
  const server = new ZapServer<T>({ port, events }, callback);
  return server;
}
