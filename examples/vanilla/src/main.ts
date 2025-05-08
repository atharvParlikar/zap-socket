// import { createZapClient } from "../../../client/src/index";
// import { Events } from "../server/index";
//
// function run() {
//   while (client.connected) {
//     client.events.consume.send("whatever nigga");
//   }
// }
//
// const client = createZapClient<Events>({ url: "ws://localhost:8000/" });
//
// client.onconnect = () => {
//   run();
// }

const socket = new WebSocket("ws://localhost:9001");

socket.onopen = () => {
  console.log("connection open!");
  socket.send("Hello friend");
}

socket.onmessage = ({ data }) => {
  console.log(data);
}

document.getElementById("click")?.addEventListener("click", () => {
  socket.send("wzzup bejing");
})
