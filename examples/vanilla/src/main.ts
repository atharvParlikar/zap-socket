import { createZapClient } from "../../../client/src/index";
import { Events } from "../server/index";

const url = "ws://localhost:8080/";

async function run() {
  const btn = document.getElementById("click");
  btn?.addEventListener("click", async () => {
    const x = await client.events.message.batch(["nigga", "wigga", "chigga"]);
    console.log(x);
  });
}

const client = createZapClient<Events>({ url });

client.onconnect = () => {
  run();
};

client.events.message.listen((msg) => {
  console.log(msg);
});
