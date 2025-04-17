import { useZap, ZapProvider } from "../../../react/src/index";
import './App.css'
import type { Events } from "../server/index";
import { useEffect, useState } from "react";
import { IncomingMessage } from "./components/IncomingMessage";
import { OutgoingMessage } from "./components/OutgoingMessage";


function Message() {
  const { zap, syncedState } = useZap<Events>();
  const incomingMessages = syncedState.message()
  const [messages, setMessages] = useState<{ msg: string, type: "incoming" | "outgoing" }[]>([]);
  const [messageInput, setMessageInput] = useState("");

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
    <div className="w-full h-screen flex items-center justify-center bg-gray-100">
      <div className="w-full max-w-2xl h-[90vh] flex flex-col rounded-lg shadow-lg bg-white overflow-hidden">

        {/* Header */}
        <div className="p-4 border-b bg-blue-500 text-white font-semibold text-lg">
          Chat Room
        </div>

        {/* Messages */}
        <div className="flex-1 p-4 space-y-4 overflow-y-auto bg-gray-50">
          {
            messages.map((msg, key) => {
              if (msg.type === "outgoing") {
                return <OutgoingMessage key={key} msg={msg.msg} />
              }
              return <IncomingMessage key={key} msg={msg.msg} />
            })
          }
        </div>

        {/* Input */}
        <div className="p-4 border-t bg-white">
          <div className="flex items-center gap-2">
            <input
              type="text"
              placeholder="Type a message..."
              className="flex-1 px-4 py-2 border rounded-full bg-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-400"
              value={messageInput}
              onChange={(e) => setMessageInput(e.target.value)}
            />
            <button onClick={() => {
              zap?.events.message.send(messageInput);
              setMessages(x => [...x, {
                msg: messageInput,
                type: "outgoing"
              }]);
              setMessageInput("");
            }} className="px-4 py-2 bg-blue-500 text-white rounded-full hover:bg-blue-600 transition">
              Send
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function App() {
  return (
    <ZapProvider url="ws://localhost:8000/">
      <div className="h-screen">
        <Message />
      </div>
    </ZapProvider>
  );
}

export default App;

