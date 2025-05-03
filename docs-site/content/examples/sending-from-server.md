# Sending Server → Client Messages

Normally, clients send events to the server.  
But sometimes the **server** needs to send a message **back to a client manually** — outside of a normal response flow.

Here’s how to do it using `server.sendMessage`.

---

## Usage

```ts
import { createServer, zapEvent, zapServerEvent } from "@zap-socket/server";
import { z } from "zod";

// In-memory store of player positions
const positions: Map<string, { x: number; y: number }> = new Map();

const events = {
  passMessage: zapEvent({
    input: z.object({
      clientId: z.string(),
      message: z.string()
    }),
    process: (data, ctx) => {
      const { id, server } = ctx; // Sender's socket ID and the Server instance
      const { clientId, message } = data;

      server.sendMessage(
        "message",    // Name of the event to send
        {             // payload you want to send
          from: id,
          message
        },
        clientId      // Which client to send it to
      );
    }
  }),

  message: zapServerEvent({
    data: z.object({
      from: z.string(),
      message: z.string()
    })
  }),
};

export type Events = typeof events;

// Create the WebSocket server
const server = createServer<Events>({
  port: 8080,
  events
});
```

---

## Notes

- To send a custom server event, you must define it using `zapServerEvent`.  
  This way, you get **full type safety** and **autocompletion** on both the client and server sides.
  
- If you want to send events **outside** the `process` function (e.g., from a cron job or another server file),  
  having a `zapServerEvent` defined is **required** for good TypeScript support.

---

## Quick Tip

> If you're getting weird types or missing autocompletion, double-check that you've defined your event with `zapServerEvent` and not just relied on the name string.

