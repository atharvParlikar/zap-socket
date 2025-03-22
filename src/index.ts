import { z } from "zod";
import { createEvents } from "./events";
import { createZapServer } from "./server";
import { createClient } from "./client";

const server = createZapServer({ port: 8000 });
const events = createEvents({
  ping: {
    input: null,
    process: () => console.log("Got a ping")
  },
  message: {
    input: z.string(),
    process: (msg) => console.log("Got message: ", msg)
  },
  playerPosition: {
    input: z.object({
      x: z.number(),
      y: z.number()
    }),
    process: ({ x, y }) => ({ x, y })
  }
});

server.attachEvents(events);

const zap = createClient<typeof events>({ url: "ws://localhost:8000" });

const response = zap.playerPosition.send({ x: 2, y: 2 })
