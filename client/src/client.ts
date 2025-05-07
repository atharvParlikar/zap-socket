import { z, ZodTypeAny } from "zod";
import type { EventMap, ZapEvent, ZapServerEvent, ZapStream } from "@zap-socket/types";
import { generateId, serialize, safeJsonParse } from "./utils";

// actual socket payload := {
//   requestId: 16 character id,
//   streamId: 16 character id,
//   event: messageType,
//   data: { ... },
//   fragment: { ... },
//   done: boolean,
//   batch: boolean
// }
//
// Event<input, output>
//  -> send (input autocomplete)
//  -> listen (output autocomplete)
//  -> unlisten

const HEARTBEAT = 'heartbeat';

interface CreateClientArgs {
  url: string;
  reconnect?: {
    enabled?: boolean;
    maxAttempts?: number;
    initialDelay?: number;
    maxDelay?: number;
    jitter?: boolean;
  };
}

const DEFAULT_RECONNECT_OPTIONS = {
  enabled: true,
  maxAttempts: 10,
  initialDelay: 1000,  // 1 second
  maxDelay: 30000,     // 30 seconds
  jitter: true,        // Add randomization to avoid thundering herd
};

const REQ_ID_LEN = 16;

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
  public ondisconnect: (() => void) | null = null;
  public onreconnect: ((attempt: number) => void) | null = null;
  public onreconnectfailed: (() => void) | null = null;
  private _connected: boolean = false; // here connected means id setup is complete; not connected in the traditional sense.
  private _isConnecting: boolean = false;
  private _reconnectOptions: Required<CreateClientArgs["reconnect"]>;
  private _reconnectAttempts: number = 0;
  private _reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private requestMap = new Map<string, { resolve: (value: unknown) => void, reject: (reason: any) => void }>();
  private listen: Map<string, (data: any) => void> = new Map();
  public _activeStreams: Map<string, AsyncQueue<any>> = new Map();

  constructor(url: string, reconnectOptions: CreateClientArgs["reconnect"] = {}) {
    this.ws = {} as WebSocket; // to slience the ts compiler
    this._url = url;
    this._reconnectOptions = {
      ...DEFAULT_RECONNECT_OPTIONS,
      ...reconnectOptions
    };
    this._connect();
  }

  private _connect() {
    if (this._isConnecting) return;

    this._isConnecting = true;
    this.ws = new WebSocket(this._url);

    this.ws.onopen = async () => {
      this._isConnecting = false;
      this._reconnectAttempts = 0; // Reset reconnect attempts on successful connection

      // even though the server is open
      if (!this._connected) {
        await this.initializeId();
      }

      this.ws.onmessage = (e) => {
        const message: string = e.data.toString();

        console.log(typeof message);
        console.log(message.length);

        if (message === HEARTBEAT) {
          this.sendMessageRaw(HEARTBEAT);
        }

        if (message.startsWith("ACK")) {
          const requestId = message.substring(4);
          const resolve = this.requestMap.get(requestId)?.resolve;
          if (!resolve) return;
          resolve(null);
          this.requestMap.delete(requestId);
        }

        const parsedMsg: Packet = safeJsonParse(e.data.toString());
        if (!parsedMsg) return;
        const { event, requestId, streamId, data, fragment, done } = parsedMsg;

        if (requestId) { // for req-res
          const requestResolutionObj = this.requestMap.get(requestId);
          if (!requestResolutionObj) return;
          const { resolve } = requestResolutionObj;
          resolve(data);
          this.requestMap.delete(requestId);
        } else if (streamId) { // for streams
          const messageQueue = this._activeStreams.get(streamId);
          if (!messageQueue) {
            //  TODO:  nice error message
            return;
          }
          if (done) {
            this._activeStreams.delete(streamId);
            return;
          }
          messageQueue.push(fragment);
        }

        // for listeners
        const listenerCallback = this.listen.get(event);
        if (listenerCallback) {
          listenerCallback(data);
        }
      };
    };

    this.ws.onclose = (event) => {
      this._isConnecting = false;
      this._connected = false;

      if (this.ondisconnect) {
        this.ondisconnect();
      }

      // Handle reconnection
      if (this._reconnectOptions?.enabled) {
        this._scheduleReconnect();
      }
    };

    this.ws.onerror = (error) => {
      // WebSocket error events don't provide much useful information
      // The connection will be closed after an error, triggering onclose
      console.error("WebSocket error:", error);
    };
  }

  private _scheduleReconnect() {
    if (this._reconnectTimer) {
      clearTimeout(this._reconnectTimer);
    }

    // If we've exceeded max attempts, stop trying
    if (this._reconnectAttempts >= this._reconnectOptions?.maxAttempts!) {
      if (this.onreconnectfailed) {
        this.onreconnectfailed();
      }
      return;
    }

    // Calculate the delay with exponential backoff
    const attempt = this._reconnectAttempts + 1;
    let delay = Math.min(
      this._reconnectOptions?.initialDelay! * Math.pow(2, attempt),
      this._reconnectOptions?.maxDelay!
    );

    // Add jitter to prevent thundering herd problem
    if (this._reconnectOptions?.jitter) {
      delay = delay * (0.5 + Math.random() * 0.5);
    }

    this._reconnectTimer = setTimeout(() => {
      this._reconnectAttempts++;

      if (this.onreconnect) {
        this.onreconnect(this._reconnectAttempts);
      }

      this._connect();
    }, delay);
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

  // public sendMessage(event: string, data: any) {
  //   console.log("sendMessage called");
  //   const packet = {
  //     event,
  //     data
  //   }
  //
  //   this.sendMessageRaw(packet);
  // }

  public sendReq(event: string, data: any) {
    const requestId = generateId(REQ_ID_LEN);
    const packet = {
      requestId,
      event,
      data
    }

    this.sendMessageRaw(packet);

    const promise = new Promise((resolve, reject) => {
      this.requestMap.set(requestId, { resolve, reject });
    });

    return promise;
  }

  public batchSendMessage(event: string, data: any[]) {
    const requestId = generateId(REQ_ID_LEN);
    const packet = {
      requestId,
      event,
      data,
      batch: true
    }

    this.sendMessageRaw(packet);

    const promise = new Promise((resolve, reject) => {
      this.requestMap.set(requestId, { resolve, reject });
    });

    return promise;
  }

  public sendMessageRaw(data: any) {
    const serializedData = serialize(data);
    if (!serializedData) return;

    if (this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(serializedData);
    } else {
      // Handle case where we try to send while disconnected
      // Could queue messages and send once reconnected
      throw new Error("Cannot send message, WebSocket is not connected");
    }
  }

  public startStream(streamName: string, data: any) {
    const streamId = generateId(16);
    this._activeStreams.set(streamId, new AsyncQueue());
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

    if (this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(serializedPacket);
      return streamId;
    } else {
      throw new Error("Cannot start stream, WebSocket is not connected");
    }
  }

  public addEventListener(event: string, callback: (arg: any) => void) {
    this.listen.set(event, callback);
  }

  public removeEventListener(event: string) {
    this.listen.delete(event);
  }

  // Manually close the connection
  public close() {
    if (this._reconnectTimer) {
      clearTimeout(this._reconnectTimer);
      this._reconnectTimer = null;
    }

    if (this.ws) {
      this.ws.close();
    }
  }

  // Manually trigger reconnection
  public reconnect() {
    this.close();
    this._reconnectAttempts = 0; // Reset attempt counter for manual reconnect
    this._connect();
  }
}

