import { z } from "zod";
import { createZapServer, zapEvent, zapServerEvent, zapStream } from "../../../server/src/index";

// const events = {
//   ping: zapServerEvent({
//     data: z.string()
//   }),
//
//   playerPosition: zapEvent({
//     input: z.object({
//       playerId: z.string()
//     }),
//     process: ({ playerId }) => {
//       // Fetch player position logic here
//       return { x: 22, y: 24 };
//     }
//   }),
//
//   signal: zapEvent({
//     input: z.string(),
//     process: (signal, ctx) => {
//       // Send signal to a specific client
//       const { server } = ctx;
//       server.sendMessage("signal", signal, "some-client-id");
//     },
//     emitType: z.string()
//   }),
//
//
//   llm: zapStream({
//     input: z.string(),
//     process: async function* (input) {
//       const response = "Hi there, how can I help you.."
//       for (const token of response.toUpperCase().split(" ")) {
//         yield await new Promise((resolve) => setTimeout(() => resolve(token), 10));
//       }
//     }
//   }),
// };

const events = {
  uppercase: zapEvent({
    input: z.string().min(4),
    process: (input) => {
      return input.toUpperCase();
    }
  })
}

export type Events = typeof events;

const server = createZapServer<Events>({ port: 8000, events }, () => {
  console.log("Server is online balle balle");
});

