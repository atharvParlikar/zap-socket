import { useZap, ZapProvider } from "../../../react/src/index";
import './App.css'
import type { Events } from "../server/index";
import { useEffect } from "react";

function Test() {
  const { zap, connected, syncedState } = useZap<Events>();

  // const messages = syncedState("message");
  //
  // useEffect(() => {
  //   if (connected) {
  //     zap?.events.message.send("hello there");
  //     zap?.events.message.send("howdy");
  //     zap?.events.message.send("wzzup bitch");
  //     zap?.events.message.send("finally nigga");
  //   }
  // }, [connected]);
  //
  // useEffect(() => {
  //   console.log(messages);
  // }, [messages])

  useEffect(() => {
    if (connected) {
      zap?.events.message.send("Hello there friend");
      zap?.addEventListener("message", (whatever) => {
        console.log(whatever);
      });
    }
  }, [connected]);

  return (
    <div style={{
      display: "flex",
      flexDirection: "column"
    }}>
      {/* <ul> */}
      {/*   { */}
      {/*     messages.map((x, i) => <li key={i}>{x}</li>) */}
      {/*   } */}
      {/* </ul> */}
    </div>
  );
}

function App() {
  return (
    <ZapProvider url="ws://localhost:8000/">
      <Test />
    </ZapProvider>
  );
}

export default App;

