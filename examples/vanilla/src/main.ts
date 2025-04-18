import { createZapClient } from "@zap-socket/client";
import { Events } from "../server/index";

async function run() {
  const position = await client.events.playerPosition.send({
    playerId: "something"
  });

  console.log(position);
}

const client = createZapClient<Events>({ url: "ws://localhost:8000/" });

client.onconnect = () => {
  run();
}
