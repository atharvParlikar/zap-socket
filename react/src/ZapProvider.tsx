import { createZapClient, ZapClientWithEvents } from "@zap-socket/client";
import { ReactNode, useEffect, useRef, useState } from "react";
import { EventMap } from "@zap-socket/client";
import { createContext } from "react";
import { ZapContextType } from "./types";

interface ZapProvierProps {
  children: ReactNode;
  url: string;
}

export const ZapContext = createContext<ZapContextType<any> | undefined>(undefined) as unknown as React.Context<ZapContextType<EventMap> | undefined>;

export function ZapProvider<T extends EventMap>({ children, url }: ZapProvierProps) {
  const zapRef = useRef<ZapClientWithEvents<T> | null>(null);  // Only initialize once
  const [connected, setConnected] = useState<boolean>(false);

  // Lazily create the WebSocket client only once
  useEffect(() => {
    if (!zapRef.current) {
      zapRef.current = createZapClient<T>({ url });
    }

    return () => {
      if (!zapRef.current) return;
      zapRef.current.ws.close();
      zapRef.current = null;
    }
  }, []);

  useEffect(() => {
    const client = zapRef.current;

    if (!client) return;

    const handleConnect = () => setConnected(true);
    const handleDisconnect = () => setConnected(false);

    client.onconnect = handleConnect;
    client.ws.onclose = handleDisconnect;

    // Cleanup listeners on unmount
    return () => {
      client.onconnect = null;
      client.ws.onclose = null;
      client.ws.close();
    };
  }, [url]);  // Only re-run when URL changes

  return (
    <ZapContext.Provider value={{ zap: zapRef.current, connected }}>
      {children}
    </ZapContext.Provider>
  );
}
