import { z } from "zod";
import { createZapServer, zapEvent, } from "../../../server/src/index";

const port = 8080;

const events = {
  message: zapEvent({
    input: z.string(),
    process: (msg) => {
      console.log("got message: ", msg);
      return msg.toUpperCase();
    }
  }),
}

export type Events = typeof events;

const server = createZapServer<Events>({ port, events }, () => {
  console.log("Server is online");
});

server.onconnect(({ id }) => {
  console.log(`${id} connected`);
  server.events.message.broadcast("sup niggas");
});
