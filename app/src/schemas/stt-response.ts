/*
    message_id: str
    text: str
    type: Union[MessageType.TRANSCRIPTION, MessageType.PROCESSED, MessageType.CORRECTED, MessageType.CONCISE, MessageType.HIGHLIGHT]
    session_id: str
    speaker: str = "SPEAKER_00"
 */

import {z} from "zod";

export const SttWebsocketMessageSchema = z.object({
    message_id: z.string(),
    text: z.string(),
        type: z.enum(["transcription", "processed", "corrected", "concise", "highlight"]),
    session_id: z.string(),
    speaker: z.string().optional().default("SPEAKER_00"),
})