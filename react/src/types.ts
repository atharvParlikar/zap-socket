import { ReactNode } from "react";
import { EventMap, ZapClientWithEvents } from "@zap-socket/client";
import { Events } from "./ZapProvider";

export interface ZapProviderProps {
  children: ReactNode;
  url: string;
  reconnect?: boolean;
  reconnectInterval?: number;
  onConnect?: () => void;
  onDisconnect?: () => void;
}

export interface ZapContextType<T extends EventMap> {
  zap: ZapClientWithEvents<T> | null;
  connected: boolean;
  syncedState: Events<T>;
}
