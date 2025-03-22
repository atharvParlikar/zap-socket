import { z } from "zod";
interface CreateClientArgs {
    url: string;
}
export declare const createClient: <TEvents extends Record<string, {
    input: any;
    process: any;
}>>({ url }: CreateClientArgs) => { [K in keyof TEvents]: {
    send: TEvents[K]["input"] extends z.ZodType<any, any, any> ? (input: z.infer<TEvents[K]["input"]>) => ReturnType<TEvents[K]["process"]> : () => ReturnType<TEvents[K]["process"]>;
}; };
export {};
