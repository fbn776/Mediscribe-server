import WebSocket, {WebSocketServer} from "ws";
import handleConversationWorker from "../workers/conversation";


export default function initClientSttGatewayWebSocket(wss: WebSocketServer) {
    const STT_WS_URL = process.env.STT_WEBSOCKET_URL;

    if (!STT_WS_URL) {
        throw new Error("STT_WEBSOCKET_URL is not defined in environment variables");
    }

    wss.on("connection", (clientWs, req) => {
        console.log("Client connected");

        const sttWs = new WebSocket(STT_WS_URL);

        let handshakeDone = false;

        const pendingMessages: {
            type: "text" | "binary";
            data: string | Buffer;
        }[] = [];

        sttWs.on("open", () => {
            console.log("Connected to STT service");

            // Flush queued messages
            for (const msg of pendingMessages) {
                sttWs.send(msg.type === "text" ? msg.data.toString() : msg.data, {
                    binary: msg.type === "binary",
                });
            }
            pendingMessages.length = 0;
        });


        /**
         * CLIENT → GATEWAY → STT
         */
        clientWs.on("message", (data, isBinary) => {
            console.log(
                "Received message from client",
                isBinary ? "(binary)" : "(text)"
            );

            if (!handshakeDone) {
                if (isBinary) return;

                if (sttWs.readyState === WebSocket.OPEN) {
                    sttWs.send(data.toString());
                } else {
                    pendingMessages.push({
                        type: "text",
                        data: data.toString(),
                    });
                }

                handshakeDone = true;
                return;
            }

            // Audio frames
            if (sttWs.readyState === WebSocket.OPEN) {
                sttWs.send(data, {binary: isBinary});
            } else {
                pendingMessages.push({
                    type: "binary",
                    data: Buffer.from(data as Buffer)
                });
            }
        });

        /**
         * STT → GATEWAY → CLIENT
         */
        sttWs.on("message", (data) => {
            if (clientWs.readyState === WebSocket.OPEN) {
                clientWs.send(data.toString());

                console.log("Forwarded STT message to client", data.toString());

                handleConversationWorker(data.toString());
            }
        });

        const cleanup = () => {
            console.log("Cleaning up connections");
            pendingMessages.length = 0;
            if (sttWs.readyState === WebSocket.OPEN) sttWs.close();
            if (clientWs.readyState === WebSocket.OPEN) clientWs.close();
        };

        clientWs.on("close", cleanup);
        sttWs.on("close", cleanup);

        clientWs.on("error", cleanup);
        sttWs.on("error", cleanup);
    });
}