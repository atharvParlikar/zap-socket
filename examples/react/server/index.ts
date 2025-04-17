import { z } from "zod";
import { createZapServer, zapEvent } from "@zap-socket/server";

const events = {
  message: zapEvent({
    input: z.string(),
    process: (data, { server, id }) => {
      server.selectiveBroascast("message", data, server.clients.filter(x => x !== id));
    },
    emitType: z.string()
  })
}

export type Events = typeof events;

const server = createZapServer<Events>({ port: 8000, events }, () => {
  console.log("Server is live");
});

server.onconnect(({ id, ws }) => {
  console.log(`⚡ ${id} connected`);

  ws.onclose = () => {
    console.log(`🔥 ${id} disconnected`);
  }
});

