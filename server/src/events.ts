import { z } from "zod";
import { ZapServer } from "./server";

export type EventInput = z.ZodTypeAny | undefined;

export type Context = {
  server: ZapServer<any>; //  TODO: see if you can replace this any with EventMap type and if that has any dx advantage.
}

//  NOTE: there can't be a data property on zapEvent because that will break ZapServerEvent
//  we are using data property to determine if event is of type server or client.
export type ZapEvent<T extends EventInput, R = any> = T extends z.ZodTypeAny
  ? {
    input: T;
    process: (input: z.infer<T>, ctx: Context) => R;
  }
  : {
    input: z.ZodVoid;
    process: (ctx: Context) => R;
  };

export type ZapServerEvent<T extends z.ZodTypeAny> = {
  data: z.infer<T>;
}

export type EventMap = Record<string, ZapEvent<any, any> | ZapServerEvent<any>>;

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