type EventHandler<TInput extends z.ZodTypeAny, TOutput> = {
  send: TInput extends z.ZodVoid
  ? () => Promise<TOutput>
  : (input: z.infer<TInput>) => Promise<TOutput>;
  batch: (input: z.infer<TInput>[]) => Promise<TOutput>;
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
  // events: {
  //   [K in keyof T as T[K] extends ZapEvent<any, any> | ZapServerEvent<any> ? K : never]:
  //   T[K] extends ZapServerEvent<any>
  //   ? ServerEventHandler<T[K]["data"]>
  //   : (T[K] extends ZapEvent<any, any>
  //     ? (T[K] extends ZapStream<any, any>
  //       ? never
  //       : EventHandler<T[K]["input"], ReturnType<T[K]["process"]>>)
  //     : unknown)
  // };

  events: {
    [K in keyof T as T[K] extends ZapStream<any, any> ? never : K]:
    T[K] extends ZapServerEvent<any>
    ? ServerEventHandler<T[K]["data"]>
    : (
      T[K] extends ZapEvent<any, any>
      ? EventHandler<
        T[K]["input"],
        ReturnType<T[K]["process"]> extends void
        ? (
          T[K]["emitType"] extends ZodTypeAny
          ? T[K]["emitType"] : undefined
        )
        : ReturnType<T[K]["process"]>>
      : unknown
    )
  },

  streams: {
    [K in keyof T as T[K] extends ZapStream<any, any> ? K : never]: T[K] extends ZapStream<any, any> ? StreamHandler<T[K]["input"], ReturnType<T[K]["process"]>> : unknown;
  };
};

export const createZapClient = <TEvents extends EventMap>({ url, reconnect }: CreateClientArgs): ZapClientWithEvents<TEvents> => {
  const client = new ZapClient(url, reconnect);

  const proxyHandler: ProxyHandler<ZapClientWithEvents<TEvents>> = {
    get(target, prop: string, receiver) {
      if (prop === "events") {
        return new Proxy({} as any, {
          get(eventsTarget, eventName: string, eventsReceiver) {
            return {
              send: (input: any) => {
                return client.sendReq(eventName, input);
              },
              batch: (input: any[]) => {
                return client.batchSendMessage(eventName, input);
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
                const messageQueue = client._activeStreams.get(streamId as string);
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
