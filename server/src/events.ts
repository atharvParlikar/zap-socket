import { z } from "zod";
import type { EventInput, Context, ZapEvent, ZapServerEvent } from "@zap-socket/types";

export const zapEvent = <T extends EventInput, R>(
  eventObj: T extends z.ZodTypeAny
    ? {
      input: T;
      process: (input: z.infer<T>, ctx: Context) => R;
    }
    : {
      process: (ctx: Context) => R;
    }
): ZapEvent<T, R> => {
  if ("input" in eventObj) {
    return eventObj as ZapEvent<T, R>;
  }
  return {
    input: z.void(),
    process: eventObj.process as any
  } as ZapEvent<T, R>;
}

export const zapServerEvent = <T extends z.ZodTypeAny>(eventObj: { data: T }): ZapServerEvent<T> => {
  return {
    data: eventObj.data
  } as ZapServerEvent<T>;
}
