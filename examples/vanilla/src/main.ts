import { createZapClient } from "../../../client/src/index";
import { Events } from "../server/index";

const url = "ws://localhost:8080/";

function run() {
}

const client = createZapClient<Events>({ url });

client.onconnect = () => {
  run();
};
