import { createZapClient } from "@zap-socket/client";
import { Events } from "../server/index";

const url = "ws://localhost:8080/";

function run() {
  const response = await client.events.message.send("hi"); // returns promise that resolves to server response.

  client.events.message.send("hii"); // fire and forget.
}

const client = createZapClient<Events>({ url });

client.onconnect = () => {
  run();
};
