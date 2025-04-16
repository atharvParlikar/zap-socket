import { z } from "zod";
import type { EventInput, ZapEvent, ZapStream, ZapServerEvent, MiddlewareType, MiddlwareContext } from "@zap-socket/types";
import { ZapServer } from "./server";

export type Context = {
  server: ZapServer<any>;
  id: string;
  buffer: MiddlwareContext;
};

export const zapEvent = <T extends EventInput, R, E = undefined>(
  eventObj: T extends z.ZodTypeAny
    ? {
      input: T;
      middleware?: MiddlewareType[];
      process: (input: z.infer<T>, ctx: Context) => R;
      emitType?: E extends undefined ? undefined : E;
    }
    : {
      middleware?: MiddlewareType[];
      process: (ctx: Context) => R;
      emitType?: E extends undefined ? undefined : E;
    }
): ZapEvent<T, R, E> => {
  if ("input" in eventObj) {
    return {
      input: eventObj.input,
      middleware: eventObj.middleware,
      process: eventObj.process,
      emitType: eventObj.emitType ? eventObj.emitType as E : undefined
    } as ZapEvent<T, R, E>;
  }
  return {
    input: z.void(),
    middleware: eventObj.middleware,
    process: eventObj.process as any,
    emitType: eventObj.emitType ? eventObj.emitType as E : undefined
  } as ZapEvent<T, R, E>;
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
