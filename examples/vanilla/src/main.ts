import { createZapClient } from "@zap-socket/client";
import type { Events } from "../server/index";

async function run() {
  const client = createZapClient<Events>({ url: "ws://localhost:8000/" });

  client.onconnect = async () => {
    const sum = await client.events.add.send({ num1: 10, num2: 77 });
    console.log("sum: ", sum);
  }
}

run();
