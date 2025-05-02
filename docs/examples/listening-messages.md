# Listening to server messages.

## Usage


### Server

```ts
// --imports and shit--

const events = {
  ping: zapServerEvent({
    data: z.string() // type of message you are sending
  })
}

export type Events = typeof events;

const server = createServer<Events>({ port: 8080, events });

server.events.ping.send("some-client-id", "ping") // sending the message
```

### Client

```ts
import { Events } from "../server";
import { createZapClient } from "@zap-socket/client";

const client = createZapClient<Events>({ url: "ws://localhost:8080" });

async function run() {
  client.events.ping.listen((data) => {
    console.log(data); // ping
  });
}

client.onconnect = run;
```


# Listening to Server Messages

Sometimes the server needs to send **messages** directly to the client — outside of a typical client request.  
Here’s how you can **send** and **listen** for server-initiated events.

---

## Usage

### Server

```ts
import { createServer, zapServerEvent } from "@zap-socket/server";
import { z } from "zod";

const events = {
  ping: zapServerEvent({
    data: z.string() // Type of the message you are sending
  })
};

export type Events = typeof events;

const server = createServer<Events>({
  port: 8080,
  events
});

// Send a "ping" message to all connected clients
server.events.ping.send("ping");
```

---

### Client

```ts
import { createZapClient } from "@zap-socket/client";
import { Events } from "../server"; // Import your shared Events type

const client = createZapClient<Events>({ url: "ws://localhost:8080" });

async function run() {
  client.events.ping.listen((data) => {
    console.log(data); // "ping"
  });
}

client.onconnect = run;
```

---

## How It Works

- On the **server**, you use `server.events.<eventName>.send(data)` to broadcast a message.
- On the **client**, you use `client.events.<eventName>.listen(handler)` to listen for that message.

Because you defined the `ping` event with `zapServerEvent`, both sides are fully **typed** and **autocompleted**. No guessing the event names or payloads!

---

## Quick Tip

> You can use `zapServerEvent` for any kind of server-initiated events — like real-time notifications, status updates, etc.
