import Transcripts from "../db/models/transcripts";


export default async function transcriptInsertor(data: {
    session: string;
    message_id: string;
    text: string;
    speaker?: string;
    type: "transcript" | "processed" | "highlight" | "summarized";
}) {
    const transcripts = new Transcripts({
        session: data.session,
        message_id: data.message_id,
        speaker: data.speaker ?? "user",
        text: data.text,
        type: data.type,
    });

    await transcripts.save();
}