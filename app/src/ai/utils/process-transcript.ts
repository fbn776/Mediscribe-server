import {v4 as uuidv4} from "uuid";
import {IInitMessage, ITranscriptMessage} from "../../types/transcript";
import {TranscriptStore} from "./transcript-store";
import {processingAgent} from "../agents/processing-agent";
import {ProcessingResultSchema, TProcessingResult} from "../schemas/text-processing";

/** Minimum number of words in unprocessed text before we even try. */
const MIN_WORDS = 20;

/** Minimum number of NEW messages since the last run before we try again. */
const MIN_NEW_MESSAGES = 1;

/** Minimum milliseconds between two consecutive processing runs. */
const DEBOUNCE_MS = 1000;

const lastRunAtMap = new WeakMap<TranscriptStore, number>();

/**
 * Called after every finalized transcript segment.
 *
 * Smart throttling:
 *  - Skips if there are fewer than MIN_NEW_MESSAGES unprocessed segments.
 *  - Skips if the combined unprocessed text is shorter than MIN_WORDS words.
 *  - Skips if a processing run happened less than DEBOUNCE_MS ago.
 *
 * When the conditions are met the unprocessed batch is sent to the Mastra
 * processing agent.  Results are pushed back to the client via sendToClient.
 */
export async function processTranscript(
    _currentText: string,
    initData: IInitMessage,
    store: TranscriptStore,
    sendToClient: (message: ITranscriptMessage) => void
): Promise<void> {
    const unprocessed = store.getUnprocessed();

    if (unprocessed.length < MIN_NEW_MESSAGES) {
        return;
    }

    const combinedText = unprocessed.map(m => m.text).join(" ");
    const wordCount = combinedText.trim().split(/\s+/).filter(Boolean).length;
    if (wordCount < MIN_WORDS) {
        return;
    }

    const now = Date.now();
    const lastRun = lastRunAtMap.get(store) ?? 0;
    if (now - lastRun < DEBOUNCE_MS) {
        return;
    }

    lastRunAtMap.set(store, now);
    store.markAllProcessed();

    const messageIds = unprocessed.map(m => m.id);

    const prompt =
        `Session: ${initData.session_id} | Language: ${initData.language}\n\n` +
        unprocessed
            .map((m, i) => `${i + 1}. [id:${m.id}] ${m.text}`)
            .join("\n");

    console.log(
        `[STT] [process] Sending ${unprocessed.length} msgs (${wordCount} words) to processing agent`
    );

    try {
        const result = await processingAgent.generate(prompt, {
            structuredOutput: {
                schema: ProcessingResultSchema,
            }
        });
        const output = result.object as TProcessingResult;

        if (!output) {
            console.warn("[STT] [process] Agent returned no structured output");
            return;
        }

        console.log("[STT] [process] Agent output", output);

        const msgId = uuidv4();

        if (output.corrected) {
            sendToClient({
                type: "corrected",
                id: msgId,
                text: output.corrected.text,
                message_ids: messageIds,
            });
        }

        if (output.highlight) {
            sendToClient({
                type: "highlight",
                id: msgId,
                text: output.highlight.text,
                message_ids: messageIds,
            });
        }

        if (output.summarized) {
            sendToClient({
                type: "summarized",
                id: msgId,
                text: output.summarized.text,
                message_ids: messageIds,
            });
        }

        console.log(
            `[STT] [process] Done — ` +
            `corrected=${!!output.corrected} highlight=${!!output.highlight} summarized=${!!output.summarized}`
        );
    } catch (err) {
        console.error("[STT] [process] Agent error:", err);
        // Roll back the mark so the batch is retried on the next transcript
        store.getUnprocessed(); // no-op, but signals intent
        lastRunAtMap.set(store, 0); // reset debounce so a retry can happen
    }
}