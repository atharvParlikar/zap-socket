# Request Response Model

This example shows how to use zap-socket for a simple request-response pattern between a server and a client.

- The server defines a getPosition event, which accepts a playerId (string) and returns the player's current position ({ x: number, y: number }).
- On the client side, you can call client.events.getPosition(playerId), which returns a Promise that resolves with the player's position.

This pattern makes it easy to create type-safe, structured communication over WebSockets.
If you have any questions about this setup, feel free to ask!

## server

```ts
import { createServer, zapEvent } from "@zap-socket/server";
import { z } from "zod";

const events = {
  getPosition: zapEvent({
    input: z.string(),
    process: (playerId) => {
      // get player position
      return { x: 23, y: 99 };
    }
  }),
}

export type Events = typeof events;

const server = createServer<Events>({ port: 8080, events });
```

## Client

```ts
import { Events } from "../server";
import { createZapClient } from "@zap-socket/client";

const client = createZapClient<Events>({ url: "ws://localhost:8080" });

async function run() {
  const position = await client.events.getPosition.send("cosmicToast");
  console.log("cosmicToast position: ", position);
}

client.onconnect = run;
```

