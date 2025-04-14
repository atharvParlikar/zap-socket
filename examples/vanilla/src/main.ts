import { createZapClient } from "../../../client/src/client";
import type { Events } from "../server/index";

async function run() {
  const client = createZapClient<Events>({ url: "ws://localhost:8000/" });

  client.onconnect = async () => {
    const sums = await client.events.add.batch([
      { num1: 10, num2: 20 },
      { num1: 20, num2: 30 },
      { num1: 30, num2: 40 }
    ]);
    console.log(sums);
  }
}

run();
