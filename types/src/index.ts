import { z } from 'zod';

export type ZapServerType<T extends EventMap> = {
  sendMessageRaw: (clientId: string, data: any) => void;
  event: {
    [K in keyof T as T[K] extends ZapServerEvent<any> ? K : never]: {
      send: (clientId: string, data?: (T[K] extends ZapServerEvent<any> ? T[K]["data"] : never)) => void;
    }
  };
};

export type Context = {
  server: ZapServerType<any>;
  id: string;
  buffer: MiddlwareContext;
}

// Middleware types start

export type MiddlwareContext = Record<string, any>;

export type MiddlewareMetadata = {
  id: string;               // Sender ID
  ip: string;               // Client IP address
  timestamp: number;        // Epoch time → when the msg was received
  size: number;             // Size of the raw message in bytes
  // protocol: "ws" | "wss";   // Whether it's WS or WSS (ignore for now)
}

export type MiddlwareMsg = {
  event: string;
  data: any;
  metadata: MiddlewareMetadata;
}

export type MiddlewareType = (ctx: MiddlwareContext, msg: MiddlwareMsg) => boolean;

// Middleware types end

export type EventInput = z.ZodTypeAny | undefined;

export type ZapEvent<T extends EventInput, R = any> = T extends z.ZodTypeAny
  ? {
    input: T;
    middleware?: MiddlewareType[];
    process: (input: z.infer<T>, ctx: Context) => R;
  }
  : {
    input: z.ZodVoid;
    middleware?: MiddlewareType[];
    process: (ctx: Context) => R;
  };

export type ZapStream<T extends EventInput, R> = T extends z.ZodTypeAny
  ? {
    input: T;
    middleware?: MiddlewareType[];
    process: (input: z.infer<T>, ctx: Context) => AsyncGenerator<R, void, unknown>;
  }
  : {
    input: z.ZodVoid;
    middleware?: MiddlewareType[];
    process: (ctx: Context) => AsyncGenerator<R, void, unknown>;
  };


export type ZapServerEvent<T extends z.ZodTypeAny> = {
  data: z.infer<T>;
}

export type EventMap = Record<string, ZapEvent<any, any> | ZapServerEvent<any> | ZapStream<any, any>>;

