import {OpenAIRealtimeVoice} from "@mastra/voice-openai-realtime";
import {WebSocket as WS, WebSocketServer as WSS} from "ws";
import http from "http";
import {TranscriptStore} from "./utils/transcript-store";
import {v4 as uuidv4} from 'uuid';
import {IInitMessage, ITranscriptMessage} from "../types/transcript";
import {processTranscript} from "./utils/process-transcript";
import transcriptInsertor from "../helpers/transcript-insertor";


/**
 * Creates a WebSocket server for real-time speech-to-text transcription
 * using Mastra's OpenAI Realtime Voice API.
 *
 * Flow:
 *   1. Client connects  →  server sends  { type: "status", status: "waiting_for_init" }
 *   2. Client sends     →  { language: "en", session_id: "<id>" }
 *   3. Server connects to OpenAI and sends { type: "status", status: "connected" }
 *   4. Client streams audio; server streams transcripts back.
 */
export function createSTTWebSocketServer(server: http.Server, path: string = "/stt") {
    const wss = new WSS({server, path});

    console.log(`[STT] WebSocket server ready at ws://localhost:${process.env.NODE_PORT}${path}`);

    wss.on("connection", (clientWs: WS) => {
        console.log("[STT] New client connected — waiting for init message");

        let voice: OpenAIRealtimeVoice | null = null;
        let isConnected = false;
        let initData: IInitMessage | null = null;
        const store = new TranscriptStore();

        const sendToClient = (message: ITranscriptMessage) => {
            if (clientWs.readyState === WS.OPEN) {
                clientWs.send(JSON.stringify(message));
            }
        };

        async function initializeVoice(init: IInitMessage) {
            try {
                voice = new OpenAIRealtimeVoice({
                    model: "gpt-4o-mini-realtime-preview-2024-12-17",
                    apiKey: process.env.OPENAI_API_KEY,
                });

                voice.updateConfig({
                    input_audio_transcription: {
                        prompt: "Transcribe the user's speech to text. This is in a medical setting. Only transcribe english. Do not include any non-speech sounds or filler words. Focus on accurate transcription of spoken words. The speech will be in Indian English (so when predicting take this into consideration).",
                        model: "gpt-4o-transcribe",
                        language: init.language,
                    },
                    turn_detection: {
                        type: "server_vad",
                        threshold: 0.5,
                        prefix_padding_ms: 300,
                        silence_duration_ms: 800,
                    },
                });

                voice.addInstructions(
                    "You are a transcription-only system. DO NOT respond to the user. " +
                    "The transcription is in a medical setting (doctor patient setting). So expect medical terms" +
                    "Never reply, never acknowledge, never assist. Complete silence. You only transcribe english. " +
                    "The speech will be in Indian English (so when predicting take this into consideration). " +
                    "If you receive non-speech sounds, do not transcribe them. " +
                    "Focus on accurately transcribing spoken words and ignore any background noise or filler words."
                );

                voice.on("writing", ({text, role}: { text: string; role: string }) => {
                    // console.log("[STT] Writing event:", {text, role});
                    if (role === "user") {
                        console.log(`[STT] User transcription: ${text}`);
                        const id = uuidv4();

                        sendToClient({
                            id: id,
                            type: "transcript",
                            text: text,
                            role: "user",
                            final: true,
                        });

                        transcriptInsertor({
                            type: "transcript",
                            session: init.session_id,
                            message_id: id,
                            text: text,
                            speaker: "user"
                        })

                        store.add(id, text);
                        processTranscript(text, init, store, sendToClient).catch((err) =>
                            console.error("[STT] processTranscript error:", err)
                        );
                    }
                });

                voice.on("error", (error) => {
                    console.error("[STT] Voice error:", error);
                    sendToClient({
                        type: "error",
                        error: error.message || "Unknown error occurred",
                    });
                });

                sendToClient({type: "status", status: "connecting"});
                await voice.connect();
                isConnected = true;
                sendToClient({type: "status", status: "connected"});
                console.log("[STT] Connected to OpenAI Realtime API");
            } catch (error: any) {
                console.error("[STT] Error setting up voice:", error);
                sendToClient({
                    type: "error",
                    error: error.message || "Failed to initialize voice connection",
                });
                clientWs.close();
            }
        }

        sendToClient({type: "status", status: "waiting_for_init"});

        clientWs.on("message", async (data: Buffer) => {
            try {
                if (!initData) {
                    if (data[0] !== 0x7b) {
                        // Not JSON — reject
                        sendToClient({type: "error", error: "Expected init message first"});
                        return;
                    }

                    const parsed = JSON.parse(data.toString());

                    if (!parsed.session_id || !parsed.language) {
                        sendToClient({type: "error", error: "Init message must include session_id and language"});
                        return;
                    }

                    initData = parsed as IInitMessage;
                    console.log(`[STT] Init received — session: ${initData.session_id}, language: ${initData.language}`);
                    await initializeVoice(initData);
                    return;
                }

                if (!isConnected || !voice) return;

                if (data[0] === 0x7b) {
                    try {
                        const message = JSON.parse(data.toString());
                        if (message.type === "stop") {
                            console.log("[STT] Client requested stop");
                            return;
                        }
                        return;
                    } catch {
                        // Not valid JSON — fall through and treat as audio data
                    }
                }

                const alignedBuffer = Buffer.from(data);
                const int16Array = new Int16Array(
                    alignedBuffer.buffer,
                    alignedBuffer.byteOffset,
                    alignedBuffer.byteLength / 2
                );
                voice.send(int16Array);
            } catch (error) {
                console.error("[STT] Error processing message:", error);
            }
        });

        clientWs.on("close", () => {
            console.log("[STT] Client disconnected");
            if (voice) {
                voice.close();
                voice = null;
            }
            isConnected = false;
        });

        clientWs.on("error", (error) => {
            console.error("[STT] WebSocket error:", error);
            if (voice) {
                voice.close();
                voice = null;
            }
            isConnected = false;
        });
    });

    return wss;
}

