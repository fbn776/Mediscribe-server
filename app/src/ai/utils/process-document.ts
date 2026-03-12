import { embed } from "ai";
import { openai } from "@ai-sdk/openai";
import { documentAgent } from "../agents/document-agent";
import { documentProcessingResultSchema, TDocumentProcessingResult } from "../../schemas/documents-schema";
import { chromaStore, DOCUMENTS_INDEX, ensureDocumentsIndex } from "./vector-store";
import Documents from "../../db/models/documents";
import axios from "axios";

interface ProcessDocumentOptions {
    documentId: string;
    file: Express.Multer.File;
    patientId: string;
    sessionId?: string;
    userId: string;
}

/**
 * Processes an uploaded document through the complete pipeline:
 * 1. Call OCR API to extract markdown
 * 2. Use document agent to clean and process the text
 * 3. Store processed content in MongoDB
 * 4. Embed processed text in Chroma
 */
export async function processDocument(options: ProcessDocumentOptions): Promise<void> {
    const { documentId, file, patientId, sessionId, userId } = options;

    try {
        console.log(`[Document] Starting processing for document ${documentId}`);

        // Update status to processing
        await Documents.findByIdAndUpdate(documentId, { status: "processing" });

        // Step 1: Call OCR API
        console.log(`[Document] Calling OCR API for document ${documentId}`);
        const ocrResult = await callOCRAPI(file);

        if (!ocrResult.success) {
            throw new Error(ocrResult.error || "OCR processing failed");
        }

        // Step 2: Process with document agent
        console.log(`[Document] Processing with document agent for document ${documentId}`);
        const processedResult = await processWithAgent(ocrResult.markdown || "");

        // Step 3: Update document in MongoDB
        await Documents.findByIdAndUpdate(documentId, {
            markdown: ocrResult.markdown || "",
            processedText: processedResult.processedText,
            pageCount: ocrResult.page_count || 0,
            qualityScore: ocrResult.quality_score || 0,
            status: "completed"
        });

        // Step 4: Embed processed text in Chroma
        console.log(`[Document] Embedding document ${documentId} in Chroma`);
        await embedDocument({
            documentId,
            processedText: processedResult.processedText,
            patientId,
            sessionId,
            filename: file.originalname,
            mimetype: file.mimetype
        });

        console.log(`[Document] Successfully processed document ${documentId}`);

    } catch (error: any) {
        console.error(`[Document] Error processing document ${documentId}:`, error);

        // Update status to error
        await Documents.findByIdAndUpdate(documentId, {
            status: "error",
            error: error.message || "Processing failed"
        });

        throw error;
    }
}

/**
 * Call the OCR API to extract text from the uploaded file
 */
async function callOCRAPI(file: Express.Multer.File): Promise<{
    success: boolean;
    markdown?: string;
    page_count?: number;
    quality_score?: number;
    error?: string;
}> {
    try {
        const ocrUrl = process.env.OCR_API_URL;
        if (!ocrUrl) {
            throw new Error("OCR_API_URL environment variable not set");
        }

        const FormData = require('form-data');
        const formData = new FormData();
        formData.append('file', file.buffer, {
            filename: file.originalname,
            contentType: file.mimetype,
        });

        const response = await axios.post(`${ocrUrl}/convert`, formData, {
            headers: {
                ...formData.getHeaders(),
            },
            timeout: 120000, // 2 minute timeout for OCR processing
        });

        return {
            success: true,
            markdown: response.data.markdown,
            page_count: response.data.page_count,
            quality_score: response.data.quality_score
        };

    } catch (error: any) {
        console.error("[Document] OCR API error:", error);
        return {
            success: false,
            error: error.response?.data?.error || error.message || "OCR processing failed"
        };
    }
}

/**
 * Process OCR markdown with the document agent
 */
async function processWithAgent(markdown: string): Promise<TDocumentProcessingResult> {
    try {
        const result = await documentAgent.generate(
            `Please clean and process the following OCR markdown output from a medical document:\n\n${markdown}`,
            {
                structuredOutput: {
                    schema: documentProcessingResultSchema,
                }
            }
        );

        const output = result.object as TDocumentProcessingResult;

        if (!output || !output.processedText) {
            throw new Error("Document agent returned no processed text");
        }

        return output;

    } catch (error: any) {
        console.error("[Document] Agent processing error:", error);
        throw new Error(`Document processing failed: ${error.message}`);
    }
}

/**
 * Embed processed document text in Chroma
 */
async function embedDocument(options: {
    documentId: string;
    processedText: string;
    patientId: string;
    sessionId?: string;
    filename: string;
    mimetype: string;
}): Promise<void> {
    const { documentId, processedText, patientId, sessionId, filename, mimetype } = options;

    try {
        await ensureDocumentsIndex();

        const { embedding } = await embed({
            model: openai.embedding("text-embedding-3-small"),
            value: processedText,
        });

        const metadata = {
            document_id: documentId,
            patient_id: patientId,
            session_id: sessionId || null,
            timestamp: Date.now(),
            type: "document",
            filename,
            mimetype
        };

        await chromaStore.upsert({
            indexName: DOCUMENTS_INDEX,
            vectors: [embedding],
            metadata: [metadata],
            ids: [documentId],
            documents: [processedText],
        });

        console.log(`[Document] Successfully embedded document ${documentId} in Chroma`);

    } catch (error: any) {
        console.error("[Document] Chroma embedding error:", error);
        throw new Error(`Document embedding failed: ${error.message}`);
    }
}
