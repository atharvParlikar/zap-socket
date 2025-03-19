interface CreateZapConstructorT {
    port: number;
}
export declare class CreateZapSocket {
    private wss;
    private wsToId;
    private idToWs;
    constructor({ port }: CreateZapConstructorT);
    private removeClient;
}
export {};
