import { createZapClient } from "../../../client/src/index";
import { Events } from "../server/index";

async function run() {
  client.events.uppercase.send("yo000");
}

const client = createZapClient<Events>({ url: "ws://localhost:8000/" });

client.onconnect = () => {
  run();
}
