import { z } from "zod";
import type { EventInput, Context, ZapEvent, ZapStream, ZapServerEvent, MiddlewareType } from "@zap-socket/types";

export const zapEvent = <T extends EventInput, R>(
  eventObj: T extends z.ZodTypeAny
    ? {
      input: T;
      middleware?: MiddlewareType[];
      process: (input: z.infer<T>, ctx: Context) => R;
    }
    : {
      middleware?: MiddlewareType[];
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

export const zapStream = <T extends EventInput, R>(
  eventObj: T extends z.ZodTypeAny
    ? {
      input: T;
      middleware?: MiddlewareType[];
      process: (input: z.infer<T>, ctx: Context) => AsyncGenerator<R, void, unknown>;
    }
    : {
      middleware?: MiddlewareType[];
      process: (ctx: Context) => AsyncGenerator<R, void, unknown>;
    }
): ZapStream<T, R> => {
  if ("input" in eventObj) {
    return eventObj as ZapStream<T, R>;
  }
  return {
    input: z.void(),
    process: eventObj.process
  } as ZapStream<T, R>;
}

export const zapServerEvent = <T extends z.ZodTypeAny>(eventObj: { data: T }): ZapServerEvent<T> => {
  return {
    data: eventObj.data
  } as ZapServerEvent<T>;
}
