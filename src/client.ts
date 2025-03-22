import { z } from "zod";

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

export const createClient = <TEvents extends Record<string, { input: any; process: any }>>({ url }: CreateClientArgs) => {
  return new Proxy({} as {
    [K in keyof TEvents]: {
      send: TEvents[K]["input"] extends z.ZodType<any, any, any>
      ? (input: z.infer<TEvents[K]["input"]>) => ReturnType<TEvents[K]["process"]>
      : () => ReturnType<TEvents[K]["process"]>;
    }
  }, {
    get(_, prop: string) {
      return {
        send: (input: any) => {
          console.log("sending message: ", input)
        }
      }
    }
  });
}

