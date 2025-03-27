import { z } from 'zod';

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

export type ZapServerEvent<T extends z.ZodTypeAny> = {
  data: T;
}

export type EventMap = Record<string, ZapEvent<any, any> | ZapServerEvent<any>>;
