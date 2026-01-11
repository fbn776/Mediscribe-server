import {z} from "zod";


export const createSessionSchema = z.object({
    title: z.string().min(1, "Title is required"),
    patient: z.string().min(1, "Patient ID is required"),
    notes: z.string().optional(),
    endedAt: z.string().optional(),
});

export const updateSessionSchema = z.object({
    title: z.string().min(1, "Title is required").optional(),
    notes: z.string().optional(),
    endedAt: z.string().optional(),
})