import { ReactNode } from "react";
import { ZapClientWithEvents } from "@zap-socket/client";
import { EventMap } from "@zap-socket/types";
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
