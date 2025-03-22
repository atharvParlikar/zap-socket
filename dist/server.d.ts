import type { EventMap } from "./events";
interface ZapServerConstructorT {
    port: number;
}
export declare class ZapServer {
    private wss;
    private wsToId;
    private idToWs;
    private events;
    constructor({ port }: ZapServerConstructorT);
    private removeClient;
    attachEvents<T extends EventMap>(events: T): void;
}
export declare const createZapServer: ({ port }: {
    port: number;
}) => ZapServer;
export {};
