# Stream Primitive
This example shows how to set up streaming with zap-socket — perfect when you want to send data piece by piece instead of all at once.

- The server defines an llm stream that takes a prompt (string) and yields tokens one by one, simulating something like an AI model typing a response.
- On the client, when you call client.streams.llm.send(prompt), you get back an async iterator — meaning you can for await over it and handle tokens as they come in, live.

This is awesome for real-time experiences where waiting for a full response would be too slow.

## Server

```ts
import { createServer, zapStream } from "@zap-socket/server";
import { z } from "zod";

const events = {
  llm: zapStream({
    input: z.string(),
    process: async function * (prompt) {
      // simulate the llm response
      const response = "Hi how can I help you!";
      const response_tokens = response.split(" ");
      for (const token of response_tokens) {
        yield token;
      }
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
  const response = client.streams.llm.send("Hello");
  for await (const token of response) {
    console.log(token); // use each token as it comes
  }
}

client.onconnect = run;
```

