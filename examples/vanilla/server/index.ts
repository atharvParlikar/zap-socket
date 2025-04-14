import { z } from "zod";
import { createZapServer, zapStream, zapEvent, zapServerEvent } from "@zap-socket/server";

const events = {
  llm: zapStream({
    input: z.string(),
    process: async function* (input) {
      for (const token of input.toUpperCase().split(" ")) {
        yield await new Promise((resolve) => setTimeout(() => resolve(token), 10));
      }
    },
    middleware: [(ctx, msg) => {
      console.log(msg);
      ctx.authenticated = true;
      return true;
    }]
  }),
  add: zapEvent({
    input: z.object({
      num1: z.number(),
      num2: z.number(),
    }),
    process: ({ num1, num2 }) => num1 + num2
  }),
  update: zapServerEvent({
    data: z.number()
  })
};

export type Events = typeof events;

const server = createZapServer<Events>({ port: 8000, events });

server.onconnect((ctx) => {
  const { id } = ctx;
  console.log(`${id} joined the server`);
});
