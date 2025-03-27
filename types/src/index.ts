import { z } from 'zod';

export type ZapServerType<T extends EventMap> = {
  sendMessageRaw: (clientId: string, data: any) => void;
  event: {
    [K in keyof T as T[K] extends ZapServerEvent<any> ? K : never]: {
      send: (data: (T[K] extends ZapServerEvent<any> ? T[K]["data"] : never)) => void;
    }
  };
};

export type Context = {
  server: ZapServerType<any>; //  TODO: see if you can replace this any with EventMap type and if that has any dx advantage.
}

export type EventInput = z.ZodTypeAny | undefined;

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
