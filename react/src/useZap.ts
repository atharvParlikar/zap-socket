import { EventMap, ZapClientWithEvents } from "@zap-socket/client";
import { ZapContextType } from "./types";
import { useContext } from "react";
import { Events, ZapContext } from "./ZapProvider";

export function useZap<T extends EventMap>(): ZapContextType<T> {
  const context = useContext(ZapContext);
  if (!context) {
    throw new Error("useZap must be used within a ZapProvider");
  }

  return {
    zap: context?.zap as ZapClientWithEvents<T>,
    connected: context?.connected!,
    syncedState: context?.syncedState as Events<T>,
  };
}

