import { z } from "zod";
import { EventMap } from "./events";

// actual socket payload := {
//   type: messageType,
//   data: { ... }
// }
//
// Event<input, output>
//  -> send (input autocomplete)
//  -> listen (output autocomplete)

interface CreateClientArgs {
  url: string
}

export class ZapClient {
  private url: string;
  public connection: WebSocket;
  public id: string | null = null;
  public onConnect: (() => void) | null = null;

  constructor(url: string) {
    this.url = url;
    this.connection = new WebSocket(url);

    this.connection.onopen = () => {
      this.connection.send("OPEN");
      this.connection.onmessage = (event) => {
        if (event.data.startsWith("ID ")) {
          this.id = event.data.substring(3);
          this.connection.onmessage = null;
          if (this.onConnect) {
            this.onConnect();
          }
        }
      };
    };
  }
}

type EventHandler<TInput extends z.ZodTypeAny, TOutput> = {
  send: TInput extends z.ZodVoid
  ? () => Promise<TOutput>
  : (input: z.infer<TInput>) => Promise<TOutput>;
  listen: (callback: (data: TOutput) => void) => void;
}

type ZapClientWithEvents<T extends EventMap> = ZapClient & {
  [K in keyof T]: EventHandler<T[K]["input"], ReturnType<T[K]["process"]>>
}

export const createZapClient = <TEvents extends EventMap>({ url }: CreateClientArgs): ZapClientWithEvents<TEvents> => {
  const client = new ZapClient(url);

  for (const eventName in {} as TEvents) {
    (client as any)[eventName] = {
      send: ((input?: any) => {
        return Promise.resolve(undefined);
      }),
      listen: ((callback: any) => {
      })
    };
  }

  return client as ZapClientWithEvents<TEvents>;
};

