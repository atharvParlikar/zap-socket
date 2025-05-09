# zap-socket ⚡🧠📡

**Control the chaos of realtime.**

**zap-socket** is a type-safe WebSocket library for modern applications. It gives you the DX of tRPC with all the power of WebSockets — enabling rich, real-time features without the typical headaches.

---

## Features ✨

* **End-to-End Type Safety** 🔐: Catch errors at compile time, not runtime.
* **No Magic Strings** 🧙‍♂️: Real function calls, real type safety.
* **Lightning Fast** ⚡: Up to 8× faster than Socket.IO.
* **React Integration** ⚛️: Idiomatic and component-friendly.
* **Zod Validation** ✅: Built-in schema validation with [Zod](https://github.com/colinhacks/zod).
* **Streaming Support** 🔄: Native support for streaming data (e.g., LLM completions).

---

## Why zap-socket? 🤔

| Feature              | zap-socket | socket.io | plain WebSockets |
| -------------------- | ---------- | --------- | ---------------- |
| Type Safety          | ✓          | Partial   | ✗                |
| No Magic Strings     | ✓          | ✗         | ✗                |
| Zod Validation       | ✓          | ✗         | ✗                |
| Bundle Size          | Small      | Large     | Tiny             |
| Native Subscriptions | ✓          | Custom    | Manual           |
| Streaming Support    | ✓          | ✗         | Manual           |

---

## Getting Started 🚀

### 1. Define Your API (Server) 🛠️

```ts
import { createZapEvents, createZapServer } from "zap-socket";
import { z } from "zod";

export const events = {
  message: zapEvent({
    input: z.object({ message: z.string() }),
    process: ({ input }) => `your message was ${input.message}`,
  }),
  pass: zapEvent({
    input: z.string(),
    process: (data, ctx) => {
      const { server } = ctx;
      server.sendMessage("some-id", data);
    },
    emitType: z.string()
  })
};

const zapServer = createZapServer({ port: 8000, events });
```

### 2. Type-Safe Client Calls 🧩

```ts
import { createZapClient } from "zap-socket";
import type { Events } from "./backend";

const client = createZapClient<Events>({ url: "ws://localhost:3001" });

async function run() {
  const result = await client.add.send({ a: 2, b: 3 });
  console.log(result); // 5

  client.add.send({ a: 2, b: 3 });

  client.timeUpdates.subscribe((data) => {
    console.log("Time update:", data);
  });

  client.playerPosition.listen(({ x, y }) => {
    console.log("Player position: ", x, y);
  });
}

run();
```

### 3. Context & Middleware 🧠

```ts
process = ({ name }, ctx) => {
  const { id } = ctx;
  return `Hello ${name} from connection ${id}`;
}
```

### 4. Streaming Support 📡

```ts
const tokenStream = zap.streams.llm.send({ prompt: "Tell me about WebSockets" });

for await (const token of tokenStream) {
  console.log(token);
}
```

---

Visit: https://zap-socket-control-center.vercel.app/ for more info
