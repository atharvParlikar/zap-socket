import { z } from "zod";
import { createZapServer, zapEvent, zapStream } from "@zap-socket/server";

const events = {
  message: zapEvent({
    input: z.string(),
    process: (data) => {
      return data.toUpperCase();
    }
  }),
  add: zapEvent({
    input: z.object({
      a: z.number(),
      b: z.number()
    }),
    process: ({ a, b }) => a + b
  }),
  llm: zapStream({
    input: z.string(),
    process: async function* (data) {
      for (const token of "Hello there, how can I assist you!".split(" ")) {
        yield await new Promise((resolve) => setTimeout(() => resolve(token), 100));
      }
    }
  }),
}

export type Events = typeof events;

const server = createZapServer<Events>({ port: 8000, events }, () => {
  console.log("Server is live");
});
