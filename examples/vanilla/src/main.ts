import { createZapClient } from "../../../client/src/index";
import { Events } from "../server/index";

function run() {
  while (client.connected) {
    client.events.consume.send("whatever nigga");
  }
}

const client = createZapClient<Events>({ url: "ws://localhost:8000/" });

client.onconnect = () => {
  run();
}
