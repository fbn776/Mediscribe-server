import {z} from "zod";

// ── Per-operation result schemas ──────────────────────────────────────────────

export const CorrectedSchema = z.object({
    type: z.literal("corrected"),
    text: z.string().describe("Grammar/spelling corrected version of the transcript"),
    message_ids: z.array(z.string()).describe("IDs of source transcript messages"),
});

export const HighlightSchema = z.object({
    type: z.literal("highlight"),
    text: z.string().describe(
        "The transcript with important medical/clinical terms wrapped in <mark> tags"
    ),
    message_ids: z.array(z.string()).describe("IDs of source transcript messages"),
});

export const SummarizedSchema = z.object({
    type: z.literal("summarized"),
    text: z.string().describe("A concise clinical summary of the transcript"),
    message_ids: z.array(z.string()).describe("IDs of source transcript messages"),
});

// ── Agent structured-output schema ───────────────────────────────────────────

/**
 * What the processing agent returns for a given batch of transcript messages.
 *
 * All three fields are optional — the agent only fills in the ones that are
 * applicable given the length / content of the supplied text.
 */
export const ProcessingResultSchema = z.object({
    corrected: CorrectedSchema.nullable().describe(
        "Corrected text, or null if no correction was needed / text too short"
    ),
    highlight: HighlightSchema.nullable().describe(
        "Text with highlighted medical terms, or null if none were found / text too short"
    ),
    summarized: SummarizedSchema.nullable().describe(
        "Clinical summary, or null if the text is too short to summarise"
    ),
});

export type TProcessingResult = z.infer<typeof ProcessingResultSchema>;
export type TCorrected = z.infer<typeof CorrectedSchema>;
export type THighlight = z.infer<typeof HighlightSchema>;
export type TSummarized = z.infer<typeof SummarizedSchema>;

