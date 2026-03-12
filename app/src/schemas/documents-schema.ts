import { z } from "zod";
import { objectIdString } from "./utils";

export const uploadDocumentParamsSchema = z.object({
    patientID: objectIdString.optional(),
    sessionID: objectIdString.optional(),
}).refine(
    (data) => data.patientID || data.sessionID,
    { message: "Either patientID or sessionID must be provided" }
);

export const getDocumentsQuerySchema = z.object({
    page: z.string().optional().transform(val => val ? parseInt(val) : 1),
    limit: z.string().optional().transform(val => val ? parseInt(val) : 20),
    status: z.enum(["uploading", "processing", "completed", "error"]).optional(),
});

export const documentProcessingResultSchema = z.object({
    processedText: z.string().describe("Cleaned and structured text from the document"),
});

export type TDocumentProcessingResult = z.infer<typeof documentProcessingResultSchema>;
export type TUploadDocumentParams = z.infer<typeof uploadDocumentParamsSchema>;
export type TGetDocumentsQuery = z.infer<typeof getDocumentsQuerySchema>;
