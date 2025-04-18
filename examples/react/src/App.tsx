import { useZap, ZapProvider } from "../../../react/src/index";
import './App.css'
import type { Events } from "../server/index";
import { useEffect, useState } from "react";
import { Chat } from "./components/Chat";

function Example() {
  const { syncedState } = useZap<Events>();
  const incomingMessages = syncedState.message()
  const [messages, setMessages] = useState<{ msg: string, type: "incoming" | "outgoing" }[]>([]);

  useEffect(() => {
    const lastMessage = incomingMessages.slice(-1)[0];
    if (lastMessage) {
      setMessages(x => [...x, {
        msg: lastMessage,
        type: "incoming"
      }]);
    }
  }, [incomingMessages]);

  return (
    <Chat messages={messages} setMessages={setMessages} />
  );
}

function App() {
  return (
    <ZapProvider url="ws://localhost:8000/">
      <div className="h-screen">
        <Example />
      </div>
    </ZapProvider>
  );
}

export default App;

