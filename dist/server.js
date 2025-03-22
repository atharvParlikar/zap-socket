import { WebSocketServer } from "ws";
import { generateId } from "./utils";
export class ZapServer {
    wss;
    wsToId;
    idToWs;
    events = {};
    constructor({ port }) {
        this.wss = new WebSocketServer({ port });
        this.wsToId = new Map();
        this.idToWs = new Map();
        this.wss.on("connection", (ws) => {
            const clientId = generateId();
            console.log(`client ${clientId} connected`);
            this.wsToId.set(ws, clientId);
            this.idToWs.set(clientId, ws);
            ws.on("message", (message) => {
                for (const [event, { process }] of Object.entries(this.events)) {
                    const parsedMessage = JSON.parse(message.toString());
                    if (parsedMessage["type"] === event) {
                        const { input } = parsedMessage;
                        process(input);
                    }
                }
            });
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
    attachEvents(events) {
        this.events = events;
    }
}
export const createZapServer = ({ port }) => {
    return new ZapServer({ port });
};
