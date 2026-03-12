import type { Request, Response } from "express";
import mongoose from "mongoose";
import Transcripts from "../db/models/transcripts";
import Sessions from "../db/models/sessions";
import { error_function, success_function } from "../utils/response-handler";
import { handleControllerError } from "../utils/utils";
import { soapAgent } from "../ai/agents/soap-agent";
import { SOAPNoteSchema } from "../ai/schemas/soap-schema";

const SOAPController = {
    /**
     * GET /sessions/:id/soap
     *
     * Fetches all "transcript" type entries for the given session,
     * sends them to the SOAP agent, and returns a structured SOAP note.
     */
    generateSOAP: async (req: Request, res: Response) => {
        try {
            const { id } = req.params;

            if (!id || Array.isArray(id) || !mongoose.Types.ObjectId.isValid(id)) {
                return res.status(400).json(
                    error_function({ status: 400, message: "Invalid session ID" })
                );
            }

            // Verify session exists
            const session = await Sessions.findById(id);
            if (!session) {
                return res.status(404).json(
                    error_function({ status: 404, message: "Session not found" })
                );
            }

            // Fetch only "transcript" type entries, sorted chronologically
            const transcripts = await Transcripts.find({
                session: id,
                type: "transcript",
            }).sort({ createdAt: 1 });

            if (transcripts.length === 0) {
                return res.status(400).json(
                    error_function({
                        status: 400,
                        message: "No transcripts found for this session",
                    })
                );
            }

            // Build the transcript text for the agent
            const transcriptText = transcripts
                .map((t, i) => `${i + 1}. [${t.speaker}] ${t.text}`)
                .join("\n");

            const prompt = `Convert the following doctor-patient conversation transcript into a SOAP note.\n\nSession: ${session.title}\n\n--- TRANSCRIPT ---\n${transcriptText}\n--- END TRANSCRIPT ---`;

            // Call the SOAP agent with structured output
            const result = await soapAgent.generate(prompt, {
                structuredOutput: {
                    schema: SOAPNoteSchema,
                },
            });

            const soapNote = result.object;

            if (!soapNote) {
                return res.status(500).json(
                    error_function({
                        status: 500,
                        message: "Failed to generate SOAP note",
                    })
                );
            }

            return res.status(200).json(
                success_function({
                    status: 200,
                    message: "SOAP note generated successfully",
                    data: {
                        sessionId: id,
                        sessionTitle: session.title,
                        transcriptCount: transcripts.length,
                        soap: soapNote,
                    },
                })
            );
        } catch (error) {
            handleControllerError({ error, res });
        }
    },
};

export default SOAPController;
