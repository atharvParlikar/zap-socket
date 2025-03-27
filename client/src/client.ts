import { z } from "zod";
import type { EventMap, ZapEvent, ZapServerEvent } from "@zap-socket/types";
import { generateId, serialize, safeJsonParse } from "./utils";

// actual socket payload := {
//   requestId: 16 character id,
//   event: messageType,
//   data: { ... }
// }
//
// Event<input, output>
//  -> send (input autocomplete)
//  -> listen (output autocomplete)

interface CreateClientArgs {
  url: string;
}

interface Packet {
  requestId: string;
  event: string;
  data: any;
}

export class ZapClient {
  private _url: string;
  public ws: WebSocket;
  private _id: string = "";
  public onconnect: (() => void) | null = null;
  private _connected: boolean = false; // here connected means id setup is complete; not connected in the treditional sense.
  private requestMap = new Map<string, { resolve: (value: unknown) => void, reject: (reason: any) => void }>();
  private listen: Map<string, (callback: any) => void> = new Map();

  constructor(url: string) {
    this._url = url;
    this.ws = new WebSocket(url);

    this.ws.onopen = async () => {
      // even tho the server is open
      if (!this._connected) {
        await this.initializeId();
      }

      this.ws.onmessage = (e) => {
        const parsedMsg = safeJsonParse(e.data.toString());
        console.log("parsedMsg: ");
        console.log(parsedMsg);
        if (!parsedMsg) return;
        const { event, requestId, data } = parsedMsg;

        const requestResolutionObj = this.requestMap.get(requestId);
        if (!requestResolutionObj) return;
        const { resolve } = requestResolutionObj;
        resolve(data);
        this.requestMap.delete(requestId);

        this.listen.keys().forEach((eventName) => {
          if (event === eventName) {
            const callback = this.listen.get(event)!;
            callback(event);
          }
        })
      }
    };
  }

  get connected(): boolean {
    return this._connected;
  }

  get id(): string {
    return this._id;
  }

  get url(): string {
    return this._url;
  }

  private initializeId(): Promise<null> {
    return new Promise((resolve) => {
      this.ws.send("OPEN");
      this.ws.onmessage = (event) => {
        if (event.data.startsWith("ID ")) {
          this._id = event.data.substring(3);
          this.ws.onmessage = null;
          if (this.onconnect) {
            this.onconnect();
            this._connected = true;
            resolve(null);
          }
        }
      };
    });
  }

  public sendMessageRaw(event: string, data: any) {
    const requestId = generateId(16);
    const packet = {
      requestId,
      event,
      data
    }
    const serializedPacket = serialize(packet);

    //  TODO: Throw a useful error here:
    if (!serializedPacket) return;
    this.ws.send(serializedPacket);

    return new Promise((resolve, reject) => {
      this.requestMap.set(requestId, { resolve, reject });
    });
  }

  public addEventListener(event: string, callback: (arg: any) => void) {
    this.listen.set(event, callback);
  }

  public removeEventListener(event: string) {
    this.listen.delete(event);
  }
}

type EventHandler<TInput extends z.ZodTypeAny, TOutput> = {
  send: TInput extends z.ZodVoid
  ? () => Promise<TOutput>
  : (input: z.infer<TInput>) => Promise<TOutput>;
  listen: (callback: (data: TOutput) => void) => void;
  unlisten: () => void;
}

type ServerEventHandler<T extends z.ZodTypeAny> = {
  listen: (callback: (data: T) => void) => void;
  unlisten: () => void;
}

export type ZapClientWithEvents<T extends EventMap> = ZapClient & {
  [K in keyof T]:
  T[K] extends ZapServerEvent<any>
  ? ServerEventHandler<T[K]["data"]>
  : T[K] extends ZapEvent<any, any>
  ? EventHandler<T[K]["input"], ReturnType<T[K]["process"]>>
  : never;
};

const getAllPropsAndMethods = (obj: any) => [...new Set([...Object.getOwnPropertyNames(obj), ...Object.getOwnPropertyNames(Object.getPrototypeOf(obj))])];

export const createZapClient = <TEvents extends EventMap>({ url }: CreateClientArgs): ZapClientWithEvents<TEvents> => {
  console.log("createZapClient called");
  const client = new ZapClient(url);

  const proxyHandler: ProxyHandler<ZapClient> = {
    get(target, prop: string, reciever) {
      if (getAllPropsAndMethods(client).includes(prop)) {
        return Reflect.get(target, prop, reciever);
      }
      // here any prop we have is a valid event
      const eventName = prop;
      return {
        send: (input: any) => {
          return client.sendMessageRaw(eventName, input);
        },
        listen: (callback: (input: any) => void) => {
          client.addEventListener(eventName, callback);
        },
        unlisten: () => {
          client.removeEventListener(eventName);
        }
      }
    }
  }

  const clientProxy = new Proxy<ZapClientWithEvents<TEvents>>(client as ZapClientWithEvents<TEvents>, proxyHandler);

  return clientProxy;
};

