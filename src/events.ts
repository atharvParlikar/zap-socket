import { z } from "zod";

export type EventInput = z.ZodTypeAny | undefined;

export type ZapEvent<T extends EventInput, R = any> = T extends z.ZodTypeAny
  ? {
    input: T;
    process: (input: z.infer<T>) => R;
  }
  : {
    input: z.ZodVoid;
    process: () => R;
  };

export type EventMap = Record<string, ZapEvent<any, any>>;

export const createZapEvent = <T extends EventInput, R>(
  eventObj: T extends z.ZodTypeAny
    ? {
      input: T;
      process: (input: z.infer<T>) => R;
    }
    : {
      process: () => R;
    }
): ZapEvent<T, R> => {
  if ("input" in eventObj) {
    return eventObj as ZapEvent<T, R>;
  }
  return {
    input: z.void(),
    process: eventObj.process as any
  } as ZapEvent<T, R>
}
