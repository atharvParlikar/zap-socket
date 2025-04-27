# Using Vanilla WebSockets with `zapEvent`

ZapSocket uses a single function, `zapEvent`, for both **vanilla WebSocket events** and **request-response (req-res) events**.  
The behavior depends on **whether or not** you return a value from the `process` function.

- **Return a value ➔** the server sends a response back to the client.
- **Don't return ➔** the event is treated as fire-and-forget (no response).

This makes the API very flexible — you can use either style without changing how you define events.

---

## Usage

### Request-Response Example

If you **return** something inside `process`, the server will automatically send it back to the client:

```ts
zapEvent({
  process: (data) => {
    return "something"; // Returning = sends a response
  }
});
```

> **Important**
> Anything returned from `process` will be serialized and sent to the client that triggered the event.

---

### Vanilla WebSocket Example

If you **don't return** anything, the server assumes there's **no response** to send:

```ts
zapEvent({
  process: (data) => {
    // Perform an action
    // No return = no response sent
  }
});
```

> **Tip**
> Vanilla WebSocket events are great for things like notifications, live updates, or broadcasting actions where you don't expect a reply.

---

## Full Server Example

Here’s a full example where the server tracks player positions without sending any response back:

```ts
import { createServer, zapEvent } from "@zap-socket/server";
import { z } from "zod";

// In-memory store of player positions
const positions: Map<string, { x: number; y: number }> = new Map();

const events = {
  positionUpdate: zapEvent({
    input: z.object({
      x: z.number(),
      y: z.number()
    }),
    process: (position, ctx) => {
      const { id } = ctx; // Sender's socket ID
      positions.set(id, position);
    }
  })
};

export type Events = typeof events;

// Create the WebSocket server
const server = createServer<Events>({
  port: 8080,
  events
});
```

In this example, when a client sends a `positionUpdate`, the server stores it, but **no response** is sent back.  
This keeps the communication lightweight.

---

## What to Remember

- **Return something ➔** the client receives a response.
- **Don't return ➔** the event is fire-and-forget.
- You can freely mix request-response events and vanilla events in the same app.

