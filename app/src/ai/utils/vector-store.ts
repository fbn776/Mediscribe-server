import { ChromaVector } from "@mastra/chroma";

/**
 * Shared ChromaVector singleton for the entire app.
 * Connects to a local Chroma instance by default.
 */
export const chromaStore = new ChromaVector({
    id: "mediscribe-chroma",
    host: process.env.CHROMA_HOST ?? "localhost",
    port: Number(process.env.CHROMA_PORT ?? 8000),
});

/** Chroma collection name for medical transcripts. */
export const TRANSCRIPT_INDEX = "transcripts";

/** Chroma collection name for medical documents. */
export const DOCUMENTS_INDEX = "documents";

/** Dimension of OpenAI text-embedding-3-small vectors. */
export const EMBEDDING_DIMENSION = 1536;

let indexReady = false;
let documentsIndexReady = false;

/**
 * Ensures the "transcripts" Chroma collection exists.
 * Idempotent — only creates on first call.
 */
export async function ensureTranscriptIndex(): Promise<void> {
    if (indexReady) return;
    try {
        const indexes = await chromaStore.listIndexes();
        if (!indexes.includes(TRANSCRIPT_INDEX)) {
            await chromaStore.createIndex({
                indexName: TRANSCRIPT_INDEX,
                dimension: EMBEDDING_DIMENSION,
            });
            console.log(`[Vector] Created Chroma index "${TRANSCRIPT_INDEX}"`);
        }
        indexReady = true;
    } catch (err) {
        console.error("[Vector] Failed to ensure transcript index:", err);
        throw err;
    }
}

/**
 * Ensures the "documents" Chroma collection exists.
 * Idempotent — only creates on first call.
 */
export async function ensureDocumentsIndex(): Promise<void> {
    if (documentsIndexReady) return;
    try {
        const indexes = await chromaStore.listIndexes();
        if (!indexes.includes(DOCUMENTS_INDEX)) {
            await chromaStore.createIndex({
                indexName: DOCUMENTS_INDEX,
                dimension: EMBEDDING_DIMENSION,
            });
            console.log(`[Vector] Created Chroma index "${DOCUMENTS_INDEX}"`);
        }
        documentsIndexReady = true;
    } catch (err) {
        console.error("[Vector] Failed to ensure documents index:", err);
        throw err;
    }
}

