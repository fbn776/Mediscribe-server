// ---------------------------------------------------------------------------
// Per-session transcript store
// ---------------------------------------------------------------------------
interface TranscriptEntry {
    id: string;
    text: string;
    timestamp: Date;
}

export class TranscriptStore {
    private messages: TranscriptEntry[] = [];
    /** Index of the last entry that was sent for AI processing. */
    private lastProcessedIndex: number = -1;

    add(id: string, text: string): TranscriptEntry[] {
        this.messages.push({id, text, timestamp: new Date()});
        return this.messages;
    }

    /** All messages recorded so far (read-only snapshot). */
    getAll(): ReadonlyArray<TranscriptEntry> {
        return this.messages;
    }

    /** Only the plain strings, in order. */
    getTexts(): string[] {
        return this.messages.map(m => m.text);
    }

    /**
     * Returns messages that have NOT yet been sent for processing.
     * These are all entries added after the last processing checkpoint.
     */
    getUnprocessed(): ReadonlyArray<TranscriptEntry> {
        return this.messages.slice(this.lastProcessedIndex + 1);
    }

    /**
     * Mark all currently stored messages as processed.
     * Call this after successfully dispatching a batch to the AI agent.
     */
    markAllProcessed(): void {
        this.lastProcessedIndex = this.messages.length - 1;
    }

    get size(): number {
        return this.messages.length;
    }

    clear(): void {
        this.messages = [];
        this.lastProcessedIndex = -1;
    }
}