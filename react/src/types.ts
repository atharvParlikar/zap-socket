import { ReactNode } from "react";
import { EventMap, ZapClientWithEvents } from "@zap-socket/client";

export interface ZapProviderProps {
  children: ReactNode;
  url: string;
  reconnect?: boolean;
  reconnectInterval?: number;
  onConnect?: () => void;
  onDisconnect?: () => void;
}

export interface ZapContextType<T extends EventMap = EventMap> {
  zap: ZapClientWithEvents<T> | null;
  connected: boolean;
}
