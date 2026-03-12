import { z } from "zod";

/**
 * SOAP note structured output schema.
 * Returned by the SOAP agent when converting transcripts.
 */
export const SOAPNoteSchema = z.object({
    subjective: z.string().describe(
        "Patient-reported information: chief complaint, HPI, medical/social history, ROS, medications, allergies"
    ),
    objective: z.string().describe(
        "Observable/measurable findings: vitals, physical exam, lab/imaging results"
    ),
    assessment: z.string().describe(
        "Clinical synthesis: diagnosis, differentials, clinical reasoning"
    ),
    plan: z.string().describe(
        "Next steps: medications, tests, referrals, follow-up, patient education"
    ),
});

export type TSOAPNote = z.infer<typeof SOAPNoteSchema>;
