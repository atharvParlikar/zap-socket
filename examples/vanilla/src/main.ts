import { createZapClient } from "@zap-socket/client";
import { Events } from "../server/index";

async function run() {
  // built in req-res model over ws, returns a promise
  const playerPosition = await client.events.playerPosition.send({ playerId: "something" });
  console.log(playerPosition);

  // fire and forget
  client.events.signal.send("*****");

  // strems return an async iterator
  const tokens = client.streams.llm.send("Hello")

  for await (const token of tokens) {
    console.log(token);
  }
}

const client = createZapClient<Events>({ url: "ws://localhost:8000/" });

client.onconnect = () => {
  run();
}
