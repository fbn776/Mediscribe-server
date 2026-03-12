import { Agent } from "@mastra/core/agent";
import { Memory } from "@mastra/memory";
import { LibSQLStore } from "@mastra/libsql";
import { openai } from "@ai-sdk/openai";
import { createVectorQueryTool } from "@mastra/rag";
import { CHROMA_PROMPT } from "@mastra/chroma";
import { chromaStore, TRANSCRIPT_INDEX, DOCUMENTS_INDEX } from "../utils/vector-store";

const DEFAULT_MODEL = process.env.CHAT_MODEL ?? "gpt-4o-mini";

const DEFAULT_SYSTEM_PROMPT = `You are Mediscribe AI, a helpful medical assistant.
You assist doctors and healthcare professionals with clinical questions, documentation, and medical knowledge.
Always be precise, evidence-based, and indicate when a question is outside your competence.
Never provide direct diagnoses for real patients without professional evaluation.

When the user asks about past conversations, patient visits, transcript content, or document information,
use the appropriate search tools to find relevant information before answering:
- Use the transcript search tool for conversation transcripts
- Use the document search tool for medical documents and reports

You have access to both conversation transcripts and medical documents. When relevant, search both sources 
to provide comprehensive answers based on available patient information.

${CHROMA_PROMPT}`;

/**
 * Vector query tool — lets the agent search medical transcripts in Chroma.
 */
const transcriptQueryTool = createVectorQueryTool({
    id: "search-transcripts",
    vectorStoreName: "chroma",
    vectorStore: chromaStore,
    indexName: TRANSCRIPT_INDEX,
    model: openai.embedding("text-embedding-3-small"),
    description:
        "Search through medical transcripts from past doctor-patient conversations to find relevant clinical information",
});

/**
 * Vector query tool — lets the agent search medical documents in Chroma.
 */
const documentQueryTool = createVectorQueryTool({
    id: "search-documents",
    vectorStoreName: "chroma",
    vectorStore: chromaStore,
    indexName: DOCUMENTS_INDEX,
    model: openai.embedding("text-embedding-3-small"),
    description:
        "Search through medical documents (PDFs, images, reports) that have been uploaded and processed to find relevant medical information, lab results, diagnoses, or treatment plans",
});

/**
 * Mediscribe Chat Agent with Memory + RAG.
 *
 * - Memory (LibSQL): maintains conversation history per thread.
 * - RAG (Chroma):    retrieves relevant context from transcripts and documents.
 */
export const chatAgent = new Agent({
    id: "mediscribe-chat",
    name: "MediscribeChat",
    model: openai(DEFAULT_MODEL),
    instructions: DEFAULT_SYSTEM_PROMPT,
    tools: {
        transcriptQueryTool,
        documentQueryTool,
    },
    memory: new Memory({
        storage: new LibSQLStore({
            id: "mediscribe-memory",
            url: process.env.LIBSQL_URL ?? "file:./mastra-memory.db",
        }),
        options: {
            lastMessages: 40,
        },
    }),
});
