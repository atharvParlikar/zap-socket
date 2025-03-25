import { z } from "zod";
import { EventMap } from "./types";
import { generateId, serialize, deserialize, safeJsonParse } from "./utils";

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
  private url: string;
  public ws: WebSocket;
  private _id: string = "";
  public onconnect: (() => void) | null = null;
  private _connected: boolean = false; // here connected means id setup is complete; not connected in the treditional sense.
  private requestMap = new Map<string, { resolve: (value: unknown) => void, reject: (reason: any) => void }>();
  private events: string[];

  constructor(url: string, events: string[]) {
    this.url = url;
    this.events = events;
    this.ws = new WebSocket(url);

    this.ws.onopen = async () => {
      // even tho the server is open
      if (!this._connected) {
        await this.initializeId();
      }

      this.ws.onmessage = (e) => {
        const parsedMsg = safeJsonParse(e.data.toString());
        console.log(parsedMsg);
        if (!parsedMsg) return;
        const { event, requestId, data } = parsedMsg;

        console.log(this.events);

        if (!this.events.includes(event)) return;

        const requestResolutionObj = this.requestMap.get(requestId);
        if (!requestResolutionObj) return;
        const { resolve } = requestResolutionObj;
        resolve(data);
      }
    };
  }

  get connected(): boolean {
    return this._connected;
  }

  get id(): string {
    return this._id;
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
      this.requestMap.set(event, { resolve, reject });
    });
  }
}

type EventHandler<TInput extends z.ZodTypeAny, TOutput> = {
  send: TInput extends z.ZodVoid
  ? () => Promise<TOutput>
  : (input: z.infer<TInput>) => Promise<TOutput>;
  listen: (callback: (data: TOutput) => void) => void;
}

export type ZapClientWithEvents<T extends EventMap> = ZapClient & {
  [K in keyof T]: EventHandler<T[K]["input"], ReturnType<T[K]["process"]>>
}

export const createZapClient = <TEvents extends EventMap>({ url }: CreateClientArgs): ZapClientWithEvents<TEvents> => {
  const events: string[] = [];

  const client = new ZapClient(url, events);

  for (const eventName in {} as TEvents) {
    console.log("eventName: ", eventName);
    (client as any)[eventName] = {
      send: ((input?: any) => {
        return client.sendMessageRaw(eventName, input);
      }),
      listen: ((callback: any) => {
      })
    };
  }

  return client as ZapClientWithEvents<TEvents>;
};

