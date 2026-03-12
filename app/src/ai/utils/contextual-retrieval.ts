import { chromaStore, DOCUMENTS_INDEX, TRANSCRIPT_INDEX } from "./vector-store";
import { embed } from "ai";
import { openai } from "@ai-sdk/openai";
import ChatConversations from "../../db/models/chat-conversations";

/**
 * Context-aware retrieval that filters documents and transcripts based on session access rules.
 *
 * Access Rules:
 * 1. Current session transcripts: Full access
 * 2. Current session documents: Full access
 * 3. Patient documents from other sessions: Full access
 * 4. Other patients' documents: No access
 * 5. Other sessions' transcripts: No access
 */

export interface RetrievalContext {
    conversationId: string;
    query: string;
    topK?: number;
}

export interface RetrievalResult {
    documents: Array<{
        content: string;
        metadata: any;
        score: number;
        source: 'transcript' | 'document';
    }>;
    hasResults: boolean;
}

/**
 * Retrieve contextually relevant documents and transcripts for a chat conversation
 */
export async function retrieveContextualContent(context: RetrievalContext): Promise<RetrievalResult> {
    try {
        const { conversationId, query, topK = 5 } = context;

        // Get conversation details to determine session and patient context
        const conversation = await ChatConversations.findById(conversationId)
            .populate({
                path: 'session',
                populate: {
                    path: 'patient',
                    select: '_id'
                }
            });

        if (!conversation) {
            return { documents: [], hasResults: false };
        }

        // Generate query embedding
        const { embedding: queryEmbedding } = await embed({
            model: openai.embedding("text-embedding-3-small"),
            value: query,
        });

        const results: RetrievalResult['documents'] = [];

        // Search transcripts (only from current session if session exists)
        if (conversation.session) {
            const transcriptResults = await chromaStore.query({
                indexName: TRANSCRIPT_INDEX,
                vector: queryEmbedding,
                topK: Math.ceil(topK / 2),
                where: {
                    session_id: conversation.session._id.toString()
                }
            });

            transcriptResults.forEach((result, index) => {
                results.push({
                    content: result.document || '',
                    metadata: result.metadata,
                    score: result.score || (1 - index * 0.1),
                    source: 'transcript'
                });
            });
        }

        // Search documents (current session + all patient documents)
        if (conversation.session && (conversation.session as any).patient) {
            const patientId = (conversation.session as any).patient._id.toString();

            // Search documents for this patient (all sessions)
            const documentResults = await chromaStore.query({
                indexName: DOCUMENTS_INDEX,
                vector: queryEmbedding,
                topK: Math.ceil(topK / 2),
                where: {
                    patient_id: patientId
                }
            });

            documentResults.forEach((result, index) => {
                results.push({
                    content: result.document || '',
                    metadata: result.metadata,
                    score: result.score || (1 - index * 0.1),
                    source: 'document'
                });
            });
        }

        // Sort by relevance score and take top results
        const sortedResults = results
            .sort((a, b) => (b.score || 0) - (a.score || 0))
            .slice(0, topK);

        return {
            documents: sortedResults,
            hasResults: sortedResults.length > 0
        };

    } catch (error) {
        console.error("[Context] Error retrieving contextual content:", error);
        return { documents: [], hasResults: false };
    }
}
