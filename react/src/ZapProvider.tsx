import { createZapClient, ZapClientWithEvents, } from "@zap-socket/client";
import { ZapEvent, ZapServerEvent, EventMap } from "@zap-socket/types";
import { ReactNode, useEffect, useRef, useState } from "react";
import { createContext } from "react";
import { ZapContextType } from "./types";
import { z, ZodType, ZodTypeAny } from "zod";

interface ZapProvierProps {
  children: ReactNode;
  url: string;
}

export const ZapContext = createContext<ZapContextType<any> | undefined>(undefined) as unknown as React.Context<ZapContextType<EventMap> | undefined>;

export type Events<T extends EventMap> = {
  [K in keyof T as T[K] extends ZapEvent<any, any> | ZapServerEvent<any> ? K : never]:
  T[K] extends ZapEvent<any, any>
  ? () => (
    NonNullable<T[K]["emitType"]> extends never
    ? (ReturnType<T[K]["process"]> extends void
      ? undefined
      : ReturnType<T[K]["process"]>[])
    : NonNullable<T[K]["emitType"]> extends ZodType<any, any, any>
    ? z.infer<NonNullable<T[K]["emitType"]>>[] : never
  )
  : T[K] extends ZapServerEvent<any>
  ? () => T[K]["data"][]
  : unknown;
};

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

  const syncedState = (event: string) => {
    const [state, setState] = useState<any[]>([]);
    const zap = zapRef.current!;

    useEffect(() => {
      if (connected) {
        zap.addEventListener(event, (data) => {
          setState(x => [...x, data]);
        });
      }
    }, [connected]);

    return state;
  }


  const syncedStateProxyHandler: ProxyHandler<Events<T>> = {
    get(target, prop, reciever) {
      console.log("prop: ", prop);
      if (typeof prop === "string") return () => syncedState(prop);
    }
  }

  const syncedStateProxy = new Proxy({} as Events<T>, syncedStateProxyHandler);

  return (
    <ZapContext.Provider value={{ zap: zapRef.current, connected, syncedState: syncedStateProxy }}>
      {children}
    </ZapContext.Provider>
  );
}
