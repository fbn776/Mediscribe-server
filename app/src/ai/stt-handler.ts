import {OpenAIRealtimeVoice} from "@mastra/voice-openai-realtime";
import {WebSocket as WS, WebSocketServer as WSS} from "ws";
import http from "http";
import {removeArabic} from "../utils/utils";

interface TranscriptMessage {
    type: "transcript" | "status" | "error";
    text?: string;
    role?: string;
    final?: boolean;
    status?: string;
    error?: string;
}

/**
 * Creates a WebSocket server for real-time speech-to-text transcription
 * using Mastra's OpenAI Realtime Voice API.
 */
export function createSTTWebSocketServer(server: http.Server, path: string = "/stt") {
    const wss = new WSS({server, path});

    console.log(`[STT] WebSocket server ready at ws://localhost:${process.env.NODE_PORT}${path}`);

    wss.on("connection", async (clientWs: WS) => {
        console.log("[STT] New client connected");

        let voice: OpenAIRealtimeVoice | null = null;
        let isConnected = false;

        const sendToClient = (message: TranscriptMessage) => {
            if (clientWs.readyState === WS.OPEN) {
                clientWs.send(JSON.stringify(message));
            }
        };

        try {
            voice = new OpenAIRealtimeVoice({
                // model: "gpt-4o-transcribe",
                model: "gpt-4o-mini-realtime-preview-2024-12-17",
                apiKey: process.env.OPENAI_API_KEY,
            });

            voice.updateConfig({
                input_audio_transcription: {
                    prompt: "Transcribe the user's speech to text. This is in a medical setting. Only transcribe english. Do not include any non-speech sounds or filler words. Focus on accurate transcription of spoken words. The speech will be in Indian English (so when predicting take this into consideration).",
                    model: "gpt-4o-transcribe",
                    language: 'en',
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
                console.log("[STT] Writing event:", {text, role});
                if (role === "user") {

                    const processed = removeArabic(text)

                    console.log(`[STT] User transcription: ${text} - Processed: ${processed}`);
                    sendToClient({
                        type: "transcript",
                        text: processed,
                        role: "user",
                        final: true,
                    });
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

            clientWs.on("message", async (data: Buffer) => {
                if (!isConnected || !voice) return;

                try {
                    // Check if it's a control message (JSON)
                    if (data[0] === 0x7b) {
                        // '{' character
                        const message = JSON.parse(data.toString());
                        if (message.type === "stop") {
                            console.log("[STT] Client requested stop");
                            return;
                        }
                    }

                    // Otherwise, it's audio data - send to OpenAI
                    // Copy buffer to ensure proper alignment for Int16Array
                    const alignedBuffer = Buffer.from(data);
                    const int16Array = new Int16Array(
                        alignedBuffer.buffer,
                        alignedBuffer.byteOffset,
                        alignedBuffer.byteLength / 2
                    );
                    voice.send(int16Array);
                } catch (error) {
                    console.error("[STT] Error processing audio:", error);
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
        } catch (error: any) {
            console.error("[STT] Error setting up voice:", error);
            sendToClient({
                type: "error",
                error: error.message || "Failed to initialize voice connection",
            });
            clientWs.close();
        }
    });

    return wss;
}

