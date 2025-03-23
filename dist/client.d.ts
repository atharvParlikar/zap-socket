import { z } from "zod";
import { EventMap } from "./events";
interface CreateClientArgs {
    url: string;
}
export declare const createZapClient: <TEvents extends EventMap>({ url }: CreateClientArgs) => { [K in keyof TEvents]: {
    send: TEvents[K]["input"] extends z.ZodVoid ? () => Promise<ReturnType<TEvents[K]["process"]>> : (input: z.infer<TEvents[K]["input"]>) => Promise<ReturnType<TEvents[K]["process"]>>;
}; };
export {};
