import { useZap, ZapProvider } from "@zap-socket/react"
import './App.css'
import type { Events } from "./server/index";
import { useEffect, useState } from "react";

function Test() {
  const { zap, connected } = useZap<Events>();
  const [tokens, setTokens] = useState("");

  useEffect(() => {
    if (connected) {
      console.log("Got here");

      const stream = async () => {
        const tokenStream = zap?.streams.llm.send("Hello")!;
        for await (const token of tokenStream) {
          console.log(token);
          setTokens(x => x + " " + token);
        }
      }

      stream();
    }
  }, [connected]);

  return (
    <div>
      {tokens}
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

