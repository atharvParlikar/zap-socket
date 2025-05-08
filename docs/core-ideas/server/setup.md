# Server Setup

## Installation

First, install the server package:

```bash
npm install @zap-socket/server
```

---

## Starting the WebSocket Server

```ts
import { createZapServer } from "@zap-socket/server";

const server = createZapServer({ port: 8080 }, () => {
  console.log("Server is running at: ws://localhost:8080/");
});
```

This sets up a basic zap-socket server. The event handlers are defined separately for cleaner organization.

---

## Defining Events

```ts
import { z } from "zod";
import { createZapServer, zapEvent } from "@zap-socket/server";

const events = {
  ping: zapEvent({
    process: () => "pong"
  }),
};

const server = createZapServer<typeof events>({ port: 8080, events }, () => {
  console.log("Server is running at: ws://localhost:8080/");
});
```

The `events` object is where you define all your WebSocket events. Each key represents an event name, and the value is a zap-socket primitive like `zapEvent` or `zapStream`.

### About `zapEvent`

`zapEvent` is a versatile building block. It supports both **request-response** style communication and **fire-and-forget** events (like emitting signals to clients). This duality allows you to keep your real-time logic concise and easy to manage.

📖 Learn more about `zapEvent` [[here]].

### Registering Events

To register your events with the server, simply pass the `events` object to `createZapServer`. This enables the server to handle incoming messages based on the event definitions you've provided—handling input validation, message routing, and type-safe responses automatically.

