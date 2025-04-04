import { z } from "zod";
import type { EventMap, ZapEvent, ZapServerEvent, ZapStream } from "@zap-socket/types";
import { generateId, serialize, safeJsonParse } from "./utils";

// actual socket payload := {
//   requestId: 16 character id,
//   streamId: 16 character id,
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

//  TODO: convert this to zod for better validation.
interface Packet {
  requestId: string;
  streamId: string;
  event: string;
  data: any;
  fragment: any;
  done: boolean;
}

class AsyncQueue<T> {
  private queue: T[] = [];
  private resolvers: ((value: T) => void)[] = [];

  push(value: T) {
    const resolver = this.resolvers.shift();
    if (resolver) {
      resolver(value);
    } else {
      this.queue.push(value);
    }
  }

  async pop(): Promise<T> {
    return new Promise((resolve) => {
      const value = this.queue.shift();
      if (value !== undefined) {
        resolve(value);
      } else {
        this.resolvers.push(resolve);
      }
    });
  }
}

export class ZapClient {
  private _url: string;
  public ws: WebSocket;
  private _id: string = "";
  public onconnect: (() => void) | null = null;
  private _connected: boolean = false; // here connected means id setup is complete; not connected in the treditional sense.
  private requestMap = new Map<string, { resolve: (value: unknown) => void, reject: (reason: any) => void }>();
  private listen: Map<string, (data: any) => void> = new Map();
  public activeStreams: Map<string, AsyncQueue<any>> = new Map();

  constructor(url: string) {
    this._url = url;
    this.ws = new WebSocket(url);

    this.ws.onopen = async () => {
      // even tho the server is open
      if (!this._connected) {
        await this.initializeId();
      }

      this.ws.onmessage = (e) => {
        const parsedMsg: Packet = safeJsonParse(e.data.toString());
        if (!parsedMsg) return;
        const { event, requestId, streamId, data, fragment, done } = parsedMsg;

        if (requestId) {
          const requestResolutionObj = this.requestMap.get(requestId);
          if (!requestResolutionObj) return;
          const { resolve } = requestResolutionObj;
          resolve(data);
          this.requestMap.delete(requestId);
        } else if (streamId) {
          const messageQueue = this.activeStreams.get(streamId);
          if (!messageQueue) {
            //  TODO:  nice error message
            return;
          }
          if (done) {
            this.activeStreams.delete(streamId);
            return;
          }
          messageQueue.push(fragment);
        }

        const listenerCallback = this.listen.get(event);
        if (listenerCallback) {
          listenerCallback(event);
        }
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

  public startStream(streamName: string, data: any) {
    const streamId = generateId(16);
    this.activeStreams.set(streamId, new AsyncQueue());
    const packet = {
      stream: streamName,
      streamId,
      data
    }
    const serializedPacket = serialize(packet);
    if (!serializedPacket) {
      //  TODO: throw a nice error
      return;
    }
    this.ws.send(serializedPacket);
    return streamId;
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

type StreamHandler<TInput extends z.ZodTypeAny, TOutput> = {
  send: TInput extends z.ZodVoid
  ? () => AsyncGenerator<TOutput, void, unknown>
  : (input: z.infer<TInput>) => AsyncGenerator<TOutput, void, unknown>;
}

export type ZapClientWithEvents<T extends EventMap> = ZapClient & {
  events: {
    [K in keyof T as T[K] extends ZapStream<any, any> ? never : K]:
    T[K] extends ZapServerEvent<any>
    ? ServerEventHandler<T[K]["data"]>
    : T[K] extends ZapEvent<any, any>
    ? EventHandler<T[K]["input"], ReturnType<T[K]["process"]>>
    : unknown;
  };
  streams: {
    [K in keyof T as T[K] extends ZapStream<any, any> ? K : never]: T[K] extends ZapStream<any, any> ? StreamHandler<T[K]["input"], ReturnType<T[K]["process"]>> : unknown;
  };
};

export const createZapClient = <TEvents extends EventMap>({ url }: CreateClientArgs): ZapClientWithEvents<TEvents> => {
  const client = new ZapClient(url);

  const proxyHandler: ProxyHandler<ZapClientWithEvents<TEvents>> = {
    get(target, prop: string, receiver) {
      if (prop === "events") {
        return new Proxy({} as any, {
          get(eventsTarget, eventName: string, eventsReceiver) {
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
            };
          }
        });
      }

      if (prop === "streams") {
        return new Proxy({} as any, {
          get(target, streamName, reciver) {
            return {
              send: async function* (data: any) {
                const streamId = client.startStream(streamName as string, data); //  TODO: investigate if streamName is not a string...
                const messageQueue = client.activeStreams.get(streamId as string);
                if (!messageQueue) return;
                while (true) {
                  yield await messageQueue.pop();
                }
              }
            }
          }
        });
      }

      return Reflect.get(target, prop, receiver);
    }
  };

  return new Proxy<ZapClientWithEvents<TEvents>>(
    client as ZapClientWithEvents<TEvents>,
    proxyHandler
  );
};
