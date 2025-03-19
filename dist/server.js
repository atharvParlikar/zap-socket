import { WebSocketServer } from "ws";
import { generateId } from "./utils";
export class CreateZapSocket {
    wss;
    wsToId;
    idToWs;
    constructor({ port }) {
        this.wss = new WebSocketServer({ port });
        this.wsToId = new Map();
        this.idToWs = new Map();
        this.wss.on("connection", (ws) => {
            const clientId = generateId();
            this.wsToId.set(ws, clientId);
            this.idToWs.set(clientId, ws);
            ws.on("close", () => {
                this.removeClient(ws);
            });
            ws.on("error", (err) => {
                console.error(`WebSocket error for ${clientId}:`, err);
            });
        });
    }
    removeClient(ws) {
        const clientId = this.wsToId.get(ws);
        if (clientId) {
            this.wsToId.delete(ws);
            this.idToWs.delete(clientId);
        }
    }
}
