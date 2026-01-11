import {SttWebsocketMessageSchema} from "../schemas/stt-response";
import Transcripts from "../db/models/transcripts";

export default async function handleConversationWorker(payload: string) {
    try {
        const data = SttWebsocketMessageSchema.safeParse(JSON.parse(payload));

        if (!data.success) {
            console.error("Invalid STT message schema:", data.error);
            return;
        }

        const message = data.data;

        const existingConversation = await Transcripts.findOne({
            session: message.session_id,
            message_id: message.message_id
        });

        // await Transcripts.updateOne(
        //     { session: message.session_id, message_id: message.message_id },
        //     {
        //         $set: {
        //             processed_text: message.type === "PROCESSED" ? message.text : undefined,
        //             corrected_text: message.type === "CORRECTED" ? message.text : undefined,
        //             concise_text: message.type === "CONCISE" ? message.text : undefined,
        //             highlighted_text: message.type === "HIGHLIGHT" ? message.text : undefined,
        //         },
        //         $push: message.type === "TRANSCRIPTION"
        //             ? { raw_text: " " + message.text }
        //             : {}
        //     },
        //     { upsert: true }
        // );
        //

        if (existingConversation) {
            switch (message.type) {
                case "concise":
                    console.log("Received CONCISE message:", message);
                    existingConversation.concise_text = message.text;
                    break;
                case "highlight":
                    console.log("Received HIGHLIGHT message:", message);
                    existingConversation.highlighted_text = message.text;
                    break;
                case "corrected":
                    console.log("Received CORRECTED message:", message);
                    existingConversation.corrected_text = message.text;
                    break;
                case "processed":
                    console.log("Received PROCESSED message:", message);
                    existingConversation.processed_text = message.text;
                    break;
                case "transcription":
                    console.log("Received TRANSCRIPTION message:", message);
                    existingConversation.raw_text += " " + message.text;
                    break;
            }

            await existingConversation.save();
        } else {
            const transcript = new Transcripts({
                session: message.session_id,
                message_id: message.message_id,
                speaker: message.speaker,
                raw_text: message.type === "transcription" ? message.text : "",
                processed_text: message.type === "processed" ? message.text : undefined,
                corrected_text: message.type === "corrected" ? message.text : undefined,
                concise_text: message.type === "concise" ? message.text : undefined,
                highlighted_text: message.type === "highlight" ? message.text : undefined,
            });

            console.log("Creating new transcript:", transcript);

            await transcript.save();
        }
    } catch (err) {
        console.error("Worker error:", err);
    }
};