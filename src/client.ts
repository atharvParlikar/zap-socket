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

export const createZapClient = <TEvents extends EventMap>({ url }: CreateClientArgs) => {
  const client = {} as {
    [K in keyof TEvents]: {
      send: TEvents[K]["input"] extends z.ZodVoid
      ? () => Promise<ReturnType<TEvents[K]["process"]>>
      : (input: z.infer<TEvents[K]["input"]>) => Promise<ReturnType<TEvents[K]["process"]>>;
    }
  };

  // Create methods for each event
  for (const eventName in {} as TEvents) {
    client[eventName] = {
      send: ((input?: any) => {
        console.log(`sending ${eventName} message:`, input);
        // Here you would handle the actual API call
        return Promise.resolve(undefined); // Placeholder return
      }) as any
    };
  }

  return client;
};
